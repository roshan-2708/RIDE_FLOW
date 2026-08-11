'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';

// Vehicle emoji helper
const vehicleEmojis = {
  AUTO: '🛺',
  BIKE: '🏍️',
  SEDAN: '🚗',
  SUV: '🚘',
  LUXURY: '💎',
};

// Map Tile Layer Providers
const MAP_THEMES = {
  dark: {
    name: 'Dark Radar',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>, &copy; <a href="https://openstreetmap.org">OSM</a>',
  },
  streets: {
    name: 'Street View',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  voyager: {
    name: 'Voyager Light',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>, &copy; <a href="https://openstreetmap.org">OSM</a>',
  },
};

// Custom Driver DivIcon Factory
const createDriverIcon = (driver, isSelected) => {
  const emoji = vehicleEmojis[driver.vehicleType] || '🚗';
  const isOnline = driver.availability === 'ONLINE';
  const isOnRide = driver.availability === 'ON_RIDE';
  
  const ringColor = isOnRide ? '#F59E0B' : isOnline ? '#10B981' : '#6B7280';
  const ringBg = isOnRide ? 'rgba(245, 158, 11, 0.25)' : isOnline ? 'rgba(16, 185, 129, 0.25)' : 'rgba(107, 114, 128, 0.2)';
  const pulseClass = (isOnline || isOnRide) ? 'radar-pulse' : '';
  const selectedBorder = isSelected ? 'border-2 border-white shadow-[0_0_16px_#6C63FF]' : 'border border-white/40 shadow-lg';

  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <div style="
        position: relative;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: #1e293b;
        border: 2px solid ${ringColor};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.5);
      " class="${selectedBorder}">
        ${(isOnline || isOnRide) ? `
          <div style="
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            border: 2px solid ${ringColor};
            background: ${ringBg};
            opacity: 0.7;
            animation: pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          "></div>
        ` : ''}
        <span style="position: relative; z-index: 2;">${emoji}</span>
      </div>
      <div style="
        margin-top: 3px;
        background: rgba(15, 23, 42, 0.9);
        backdrop-filter: blur(4px);
        color: #f8fafc;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.15);
        white-space: nowrap;
        max-width: 90px;
        overflow: hidden;
        text-overflow: ellipsis;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      ">
        ${driver.user?.name ? driver.user.name.split(' ')[0] : 'Driver'}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-driver-marker',
    iconSize: [42, 58],
    iconAnchor: [21, 29],
    popupAnchor: [0, -32],
  });
};

// Pickup Marker Icon
const createPickupIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #10B981;
        border: 2px solid #ffffff;
        box-shadow: 0 0 12px rgba(16, 185, 129, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 800;
        font-size: 13px;
      ">
        P
      </div>
    `,
    className: 'custom-pickup-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
};

// Dropoff Marker Icon
const createDropoffIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #EF4444;
        border: 2px solid #ffffff;
        box-shadow: 0 0 12px rgba(239, 68, 68, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 800;
        font-size: 13px;
      ">
        D
      </div>
    `,
    className: 'custom-dropoff-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
};

// Map Controller for FlyTo and AutoBounds
function MapController({ selectedCoords }) {
  const map = useMap();

  useEffect(() => {
    if (selectedCoords && selectedCoords.lat && selectedCoords.lng) {
      map.flyTo([selectedCoords.lat, selectedCoords.lng], 16, {
        animate: true,
        duration: 1.2,
      });
    }
  }, [selectedCoords, map]);

  return null;
}

