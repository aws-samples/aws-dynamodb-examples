import React, { useState, useEffect } from 'react';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select';
  value: string | number;
  onChange: (name: string, value: string | number) => void;
  onBlur?: (name: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { value: string | number; label: string }[];
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  autoComplete?: string;
  className?: string;
  helpText?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  required = false,
  disabled = false,
  options = [],
  rows = 3,
  min,
  max,
  step,
  autoComplete,
  className = '',
  helpText
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasBeenTouched, setHasBeenTouched] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const newValue = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    onChange(name, newValue);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setHasBeenTouched(true);
    if (onBlur) {
      onBlur(name);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  // Show error only after field has been touched or if there's a value
  const shouldShowError = error && (hasBeenTouched || value);

  const baseInputClasses = `
    w-full px-3 py-2 border rounded-md transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${shouldShowError 
      ? 'border-red-500 focus:ring-red-500' 
      : 'border-gray-300 hover:border-gray-400'
    }
    ${className}
  `.trim();

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            rows={rows}
            className={baseInputClasses}
            autoComplete={autoComplete}
          />
        );

      case 'select':
        return (
          <select
            id={name}
            name={name}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            required={required}
            disabled={disabled}
            className={baseInputClasses}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            className={baseInputClasses}
            autoComplete={autoComplete}
          />
        );
    }
  };

  return (
    <div className="mb-4">
      <label
        htmlFor={name}
        className={`
          block text-sm font-medium mb-1 transition-colors duration-200
          ${shouldShowError ? 'text-red-700' : 'text-gray-700'}
          ${required ? "after:content-['*'] after:text-red-500 after:ml-1" : ''}
        `}
      >
        {label}
      </label>

      <div className="relative">
        {renderInput()}
        
        {/* Focus indicator */}
        {isFocused && !shouldShowError && (
          <div className="absolute inset-0 rounded-md ring-2 ring-blue-500 pointer-events-none" />
        )}
      </div>

      {/* Error message */}
      {shouldShowError && (
        <div className="mt-1 flex items-center">
          <svg className="w-4 h-4 text-red-500 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Help text */}
      {helpText && !shouldShowError && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
};

export default FormField;