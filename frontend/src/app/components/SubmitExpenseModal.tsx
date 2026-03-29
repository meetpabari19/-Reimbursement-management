import { useState } from 'react';
import { PrimaryButton } from './PrimaryButton';
import { GhostButton } from './GhostButton';
import { OCRUploadZone } from './OCRUploadZone';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { invokeEdgeFunction } from '../../api/supabase';
import { processReceiptImage, type OcrResult } from '../../api/ocrService';

interface SubmitExpenseModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

type SubmissionMode = 'ocr' | 'manual';

export function SubmitExpenseModal({ onClose, onSuccess }: SubmitExpenseModalProps) {
  const [mode, setMode] = useState<SubmissionMode>('ocr');

  // Receipt-extracted fields
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [receiptUploaded, setReceiptUploaded] = useState(false);

  // Trip context fields — not extractable from receipt
  const [tripName, setTripName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [tripStartDate, setTripStartDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [purpose, setPurpose] = useState('');

  // OCR state
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrRawText, setOcrRawText] = useState('');
  const [showRawText, setShowRawText] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyOcrResult = (result: OcrResult) => {
    if (result.amount) setAmount(result.amount);
    if (result.currency) setCurrency(result.currency);
    if (result.date) setDate(result.date);
    if (result.category) setCategory(result.category);
    if (result.description) setDescription(result.description);
    if (result.merchant) setMerchant(result.merchant);
    if (result.rawText) setOcrRawText(result.rawText);
    setReceiptUploaded(true);
  };

  const handleFileUpload = async (file: File) => {
    setError(null);
    setOcrProcessing(true);
    setOcrProgress(0);

    try {
      // First, try the backend OCR edge function
      try {
        const formData = new FormData();
        formData.append('file', file);

        const data = await invokeEdgeFunction('ocr-extract', {
          method: 'POST',
          body: formData,
        });

        // Only accept backend result if it actually extracted something meaningful
        // (If backend has no Vision API keys, it might return dummy values with empty ocr_raw)
        if (data && (data.ocr_raw?.trim()?.length > 5 || data.amount)) {
          applyOcrResult({
            amount: data.amount || '',
            currency: data.currency || 'USD',
            category: data.category || '',
            description: data.description || '',
            date: data.date || '',
            merchant: data.merchant || '',
            rawText: data.ocr_raw || '',
          });
          setOcrProcessing(false);
          return;
        } else {
          console.warn('Backend returned empty OCR data, trying client-side instead...');
        }
      } catch (backendErr) {
        console.warn('Backend OCR failed, falling back to client-side:', backendErr);
      }

      // Fallback: Client-side OCR with Tesseract.js + Gemini AI
      const result = await processReceiptImage(file, (progress) => {
        setOcrProgress(progress);
      });

      applyOcrResult(result);
    } catch (err: any) {
      console.error(err);
      setError("OCR failed: " + (err.message || 'Unknown error'));
    } finally {
      setOcrProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        category,
        description: tripName
          ? `[${tripName}${projectCode ? ' - ' + projectCode : ''}] ${description}`
          : description,
        amount: parseFloat(amount),
        currency_code: currency,
        date,
        ocr_raw: {
          tripStartDate,
          paymentMethod,
          purpose,
          merchant,
          projectCode,
          tripName,
        }
      };

      await invokeEdgeFunction('expenses', {
        method: 'POST',
        body: payload
      });

      if (onSuccess) onSuccess();
      else onClose();
    } catch (err: any) {
      setError(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const ocrValid = !!(
    receiptUploaded &&
    amount && currency && category && date && description &&
    tripName && tripStartDate && paymentMethod && purpose
  );
  const manualValid = !!(amount && currency && category && date && description && tripName && tripStartDate && paymentMethod && purpose);
  const isValid = mode === 'ocr' ? ocrValid : manualValid;

  const exchangeRates: Record<string, number> = {
    USD: 1, EUR: 1.09, GBP: 1.27, INR: 0.012,
  };
  const usdEstimate =
    amount && currency !== 'USD'
      ? (parseFloat(amount) * (exchangeRates[currency] || 1)).toFixed(2)
      : null;

  const fieldClass =
    'w-full px-4 py-2.5 rounded-[10px] border transition-all focus:outline-none focus:ring-2 focus:ring-[#2f6dff]/30';
  const fieldStyle = { borderColor: '#cdd9ec', backgroundColor: '#fbfdff' };
  const tripFieldStyle = { borderColor: '#cdd9ec', backgroundColor: '#ffffff' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#08162f]"
        style={{ opacity: 0.48, backdropFilter: 'blur(4px)' }}
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-[18px] w-full max-w-[580px] flex flex-col"
        style={{ boxShadow: '0 24px 60px rgba(8, 22, 47, 0.22)', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Fixed Header ── */}
        <div className="px-8 pt-8 pb-5 flex-shrink-0 border-b border-[#edf2fa]">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-[#6f85a8] hover:text-[#335079] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <h3
            className="text-2xl mb-1"
            style={{ fontFamily: 'var(--font-heading)', color: '#0f2a52', fontWeight: 600 }}
          >
            Submit New Expense
          </h3>
          <p className="text-sm mb-5" style={{ color: '#6f85a8' }}>
            {mode === 'ocr'
              ? 'Upload receipt — OCR extracts the details, then fill in trip context'
              : 'Enter expense details and optionally attach a receipt'}
          </p>

          {/* Mode Toggle */}
          <div className="flex rounded-full bg-[#f6f8fd] p-1">
            <button
              onClick={() => { setMode('ocr'); setReceiptUploaded(false); }}
              className={`flex-1 py-2.5 rounded-full transition-all text-sm ${
                mode === 'ocr' ? 'bg-[#2f6dff] text-white' : 'text-[#6f85a8]'
              }`}
              style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}
            >
              📸 OCR Submit
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 py-2.5 rounded-full transition-all text-sm ${
                mode === 'manual' ? 'bg-[#2f6dff] text-white' : 'text-[#6f85a8]'
              }`}
              style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}
            >
              ✍️ Manual Entry
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-8 pt-6">

            {mode === 'ocr' ? (
              <>
                {/* Upload Zone */}
                <div className="mb-6">
                  <OCRUploadZone
                    onFileUpload={handleFileUpload}
                    progress={ocrProgress}
                    isProcessing={ocrProcessing}
                  />
                </div>

                {receiptUploaded && (
                  <>
                    {/* OCR success banner */}
                    <div
                      className="mb-5 text-sm px-4 py-2.5 bg-[#dcf8ea] text-[#1d7453] rounded-lg"
                      style={{ fontWeight: 500 }}
                    >
                      ✓ OCR extracted data — verify below then fill in the trip context.
                    </div>

                    {/* Raw OCR Text Preview (collapsible) */}
                    {ocrRawText && (
                      <div className="mb-5">
                        <button
                          type="button"
                          onClick={() => setShowRawText(!showRawText)}
                          className="flex items-center gap-1 text-xs text-[#6f85a8] hover:text-[#335079] transition-colors"
                        >
                          {showRawText ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {showRawText ? 'Hide' : 'Show'} raw OCR text
                        </button>
                        {showRawText && (
                          <pre className="mt-2 p-3 bg-[#f6f8fd] rounded-lg text-xs text-[#335079] max-h-32 overflow-y-auto whitespace-pre-wrap border border-[#dbe5f4]">
                            {ocrRawText}
                          </pre>
                        )}
                      </div>
                    )}

                    {/* ── FROM RECEIPT section ── */}
                    <p className="text-xs uppercase tracking-wider mb-3" style={{ color: '#9bb0cc', fontWeight: 700 }}>
                      From Receipt
                    </p>

                    <div className="space-y-4 mb-7">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="ocr-amount" className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                            Amount <span className="text-[#1d7453] font-normal">✓ Extracted</span>
                          </label>
                          <input
                            id="ocr-amount" type="number" step="0.01"
                            value={amount} onChange={(e) => setAmount(e.target.value)}
                            className={fieldClass} style={fieldStyle} placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label htmlFor="ocr-currency" className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                            Currency
                          </label>
                          <select
                            id="ocr-currency" value={currency} onChange={(e) => setCurrency(e.target.value)}
                            className={fieldClass} style={fieldStyle}
                          >
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                            <option value="INR">INR</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="ocr-category" className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                            Category <span className="text-[#9b6f1b] font-normal">⚠ Required</span>
                          </label>
                          <select
                            id="ocr-category" value={category} onChange={(e) => setCategory(e.target.value)}
                            className={fieldClass} style={fieldStyle}
                          >
                            <option value="">Select category</option>
                            <option value="Travel">Travel</option>
                            <option value="Meals">Meals</option>
                            <option value="Supplies">Supplies</option>
                            <option value="Transport">Transport</option>
                            <option value="Accommodation">Accommodation</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="ocr-date" className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                            Receipt Date <span className="text-[#1d7453] font-normal">✓ Extracted</span>
                          </label>
                          <input
                            id="ocr-date" type="date"
                            value={date} onChange={(e) => setDate(e.target.value)}
                            className={fieldClass} style={fieldStyle}
                          />
                        </div>
                      </div>

                      {merchant && (
                        <div>
                          <label htmlFor="ocr-merchant" className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                            Merchant <span className="text-[#1d7453] font-normal">✓ Extracted</span>
                          </label>
                          <input
                            id="ocr-merchant" type="text"
                            value={merchant} onChange={(e) => setMerchant(e.target.value)}
                            className={fieldClass} style={fieldStyle}
                          />
                        </div>
                      )}

                      <div>
                        <label htmlFor="ocr-description" className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                          Description <span className="text-[#1d7453] font-normal">✓ Extracted</span>
                        </label>
                        <textarea
                          id="ocr-description" rows={2}
                          value={description} onChange={(e) => setDescription(e.target.value)}
                          className={`${fieldClass} resize-none`} style={fieldStyle}
                          placeholder="Brief description of the expense"
                        />
                      </div>
                    </div>

                    {/* ── TRIP CONTEXT section — not on the receipt ── */}
                    <div
                      className="rounded-[14px] p-5 mb-6"
                      style={{ backgroundColor: '#f4f7fd', border: '1.5px dashed #c5d5ee' }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span>🗺️</span>
                        <p className="text-xs uppercase tracking-wider" style={{ color: '#6f85a8', fontWeight: 700 }}>
                          Trip &amp; Context
                        </p>
                      </div>
                      <p className="text-xs mb-4" style={{ color: '#9bb0cc' }}>
                        These details are not on the receipt — please fill them in manually.
                      </p>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="ocr-trip-name" className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                              Trip / Event Name <span className="text-[#9b6f1b] font-normal">⚠</span>
                            </label>
                            <input
                              id="ocr-trip-name" type="text"
                              value={tripName} onChange={(e) => setTripName(e.target.value)}
                              className={fieldClass} style={tripFieldStyle}
                              placeholder="e.g. Mumbai Client Visit Q1"
                            />
                          </div>
                          <div>
                            <label htmlFor="ocr-project-code" className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                              Project / Cost Code
                            </label>
                            <input
                              id="ocr-project-code" type="text"
                              value={projectCode} onChange={(e) => setProjectCode(e.target.value)}
                              className={fieldClass} style={tripFieldStyle}
                              placeholder="e.g. PRJ-2024-087"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="ocr-trip-start" className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                              Trip Start Date <span className="text-[#9b6f1b] font-normal">⚠</span>
                            </label>
                            <input
                              id="ocr-trip-start" type="date"
                              value={tripStartDate} onChange={(e) => setTripStartDate(e.target.value)}
                              className={fieldClass} style={tripFieldStyle}
                            />
                          </div>
                          <div>
                            <label htmlFor="ocr-payment" className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                              Payment Method <span className="text-[#9b6f1b] font-normal">⚠</span>
                            </label>
                            <select
                              id="ocr-payment"
                              value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                              className={fieldClass} style={tripFieldStyle}
                            >
                              <option value="">Select method</option>
                              <option value="Corporate Card">Corporate Card</option>
                              <option value="Personal Card">Personal Card</option>
                              <option value="Cash">Cash</option>
                              <option value="Bank Transfer">Bank Transfer</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="ocr-purpose" className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                            Purpose of Expense <span className="text-[#9b6f1b] font-normal">⚠</span>
                          </label>
                          <textarea
                            id="ocr-purpose" rows={2}
                            value={purpose} onChange={(e) => setPurpose(e.target.value)}
                            className={`${fieldClass} resize-none`} style={tripFieldStyle}
                            placeholder="e.g. Client entertainment during product demo trip to Mumbai"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              /* ── Manual Mode ── */
              <>
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="manual-amount" className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                        Amount
                      </label>
                      <input
                        id="manual-amount" type="number" step="0.01"
                        value={amount} onChange={(e) => setAmount(e.target.value)}
                        className={fieldClass} style={fieldStyle} placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label htmlFor="manual-currency" className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                        Currency
                      </label>
                      <select
                        id="manual-currency" value={currency} onChange={(e) => setCurrency(e.target.value)}
                        className={fieldClass} style={fieldStyle}
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="INR">INR</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="manual-category" className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                        Category
                      </label>
                      <select
                        id="manual-category" value={category} onChange={(e) => setCategory(e.target.value)}
                        className={fieldClass} style={fieldStyle}
                      >
                        <option value="">Select category</option>
                        <option value="Travel">Travel</option>
                        <option value="Meals">Meals</option>
                        <option value="Supplies">Supplies</option>
                        <option value="Transport">Transport</option>
                        <option value="Accommodation">Accommodation</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="manual-date" className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                        Date
                      </label>
                      <input
                        id="manual-date" type="date"
                        value={date} onChange={(e) => setDate(e.target.value)}
                        className={fieldClass} style={fieldStyle}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="manual-description" className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                      Description
                    </label>
                    <textarea
                      id="manual-description" rows={2}
                      value={description} onChange={(e) => setDescription(e.target.value)}
                      className={`${fieldClass} resize-none`} style={fieldStyle}
                      placeholder="Brief description of the expense"
                    />
                  </div>
                </div>

                <div className="mb-7">
                  <label className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                    Receipt <span style={{ color: '#9bb0cc' }}>(Optional)</span>
                  </label>
                  <OCRUploadZone
                    onFileUpload={handleFileUpload}
                    progress={ocrProgress}
                    isProcessing={ocrProcessing}
                  />
                </div>

                {/* ── TRIP CONTEXT — same schema as OCR ── */}
                <div
                  className="rounded-[14px] p-5 mb-6"
                  style={{ backgroundColor: '#f4f7fd', border: '1.5px dashed #c5d5ee' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>🗺️</span>
                    <p className="text-xs uppercase tracking-wider" style={{ color: '#6f85a8', fontWeight: 700 }}>
                      Trip &amp; Context
                    </p>
                  </div>
                  <p className="text-xs mb-4" style={{ color: '#9bb0cc' }}>
                    Provide trip context for this expense.
                  </p>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="manual-trip-name" className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                          Trip / Event Name <span className="text-[#9b6f1b] font-normal">⚠</span>
                        </label>
                        <input
                          id="manual-trip-name" type="text"
                          value={tripName} onChange={(e) => setTripName(e.target.value)}
                          className={fieldClass} style={tripFieldStyle}
                          placeholder="e.g. Mumbai Client Visit Q1"
                        />
                      </div>
                      <div>
                        <label htmlFor="manual-project-code" className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                          Project / Cost Code
                        </label>
                        <input
                          id="manual-project-code" type="text"
                          value={projectCode} onChange={(e) => setProjectCode(e.target.value)}
                          className={fieldClass} style={tripFieldStyle}
                          placeholder="e.g. PRJ-2024-087"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="manual-trip-start" className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                          Trip Start Date <span className="text-[#9b6f1b] font-normal">⚠</span>
                        </label>
                        <input
                          id="manual-trip-start" type="date"
                          value={tripStartDate} onChange={(e) => setTripStartDate(e.target.value)}
                          className={fieldClass} style={tripFieldStyle}
                        />
                      </div>
                      <div>
                        <label htmlFor="manual-payment" className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                          Payment Method <span className="text-[#9b6f1b] font-normal">⚠</span>
                        </label>
                        <select
                          id="manual-payment"
                          value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                          className={fieldClass} style={tripFieldStyle}
                        >
                          <option value="">Select method</option>
                          <option value="Corporate Card">Corporate Card</option>
                          <option value="Personal Card">Personal Card</option>
                          <option value="Cash">Cash</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="manual-purpose" className="block mb-2 text-sm" style={{ color: '#335079', fontWeight: 500 }}>
                        Purpose of Expense <span className="text-[#9b6f1b] font-normal">⚠</span>
                      </label>
                      <textarea
                        id="manual-purpose" rows={2}
                        value={purpose} onChange={(e) => setPurpose(e.target.value)}
                        className={`${fieldClass} resize-none`} style={tripFieldStyle}
                        placeholder="e.g. Client entertainment during product demo trip"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {usdEstimate && (
              <div className="mb-4 text-sm px-4 py-2.5 bg-[#f6f8fd] rounded-lg" style={{ color: '#6f85a8' }}>
                Approx. USD equivalent: <strong>${usdEstimate}</strong>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center px-8 py-5 border-t border-[#edf2fa] flex-shrink-0">
            <div className="text-red-500 text-sm font-medium">{error || ''}</div>
            <div className="flex gap-3">
              <GhostButton onClick={onClose}>Cancel</GhostButton>
              <PrimaryButton type="submit" disabled={!isValid || submitting}>
                {submitting ? 'Submitting...' : 'Submit Expense →'}
              </PrimaryButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}