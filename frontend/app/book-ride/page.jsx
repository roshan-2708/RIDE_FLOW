'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import AddressInput from '@/components/AddressInput';
import toast from 'react-hot-toast';
import Link from 'next/link';

const VEHICLE_METADATA = {
    BIKE: { label: 'Bike-Taxi', icon: '🏍️', tag: 'Fastest in Traffic', gradient: 'from-amber-500 to-orange-500' },
    AUTO: { label: 'Auto Rickshaw', icon: '🛺', tag: 'Affordable & Quick', gradient: 'from-yellow-500 to-amber-500' },
    SEDAN: { label: 'Comfort Sedan', icon: '🚗', tag: 'AC & Spacious', gradient: 'from-sky-500 to-blue-500' },
    SUV: { label: 'Spacious SUV', icon: '🚘', tag: 'Family & Luggage', gradient: 'from-indigo-500 to-purple-500' },
    LUXURY: { label: 'Luxury Premium', icon: '💎', tag: 'Top Rated Captains', gradient: 'from-rose-500 to-pink-500' },
};

export default function BookRidePage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    // Location States
    const [pickup, setPickup] = useState(null); // { address, lat, lng }
    const [dropoff, setDropoff] = useState(null); // { address, lat, lng }

    // Estimation States
    const [estimates, setEstimates] = useState(null);
    const [tripInfo, setTripInfo] = useState({ distance: 0, duration: 0 });
    const [selectedVehicle, setSelectedVehicle] = useState('BIKE');

    // UI States
    const [isEstimating, setIsEstimating] = useState(false);
    const [isBooking, setIsBooking] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Protect route: Ensure user is logged in
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        }
    }, [authLoading, user, router]);

    // Fetch Fare Estimates when both Pickup and Dropoff locations are chosen
    const fetchFareEstimate = async (p = pickup, d = dropoff) => {
        if (!p?.lat || !p?.lng || !d?.lat || !d?.lng) {
            return;
        }

        setIsEstimating(true);
        setErrorMessage('');

        try {
            const res = await api.post('/rides/estimate', {
                pickUpLat: p.lat,
                pickUpLng: p.lng,
                dropLat: d.lat,
                dropLng: d.lng,
            });

            if (res.data?.success) {
                setEstimates(res.data.data.estimate);
                setTripInfo({
                    distance: res.data.data.distance,
                    duration: res.data.data.duration,
                });
            }
        } catch (err) {
            console.error('Failed to get fare estimate:', err);
            setErrorMessage(err.response?.data?.message || 'Failed to estimate fare');
            toast.error(err.response?.data?.message || 'Failed to estimate fare');
        } finally {
            setIsEstimating(false);
        }
    };

    const handlePickupSelect = (location) => {
        setPickup(location);
        if (dropoff?.lat && dropoff?.lng) {
            fetchFareEstimate(location, dropoff);
        }
    };

    const handleDropoffSelect = (location) => {
        setDropoff(location);
        if (pickup?.lat && pickup?.lng) {
            fetchFareEstimate(pickup, location);
        }
    };

    // Submit Ride Booking Request
    const handleBookRide = async (e) => {
        if (e) e.preventDefault();

        if (!pickup?.lat || !dropoff?.lat) {
            const msg = 'Please select both pickup and dropoff locations.';
            setErrorMessage(msg);
            toast.error(msg);
            return;
        }

        if (!selectedVehicle) {
            const msg = 'Please select a vehicle type.';
            setErrorMessage(msg);
            toast.error(msg);
            return;
        }

        setIsBooking(true);
        setErrorMessage('');

        try {
            const payload = {
                pickUpLat: pickup.lat,
                pickUpLng: pickup.lng,
                pickUpAddress: pickup.address,
                dropLat: dropoff.lat,
                dropLng: dropoff.lng,
                dropAddress: dropoff.address,
                vehicleType: selectedVehicle,
            };

            const res = await api.post('/rides/book', payload);

            if (res.data?.success && res.data?.ride) {
                const createdRide = res.data.ride;
                toast.success('🚀 Ride requested! Connecting to nearby drivers...');
                router.push(`/ride/${createdRide.id}`);
            } else {
                throw new Error(res.data?.message || 'Failed to book ride');
            }
        } catch (err) {
            console.error('Failed to book ride:', err);
            const msg = err.response?.data?.message || 'Booking request failed. Please try again.';
            setErrorMessage(msg);
            toast.error(msg);
            setIsBooking(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-white">
                <div className="w-12 h-12 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin" />
                <p className="text-sm font-semibold text-gray-400">Loading booking portal...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-white font-[Poppins,sans-serif] px-4 sm:px-6 lg:px-8 py-10">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-semibold mb-2">
                            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                            Live Captain Matching
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Book Your Ride</h1>
                        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Select your pickup &amp; dropoff location to get instant vehicle options</p>
                    </div>
                    <Link
                        href="/ride"
                        className="px-4 py-2 bg-white/10 hover:bg-white/15 text-xs font-semibold rounded-xl text-gray-300 border border-white/10 transition-all"
                    >
                        My Rides 🚕
                    </Link>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                    <div className="p-4 bg-red-500/15 border border-red-500/30 rounded-2xl text-red-300 text-xs flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span>⚠️</span>
                            <span>{errorMessage}</span>
                        </div>
                        <button onClick={() => setErrorMessage('')} className="text-gray-400 hover:text-white text-base">✕</button>
                    </div>
                )}

                {/* Main Card */}
                <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-2xl space-y-6">

                    {/* Address Inputs */}
                    <div className="space-y-4">
                        <AddressInput
                            label="Pickup Location"
                            placeholder="Search pickup point or use GPS..."
                            icon="🟢"
                            onSelectLocation={handlePickupSelect}
                        />

                        <AddressInput
                            label="Dropoff Destination"
                            placeholder="Where do you want to go?"
                            icon="🏁"
                            onSelectLocation={handleDropoffSelect}
                        />
                    </div>

                    {/* Route Details Banner */}
                    {tripInfo.distance > 0 && (
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-500/20 rounded-2xl">
                            <div className="flex items-center gap-4 text-xs">
                                <div>
                                    <span className="text-gray-400">Estimated Distance</span>
                                    <p className="text-sm font-bold text-orange-400">{tripInfo.distance} km</p>
                                </div>
                                <div className="w-px h-8 bg-white/10" />
                                <div>
                                    <span className="text-gray-400">Estimated Duration</span>
                                    <p className="text-sm font-bold text-white">~{tripInfo.duration} mins</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => fetchFareEstimate(pickup, dropoff)}
                                disabled={isEstimating}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-orange-400 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                            >
                                {isEstimating ? 'Refreshing...' : '🔄 Recalculate'}
                            </button>
                        </div>
                    )}

                    {/* Estimating Loading State */}
                    {isEstimating && !estimates && (
                        <div className="p-8 text-center space-y-3">
                            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-xs font-semibold text-gray-400">Computing the best route &amp; fare options...</p>
                        </div>
                    )}

                    {/* Vehicle Options */}
                    {estimates && (
                        <div className="space-y-3 pt-2">
                            <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Select Vehicle Type</h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {Object.keys(estimates).map((vehicleKey) => {
                                    const info = estimates[vehicleKey];
                                    const meta = VEHICLE_METADATA[vehicleKey] || {
                                        label: vehicleKey,
                                        icon: '🚗',
                                        tag: 'Standard Ride',
                                        gradient: 'from-orange-500 to-amber-500',
                                    };
                                    const isSelected = selectedVehicle === vehicleKey;

                                    return (
                                        <div
                                            key={vehicleKey}
                                            onClick={() => setSelectedVehicle(vehicleKey)}
                                            className={`relative p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                                                isSelected
                                                    ? 'bg-orange-500/15 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.25)]'
                                                    : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-3xl">{meta.icon}</div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <h3 className="font-bold text-sm text-white">{meta.label}</h3>
                                                            {isSelected && (
                                                                <span className="w-2 h-2 rounded-full bg-orange-400" />
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-gray-400">{meta.tag}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-base font-extrabold text-orange-400">₹{info.estimatedFare}</div>
                                                </div>
                                            </div>

                                            {/* Fare breakdown chips */}
                                            {info.breakdown && (
                                                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-400">
                                                    <span>Base: ₹{info.breakdown.baseFare}</span>
                                                    <span>Dist: ₹{info.breakdown.distanceFare}</span>
                                                    <span>Time: ₹{info.breakdown.timeFare}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Book Now Button */}
                            <button
                                type="button"
                                onClick={handleBookRide}
                                disabled={isBooking}
                                className="w-full mt-4 py-4 px-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm rounded-2xl shadow-[0_10px_30px_rgba(249,115,22,0.4)] transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isBooking ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Requesting Nearby Captains...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🚀</span>
                                        <span>Confirm &amp; Request {VEHICLE_METADATA[selectedVehicle]?.label || selectedVehicle}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
