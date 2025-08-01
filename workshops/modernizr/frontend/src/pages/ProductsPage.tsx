import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import Toast from '../components/Toast';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import CategoryFilter from '../components/CategoryFilter';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  inventory_quantity: number;
  seller: {
    id: number;
    username: string;
  };
  category: {
    id: number;
    name: string;
  };
}

interface ApiProduct {
  id: number;
  seller_id: number;
  category_id: number;
  name: string;
  description: string;
  price: number;
  inventory_quantity: number;
  category_name: string;
  seller_username: string;
  seller_email: string;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: number;
  name: string;
  children?: Category[];
}

const ProductsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();

  // Transform API product to expected Product interface
  const transformProduct = (apiProduct: ApiProduct): Product => ({
    id: apiProduct.id,
    name: apiProduct.name,
    description: apiProduct.description,
    price: apiProduct.price,
    inventory_quantity: apiProduct.inventory_quantity,
    seller: {
      id: apiProduct.seller_id,
      username: apiProduct.seller_username
    },
    category: {
      id: apiProduct.category_id,
      name: apiProduct.category_name
    }
  });
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(() => {
    const categoryParam = searchParams.get('category');
    return categoryParam ? parseInt(categoryParam, 10) : null;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const itemsPerPage = 12;

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/categories');
        if (response.data.success) {
          setCategories(response.data.data.categories);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        params.append('limit', itemsPerPage.toString());
        
        if (searchQuery) {
          params.append('search', searchQuery);
        }
        
        if (selectedCategory) {
          params.append('category_id', selectedCategory.toString());
        }

        const url = `/products?${params.toString()}`;
        const response = await api.get(url);
        
        if (response.data.success) {
          const apiProducts: ApiProduct[] = response.data.data.products;
          const transformedProducts = apiProducts.map(transformProduct);
          setProducts(transformedProducts);
          setTotalPages(response.data.data.pagination?.total_pages || 1);
          setTotalProducts(response.data.data.pagination?.total || response.data.data.products.length);
        }
      } catch (error: any) {
        setError(error.message || 'Failed to fetch products');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage, searchQuery, selectedCategory]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1); // Reset to first page when filtering
    
    // Update URL parameters
    const newSearchParams = new URLSearchParams(searchParams);
    if (categoryId) {
      newSearchParams.set('category', categoryId.toString());
    } else {
      newSearchParams.delete('category');
    }
    setSearchParams(newSearchParams);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddToCart = async (productId: number) => {
    if (!isAuthenticated) {
      setToast({ message: 'Please log in to add items to cart', type: 'error' });
      return;
    }

    try {
      await addToCart(productId, 1);
      setToast({ message: 'Product added to cart successfully!', type: 'success' });
    } catch (error: any) {
      setToast({ message: error.message || 'Failed to add item to cart', type: 'error' });
    }
  };

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <div className="mt-4 sm:mt-0 sm:w-96">
          <SearchBar onSearch={handleSearch} initialValue={searchQuery} />
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Category Filter - Compact */}
        <div className="lg:w-80">
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onCategorySelect={handleCategorySelect}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Results Info */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              {searchQuery && (
                <span>Search results for "{searchQuery}" • </span>
              )}
              {selectedCategory && (
                <span>
                  Category: {categories.find(c => c.id === selectedCategory)?.name || 
                           categories.find(c => c.children?.some(child => child.id === selectedCategory))?.children?.find(child => child.id === selectedCategory)?.name} • 
                </span>
              )}
              {totalProducts} product{totalProducts !== 1 ? 's' : ''} found
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading products...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* No Products Found */}
          {!loading && !error && products.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery || selectedCategory 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No products are available at the moment.'
                }
              </p>
            </div>
          )}

          {/* Products Grid */}
          {!loading && !error && products.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={totalProducts}
                itemsPerPage={itemsPerPage}
              />
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default ProductsPage;