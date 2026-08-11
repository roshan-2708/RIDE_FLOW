'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import toast from 'react-hot-toast';
import Link from 'next/link';

// Dynamically import Leaflet Map with SSR disabled
const AdminCityRadarMap = dynamic(
  () => import('@/components/AdminCityRadarMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[620px] rounded-3xl bg-gray-900/80 border border-white/10 flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        <p className="text-sm text-gray-400 font-semibold tracking-wide">
          Initializing Satellite City Radar & Leaflet Engine...
        </p>
      </div>
    ),
  }
);

const vehicleIcons = {
  AUTO: '🛺',
  BIKE: '🏍️',
  SEDAN: '🚗',
  SUV: '🚘',
  LUXURY: '💎',
};

// City center anchor (Mumbai)
const CITY_ANCHOR = { lat: 19.0760, lng: 72.8777 };

export default function AdminMapPage() {
  const { socket } = useSocket();

  const [drivers, setDrivers] = useState([]);
  const [activeRides, setActiveRides] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ONLINE, ON_RIDE, OFFLINE
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('drivers'); // 'drivers' | 'rides'
  const [selectedEntity, setSelectedEntity] = useState(null);

  // Fetch Drivers, Active Rides, and Platform Stats
  const fetchRadarData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [driversRes, ridesRes, statsRes] = await Promise.all([
        api.get('/admin/drivers').catch(() => ({ data: { data: [] } })),
        api.get('/admin/rides?limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/admin/stats').catch(() => ({ data: { stats: null } })),
      ]);

      const rawDrivers = driversRes.data?.data || driversRes.data?.drivers || [];
      const rawRides = ridesRes.data?.data || [];

      // Process drivers and assign deterministic location offset if lat/lng is missing
      const processedDrivers = rawDrivers.map((d, index) => {
        let lat = d.currentLat;
        let lng = d.currentLng;
        // If driver is approved and online but has no coordinates, assign sample city coordinates
        if ((typeof lat !== 'number' || typeof lng !== 'number') && (d.availability === 'ONLINE' || d.availability === 'ON_RIDE')) {
          const angle = (index * 45) * (Math.PI / 180);
          const radius = 0.015 + (index % 5) * 0.008;
          lat = CITY_ANCHOR.lat + Math.cos(angle) * radius;
          lng = CITY_ANCHOR.lng + Math.sin(angle) * radius;
        }
        return {
          ...d,
          currentLat: lat,
          currentLng: lng,
        };
      });

      // Filter only active / in-progress rides
      const filteredRides = rawRides.filter((r) =>
        ['REQUESTED', 'ACCEPTED', 'ARRIVING', 'STARTED', 'IN_PROGRESS'].includes(r.status)
      ).map((r, index) => {
        let pLat = r.pickupLat;
        let pLng = r.pickupLng;
        let dLat = r.dropoffLat;
        let dLng = r.dropoffLng;
        if (typeof pLat !== 'number' || typeof pLng !== 'number') {
          pLat = CITY_ANCHOR.lat + (index * 0.006);
          pLng = CITY_ANCHOR.lng + (index * 0.006);
        }
        if (typeof dLat !== 'number' || typeof dLng !== 'number') {
          dLat = pLat + 0.02;
          dLng = pLng + 0.018;
        }
        return {
          ...r,
          pickupLat: pLat,
          pickupLng: pLng,
          dropoffLat: dLat,
          dropoffLng: dLng,
        };
      });

      setDrivers(processedDrivers);
      setActiveRides(filteredRides);
      if (statsRes.data?.stats) {
        setStats(statsRes.data.stats);
      }
      setLastUpdated(new Date());

      if (isManual) {
        toast.success('Live radar data synced!');
      }
    } catch (err) {
      console.error('Failed to load radar data:', err);
      toast.error('Error fetching live radar data');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  // Initial Load & Polling Interval (every 10s)
  useEffect(() => {
    fetchRadarData();
    const interval = setInterval(() => {
      fetchRadarData();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchRadarData]);

  // Real-Time Socket Listeners for Driver GPS Updates & Ride Status Changes
  useEffect(() => {
    if (!socket) return;

    const handleDriverLocation = (data) => {
      const { driverId, lat, lng } = data;
      if (!driverId || typeof lat !== 'number' || typeof lng !== 'number') return;

      setDrivers((prevDrivers) =>
        prevDrivers.map((d) => {
          if (d.id === driverId || d.userId === driverId) {
            return { ...d, currentLat: lat, currentLng: lng, lastSeen: new Date() };
          }
          return d;
        })
      );
    };

    const handleRideEvent = () => {
      // Re-fetch radar data immediately on ride status transitions
      fetchRadarData();
    };

    socket.on('driver:location:update', handleDriverLocation);
    socket.on('ride:driver-accepted', handleRideEvent);
    socket.on('ride:driver-started', handleRideEvent);
    socket.on('ride:driver-completed', handleRideEvent);
    socket.on('ride:created', handleRideEvent);

    return () => {
      socket.off('driver:location:update', handleDriverLocation);
      socket.off('ride:driver-accepted', handleRideEvent);
      socket.off('ride:driver-started', handleRideEvent);
      socket.off('ride:driver-completed', handleRideEvent);
      socket.off('ride:created', handleRideEvent);
    };
  }, [socket, fetchRadarData]);

  // Filtered Driver List
  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const name = d.user?.name || '';
      const email = d.user?.email || '';
      const plate = d.vehiclePlate || '';
      const query = searchTerm.toLowerCase();

      const matchesSearch =
        name.toLowerCase().includes(query) ||
        email.toLowerCase().includes(query) ||
        plate.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ONLINE' && d.availability === 'ONLINE') ||
        (statusFilter === 'ON_RIDE' && d.availability === 'ON_RIDE') ||
        (statusFilter === 'OFFLINE' && (d.availability === 'OFFLINE' || !d.availability));

      const matchesVehicle =
        vehicleFilter === 'ALL' || d.vehicleType === vehicleFilter;

      return matchesSearch && matchesStatus && matchesVehicle;
    });
  }, [drivers, searchTerm, statusFilter, vehicleFilter]);

  // Filtered Active Rides
  const filteredRides = useMemo(() => {
    return activeRides.filter((r) => {
      const riderName = r.rider?.name || '';
      const pickup = r.pickupAddress || '';
      const dropoff = r.dropoffAddress || '';
      const query = searchTerm.toLowerCase();

      const matchesSearch =
        riderName.toLowerCase().includes(query) ||
        pickup.toLowerCase().includes(query) ||
        dropoff.toLowerCase().includes(query);

      const matchesVehicle =
        vehicleFilter === 'ALL' || r.vehicleType === vehicleFilter;

      return matchesSearch && matchesVehicle;
    });
  }, [activeRides, searchTerm, vehicleFilter]);

  const onlineDriversCount = drivers.filter(d => d.availability === 'ONLINE').length;
  const onRideDriversCount = drivers.filter(d => d.availability === 'ON_RIDE').length;

  return (
    <div className="space-y-6 text-gray-100 font-[Poppins,sans-serif] pb-10">
      
      {/* ── Top Header & Stats Strip ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-gray-900 via-slate-900 to-indigo-950 p-6 rounded-3xl border border-white/10 shadow-2xl">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>🛰️ God&apos;s Eye City Radar</span>
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE TELEMETRY
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Real-time geospatial tracking of drivers, active passenger rides, and fleet distribution.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start lg:self-center">
          {lastUpdated && (
            <span className="text-xs text-gray-400 hidden sm:inline-block">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => fetchRadarData(true)}
            disabled={refreshing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? 'Syncing...' : 'Sync Radar'}
          </button>
        </div>
      </div>

      {/* ── Key Metrics Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Online Drivers */}
        <div className="bg-gray-900/60 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Online Drivers</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">{onlineDriversCount}</p>
            <span className="text-[11px] text-gray-400">Ready for dispatch</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-2xl">
            🟢
          </div>
        </div>

        {/* Card 2: In-Transit Rides */}
        <div className="bg-gray-900/60 backdrop-blur-md border border-amber-500/30 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Active In-Transit</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">{activeRides.length}</p>
            <span className="text-[11px] text-gray-400">{onRideDriversCount} Drivers on ride</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl">
            📍
          </div>
        </div>

        {/* Card 3: Total Approved Fleet */}
        <div className="bg-gray-900/60 backdrop-blur-md border border-indigo-500/30 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Total Fleet</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">{drivers.length}</p>
            <span className="text-[11px] text-gray-400">Registered drivers</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-2xl">
            🚗
          </div>
        </div>

        {/* Card 4: Platform Ride Volume */}
        <div className="bg-gray-900/60 backdrop-blur-md border border-purple-500/30 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Completed Trips</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {stats?.completedRides ?? stats?.totalRide ?? 0}
            </p>
            <span className="text-[11px] text-gray-400">Platform total</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center text-2xl">
            🏁
          </div>
        </div>

      </div>

      {/* ── Filters & Search Toolbar ── */}
      <div className="bg-gray-900/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search driver name, plate, phone, passenger..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-950/80 border border-white/15 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          
          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-950/80 border border-white/15 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Availability</option>
            <option value="ONLINE">🟢 Online Drivers</option>
            <option value="ON_RIDE">🟡 On Ride</option>
            <option value="OFFLINE">⚪ Offline</option>
          </select>

          {/* Vehicle Type Dropdown */}
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="bg-gray-950/80 border border-white/15 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Vehicles</option>
            <option value="SEDAN">🚗 Sedan</option>
            <option value="SUV">🚘 SUV</option>
            <option value="AUTO">🛺 Auto</option>
            <option value="BIKE">🏍️ Bike</option>
            <option value="LUXURY">💎 Luxury</option>
          </select>

          {(statusFilter !== 'ALL' || vehicleFilter !== 'ALL' || searchTerm) && (
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setVehicleFilter('ALL');
                setSearchTerm('');
              }}
              className="px-3 py-2 bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 rounded-xl font-bold transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}

        </div>
      </div>

      {/* ── Main Radar Layout: Map (Left) & Fleet Drawer (Right) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left 8 Cols: Map Window */}
        <div className="xl:col-span-8 h-[640px] relative">
          <AdminCityRadarMap
            drivers={filteredDrivers}
            activeRides={filteredRides}
            selectedEntity={selectedEntity}
            onSelectEntity={(entity) => setSelectedEntity(entity)}
          />
        </div>

        {/* Right 4 Cols: Fleet & Trips Drawer */}
        <div className="xl:col-span-4 bg-gray-900/80 backdrop-blur-md border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col h-[640px]">
          
          {/* Tab Selector */}
          <div className="flex items-center p-1 bg-gray-950/80 rounded-2xl border border-white/10 mb-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab('drivers')}
              className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'drivers'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>🚗 Drivers</span>
              <span className="px-1.5 py-0.5 rounded-md bg-white/15 text-[10px]">
                {filteredDrivers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('rides')}
              className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'rides'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>📍 Live Trips</span>
              <span className="px-1.5 py-0.5 rounded-md bg-white/15 text-[10px]">
                {filteredRides.length}
              </span>
            </button>
          </div>

          {/* List Scroll Container */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            
            {/* Drivers Tab */}
            {activeTab === 'drivers' && (
              <>
                {filteredDrivers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-xs">
                    <p className="text-3xl mb-2">🚗</p>
                    <p className="font-semibold text-gray-400">No matching drivers found</p>
                    <p className="text-[11px] mt-1">Try clearing your filters</p>
                  </div>
                ) : (
                  filteredDrivers.map((driver) => {
                    const isSelected = selectedEntity?.type === 'driver' && selectedEntity.data?.id === driver.id;
                    const hasGPS = typeof driver.currentLat === 'number' && typeof driver.currentLng === 'number';

                    return (
                      <div
                        key={driver.id}
                        onClick={() => setSelectedEntity({ type: 'driver', data: driver })}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-950/60 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                            : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-gray-800 border border-white/10 flex items-center justify-center text-xl">
                              {vehicleIcons[driver.vehicleType] || '🚗'}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white flex items-center gap-1.5">
                                {driver.user?.name || 'Driver'}
                                <span className="text-xs text-amber-400 font-normal">
                                  ⭐ {driver.rating?.toFixed(1) || '5.0'}
                                </span>
                              </p>
                              <p className="text-xs text-gray-400">
                                {driver.vehicleType} • <span className="font-mono text-gray-300">{driver.vehiclePlate || 'N/A'}</span>
                              </p>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            driver.availability === 'ONLINE'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : driver.availability === 'ON_RIDE'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}>
                            {driver.availability || 'OFFLINE'}
                          </span>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                          <span>
                            {hasGPS ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                {driver.currentLat.toFixed(3)}, {driver.currentLng.toFixed(3)}
                              </span>
                            ) : (
                              <span className="text-gray-500">No GPS Signal</span>
                            )}
                          </span>

                          <div className="flex items-center gap-2">
                            {hasGPS && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEntity({ type: 'driver', data: driver });
                                }}
                                className="text-indigo-400 hover:text-indigo-300 font-bold"
                              >
                                Locate 🎯
                              </button>
                            )}
                            <Link
                              href={`/admin/drivers/${driver.userId || driver.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-400 hover:text-white"
                            >
                              Docs →
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {/* Rides Tab */}
            {activeTab === 'rides' && (
              <>
                {filteredRides.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-xs">
                    <p className="text-3xl mb-2">📍</p>
                    <p className="font-semibold text-gray-400">No active trips in progress</p>
                    <p className="text-[11px] mt-1">Pending or ongoing passenger rides will appear here</p>
                  </div>
                ) : (
                  filteredRides.map((ride) => {
                    const isSelected = selectedEntity?.type === 'ride' && selectedEntity.data?.id === ride.id;

                    return (
                      <div
                        key={ride.id}
                        onClick={() => setSelectedEntity({ type: 'ride', data: ride })}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-950/60 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                            : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-white">
                              {ride.rider?.name || 'Passenger'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {vehicleIcons[ride.vehicleType] || '🚗'} {ride.vehicleType} • <span className="text-emerald-400 font-bold">₹{ride.estimatedFare}</span>
                            </p>
                          </div>

                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                            {ride.status}
                          </span>
                        </div>

                        <div className="mt-2.5 space-y-1 text-xs">
                          <p className="text-gray-300 truncate">
                            <span className="text-emerald-400 font-semibold">From:</span> {ride.pickupAddress || 'Pickup Point'}
                          </p>
                          <p className="text-gray-400 truncate">
                            <span className="text-red-400 font-semibold">To:</span> {ride.dropoffAddress || 'Dropoff Point'}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                          <span>
                            {ride.distance ? `${ride.distance} km` : 'Active'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEntity({ type: 'ride', data: ride });
                            }}
                            className="text-indigo-400 hover:text-indigo-300 font-bold"
                          >
                            Track Route 🛰️
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
