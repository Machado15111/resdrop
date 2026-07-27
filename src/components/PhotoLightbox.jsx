import { useState, useEffect, useCallback } from 'react';
import './PhotoLightbox.css';

/**
 * Full-screen photo carousel — the pattern every big OTA uses. Works for ANY
 * hotel (SerpApi or Nuitée), independent of catalogue matching. Keyboard: Esc to
 * close, ← / → to navigate. Locks body scroll while open.
 */
export default function PhotoLightbox({ images = [], startIndex = 0, alt = '', onClose }) {
  const count = images.length;
  const [idx, setIdx] = useState(Math.min(Math.max(0, startIndex), Math.max(0, count - 1)));

  const go = useCallback((d) => setIdx(i => (i + d + count) % count), [count]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [go, onClose]);

  if (!count) return null;

  return (
    <div className="lb-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <button className="lb-close" onClick={onClose} aria-label="Close">&times;</button>
      <div className="lb-stage" onClick={(e) => e.stopPropagation()}>
        {count > 1 && (
          <button className="lb-nav lb-prev" onClick={() => go(-1)} aria-label="Previous photo">&#8249;</button>
        )}
        <img className="lb-img" src={images[idx]} alt={`${alt} ${idx + 1}`} />
        {count > 1 && (
          <button className="lb-nav lb-next" onClick={() => go(1)} aria-label="Next photo">&#8250;</button>
        )}
        <div className="lb-counter">{idx + 1} / {count}</div>
      </div>
      {count > 1 && (
        <div className="lb-strip" onClick={(e) => e.stopPropagation()}>
          {images.map((im, i) => (
            <button
              key={i}
              className={`lb-thumb ${i === idx ? 'active' : ''}`}
              onClick={() => setIdx(i)}
              aria-label={`Go to photo ${i + 1}`}
            >
              <img src={im} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
