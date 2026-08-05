'use client';

import React from 'react';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-gray-800 font-[Poppins,sans-serif] mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-2.5">
            <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="18" fill="#FF5A00" />
              <path d="M10 26L14 10H20C23.3 10 25 11.8 25 14.5C25 17.2 23 19 20.5 19.3L24 26H20.5L17.5 19.5H16.5L14.5 26H10Z" fill="white" />
              <path d="M16.5 17H19.5C21 17 22 16.2 22 14.8C22 13.4 21 12.5 19.5 12.5H16L16.5 17Z" fill="#FF5A00" />
            </svg>
            <span className="text-xl font-bold text-white tracking-tight">RideFlow</span>
          </Link>
          <p className="text-sm text-gray-400 leading-relaxed">
            India's #1 Ride-hailing platform. Fast, safe, and affordable rides at your doorstep, anytime, anywhere.
          </p>
        </div>

        {/* Company Links */}
        <div>
          <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Company</h3>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/about" className="hover:text-orange-500 transition-colors">About Us</Link></li>
            <li><Link href="/careers" className="hover:text-orange-500 transition-colors">Careers</Link></li>
            <li><Link href="/blog" className="hover:text-orange-500 transition-colors">Blog & Press</Link></li>
            <li><Link href="/safety" className="hover:text-orange-500 transition-colors">Safety</Link></li>
          </ul>
        </div>

        {/* Services */}
        <div>
          <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Services</h3>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/rides" className="hover:text-orange-500 transition-colors">City Rides</Link></li>
            <li><Link href="/outstation" className="hover:text-orange-500 transition-colors">Outstation</Link></li>
            <li><Link href="/rentals" className="hover:text-orange-500 transition-colors">Rental Cars</Link></li>
            <li><Link href="/drive" className="hover:text-orange-500 transition-colors">Become a Driver</Link></li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Support</h3>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/help" className="hover:text-orange-500 transition-colors">Help Center</Link></li>
            <li><Link href="/contact" className="hover:text-orange-500 transition-colors">Contact Us</Link></li>
            <li><Link href="/privacy" className="hover:text-orange-500 transition-colors">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-orange-500 transition-colors">Terms of Service</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800 py-6 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} RideFlow Technologies Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-gray-400">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-400">Terms</Link>
            <Link href="/cookies" className="hover:text-gray-400">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
