'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function PaymentModal({ ride, isOpen, onClose, onPaymentSuccess, socket }) {
  const [method, setMethod] = useState('RAZORPAY'); // 'CASH' | 'UPI' | 'RAZORPAY'
  const [loading, setLoading] = useState(false);
  const [upiData, setUpiData] = useState(null);
  const [utrInput, setUtrInput] = useState('');

  if (!isOpen || !ride) return null;

  const fareAmount = ride.actualFare || ride.estimatedFare || 0;

  // Load external Razorpay Checkout SDK script dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // 1. Handle Cash Payment (Request from driver)
  const handleCashPayment = async () => {
    setLoading(true);
    try {
      const res = await api.post('/payment/cash/request', { rideId: ride.id });
      if (res.data?.success) {
        toast('💵 Cash payment marked! Hand cash to driver and await their confirmation.', { icon: '⏳' });
        if (socket) {
          socket.emit('payment:cash-requested', { rideId: ride.id, amount: fareAmount });
        }
        if (onPaymentSuccess) onPaymentSuccess();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to request cash payment');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle UPI Initiate & Verify
  const handleInitiateUPI = async () => {
    setLoading(true);
    try {
      const res = await api.post('/payment/upi/initiate', { rideId: ride.id });
      if (res.data?.success) {
        setUpiData(res.data.upiDetails);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initiate UPI');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUPI = async () => {
    if (!upiData) return;
    setLoading(true);
    try {
      const res = await api.post('/payment/upi/verify', {
        rideId: ride.id,
        transactionRef: upiData.transactionRef,
        utrNumber: utrInput.trim()
      });
      if (res.data?.success) {
        toast.success('📱 UPI payment verified successfully!');
        if (socket) socket.emit('ride:status-changed', { rideId: ride.id, status: 'COMPLETED' });
        onPaymentSuccess();
        onClose();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'UPI verification failed');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Razorpay Gateway
  const handleRazorpayPayment = async () => {
    setLoading(true);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error('Failed to load Razorpay SDK. Please check your internet connection.');
        setLoading(false);
        return;
      }

      // Step A: Create Order
      const res = await api.post('/payment/razorpay/create-order', { rideId: ride.id });
      const { order } = res.data;

      // Step B: Configure Options
      const options = {
        key: order.razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'RideFlow',
        description: `Payment for Trip #${ride.id.substring(0, 8)}`,
        order_id: order.id,
        handler: async function (response) {
          try {
            // Step C: Verify Signature on Backend
            const verifyRes = await api.post('/payment/razorpay/verify', {
              rideId: ride.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.data?.success) {
              toast.success('🎉 Payment successful! Ride is fully paid.');
              if (socket) socket.emit('ride:status-changed', { rideId: ride.id, status: 'COMPLETED' });
              onPaymentSuccess();
              onClose();
            }
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed');
          }
        },
        theme: { color: '#f97316' }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to open Razorpay');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-gray-900 border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="text-lg font-bold">Choose Payment Method</h3>
            <p className="text-xs text-gray-400">Total Fare: <span className="text-emerald-400 font-bold text-sm">₹{fareAmount}</span></p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">✕</button>
        </div>

        {/* Method Switcher Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-gray-950 p-1.5 rounded-2xl border border-white/5">
          <button
            onClick={() => { setMethod('RAZORPAY'); setUpiData(null); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${method === 'RAZORPAY' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            💳 Razorpay
          </button>
          <button
            onClick={() => { setMethod('UPI'); handleInitiateUPI(); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${method === 'UPI' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            📱 UPI QR
          </button>
          <button
            onClick={() => { setMethod('CASH'); setUpiData(null); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${method === 'CASH' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            💵 Cash
          </button>
        </div>

        {/* TAB 1: RAZORPAY */}
        {method === 'RAZORPAY' && (
          <div className="space-y-4 text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-400 text-2xl flex items-center justify-center mx-auto border border-orange-500/20">
              💳
            </div>
            <div>
              <h4 className="text-sm font-bold">Instant Online Gateway</h4>
              <p className="text-xs text-gray-400 mt-1">Pay with Credit/Debit Cards, NetBanking, Wallets or UPI.</p>
            </div>
            <button
              onClick={handleRazorpayPayment}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm rounded-xl shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Opening Gateway...' : `Pay ₹${fareAmount} via Razorpay`}
            </button>
          </div>
        )}

        {/* TAB 2: UPI */}
        {method === 'UPI' && (
          <div className="space-y-4 text-center py-2">
            {upiData ? (
              <div className="space-y-3">
                <div className="p-3 bg-white rounded-2xl inline-block shadow-inner mx-auto">
                  <img src={upiData.qrCodeUrl} alt="UPI QR Code" className="w-44 h-44 mx-auto rounded-lg" />
                </div>
                <p className="text-xs text-gray-400">Scan with GPay, PhonePe, Paytm or BHIM</p>

                {/* Direct App Link Button */}
                <a
                  href={upiData.upiUri}
                  className="block w-full py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/40 rounded-xl text-xs font-bold transition-all"
                >
                  🚀 Open in Installed UPI App
                </a>

                {/* Manual UTR Confirmation */}
                <div className="flex gap-2 pt-2 border-t border-white/10">
                  <input
                    type="text"
                    placeholder="Optional 12-digit UTR / Ref"
                    value={utrInput}
                    onChange={(e) => setUtrInput(e.target.value)}
                    className="flex-1 bg-gray-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={handleVerifyUPI}
                    disabled={loading}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 font-bold text-xs rounded-xl text-white transition-all disabled:opacity-50"
                  >
                    {loading ? '...' : 'Confirm Paid'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-gray-400">Generating dynamic UPI QR code...</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CASH */}
        {method === 'CASH' && (
          <div className="space-y-4 text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 text-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
              💵
            </div>
            <div>
              <h4 className="text-sm font-bold">Pay Cash to Driver</h4>
              <p className="text-xs text-gray-400 mt-1">
                Hand over <span className="text-emerald-400 font-bold">₹{fareAmount}</span> in cash directly to your driver.
              </p>
            </div>

            {ride.paymentStatus === 'CASH_PENDING' ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
                <div className="flex items-center justify-center gap-2 font-bold text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span>Awaiting Driver Confirmation</span>
                </div>
                <p className="text-[11px] text-gray-300">
                  Please hand <span className="font-bold text-white">₹{fareAmount}</span> to your driver. As soon as the driver clicks &apos;Yes, Passenger Gave Cash&apos;, this will automatically update.
                </p>
              </div>
            ) : (
              <button
                onClick={handleCashPayment}
                disabled={loading}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-sm rounded-xl shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Marking Cash...' : 'I Have Paid Cash to Driver'}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
