import bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { CreateUserRequest, LoginRequest, AuthResponse, toUserResponse, UpdateUserRequest } from '../models/User';
import { config } from '../config/env';
import { AppError, ErrorTypes } from '../middleware/errorHandler';

export class AuthService {
  private userRepository: UserRepository;
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private saltRounds: number;

  constructor() {
    this.userRepository = new UserRepository();
    this.jwtSecret = config.JWT_SECRET;
    this.jwtExpiresIn = config.JWT_EXPIRES_IN;
    this.saltRounds = config.BCRYPT_SALT_ROUNDS;
  }

  async register(userData: CreateUserRequest): Promise<AuthResponse> {
    try {
      // Validate input
      this.validateRegistrationData(userData);

      // Check if username already exists
      const existingUserByUsername = await this.userRepository.findByUsername(userData.username);
      if (existingUserByUsername) {
        throw new AppError('Username already exists', 409, ErrorTypes.CONFLICT_ERROR);
      }

      // Check if email already exists
      const existingUserByEmail = await this.userRepository.findByEmail(userData.email);
      if (existingUserByEmail) {
        throw new AppError('Email already exists', 409, ErrorTypes.CONFLICT_ERROR);
      }

      // Hash password
      const password_hash = await bcrypt.hash(userData.password, this.saltRounds);

      // Create user
      const user = await this.userRepository.create({
        ...userData,
        password_hash
      });

      // Generate JWT token
      const token = this.generateToken(user.id);

      return {
        user: toUserResponse(user),
        token
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async login(loginData: LoginRequest): Promise<AuthResponse> {
    try {
      // Validate input
      this.validateLoginData(loginData);

      // Find user by username
      const user = await this.userRepository.findByUsername(loginData.username);
      if (!user) {
        throw new AppError('Invalid username or password', 401, ErrorTypes.AUTHENTICATION_ERROR);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(loginData.password, user.password_hash);
      if (!isPasswordValid) {
        throw new AppError('Invalid username or password', 401, ErrorTypes.AUTHENTICATION_ERROR);
      }

      // Generate JWT token
      const token = this.generateToken(user.id);

      return {
        user: toUserResponse(user),
        token
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async getUserProfile(userId: number) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, ErrorTypes.NOT_FOUND_ERROR);
      }

      return toUserResponse(user);
    } catch (error) {
      console.error('Get user profile error:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: number, updateData: UpdateUserRequest) {
    try {
      // If email is being updated, check if it's already taken by another user
      if (updateData.email) {
        const existingUser = await this.userRepository.findByEmail(updateData.email);
        if (existingUser && existingUser.id !== userId) {
          throw new AppError('Email already exists', 409, ErrorTypes.CONFLICT_ERROR);
        }
      }

      const updatedUser = await this.userRepository.update(userId, updateData);
      if (!updatedUser) {
        throw new AppError('User not found', 404, ErrorTypes.NOT_FOUND_ERROR);
      }

      return toUserResponse(updatedUser);
    } catch (error) {
      console.error('Update user profile error:', error);
      throw error;
    }
  }

  async upgradeToSeller(userId: number) {
    try {
      const updatedUser = await this.userRepository.upgradeToSeller(userId);
      if (!updatedUser) {
        throw new AppError('User not found', 404, ErrorTypes.NOT_FOUND_ERROR);
      }

      return toUserResponse(updatedUser);
    } catch (error) {
      console.error('Upgrade to seller error:', error);
      throw error;
    }
  }

  verifyToken(token: string): { userId: number } {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: number };
      return decoded;
    } catch (error) {
      throw new AppError('Invalid or expired token', 401, ErrorTypes.AUTHENTICATION_ERROR);
    }
  }

  private generateToken(userId: number): string {
    return jwt.sign(
      { userId },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn } as jwt.SignOptions
    );
  }

  private validateRegistrationData(userData: CreateUserRequest): void {
    if (!userData.username || userData.username.trim().length < 3) {
      throw new AppError('Username must be at least 3 characters long', 400, ErrorTypes.VALIDATION_ERROR);
    }

    if (!userData.email || !this.isValidEmail(userData.email)) {
      throw new AppError('Valid email is required', 400, ErrorTypes.VALIDATION_ERROR);
    }

    if (!userData.password || userData.password.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400, ErrorTypes.VALIDATION_ERROR);
    }

    // Username validation
    if (!/^[a-zA-Z0-9_]+$/.test(userData.username)) {
      throw new AppError('Username can only contain letters, numbers, and underscores', 400, ErrorTypes.VALIDATION_ERROR);
    }

    if (userData.username.length > 50) {
      throw new AppError('Username cannot be longer than 50 characters', 400, ErrorTypes.VALIDATION_ERROR);
    }

    // Email validation
    if (userData.email.length > 100) {
      throw new AppError('Email cannot be longer than 100 characters', 400, ErrorTypes.VALIDATION_ERROR);
    }

    // Name validation
    if (userData.first_name && userData.first_name.length > 50) {
      throw new AppError('First name cannot be longer than 50 characters', 400, ErrorTypes.VALIDATION_ERROR);
    }

    if (userData.last_name && userData.last_name.length > 50) {
      throw new AppError('Last name cannot be longer than 50 characters', 400, ErrorTypes.VALIDATION_ERROR);
    }
  }

  private validateLoginData(loginData: LoginRequest): void {
    if (!loginData.username || !loginData.username.trim()) {
      throw new AppError('Username is required', 400, ErrorTypes.VALIDATION_ERROR);
    }

    if (!loginData.password || !loginData.password.trim()) {
      throw new AppError('Password is required', 400, ErrorTypes.VALIDATION_ERROR);
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}