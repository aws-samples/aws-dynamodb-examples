import { CategoryRepository } from '../../../repositories/CategoryRepository';
import { ICategoryRepository } from '../../interfaces/ICategoryRepository';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../../../models/Category';

export class MySQLCategoryRepository implements ICategoryRepository {
  private categoryRepository: CategoryRepository;

  constructor() {
    this.categoryRepository = new CategoryRepository();
  }

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.findAll();
  }

  async findById(id: number): Promise<Category | null> {
    return this.categoryRepository.findById(id);
  }

  async findByParentId(parentId: number | null): Promise<Category[]> {
    return this.categoryRepository.findByParentId(parentId);
  }

  async findRootCategories(): Promise<Category[]> {
    return this.categoryRepository.findRootCategories();
  }

  async findChildCategories(parentId: number): Promise<Category[]> {
    return this.categoryRepository.findChildCategories(parentId);
  }

  async create(categoryData: CreateCategoryRequest): Promise<Category> {
    return this.categoryRepository.create(categoryData);
  }

  async update(id: number, categoryData: UpdateCategoryRequest): Promise<Category | null> {
    return this.categoryRepository.update(id, categoryData);
  }

  async delete(id: number): Promise<boolean> {
    return this.categoryRepository.delete(id);
  }

  async existsByName(name: string, excludeId?: number): Promise<boolean> {
    return this.categoryRepository.existsByName(name, excludeId);
  }

  async existsById(id: number): Promise<boolean> {
    return this.categoryRepository.existsById(id);
  }

  async validateParentId(parentId: number | undefined): Promise<boolean> {
    return this.categoryRepository.validateParentId(parentId);
  }

  async wouldCreateCycle(categoryId: number, newParentId: number): Promise<boolean> {
    return this.categoryRepository.wouldCreateCycle(categoryId, newParentId);
  }

  async getCategoryPath(categoryId: number): Promise<Category[]> {
    return this.categoryRepository.getCategoryPath(categoryId);
  }
}
