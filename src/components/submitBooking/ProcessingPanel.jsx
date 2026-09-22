/**
 * ProcessingPanel — moved out of SubmitBooking.jsx, which was one 1,085-line
 * component. The JSX is verbatim; every name it used from the parent scope is
 * now a prop under the same name, so the move cannot change behaviour.
 *
 * The waiting screen while the uploaded document is being extracted.
 */
import { useI18n } from '../../i18n';
import ProcessingStep from './ProcessingStep';

function ProcessingPanel({
  file,
  processingStatus,
}) {
  const { lang } = useI18n();

  return (
      <div className="processing-state animate-in">
        <div className="processing-animation">
          <div className="processing-ring" />
          <div className="processing-ring processing-ring-2" />
          <div className="processing-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
        </div>
        <p className="processing-status">{processingStatus}</p>
        {file && (
          <p className="processing-file">{file.name}</p>
        )}
        <div className="processing-steps">
          <ProcessingStep
            label={lang === 'pt' ? 'Documento recebido' : 'Document received'}
            done={true}
          />
          <ProcessingStep
            label={lang === 'pt' ? 'Extraindo informações' : 'Extracting information'}
            done={processingStatus.includes('Preparando') || processingStatus.includes('Preparing')}
            active={!processingStatus.includes('Preparando') && !processingStatus.includes('Preparing')}
          />
          <ProcessingStep
            label={lang === 'pt' ? 'Preparando revisão' : 'Preparing review'}
            done={false}
            active={processingStatus.includes('Preparando') || processingStatus.includes('Preparing')}
          />
        </div>
      </div>
  );
}

export default ProcessingPanel;
