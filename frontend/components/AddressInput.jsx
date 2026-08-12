'use client';

import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AddressInput = ({ label, placeholder, onSelectLocation, initialValue = '' }) => {
    const [query, setQuery] = useState(initialValue);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const debouncedTimer = useRef(null);

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
                toast.error('Address search error');
            } finally {
                setLoading(false);
            }
        }, 400);
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
            alert('Geolocation is not supported by your browser');
            return;
        }

        setLoading(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                try {
                    const res = await axios.get(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
                    );

                    const addressName = res.data?.display_name || `${lat}, ${lng}`;

                    setQuery(addressName);
                    setShowDropdown(false);

                    onSelectLocation({
                        address: addressName,
                        lat,
                        lng,
                    });
                } catch (error) {
                    console.log('Reverse geocode error:', error);
                    const fallback = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
                    setQuery(fallback);
                    onSelectLocation({ address: fallback, lat, lng });
                } finally {
                    setLoading(false);
                }
            },
            (error) => {
                console.log('Geo Error', error);
                alert('Could not get GPS location. Please allow location permissions.');
                setLoading(false);
            }
        );
    };

    return (
        <div style={{ marginBottom: '15px' }}>
            <label>
                <strong>{label}</strong>
            </label>
            <div>
                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    style={{ width: '80%', padding: '8px' }}
                />
                <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    style={{ padding: '8px', marginLeft: '5px' }}
                >
                    📍 Current GPS
                </button>
            </div>
            {loading && <small>Searching places...</small>}
            {showDropdown && suggestions.length > 0 && (
                <ul
                    style={{
                        border: '1px solid #ccc',
                        listStyle: 'none',
                        padding: '5px',
                        margin: '5px 0',
                        maxHeight: '160px',
                        overflowY: 'auto',
                    }}
                >
                    {suggestions.map((item, index) => (
                        <li
                            key={index}
                            onClick={() => handleSelectSuggestion(item)}
                            style={{
                                padding: '6px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #eee',
                            }}
                        >
                            {item.display_name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default AddressInput;
