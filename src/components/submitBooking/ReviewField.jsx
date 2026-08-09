import { CONFIDENCE_COLORS, getConfidenceLevel, confidenceLabel } from './constants';

/**
 * One editable field in the extraction-review step, tagged with how confident
 * the extractor was about the value. Moved out of SubmitBooking.jsx.
 */
function ReviewField({ label, value, onChange, confidence, type = 'text', required, lang }) {
  const level = confidence != null ? getConfidenceLevel(confidence) : null;

  return (
    <div className="review-field">
      <div className="review-field-header">
        <label>{label}{required ? ' *' : ''}</label>
        {level && (
          <span
            className={`review-confidence review-confidence-${level}`}
            style={{ color: CONFIDENCE_COLORS[level] }}
          >
            {confidenceLabel(level, lang)}
          </span>
        )}
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`review-input ${level ? `review-input-${level}` : ''} ${!value && required ? 'review-input-empty' : ''}`}
        required={required}
      />
    </div>
  );
}

export default ReviewField;
