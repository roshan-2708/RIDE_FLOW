'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import AddressInput from '@/components/AddressInput';

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
        e.preventDefault();

        if (!pickup?.lat || !dropoff?.lat) {
            setErrorMessage('Please select both pickup and dropoff locations.');
            return;
        }

        if (!selectedVehicle) {
            setErrorMessage('Please select a vehicle type.');
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

            if (res.data?.success) {
                const createdRide = res.data.ride;
                alert('Ride requested successfully! Redirecting to live tracking...');
                router.push(`/ride/${createdRide.id}`);
            }
        } catch (err) {
            console.error('Failed to book ride:', err);
            setErrorMessage(err.response?.data?.message || 'Booking failed. Please try again.');
        } finally {
            setIsBooking(false);
        }
    };

    if (authLoading) {
        return <div>Loading authentication...</div>;
    }

    return (
        <div style={{ maxWidth: '650px', margin: '20px auto', padding: '15px' }}>
            <h1>Book a Ride</h1>
            <p>Enter pickup and destination to get started.</p>

            {errorMessage && (
                <div style={{ color: 'red', margin: '10px 0', padding: '8px', border: '1px solid red' }}>
                    <strong>Error: </strong> {errorMessage}
                </div>
            )}

            {/* Address Search Form */}
            <div>
                <AddressInput
                    label="Pickup Location"
                    placeholder="Where are you right now?"
                    onSelectLocation={handlePickupSelect}
                />

                <AddressInput
                    label="Dropoff Location"
                    placeholder="Where do you want to go?"
                    onSelectLocation={handleDropoffSelect}
                />

                {pickup && dropoff && (
                    <button
                        type="button"
                        onClick={() => fetchFareEstimate(pickup, dropoff)}
                        disabled={isEstimating}
                        style={{ padding: '8px 16px', margin: '10px 0' }}
                    >
                        {isEstimating ? 'Calculating Route...' : 'Recalculate Fare Estimate'}
                    </button>
                )}
            </div>

            <hr style={{ margin: '20px 0' }} />

            {/* Route Summary */}
            {tripInfo.distance > 0 && (
                <div>
                    <h3>Trip Details</h3>
                    <p>
                        <strong>Estimated Distance:</strong> {tripInfo.distance} km
                    </p>
                    <p>
                        <strong>Estimated Travel Time:</strong> {tripInfo.duration} minutes
                    </p>
                </div>
            )}

            {/* Vehicle Option Selection */}
            {estimates && (
                <div>
                    <h3>Select Vehicle</h3>
                    <div>
                        {Object.keys(estimates).map((vehicleKey) => {
                            const info = estimates[vehicleKey];
                            const isSelected = selectedVehicle === vehicleKey;

                            return (
                                <div
                                    key={vehicleKey}
                                    onClick={() => setSelectedVehicle(vehicleKey)}
                                    style={{
                                        border: isSelected ? '2px solid black' : '1px solid #ccc',
                                        backgroundColor: isSelected ? '#f0f0f0' : 'transparent',
                                        padding: '10px',
                                        margin: '8px 0',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <input
                                        type="radio"
                                        id={vehicleKey}
                                        name="vehicleType"
                                        value={vehicleKey}
                                        checked={isSelected}
                                        onChange={() => setSelectedVehicle(vehicleKey)}
                                    />
                                    <label htmlFor={vehicleKey} style={{ marginLeft: '10px', cursor: 'pointer' }}>
                                        <strong>{vehicleKey}</strong> — ₹{info.estimatedFare}
                                    </label>
                                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                                        Base: ₹{info.breakdown?.baseFare} | Dist: ₹{info.breakdown?.distanceFare} | Time: ₹{info.breakdown?.timeFare}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={handleBookRide}
                        disabled={isBooking}
                        style={{
                            padding: '12px 24px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            marginTop: '15px',
                            width: '100%',
                            cursor: isBooking ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isBooking ? 'Requesting Driver...' : `Confirm & Book ${selectedVehicle}`}
                    </button>
                </div>
            )}
        </div>
    );
}
