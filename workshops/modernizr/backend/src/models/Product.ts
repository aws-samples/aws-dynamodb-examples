export interface Product {
  id: number;
  seller_id: number;
  category_id: number;
  name: string;
  description?: string;
  price: number;
  inventory_quantity: number;
  created_at: Date;
  updated_at: Date;
}

export interface ProductWithDetails extends Product {
  category_name?: string;
  seller_username?: string;
  seller_email?: string;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  category_id: number;
  price: number;
  inventory_quantity: number;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  category_id?: number;
  price?: number;
  inventory_quantity?: number;
}

export interface ProductSearchFilters {
  category_id?: number;
  seller_id?: number;
  search?: string;
  min_price?: number;
  max_price?: number;
  in_stock_only?: boolean;
}

export interface ProductListResponse {
  products: ProductWithDetails[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ProductResponse {
  success: true;
  data: {
    product: ProductWithDetails;
    message: string;
  };
  timestamp: string;
}

export interface ProductListApiResponse {
  success: true;
  data: {
    products: ProductWithDetails[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    };
    message: string;
  };
  timestamp: string;
}

// Helper function to convert database row to Product response
export function toProductResponse(product: ProductWithDetails): ProductWithDetails {
  return {
    id: product.id,
    seller_id: product.seller_id,
    category_id: product.category_id,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    inventory_quantity: product.inventory_quantity,
    category_name: product.category_name,
    seller_username: product.seller_username,
    seller_email: product.seller_email,
    created_at: product.created_at,
    updated_at: product.updated_at,
  };
}

// Validation helpers
export function validateCreateProductRequest(data: any): CreateProductRequest {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Product name is required');
  } else if (data.name.trim().length > 200) {
    errors.push('Product name must be 200 characters or less');
  }

  if (data.description && typeof data.description !== 'string') {
    errors.push('Product description must be a string');
  } else if (data.description && data.description.length > 2000) {
    errors.push('Product description must be 2000 characters or less');
  }

  if (!data.category_id || !Number.isInteger(Number(data.category_id)) || Number(data.category_id) <= 0) {
    errors.push('Valid category ID is required');
  }

  if (!data.price || isNaN(Number(data.price)) || Number(data.price) <= 0) {
    errors.push('Valid price greater than 0 is required');
  } else if (Number(data.price) > 999999.99) {
    errors.push('Price cannot exceed $999,999.99');
  }

  if (!Number.isInteger(Number(data.inventory_quantity)) || Number(data.inventory_quantity) < 0) {
    errors.push('Inventory quantity must be a non-negative integer');
  } else if (Number(data.inventory_quantity) > 999999) {
    errors.push('Inventory quantity cannot exceed 999,999');
  }

  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }

  return {
    name: data.name.trim(),
    description: data.description?.trim() || undefined,
    category_id: Number(data.category_id),
    price: Number(data.price),
    inventory_quantity: Number(data.inventory_quantity),
  };
}

export function validateUpdateProductRequest(data: any): UpdateProductRequest {
  const errors: string[] = [];
  const update: UpdateProductRequest = {};

  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Product name must be a non-empty string');
    } else if (data.name.trim().length > 200) {
      errors.push('Product name must be 200 characters or less');
    } else {
      update.name = data.name.trim();
    }
  }

  if (data.description !== undefined) {
    if (data.description !== null && typeof data.description !== 'string') {
      errors.push('Product description must be a string or null');
    } else if (data.description && data.description.length > 2000) {
      errors.push('Product description must be 2000 characters or less');
    } else {
      update.description = data.description?.trim() || undefined;
    }
  }

  if (data.category_id !== undefined) {
    if (!Number.isInteger(Number(data.category_id)) || Number(data.category_id) <= 0) {
      errors.push('Category ID must be a positive integer');
    } else {
      update.category_id = Number(data.category_id);
    }
  }

  if (data.price !== undefined) {
    if (isNaN(Number(data.price)) || Number(data.price) <= 0) {
      errors.push('Price must be greater than 0');
    } else if (Number(data.price) > 999999.99) {
      errors.push('Price cannot exceed $999,999.99');
    } else {
      update.price = Number(data.price);
    }
  }

  if (data.inventory_quantity !== undefined) {
    if (!Number.isInteger(Number(data.inventory_quantity)) || Number(data.inventory_quantity) < 0) {
      errors.push('Inventory quantity must be a non-negative integer');
    } else if (Number(data.inventory_quantity) > 999999) {
      errors.push('Inventory quantity cannot exceed 999,999');
    } else {
      update.inventory_quantity = Number(data.inventory_quantity);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }

  return update;
}