import React from 'react';
import { Link } from 'react-router-dom';

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
}

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: number) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(product.id);
    }
  };

  const isOutOfStock = product.inventory_quantity === 0;

  return (
    <div className="bg-white rounded-lg shadow-md border hover:shadow-lg transition-shadow duration-200">
      {/* Product Image */}
      <div className="aspect-w-16 aspect-h-12 bg-gray-200 rounded-t-lg overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 flex items-center justify-center bg-gray-100">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Category Badge */}
        <div className="mb-2">
          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            {product.category?.name || 'Uncategorized'}
          </span>
        </div>

        {/* Product Name */}
        <Link 
          to={`/products/${product.id}`}
          className="block hover:text-blue-600 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {/* Product Description */}
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {product.description}
        </p>

        {/* Price and Stock */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl font-bold text-green-600">
            ${product.price.toFixed(2)}
          </span>
          <span className={`text-sm ${isOutOfStock ? 'text-red-600' : 'text-gray-500'}`}>
            {isOutOfStock ? 'Out of Stock' : `${product.inventory_quantity} in stock`}
          </span>
        </div>

        {/* Seller Info */}
        <div className="text-sm text-gray-500 mb-3">
          Sold by <span className="font-medium">{product.seller?.username || 'Unknown Seller'}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Link
            to={`/products/${product.id}`}
            className="flex-1 bg-gray-100 text-gray-800 text-center py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
          >
            View Details
          </Link>
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              isOutOfStock
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;