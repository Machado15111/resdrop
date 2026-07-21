import { Router } from 'express';
import multer from 'multer';
import { readFile } from 'fs/promises';
import * as db from '../db.js';
import { sendBookingCreated } from '../email.js';
import { isAiParserConfigured, extractBookingFromDocument } from '../aiParser.js';

// Multer config — store in memory for processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, PNG, and JPG files are allowed'));
    }
  },
});

// ─── PDF text extraction ────────────────────────────────────
async function extractTextFromPdf(buffer) {
  // pdf-parse v2 exports a PDFParse class (not a default function).
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text || '';
  } finally {
    await parser.destroy().catch(() => {});
  }
}

// ─── Field extraction with confidence scoring ───────────────
function extractBookingFields(text) {
  const fields = {};
  const confidence = {};

  // Hotel name — look for common patterns
  const hotelPatterns = [
    /(?:hotel|resort|inn|lodge|hostel|pousada)\s*[:.]?\s*(.+)/i,
    /(?:property|accommodation)\s*[:.]?\s*(.+)/i,
    /(?:nome do hotel|name)\s*[:.]?\s*(.+)/i,
  ];
  for (const p of hotelPatterns) {
    const m = text.match(p);
    if (m) {
      fields.hotelName = m[1].trim().substring(0, 100);
      confidence.hotelName = 0.7;
      break;
    }
  }

  // Dates
  const datePatterns = [
    /check[\s-]*in\s*[:.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:entrada|arrival)\s*[:.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  ];
  for (const p of datePatterns) {
    const m = text.match(p);
    if (m) {
      fields.checkinDate = normalizeDate(m[1]);
      confidence.checkinDate = 0.8;
      break;
    }
  }

  const checkoutPatterns = [
    /check[\s-]*out\s*[:.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:saida|sa[íi]da|departure)\s*[:.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  ];
  for (const p of checkoutPatterns) {
    const m = text.match(p);
    if (m) {
      fields.checkoutDate = normalizeDate(m[1]);
      confidence.checkoutDate = 0.8;
      break;
    }
  }

  // Price
  const pricePatterns = [
    /(?:total|valor|amount|price|pre[çc]o)\s*[:.]?\s*R?\$\s*([\d.,]+)/i,
    /R\$\s*([\d.,]+)/,
    /(?:USD|BRL)\s*([\d.,]+)/i,
  ];
  for (const p of pricePatterns) {
    const m = text.match(p);
    if (m) {
      fields.originalPrice = parsePrice(m[1]);
      confidence.originalPrice = 0.6;
      break;
    }
  }

  // Confirmation number
  const confPatterns = [
    /(?:confirma[çc][ãa]o|confirmation|booking\s*(?:id|number|ref))\s*[:.]?\s*([A-Z0-9\-]{4,20})/i,
    /(?:reserva|reservation)\s*(?:#|n[°o]\.?)\s*[:.]?\s*([A-Z0-9\-]{4,20})/i,
  ];
  for (const p of confPatterns) {
    const m = text.match(p);
    if (m) {
      fields.confirmationNumber = m[1].trim();
      confidence.confirmationNumber = 0.8;
      break;
    }
  }

  // Guest name
  const guestPatterns = [
    /(?:guest|h[óo]spede|nome|name)\s*[:.]?\s*([A-Z][a-záàâãéèêíïóôõöúçñ]+(?:\s+[A-Z][a-záàâãéèêíïóôõöúçñ]+){1,3})/,
    /(?:sr\.|sra\.|mr\.|mrs\.|ms\.)\s*([A-Z][a-záàâãéèêíïóôõöúçñ]+(?:\s+[A-Z][a-záàâãéèêíïóôõöúçñ]+){1,3})/i,
  ];
  for (const p of guestPatterns) {
    const m = text.match(p);
    if (m) {
      fields.guestName = m[1].trim();
      confidence.guestName = 0.5;
      break;
    }
  }

  // Room type
  const roomPatterns = [
    /(?:room\s*type|tipo\s*(?:de\s*)?quarto|quarto|room)\s*[:.]?\s*(.+)/i,
  ];
  for (const p of roomPatterns) {
    const m = text.match(p);
    if (m) {
      fields.roomType = m[1].trim().substring(0, 60);
      confidence.roomType = 0.5;
      break;
    }
  }

  // Destination
  const destPatterns = [
    /(?:destino|destination|cidade|city|localiza[çc][ãa]o|location)\s*[:.]?\s*(.+)/i,
  ];
  for (const p of destPatterns) {
    const m = text.match(p);
    if (m) {
      fields.destination = m[1].trim().substring(0, 100);
      confidence.destination = 0.5;
      break;
    }
  }

  return { fields, confidence };
}

function normalizeDate(dateStr) {
  // Convert dd/mm/yyyy or dd-mm-yyyy to yyyy-mm-dd
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length !== 3) return dateStr;
  let [d, m, y] = parts;
  if (y.length === 2) y = '20' + y;
  if (parseInt(d) > 12) {
    // dd/mm/yyyy format
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Could be mm/dd/yyyy — keep as dd/mm for Brazilian context
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parsePrice(str) {
  // Handle Brazilian format: 1.234,56 → 1234.56
  if (str.includes(',') && str.includes('.')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  }
  if (str.includes(',')) {
    return parseFloat(str.replace(',', '.'));
  }
  return parseFloat(str.replace(/[^\d.]/g, ''));
}

export default function documentRoutes(authMiddleware) {
  const router = Router();

  // ─── Upload and extract from document ─────────────────────
  router.post('/bookings/from-document', authMiddleware, upload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { originalname, mimetype, size, buffer } = req.file;

      // Create upload record
      const docRecord = await db.createDocumentUpload({
        userEmail: req.userEmail,
        filename: originalname,
        fileType: mimetype,
        fileSize: size,
        status: 'processing',
      });

      let extractedText = '';
      let extractedData = {};
      let confidenceScores = {};
      let parseMethod = 'manual';
      let deterministicSuccess = false;

      // Step 1: Deterministic parser for PDFs
      if (mimetype === 'application/pdf') {
        try {
          extractedText = await extractTextFromPdf(buffer);
          const result = extractBookingFields(extractedText);
          extractedData = result.fields;
          confidenceScores = result.confidence;
          parseMethod = 'deterministic';

          const essential = ['hotelName', 'checkinDate', 'checkoutDate', 'originalPrice'];
          const missingEssential = essential.filter(f => !extractedData[f]);
          if (missingEssential.length === 0) {
            deterministicSuccess = true;
          }
        } catch (err) {
          console.error('[Documents] PDF text extraction failed:', err.message);
        }
      }

      // Step 2: AI Parser if missing essential fields or if image upload
      if (!deterministicSuccess && isAiParserConfigured()) {
        try {
          const ai = await extractBookingFromDocument(buffer, mimetype, { source: 'upload' });
          extractedData = { ...extractedData, ...ai.fields };
          confidenceScores = { ...confidenceScores, ...ai.confidence };
          parseMethod = parseMethod === 'deterministic' ? 'hybrid' : 'ai';
        } catch (err) {
          console.error('[Documents] AI extraction failed:', err.message);
        }
      }

      const essentialFields = ['hotelName', 'checkinDate', 'checkoutDate', 'originalPrice', 'currency'];
      const missingFields = essentialFields.filter(f => !extractedData[f]);
      const importStatus = missingFields.length === 0 ? 'READY_FOR_CONFIRMATION' : 'NEEDS_REVIEW';

      // Update document upload record
      await db.updateDocumentUpload(docRecord.id, {
        extractedData,
        confidenceScores,
        status: Object.keys(extractedData).length > 0 ? 'extracted' : 'uploaded',
      });

      // Create draft BookingImport
      const importRecord = await db.createBookingImport({
        userEmail: req.userEmail,
        uploadId: docRecord.id,
        source: mimetype.startsWith('image/') ? 'image_upload' : 'pdf_upload',
        extractedData,
        confidenceData: confidenceScores,
        missingFields,
        status: importStatus,
      });

      res.json({
        documentId: docRecord.id,
        importId: importRecord.id,
        filename: originalname,
        fileType: mimetype,
        extractedData,
        confidenceScores,
        missingFields,
        status: importStatus,
        parseMethod,
        rawTextLength: extractedText.length,
      });
    } catch (err) {
      console.error('[Documents] Upload error:', err.message);
      res.status(500).json({ error: 'Failed to process document' });
    }
  });

  // ─── Create/Confirm booking from document or draft import ─────────────────────────
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

      // Essential fields validation: hotel name, check-in, check-out, total price, currency
      const essentialFields = ['hotelName', 'checkinDate', 'checkoutDate', 'originalPrice', 'currency'];
      const missing = essentialFields.filter(f => !bookingData[f]);

      if (missing.length > 0) {
        return res.status(400).json({
          error: 'Missing required essential fields',
          missingFields: missing,
        });
      }

      // Duplicate detection
      const existingBookings = await db.getBookingsByEmail(req.userEmail);
      const duplicate = existingBookings.find(b =>
        b.hotelName?.toLowerCase() === bookingData.hotelName?.toLowerCase() &&
        b.checkinDate === bookingData.checkinDate &&
        b.checkoutDate === bookingData.checkoutDate
      );

      if (duplicate) {
        return res.status(409).json({
          error: 'A similar booking already exists',
          existingBookingId: duplicate.id,
          existingHotel: duplicate.hotelName,
        });
      }

      // Create active booking
      const booking = await db.createBooking({
        ...bookingData,
        email: req.userEmail,
        status: 'monitoring',
        alerts: [],
        priceHistory: [],
        latestResults: [],
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
          status: 'CONFIRMED',
          confirmedAt: new Date().toISOString(),
        });
      }

      await db.logActivity({
        entityType: 'booking',
        entityId: booking.id,
        action: 'confirmed_from_import',
        actorEmail: req.userEmail,
        details: { documentId: doc?.id, importId: importRecord?.id },
      });

      // Fire-and-forget confirmation email
      sendBookingCreated(req.userEmail, req.user?.name || 'Traveler', booking, req.user || {}).catch(() => {});

      res.status(201).json({ booking, documentId: doc?.id, importId: importRecord?.id });
    } catch (err) {
      console.error('[Documents] Create booking error:', err.message);
      res.status(500).json({ error: 'Failed to create booking from document' });
    }
  });

  // ─── Get document details ─────────────────────────────────
  router.get('/documents/:id', authMiddleware, async (req, res) => {
    try {
      const doc = await db.getDocumentUpload(req.params.id);
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      // Security: Verify document belongs to the requesting user
      if (doc.userEmail !== req.userEmail) return res.status(403).json({ error: 'Access denied' });
      res.json(doc);
    } catch (err) {
      console.error('[Documents] Get error:', err.message);
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  });

  return router;
}
