/**
 * IntakeStep — moved out of SubmitBooking.jsx, which was one 1,085-line
 * component. The JSX is verbatim; every name it used from the parent scope is
 * now a prop under the same name, so the move cannot change behaviour.
 *
 * The first screen: drop a confirmation file, paste the text, forward it by
 * email, or fall through to typing it in by hand.
 */
import { useI18n } from '../../i18n';
import { IconUpload, IconMail, IconArrowRight, IconCheck, IconX, IconShield } from '../Icons';
import { STEP_MANUAL } from './constants';

function IntakeStep({
  copiedEmail,
  copyForwardAddress,
  dropzoneRef,
  error,
  fileInputRef,
  forwardAddress,
  handleDragEnter,
  handleDragLeave,
  handleDragOver,
  handleDrop,
  handleFileSelect,
  isDragging,
  pasteText,
  processPastedText,
  setPasteText,
  setShowForwardEmail,
  setShowPaste,
  setSourceType,
  setStep,
  showForwardEmail,
  showPaste,
}) {
  const { lang } = useI18n();

  return (
      <div className="intake-flow animate-in">
        {/* Drop zone */}
        <div
          ref={dropzoneRef}
          className={`intake-dropzone ${isDragging ? 'intake-dropzone-active' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <div className="intake-dropzone-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="12" y2="12" />
              <line x1="15" y1="15" x2="12" y2="12" />
            </svg>
          </div>
          <p className="intake-dropzone-title">
            {lang === 'pt'
              ? 'Arraste seu comprovante de reserva aqui'
              : 'Drop your booking confirmation here'}
          </p>
          <p className="intake-dropzone-subtitle">
            {lang === 'pt'
              ? 'ou clique para selecionar um arquivo'
              : 'or click to select a file'}
          </p>
          <div className="intake-formats">
            <span className="intake-format-pill">PDF</span>
            <span className="intake-format-pill">PNG</span>
            <span className="intake-format-pill">JPG</span>
            <span className="intake-format-pill">Screenshot</span>
          </div>
        </div>

        {/* What we can read */}
        <div className="intake-capabilities">
          <p className="intake-capabilities-title">
            {lang === 'pt' ? 'O que podemos ler:' : 'What we can read:'}
          </p>
          <div className="intake-capabilities-list">
            <span>
              <IconCheck size={14} />
              {lang === 'pt' ? 'PDF de confirmação' : 'Confirmation PDF'}
            </span>
            <span>
              <IconCheck size={14} />
              {lang === 'pt' ? 'Screenshot da reserva' : 'Booking screenshot'}
            </span>
            <span>
              <IconCheck size={14} />
              {lang === 'pt' ? 'Email de confirmação' : 'Confirmation email'}
            </span>
            <span>
              <IconCheck size={14} />
              {lang === 'pt' ? 'Texto copiado' : 'Copied text'}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="intake-divider">
          <span>{lang === 'pt' ? 'ou' : 'or'}</span>
        </div>

        {/* Paste text toggle */}
        {!showPaste && !showForwardEmail ? (
          <div className="intake-alt-actions">
            <button className="intake-alt-btn" onClick={() => setShowPaste(true)}>
              <IconMail size={16} />
              {lang === 'pt' ? 'Colar email ou texto de confirmação' : 'Paste confirmation email or text'}
            </button>
            <button className="intake-alt-btn" onClick={() => setShowForwardEmail(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 17 20 12 15 7" />
                <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
              </svg>
              {lang === 'pt' ? 'Encaminhar email de confirmação' : 'Forward confirmation email'}
            </button>
            <button className="intake-alt-btn" onClick={() => { setSourceType('manual'); setStep(STEP_MANUAL); }}>
              <IconUpload size={16} />
              {lang === 'pt' ? 'Preencher manualmente' : 'Enter manually'}
            </button>
          </div>
        ) : (
          <div className="intake-paste-area animate-in">
            <label className="intake-paste-label">
              {lang === 'pt'
                ? 'Cole o email de confirmação, texto copiado ou dados da reserva:'
                : 'Paste your confirmation email, copied text, or booking details:'}
            </label>
            <textarea
              className="intake-textarea"
              placeholder={lang === 'pt'
                ? 'Cole aqui o conteúdo do email de confirmação do hotel, ou os dados da reserva em qualquer formato...'
                : 'Paste your hotel confirmation email content, or booking details in any format...'}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={8}
              autoFocus
            />
            <div className="intake-paste-actions">
              <button
                className="intake-paste-cancel"
                onClick={() => { setShowPaste(false); setPasteText(''); }}
              >
                {lang === 'pt' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                className="intake-paste-submit"
                onClick={processPastedText}
                disabled={!pasteText.trim()}
              >
                {lang === 'pt' ? 'Analisar e Extrair' : 'Analyze & Extract'}
                <IconArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Forward email panel */}
        {showForwardEmail && !showPaste && (
          <div className="intake-forward-area animate-in">
            <div className="intake-forward-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 17 20 12 15 7" />
                <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
              </svg>
              <span>
                {lang === 'pt'
                  ? 'Encaminhe o email de confirmação do hotel para:'
                  : 'Forward your hotel confirmation email to:'}
              </span>
            </div>
            <div className="intake-forward-address-box">
              <code className="intake-forward-address">
                {forwardAddress || 'reservas@resdrop.app'}
              </code>
              <span className="intake-forward-alt">
                {lang === 'pt' ? 'ou' : 'or'} <code>reservations@resdrop.app</code>
              </span>
              <button className="intake-forward-copy" onClick={copyForwardAddress}>
                {copiedEmail ? (
                  <>
                    <IconCheck size={14} />
                    {lang === 'pt' ? 'Copiado!' : 'Copied!'}
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    {lang === 'pt' ? 'Copiar' : 'Copy'}
                  </>
                )}
              </button>
            </div>
            <div className="intake-forward-steps">
              <div className="intake-forward-step">
                <span className="intake-forward-step-num">1</span>
                <span>{lang === 'pt'
                  ? 'Abra o email de confirmação do hotel no seu email'
                  : 'Open the hotel confirmation email in your inbox'}</span>
              </div>
              <div className="intake-forward-step">
                <span className="intake-forward-step-num">2</span>
                <span>{lang === 'pt'
                  ? 'Encaminhe para o endereço acima'
                  : 'Forward it to the address above'}</span>
              </div>
              <div className="intake-forward-step">
                <span className="intake-forward-step-num">3</span>
                <span>{lang === 'pt'
                  ? 'Extraímos os dados automaticamente e notificamos você'
                  : 'We extract the data automatically and notify you'}</span>
              </div>
            </div>
            <p className="intake-forward-note">
              <IconShield size={14} />
              {lang === 'pt'
                ? 'Use o mesmo email cadastrado no ResDrop. Emails de remetentes não cadastrados são descartados.'
                : 'Use the same email registered on ResDrop. Emails from unregistered senders are discarded.'}
            </p>
            <button
              className="intake-paste-cancel"
              onClick={() => setShowForwardEmail(false)}
            >
              {lang === 'pt' ? 'Voltar' : 'Back'}
            </button>
          </div>
        )}

        {error && <p className="intake-error">{error}</p>}
      </div>
  );
}

export default IntakeStep;
