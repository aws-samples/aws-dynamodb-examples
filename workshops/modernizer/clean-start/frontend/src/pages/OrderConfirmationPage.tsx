import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  priceAtTime: number;
  subtotal: number;
  product: {
    id: number;
    name: string;
    description: string;
    categoryName: string;
    sellerUsername: string;
  };
}

interface Order {
  id: number;
  userId: number;
  totalAmount: number;
  status: string;
  items: OrderItem[];
  createdAt: string;
}

interface Payment {
  success: boolean;
  transactionId: string;
}

interface LocationState {
  order: Order;
  payment: Payment;
}

const OrderConfirmationPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const state = location.state as LocationState;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!state?.order) {
      navigate('/orders');
      return;
    }
  }, [isAuthenticated, state, navigate]);

  if (!isAuthenticated || !state?.order) {
    return null;
  }

  const { order, payment } = state;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
        <p className="text-gray-600">
          Thank you for your purchase. Your order has been successfully placed.
        </p>
      </div>

      {/* Order Details */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Order #{order.id}</h2>
            <p className="text-gray-600">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              order.status === 'completed' 
                ? 'bg-green-100 text-green-800'
                : order.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Payment Information */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-2">Payment Information</h3>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Transaction ID:</span>
            <span className="font-mono text-sm">{payment.transactionId}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-gray-600">Payment Status:</span>
            <span className={`font-medium ${payment.success ? 'text-green-600' : 'text-red-600'}`}>
              {payment.success ? 'Successful' : 'Failed'}
            </span>
          </div>
        </div>

        {/* Order Items */}
        <div>
          <h3 className="font-medium text-gray-900 mb-4">Order Items</h3>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-start space-x-4 pb-4 border-b border-gray-200 last:border-b-0">
                <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{item.product.description}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>Category: {item.product.categoryName}</span>
                    <span>Seller: {item.product.sellerUsername}</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    ${item.subtotal.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {item.quantity} × ${item.priceAtTime.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Total */}
        <div className="border-t pt-4 mt-6">
          <div className="flex justify-between text-xl font-semibold">
            <span>Total</span>
            <span>${order.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          to="/orders"
          className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors text-center"
        >
          View Order History
        </Link>
        <Link
          to="/products"
          className="bg-gray-100 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-200 transition-colors text-center"
        >
          Continue Shopping
        </Link>
      </div>

      {/* Additional Information */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">What's Next?</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• You will receive an email confirmation shortly</li>
          <li>• Your order is being processed and will be shipped soon</li>
          <li>• You can track your order status in your order history</li>
          <li>• Contact support if you have any questions about your order</li>
        </ul>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;