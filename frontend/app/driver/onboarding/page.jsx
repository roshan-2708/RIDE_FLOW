'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

const VEHICLE_OPTIONS = [
  { value: 'BIKE', label: 'Bike / Two-Wheeler', icon: '🏍️', desc: 'Single passenger fast commute' },
  { value: 'AUTO', label: 'Auto Rickshaw', icon: '🛺', desc: 'Affordable 3-wheeler city trips' },
  { value: 'SEDAN', label: 'Comfort Sedan', icon: '🚗', desc: 'Everyday 4-passenger AC sedan' },
  { value: 'SUV', label: 'Spacious SUV', icon: '🚘', desc: 'Large 6-seater vehicle' },
  { value: 'LUXURY', label: 'Executive Luxury', icon: '💎', desc: 'Premium executive ride' },
];

export default function DriverOnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    licenseNumber: '',
    vehicleType: 'SEDAN',
    vehiclePlate: '',
    vehicleModel: '',
    vehicleColor: '',
  });

  const [files, setFiles] = useState({
    licensePhoto: null,
    rcPhoto: null,
    vehiclePhoto: null,
  });

  const [previews, setPreviews] = useState({
    licensePhoto: null,
    rcPhoto: null,
    vehiclePhoto: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [existingProfile, setExistingProfile] = useState(null);
  const [fetchingExisting, setFetchingExisting] = useState(true);

  // Check auth and existing profile
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        toast.error('Please login to apply as a driver partner.');
        router.push('/auth/login');
        return;
      }
      checkExistingProfile();
    }
  }, [authLoading, user, router]);

  const checkExistingProfile = async () => {
    try {
      const res = await api.get('/driver/profile');
      if (res.data?.profile) {
        setExistingProfile(res.data.profile);
        setFormData({
          licenseNumber: res.data.profile.licenseNumber || '',
          vehicleType: res.data.profile.vehicleType || 'SEDAN',
          vehiclePlate: res.data.profile.vehiclePlate || '',
          vehicleModel: res.data.profile.vehicleModel || '',
          vehicleColor: res.data.profile.vehicleColor || '',
        });
      }
    } catch {
      // No existing profile, brand new onboarding
    } finally {
      setFetchingExisting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    const file = selectedFiles?.[0];
    if (!file) return;

    // Validate size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    setFiles((prev) => ({ ...prev, [name]: file }));

    // Generate local image preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviews((prev) => ({ ...prev, [name]: reader.result }));
      };
      reader.readAsDataURL(file);
    } else {
      setPreviews((prev) => ({ ...prev, [name]: 'PDF_DOC' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.licenseNumber.trim()) {
      toast.error('Driver License Number is required');
      return;
    }
    if (!formData.vehiclePlate.trim()) {
      toast.error('Vehicle License Plate is required');
      return;
    }
    if (!formData.vehicleModel.trim()) {
      toast.error('Vehicle Model (e.g. Swift Dzire) is required');
      return;
    }
    if (!formData.vehicleColor.trim()) {
      toast.error('Vehicle Color is required');
      return;
    }

    if (!files.licensePhoto || !files.rcPhoto || !files.vehiclePhoto) {
      toast.error('Please upload all 3 required verification documents (License, RC, Vehicle Photo)');
      return;
    }

    setSubmitting(true);

    try {
      const data = new FormData();
      data.append('licenseNumber', formData.licenseNumber.trim().toUpperCase());
      data.append('vehicleType', formData.vehicleType);
      data.append('vehiclePlate', formData.vehiclePlate.trim().toUpperCase());
      data.append('vehicleModel', formData.vehicleModel.trim());
      data.append('vehicleColor', formData.vehicleColor.trim());

      data.append('licensePhoto', files.licensePhoto);
      data.append('rcPhoto', files.rcPhoto);
      data.append('vehiclePhoto', files.vehiclePhoto);

      const response = await api.post('/driver/onboarding', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200 || response.data?.success) {
        toast.success('🎉 Application submitted for Admin Review!');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Onboarding submission error:', error);
      const msg = error.response?.data?.message || 'Failed to submit driver application';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || fetchingExisting) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-12 h-12 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin" />
        <p className="text-sm font-semibold text-gray-400">Loading Driver Onboarding...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-white font-[Poppins,sans-serif] px-4 sm:px-6 lg:px-8 py-10 relative overflow-hidden">
      
      {/* Background Glow Blobs */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-orange-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] rounded-full bg-orange-600/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        
        {/* ── Top Header Banner ── */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold mb-3">
              🚗 DRIVER PARTNER REGISTRATION
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Drive with RideFlow &amp; Earn Big
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl">
              Complete your verification by submitting your driver license and vehicle documents. Admin reviews applications within 2–4 hours.
            </p>
          </div>

          {existingProfile && (
            <div className="flex flex-col items-end gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                existingProfile.status === 'APPROVED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : existingProfile.status === 'REJECTED'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                Current Status: {existingProfile.status}
              </span>
              <Link
                href="/dashboard"
                className="text-xs text-orange-400 hover:text-orange-300 font-semibold"
              >
                Go to Dashboard →
              </Link>
            </div>
          )}
        </div>

        {/* ── Main Onboarding Form ── */}
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section 1: Driver License Details */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center text-xl">
                📄
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">1. Driver License Verification</h2>
                <p className="text-xs text-gray-400">Enter your government-issued commercial or private driving license details.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Driving License Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="licenseNumber"
                  placeholder="e.g. MH0120190012345"
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-gray-950/80 border border-white/15 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:border-orange-500 uppercase transition-colors"
                />
              </div>

              {/* License Document Upload */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Upload License Photo (JPG / PNG / PDF) <span className="text-red-400">*</span>
                </label>
                <div className="relative border-2 border-dashed border-white/20 hover:border-orange-500/60 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-gray-950/40">
                  <input
                    type="file"
                    name="licensePhoto"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    required={!existingProfile}
                  />
                  {previews.licensePhoto ? (
                    <div className="flex items-center justify-center gap-3">
                      {previews.licensePhoto === 'PDF_DOC' ? (
                        <span className="text-2xl">📑</span>
                      ) : (
                        <img
                          src={previews.licensePhoto}
                          alt="License Preview"
                          className="w-16 h-12 object-cover rounded-lg border border-white/20"
                        />
                      )}
                      <div className="text-left">
                        <p className="text-xs font-bold text-emerald-400">✓ License Attached</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[160px]">{files.licensePhoto?.name}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-xl">📸</span>
                      <p className="text-xs font-semibold text-gray-300">Click or Drag License Photo</p>
                      <p className="text-[10px] text-gray-500">Max size: 5MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Vehicle Category & Specifications */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center text-xl">
                🚙
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">2. Vehicle Specifications</h2>
                <p className="text-xs text-gray-400">Select your vehicle category and enter registered vehicle details.</p>
              </div>
            </div>

            {/* Vehicle Tier Selection Cards */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-2.5">
                Select Vehicle Category <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {VEHICLE_OPTIONS.map((v) => {
                  const isSelected = formData.vehicleType === v.value;
                  return (
                    <div
                      key={v.value}
                      onClick={() => setFormData((prev) => ({ ...prev, vehicleType: v.value }))}
                      className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between ${
                        isSelected
                          ? 'bg-orange-500/20 border-orange-500 shadow-lg shadow-orange-500/20 ring-2 ring-orange-500/40'
                          : 'bg-gray-950/60 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <span className="text-2xl mb-1.5">{v.icon}</span>
                      <p className="text-xs font-bold text-white">{v.value}</p>
                      <p className="text-[10px] text-gray-400 mt-1 leading-tight">{v.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  License Plate Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="vehiclePlate"
                  placeholder="e.g. MH 02 AB 1234"
                  value={formData.vehiclePlate}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-gray-950/80 border border-white/15 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:border-orange-500 uppercase transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Vehicle Model <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="vehicleModel"
                  placeholder="e.g. Maruti Swift Dzire"
                  value={formData.vehicleModel}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-gray-950/80 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Vehicle Color <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="vehicleColor"
                  placeholder="e.g. Silver White"
                  value={formData.vehicleColor}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-gray-950/80 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Vehicle Registration Certificate (RC) & Vehicle Photo */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center text-xl">
                📋
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">3. Vehicle Document Uploads</h2>
                <p className="text-xs text-gray-400">Upload clear photos of your Vehicle RC and Vehicle Exterior.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* RC Photo Upload */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Vehicle RC (Registration Certificate) <span className="text-red-400">*</span>
                </label>
                <div className="relative border-2 border-dashed border-white/20 hover:border-orange-500/60 rounded-2xl p-5 text-center cursor-pointer transition-colors bg-gray-950/40 min-h-[120px] flex flex-col items-center justify-center">
                  <input
                    type="file"
                    name="rcPhoto"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    required={!existingProfile}
                  />
                  {previews.rcPhoto ? (
                    <div className="flex items-center justify-center gap-3">
                      {previews.rcPhoto === 'PDF_DOC' ? (
                        <span className="text-3xl">📑</span>
                      ) : (
                        <img
                          src={previews.rcPhoto}
                          alt="RC Preview"
                          className="w-16 h-14 object-cover rounded-lg border border-white/20"
                        />
                      )}
                      <div className="text-left">
                        <p className="text-xs font-bold text-emerald-400">✓ RC Attached</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[160px]">{files.rcPhoto?.name}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-2xl">📋</span>
                      <p className="text-xs font-semibold text-gray-300">Upload Vehicle RC</p>
                      <p className="text-[10px] text-gray-500">JPG, PNG, or PDF up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Photo Upload */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Vehicle Photo (Front / Side View) <span className="text-red-400">*</span>
                </label>
                <div className="relative border-2 border-dashed border-white/20 hover:border-orange-500/60 rounded-2xl p-5 text-center cursor-pointer transition-colors bg-gray-950/40 min-h-[120px] flex flex-col items-center justify-center">
                  <input
                    type="file"
                    name="vehiclePhoto"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    required={!existingProfile}
                  />
                  {previews.vehiclePhoto ? (
                    <div className="flex items-center justify-center gap-3">
                      <img
                        src={previews.vehiclePhoto}
                        alt="Vehicle Preview"
                        className="w-16 h-14 object-cover rounded-lg border border-white/20"
                      />
                      <div className="text-left">
                        <p className="text-xs font-bold text-emerald-400">✓ Vehicle Photo Attached</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[160px]">{files.vehiclePhoto?.name}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-2xl">📸</span>
                      <p className="text-xs font-semibold text-gray-300">Upload Vehicle Exterior</p>
                      <p className="text-[10px] text-gray-500">Clear photo with visible number plate</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* ── Submit Action Button ── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p className="text-xs text-gray-400 text-center sm:text-left">
              By submitting, you agree to RideFlow Partner Terms &amp; Conditions.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-10 py-4 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-extrabold text-sm rounded-2xl shadow-[0_4px_20px_rgba(255,90,0,0.4)] hover:shadow-[0_6px_25px_rgba(255,90,0,0.5)] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Uploading Documents &amp; Submitting...
                </>
              ) : (
                'Submit Application for Verification 🚀'
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}