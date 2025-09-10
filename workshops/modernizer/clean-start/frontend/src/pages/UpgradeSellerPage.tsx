import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const UpgradeSellerPage: React.FC = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);

  const handleUpgrade = async () => {
    if (!agreed) {
      setError('Please agree to the terms and conditions');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await api.post('/seller/upgrade');
      
      // Update user state with seller status from backend response
      if (response.data.success && response.data.data.user && user) {
        const backendUser = response.data.data.user;
        const updatedUser = {
          id: user.id,
          username: user.username,
          email: user.email,
          is_seller: Boolean(backendUser.is_seller),
          role: backendUser.is_seller ? 'seller' as const : 'buyer' as const
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      // Redirect to seller dashboard
      navigate('/seller/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to upgrade account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (user?.is_seller) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-green-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">You're Already a Seller!</h1>
          <p className="text-gray-600 mb-6">
            Your account has already been upgraded to seller status. You can now manage your products and start selling.
          </p>
          <button
            onClick={() => navigate('/seller/dashboard')}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
          >
            Go to Seller Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Upgrade to Seller Account</h1>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Benefits of Becoming a Seller</h2>
          <ul className="space-y-3">
            <li className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">List and sell your products to thousands of customers</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">Access to seller dashboard and analytics</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">Manage inventory and track orders</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">Secure payment processing</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">24/7 seller support</span>
            </li>
          </ul>
        </div>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Getting Started</h3>
          <p className="text-blue-700">
            Once you upgrade to a seller account, you'll be able to:
          </p>
          <ul className="mt-2 text-blue-700 list-disc list-inside">
            <li>Create product listings with photos and descriptions</li>
            <li>Set prices and manage inventory</li>
            <li>Process orders and communicate with customers</li>
            <li>Track your sales performance</li>
          </ul>
        </div>

        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Terms and Conditions</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>By upgrading to a seller account, you agree to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Provide accurate product information and descriptions</li>
              <li>Maintain adequate inventory levels</li>
              <li>Process orders in a timely manner</li>
              <li>Comply with our seller policies and guidelines</li>
              <li>Provide excellent customer service</li>
            </ul>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 mr-3"
            />
            <span className="text-sm text-gray-700">
              I have read and agree to the terms and conditions for becoming a seller on this platform.
            </span>
          </label>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleUpgrade}
            disabled={!agreed || loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Upgrading...' : 'Upgrade to Seller'}
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="bg-gray-300 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeSellerPage;