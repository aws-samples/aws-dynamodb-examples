import { useState } from 'react';
import { sanitizationService, InputType, ValidationRule } from '../services/sanitizationService';
import { logger } from '../services/logger';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'url' | 'search';
  value: string | number;
  onChange: (name: string, value: string | number) => void;
  onBlur?: (name: string) => void;
  error?: string | undefined;
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
  // Security and validation props
  sanitize?: boolean;
  validationRules?: Partial<ValidationRule>;
  onValidationChange?: (isValid: boolean, errors: string[], warnings: string[]) => void;
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
  helpText,
  sanitize = true,
  validationRules,
  onValidationChange
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasBeenTouched, setHasBeenTouched] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Map HTML input types to InputType enum
  const getInputType = (htmlType: string): InputType => {
    switch (htmlType) {
      case 'email': return InputType.EMAIL;
      case 'password': return InputType.PASSWORD;
      case 'number': return InputType.NUMBER;
      case 'url': return InputType.URL;
      case 'search': return InputType.SEARCH;
      case 'textarea': return InputType.TEXT;
      default: return InputType.TEXT;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    let newValue: string | number = e.target.value;
    
    // Handle number inputs
    if (type === 'number') {
      newValue = parseFloat(e.target.value) || 0;
      onChange(name, newValue);
      return;
    }

    // Handle select inputs (no sanitization needed)
    if (type === 'select') {
      onChange(name, newValue);
      return;
    }

    // Apply sanitization and validation for text-based inputs
    if (sanitize && typeof newValue === 'string') {
      try {
        const inputType = getInputType(type);
        const rules: ValidationRule = validationRules ? 
          { ...sanitizationService.createValidationRules(inputType, { required }), ...validationRules } :
          sanitizationService.createValidationRules(inputType, { required });
        const validationResult = sanitizationService.validateInput(newValue, rules);

        // Update validation state
        setValidationErrors(validationResult.errors);
        setValidationWarnings(validationResult.warnings);

        // Notify parent of validation changes
        if (onValidationChange) {
          onValidationChange(validationResult.isValid, validationResult.errors, validationResult.warnings);
        }

        // Use sanitized value
        newValue = validationResult.sanitizedValue;

        // Log security events if content was modified
        if (validationResult.originalValue !== validationResult.sanitizedValue) {
          logger.securityEvent('Input sanitized', {
            field: name,
            originalLength: validationResult.originalValue.length,
            sanitizedLength: validationResult.sanitizedValue.length
          });
        }

      } catch (sanitizationError) {
        logger.error('Input sanitization failed', sanitizationError as Error, { field: name });
        // Fall back to basic HTML encoding
        newValue = sanitizationService.encodeHtmlEntities(newValue);
      }
    }

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

  // Combine external errors with validation errors
  const allErrors = [
    ...(error ? [error] : []),
    ...validationErrors
  ];

  // Show error only after field has been touched or if there's a value
  const shouldShowError = allErrors.length > 0 && (hasBeenTouched || value);
  const displayError = allErrors[0]; // Show first error

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
          <p className="text-sm text-red-600">{displayError}</p>
        </div>
      )}

      {/* Warning messages */}
      {validationWarnings.length > 0 && !shouldShowError && (
        <div className="mt-1 flex items-center">
          <svg className="w-4 h-4 text-yellow-500 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-sm text-yellow-600">{validationWarnings[0]}</p>
        </div>
      )}

      {/* Help text */}
      {helpText && !shouldShowError && validationWarnings.length === 0 && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
};

export default FormField;