'use client';

import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AddressInput = ({ label, placeholder, onSelectLocation, initialValue = '', icon = '📍' }) => {
    const [query, setQuery] = useState(initialValue);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const debouncedTimer = useRef(null);
    const wrapperRef = useRef(null);

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sync value change from parent
    useEffect(() => {
        setQuery(initialValue);
    }, [initialValue]);

    // Debounced search
    const handleInputChange = (e) => {
        const value = e.target.value;
        setQuery(value);

        if (debouncedTimer.current) {
            clearTimeout(debouncedTimer.current);
        }

        if (!value || value.trim().length < 3) {
            setSuggestions([]);
            setShowDropdown(false);
            return;
        }

        debouncedTimer.current = setTimeout(async () => {
            setLoading(true);
            try {
                const response = await axios.get(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5&addressdetails=1`
                );
                setSuggestions(response.data || []);
                setShowDropdown(true);
            } catch (error) {
                console.log('Address search error', error.message || error);
            } finally {
                setLoading(false);
            }
        }, 350);
    };

    // Select place from list
    const handleSelectSuggestion = (place) => {
        const selectedAddress = place.display_name;
        const lat = parseFloat(place.lat);
        const lng = parseFloat(place.lon);

        setQuery(selectedAddress);
        setShowDropdown(false);
        setSuggestions([]);

        onSelectLocation({
            address: selectedAddress,
            lat,
            lng,
        });
    };

    // Get current GPS location
    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            return;
        }

        setGpsLoading(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                try {
                    const res = await axios.get(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
                    );

                    const addressName = res.data?.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;

                    setQuery(addressName);
                    setShowDropdown(false);

                    onSelectLocation({
                        address: addressName,
                        lat,
                        lng,
                    });
                    toast.success('📍 Current location detected!');
                } catch (error) {
                    console.log('Reverse geocode error:', error);
                    const fallback = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
                    setQuery(fallback);
                    onSelectLocation({ address: fallback, lat, lng });
                } finally {
                    setGpsLoading(false);
                }
            },
            (error) => {
                console.log('Geo Error', error);
                toast.error('Could not get GPS location. Please allow location permissions.');
                setGpsLoading(false);
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    };

    return (
        <div ref={wrapperRef} className="relative space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>{icon}</span> {label}
            </label>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={query}
                        onChange={handleInputChange}
                        placeholder={placeholder}
                        className="w-full bg-white/10 border border-white/15 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-400 focus:outline-none transition-all"
                    />
                    {loading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={gpsLoading}
                    title="Use Current GPS"
                    className="px-3.5 py-3 bg-white/10 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 border border-white/15 hover:border-orange-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 shrink-0"
                >
                    {gpsLoading ? (
                        <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <span>🎯</span> GPS
                        </>
                    )}
                </button>
            </div>

            {/* Suggestions Dropdown */}
            {showDropdown && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-gray-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto backdrop-blur-xl">
                    {suggestions.map((item, index) => (
                        <div
                            key={index}
                            onClick={() => handleSelectSuggestion(item)}
                            className="px-4 py-3 hover:bg-white/10 text-xs text-gray-200 cursor-pointer border-b border-white/5 last:border-0 flex items-start gap-2.5 transition-colors"
                        >
                            <span className="text-orange-400 mt-0.5">📍</span>
                            <span className="line-clamp-2 leading-relaxed">{item.display_name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AddressInput;
