import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface Category {
  id: number;
  name: string;
  parentId?: number;
  children?: Category[];
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  inventory_quantity: number;
  imageUrl?: string;
  category_id: number;
  seller_id: number;
}

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  stock: string;
  categoryId: string;
  imageUrl: string;
}

const EditProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    stock: '',
    categoryId: '',
    imageUrl: ''
  });

  const [errors, setErrors] = useState<Partial<ProductFormData>>({});

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!user?.is_seller) {
      navigate('/upgrade-seller');
      return;
    }

    if (id) {
      loadProduct();
      loadCategories();
    }
  }, [isAuthenticated, user, navigate, id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/api/products/${id}`);
      if (response.data.success) {
        const productData = response.data.data.product;
        
        // Check if current user owns this product
        if (productData.seller_id !== user?.id) {
          setError('You can only edit your own products');
          return;
        }

        setProduct(productData);
        setFormData({
          name: productData.name,
          description: productData.description,
          price: productData.price.toString(),
          stock: productData.inventory_quantity.toString(),
          categoryId: productData.category_id.toString(),
          imageUrl: productData.imageUrl || ''
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      if (response.data.success) {
        setCategories(response.data.data.categories || []);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ProductFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Product name must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Product description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!formData.price.trim()) {
      newErrors.price = 'Price is required';
    } else {
      const price = parseFloat(formData.price);
      if (isNaN(price) || price <= 0) {
        newErrors.price = 'Price must be a positive number';
      } else if (price > 999999) {
        newErrors.price = 'Price cannot exceed $999,999';
      }
    }

    if (!formData.stock.trim()) {
      newErrors.stock = 'Stock quantity is required';
    } else {
      const stock = parseInt(formData.stock);
      if (isNaN(stock) || stock < 0) {
        newErrors.stock = 'Stock must be a non-negative number';
      } else if (stock > 999999) {
        newErrors.stock = 'Stock cannot exceed 999,999 units';
      }
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Please select a category';
    }

    if (formData.imageUrl && !isValidUrl(formData.imageUrl)) {
      newErrors.imageUrl = 'Please enter a valid image URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name as keyof ProductFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        inventory_quantity: parseInt(formData.stock),
        category_id: parseInt(formData.categoryId),
        imageUrl: formData.imageUrl.trim() || undefined
      };

      const response = await api.put(`/api/products/${id}`, productData);
      
      if (response.data.success) {
        setSuccess('Product updated successfully!');
        setTimeout(() => {
          navigate('/seller/products');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const renderCategoryOptions = (categories: Category[], level: number = 0): React.ReactElement[] => {
    const options: React.ReactElement[] = [];
    
    categories.forEach(category => {
      const indent = '  '.repeat(level);
      options.push(
        <option key={category.id} value={category.id}>
          {indent}{category.name}
        </option>
      );
      
      if (category.children && category.children.length > 0) {
        options.push(...renderCategoryOptions(category.children, level + 1));
      }
    });
    
    return options;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-lg">Loading product...</div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 text-lg mb-4">{error}</div>
        <button
          onClick={() => navigate('/seller/products')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Back to Products
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Product</h1>
        <p className="text-gray-600 mt-2">Update your product information</p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          {success}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
        {/* Product Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Product Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter product name"
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* Product Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Describe your product in detail"
          />
          {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
        </div>

        {/* Price and Stock */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
              Price ($) *
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.price ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0.00"
            />
            {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
          </div>

          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-2">
              Stock Quantity *
            </label>
            <input
              type="number"
              id="stock"
              name="stock"
              value={formData.stock}
              onChange={handleInputChange}
              min="0"
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.stock ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0"
            />
            {errors.stock && <p className="text-red-500 text-sm mt-1">{errors.stock}</p>}
          </div>
        </div>

        {/* Category */}
        <div>
          <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            id="categoryId"
            name="categoryId"
            value={formData.categoryId}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.categoryId ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select a category</option>
            {renderCategoryOptions(categories)}
          </select>
          {errors.categoryId && <p className="text-red-500 text-sm mt-1">{errors.categoryId}</p>}
        </div>

        {/* Image URL */}
        <div>
          <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-2">
            Product Image URL (optional)
          </label>
          <input
            type="url"
            id="imageUrl"
            name="imageUrl"
            value={formData.imageUrl}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.imageUrl ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="https://example.com/image.jpg"
          />
          {errors.imageUrl && <p className="text-red-500 text-sm mt-1">{errors.imageUrl}</p>}
          <p className="text-gray-500 text-sm mt-1">
            Enter a URL to an image of your product. Leave blank if you don't have an image.
          </p>
        </div>

        {/* Image Preview */}
        {formData.imageUrl && isValidUrl(formData.imageUrl) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image Preview
            </label>
            <div className="border border-gray-300 rounded-md p-4">
              <img
                src={formData.imageUrl}
                alt="Product preview"
                className="max-w-full h-48 object-cover rounded-md"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/seller/products')}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Updating Product...' : 'Update Product'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProductPage;