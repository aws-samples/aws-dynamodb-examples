import { BaseDynamoDBRepository } from './BaseDynamoDBRepository';
import { ICategoryRepository } from '../../interfaces/ICategoryRepository';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../../../models/Category';

export class DynamoDBCategoryRepository extends BaseDynamoDBRepository implements ICategoryRepository {
  constructor(tableName: string) {
    super(tableName);
  }

  async findAll(): Promise<Category[]> {
    const items = await this.scan();
    return items.map(item => this.transformFromDynamoDB(item));
  }

  async findById(id: number): Promise<Category | null> {
    // Query by GSI1 where GSI1SK = category_id
    const items = await this.query(
      'GSI1SK = :id',
      { ':id': id.toString() },
      'GSI1'
    );

    if (!items || items.length === 0) return null;
    return this.transformFromDynamoDB(items[0]);
  }

  async findByParentId(parentId: number | null): Promise<Category[]> {
    if (parentId === null) {
      return this.findRootCategories();
    }

    // Query by GSI1PK = parentId to find child categories
    const items = await this.query(
      'GSI1PK = :pk',
      { ':pk': parentId.toString() },
      'GSI1'
    );
    return items.map(item => this.transformFromDynamoDB(item));
  }

  async findRootCategories(): Promise<Category[]> {
    // Query by PK = ROOT
    const items = await this.query(
      'PK = :pk',
      { ':pk': 'ROOT' }
    );
    return items.map(item => this.transformFromDynamoDB(item));
  }

  async findChildCategories(parentId: number): Promise<Category[]> {
    return this.findByParentId(parentId);
  }

  async create(categoryData: CreateCategoryRequest): Promise<Category> {
    const id = Date.now();
    const now = new Date();
    
    // Get parent information if parent_id is provided
    let pk = 'ROOT';
    let gsi1pk = 'ROOT';
    let parentCategory: Category | null = null;
    let level = 0;
    let categoryPath = categoryData.name;

    if (categoryData.parent_id) {
      parentCategory = await this.findById(categoryData.parent_id);
      if (parentCategory) {
        // PK should be parent category name for child categories
        pk = parentCategory.name;
        gsi1pk = parentCategory.id.toString();
        level = (parentCategory.level || 0) + 1;
        categoryPath = parentCategory.category_path ? 
          `${parentCategory.category_path}/${categoryData.name}` : 
          categoryData.name;
      }
    }

    const category: Category = {
      id,
      name: categoryData.name,
      parent_id: categoryData.parent_id,
      parent_name: parentCategory?.name,
      category_path: categoryPath,
      level,
      children_count: 0,
      product_count: 0,
      created_at: now,
      updated_at: now
    };

    const item = {
      PK: pk,
      SK: categoryData.name,
      GSI1PK: gsi1pk,
      GSI1SK: id.toString(),
      category_id: id.toString(),
      parent_id: categoryData.parent_id?.toString(),
      parent_name: parentCategory?.name,
      category_name: categoryData.name,
      category_path: categoryPath,
      level,
      children_count: 0,
      product_count: 0,
      created_at: now.toISOString()
    };

    await this.putItem(item);

    // Update parent's children_count if applicable
    if (parentCategory) {
      await this.incrementChildrenCount(parentCategory.id, 1);
    }

    return category;
  }

