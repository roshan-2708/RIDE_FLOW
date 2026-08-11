'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const VEHICLE_META = {
  BIKE: {
    name: 'Bike / Two-Wheeler',
    icon: '🏍️',
    description: 'Fastest single passenger city travel',
    defaultCommission: 15,
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  AUTO: {
    name: 'Auto Rickshaw',
    icon: '🛺',
    description: 'Affordable 3-seater short trips',
    defaultCommission: 18,
    badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  SEDAN: {
    name: 'Comfort Sedan',
    icon: '🚗',
    description: 'Everyday air-conditioned 4-seater',
    defaultCommission: 20,
    badgeColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  },
  SUV: {
    name: 'Spacious SUV',
    icon: '🚘',
    description: 'Extra luggage & 6-seater capacity',
    defaultCommission: 22,
    badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  },
  LUXURY: {
    name: 'Executive Luxury',
    icon: '💎',
    description: 'Premium business class fleet',
    defaultCommission: 25,
    badgeColor: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  },
};

const DEFAULT_RATES = {
  BIKE: { baseFare: 20, perKm: 8, perMin: 1, minFare: 30 },
  AUTO: { baseFare: 30, perKm: 12, perMin: 1.5, minFare: 50 },
  SEDAN: { baseFare: 50, perKm: 15, perMin: 2, minFare: 80 },
  SUV: { baseFare: 70, perKm: 20, perMin: 2.5, minFare: 120 },
  LUXURY: { baseFare: 100, perKm: 30, perMin: 4, minFare: 200 },
};

const SURGE_PRESETS = [
  { label: 'Normal Traffic (1.0x)', factor: 1.0, icon: '🟢' },
  { label: 'Morning Rush (1.3x)', factor: 1.3, icon: '🌅' },
  { label: 'Evening Peak (1.6x)', factor: 1.6, icon: '🌇' },
  { label: 'Heavy Rain / Monsoon (1.8x)', factor: 1.8, icon: '🌧️' },
  { label: 'Late Night (1.4x)', factor: 1.4, icon: '🌙' },
  { label: 'Festival / New Year (2.2x)', factor: 2.2, icon: '🎉' },
];

export default function AdminFaresPage() {
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('SEDAN');

  // Simulator Inputs
  const [simDistance, setSimDistance] = useState(8.5); // km
  const [simDuration, setSimDuration] = useState(24); // minutes
  const [simSurge, setSimSurge] = useState(1.0); // factor

  // Fetch Current Fares from Backend
  useEffect(() => {
    fetchFares();
  }, []);

  const fetchFares = async () => {
    try {
      const res = await api.get('/admin/fares');
      if (res.data?.data) {
        setRates(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch fare rates, using defaults:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Input Changes
  const handleRateChange = (vType, field, value) => {
    const numValue = Math.max(0, parseFloat(value) || 0);
    setRates((prev) => ({
      ...prev,
      [vType]: {
        ...prev[vType],
        [field]: numValue,
      },
    }));
  };

  // Save Fares to Backend
  const handleSaveRates = async () => {
    setSaving(true);
    try {
      await api.put('/admin/fares', { rates });
      toast.success('Fare configuration saved successfully!');
    } catch (err) {
      console.error('Error saving fare rates:', err);
      toast.error(err.response?.data?.message || 'Failed to save fare rates');
    } finally {
      setSaving(false);
    }
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    if (confirm('Reset all vehicle fare rates to system defaults?')) {
      setRates(DEFAULT_RATES);
      toast.success('Reset to defaults. Remember to click Save!');
    }
  };

  // Live Simulated Estimates for All Vehicle Types
  const simulatedEstimates = useMemo(() => {
    const result = {};
    Object.keys(rates).forEach((vType) => {
      const cfg = rates[vType] || DEFAULT_RATES[vType];
      const distFare = simDistance * cfg.perKm;
      const timeFare = simDuration * cfg.perMin;
      const rawTotal = cfg.baseFare + distFare + timeFare;
      const finalFare = Math.max(rawTotal * simSurge, cfg.minFare);
      const commissionRate = (VEHICLE_META[vType]?.defaultCommission || 20) / 100;
      const platformFee = Math.round(finalFare * commissionRate);
      const driverNet = Math.round(finalFare - platformFee);

      result[vType] = {
        baseFare: cfg.baseFare,
        distanceFare: Math.round(distFare),
        timeFare: Math.round(timeFare),
        rawTotal: Math.round(rawTotal),
        finalFare: Math.round(finalFare),
        platformFee,
        driverNet,
      };
    });
    return result;
  }, [rates, simDistance, simDuration, simSurge]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        <p className="text-sm font-semibold text-gray-400">Loading Fare Configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-gray-100 font-[Poppins,sans-serif] pb-12">
      
      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-gray-900 via-slate-900 to-indigo-950 p-6 rounded-3xl border border-white/10 shadow-2xl">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>💰 Fare Rates & Dynamic Pricing</span>
            </h1>
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              INR (₹) PRICING ENGINE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Configure vehicle category base fares, per-kilometer & per-minute rates, minimum fares, and simulate surge pricing in real time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDefaults}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/15 text-gray-300 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Reset Defaults
          </button>
          <button
            onClick={handleSaveRates}
            disabled={saving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Saving Rates...
              </>
            ) : (
              '💾 Save All Changes'
            )}
          </button>
        </div>
      </div>

      {/* ── Vehicle Tier Rate Cards Grid ── */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <span>🚗 Vehicle Category Base Rates</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {Object.entries(rates).map(([vType, rate]) => {
            const meta = VEHICLE_META[vType] || { name: vType, icon: '🚗', description: '' };
            const isSelected = selectedVehicle === vType;

            return (
              <div
                key={vType}
                onClick={() => setSelectedVehicle(vType)}
                className={`bg-gray-900/80 backdrop-blur-md rounded-3xl p-5 border transition-all cursor-pointer shadow-xl flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/30'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{meta.icon}</span>
                      <div>
                        <h3 className="text-sm font-bold text-white">{vType}</h3>
                        <p className="text-[10px] text-gray-400 truncate max-w-[120px]">{meta.name}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                      {meta.defaultCommission}% cut
                    </span>
                  </div>

                  {/* Input Fields */}
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[11px] text-gray-400 font-medium block mb-1">
                        Base Fare (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={rate.baseFare}
                        onChange={(e) => handleRateChange(vType, 'baseFare', e.target.value)}
                        className="w-full bg-gray-950/90 border border-white/15 rounded-xl px-3 py-1.5 text-white font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-gray-400 font-medium block mb-1">
                        Per Km Rate (₹/km)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={rate.perKm}
                        onChange={(e) => handleRateChange(vType, 'perKm', e.target.value)}
                        className="w-full bg-gray-950/90 border border-white/15 rounded-xl px-3 py-1.5 text-white font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-gray-400 font-medium block mb-1">
                        Per Minute Rate (₹/min)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={rate.perMin}
                        onChange={(e) => handleRateChange(vType, 'perMin', e.target.value)}
                        className="w-full bg-gray-950/90 border border-white/15 rounded-xl px-3 py-1.5 text-white font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-gray-400 font-medium block mb-1">
                        Minimum Fare (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={rate.minFare}
                        onChange={(e) => handleRateChange(vType, 'minFare', e.target.value)}
                        className="w-full bg-gray-950/90 border border-white/15 rounded-xl px-3 py-1.5 text-white font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Formula Preview */}
                <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-gray-400 flex items-center justify-between">
                  <span>10km trip est:</span>
                  <span className="font-bold text-emerald-400">
                    ₹{Math.round(rate.baseFare + 10 * rate.perKm + 20 * rate.perMin)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Interactive Live Fare & Surge Simulator ── */}
      <div className="bg-gray-900/80 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-2xl space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>⚡ Live Fare & Surge Price Simulator</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Test how rates, distance, travel time, and dynamic surge multipliers impact passenger billing and driver payouts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Quick Presets:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {SURGE_PRESETS.slice(0, 3).map((p) => (
                <button
                  key={p.label}
                  onClick={() => setSimSurge(p.factor)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    simSurge === p.factor
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  {p.icon} {p.factor}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Simulator Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-950/60 p-5 rounded-2xl border border-white/10">
          
          {/* Distance Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-semibold">📍 Trip Distance</span>
              <span className="text-indigo-400 font-bold text-sm">{simDistance} km</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="50"
              step="0.5"
              value={simDistance}
              onChange={(e) => setSimDistance(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>0.5 km</span>
              <span>25 km</span>
              <span>50 km</span>
            </div>
          </div>

          {/* Duration Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-semibold">⏱️ Estimated Duration</span>
              <span className="text-indigo-400 font-bold text-sm">{simDuration} mins</span>
            </div>
            <input
              type="range"
              min="2"
              max="120"
              step="1"
              value={simDuration}
              onChange={(e) => setSimDuration(parseInt(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>2 min</span>
              <span>60 min</span>
              <span>120 min</span>
            </div>
          </div>

          {/* Surge Multiplier Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-semibold">🔥 Surge Multiplier</span>
              <span className={`font-bold text-sm ${
                simSurge > 1.5 ? 'text-red-400' : simSurge > 1.0 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {simSurge.toFixed(1)}x Multiplier
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="3.5"
              step="0.1"
              value={simSurge}
              onChange={(e) => setSimSurge(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>1.0x (Standard)</span>
              <span>2.0x (High)</span>
              <span>3.5x (Max)</span>
            </div>
          </div>

        </div>

        {/* Live Simulation Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-gray-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Vehicle Tier</th>
                <th className="py-3 px-4">Base</th>
                <th className="py-3 px-4">Distance ({simDistance}km)</th>
                <th className="py-3 px-4">Time ({simDuration}m)</th>
                <th className="py-3 px-4">Surge ({simSurge}x)</th>
                <th className="py-3 px-4 font-bold text-emerald-400">Total Fare</th>
                <th className="py-3 px-4 text-gray-300">Driver Payout</th>
                <th className="py-3 px-4 text-gray-300">Platform Cut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {Object.keys(rates).map((vType) => {
                const est = simulatedEstimates[vType];
                const meta = VEHICLE_META[vType];
                if (!est) return null;

                return (
                  <tr key={vType} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <span className="text-lg">{meta?.icon}</span>
                      <span>{vType}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-300">₹{est.baseFare}</td>
                    <td className="py-3.5 px-4 font-mono text-gray-300">₹{est.distanceFare}</td>
                    <td className="py-3.5 px-4 font-mono text-gray-300">₹{est.timeFare}</td>
                    <td className="py-3.5 px-4 font-mono">
                      {simSurge > 1.0 ? (
                        <span className="text-amber-400 font-bold">
                          +₹{Math.round(est.finalFare - est.rawTotal)}
                        </span>
                      ) : (
                        <span className="text-gray-500">1.0x</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-base font-extrabold text-emerald-400 font-mono">
                        ₹{est.finalFare}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-300 font-semibold">
                      ₹{est.driverNet}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-indigo-300">
                      ₹{est.platformFee}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
