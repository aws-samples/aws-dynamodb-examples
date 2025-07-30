import { AppError, ErrorTypes } from '../middleware/errorHandler';

interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  BCRYPT_SALT_ROUNDS: number;
}

export function validateEnvironmentVariables(): EnvironmentConfig {
  const requiredVars = [
    'DB_HOST',
    'DB_USER', 
    'DB_NAME',
    'JWT_SECRET'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new AppError(
      `Missing required environment variables: ${missingVars.join(', ')}`,
      500,
      ErrorTypes.INTERNAL_SERVER_ERROR
    );
  }

  // Validate JWT secret strength (relaxed for test environment)
  const jwtSecret = process.env.JWT_SECRET!;
  const isTestEnv = process.env.NODE_ENV === 'test';
  const minLength = isTestEnv ? 16 : 32;
  
  if (jwtSecret.length < minLength) {
    throw new AppError(
      `JWT_SECRET must be at least ${minLength} characters long for security`,
      500,
      ErrorTypes.INTERNAL_SERVER_ERROR
    );
  }

  // Check for default/weak values (skip in test environment)
  if (!isTestEnv) {
    const weakSecrets = [
      'your-super-secret-jwt-key-change-this-in-production-make-it-long-and-random',
      'secret',
      'jwt-secret',
      'change-me'
    ];
    
    if (weakSecrets.includes(jwtSecret)) {
      throw new AppError(
        'JWT_SECRET is using a default or weak value. Please use a cryptographically secure random string.',
        500,
        ErrorTypes.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Validate database password in production
  if (process.env.NODE_ENV === 'production' && !process.env.DB_PASSWORD) {
    throw new AppError(
      'DB_PASSWORD is required in production environment',
      500,
      ErrorTypes.INTERNAL_SERVER_ERROR
    );
  }

  // Warn about empty database password in development (but not test)
  if (process.env.NODE_ENV === 'development' && !process.env.DB_PASSWORD) {
    console.warn('⚠️  WARNING: Database password is empty. This is only acceptable in development.');
  }

  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '8100', 10),
    DB_HOST: process.env.DB_HOST!,
    DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
    DB_USER: process.env.DB_USER!,
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_NAME: process.env.DB_NAME!,
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10)
  };
}

export const config = validateEnvironmentVariables();