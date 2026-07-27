import React from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  children?: React.ReactNode;
  required?: boolean;
  className?: string;
}

export function FormField({ label, error, children, required, className }: FormFieldProps) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-text-secondary mb-1.5">
        {label}{required && <span className="text-accent-danger ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-accent-danger mt-1">{error}</p>}
    </div>
  );
}

export function FormInput({ label, error, ...props }: FormFieldProps & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FormField label={label} error={error} required={props.required} className={props.className}>
      <input {...props} className={`input ${props.className || ''}`} />
    </FormField>
  );
}

export function FormTextarea({ label, error, ...props }: FormFieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FormField label={label} error={error} required={props.required} className={props.className}>
      <textarea {...props} className={`input min-h-[100px] resize-y ${props.className || ''}`} />
    </FormField>
  );
}

export function FormSelect({ label, error, options, placeholder, ...props }: FormFieldProps & React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <FormField label={label} error={error} required={props.required} className={props.className}>
      <select {...props} className={`input ${props.className || ''}`}>
        <option value="">{placeholder || 'Select...'}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </FormField>
  );
}
