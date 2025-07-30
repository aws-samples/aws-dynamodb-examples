import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FormField from '../components/FormField';
import { LoadingButton } from '../components/LoadingSpinner';
import PageErrorBoundary from '../components/PageErrorBoundary';
import { ErrorService, ValidationRules } from '../services/errorService';
import Toast from '../components/Toast';

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the page user was trying to access before login
  const from = location.state?.from?.pathname || '/';

  const handleFieldChange = (name: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const validationRules = {
      username: ValidationRules.required('Username'),
      password: ValidationRules.required('Password')
    };

    const validationErrors = ErrorService.validateForm(formData, validationRules);
    
    if (validationErrors.length > 0) {
      const errorMap: Record<string, string> = {};
      validationErrors.forEach(error => {
        const field = error.split(' ')[0].toLowerCase();
        errorMap[field] = error;
      });
      setErrors(errorMap);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setToast({ message: 'Please fix the errors below', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      console.log('LoginPage: Attempting login...');
      await login(formData.username, formData.password);
      console.log('LoginPage: Login successful, navigating to:', from);
      
      setToast({ message: 'Login successful!', type: 'success' });
      
      // Small delay to show success message
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1000);
      
    } catch (err: any) {
      console.error('LoginPage: Login failed:', err);
      
      // Parse error using ErrorService
      const parsedError = ErrorService.parseApiError(err);
      const userMessage = ErrorService.getUserFriendlyMessage(parsedError);
      
      setToast({ message: userMessage, type: 'error' });
      
      // If it's a validation error, try to map it to specific fields
      if (parsedError.details && Array.isArray(parsedError.details)) {
        const fieldErrors: Record<string, string> = {};
        parsedError.details.forEach((detail: any) => {
          if (detail.path) {
            fieldErrors[detail.path] = detail.msg;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageErrorBoundary pageName="Login">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleFieldChange}
            error={errors.username}
            placeholder="Enter your username"
            required
            autoComplete="username"
          />

          <FormField
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleFieldChange}
            error={errors.password}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
          />

          <LoadingButton
            type="submit"
            loading={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Sign In
          </LoadingButton>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium">
              Sign up here
            </Link>
          </p>
        </div>

        {/* Additional Help */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Having trouble? Contact support for assistance.
          </p>
        </div>
      </div>
    </PageErrorBoundary>
  );
};

export default LoginPage;