'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';

import { useAuth } from '@/context/AuthContext';

const RegisterPage = () => {
    const router = useRouter();
    const { login } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState('');
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'RIDER',
    });
    const [otp, setOtp] = useState('');

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/auth/register', form);
            if (res.data.userId) {
                setUserId(res.data.userId);
            }
            toast.success(res.data.message || 'OTP sent to your email');
            setStep(2);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const verifyOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/auth/verify-otp', { userId, otp });
            const token = res.data.tokens?.accessToken || res.data.token;
            if (token && res.data.user) {
                login(res.data.user, token);
            }
            toast.success('Registration successful! 🎉');
            if (res.data.user?.role === 'DRIVER') {
                router.push('/dashboard');
            } else {
                router.push('/');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 px-6 py-20 overflow-hidden">

            {/* blobs */}
            <div className="absolute top-[-100px] right-[-100px] w-[450px] h-[450px] rounded-full bg-orange-500/20 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-80px] left-[-80px] w-[350px] h-[350px] rounded-full bg-orange-600/15 blur-[80px] pointer-events-none" />

            {/* grid overlay */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)`,
                    backgroundSize: '60px 60px',
                }}
            />

            <div className="relative z-10 w-full max-w-md space-y-6">

                {/* Logo */}
                <div className="flex justify-center">
                    <Link href="/" className="flex items-center gap-2.5">
                        <svg width="38" height="38" viewBox="0 0 36 36" fill="none">
                            <circle cx="18" cy="18" r="18" fill="#FF5A00" />
                            <path d="M10 26L14 10H20C23.3 10 25 11.8 25 14.5C25 17.2 23 19 20.5 19.3L24 26H20.5L17.5 19.5H16.5L14.5 26H10Z" fill="white" />
                            <path d="M16.5 17H19.5C21 17 22 16.2 22 14.8C22 13.4 21 12.5 19.5 12.5H16L16.5 17Z" fill="#FF5A00" />
                        </svg>
                        <span className="text-xl font-extrabold text-white tracking-tight">RideFlow</span>
                    </Link>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-3">
                    {[1, 2].map(s => (
                        <div key={s} className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                ${step >= s
                                    ? 'bg-orange-500 text-white shadow-[0_0_14px_rgba(255,90,0,0.5)]'
                                    : 'bg-white/10 text-white/40 border border-white/20'
                                }`}>
                                {step > s ? '✓' : s}
                            </div>
                            {s < 2 && (
                                <div className={`w-12 h-px transition-all duration-500 ${step > s ? 'bg-orange-500' : 'bg-white/20'}`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Card */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6">

                    {step === 1 ? (
                        <>
                            <div className="text-center space-y-1">
                                <h2 className="text-2xl font-extrabold text-white">Create Account</h2>
                                <p className="text-sm text-gray-400">Join millions of riders on RideFlow</p>
                            </div>

                            <form onSubmit={handleRegister} className="space-y-4">

                                {/* Name */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Full Name</label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base">👤</span>
                                        <input
                                            name="name"
                                            type="text"
                                            required
                                            placeholder="John Doe"
                                            value={form.name}
                                            onChange={handleChange}
                                            className="w-full bg-white/8 border border-white/15 text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all duration-200"
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Email Address</label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base">📧</span>
                                        <input
                                            name="email"
                                            type="email"
                                            required
                                            placeholder="john@example.com"
                                            value={form.email}
                                            onChange={handleChange}
                                            className="w-full bg-white/8 border border-white/15 text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all duration-200"
                                        />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Phone Number</label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base">📱</span>
                                        <input
                                            name="phone"
                                            type="tel"
                                            required
                                            placeholder="+91 98765 43210"
                                            value={form.phone}
                                            onChange={handleChange}
                                            className="w-full bg-white/8 border border-white/15 text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all duration-200"
                                        />
                                    </div>
                                </div>

                                {/* Role toggle */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">I want to</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { value: 'RIDER', emoji: '🏍️', label: 'Book Rides' },
                                            { value: 'DRIVER', emoji: '🚗', label: 'Drive & Earn' },
                                        ].map(({ value, emoji, label }) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setForm(prev => ({ ...prev, role: value }))}
                                                className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all duration-200
                          ${form.role === value
                                                        ? 'bg-orange-500 border-orange-500 text-white shadow-[0_4px_14px_rgba(255,90,0,0.4)]'
                                                        : 'bg-white/5 border-white/15 text-gray-400 hover:border-orange-400/50 hover:text-white'
                                                    }`}
                                            >
                                                <span>{emoji}</span> {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all duration-250 shadow-[0_6px_24px_rgba(255,90,0,0.4)] hover:shadow-[0_10px_30px_rgba(255,90,0,0.5)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                            </svg>
                                            Sending OTP...
                                        </>
                                    ) : 'Get OTP →'}
                                </button>
                            </form>

                            <p className="text-center text-sm text-gray-500">
                                Already have an account?{' '}
                                <Link href="/auth/login" className="text-orange-400 font-semibold hover:text-orange-300 transition-colors">
                                    Login
                                </Link>
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="text-center space-y-1">
                                <div className="text-4xl mb-3">📬</div>
                                <h2 className="text-2xl font-extrabold text-white">Verify Your Email</h2>
                                <p className="text-sm text-gray-400">
                                    OTP sent to <span className="text-orange-400 font-semibold">{form.email}</span>
                                </p>
                            </div>

                            <form onSubmit={verifyOTP} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Enter OTP</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        required
                                        placeholder="• • • • • •"
                                        value={otp}
                                        onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-white/8 border border-white/15 text-white placeholder-gray-600 rounded-xl px-4 py-4 text-xl font-bold text-center tracking-[0.5em] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all duration-200"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all duration-250 shadow-[0_6px_24px_rgba(255,90,0,0.4)] hover:shadow-[0_10px_30px_rgba(255,90,0,0.5)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                            </svg>
                                            Verifying...
                                        </>
                                    ) : '✓ Verify & Register'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white font-semibold rounded-xl text-sm transition-all duration-200"
                                >
                                    ← Change Details
                                </button>
                            </form>
                        </>
                    )}
                </div>

                <p className="text-center text-xs text-gray-600">
                    By continuing, you agree to RideFlow&apos;s{' '}
                    <Link href="/terms" className="text-gray-400 hover:text-orange-400 underline transition-colors">Terms</Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-gray-400 hover:text-orange-400 underline transition-colors">Privacy Policy</Link>
                </p>

            </div>
        </div>
    );
};

export default RegisterPage;