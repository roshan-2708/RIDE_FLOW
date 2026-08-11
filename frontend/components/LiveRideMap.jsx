'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const VEHICLE_EMOJIS = {
  BIKE: '🏍️',
  AUTO: '🛺',
  SEDAN: '🚗',
  SUV: '🚘',
  LUXURY: '💎',
};

// Component to dynamically pan & fit bounds to all markers
function MapBoundsUpdater({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch (err) {
        console.error('Fit bounds error:', err);
      }
    }
  }, [bounds, map]);
  return null;
}

export default function LiveRideMap({
  pickupCoords,
  dropoffCoords,
  driverCoords,
  pickupAddress,
  dropoffAddress,
  vehicleType = 'SEDAN',
  driverName = 'Driver',
  theme = 'dark',
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Custom Icon generators using HTML DivIcons
  const pickupIcon = useMemo(() => {
    return L.divIcon({
      className: 'custom-pickup-pin',
      html: `
        <div style="
          width: 34px; height: 34px;
          border-radius: 50%;
          background: #10B981;
          color: white;
          font-weight: 900;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 16px rgba(16, 185, 129, 0.8), 0 0 0 3px #ffffff;
          border: 2px solid #064e3b;
        ">
          P
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  }, []);

  const dropoffIcon = useMemo(() => {
    return L.divIcon({
      className: 'custom-dropoff-pin',
      html: `
        <div style="
          width: 34px; height: 34px;
          border-radius: 50%;
          background: #EF4444;
          color: white;
          font-weight: 900;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 16px rgba(239, 68, 68, 0.8), 0 0 0 3px #ffffff;
          border: 2px solid #7f1d1d;
        ">
          🏁
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  }, []);

  const driverIcon = useMemo(() => {
    const emoji = VEHICLE_EMOJIS[vehicleType] || '🚗';
    return L.divIcon({
      className: 'custom-driver-pin',
      html: `
        <div style="
          width: 44px; height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #FF5A00, #F59E0B);
          color: white;
          font-size: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(255, 90, 0, 0.9), 0 0 0 3px #ffffff;
          border: 2px solid #ea580c;
          animation: pulse 2s infinite;
        ">
          ${emoji}
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  }, [vehicleType]);

  if (!mounted) {
    return (
      <div className="w-full h-full min-h-[380px] bg-gray-950 rounded-2xl flex items-center justify-center text-gray-400">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Initializing Trip Radar...</span>
        </div>
      </div>
    );
  }

  // Calculate default center and bounds
  const defaultCenter = pickupCoords || driverCoords || dropoffCoords || [19.0760, 72.8777];

  const bounds = [];
  if (pickupCoords && pickupCoords[0] && pickupCoords[1]) bounds.push(pickupCoords);
  if (dropoffCoords && dropoffCoords[0] && dropoffCoords[1]) bounds.push(dropoffCoords);
  if (driverCoords && driverCoords[0] && driverCoords[1]) bounds.push(driverCoords);

  // Tile layers
  const tileUrls = {
    dark: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  };

  const polylinePositions = [];
  if (pickupCoords && dropoffCoords) {
    if (driverCoords) polylinePositions.push(driverCoords);
    polylinePositions.push(pickupCoords);
    polylinePositions.push(dropoffCoords);
  }

  return (
    <div className="w-full h-full min-h-[420px] relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', minHeight: '420px', backgroundColor: '#090d16' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url={tileUrls[theme] || tileUrls.dark}
        />

        {bounds.length > 0 && <MapBoundsUpdater bounds={bounds} />}

        {/* Pickup Pin */}
        {pickupCoords && (
          <Marker position={pickupCoords} icon={pickupIcon}>
            <Popup>
              <div style={{ color: '#000', fontSize: '13px', fontWeight: 'bold' }}>
                📍 Pickup Point
                <div style={{ fontWeight: 'normal', color: '#444', marginTop: '4px', fontSize: '12px' }}>
                  {pickupAddress || 'Passenger Pickup Location'}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Dropoff Pin */}
        {dropoffCoords && (
          <Marker position={dropoffCoords} icon={dropoffIcon}>
            <Popup>
              <div style={{ color: '#000', fontSize: '13px', fontWeight: 'bold' }}>
                🏁 Destination (Dropoff)
                <div style={{ fontWeight: 'normal', color: '#444', marginTop: '4px', fontSize: '12px' }}>
                  {dropoffAddress || 'Passenger Destination'}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Live Driver Position */}
        {driverCoords && (
          <Marker position={driverCoords} icon={driverIcon}>
            <Popup>
              <div style={{ color: '#000', fontSize: '13px', fontWeight: 'bold' }}>
                🚗 {driverName}
                <div style={{ fontWeight: 'normal', color: '#16a34a', marginTop: '4px', fontSize: '12px' }}>
                  🟢 Live Vehicle GPS Telemetry
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Polyline */}
        {polylinePositions.length >= 2 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{
              color: '#FF5A00',
              weight: 5,
              opacity: 0.85,
              dashArray: '8, 8',
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