  async update(id: number, categoryData: UpdateCategoryRequest): Promise<Category | null> {
    const existingCategory = await this.findById(id);
    if (!existingCategory) return null;

    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Current keys
    const currentPK = existingCategory.parent_name || 'ROOT';
    const currentSK = existingCategory.name;

    // New keys (may be same as current)
    let newPK = currentPK;
    let newSK = currentSK;
    let newGSI1PK = existingCategory.parent_id?.toString() || 'ROOT';

    if (categoryData.name !== undefined) {
      newSK = categoryData.name;
    }

    if (categoryData.parent_id !== undefined) {
      const newParent = categoryData.parent_id ? await this.findById(categoryData.parent_id) : null;
      newPK = newParent?.name || 'ROOT';
      newGSI1PK = categoryData.parent_id?.toString() || 'ROOT';

      // Update children counts
      if (existingCategory.parent_id) {
        await this.incrementChildrenCount(existingCategory.parent_id, -1);
      }
      if (categoryData.parent_id) {
        await this.incrementChildrenCount(categoryData.parent_id, 1);
      }
    }

    // If PK or SK changed, we need to delete old item and create new one
    if (newPK !== currentPK || newSK !== currentSK) {
      await this.deleteItem({ PK: currentPK, SK: currentSK });

      const newParent = categoryData.parent_id ? await this.findById(categoryData.parent_id) : null;
      const updatedItem = {
        PK: newPK,
        SK: newSK,
        GSI1PK: newGSI1PK,
        GSI1SK: id.toString(),
        category_id: id.toString(),
        parent_id: categoryData.parent_id?.toString() || existingCategory.parent_id?.toString(),
        parent_name: newParent?.name || (categoryData.parent_id === undefined ? existingCategory.parent_name : undefined),
        category_name: categoryData.name || existingCategory.name,
        category_path: existingCategory.category_path, // TODO: Recalculate if needed
        level: existingCategory.level,
        children_count: existingCategory.children_count || 0,
        product_count: existingCategory.product_count || 0,
        created_at: existingCategory.created_at.toISOString()
      };

      await this.putItem(updatedItem);
    } else if (categoryData.parent_id !== undefined) {
      // Only parent changed, update in place
      const newParent = categoryData.parent_id ? await this.findById(categoryData.parent_id) : null;
      
      updateExpressions.push('parent_id = :parent_id, parent_name = :parent_name, GSI1PK = :gsi1pk');
      expressionAttributeValues[':parent_id'] = categoryData.parent_id?.toString();
      expressionAttributeValues[':parent_name'] = newParent?.name;
      expressionAttributeValues[':gsi1pk'] = newGSI1PK;

      await this.updateItem(
        { PK: currentPK, SK: currentSK },
        `SET ${updateExpressions.join(', ')}`,
        expressionAttributeValues,
        expressionAttributeNames
      );
    }

    return await this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    try {
      const category = await this.findById(id);
      if (!category) return false;

      const pk = category.parent_name || 'ROOT';
      const sk = category.name;

      await this.deleteItem({ PK: pk, SK: sk });

      // Update parent's children_count
      if (category.parent_id) {
        await this.incrementChildrenCount(category.parent_id, -1);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async existsByName(name: string, excludeId?: number): Promise<boolean> {
    const items = await this.scan(
      'category_name = :name',
      { ':name': name }
    );

    if (excludeId) {
      return items.some(item => parseInt(item.category_id) !== excludeId);
    }

    return items.length > 0;
  }

  async existsById(id: number): Promise<boolean> {
    const category = await this.findById(id);
    return !!category;
  }

  async validateParentId(parentId: number | undefined): Promise<boolean> {
    if (!parentId) return true;
    return this.existsById(parentId);
  }

  async wouldCreateCycle(categoryId: number, newParentId: number): Promise<boolean> {
    if (categoryId === newParentId) return true;
    
    const checkDescendant = async (currentId: number, targetId: number): Promise<boolean> => {
      const children = await this.findChildCategories(currentId);
      
      for (const child of children) {
        if (child.id === targetId) return true;
        if (await checkDescendant(child.id, targetId)) return true;
      }
      
      return false;
    };

    return checkDescendant(categoryId, newParentId);
  }

  async getCategoryPath(categoryId: number): Promise<Category[]> {
    const path: Category[] = [];
    let currentId: number | undefined = categoryId;

    while (currentId) {
      const category = await this.findById(currentId);
      if (!category) break;
      
      path.unshift(category);
      currentId = category.parent_id;
    }

    return path;
  }

  private async incrementChildrenCount(categoryId: number, increment: number): Promise<void> {
    const category = await this.findById(categoryId);
    if (!category) return;

    const pk = category.parent_name || 'ROOT';
    const sk = category.name;

    await this.updateItem(
      { PK: pk, SK: sk },
      'SET children_count = children_count + :inc',
      { ':inc': increment }
    );
  }

  async incrementProductCount(categoryId: number, increment: number): Promise<void> {
    const category = await this.findById(categoryId);
    if (!category) return;

    const pk = category.parent_name || 'ROOT';
    const sk = category.name;

    await this.updateItem(
      { PK: pk, SK: sk },
      'SET product_count = product_count + :inc',
      { ':inc': increment }
    );
  }

  private transformFromDynamoDB(item: any): Category {
    return {
      id: parseInt(item.category_id || item.id),
      name: item.category_name || item.name,
      parent_id: item.parent_id ? parseInt(item.parent_id) : undefined,
      parent_name: item.parent_name,
      category_path: item.category_path,
      level: item.level,
      children_count: item.children_count || 0,
      product_count: item.product_count || 0,
      created_at: new Date(item.created_at),
      updated_at: item.updated_at ? new Date(item.updated_at) : undefined
    };
  }
}
