import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import api from '../services/api';
import Toast from '../components/Toast';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  inventory_quantity: number;
  seller?: {
    id: number;
    username: string;
  };
  category?: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

interface ApiProduct {
  id: number;
  seller_id: number;
  category_id: number;
  name: string;
  description: string;
  price: number;
  inventory_quantity: number;
  category: {
    id: number;
    name: string;
  };
  seller_username: string;
  seller_email: string;
  created_at: string;
  updated_at: string;
}

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();

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
      id: apiProduct.category.id,
      name: apiProduct.category.name
    },
    created_at: apiProduct.created_at,
    updated_at: apiProduct.updated_at
  });

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        setError('Product ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get(`/products/${id}`);
        
        if (response.data.success) {
          const apiProduct: ApiProduct = response.data.data.product;
          const transformedProduct = transformProduct(apiProduct);
          setProduct(transformedProduct);
        } else {
          setError('Product not found');
        }
      } catch (error: any) {
        if (error.message.includes('404')) {
          setError('Product not found');
        } else {
          setError(error.message || 'Failed to fetch product details');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      setToast({ message: 'Please log in to add items to cart', type: 'error' });
      return;
    }

    if (!product) return;

    try {
      setAddingToCart(true);
      await addToCart(product.id, quantity);
      setToast({ message: `${quantity} item${quantity > 1 ? 's' : ''} added to cart successfully!`, type: 'success' });
    } catch (error: any) {
      setToast({ message: error.message || 'Failed to add item to cart', type: 'error' });
    } finally {
      setAddingToCart(false);
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= (product?.inventory_quantity || 1)) {
      setQuantity(newQuantity);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading product details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 inline-block">
          {error}
        </div>
        <div>
          <button
            onClick={() => navigate('/products')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Product not found</p>
        <button
          onClick={() => navigate('/products')}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Back to Products
        </button>
      </div>
    );
  }

  const isOutOfStock = product.inventory_quantity === 0;

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
      
      <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex mb-6" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link to="/products" className="text-gray-700 hover:text-blue-600">
              Products
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-500 ml-1 md:ml-2">{product.category?.name || 'Uncategorized'}</span>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-500 ml-1 md:ml-2 truncate">{product.name}</span>
            </div>
          </li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="aspect-w-1 aspect-h-1">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-96 object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
              <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Category Badge */}
          <div>
            <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
              {product.category?.name || 'Uncategorized'}
            </span>
          </div>

          {/* Product Name */}
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>

          {/* Price */}
          <div className="text-3xl font-bold text-green-600">
            ${product.price.toFixed(2)}
          </div>

          {/* Stock Status */}
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isOutOfStock 
                ? 'bg-red-100 text-red-800' 
                : product.inventory_quantity <= 5
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {isOutOfStock 
                ? 'Out of Stock' 
                : product.inventory_quantity <= 5
                ? `Only ${product.inventory_quantity} left`
                : 'In Stock'
              }
            </span>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600 leading-relaxed">{product.description}</p>
          </div>

          {/* Seller Info */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Seller Information</h3>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-medium">
                  {product.seller?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{product.seller?.username || 'Unknown Seller'}</p>
                <p className="text-sm text-gray-500">Seller</p>
              </div>
            </div>
          </div>

          {/* Add to Cart Section */}
          {!isOutOfStock && (
            <div className="border-t pt-6">
              <div className="flex items-center space-x-4 mb-4">
                <label htmlFor="quantity" className="text-sm font-medium text-gray-700">
                  Quantity:
                </label>
                <div className="flex items-center border border-gray-300 rounded-md">
                  <button
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                    className="px-3 py-1 text-gray-600 hover:text-gray-800 disabled:text-gray-400"
                  >
                    -
                  </button>
                  <span className="px-4 py-1 border-x border-gray-300">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= product.inventory_quantity}
                    className="px-3 py-1 text-gray-600 hover:text-gray-800 disabled:text-gray-400"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-gray-500">
                  ({product.inventory_quantity} available)
                </span>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={addingToCart || !isAuthenticated}
                className={`w-full py-3 px-6 rounded-md font-medium transition-colors ${
                  addingToCart || !isAuthenticated
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {addingToCart 
                  ? 'Adding to Cart...' 
                  : !isAuthenticated 
                  ? 'Login to Add to Cart'
                  : 'Add to Cart'
                }
              </button>

              {!isAuthenticated && (
                <p className="mt-2 text-sm text-gray-500 text-center">
                  <Link to="/login" className="text-blue-600 hover:underline">
                    Sign in
                  </Link> to add items to your cart
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default ProductDetailPage;