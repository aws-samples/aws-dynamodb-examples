import { DualWriteWrapper, DualWriteOperation, DualWriteResult } from './DualWriteWrapper';
import { ICategoryRepository } from '../interfaces/ICategoryRepository';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../../models/Category';
import { FeatureFlagService } from '../../services/FeatureFlagService';

export class CategoryDualWriteWrapper extends DualWriteWrapper<Category> implements ICategoryRepository {
  protected entityType = 'Category';
  private mysqlRepo: ICategoryRepository;
  private dynamodbRepo: ICategoryRepository;

  constructor(
    mysqlRepo: ICategoryRepository,
    dynamodbRepo: ICategoryRepository
  ) {
    super();
    this.mysqlRepo = mysqlRepo;
    this.dynamodbRepo = dynamodbRepo;
  }

  async create(categoryData: CreateCategoryRequest): Promise<Category> {
    const result = await this.executeDualWriteCreate(categoryData);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to create category');
    }
    return result.data;
  }

  async update(id: number, categoryData: UpdateCategoryRequest): Promise<Category | null> {
    try {
      const mysqlResult = await this.mysqlRepo.update(id, categoryData);
      if (mysqlResult && FeatureFlagService.getFlag('dual_write_enabled')) {
        const dynamoData = await this.transformForDynamoDB(mysqlResult);
        await this.dynamodbRepo.update(id, dynamoData);
      }
      return mysqlResult;
    } catch (error) {
      console.error(`Failed to update category ${id}:`, error);
      return null;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const mysqlResult = await this.mysqlRepo.delete(id);
      if (mysqlResult && FeatureFlagService.getFlag('dual_write_enabled')) {
        await this.dynamodbRepo.delete(id);
      }
      return mysqlResult;
    } catch (error) {
      console.error(`Failed to delete category ${id}:`, error);
      return false;
    }
  }

  private async executeDualWriteCreate(categoryData: CreateCategoryRequest): Promise<DualWriteResult<Category>> {
    const operation: DualWriteOperation<Category> = {
      mysqlOperation: () => this.mysqlRepo.create(categoryData),
      dynamodbOperation: async (mysqlResult) => {
        const dynamoData = await this.transformForDynamoDB(mysqlResult);
        return this.dynamodbRepo.create(dynamoData);
      },
      rollbackOperation: async (mysqlResult) => {
        await this.mysqlRepo.delete(mysqlResult.id);
      }
    };

    return this.executeDualWrite(operation, 'CREATE');
  }

  private async executeDualWriteUpdate(id: number, categoryData: UpdateCategoryRequest): Promise<DualWriteResult<Category>> {
    const operation: DualWriteOperation<Category> = {
      mysqlOperation: async () => {
        const result = await this.mysqlRepo.update(id, categoryData);
        if (!result) throw new Error('Category not found');
        return result;
      },
      dynamodbOperation: async (mysqlResult) => {
        const dynamoData = await this.transformForDynamoDB(mysqlResult);
        const result = await this.dynamodbRepo.update(id, dynamoData);
        if (!result) throw new Error('Failed to update in DynamoDB');
        return result;
      }
    };

    return this.executeDualWrite(operation, 'UPDATE');
  }

  protected extractEntityId(data: Category | boolean): string | number {
    return typeof data === 'boolean' ? 'N/A' : data.id;
  }

  async transformForDynamoDB(mysqlData: Category): Promise<any> {
    let parentName = 'ROOT';
    
    // Get parent category name if parent_id exists
    if (mysqlData.parent_id) {
      const parentCategory = await this.mysqlRepo.findById(mysqlData.parent_id);
      if (parentCategory) {
        parentName = parentCategory.name;
      }
    }

    return {
      ...mysqlData,
      id: this.transformId(mysqlData.id),
      parentId: mysqlData.parent_id ? this.transformId(mysqlData.parent_id) : null,
      // DynamoDB key structure
      parentName,
      categoryName: mysqlData.name
    };
  }

  createRollbackOperation(mysqlData: Category): (() => Promise<void>) | undefined {
    return async () => {
      await this.mysqlRepo.delete(mysqlData.id);
    };
  }

  // Read operations - delegate to primary repository (MySQL)
  async findAll(): Promise<Category[]> {
    return this.mysqlRepo.findAll();
  }

  async findById(id: number): Promise<Category | null> {
    return this.mysqlRepo.findById(id);
  }

  async findByParentId(parentId: number | null): Promise<Category[]> {
    return this.mysqlRepo.findByParentId(parentId);
  }

  async findRootCategories(): Promise<Category[]> {
    return this.mysqlRepo.findRootCategories();
  }

  async findChildCategories(parentId: number): Promise<Category[]> {
    return this.mysqlRepo.findChildCategories(parentId);
  }

  async existsByName(name: string, excludeId?: number): Promise<boolean> {
    return this.mysqlRepo.existsByName(name, excludeId);
  }

  async existsById(id: number): Promise<boolean> {
    return this.mysqlRepo.existsById(id);
  }

  async validateParentId(parentId: number | undefined): Promise<boolean> {
    return this.mysqlRepo.validateParentId(parentId);
  }

  async wouldCreateCycle(categoryId: number, newParentId: number): Promise<boolean> {
    return this.mysqlRepo.wouldCreateCycle(categoryId, newParentId);
  }

  async getCategoryPath(categoryId: number): Promise<Category[]> {
    return this.mysqlRepo.getCategoryPath(categoryId);
  }
}
