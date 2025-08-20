// E2E Test - Complete Product Management Workflow
import { E2ETestHelper } from '../../../test-configs/test-helpers/e2e-helpers';
import { ServerTestHelper } from '../../../test-configs/test-helpers/server';

describe('Product Management Workflow E2E', () => {
  // Increase timeout for these complex workflow tests
  jest.setTimeout(30000);

  afterEach(async () => {
    // Only clean up cart and order data, keep users and products for better performance
    await E2ETestHelper.cleanupCartData();
  });

  describe('Product Creation Flow', () => {
    it('should complete full product creation workflow', async () => {
      // Setup: Create seller and category
      const { seller, category } = await E2ETestHelper.setupCompleteScenario();

      const productData = {
        name: 'E2E Test Smartphone',
        description: 'High-end smartphone for testing purposes',
        price: 899.99,
        inventory_quantity: 15,
        category_id: category.id
      };

      // Step 1: Create product
      const createResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'POST',
        url: '/api/products',
        data: productData
      }, seller.token);

      E2ETestHelper.validateResponse(createResponse, 201, {
        success: true,
        data: {
          product: {
            name: productData.name,
            description: productData.description,
            price: productData.price,
            inventory_quantity: productData.inventory_quantity,
            category_id: category.id,
            seller_id: seller.id
          }
        }
      });

      const productId = createResponse.data.data.product.id;

      // Step 2: Verify product appears in public listing
      const listResponse = await ServerTestHelper.makeRequest({
        method: 'GET',
        url: '/api/products'
      });

      expect(listResponse.status).toBe(200);
      const products = listResponse.data.data.products || listResponse.data.data;
      const createdProduct = products.find((p: any) => p.id === productId);
      expect(createdProduct).toBeDefined();
      expect(createdProduct.name).toBe(productData.name);

      // Step 3: Verify product can be retrieved by ID
      const getResponse = await ServerTestHelper.makeRequest({
        method: 'GET',
        url: `/api/products/${productId}`
      });

      E2ETestHelper.validateResponse(getResponse, 200, {
        success: true,
        data: {
          product: {
            id: productId,
            name: productData.name,
            price: productData.price
          }
        }
      });

      // Step 4: Verify product appears in category listing
      const categoryResponse = await ServerTestHelper.makeRequest({
        method: 'GET',
        url: `/api/products?category=${category.id}`
      });

      expect(categoryResponse.status).toBe(200);
      const categoryProducts = categoryResponse.data.data.products || categoryResponse.data.data;
      const productInCategory = categoryProducts.find((p: any) => p.id === productId);
      expect(productInCategory).toBeDefined();
    });

    it('should prevent non-sellers from creating products', async () => {
      // Setup: Create regular user (not seller)
      const user = await E2ETestHelper.createTestUser({
        username: 'e2e_regular_user',
        is_seller: false
      });

      const productData = {
        name: 'Unauthorized Product',
        description: 'This should not be created',
        price: 99.99,
        inventory_quantity: 1,
        category_id: 1
      };

      // Attempt to create product as non-seller
      const createResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'POST',
        url: '/api/products',
        data: productData
      }, user.token);

      E2ETestHelper.validateErrorResponse(createResponse, 403, 'Seller account required to access this resource');
    });

    it('should validate product creation input', async () => {
      // Setup: Create seller
      const seller = await E2ETestHelper.createTestUser({
        username: 'e2e_validation_seller',
        is_seller: true
      });

      // Test missing required fields
      const missingFieldsResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'POST',
        url: '/api/products',
        data: {
          name: 'Incomplete Product'
          // Missing price, inventory_quantity, category_id
        }
      }, seller.token);

      expect(missingFieldsResponse.status).toBe(400);

      // Test invalid price
      const invalidPriceResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'POST',
        url: '/api/products',
        data: {
          name: 'Invalid Price Product',
          price: -10.99,
          inventory_quantity: 5,
          category_id: 1
        }
      }, seller.token);

      expect(invalidPriceResponse.status).toBe(400);

      // Test invalid inventory quantity
      const invalidInventoryResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'POST',
        url: '/api/products',
        data: {
          name: 'Invalid Inventory Product',
          price: 99.99,
          inventory_quantity: -5,
          category_id: 1
        }
      }, seller.token);

      expect(invalidInventoryResponse.status).toBe(400);
    });
  });

  describe('Product Update Flow', () => {
    it('should complete product update workflow', async () => {
      // Setup: Create seller and product with unique data
      const { seller, product } = await E2ETestHelper.setupUniqueScenario();

      const updateData = {
        name: 'Updated Product Name',
        description: 'Updated product description',
        price: 1499.99,
        inventory_quantity: 20
      };

      // Step 1: Update product
      const updateResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'PUT',
        url: `/api/products/${product.id}`,
        data: updateData
      }, seller.token);

      E2ETestHelper.validateResponse(updateResponse, 200, {
        success: true,
        data: {
          message: "Product updated successfully",
          product: {
            id: product.id,
            name: updateData.name,
            description: updateData.description,
            price: updateData.price,
            inventory_quantity: updateData.inventory_quantity
          }
        }
      });

      // Step 2: Verify changes in public listing
      const getResponse = await ServerTestHelper.makeRequest({
        method: 'GET',
        url: `/api/products/${product.id}`
      });

      expect(getResponse.status).toBe(200);
      expect(getResponse.data.data.product.name).toBe(updateData.name);
      expect(getResponse.data.data.product.price).toBe(updateData.price);

      // Step 3: Verify inventory tracking
      expect(getResponse.data.data.product.inventory_quantity).toBe(updateData.inventory_quantity);
    });

    it('should prevent unauthorized product updates', async () => {
      // Setup: Create two sellers and a product
      const { seller, product } = await E2ETestHelper.setupUniqueScenario();
      const seller2 = await E2ETestHelper.createTestUser({
        username: `e2e_other_seller_${Date.now()}`,
        is_seller: true
      });

      const updateData = {
        name: 'Unauthorized Update',
        price: 999.99
      };

      // Attempt to update another seller's product
      const updateResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'PUT',
        url: `/api/products/${product.id}`,
        data: updateData
      }, seller2.token);

      E2ETestHelper.validateErrorResponse(updateResponse, 403, 'You can only update your own products');
    });
  });

  describe('Product Search and Discovery Flow', () => {
    it('should complete product search workflow', async () => {
      // Setup: Create multiple products
      const { seller, category } = await E2ETestHelper.setupUniqueScenario();

      const products = [
        {
          name: 'iPhone 15 Pro',
          description: 'Latest Apple smartphone',
          price: 1199.99,
          inventory_quantity: 10,
          category_id: category.id
        },
        {
          name: 'Samsung Galaxy S24',
          description: 'Android flagship phone',
          price: 999.99,
          inventory_quantity: 15,
          category_id: category.id
        },
        {
          name: 'MacBook Pro',
          description: 'Apple laptop computer',
          price: 2499.99,
          inventory_quantity: 5,
          category_id: category.id
        }
      ];

      // Create all products
      const createdProducts = [];
      for (const productData of products) {
        const response = await E2ETestHelper.makeAuthenticatedRequest({
          method: 'POST',
          url: '/api/products',
          data: productData
        }, seller.token);
        expect(response.status).toBe(201);
        createdProducts.push(response.data.data);
      }

      // Step 1: Search by name
      const searchResponse = await E2ETestHelper.searchProducts('iPhone');
      expect(searchResponse.status).toBe(200);
      const searchResults = searchResponse.data.data.products || searchResponse.data.data;
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults.some((p: any) => p.name.includes('iPhone'))).toBe(true);

      // Step 2: Search by description
      const descSearchResponse = await E2ETestHelper.searchProducts('Apple');
      expect(descSearchResponse.status).toBe(200);
      const descResults = descSearchResponse.data.data.products || descSearchResponse.data.data;
      expect(descResults.length).toBeGreaterThan(0);

      // Step 3: Filter by category
      const categoryResponse = await E2ETestHelper.getProductsByCategory(category.id);
      expect(categoryResponse.status).toBe(200);
      const categoryResults = categoryResponse.data.data.products || categoryResponse.data.data;
      expect(categoryResults.length).toBeGreaterThanOrEqual(3); // At least our test products

      // Step 4: Filter by price range
      const priceFilterResponse = await ServerTestHelper.makeRequest({
        method: 'GET',
        url: `/api/products?min_price=1000&max_price=1500`
      });
      expect(priceFilterResponse.status).toBe(200);
      const priceResults = priceFilterResponse.data.data.products || priceFilterResponse.data.data;
      priceResults.forEach((product: any) => {
        expect(product.price).toBeGreaterThanOrEqual(1000);
        expect(product.price).toBeLessThanOrEqual(1500);
      });
    });

    it('should handle pagination in product listing', async () => {
      // Setup: Create fewer products for faster testing
      const { seller, category } = await E2ETestHelper.setupUniqueScenario();

      // Create 6 products sequentially to avoid overwhelming the database
      for (let i = 0; i < 6; i++) {
        await E2ETestHelper.makeAuthenticatedRequest({
          method: 'POST',
          url: '/api/products',
          data: {
            name: `Pagination Product ${i + 1}`,
            description: `Product ${i + 1}`,
            price: 100 + i,
            inventory_quantity: 10,
            category_id: category.id
          }
        }, seller.token);
      }

      // Step 1: Get first page with smaller limit to force pagination
      const page1Response = await ServerTestHelper.makeRequest({
        method: 'GET',
        url: '/api/products?page=1&limit=4'
      });

      expect(page1Response.status).toBe(200);
      const page1Products = page1Response.data.data.products || page1Response.data.data;
      expect(page1Products.length).toBeLessThanOrEqual(4);

      // Step 2: Get second page
      const page2Response = await ServerTestHelper.makeRequest({
        method: 'GET',
        url: '/api/products?page=2&limit=4'
      });

      expect(page2Response.status).toBe(200);
      // Should have remaining products
      const page2Products = page2Response.data.data.products || page2Response.data.data;
      expect(page2Products.length).toBeGreaterThan(0);

      // Step 3: Verify no duplicate products between pages
      const page1Ids = page1Products.map((p: any) => p.id);
      const page2Ids = page2Products.map((p: any) => p.id);
      const intersection = page1Ids.filter((id: number) => page2Ids.includes(id));
      expect(intersection).toHaveLength(0);
    });
  });

  describe('Product Inventory Management Flow', () => {
    it('should handle inventory updates correctly', async () => {
      // Setup: Create product with initial inventory
      const { seller, product } = await E2ETestHelper.setupUniqueScenario();
      const initialInventory = product.inventory_quantity;

      // Step 1: Update inventory
      const newInventory = initialInventory + 10;
      const updateResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'PUT',
        url: `/api/products/${product.id}`,
        data: { inventory_quantity: newInventory }
      }, seller.token);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.data.product.inventory_quantity).toBe(newInventory);

      // Step 2: Verify inventory reflects in product listing
      const getResponse = await ServerTestHelper.makeRequest({
        method: 'GET',
        url: `/api/products/${product.id}`
      });

      expect(getResponse.status).toBe(200);
      expect(getResponse.data.data.product.inventory_quantity).toBe(newInventory);

      // Step 3: Test inventory deduction (simulate purchase)
      const user = await E2ETestHelper.createTestUser();
      const addToCartResponse = await E2ETestHelper.addToCart(product.id, 3, user.token);
      expect(addToCartResponse.status).toBe(201);

      // Inventory should still show full amount until order is placed
      const afterCartResponse = await ServerTestHelper.makeRequest({
        method: 'GET',
        url: `/api/products/${product.id}`
      });
      expect(afterCartResponse.status).toBe(200);
      expect(afterCartResponse.data.data.product.inventory_quantity).toBe(newInventory);
    });

    it('should prevent overselling products', async () => {
      // Setup: Create product with limited inventory
      const { seller, category } = await E2ETestHelper.setupUniqueScenario();
      const limitedProduct = await E2ETestHelper.createTestProduct({
        name: 'Limited Stock Product',
        inventory_quantity: 2,
        category_id: category.id
      }, seller.token);

      const user = await E2ETestHelper.createTestUser();

      // Step 1: Add maximum available quantity to cart
      const addMaxResponse = await E2ETestHelper.addToCart(limitedProduct.id, 2, user.token);
      expect(addMaxResponse.status).toBe(201);

      // Step 2: Attempt to add more than available
      const oversellResponse = await E2ETestHelper.addToCart(limitedProduct.id, 5, user.token);
      E2ETestHelper.validateErrorResponse(oversellResponse, 400, 'Insufficient inventory');
    });
  });

  describe('Product Deletion Flow', () => {
    it('should complete product deletion workflow', async () => {
      // Setup: Create product
      const { seller, product } = await E2ETestHelper.setupUniqueScenario();

      // Step 1: Delete product
      const deleteResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'DELETE',
        url: `/api/products/${product.id}`
      }, seller.token);

      E2ETestHelper.validateResponse(deleteResponse, 200, {
        success: true,
        data: {
          message: expect.stringContaining('deleted')
        }
      });

      // Step 2: Verify product no longer appears in listing
      const listResponse = await ServerTestHelper.makeRequest({
        method: 'GET',
        url: '/api/products'
      });

      expect(listResponse.status).toBe(200);
      const products = listResponse.data.data.products || listResponse.data.data;
      const deletedProduct = products.find((p: any) => p.id === product.id);
      expect(deletedProduct).toBeUndefined();

      // Step 3: Verify product cannot be retrieved by ID
      const getResponse = await ServerTestHelper.makeRequest({
        method: 'GET',
        url: `/api/products/${product.id}`
      });

      expect(getResponse.status).toBe(404);
    });

    it('should prevent unauthorized product deletion', async () => {
      // Setup: Create product and another seller
      const { seller, product } = await E2ETestHelper.setupUniqueScenario();
      const seller2 = await E2ETestHelper.createTestUser({
        username: `e2e_unauthorized_seller_${Date.now()}`,
        is_seller: true
      });

      // Attempt to delete another seller's product
      const deleteResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'DELETE',
        url: `/api/products/${product.id}`
      }, seller2.token);

      E2ETestHelper.validateErrorResponse(deleteResponse, 403, 'You can only delete your own products');

      // Verify product still exists
      const getResponse = await ServerTestHelper.makeRequest({
        method: 'GET',
        url: `/api/products/${product.id}`
      });

      expect(getResponse.status).toBe(200);
    });
  });
});