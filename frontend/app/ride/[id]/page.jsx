'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import InRideCallModal from '@/components/InRideCallModal';
import PaymentModal from '@/components/PaymentModal';

// Dynamic import for Leaflet map component with ssr disabled
const LiveRideMap = dynamic(() => import('@/components/LiveRideMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[420px] bg-gray-950 rounded-3xl flex items-center justify-center text-gray-400">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold">Loading Map Radar...</span>
      </div>
    </div>
  ),
});

const VEHICLE_EMOJIS = {
  BIKE: '🏍️',
  AUTO: '🛺',
  SEDAN: '🚗',
  SUV: '🚘',
  LUXURY: '💎',
};

const STATUS_THEMES = {
  REQUESTED: { label: 'Finding Driver...', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
  ACCEPTED: { label: 'Driver En Route', color: 'text-sky-400', bg: 'bg-sky-500/15', border: 'border-sky-500/30' },
  ARRIVING: { label: 'Driver Arrived', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
  STARTED: { label: 'Trip in Progress', color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/30' },
  COMPLETED: { label: 'Trip Completed', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
  CANCELED: { label: 'Ride Canceled', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' },
};

export default function RideDetailsPage() {
  const { id: rideId } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { socket } = useSocket();

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // Live driver coordinate from telemetry
  const [liveDriverPos, setLiveDriverPos] = useState(null);

  // In-Ride Realtime Chat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const chatBottomRef = useRef(null);

  // In-Ride WebRTC Call
  const [showCallModal, setShowCallModal] = useState(false);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Fetch full ride details
  const fetchRideDetails = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await api.get(`/rides/${rideId}`);
      if (res.data?.ride) {
        setRide(res.data.ride);
        // Initialize driver location from profile if available
        if (res.data.ride.driver?.driverProfile?.currentLat && res.data.ride.driver?.driverProfile?.currentLng) {
          setLiveDriverPos([
            res.data.ride.driver.driverProfile.currentLat,
            res.data.ride.driver.driverProfile.currentLng,
          ]);
        }
      }
    } catch (error) {
      console.error('Failed to load ride details:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch trip details');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [rideId]);

  // Initial load
  useEffect(() => {
    if (rideId && !authLoading) {
      fetchRideDetails();
    }
  }, [rideId, authLoading, fetchRideDetails]);

  // Socket room connection & event listeners
  useEffect(() => {
    if (!socket || !rideId) return;

    // Join ride room
    socket.emit('ride:join', rideId);
    socket.emit('ride:join-room', rideId);

    // Listen to status updates
    const handleStatusChanged = (data) => {
      console.log('Socket ride:status-changed received:', data);
      fetchRideDetails(true);
      if (data.status === 'ARRIVING') {
        toast('🔔 Driver has arrived at the pickup location!', { icon: '📍' });
      } else if (data.status === 'STARTED') {
        toast.success('🚗 Your trip has started!');
      } else if (data.status === 'COMPLETED') {
        toast.success('🎉 Trip completed successfully!');
      } else if (data.status === 'CANCELED') {
        toast.error('❌ Trip was canceled');
      }
    };

    const handleDriverAccepted = (data) => {
      fetchRideDetails(true);
      toast.success('🚗 Driver accepted your ride!');
    };

    const handleDriverStarted = () => {
      fetchRideDetails(true);
      toast.success('🚗 Trip is now in progress!');
    };

    const handleDriverCompleted = () => {
      fetchRideDetails(true);
      toast.success('🎉 Trip completed! Total fare computed.');
    };

    // Driver location update telemetry
    const handleLocationUpdate = (data) => {
      if (ride?.driverId && data.driverId === ride.driverId) {
        setLiveDriverPos([data.lat, data.lng]);
      }
    };

    // In-ride chat message
    const handleChatMessage = (msg) => {
      setChatMessages((prev) => [...prev, msg]);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    // Cash on delivery payment updates
    const handleCashRequested = (data) => {
      console.log('Socket payment:cash-requested received:', data);
      fetchRideDetails(true);
      if (user?.role === 'DRIVER' || user?.id === ride?.driverId) {
        toast('💵 Passenger indicated Cash Payment. Collect cash & confirm.', { icon: '💰', duration: 6000 });
      }
    };

    const handleCashConfirmed = (data) => {
      console.log('Socket payment:cash-confirmed received:', data);
      fetchRideDetails(true);
      setShowPaymentModal(false);
      toast.success('🎉 Cash payment confirmed! Trip is settled.');
    };

    const handlePaymentUpdated = (data) => {
      console.log('Socket ride:payment-updated received:', data);
      fetchRideDetails(true);
      if (data?.paymentStatus === 'PAID') {
        setShowPaymentModal(false);
      }
    };

    socket.on('ride:status-changed', handleStatusChanged);
    socket.on('ride:accepted', handleDriverAccepted);
    socket.on('ride:started', handleDriverStarted);
    socket.on('ride:completed', handleDriverCompleted);
    socket.on('driver:location:update', handleLocationUpdate);
    socket.on('chat:new-message', handleChatMessage);
    socket.on('payment:cash-requested', handleCashRequested);
    socket.on('payment:cash-confirmed', handleCashConfirmed);
    socket.on('ride:payment-updated', handlePaymentUpdated);

    return () => {
      socket.emit('ride:leave-room', rideId);
      socket.off('ride:status-changed', handleStatusChanged);
      socket.off('ride:accepted', handleDriverAccepted);
      socket.off('ride:started', handleDriverStarted);
      socket.off('ride:completed', handleDriverCompleted);
      socket.off('driver:location:update', handleLocationUpdate);
      socket.off('chat:new-message', handleChatMessage);
      socket.off('payment:cash-requested', handleCashRequested);
      socket.off('payment:cash-confirmed', handleCashConfirmed);
      socket.off('ride:payment-updated', handlePaymentUpdated);
    };
  }, [socket, rideId, ride?.driverId, fetchRideDetails, user?.id, user?.role]);

  // Driver Action: Arrived at Pickup
  const handleArrivedAtPickup = () => {
    if (socket) {
      socket.emit('ride:driver-arrived-at-pickup', {
        rideId,
        riderId: ride?.riderId,
      });
      toast.success('📢 Notified rider of your arrival!');
    }
  };

  // Driver Action: Verify PIN & Start Ride
  const handleStartRide = async (e) => {
    if (e) e.preventDefault();
    if (!pinInput.trim()) {
      toast.error('Please enter the 4-digit passenger PIN');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.put(`/driver/start/${rideId}`, { pin: pinInput.trim() });
      toast.success(res.data?.message || 'Ride started successfully! 🚀');

      if (socket) {
        socket.emit('ride:driver-started', {
          rideId,
          riderId: ride?.riderId,
        });
      }
      fetchRideDetails(true);
    } catch (error) {
      console.error('Start ride error:', error);
      toast.error(error.response?.data?.message || 'Failed to start trip. Check PIN.');
    } finally {
      setActionLoading(false);
    }
  };

  // Driver Action: Complete Ride
  const handleCompleteRide = async () => {
    setActionLoading(true);
    try {
      const res = await api.put(`/driver/complete/${rideId}`);
      toast.success(res.data?.message || 'Ride completed successfully! 🎉');

      if (socket) {
        socket.emit('ride:driver-completed', {
          rideId,
          riderId: ride?.riderId,
        });
      }
      fetchRideDetails(true);
    } catch (error) {
      console.error('Complete ride error:', error);
      toast.error(error.response?.data?.message || 'Failed to complete trip.');
    } finally {
      setActionLoading(false);
    }
  };

  // Driver Action: Confirm Passenger Gave Cash
  const handleConfirmCashPayment = async () => {
    setActionLoading(true);
    try {
      const res = await api.post('/payment/cash/confirm', { rideId });
      if (res.data?.success) {
        toast.success('💵 Cash payment confirmed! Fare added to your earnings. 🎉');
        if (socket) {
          socket.emit('payment:cash-confirmed', { rideId });
        }
        fetchRideDetails(true);
      }
    } catch (err) {
      console.error('Confirm cash payment error:', err);
      toast.error(err.response?.data?.message || 'Failed to confirm cash payment');
    } finally {
      setActionLoading(false);
    }
  };

  // Send In-Ride Chat
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;

    socket.emit('chat:send-message', {
      rideId,
      message: chatInput.trim(),
      senderId: user?.id,
      senderName: user?.name || 'User',
      senderRole: user?.role || 'RIDER',
    });

    setChatInput('');
  };


  const handleCancelCurrentRide = async () => {
    if (!confirm('Are you sure you want to cancel this ride?')) return;

    const reason = prompt('Reason for cancellation (optional):') || 'Cancelled by rider';
    setActionLoading(true);

    try {
      const res = await api.post(`/rides/${rideId}/cancel`, { reason });
      if (res.data?.success) {
        toast.success('Ride cancelled successfully');

        // Emit socket event to notify other party
        if (socket) {
          socket.emit('ride:cancel', { rideId, reason });
        }

        fetchRideDetails(true);
      }
    } catch (err) {
      console.error('Cancel ride error:', err);
      toast.error(err.response?.data?.message || 'Failed to cancel ride');
    } finally {
      setActionLoading(false);
    }
  };


  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-12 h-12 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin" />
        <p className="text-sm font-semibold text-gray-400">Loading Active Trip...</p>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-white p-6 text-center">
        <div className="text-5xl">🔍</div>
        <h2 className="text-xl font-bold">Ride Not Found</h2>
        <p className="text-sm text-gray-400 max-w-sm">
          We couldn&apos;t find this trip. It may have been canceled or the ID is invalid.
        </p>
        <Link
          href={user?.role === 'DRIVER' ? '/driver/dashboard' : '/'}
          className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl text-sm font-bold text-white transition-all shadow-lg"
        >
          Return to {user?.role === 'DRIVER' ? 'Dashboard' : 'Home'}
        </Link>
      </div>
    );
  }

  const isDriver = user?.role === 'DRIVER' || user?.id === ride.driverId;
  const statusTheme = STATUS_THEMES[ride.status] || STATUS_THEMES.REQUESTED;

  const pickupCoords = (ride.pickupLat && ride.pickupLng) ? [ride.pickupLat, ride.pickupLng] : null;
  const dropoffCoords = (ride.dropoffLat && ride.dropoffLng) ? [ride.dropoffLat, ride.dropoffLng] : null;

  // Derived 4-Digit Security OTP (last 4 characters of ride ID)
  const securityPin = ride.otp || ride.id.replace(/-/g, '').slice(-4).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-white font-[Poppins,sans-serif] px-4 sm:px-6 lg:px-8 py-8 relative overflow-hidden">

      {/* Background Glow Blobs */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-orange-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] rounded-full bg-orange-600/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">

        {/* ── Top Bar: Trip ID, Role, Status ── */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href={isDriver ? '/driver/dashboard' : '/history'}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
            >
              ← Back
            </Link>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Trip #{ride.id.substring(0, 8)}
                </h1>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusTheme.bg} ${statusTheme.color} border ${statusTheme.border}`}>
                  {statusTheme.label}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-orange-500/15 text-orange-400 text-xs font-semibold">
                  {VEHICLE_EMOJIS[ride.vehicleType]} {ride.vehicleType}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {isDriver ? 'Driver Mode' : 'Passenger Mode'} • Real-Time GPS Tracking Active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio Call Button (Active during Accepted, Arriving, and Started stages) */}
            {(ride.status === 'ACCEPTED' || ride.status === 'ARRIVING' || ride.status === 'STARTED') && (
              <button
                onClick={() => setShowCallModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-bold text-emerald-400 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
              >
                📞 Call {isDriver ? 'Passenger' : 'Driver'}
              </button>
            )}
            <button
              onClick={() => setShowChat(!showChat)}
              className="px-4 py-2.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-xs font-bold text-orange-400 transition-all flex items-center gap-2 cursor-pointer"
            >
              💬 In-Ride Chat {chatMessages.length > 0 && `(${chatMessages.length})`}
            </button>
            <button
              onClick={() => fetchRideDetails(false)}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-semibold transition-colors cursor-pointer"
              title="Refresh"
            >
              🔄
            </button>
          </div>
        </div>

        {/* ── Main Two-Column Layout: Map + Controls ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Live Radar Map (7 Cols) */}
          <div className="lg:col-span-7 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col min-h-[480px]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-gray-200">LIVE CITY RADAR</span>
              </div>
              <span className="text-[11px] text-gray-400">
                {liveDriverPos ? '📡 Streaming Driver Position' : '📍 Static Map Coordinates'}
              </span>
            </div>

            <div className="flex-1 w-full min-h-[400px]">
              <LiveRideMap
                pickupCoords={pickupCoords}
                dropoffCoords={dropoffCoords}
                driverCoords={liveDriverPos}
                pickupAddress={ride.pickupAddress}
                dropoffAddress={ride.dropoffAddress}
                vehicleType={ride.vehicleType}
                driverName={ride.driver?.name || 'Driver Partner'}
                theme="dark"
              />
            </div>
          </div>

          {/* Right Column: Dynamic Stage Action & Details (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">

            {/* ── STAGE 1: REQUESTED ── */}
            {ride.status === 'REQUESTED' && (
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl text-center space-y-4">
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-orange-500/20 animate-ping" />
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-3xl shadow-lg shadow-orange-500/40">
                    📡
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Looking for Nearby Drivers...</h3>
                  <p className="text-xs text-gray-400">
                    We are broadcasting your trip request exclusively to available drivers within a <strong className="text-orange-400">5 km radius</strong> of your pickup location.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-950/60 border border-white/10 text-left space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Estimated Fare:</span>
                    <span className="font-extrabold text-emerald-400">₹{ride.estimatedFare}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Trip Distance:</span>
                    <span className="font-bold text-white">{ride.distance || '—'} km</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCancelCurrentRide}
                  disabled={actionLoading}
                  className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer mt-2"
                >
                  ✕ Cancel Ride Request
                </button>
              </div>
            )}

            {/* ── STAGE 2: ACCEPTED / ARRIVING ── */}
            {(ride.status === 'ACCEPTED' || ride.status === 'ARRIVING') && (
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">

                {/* Driver / Rider Partner Profile Card */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                      {isDriver
                        ? (ride.rider?.name?.charAt(0) || 'R')
                        : (ride.driver?.name?.charAt(0) || 'D')}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold">
                        {isDriver ? 'Passenger' : 'Your Driver'}
                      </p>
                      <h4 className="text-base font-bold text-white">
                        {isDriver ? (ride.rider?.name || 'Passenger') : (ride.driver?.name || 'Driver Partner')}
                      </h4>
                      <p className="text-xs text-gray-400">
                        📞 {isDriver ? (ride.rider?.phone || 'N/A') : (ride.driver?.phone || 'N/A')}
                      </p>
                    </div>
                  </div>

                  {!isDriver && ride.driver?.driverProfile && (
                    <div className="text-right">
                      <p className="text-xs font-mono font-bold text-orange-400">
                        {ride.driver.driverProfile.vehiclePlate}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {ride.driver.driverProfile.vehicleModel} ({ride.driver.driverProfile.vehicleColor})
                      </p>
                    </div>
                  )}
                </div>

                {/* 4-Digit Security PIN Banner (RIDER ONLY) */}
                {!isDriver && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-transparent border border-orange-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400 block">
                        🔑 Ride Security PIN
                      </span>
                      <p className="text-xs text-gray-300 mt-0.5">
                        Share this PIN with your driver when boarding to start the ride
                      </p>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-gray-950/90 border border-orange-500/50 text-xl font-mono font-black text-orange-400 tracking-widest shadow-inner">
                      {securityPin}
                    </div>
                  </div>
                )}

                {/* DRIVER CONTROLS (Stage 1 / 2) */}
                {isDriver && (
                  <div className="space-y-4 pt-2">
                    {ride.status === 'ACCEPTED' && (
                      <button
                        onClick={handleArrivedAtPickup}
                        className="w-full py-3.5 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        📢 I Have Arrived at Pickup Location
                      </button>
                    )}

                    {/* PIN Verification & Start Form */}
                    <form onSubmit={handleStartRide} className="space-y-3 p-4 rounded-2xl bg-gray-950/60 border border-white/10">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                        <span className="text-orange-400">🔒</span>
                        <span>Ask passenger for their 4-digit PIN to start:</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={pinInput}
                          onChange={(e) => setPinInput(e.target.value)}
                          placeholder="e.g. 1234"
                          maxLength={4}
                          className="flex-1 bg-gray-950/90 border border-white/20 focus:border-orange-500 rounded-xl px-4 py-3 text-center text-lg font-mono font-extrabold text-white tracking-widest uppercase focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={actionLoading || !pinInput.trim()}
                          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer"
                        >
                          {actionLoading ? 'Starting...' : 'Verify & Start 🚀'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={handleCancelCurrentRide}
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ✕ Cancel Ride
                </button>

              </div>
            )}

            {/* ── STAGE 3: STARTED (TRIP IN PROGRESS) ── */}
            {ride.status === 'STARTED' && (
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">

                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center text-xl animate-spin">
                    🧭
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Trip In Progress</h3>
                    <p className="text-xs text-emerald-400 font-semibold">Heading towards dropoff destination</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gray-950/60 border border-white/10 space-y-3">
                  <div>
                    <p className="text-[11px] text-gray-400 font-bold uppercase">Destination Address</p>
                    <p className="text-sm font-semibold text-white mt-0.5">{ride.dropoffAddress || 'Dropoff Point'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                    <div>
                      <span className="text-gray-400">Total Distance:</span>
                      <p className="font-bold text-white">{ride.distance || '—'} km</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Est. Duration:</span>
                      <p className="font-bold text-white">~{ride.duration || '—'} mins</p>
                    </div>
                  </div>
                </div>

                {/* Driver Finish Ride Button */}
                {isDriver && (
                  <button
                    onClick={handleCompleteRide}
                    disabled={actionLoading}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-extrabold text-sm rounded-2xl shadow-[0_4px_20px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading ? 'Completing...' : '🏁 Complete Ride & Collect Fare'}
                  </button>
                )}
              </div>
            )}

            {/* ── STAGE 4: COMPLETED ── */}
            {ride.status === 'COMPLETED' && (
              <div className="bg-white/5 backdrop-blur-md border border-emerald-500/30 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6 text-center">

                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 text-3xl mx-auto flex items-center justify-center shadow-lg border border-emerald-500/30">
                  🎉
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-white">Trip Completed!</h3>
                  <p className="text-xs text-gray-400">Thank you for riding with RideFlow</p>
                </div>

                {/* Final Fare & Live Payment Status */}
                <div className="p-5 rounded-2xl bg-gray-950/80 border border-emerald-500/30 space-y-2">
                  <span className="text-xs text-gray-400 uppercase font-semibold">Total Fare</span>
                  <div className="text-4xl font-extrabold text-emerald-400">
                    ₹{ride.actualFare || ride.estimatedFare}
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 pt-2 border-t border-white/10">
                    <span>Payment Status:</span>
                    <span className={`font-bold ${
                      ride.paymentStatus === 'PAID'
                        ? 'text-emerald-400'
                        : ride.paymentStatus === 'CASH_PENDING'
                        ? 'text-amber-400'
                        : 'text-amber-400'
                    }`}>
                      {ride.paymentStatus === 'PAID'
                        ? '✅ PAID & SETTLED'
                        : ride.paymentStatus === 'CASH_PENDING'
                        ? '⏳ CASH PENDING DRIVER CONFIRMATION'
                        : '⏳ UNPAID / DUE'}
                    </span>
                  </div>
                </div>

                {/* DRIVER: Cash Confirmation Card (Before driver clicks yes passenger gave cash, do not show success) */}
                {isDriver && ride.paymentStatus !== 'PAID' && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-amber-400">💵 Cash Payment Collection</span>
                      <span className="text-xs font-extrabold text-white">Collect: ₹{ride.actualFare || ride.estimatedFare}</span>
                    </div>
                    <p className="text-xs text-gray-300">
                      {ride.paymentStatus === 'CASH_PENDING'
                        ? '⚠️ Passenger has marked Cash Payment. Please collect cash in hand and click below to confirm:'
                        : `Collect ₹${ride.actualFare || ride.estimatedFare} in cash from passenger, or wait for online payment.`}
                    </p>
                    <button
                      onClick={handleConfirmCashPayment}
                      disabled={actionLoading}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading ? 'Confirming Cash...' : `✅ Yes, Passenger Gave Cash (₹${ride.actualFare || ride.estimatedFare})`}
                    </button>
                  </div>
                )}

                {/* RIDER: Cash Pending Notification */}
                {!isDriver && ride.paymentStatus === 'CASH_PENDING' && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-300">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                      <span>Awaiting Driver Cash Confirmation</span>
                    </div>
                    <p className="text-xs text-gray-300">
                      You marked cash payment of <span className="font-bold text-white">₹{ride.actualFare || ride.estimatedFare}</span>. Please hand physical cash to your driver. As soon as your driver clicks &apos;Yes, Passenger Gave Cash&apos;, this trip will show settled!
                    </p>
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="text-[11px] text-orange-400 hover:underline pt-1 cursor-pointer font-semibold"
                    >
                      Want to pay via UPI or Razorpay instead? Click here
                    </button>
                  </div>
                )}

                {/* RIDER: Unpaid (Not Cash Pending) -> Show Pay Now Button */}
                {!isDriver && ride.paymentStatus !== 'PAID' && ride.paymentStatus !== 'CASH_PENDING' && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm rounded-2xl shadow-[0_4px_20px_rgba(249,115,22,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    💳 Pay ₹{ride.actualFare || ride.estimatedFare} (Cash / UPI / Razorpay)
                  </button>
                )}

                {/* Navigation Button */}
                <Link
                  href={isDriver ? '/driver/dashboard' : '/book-ride'}
                  className="w-full block py-3.5 bg-white/10 hover:bg-white/15 text-white font-bold text-sm rounded-xl transition-all"
                >
                  {isDriver ? 'Return to Driver Dashboard 🚕' : 'Book Another Ride 🚀'}
                </Link>

              </div>
            )}

            {/* ── STAGE 5: CANCELED ── */}
            {ride.status === 'CANCELED' && (
              <div className="bg-white/5 backdrop-blur-md border border-red-500/30 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 text-3xl mx-auto flex items-center justify-center border border-red-500/30">
                  ✕
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-white">Ride Canceled</h3>
                  <p className="text-xs text-gray-400">
                    Reason: <span className="text-red-400">{ride.cancelReason || 'Canceled by user'}</span>
                  </p>
                </div>

                <Link
                  href={isDriver ? '/driver/dashboard' : '/book-ride'}
                  className="w-full block py-3.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold text-sm rounded-xl shadow-lg transition-all"
                >
                  {isDriver ? 'Return to Driver Dashboard 🚕' : 'Book Another Ride 🚀'}
                </Link>
              </div>
            )}

            {/* ── Route Summary Card ── */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-5 shadow-xl space-y-3">
              <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Route Details</h4>

              <div className="space-y-3 relative pl-6 border-l-2 border-dashed border-orange-500/40 my-1 text-xs">
                <div>
                  <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[9px] font-bold text-white">
                    P
                  </span>
                  <p className="text-gray-400 font-semibold uppercase text-[10px]">Pickup</p>
                  <p className="font-medium text-white line-clamp-2">{ride.pickupAddress || 'Pickup Point'}</p>
                </div>

                <div>
                  <span className="absolute -left-[9px] bottom-0 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white">
                    D
                  </span>
                  <p className="text-gray-400 font-semibold uppercase text-[10px]">Dropoff</p>
                  <p className="font-medium text-white line-clamp-2">{ride.dropoffAddress || 'Dropoff Point'}</p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* ── Realtime In-Ride Chat Drawer / Floating Modal ── */}
        {showChat && (
          <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] bg-gray-900/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden z-50 flex flex-col">

            {/* Chat Header */}
            <div className="p-4 bg-white/10 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">💬</span>
                <div>
                  <h4 className="text-xs font-bold text-white">In-Ride Live Chat</h4>
                  <p className="text-[10px] text-gray-400">Connect with {isDriver ? 'passenger' : 'driver'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="text-gray-400 hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Chat Body */}
            <div className="p-4 h-64 overflow-y-auto space-y-2.5 text-xs">
              {chatMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 text-[11px] text-center">
                  No messages yet. Send a message to coordinate pickup!
                </div>
              ) : (
                chatMessages.map((msg, index) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] text-gray-400 mb-0.5">{msg.senderName} ({msg.senderRole})</span>
                      <div className={`px-3.5 py-2 rounded-2xl max-w-[80%] ${isMe
                          ? 'bg-orange-500 text-white rounded-br-none'
                          : 'bg-white/10 text-gray-200 rounded-bl-none'
                        }`}>
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white/5 border-t border-white/10 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a quick message..."
                className="flex-1 bg-gray-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Send
              </button>
            </form>

          </div>
        )}

        {/* ── WebRTC In-Ride Audio Call Modal ── */}
        <InRideCallModal
          socket={socket}
          rideId={rideId}
          currentUserId={user?.id}
          currentUserName={user?.name}
          currentUserRole={user?.role}
          otherUserId={isDriver ? (ride?.riderId || ride?.rider?.id) : (ride?.driverId || ride?.driver?.id)}
          otherUserName={isDriver ? (ride?.rider?.name || 'Passenger') : (ride?.driver?.name || 'Driver Partner')}
          otherUserRole={isDriver ? 'RIDER' : 'DRIVER'}
          isOpen={showCallModal}
          onClose={() => setShowCallModal(false)}
          isInitiator={showCallModal}
        />

        {/* ── Payment Modal (Cash / UPI / Razorpay) ── */}
        <PaymentModal
          ride={ride}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={() => fetchRideDetails(false)}
          socket={socket}
        />

      </div>
    </div>
  );
}
