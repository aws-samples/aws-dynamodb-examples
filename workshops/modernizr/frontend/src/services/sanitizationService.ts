/**
 * Input Sanitization and Validation Service
 * Provides comprehensive input sanitization and validation to prevent XSS attacks
 */

import DOMPurify from 'dompurify';
import { logger } from './logger';

export enum InputType {
  TEXT = 'text',
  EMAIL = 'email',
  PASSWORD = 'password',
  NUMBER = 'number',
  URL = 'url',
  PHONE = 'phone',
  HTML = 'html',
  SEARCH = 'search',
  USERNAME = 'username'
}

export interface ValidationRule {
  type: InputType;
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: string) => boolean;
  sanitize: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  originalValue: string;
  errors: string[];
  warnings: string[];
}

class SanitizationService {
  private static instance: SanitizationService;

  // Common validation patterns
  private readonly patterns = {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    phone: /^[+]?[1-9][\d]{0,15}$/,
    url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
    username: /^[a-zA-Z0-9_-]{3,20}$/,
    strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  };

  // Dangerous patterns to detect
  private readonly dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /data:text\/html/gi,
    /vbscript:/gi
  ];

  private constructor() {
    // Configure DOMPurify
    DOMPurify.setConfig({
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: [],
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      SANITIZE_DOM: true,
      SANITIZE_NAMED_PROPS: true,
      KEEP_CONTENT: false
    });
  }

  public static getInstance(): SanitizationService {
    if (!SanitizationService.instance) {
      SanitizationService.instance = new SanitizationService();
    }
    return SanitizationService.instance;
  }

  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  public sanitizeHtml(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    try {
      const sanitized = DOMPurify.sanitize(input, { 
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false 
      });
      
      // Log if content was modified during sanitization
      if (sanitized !== input) {
        logger.securityEvent('HTML content sanitized', {
          originalLength: input.length,
          sanitizedLength: sanitized.length,
          wasModified: true
        });
      }

      return sanitized;
    } catch (error) {
      logger.error('HTML sanitization failed', error as Error, { input: input.substring(0, 100) });
      return '';
    }
  }

  /**
   * Encode HTML entities to prevent XSS
   */
  public encodeHtmlEntities(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const entityMap: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };

    return input.replace(/[&<>"'`=/]/g, (char) => entityMap[char] || char);
  }

  /**
   * Detect potentially dangerous content
   */
  private detectDangerousContent(input: string): string[] {
    const threats: string[] = [];

    this.dangerousPatterns.forEach((pattern, index) => {
      if (pattern.test(input)) {
        threats.push(`Dangerous pattern ${index + 1} detected`);
      }
    });

    return threats;
  }

  /**
   * Sanitize text input based on type
   */
  public sanitizeInput(input: string, type: InputType): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let sanitized = input.trim();

    switch (type) {
      case InputType.HTML:
        sanitized = this.sanitizeHtml(sanitized);
        break;
      
      case InputType.EMAIL:
        // Remove dangerous characters but preserve email format
        sanitized = sanitized.replace(/[<>'"]/g, '');
        break;
      
      case InputType.URL:
        // Ensure URL is safe
        try {
          const url = new URL(sanitized);
          if (!['http:', 'https:'].includes(url.protocol)) {
            sanitized = '';
          }
        } catch {
          sanitized = '';
        }
        break;
      
      case InputType.USERNAME:
        // Only allow alphanumeric, underscore, and hyphen
        sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, '');
        break;
      
      case InputType.PHONE:
        // Only allow numbers, plus, and hyphens
        sanitized = sanitized.replace(/[^0-9+\-\s()]/g, '');
        break;
      
      case InputType.NUMBER:
        // Only allow numbers and decimal point
        sanitized = sanitized.replace(/[^0-9.-]/g, '');
        break;
      
      case InputType.SEARCH:
        // Remove dangerous characters but allow most text
        sanitized = this.encodeHtmlEntities(sanitized);
        break;
      
      default:
        // For TEXT and other types, encode HTML entities
        sanitized = this.encodeHtmlEntities(sanitized);
        break;
    }

    return sanitized;
  }

  /**
   * Validate input against rules
   */
  public validateInput(input: string, rules: ValidationRule): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      sanitizedValue: '',
      originalValue: input || '',
      errors: [],
      warnings: []
    };

    // Check if input is required
    if (rules.required && (!input || input.trim().length === 0)) {
      result.errors.push('This field is required');
      result.isValid = false;
      return result;
    }

    // If input is empty and not required, return valid
    if (!input || input.trim().length === 0) {
      result.sanitizedValue = '';
      return result;
    }

    // Detect dangerous content before sanitization
    const threats = this.detectDangerousContent(input);
    if (threats.length > 0) {
      logger.securityEvent('Dangerous content detected in input', { threats, input: input.substring(0, 100) });
      result.warnings.push('Potentially dangerous content detected and removed');
    }

    // Sanitize input
    if (rules.sanitize) {
      result.sanitizedValue = this.sanitizeInput(input, rules.type);
    } else {
      result.sanitizedValue = input.trim();
    }

    // Length validation
    if (rules.minLength && result.sanitizedValue.length < rules.minLength) {
      result.errors.push(`Minimum length is ${rules.minLength} characters`);
      result.isValid = false;
    }

    if (rules.maxLength && result.sanitizedValue.length > rules.maxLength) {
      result.errors.push(`Maximum length is ${rules.maxLength} characters`);
      result.isValid = false;
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(result.sanitizedValue)) {
      result.errors.push(this.getPatternErrorMessage(rules.type));
      result.isValid = false;
    }

    // Built-in pattern validation
    if (this.patterns[rules.type as keyof typeof this.patterns]) {
      const pattern = this.patterns[rules.type as keyof typeof this.patterns];
      if (!pattern.test(result.sanitizedValue)) {
        result.errors.push(this.getPatternErrorMessage(rules.type));
        result.isValid = false;
      }
    }

    // Custom validation
    if (rules.customValidator && !rules.customValidator(result.sanitizedValue)) {
      result.errors.push('Invalid input format');
      result.isValid = false;
    }

    return result;
  }

  /**
   * Get user-friendly error message for pattern validation
   */
  private getPatternErrorMessage(type: InputType): string {
    switch (type) {
      case InputType.EMAIL:
        return 'Please enter a valid email address';
      case InputType.PHONE:
        return 'Please enter a valid phone number';
      case InputType.URL:
        return 'Please enter a valid URL';
      case InputType.USERNAME:
        return 'Username can only contain letters, numbers, underscores, and hyphens';
      case InputType.PASSWORD:
        return 'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
      default:
        return 'Invalid format';
    }
  }

  /**
   * Batch sanitize multiple inputs
   */
  public sanitizeMultiple(inputs: { [key: string]: { value: string; type: InputType } }): { [key: string]: string } {
    const sanitized: { [key: string]: string } = {};

    Object.entries(inputs).forEach(([key, { value, type }]) => {
      sanitized[key] = this.sanitizeInput(value, type);
    });

    return sanitized;
  }

  /**
   * Create validation rules for common input types
   */
  public createValidationRules(type: InputType, options: Partial<ValidationRule> = {}): ValidationRule {
    const baseRules: ValidationRule = {
      type,
      required: false,
      sanitize: true,
      ...options
    };

    switch (type) {
      case InputType.EMAIL:
        return {
          ...baseRules,
          maxLength: 254,
          pattern: this.patterns.email
        };
      
      case InputType.PASSWORD:
        return {
          ...baseRules,
          minLength: 8,
          maxLength: 128,
          pattern: this.patterns.strongPassword
        };
      
      case InputType.USERNAME:
        return {
          ...baseRules,
          minLength: 3,
          maxLength: 20,
          pattern: this.patterns.username
        };
      
      case InputType.PHONE:
        return {
          ...baseRules,
          pattern: this.patterns.phone
        };
      
      case InputType.URL:
        return {
          ...baseRules,
          pattern: this.patterns.url
        };
      
      default:
        return baseRules;
    }
  }
}

// Export singleton instance
export const sanitizationService = SanitizationService.getInstance();

// Convenience exports
export const sanitizeHtml = (input: string) => sanitizationService.sanitizeHtml(input);
export const encodeHtml = (input: string) => sanitizationService.encodeHtmlEntities(input);
export const sanitizeInput = (input: string, type: InputType) => sanitizationService.sanitizeInput(input, type);
export const validateInput = (input: string, rules: ValidationRule) => sanitizationService.validateInput(input, rules);

export default sanitizationService;