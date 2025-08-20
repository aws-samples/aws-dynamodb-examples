import { Router, Request, Response } from 'express';
import { ProductService } from '../services/ProductService';
import { AuthMiddleware } from '../middleware/auth';
import { SellerMiddleware } from '../middleware/seller';
import { toProductResponse } from '../models/Product';
import { ValidationSets } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const productService = new ProductService();
const authMiddleware = new AuthMiddleware();
const sellerMiddleware = new SellerMiddleware();

/**
 * GET /api/products
 * Get products with filtering, search, and pagination
 * Public endpoint - no authentication required
 */
router.get('/', ValidationSets.getProducts, asyncHandler(async (req: Request, res: Response) => {
  try {
    const {
      category_id,
      seller_id,
      search,
      min_price,
      max_price,
      in_stock_only,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      category_id: category_id ? Number(category_id) : undefined,
      seller_id: seller_id ? Number(seller_id) : undefined,
      search: search as string,
      min_price: min_price ? Number(min_price) : undefined,
      max_price: max_price ? Number(max_price) : undefined,
      in_stock_only: in_stock_only === 'true',
    };

    let result;
    
    // Use getProductsByCategory when filtering by category to include child categories
    if (filters.category_id && !filters.seller_id && !filters.search && !filters.min_price && !filters.max_price) {
      result = await productService.getProductsByCategory(
        filters.category_id,
        Number(page),
        Number(limit)
      );
    } else {
      result = await productService.getProducts(
        filters,
        Number(page),
        Number(limit)
      );
    }

    const responseProducts = result.products.map(toProductResponse);

    res.status(200).json({
      success: true,
      data: {
        products: responseProducts,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          total_pages: result.total_pages,
        },
        message: 'Products retrieved successfully',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get products error:', error);
    
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
 * GET /api/products/search
 * Search products by name and description
 * Public endpoint - no authentication required
 */
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { q: searchTerm, page = 1, limit = 20 } = req.query;

    if (!searchTerm || typeof searchTerm !== 'string') {
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

    const result = await productService.searchProducts(
      searchTerm,
      Number(page),
      Number(limit)
    );

    const responseProducts = result.products.map(toProductResponse);

    res.status(200).json({
      success: true,
      data: {
        products: responseProducts,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          total_pages: result.total_pages,
        },
        search_term: searchTerm,
        message: 'Product search completed successfully',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Search products error:', error);
    
    let statusCode = 500;
    if (error instanceof Error && error.message.includes('required')) {
      statusCode = 400;
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
});

/**
 * GET /api/products/category/:categoryId
 * Get products by category
 * Public endpoint - no authentication required
 */
router.get('/category/:categoryId', async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryId = parseInt(req.params.categoryId, 10);
    const { page = 1, limit = 20 } = req.query;

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

    const result = await productService.getProductsByCategory(
      categoryId,
      Number(page),
      Number(limit)
    );

    const responseProducts = result.products.map(toProductResponse);

    res.status(200).json({
      success: true,
      data: {
        products: responseProducts,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          total_pages: result.total_pages,
        },
        category_id: categoryId,
        message: 'Category products retrieved successfully',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get category products error:', error);
    
    let statusCode = 500;
    if (error instanceof Error && error.message.includes('Invalid')) {
      statusCode = 400;
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
});

/**
 * GET /api/products/:id
 * Get specific product by ID
 * Public endpoint - no authentication required
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = parseInt(req.params.id, 10);

    if (isNaN(productId)) {
      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Invalid product ID',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const product = await productService.getProductById(productId);

    if (!product) {
      res.status(404).json({
        success: false,
        error: {
          type: 'NotFoundError',
          message: 'Product not found',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        product: toProductResponse(product),
        message: 'Product retrieved successfully',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get product by ID error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Protected routes below require authentication and seller privileges

/**
 * POST /api/products
 * Create a new product
 * Requires seller authentication
 */
router.post('/',
  authMiddleware.authenticate.bind(authMiddleware),
  sellerMiddleware.requireSeller.bind(sellerMiddleware),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const sellerId = req.user!.userId;
      const productData = req.body;

      const newProduct = await productService.createProduct(sellerId, productData);

      res.status(201).json({
        success: true,
        data: {
          product: toProductResponse(newProduct),
          message: 'Product created successfully',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Create product error:', error);
      
      let statusCode = 500;
      if (error instanceof Error) {
        if (error.message.includes('required') || 
            error.message.includes('must be') ||
            error.message.includes('cannot exceed') ||
            error.message.includes('Category not found')) {
          statusCode = 400;
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
 * PUT /api/products/:id
 * Update an existing product
 * Requires seller authentication
 */
router.put('/:id',
  authMiddleware.authenticate.bind(authMiddleware),
  sellerMiddleware.requireSeller.bind(sellerMiddleware),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = parseInt(req.params.id, 10);
      const sellerId = req.user!.userId;
      const updateData = req.body;

      if (isNaN(productId)) {
        res.status(400).json({
          success: false,
          error: {
            type: 'ValidationError',
            message: 'Invalid product ID',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const updatedProduct = await productService.updateProduct(productId, sellerId, updateData);

      if (!updatedProduct) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NotFoundError',
            message: 'Product not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          product: toProductResponse(updatedProduct),
          message: 'Product updated successfully',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Update product error:', error);
      
      let statusCode = 500;
      if (error instanceof Error) {
        if (error.message.includes('required') || 
            error.message.includes('must be') ||
            error.message.includes('cannot exceed') ||
            error.message.includes('Category not found') ||
            error.message.includes('No valid fields')) {
          statusCode = 400;
        } else if (error.message.includes('not found')) {
          statusCode = 404;
        } else if (error.message.includes('You can only update your own products')) {
          statusCode = 403;
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
 * DELETE /api/products/:id
 * Delete a product
 * Requires seller authentication
 */
router.delete('/:id',
  authMiddleware.authenticate.bind(authMiddleware),
  sellerMiddleware.requireSeller.bind(sellerMiddleware),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = parseInt(req.params.id, 10);
      const sellerId = req.user!.userId;

      if (isNaN(productId)) {
        res.status(400).json({
          success: false,
          error: {
            type: 'ValidationError',
            message: 'Invalid product ID',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const deleted = await productService.deleteProduct(productId, sellerId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NotFoundError',
            message: 'Product not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          message: 'Product deleted successfully',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Delete product error:', error);
      
      let statusCode = 500;
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          statusCode = 404;
        } else if (error.message.includes('You can only delete your own products')) {
          statusCode = 403;
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
 * GET /api/products/seller/my-products
 * Get products for the authenticated seller
 * Requires seller authentication
 */
router.get('/seller/my-products',
  authMiddleware.authenticate.bind(authMiddleware),
  sellerMiddleware.requireSeller.bind(sellerMiddleware),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const sellerId = req.user!.userId;
      const { page = 1, limit = 20 } = req.query;

      const result = await productService.getProductsBySeller(
        sellerId,
        Number(page),
        Number(limit)
      );

      const responseProducts = result.products.map(toProductResponse);

      res.status(200).json({
        success: true,
        data: {
          products: responseProducts,
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            total_pages: result.total_pages,
          },
          message: 'Seller products retrieved successfully',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get seller products error:', error);
      
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

/**
 * PUT /api/products/:id/inventory
 * Update product inventory
 * Requires seller authentication
 */
router.put('/:id/inventory',
  authMiddleware.authenticate.bind(authMiddleware),
  sellerMiddleware.requireSeller.bind(sellerMiddleware),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = parseInt(req.params.id, 10);
      const sellerId = req.user!.userId;
      const { inventory_quantity } = req.body;

      if (isNaN(productId)) {
        res.status(400).json({
          success: false,
          error: {
            type: 'ValidationError',
            message: 'Invalid product ID',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (inventory_quantity === undefined) {
        res.status(400).json({
          success: false,
          error: {
            type: 'ValidationError',
            message: 'Inventory quantity is required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const updated = await productService.updateInventory(productId, sellerId, Number(inventory_quantity));

      if (!updated) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NotFoundError',
            message: 'Product not found or update failed',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          message: 'Inventory updated successfully',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Update inventory error:', error);
      
      let statusCode = 500;
      if (error instanceof Error) {
        if (error.message.includes('must be') || 
            error.message.includes('cannot exceed') ||
            error.message.includes('Invalid')) {
          statusCode = 400;
        } else if (error.message.includes('not found')) {
          statusCode = 404;
        } else if (error.message.includes('only update inventory')) {
          statusCode = 403;
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
 * GET /api/products/seller/stats
 * Get seller product statistics
 * Requires seller authentication
 */
router.get('/seller/stats',
  authMiddleware.authenticate.bind(authMiddleware),
  sellerMiddleware.requireSeller.bind(sellerMiddleware),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const sellerId = req.user!.userId;

      const stats = await productService.getSellerProductStats(sellerId);

      res.status(200).json({
        success: true,
        data: {
          stats,
          message: 'Seller statistics retrieved successfully',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get seller stats error:', error);
      
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

/**
 * POST /api/products/upload-image
 * Upload product image (placeholder endpoint for testing)
 * Requires seller authentication
 */
router.post('/upload-image',
  authMiddleware.authenticate.bind(authMiddleware),
  sellerMiddleware.requireSeller.bind(sellerMiddleware),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { file, filename } = req.body;

      // Basic validation
      if (!file || !filename) {
        res.status(400).json({
          success: false,
          error: {
            type: 'ValidationError',
            message: 'File and filename are required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check file type (basic validation)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const isValidImageType = filename.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);
      
      if (!isValidImageType) {
        res.status(400).json({
          success: false,
          error: {
            type: 'ValidationError',
            message: 'Invalid file type. Only image files are allowed.',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // For testing purposes, just return success
      // In a real implementation, you would:
      // 1. Validate file size
      // 2. Scan for malicious content
      // 3. Upload to cloud storage (S3, etc.)
      // 4. Generate thumbnails
      // 5. Store file metadata in database

      res.status(200).json({
        success: true,
        data: {
          imageUrl: `/images/products/${Date.now()}_${filename}`,
          message: 'Image uploaded successfully',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Upload image error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          type: error instanceof Error ? error.constructor.name : 'UnknownError',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
        timestamp: new Date().toISOString(),
      });
    }
  })
);

export default router;