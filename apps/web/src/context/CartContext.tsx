'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  productId: string;
  name: string;
  pricePaise: number;
  quantity: number;
  variantId?: string;
  variantName?: string;
  imageUrl?: string;
  selectedAddonOptionIds?: string[];
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQty: (index: number, delta: number) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
  totalCount: number;
  totalPricePaise: number;
  toastMessage: string | null;
  isToastError: boolean;
  showToast: (msg: string, isError?: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const STORAGE_KEY = 'jankirasoi_tray_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isToastError, setIsToastError] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Could not read cart from localStorage', e);
    }
    setMounted(true);
  }, []);

  const saveItems = (newItems: CartItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch (e) {
      console.warn('Could not save cart to localStorage', e);
    }
  };

  const showToast = (msg: string, isError = false) => {
    setToastMessage(msg);
    setIsToastError(isError);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const addItem = (newItem: CartItem) => {
    const existingIdx = items.findIndex(
      (i) => i.productId === newItem.productId && i.variantId === newItem.variantId
    );
    let updated: CartItem[];
    if (existingIdx > -1) {
      updated = [...items];
      updated[existingIdx].quantity += newItem.quantity;
    } else {
      updated = [...items, newItem];
    }
    saveItems(updated);
    showToast(`Added ${newItem.name} to your tray!`);
  };

  const updateQty = (index: number, delta: number) => {
    const updated = [...items];
    if (!updated[index]) return;
    updated[index].quantity += delta;
    if (updated[index].quantity <= 0) {
      updated.splice(index, 1);
    }
    saveItems(updated);
  };

  const removeItem = (index: number) => {
    const updated = [...items];
    updated.splice(index, 1);
    saveItems(updated);
  };

  const clearCart = () => {
    saveItems([]);
  };

  const totalCount = mounted ? items.reduce((sum, item) => sum + item.quantity, 0) : 0;
  const totalPricePaise = mounted ? items.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0) : 0;

  return (
    <CartContext.Provider
      value={{
        items: mounted ? items : [],
        addItem,
        updateQty,
        removeItem,
        clearCart,
        totalCount,
        totalPricePaise,
        toastMessage,
        isToastError,
        showToast,
      }}
    >
      {children}
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-xs font-semibold text-white shadow-xl transition-all flex items-center gap-2 ${
            isToastError ? 'bg-red-600' : 'bg-primary-container'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {isToastError ? 'error' : 'check_circle'}
          </span>
          <span>{toastMessage}</span>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
