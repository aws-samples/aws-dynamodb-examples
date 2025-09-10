import { UserRepository } from '../../../repositories/UserRepository';
import { IUserRepository } from '../../interfaces/IUserRepository';
import { User, CreateUserRequest, UpdateUserRequest } from '../../../models/User';

export class MySQLUserRepository implements IUserRepository {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findByUsername(username);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async create(userData: CreateUserRequest & { password_hash: string }): Promise<User> {
    return this.userRepository.create(userData);
  }

  async update(id: number, userData: UpdateUserRequest): Promise<User | null> {
    return this.userRepository.update(id, userData);
  }

  async delete(id: number): Promise<boolean> {
    return this.userRepository.delete(id);
  }

  async upgradeToSeller(id: number): Promise<User | null> {
    return this.userRepository.upgradeToSeller(id);
  }

  async existsByUsername(username: string): Promise<boolean> {
    return this.userRepository.existsByUsername(username);
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.userRepository.existsByEmail(email);
  }

  async promoteToSuperAdmin(id: number): Promise<User | null> {
    return this.userRepository.promoteToSuperAdmin(id);
  }

  async demoteFromSuperAdmin(id: number): Promise<User | null> {
    return this.userRepository.demoteFromSuperAdmin(id);
  }

  async findAllSuperAdmins(): Promise<User[]> {
    return this.userRepository.findAllSuperAdmins();
  }
}
