import { Router, Request, Response } from 'express';
import { CategoryService } from '../services/CategoryService';
import { AuthMiddleware } from '../middleware/auth';
import { SellerMiddleware } from '../middleware/seller';
import { toCategoryResponse } from '../models/Category';
import { ValidationSets } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const categoryService = new CategoryService();
const authMiddleware = new AuthMiddleware();
const sellerMiddleware = new SellerMiddleware();

/**
 * GET /api/categories/search
 * Search categories by name
 * Public endpoint - no authentication required
 */
router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  try {
    const searchTerm = req.query.q as string;

    if (!searchTerm) {
      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Search term (q) is required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const categories = await categoryService.searchCategories(searchTerm);
    const categoryResponses = categories.map(toCategoryResponse);

    res.status(200).json({
      success: true,
      data: {
        categories: categoryResponses,
        count: categoryResponses.length,
        search_term: searchTerm,
        message: 'Category search completed successfully',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Search categories error:', error);

    res.status(500).json({
      success: false,
      error: {
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * GET /api/categories/flat
 * Get all categories as a flat list
 * Public endpoint - no authentication required
 */
router.get('/flat', asyncHandler(async (req: Request, res: Response) => {
  try {
    const categories = await categoryService.getAllCategories();
    const categoryResponses = categories.map(toCategoryResponse);

    res.status(200).json({
      success: true,
      data: {
        categories: categoryResponses,
        count: categoryResponses.length,
        message: 'Categories retrieved successfully',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get flat categories error:', error);

    res.status(500).json({
      success: false,
      error: {
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * GET /api/categories/roots
 * Get root categories (top-level categories)
 * Public endpoint - no authentication required
 */
router.get('/roots', asyncHandler(async (req: Request, res: Response) => {
  try {
    const rootCategories = await categoryService.getRootCategories();
    const categoryResponses = rootCategories.map(toCategoryResponse);

    res.status(200).json({
      success: true,
      data: {
        categories: categoryResponses,
        count: categoryResponses.length,
        message: 'Root categories retrieved successfully',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get root categories error:', error);

    res.status(500).json({
      success: false,
      error: {
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * GET /api/categories/:id/children
 * Get child categories for a specific parent category
 * Public endpoint - no authentication required
 */
router.get('/:id/children', asyncHandler(async (req: Request, res: Response) => {
  try {
    const parentId = parseInt(req.params.id, 10);

    if (isNaN(parentId)) {
      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Invalid parent category ID',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const childCategories = await categoryService.getChildCategories(parentId);
    const categoryResponses = childCategories.map(toCategoryResponse);

    res.status(200).json({
      success: true,
      data: {
        categories: categoryResponses,
        count: categoryResponses.length,
        parent_id: parentId,
        message: 'Child categories retrieved successfully',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get child categories error:', error);

    let statusCode = 500;
    if (error instanceof Error && error.message === 'Parent category not found') {
      statusCode = 404;
    }

    res.status(statusCode).json({
      success: false,
      error: {
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * GET /api/categories/:id/path
 * Get category path (breadcrumb) from root to category
 * Public endpoint - no authentication required
 */
router.get('/:id/path', asyncHandler(async (req: Request, res: Response) => {
  try {
    const categoryId = parseInt(req.params.id, 10);

    if (isNaN(categoryId)) {
      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Invalid category ID',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const categoryPath = await categoryService.getCategoryPath(categoryId);
    const pathResponses = categoryPath.map(toCategoryResponse);

    res.status(200).json({
      success: true,
      data: {
        path: pathResponses,
        depth: pathResponses.length,
        message: 'Category path retrieved successfully',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get category path error:', error);

    let statusCode = 500;
    if (error instanceof Error && error.message === 'Category not found') {
      statusCode = 404;
    }

    res.status(statusCode).json({
      success: false,
      error: {
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * GET /api/categories/:id
 * Get a specific category by ID
 * Public endpoint - no authentication required
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const categoryId = parseInt(req.params.id, 10);

    if (isNaN(categoryId)) {
      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Invalid category ID',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const category = await categoryService.getCategoryById(categoryId);

    if (!category) {
      res.status(404).json({
        success: false,
        error: {
          type: 'NotFoundError',
          message: 'Category not found',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        category: toCategoryResponse(category),
        message: 'Category retrieved successfully',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get category by ID error:', error);

    res.status(500).json({
      success: false,
      error: {
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * GET /api/categories
 * Get all categories in hierarchical tree structure
 * Public endpoint - no authentication required
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const categoryTree = await categoryService.getCategoryTree();

    res.status(200).json({
      success: true,
      data: {
        categories: categoryTree,
        message: 'Categories retrieved successfully',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get categories error:', error);

    res.status(500).json({
      success: false,
      error: {
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      timestamp: new Date().toISOString(),
    });
  }
}));

// Protected routes below require authentication and seller privileges

/**
 * POST /api/categories
 * Create a new category
 * Requires seller authentication
 */
router.post('/',
  authMiddleware.authenticate.bind(authMiddleware),
  sellerMiddleware.requireSeller.bind(sellerMiddleware),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, parent_id } = req.body;

      const newCategory = await categoryService.createCategory({
        name,
        parent_id,
      });

      res.status(201).json({
        success: true,
        data: {
          category: toCategoryResponse(newCategory),
          message: 'Category created successfully',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Create category error:', error);

      let statusCode = 500;
      if (error instanceof Error) {
        if (error.message.includes('already exists') ||
          error.message.includes('required') ||
          error.message.includes('100 characters') ||
          error.message.includes('two levels')) {
          statusCode = 400;
        } else if (error.message.includes('not found')) {
          statusCode = 404;
        }
      }

      res.status(statusCode).json({
        success: false,
        error: {
          type: error instanceof Error ? error.constructor.name : 'UnknownError',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * PUT /api/categories/:id
 * Update an existing category
 * Requires seller authentication
 */
router.put('/:id',
  authMiddleware.authenticate.bind(authMiddleware),
  sellerMiddleware.requireSeller.bind(sellerMiddleware),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const categoryId = parseInt(req.params.id, 10);

      if (isNaN(categoryId)) {
        res.status(400).json({
          success: false,
          error: {
            type: 'ValidationError',
            message: 'Invalid category ID',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { name, parent_id } = req.body;

      const updatedCategory = await categoryService.updateCategory(categoryId, {
        name,
        parent_id,
      });

      if (!updatedCategory) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NotFoundError',
            message: 'Category not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          category: toCategoryResponse(updatedCategory),
          message: 'Category updated successfully',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Update category error:', error);

      let statusCode = 500;
      if (error instanceof Error) {
        if (error.message.includes('already exists') ||
          error.message.includes('required') ||
          error.message.includes('100 characters') ||
          error.message.includes('circular') ||
          error.message.includes('two levels') ||
          error.message.includes('subcategory')) {
          statusCode = 400;
        } else if (error.message.includes('not found')) {
          statusCode = 404;
        }
      }

      res.status(statusCode).json({
        success: false,
        error: {
          type: error instanceof Error ? error.constructor.name : 'UnknownError',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * DELETE /api/categories/:id
 * Delete a category
 * Requires seller authentication
 */
router.delete('/:id',
  authMiddleware.authenticate.bind(authMiddleware),
  sellerMiddleware.requireSeller.bind(sellerMiddleware),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const categoryId = parseInt(req.params.id, 10);

      if (isNaN(categoryId)) {
        res.status(400).json({
          success: false,
          error: {
            type: 'ValidationError',
            message: 'Invalid category ID',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const deleted = await categoryService.deleteCategory(categoryId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NotFoundError',
            message: 'Category not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          message: 'Category deleted successfully',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Delete category error:', error);

      let statusCode = 500;
      if (error instanceof Error) {
        if (error.message.includes('child categories')) {
          statusCode = 400;
        } else if (error.message.includes('not found')) {
          statusCode = 404;
        }
      }

      res.status(500).json({
        success: false,
        error: {
          type: error instanceof Error ? error.constructor.name : 'UnknownError',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;