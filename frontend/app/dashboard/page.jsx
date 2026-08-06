'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const vehicleIcons = {
  BIKE: '🏍️',
  AUTO: '🛺',
  SEDAN: '🚗',
  SUV: '🚘',
  LUXURY: '💎',
};

const DashboardPage = () => {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [earning, setEarning] = useState({
    totalEarnings: 0,
    totalRides: 0,
    recentRides: [],
  });
  const [availableRides, setAvailableRides] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);

  // Auth redirection safety check
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login');
      } else if (user.role !== 'DRIVER') {
        toast.error('Dashboard is reserved for driver accounts.');
        router.push('/');
      }
    }
  }, [loading, user, router]);

  const fetchEarnings = useCallback(async () => {
    try {
      const res = await api.get('/driver/earnings');
      if (res.data) {
        setEarning({
          totalEarnings: res.data.totalEarnings || 0,
          totalRides: res.data.totalRides || 0,
          recentRides: res.data.recentRides || [],
        });
      }
    } catch (error) {
      console.error('Failed to load earnings:', error);
      toast.error('Failed to load earnings data');
    }
  }, []);

  const fetchAvailableRides = useCallback(async () => {
    try {
      const res = await api.get('/rides/available');
      setAvailableRides(res.data.rides || []);
    } catch (error) {
      console.error('Failed to fetch available rides:', error);
    }
  }, []);

  const loadAllData = useCallback(async (showToast = false) => {
    if (showToast) setIsRefreshing(true);
    await Promise.all([fetchEarnings(), fetchAvailableRides()]);
    setIsFetching(false);
    if (showToast) {
      setIsRefreshing(false);
      toast.success('Dashboard refreshed!');
    }
  }, [fetchEarnings, fetchAvailableRides]);

  useEffect(() => {
    if (user?.role === 'DRIVER') {
      const fetchData = async () => {
        await loadAllData();
      };
      fetchData();
      // Poll available rides every 15 seconds
      const interval = setInterval(() => {
        fetchAvailableRides();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [user, loadAllData, fetchAvailableRides]);

  const handleAcceptRide = async (rideId) => {
    setAcceptingId(rideId);
    try {
      await api.put(`/driver/accept/${rideId}`);
      toast.success('✅ Ride accepted successfully!');
      router.push(`/ride/${rideId}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to accept ride';
      toast.error(msg);
      fetchAvailableRides(); // Refresh list to remove stale ride
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading || (!user && isFetching)) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-14 h-14 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin" />
        <p className="text-sm font-semibold tracking-wide text-gray-400">Loading Driver Dashboard...</p>
      </div>
    );
  }

  if (!user || user.role !== 'DRIVER') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-white font-[Poppins,sans-serif] px-4 sm:px-6 lg:px-8 py-10 relative overflow-hidden">
      
      {/* Background Glow Blobs */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-orange-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] rounded-full bg-orange-600/10 blur-[100px] pointer-events-none" />
      
      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        
        {/* ── Top Header Bar ── */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-orange-500/30">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Welcome back, {user.name?.split(' ')[0]} 👋
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
                <span className="px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-semibold">
                  🚕 Driver Partner
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                {user.email} • Manage your earnings and real-time ride requests
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <button
              onClick={() => loadAllData(true)}
              disabled={isRefreshing}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-sm font-semibold text-white transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
            >
              <svg
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            <button
              onClick={logout}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-sm font-semibold text-red-400 transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Card 1: Total Earnings */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl hover:border-emerald-500/40 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Earnings</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                💰
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-white tracking-tight">
                ₹{earning.totalEarnings?.toLocaleString('en-IN') || '0'}
              </div>
              <p className="text-xs text-emerald-400 mt-1 font-medium flex items-center gap-1">
                <span>↗ Net Driver Payout</span>
              </p>
            </div>
          </div>

          {/* Card 2: Total Rides */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl hover:border-orange-500/40 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Completed Rides</span>
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                🏁
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-white tracking-tight">
                {earning.totalRides || 0}
              </div>
              <p className="text-xs text-orange-400 mt-1 font-medium">
                Successful trips fulfilled
              </p>
            </div>
          </div>

          {/* Card 3: Available Requests */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl hover:border-sky-500/40 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Available Requests</span>
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                ⚡
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-white tracking-tight">
                {availableRides.length}
              </div>
              <p className="text-xs text-sky-400 mt-1 font-medium">
                Pings waiting for acceptance
              </p>
            </div>
          </div>

          {/* Card 4: Rating */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl hover:border-amber-500/40 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Driver Score</span>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                ⭐
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-1">
                4.9 <span className="text-sm font-normal text-gray-400">/ 5.0</span>
              </div>
              <p className="text-xs text-amber-400 mt-1 font-medium">
                Top Rated Driver Partner
              </p>
            </div>
          </div>

        </div>

        {/* ── Available Ride Requests Section ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight">Available Ride Requests</h2>
              {availableRides.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500 text-white text-xs font-bold animate-pulse">
                  {availableRides.length} LIVE
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400 hidden sm:inline-block">Auto-updates every 15s</span>
          </div>

          {availableRides.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-10 text-center space-y-4 shadow-xl">
              <div className="text-5xl">📡</div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">No Pending Ride Requests</h3>
                <p className="text-sm text-gray-400 max-w-md mx-auto">
                  You are currently online. When passengers nearby request a ride, they will appear here instantly.
                </p>
              </div>
              <button
                onClick={() => fetchAvailableRides()}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl shadow-lg transition-all duration-200"
              >
                Check for Requests Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableRides.map((ride) => (
                <div
                  key={ride.id}
                  className="bg-white/5 backdrop-blur-md border border-white/10 hover:border-orange-500/50 rounded-3xl p-6 shadow-xl space-y-5 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    
                    {/* Header: Rider & Vehicle Badge */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white font-bold flex items-center justify-center">
                          {ride.rider?.name?.charAt(0).toUpperCase() || 'R'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{ride.rider?.name || 'Passenger'}</p>
                          <p className="text-xs text-gray-400">{ride.rider?.phone || 'Verified Rider'}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400">
                          {vehicleIcons[ride.vehicleType] || '🚗'} {ride.vehicleType}
                        </span>
                      </div>
                    </div>

                    {/* Route Details */}
                    <div className="space-y-3 relative pl-6 border-l-2 border-dashed border-orange-500/40 my-2">
                      <div>
                        <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                          P
                        </span>
                        <p className="text-xs text-gray-400 font-semibold uppercase">Pickup</p>
                        <p className="text-sm font-medium text-white line-clamp-2">
                          {ride.pickupAddress || `${ride.pickupLat?.toFixed(4)}, ${ride.pickupLng?.toFixed(4)}`}
                        </p>
                      </div>

                      <div>
                        <span className="absolute -left-[9px] bottom-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                          D
                        </span>
                        <p className="text-xs text-gray-400 font-semibold uppercase">Dropoff</p>
                        <p className="text-sm font-medium text-white line-clamp-2">
                          {ride.dropoffAddress || `${ride.dropoffLat?.toFixed(4)}, ${ride.dropoffLng?.toFixed(4)}`}
                        </p>
                      </div>
                    </div>

                    {/* Distance & Duration */}
                    <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl text-xs text-gray-300 border border-white/5">
                      <span>📍 Distance: <strong className="text-white">{ride.distance ? `${ride.distance} km` : 'N/A'}</strong></span>
                      <span>⏱️ Est. Time: <strong className="text-white">{ride.duration ? `~${ride.duration} min` : 'N/A'}</strong></span>
                    </div>

                  </div>

                  {/* Fare & Accept Button */}
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4 mt-auto">
                    <div>
                      <span className="text-xs text-gray-400 font-medium block">Est. Earnings</span>
                      <span className="text-2xl font-extrabold text-emerald-400">
                        ₹{ride.estimatedFare}
                      </span>
                    </div>

                    <button
                      onClick={() => handleAcceptRide(ride.id)}
                      disabled={acceptingId === ride.id}
                      className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-[0_4px_16px_rgba(255,90,0,0.4)] hover:shadow-[0_6px_22px_rgba(255,90,0,0.5)] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {acceptingId === ride.id ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Accepting...
                        </>
                      ) : (
                        'Accept Ride →'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Recent Rides History Section ── */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Recent Completed Rides</h2>

          {earning.recentRides.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center text-sm text-gray-400">
              No completed rides recorded yet. Accept ride requests to build your earnings history!
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-xs text-gray-400 uppercase tracking-wider">
                      <th className="py-4 px-6">Ride ID</th>
                      <th className="py-4 px-6">Vehicle</th>
                      <th className="py-4 px-6">Pickup ➔ Dropoff</th>
                      <th className="py-4 px-6">Date</th>
                      <th className="py-4 px-6 text-right">Fare Earned</th>
                      <th className="py-4 px-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {earning.recentRides.map((ride) => (
                      <tr key={ride.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6 font-mono text-xs text-gray-400">
                          #{ride.id.substring(0, 8)}
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1 font-medium text-gray-200">
                            {vehicleIcons[ride.vehicleType]} {ride.vehicleType}
                          </span>
                        </td>
                        <td className="py-4 px-6 max-w-xs">
                          <div className="truncate text-xs text-gray-300">
                            <span className="text-emerald-400 font-semibold">From:</span> {ride.pickupAddress || 'Pickup Point'}
                          </div>
                          <div className="truncate text-xs text-gray-400">
                            <span className="text-red-400 font-semibold">To:</span> {ride.dropoffAddress || 'Dropoff Point'}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-xs text-gray-400 whitespace-nowrap">
                          {ride.completedAt ? new Date(ride.completedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          }) : 'Recent'}
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-emerald-400">
                          ₹{ride.actualFare || ride.estimatedFare}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            COMPLETED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;