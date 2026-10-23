'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, UserProfile } from '../lib/api';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (user: UserProfile) => void;
}

export default function CustomerAuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
}: CustomerAuthModalProps) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'LOGIN' | 'OTP' | 'PROFILE'>('LOGIN');
  const [otpCode, setOtpCode] = useState('');

  // Check login status on modal open
  useEffect(() => {
    if (isOpen) {
      api.getCurrentUser().then((user) => {
        if (user && user.role === 'CUSTOMER') {
          setCurrentUser(user);
          setStep('PROFILE');
        } else {
          setCurrentUser(null);
          setStep('LOGIN');
        }
      });
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      // Direct instant passwordless login/register
      const res = await api.loginCustomer(clean, name.trim() || undefined);
      setCurrentUser(res.user);
      setStep('PROFILE');
      if (onLoginSuccess) {
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setPhone('9812345678');
    setName('Rohan Verma');
    setError(null);
    setLoading(true);
    try {
      const res = await api.loginCustomer('9812345678', 'Rohan Verma');
      setCurrentUser(res.user);
      setStep('PROFILE');
      if (onLoginSuccess) {
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await api.logout();
      setCurrentUser(null);
      setStep('LOGIN');
      setPhone('');
      setName('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col">
        {/* Header Strip */}
        <div className="bg-[#38754A] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold">
              {currentUser ? (
                currentUser.name.charAt(0).toUpperCase()
              ) : (
                <span className="material-symbols-outlined text-[20px]">person</span>
              )}
            </span>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {currentUser ? currentUser.name : 'Welcome to Janki Rasoi'}
              </h3>
              <p className="text-xs text-white/80">
                {currentUser ? `+91 ${currentUser.phone}` : 'Fresh Ghar Jaisa Khana, Daily'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{error}</span>
            </div>
          )}

          {step === 'PROFILE' && currentUser ? (
            <div className="space-y-4">
              {/* Account Overview */}
              <div className="bg-emerald-50 border border-emerald-200/70 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Customer Account
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-emerald-600 text-white font-semibold rounded-full">
                    {currentUser.orderCount || 0} Orders
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-800 font-semibold">{currentUser.name}</div>
                <div className="text-xs text-gray-500">+91 {currentUser.phone}</div>
              </div>

              {/* Saved Delivery Address */}
              <div className="border border-gray-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  <span className="material-symbols-outlined text-base text-primary">location_on</span>
                  Default Delivery Address
                </div>
                {currentUser.savedAddress ? (
                  <div className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="font-semibold text-gray-900">{currentUser.savedAddress.flat}</p>
                    <p>{currentUser.savedAddress.street}</p>
                    {currentUser.savedAddress.landmark && <p>Landmark: {currentUser.savedAddress.landmark}</p>}
                    <p className="text-emerald-700 font-semibold mt-1">Pincode: {currentUser.savedAddress.pincode}</p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    No address saved yet. It will automatically save upon your next checkout.
                  </p>
                )}
              </div>

              {/* Recent Orders */}
              {currentUser.recentOrders && currentUser.recentOrders.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Recent Orders</span>
                    <Link
                      href="/track"
                      onClick={onClose}
                      className="text-primary hover:underline text-xs capitalize"
                    >
                      Track Active →
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {currentUser.recentOrders.slice(0, 3).map((ord) => (
                      <Link
                        key={ord.id}
                        href={`/track?token=${ord.trackingToken}`}
                        onClick={onClose}
                        className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-xs"
                      >
                        <div>
                          <div className="font-bold text-gray-900">{ord.orderNumber}</div>
                          <div className="text-[11px] text-gray-500">
                            ₹{(ord.totalAmountPaise / 100).toFixed(2)} • {new Date(ord.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {ord.status.replace(/_/g, ' ')}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-sm transition-colors"
                >
                  Continue Ordering
                </button>
                <button
                  onClick={handleLogout}
                  disabled={loading}
                  className="w-full py-2.5 text-xs text-red-600 font-semibold hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                >
                  {loading ? 'Logging out...' : 'Sign Out / Switch Account'}
                </button>
              </div>
            </div>
          ) : (
            /* Login / Phone Input Step */
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="text-center pb-2">
                <h4 className="font-bold text-gray-900 text-lg">Login with Mobile Number</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Save your addresses, re-order your favorite thalis in 1 tap, and track live deliveries.
                </p>
              </div>

              {/* Phone Input with +91 */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Mobile Number *
                </label>
                <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
                  <div className="px-3 py-3 bg-gray-100 text-gray-700 font-bold text-sm border-r border-gray-200">
                    +91
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-3 text-sm font-semibold tracking-wider text-gray-900 outline-none"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-3 text-sm border border-gray-300 rounded-xl focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || phone.length < 10}
                className="w-full py-3.5 bg-[#38754A] hover:bg-[#285C38] disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Instant Login / Continue</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>

              {/* Quick Demo Button for effortless testing */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleQuickDemo}
                  disabled={loading}
                  className="w-full py-2.5 px-3 bg-[#EAF4ED] hover:bg-[#d8eed7] border border-[#38754A]/30 text-[#38754A] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">touch_app</span>
                  <span>1-Tap Test Customer (Rohan Verma)</span>
                </button>
              </div>

              {/* Zero-spam guarantee */}
              <p className="text-[11px] text-gray-500 text-center leading-tight">
                We do not send OTP spam or promotional SMS. Your phone is securely stored only for delivery contact and order tracking.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
