import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, Camera, CheckCircle, AlertCircle } from 'lucide-react';

type UploadState = 'idle' | 'scanning' | 'done' | 'error';

interface OCRUploadZoneProps {
  onFileUpload?: (file: File) => Promise<void> | void;
  progress?: number; // 0-100, OCR extraction progress
  isProcessing?: boolean;
}

export function OCRUploadZone({ onFileUpload, progress = 0, isProcessing = false }: OCRUploadZoneProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync external processing state
  const effectiveState = isProcessing ? 'scanning' : state;

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setErrorMsg('File is too large. Max 10MB allowed.');
      setState('error');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Unsupported file type. Use JPG, PNG, WebP, or PDF.');
      setState('error');
      return;
    }

    setState('scanning');
    setErrorMsg('');
    try {
      if (onFileUpload) {
        await onFileUpload(file);
      }
      setState('done');
    } catch (err: any) {
      setErrorMsg(err.message || 'OCR processing failed');
      setState('error');
    }
  };

  const handleClick = () => {
    if (effectiveState === 'idle' || effectiveState === 'error') {
      fileInputRef.current?.click();
    }
  };

  const handleRetry = () => {
    setState('idle');
    setErrorMsg('');
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-xl p-8 transition-all cursor-pointer overflow-hidden ${
        effectiveState === 'idle'
          ? isDragging
            ? 'border-2 border-solid border-[#2f6dff] bg-[#eef4ff]'
            : 'border-2 border-dashed border-[#b9cbe7] bg-[#f8fbff] hover:border-[#2f6dff] hover:bg-[#eef4ff]'
          : effectiveState === 'scanning'
          ? 'border-2 border-solid border-[#2f6dff] bg-[#eef4ff]'
          : effectiveState === 'error'
          ? 'border-2 border-solid border-[#9b3434] bg-[#fde5e5]'
          : 'border-2 border-solid border-[#1d7453] bg-[#dcf8ea]'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Scanning animation */}
      {effectiveState === 'scanning' && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute left-0 right-0 h-1 bg-[#2f6dff] opacity-50"
            style={{
              animation: 'scan 2s linear infinite',
            }}
          />
        </div>
      )}

      <div className="flex flex-col items-center justify-center text-center gap-2">
        {effectiveState === 'idle' && (
          <>
            <Camera className="w-10 h-10 text-[#2f6dff] mb-2" />
            <div
              className="text-base"
              style={{ color: '#0f2a52', fontWeight: 600 }}
            >
              Drop a receipt or click to upload
            </div>
            <div className="text-sm" style={{ color: '#6f85a8' }}>
              Supports JPG, PNG, PDF • Max 10MB
            </div>
          </>
        )}

        {effectiveState === 'scanning' && (
          <>
            <Upload className="w-10 h-10 text-[#2f6dff] mb-2 animate-pulse" />
            <div
              className="text-base"
              style={{ color: '#0f2a52', fontWeight: 600 }}
            >
              {progress > 0 ? `Extracting text... ${progress}%` : 'Scanning receipt with OCR...'}
            </div>
            <div className="text-sm" style={{ color: '#6f85a8' }}>
              {progress > 0 ? 'Running Tesseract.js locally' : 'Extracting expense details'}
            </div>
            {/* Progress bar */}
            {progress > 0 && (
              <div className="w-full max-w-[200px] h-1.5 bg-[#d8e3f2] rounded-full overflow-hidden mt-2">
                <div
                  className="h-full rounded-full bg-[#2f6dff] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </>
        )}

        {effectiveState === 'done' && (
          <>
            <CheckCircle className="w-10 h-10 text-[#1d7453] mb-2" />
            <div
              className="text-base"
              style={{ color: '#1d7453', fontWeight: 600 }}
            >
              Receipt uploaded successfully!
            </div>
            <div className="text-sm" style={{ color: '#6f85a8' }}>
              OCR extraction complete
            </div>
          </>
        )}

        {effectiveState === 'error' && (
          <>
            <AlertCircle className="w-10 h-10 text-[#9b3434] mb-2" />
            <div
              className="text-base"
              style={{ color: '#9b3434', fontWeight: 600 }}
            >
              OCR processing failed
            </div>
            <div className="text-sm" style={{ color: '#9b3434' }}>
              {errorMsg || 'Please try again with a different image'}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleRetry(); }}
              className="mt-2 text-sm text-[#2f6dff] underline hover:text-[#1f56d6]"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
