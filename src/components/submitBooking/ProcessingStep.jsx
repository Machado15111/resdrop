import { IconCheck } from '../Icons';

/** One line in the "extracting your booking" progress list. */
function ProcessingStep({ label, done, active }) {
  return (
    <div className={`processing-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
      <div className="processing-step-dot">
        {done && <IconCheck size={10} />}
      </div>
      <span>{label}</span>
    </div>
  );
}

export default ProcessingStep;
