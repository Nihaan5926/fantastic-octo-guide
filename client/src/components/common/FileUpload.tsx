import React, { useState, useRef, useCallback } from 'react';
import { Upload, File, X, AlertCircle, Check } from 'lucide-react';

interface FileUploadProps {
  acceptedFileTypes?: string;
  maxSizeMB?: number;
  selectedFile: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  isUploading?: boolean;
  className?: string;
}

function formatSize(bytes: number): string {
  if (bytes > 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
  if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

const typeLabels: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'text/plain': 'TXT',
  'text/csv': 'CSV',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/gif': 'GIF',
  'image/webp': 'WEBP',
  'image/svg+xml': 'SVG',
  'video/mp4': 'MP4',
  'video/webm': 'WEBM',
  'audio/mpeg': 'MP3',
  'audio/wav': 'WAV',
  'application/zip': 'ZIP',
  'application/json': 'JSON',
  'application/xml': 'XML',
};

function getTypeLabel(mime: string): string {
  return typeLabels[mime] || mime.split('/')[1]?.toUpperCase() || mime;
}

export default function FileUpload({
  acceptedFileTypes,
  maxSizeMB = 50,
  selectedFile,
  onChange,
  disabled,
  isUploading,
  className,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateFile = useCallback(
    (file: File): boolean => {
      setError(null);
      if (file.size > maxSizeBytes) {
        setError(`File exceeds ${maxSizeMB}MB limit`);
        return false;
      }
      if (acceptedFileTypes) {
        const types = acceptedFileTypes.split(',').map((t) => t.trim());
        const matched = types.some((t) => {
          if (t.endsWith('/*')) {
            return file.type.startsWith(t.replace('/*', '/'));
          }
          return file.type === t;
        });
        if (!matched) {
          setError('File type not supported');
          return false;
        }
      }
      return true;
    },
    [maxSizeBytes, maxSizeMB, acceptedFileTypes],
  );

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file) {
        onChange(null);
        setError(null);
        return;
      }
      if (validateFile(file)) {
        onChange(file);
      }
    },
    [onChange, validateFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0] || null;
      handleFile(file);
    },
    [disabled, handleFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      handleFile(file);
    },
    [handleFile],
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
      setError(null);
      if (inputRef.current) inputRef.current.value = '';
    },
    [onChange],
  );

  return (
    <div className={className}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragOver(false);
        }}
        onDrop={handleDrop}
        onClick={() => !disabled && !selectedFile && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer
          ${isDragOver
            ? 'border-accent bg-accent/5'
            : selectedFile
              ? 'border-accent/50 bg-accent/5'
              : 'border-border hover:border-text-muted bg-bg-tertiary/20'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptedFileTypes}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        {!selectedFile ? (
          <div className="flex flex-col items-center gap-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDragOver ? 'bg-accent/20' : 'bg-bg-tertiary'}`}>
              <Upload size={24} className={isDragOver ? 'text-accent' : 'text-text-muted'} />
            </div>
            <div>
              <p className="text-sm text-text-primary">
                <span className="text-accent font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-text-muted mt-1">
                {acceptedFileTypes
                  ? acceptedFileTypes.split(',').map((t) => t.trim().split('/')[1] || t).join(', ').toUpperCase()
                  : 'Any file type'}
                {' — Max {maxSizeMB}MB'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <File size={20} className="text-accent" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm text-text-primary truncate">{selectedFile.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-text-muted">{formatSize(selectedFile.size)}</span>
                <span className="w-1 h-1 rounded-full bg-text-muted" />
                <span className="text-xs px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary font-mono">
                  {getTypeLabel(selectedFile.type)}
                </span>
              </div>
            </div>
            {!isUploading && !disabled && (
              <button
                onClick={handleRemove}
                className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-red-400 transition-colors"
              >
                <X size={16} />
              </button>
            )}
            {isUploading && (
              <div className="w-5 h-5">
                <svg className="animate-spin text-accent" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </div>
        )}
      </div>

      {isUploading && (
        <div className="mt-3">
          <div className="w-full bg-bg-tertiary rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-accent rounded-full animate-pulse" style={{ width: '100%' }} />
          </div>
          <p className="text-xs text-text-muted mt-1 text-center">Uploading...</p>
        </div>
      )}

      {selectedFile && !isUploading && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-accent">
          <Check size={12} />
          <span>File ready to upload</span>
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-accent-danger">
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
