import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to ShopStore</h1>
        <p className="text-xl mb-6">Your one-stop destination for online shopping</p>
        {!isAuthenticated ? (
          <div className="space-x-4">
            <Link 
              to="/register" 
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 inline-block"
            >
              Get Started
            </Link>
            <Link 
              to="/products" 
              className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 inline-block"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-x-4">
            <Link 
              to="/products" 
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 inline-block"
            >
              Shop Now
            </Link>
            {user?.is_seller && (
              <Link 
                to="/seller/dashboard" 
                className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 inline-block"
              >
                Seller Dashboard
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-blue-600 mb-4">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Secure Shopping</h3>
          <p className="text-gray-600">Shop with confidence with our secure payment processing and data protection.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-blue-600 mb-4">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Fast Delivery</h3>
          <p className="text-gray-600">Get your orders delivered quickly with our efficient shipping network.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-blue-600 mb-4">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Quality Products</h3>
          <p className="text-gray-600">Discover high-quality products from trusted sellers around the world.</p>
        </div>
      </div>

      {/* Call to Action */}
      {!isAuthenticated && (
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Start Shopping?</h2>
          <p className="text-gray-600 mb-6">Join thousands of satisfied customers and start your shopping journey today.</p>
          <Link 
            to="/register" 
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 inline-block"
          >
            Create Account
          </Link>
        </div>
      )}

      {isAuthenticated && !user?.is_seller && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4 text-green-800">Want to Sell on ShopStore?</h2>
          <p className="text-green-700 mb-6">Upgrade your account to start selling your products to customers worldwide.</p>
          <Link 
            to="/upgrade-seller" 
            className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 inline-block"
          >
            Become a Seller
          </Link>
        </div>
      )}
    </div>
  );
};

export default HomePage;