import { useState } from 'react';
import { useI18n } from '../i18n';
import { IconX } from './Icons';
import './BulkImportModal.css';

// Parse pasted text into an array of booking objects.
// Accepts either a JSON array or CSV lines.
function parseInput(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Try JSON first
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  // Fall back to CSV: hotelName,destination,checkinDate,checkoutDate,originalPrice,currency
  return trimmed.split('\n').map(line => {
    const cols = line.split(',').map(c => c.trim());
    const [hotelName, destination, checkinDate, checkoutDate, originalPrice, currency] = cols;
    return {
      hotelName,
      destination: destination || '',
      checkinDate,
      checkoutDate,
      originalPrice: parseFloat(originalPrice),
      currency: currency || 'USD',
    };
  }).filter(b => b.hotelName);
}

function BulkImportModal({ onClose, onImport }) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setResult(null);

    let bookings;
    try {
      bookings = parseInput(text);
    } catch {
      setError(t('import.parseError'));
      return;
    }

    if (!bookings.length) {
      setError(t('import.parseError'));
      return;
    }

    setImporting(true);
    try {
      const res = await onImport(bookings);
      setResult(res?.summary || { created: 0, failed: bookings.length });
    } catch (err) {
      setError(err.message || t('import.parseError'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bim-overlay" onClick={onClose}>
      <div className="bim-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bim-header">
          <h2 className="bim-title">{t('import.title')}</h2>
          <button className="bim-close" onClick={onClose} aria-label="Close">
            <IconX size={20} />
          </button>
        </div>

        <p className="bim-desc">{t('import.desc')}</p>
        <p className="bim-hint">{t('import.csvHint')}</p>

        <textarea
          className="bim-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('import.placeholder')}
          rows={8}
          disabled={importing}
        />

        {error && <div className="bim-error">{error}</div>}

        {result && (
          <div className="bim-result">
            <span className="bim-result-ok">
              {t('import.resultOk').replace('{n}', result.created)}
            </span>
            {result.failed > 0 && (
              <span className="bim-result-fail">
                {' · '}{t('import.resultFail').replace('{n}', result.failed)}
              </span>
            )}
          </div>
        )}

        <div className="bim-actions">
          <button className="bim-btn-cancel" onClick={onClose} disabled={importing}>
            {t('import.cancel')}
          </button>
          <button className="bim-btn-submit" onClick={handleSubmit} disabled={importing || !text.trim()}>
            {importing ? t('import.importing') : t('import.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BulkImportModal;