export default function AdminCityRadarMap({
  drivers = [],
  activeRides = [],
  selectedEntity = null,
  onSelectEntity = () => {},
}) {
  const [mapTheme, setMapTheme] = useState('dark');
  const [showRides, setShowRides] = useState(true);
  const [showDrivers, setShowDrivers] = useState(true);

  // Default fallback center (Mumbai center or first available coordinate)
  const defaultCenter = useMemo(() => {
    const validDriver = drivers.find(d => typeof d.currentLat === 'number' && typeof d.currentLng === 'number');
    if (validDriver) {
      return [validDriver.currentLat, validDriver.currentLng];
    }
    const validRide = activeRides.find(r => typeof r.pickupLat === 'number' && typeof r.pickupLng === 'number');
    if (validRide) {
      return [validRide.pickupLat, validRide.pickupLng];
    }
    return [19.0760, 72.8777]; // Mumbai default fallback
  }, [drivers, activeRides]);

  // Selected coordinate for flyTo
  const selectedCoords = useMemo(() => {
    if (!selectedEntity) return null;
    if (selectedEntity.type === 'driver' && selectedEntity.data) {
      if (typeof selectedEntity.data.currentLat === 'number' && typeof selectedEntity.data.currentLng === 'number') {
        return { lat: selectedEntity.data.currentLat, lng: selectedEntity.data.currentLng };
      }
    }
    if (selectedEntity.type === 'ride' && selectedEntity.data) {
      if (typeof selectedEntity.data.pickupLat === 'number' && typeof selectedEntity.data.pickupLng === 'number') {
        return { lat: selectedEntity.data.pickupLat, lng: selectedEntity.data.pickupLng };
      }
    }
    return null;
  }, [selectedEntity]);

  return (
    <div className="relative w-full h-full min-h-[580px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-gray-950">
      
      {/* Map Style & Layer Switcher Controls (Floating Top Right) */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-wrap items-center gap-2 bg-gray-900/85 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 shadow-xl text-xs font-semibold text-white">
        {Object.entries(MAP_THEMES).map(([key, theme]) => (
          <button
            key={key}
            onClick={() => setMapTheme(key)}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              mapTheme === key
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            {theme.name}
          </button>
        ))}

        <div className="hidden sm:block h-4 w-[1px] bg-white/20 mx-1" />

        {/* Toggle Layers */}
        <button
          onClick={() => setShowDrivers(!showDrivers)}
          className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
            showDrivers
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 opacity-60'
          }`}
          title="Toggle Driver Markers"
        >
          <span>🚗 Drivers</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10">
            {drivers.filter(d => typeof d.currentLat === 'number' && typeof d.currentLng === 'number').length}
          </span>
        </button>

        <button
          onClick={() => setShowRides(!showRides)}
          className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
            showRides
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 opacity-60'
          }`}
          title="Toggle Active Ride Routes"
        >
          <span>📍 Rides</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10">
            {activeRides.length}
          </span>
        </button>
      </div>

      {/* Embedded Leaflet Map */}
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', minHeight: '580px', zIndex: 1 }}
      >
        <TileLayer
          url={MAP_THEMES[mapTheme].url}
          attribution={MAP_THEMES[mapTheme].attribution}
          maxZoom={19}
        />

        <MapController selectedCoords={selectedCoords} />

        {/* Render Driver Markers */}
        {showDrivers && drivers.map((driver) => {
          if (typeof driver.currentLat !== 'number' || typeof driver.currentLng !== 'number') return null;
          const isSelected = selectedEntity?.type === 'driver' && selectedEntity.data?.id === driver.id;

          return (
            <Marker
              key={driver.id}
              position={[driver.currentLat, driver.currentLng]}
              icon={createDriverIcon(driver, isSelected)}
              eventHandlers={{
                click: () => onSelectEntity({ type: 'driver', data: driver }),
              }}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-3 max-w-xs text-gray-900 font-[Poppins,sans-serif]">
                  <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-2 mb-2">
                    <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                      <span>{vehicleEmojis[driver.vehicleType] || '🚗'}</span>
                      <span>{driver.user?.name || 'Driver Partner'}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      driver.availability === 'ONLINE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : driver.availability === 'ON_RIDE'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {driver.availability || 'OFFLINE'}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600">
                    <p><strong>Vehicle:</strong> {driver.vehicleType} • {driver.vehicleModel || 'N/A'}</p>
                    <p><strong>Plate:</strong> <span className="font-mono font-semibold bg-gray-100 px-1.5 py-0.5 rounded">{driver.vehiclePlate || 'N/A'}</span></p>
                    <p><strong>Contact:</strong> {driver.user?.phone || 'N/A'}</p>
                    <p><strong>Rating:</strong> ⭐ {driver.rating?.toFixed(1) || '5.0'} ({driver.totalRides || 0} rides)</p>
                    <p><strong>GPS:</strong> {driver.currentLat.toFixed(4)}, {driver.currentLng.toFixed(4)}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-100 flex justify-end">
                    <Link
                      href={`/admin/drivers/${driver.userId || driver.id}`}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition-colors"
                    >
                      View Profile & Docs →
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Render Active Rides: Pickup / Dropoff Markers & Polyline */}
        {showRides && activeRides.map((ride) => {
          const hasPickup = typeof ride.pickupLat === 'number' && typeof ride.pickupLng === 'number';
          const hasDropoff = typeof ride.dropoffLat === 'number' && typeof ride.dropoffLng === 'number';
          if (!hasPickup) return null;

          const isSelected = selectedEntity?.type === 'ride' && selectedEntity.data?.id === ride.id;

          return (
            <React.Fragment key={ride.id}>
              {/* Pickup Marker */}
              <Marker
                position={[ride.pickupLat, ride.pickupLng]}
                icon={createPickupIcon()}
                eventHandlers={{
                  click: () => onSelectEntity({ type: 'ride', data: ride }),
                }}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-3 max-w-xs text-gray-900 font-[Poppins,sans-serif]">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-2">
                      <div className="font-bold text-sm text-emerald-700 flex items-center gap-1">
                        <span>🟢 Pickup Point</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        {ride.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-800 mb-1">{ride.pickupAddress || 'Pickup Location'}</p>
                    <div className="text-xs text-gray-600 space-y-0.5">
                      <p><strong>Rider:</strong> {ride.rider?.name || 'Passenger'}</p>
                      <p><strong>Vehicle:</strong> {vehicleEmojis[ride.vehicleType] || '🚗'} {ride.vehicleType}</p>
                      <p><strong>Est. Fare:</strong> <span className="font-bold text-emerald-600">₹{ride.estimatedFare}</span></p>
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Dropoff Marker if available */}
              {hasDropoff && (
                <Marker
                  position={[ride.dropoffLat, ride.dropoffLng]}
                  icon={createDropoffIcon()}
                  eventHandlers={{
                    click: () => onSelectEntity({ type: 'ride', data: ride }),
                  }}
                >
                  <Popup className="custom-leaflet-popup">
                    <div className="p-3 max-w-xs text-gray-900 font-[Poppins,sans-serif]">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-2">
                        <div className="font-bold text-sm text-red-600 flex items-center gap-1">
                          <span>🔴 Dropoff Point</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                          {ride.status}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-gray-800 mb-1">{ride.dropoffAddress || 'Dropoff Destination'}</p>
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <p><strong>Rider:</strong> {ride.rider?.name || 'Passenger'}</p>
                        <p><strong>Distance:</strong> {ride.distance ? `${ride.distance} km` : 'N/A'}</p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Connecting Polyline Route */}
              {hasPickup && hasDropoff && (
                <Polyline
                  positions={[
                    [ride.pickupLat, ride.pickupLng],
                    [ride.dropoffLat, ride.dropoffLng],
                  ]}
                  pathOptions={{
                    color: isSelected ? '#F43F5E' : '#6C63FF',
                    weight: isSelected ? 4 : 3,
                    dashArray: '6, 8',
                    opacity: isSelected ? 0.95 : 0.75,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Inline styles for pulse animations and popups */}
      <style jsx global>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(0.95);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.4);
            opacity: 0.2;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
        .leaflet-popup-content-wrapper {
          border-radius: 16px !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3) !important;
          padding: 2px !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          line-height: 1.4 !important;
        }
      `}</style>
    </div>
  );
}
