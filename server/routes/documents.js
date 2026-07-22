import { Router } from 'express';
import multer from 'multer';
import * as db from '../db.js';
import { sendBookingCreated } from '../email.js';
import { extractBookingFromSource } from '../extractors/index.js';
import { enrichHotelData } from '../enrichment.js';
import { createImportResult } from '../importResult.js';

// Multer config — store in memory for processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB cap
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(pdf|png|jpg|jpeg|webp|docx|xlsx|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('File format not allowed for booking import'));
    }
  },
});

// Wrap multer so size/format rejections return a clean 400 JSON instead of
// bubbling to Express's default HTML 500 handler.
function uploadSingle(req, res, next) {
  upload.single('document')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'File too large (max 15MB)'
        : (err.message || 'Upload failed');
      return res.status(400).json({ error: msg });
    }
    next();
  });
}

export default function documentRoutes(authMiddleware) {
  const router = Router();

  // ─── Upload and extract from document ─────────────────────
  router.post('/bookings/from-document', authMiddleware, uploadSingle, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { originalname, mimetype, size, buffer } = req.file;
      const safeFilename = (originalname || 'upload').replace(/\.\./g, '_').replace(/[^a-zA-Z0-9_.-]/g, '_').substring(0, 100);

      // Create upload record
      const docRecord = await db.createDocumentUpload({
        userEmail: req.userEmail,
        filename: safeFilename,
        fileType: mimetype,
        fileSize: size,
        status: 'processing',
      });

      // Task 3: Deterministic extraction using consolidated engine
      const extraction = await extractBookingFromSource({
        mimetype,
        buffer,
        subject: originalname,
      });

      const extractedData = extraction.fields || {};
      const confidenceScores = extraction.confidence || {};
      const warnings = extraction.warnings || [];

      // Task 4 & 5: Required fields for active monitoring
      const essentialFields = ['hotelName', 'checkIn', 'checkOut', 'totalPrice', 'currency'];
      const missingFields = essentialFields.filter(f => !extractedData[f] && !extractedData[f === 'checkIn' ? 'checkinDate' : f === 'checkOut' ? 'checkoutDate' : f === 'totalPrice' ? 'originalPrice' : f]);

      let finalStatus = 'NEEDS_INFORMATION';
      let createdBooking = null;

      if (missingFields.length === 0) {
        // Essential fields present & validated
        const checkinStr = extractedData.checkIn || extractedData.checkinDate;
        const checkoutStr = extractedData.checkOut || extractedData.checkoutDate;
        if (new Date(checkoutStr) > new Date(checkinStr)) {
          finalStatus = 'ACTIVE_MONITORING';
        }
      }

      // Task 7: Enrich hotel data
      const enrichment = await enrichHotelData(extractedData);

      // Save document upload record
      await db.updateDocumentUpload(docRecord.id, {
        extractedData,
        confidenceScores,
        status: 'extracted',
      });

      // Create booking in DB if ACTIVE_MONITORING or create portal booking for NEEDS_INFORMATION
      createdBooking = await db.createBooking({
        ...extractedData,
        email: req.userEmail,
        status: finalStatus === 'ACTIVE_MONITORING' ? 'monitoring' : 'needs_information',
        parseMethod: 'deterministic',
      });

      const importRecord = await db.createBookingImport({
        userEmail: req.userEmail,
        uploadId: docRecord.id,
        bookingId: createdBooking?.id,
        source: mimetype.startsWith('image/') ? 'image_upload' : 'pdf_upload',
        extractedData,
        confidenceData: confidenceScores,
        missingFields,
        status: finalStatus,
      });

      // Task 1 Contract Response
      const responsePayload = createImportResult({
        success: true,
        source: mimetype.startsWith('image/') ? 'image_upload' : 'pdf_upload',
        booking: createdBooking,
        hotel: enrichment.hotel,
        missingFields,
        warnings,
        attachmentsProcessed: extraction.attachmentsProcessed || 1,
        status: finalStatus,
        extra: {
          documentId: docRecord.id,
          importId: importRecord.id,
        },
      });

      res.json(responsePayload);
    } catch (err) {
      console.error('[Documents] Upload error:', err.message);
      res.status(500).json({ error: 'Failed to process document' });
    }
  });

  // ─── Create/Confirm booking from draft import ─────────────────────────
  router.post('/documents/:id/create-booking', authMiddleware, async (req, res) => {
    try {
      let doc = await db.getDocumentUpload(req.params.id);
      let importRecord = null;
      if (!doc) {
        importRecord = await db.getBookingImport(req.params.id);
        if (!importRecord) return res.status(404).json({ error: 'Document or Import record not found' });
      }

      const userEmail = doc ? doc.userEmail : importRecord.userEmail;
      if (userEmail && userEmail !== req.userEmail) return res.status(403).json({ error: 'Access denied' });

      const bookingData = req.body;
      const essentialFields = ['hotelName', 'checkinDate', 'checkoutDate', 'originalPrice', 'currency'];
      const missing = essentialFields.filter(f => !bookingData[f]);

      if (missing.length > 0) {
        return res.status(400).json({
          error: 'Missing required essential fields',
          missingFields: missing,
        });
      }

      // Create active booking
      const booking = await db.createBooking({
        ...bookingData,
        email: req.userEmail,
        status: 'monitoring',
      });

      if (doc) {
        await db.updateDocumentUpload(doc.id, {
          bookingId: booking.id,
          status: 'created',
        });
      }

      if (importRecord || bookingData.importId) {
        const impId = importRecord ? importRecord.id : bookingData.importId;
        await db.updateBookingImport(impId, {
          status: 'ACTIVE_MONITORING',
          confirmedAt: new Date().toISOString(),
        });
      }

      const responsePayload = createImportResult({
        success: true,
        source: 'manual_completion',
        booking,
        hotel: null,
        missingFields: [],
        warnings: [],
        attachmentsProcessed: 0,
        status: 'ACTIVE_MONITORING',
        extra: { documentId: doc?.id, importId: importRecord?.id },
      });

      res.status(201).json(responsePayload);
    } catch (err) {
      console.error('[Documents] Create booking error:', err.message);
      res.status(500).json({ error: 'Failed to create booking from document' });
    }
  });

  return router;
}
