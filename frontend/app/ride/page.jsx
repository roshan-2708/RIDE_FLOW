'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import api from '@/lib/api';

export default function RidesOverviewPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      fetchMyRides();
    }
  }, [authLoading, user, router]);

  const fetchMyRides = async () => {
    try {
      const res = await api.get('/rides/my-rides');
      setRides(res.data?.rides || []);
    } catch (err) {
      console.error('Failed to fetch rides:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-12 h-12 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin" />
        <p className="text-sm font-semibold text-gray-400">Loading trips...</p>
      </div>
    );
  }

  const activeRides = rides.filter((r) => ['REQUESTED', 'ACCEPTED', 'ARRIVING', 'STARTED'].includes(r.status));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-white font-[Poppins,sans-serif] px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Your Trips &amp; Active Rides</h1>
            <p className="text-sm text-gray-400 mt-1">Track current in-progress rides or view your trip history</p>
          </div>
          <Link
            href="/book-ride"
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 font-bold text-xs rounded-xl shadow-lg transition-all"
          >
            + Book New Ride
          </Link>
        </div>

        {/* Active Rides Banner */}
        {activeRides.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              Active In-Progress Rides ({activeRides.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeRides.map((ride) => (
                <div
                  key={ride.id}
                  className="bg-white/5 border border-emerald-500/40 rounded-3xl p-5 shadow-xl space-y-3"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-gray-400">#{ride.id.substring(0, 8)}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                      {ride.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Pickup</p>
                    <p className="text-sm font-semibold truncate">{ride.pickupAddress}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Destination</p>
                    <p className="text-sm font-semibold truncate">{ride.dropoffAddress}</p>
                  </div>
                  <Link
                    href={`/ride/${ride.id}`}
                    className="block w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-center text-xs font-bold rounded-xl shadow-md transition-all"
                  >
                    Open Live Trip Tracker →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Rides List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">All Recent Trips ({rides.length})</h2>

          {rides.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-10 text-center space-y-3">
              <div className="text-4xl">🚕</div>
              <p className="text-sm text-gray-400">No rides booked yet.</p>
              <Link
                href="/book-ride"
                className="inline-block px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-xs font-bold rounded-xl shadow-lg"
              >
                Book your first trip
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {rides.map((ride) => (
                <Link
                  key={ride.id}
                  href={`/ride/${ride.id}`}
                  className="block bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-500/40 rounded-2xl p-4 transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400">#{ride.id.substring(0, 8)}</span>
                        <span className="text-xs font-bold text-orange-400">{ride.vehicleType}</span>
                        <span className="text-xs text-gray-400">
                          {ride.requestedAt ? new Date(ride.requestedAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <p className="text-sm text-white font-medium mt-1 truncate max-w-md">
                        {ride.pickupAddress} ➔ {ride.dropoffAddress}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <span className="text-base font-extrabold text-emerald-400">
                        ₹{ride.actualFare || ride.estimatedFare}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-gray-300">
                        {ride.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}