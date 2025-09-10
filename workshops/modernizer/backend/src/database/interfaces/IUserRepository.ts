import { User, CreateUserRequest, UpdateUserRequest } from '../../models/User';

/**
 * Abstract interface for User repository operations
 * Supports both MySQL and DynamoDB implementations
 */
export interface IUserRepository {
  /**
   * Find user by ID
   * @param id User ID
   * @returns Promise resolving to User or null if not found
   */
  findById(id: number): Promise<User | null>;

  /**
   * Find user by username
   * @param username Username to search for
   * @returns Promise resolving to User or null if not found
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Find user by email
   * @param email Email to search for
   * @returns Promise resolving to User or null if not found
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Create a new user
   * @param userData User data including password hash
   * @returns Promise resolving to created User
   */
  create(userData: CreateUserRequest & { password_hash: string }): Promise<User>;

  /**
   * Update user information
   * @param id User ID
   * @param userData Updated user data
   * @returns Promise resolving to updated User or null if not found
   */
  update(id: number, userData: UpdateUserRequest): Promise<User | null>;

  /**
   * Delete user by ID
   * @param id User ID
   * @returns Promise resolving to boolean indicating success
   */
  delete(id: number): Promise<boolean>;

  /**
   * Upgrade user to seller status
   * @param id User ID
   * @returns Promise resolving to updated User or null if not found
   */
  upgradeToSeller(id: number): Promise<User | null>;

  /**
   * Check if username exists
   * @param username Username to check
   * @returns Promise resolving to boolean indicating existence
   */
  existsByUsername(username: string): Promise<boolean>;

  /**
   * Check if email exists
   * @param email Email to check
   * @returns Promise resolving to boolean indicating existence
   */
  existsByEmail(email: string): Promise<boolean>;

  /**
   * Promote user to super admin status
   * @param id User ID
   * @returns Promise resolving to updated User or null if not found
   */
  promoteToSuperAdmin(id: number): Promise<User | null>;

  /**
   * Demote user from super admin status
   * @param id User ID
   * @returns Promise resolving to updated User or null if not found
   */
  demoteFromSuperAdmin(id: number): Promise<User | null>;

  /**
   * Find all super admin users
   * @returns Promise resolving to array of super admin Users
   */
  findAllSuperAdmins(): Promise<User[]>;
}
