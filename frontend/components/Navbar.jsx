'use client';

import { useState, useEffect } from 'react';
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname } from 'next/navigation';

const Navbar = () => {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setMenuOpen(false), 0);
        return () => clearTimeout(timer);
    }, [pathname]);

    const navLinks = [
        { label: 'Home', href: '/' },
        { label: 'About Us', href: '/about' },
        { label: 'Safety', href: '/safety' },
        { label: 'Careers', href: '/careers' },
        { label: 'Blog & Press', href: '/blog' },
        { label: 'Contact Us', href: '/contact' },
    ];

    return (
        <>
            {/* ── Navbar ── */}
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 font-[Poppins,sans-serif]
                    ${scrolled
                        ? 'bg-white shadow-md border-b border-gray-100'
                        : 'bg-white/10 backdrop-blur-md border-b border-white/20'
                    }`}
            >
                <div className="max-w-7xl mx-auto px-6 h-[70px] flex items-center gap-8">

                    {/* ── Logo ── */}
                    <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
                        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                            <circle cx="18" cy="18" r="18" fill="#FF5A00" />
                            <path d="M10 26L14 10H20C23.3 10 25 11.8 25 14.5C25 17.2 23 19 20.5 19.3L24 26H20.5L17.5 19.5H16.5L14.5 26H10Z" fill="white" />
                            <path d="M16.5 17H19.5C21 17 22 16.2 22 14.8C22 13.4 21 12.5 19.5 12.5H16L16.5 17Z" fill="#FF5A00" />
                        </svg>
                        <span className="text-[1.3rem] font-bold tracking-tight text-gray-900">
                            RideFlow
                        </span>
                    </Link>

                    {/* ── Desktop Nav Links ── */}
                    <ul className="hidden lg:flex items-center gap-1 flex-1 list-none m-0 p-0">
                        {navLinks.map(({ label, href }) => {
                            const isActive = pathname === href;
                            return (
                                <li key={href}>
                                    <Link
                                        href={href}
                                        className={`relative px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap
                                            after:content-[''] after:absolute after:bottom-0.5 after:left-3.5 after:right-3.5 after:h-0.5
                                            after:bg-orange-500 after:rounded-full after:transition-transform after:duration-250
                                            ${isActive
                                                ? 'text-orange-500 font-semibold after:scale-x-100'
                                                : 'text-gray-600 hover:text-orange-500 hover:bg-orange-50 after:scale-x-0 hover:after:scale-x-100'
                                            }`}
                                    >
                                        {label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>

                    {/* ── Auth Buttons ── */}
                    <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
                        {user ? (
                            <>
                                {user.role === 'DRIVER' && (
                                    <Link
                                        href="/dashboard"
                                        className="px-4 py-2 rounded-full text-sm font-semibold bg-orange-500/10 text-orange-600 border border-orange-200 hover:bg-orange-500 hover:text-white transition-all duration-200"
                                    >
                                        🚕 Driver Dashboard
                                    </Link>
                                )}
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-400 text-white font-bold text-sm flex items-center justify-center shadow-[0_2px_8px_rgba(255,90,0,0.4)]">
                                    {user.name?.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-gray-700">
                                    Hi, {user.name?.split(' ')[0]}
                                </span>
                                <button
                                    onClick={logout}
                                    className="px-4 py-2 rounded-full text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/auth/login"
                                    className="px-5 py-2 rounded-full text-sm font-semibold border border-gray-300 text-gray-700 transition-all duration-200 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50"
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/auth/register"
                                    className="px-5 py-2 rounded-full text-sm font-semibold bg-orange-500 text-white shadow-[0_4px_14px_rgba(255,90,0,0.35)] transition-all duration-200 hover:bg-orange-600 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(255,90,0,0.45)]"
                                >
                                    Sign Up
                                </Link>
                            </>
                        )}
                    </div>

                    {/* ── Hamburger ── */}
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle menu"
                        aria-expanded={menuOpen}
                        className="lg:hidden ml-auto p-2 rounded-lg hover:bg-black/5 transition-colors duration-200 flex flex-col gap-[5px]"
                    >
                        <span className={`block w-6 h-[2.5px] bg-gray-800 rounded-sm transition-transform duration-300
                            ${menuOpen ? 'translate-y-[7.5px] rotate-45' : ''}`}
                        />
                        <span className={`block w-6 h-[2.5px] bg-gray-800 rounded-sm transition-all duration-300
                            ${menuOpen ? 'opacity-0 scale-x-0' : ''}`}
                        />
                        <span className={`block w-6 h-[2.5px] bg-gray-800 rounded-sm transition-transform duration-300
                            ${menuOpen ? '-translate-y-[7.5px] -rotate-45' : ''}`}
                        />
                    </button>

                </div>
            </nav>

            {/* ── Mobile Backdrop ── */}
            <div
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
                className={`lg:hidden fixed inset-0 z-40 bg-black/40 transition-opacity duration-300
                    ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            />

            {/* ── Mobile Drawer ── */}
            <div
                className={`lg:hidden fixed top-0 right-0 h-dvh w-[min(340px,85vw)] bg-white z-50 shadow-2xl
                    flex flex-col pt-20 px-7 pb-10 overflow-y-auto
                    transition-transform duration-350 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]
                    ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Mobile Links */}
                <ul className="list-none m-0 p-0 flex flex-col gap-1 mb-8">
                    {navLinks.map(({ label, href }) => {
                        const isActive = pathname === href;
                        return (
                            <li key={href}>
                                <Link
                                    href={href}
                                    className={`block px-4 py-3.5 rounded-xl text-base font-medium transition-all duration-200
                                        ${isActive
                                            ? 'bg-orange-50 text-orange-500 font-semibold'
                                            : 'text-gray-600 hover:bg-orange-50 hover:text-orange-500'
                                        }`}
                                >
                                    {label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                {/* Mobile Auth */}
                <div className="flex flex-col gap-3 border-t border-gray-100 pt-6">
                    {user ? (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-400 text-white font-bold text-base flex items-center justify-center shadow-md">
                                    {user.name?.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-base font-semibold text-gray-900">
                                    Hi, {user.name?.split(' ')[0]} 👋
                                </span>
                            </div>
                            <button
                                onClick={logout}
                                className="w-full py-3 rounded-full text-sm font-semibold text-center border border-red-200 text-red-600 hover:bg-red-50 transition-all duration-200"
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <>
                            <Link
                                href="/auth/login"
                                className="w-full py-3 rounded-full text-sm font-semibold text-center border border-gray-300 text-gray-700 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50 transition-all duration-200"
                            >
                                Login
                            </Link>
                            <Link
                                href="/auth/register"
                                className="w-full py-3 rounded-full text-sm font-semibold text-center bg-orange-500 text-white shadow-[0_4px_14px_rgba(255,90,0,0.35)] hover:bg-orange-600 transition-all duration-200"
                            >
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default Navbar;