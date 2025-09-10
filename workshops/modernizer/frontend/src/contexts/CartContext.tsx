import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    description: string;
    price: number;
    inventoryQuantity: number;
    categoryName: string;
    sellerUsername: string;
    imageUrl?: string;
  };
}

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addToCart: (productId: number, quantity: number) => Promise<void>;
  updateQuantity: (productId: number, quantity: number) => Promise<void>;
  removeFromCart: (productId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();

  // Calculate derived values
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // Load cart when user authenticates
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshCart();
    } else {
      setItems([]);
    }
  }, [isAuthenticated, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshCart = async (): Promise<void> => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      const response = await api.get('/cart');
      setItems(response.data.data?.cart?.items || []);
    } catch (error) {
      console.error('Error fetching cart:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId: number, quantity: number): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('Must be logged in to add items to cart');
    }

    try {
      setLoading(true);
      await api.post('/cart/items', {
        productId,
        quantity
      });
      
      // Refresh cart to get updated data
      await refreshCart();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId: number, quantity: number): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('Must be logged in to update cart');
    }

    try {
      setLoading(true);
      await api.put(`/cart/items/${productId}`, {
        quantity
      });
      
      // Refresh cart to get updated data
      await refreshCart();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (productId: number): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('Must be logged in to remove items from cart');
    }

    try {
      setLoading(true);
      await api.delete(`/cart/items/${productId}`);
      
      // Refresh cart to get updated data
      await refreshCart();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async (): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('Must be logged in to clear cart');
    }

    try {
      setLoading(true);
      await api.delete('/cart');
      setItems([]);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value: CartContextType = {
    items,
    totalItems,
    totalPrice,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    refreshCart,
    loading
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};