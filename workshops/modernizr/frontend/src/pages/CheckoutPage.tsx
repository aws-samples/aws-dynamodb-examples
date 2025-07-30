import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Toast from '../components/Toast';

interface PaymentDetails {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
}

interface CheckoutValidation {
  eligible: boolean;
  issues: string[];
}

const CheckoutPage: React.FC = () => {
  const { items, totalItems, totalPrice, clearCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'paypal'>('credit_card');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [validation, setValidation] = useState<CheckoutValidation | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
  }, [isAuthenticated, navigate]);

  // Validate checkout eligibility
  useEffect(() => {
    const validateCheckout = async () => {
      if (!isAuthenticated) return;

      try {
        setValidating(true);
        const response = await api.get('/api/orders/checkout/validate');
        if (response.data.success) {
          setValidation(response.data.data.validation);
        }
      } catch (error: any) {
        setToast({ message: error.message || 'Failed to validate checkout', type: 'error' });
        setValidation({ eligible: false, issues: ['Checkout validation failed'] });
      } finally {
        setValidating(false);
      }
    };

    validateCheckout();
  }, [isAuthenticated]);

  // Redirect if cart is empty
  useEffect(() => {
    if (!validating && totalItems === 0) {
      navigate('/cart');
    }
  }, [totalItems, validating, navigate]);

  const handlePaymentDetailsChange = (field: keyof PaymentDetails, value: string) => {
    setPaymentDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCardNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Add spaces every 4 digits
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiryDate = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Add slash after 2 digits
    if (digits.length >= 2) {
      return digits.substring(0, 2) + '/' + digits.substring(2, 4);
    }
    return digits;
  };

  const validateForm = (): boolean => {
    if (paymentMethod === 'credit_card') {
      const { cardNumber, expiryDate, cvv, cardholderName } = paymentDetails;
      
      if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
        setToast({ message: 'Please enter a valid card number', type: 'error' });
        return false;
      }
      
      if (!expiryDate || expiryDate.length < 5) {
        setToast({ message: 'Please enter a valid expiry date', type: 'error' });
        return false;
      }
      
      if (!cvv || cvv.length < 3) {
        setToast({ message: 'Please enter a valid CVV', type: 'error' });
        return false;
      }
      
      if (!cardholderName.trim()) {
        setToast({ message: 'Please enter the cardholder name', type: 'error' });
        return false;
      }
    }
    
    return true;
  };

  const handleCheckout = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const checkoutData: any = {
        paymentMethod
      };

      if (paymentMethod === 'credit_card') {
        checkoutData.paymentDetails = {
          ...paymentDetails,
          cardNumber: paymentDetails.cardNumber.replace(/\s/g, '') // Remove spaces
        };
      }

      const response = await api.post('/api/orders/checkout', checkoutData);
      
      if (response.data.success) {
        // Clear cart after successful checkout
        await clearCart();
        
        // Navigate to order confirmation with order data
        navigate('/order-confirmation', { 
          state: { 
            order: response.data.data.order,
            payment: response.data.data.payment
          }
        });
      }
    } catch (error: any) {
      setToast({ 
        message: error.response?.data?.error?.message || error.message || 'Checkout failed', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  if (validating) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Validating checkout...</span>
      </div>
    );
  }

  if (!validation?.eligible) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-4">Checkout Not Available</h2>
          <div className="space-y-2">
            {validation?.issues.map((issue, index) => (
              <p key={index} className="text-red-700">• {issue}</p>
            ))}
          </div>
          <button
            onClick={() => navigate('/cart')}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Return to Cart
          </button>
        </div>
      </div>
    );
  }

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

      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              {items.map((item) => (
                <div key={item.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-md overflow-hidden">
                    {item.product.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.product.name}</h3>
                    <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                    <p className="text-sm text-gray-500">
                      ${item.product.price.toFixed(2)} each
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total ({totalItems} items)</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Information</h2>

            {/* Payment Method Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Payment Method
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="credit_card"
                    checked={paymentMethod === 'credit_card'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'credit_card')}
                    className="mr-2"
                  />
                  <span>Credit Card</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="paypal"
                    checked={paymentMethod === 'paypal'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'paypal')}
                    className="mr-2"
                  />
                  <span>PayPal</span>
                </label>
              </div>
            </div>

            {/* Credit Card Form */}
            {paymentMethod === 'credit_card' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    value={paymentDetails.cardNumber}
                    onChange={(e) => handlePaymentDetailsChange('cardNumber', formatCardNumber(e.target.value))}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      value={paymentDetails.expiryDate}
                      onChange={(e) => handlePaymentDetailsChange('expiryDate', formatExpiryDate(e.target.value))}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CVV
                    </label>
                    <input
                      type="text"
                      value={paymentDetails.cvv}
                      onChange={(e) => handlePaymentDetailsChange('cvv', e.target.value.replace(/\D/g, '').substring(0, 4))}
                      placeholder="123"
                      maxLength={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    value={paymentDetails.cardholderName}
                    onChange={(e) => handlePaymentDetailsChange('cardholderName', e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* PayPal Info */}
            {paymentMethod === 'paypal' && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-blue-800 text-sm">
                  You will be redirected to PayPal to complete your payment securely.
                </p>
              </div>
            )}

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={loading}
              className={`w-full mt-6 py-3 px-4 rounded-md font-medium transition-colors ${
                loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Processing...' : `Complete Order - $${totalPrice.toFixed(2)}`}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              By completing your order, you agree to our terms of service and privacy policy.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default CheckoutPage;