'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

// Sidebar nav items
const navItems = [
    {
        section: 'MAIN',
        links: [
            { label: 'Dashboard', href: '/admin', icon: '📊' },
            { label: 'Live City Radar', href: '/admin/map', icon: '🌐' },
            { label: 'Fare Rates', href: '/admin/fares', icon: '💰' }
        ]
    },
    {
        section: 'MEMBERS',
        links: [
            { label: 'Admins', href: '/admin/admins', icon: '👑' },
            { label: 'Users', href: '/admin/users', icon: '👥' },
            {
                label: 'Drivers', icon: '🚗',
                children: [
                    { label: 'All Drivers', href: '/admin/drivers' },
                    { label: 'Pending', href: '/admin/drivers/pending' },
                    { label: 'Suspended', href: '/admin/drivers/suspended' }
                ]
            }
        ]
    }
];

export default function AdminLayout({ children }) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [driversOpen, setDriversOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push('/auth/login');
        if (!loading && user && user.role !== 'ADMIN') router.push('/dashboard');
        // Auto-open drivers submenu if on a drivers page
        if (pathname.includes('/admin/drivers')) setDriversOpen(true);
    }, [user, loading, pathname]);

    if (loading || !user) return <p>Loading...</p>;

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>

            {/* ── SIDEBAR ── */}
            <aside style={{
                width: '240px',
                minHeight: '100vh',
                borderRight: '1px solid #ccc',
                padding: '16px',
                flexShrink: 0
            }}>
                {/* Logo */}
                <div style={{ marginBottom: '24px', fontWeight: 'bold', fontSize: '20px' }}>
                    🚗 RideFlow
                </div>

                {/* Search (UI only) */}
                <input type="text" placeholder="Search..." style={{ width: '100%', marginBottom: '20px', padding: '8px' }} />

                {/* Nav Sections */}
                {navItems.map((section) => (
                    <div key={section.section} style={{ marginBottom: '20px' }}>
                        <p style={{ fontSize: '11px', fontWeight: '700', opacity: 0.5, marginBottom: '8px' }}>
                            {section.section}
                        </p>

                        {section.links.map((item) => (
                            <div key={item.label}>
                                {/* Regular link */}
                                {!item.children && (
                                    <Link
                                        href={item.href}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            textDecoration: 'none',
                                            marginBottom: '4px',
                                            fontWeight: pathname === item.href ? '700' : '400',
                                            background: pathname === item.href ? '#6C63FF' : 'transparent',
                                            color: pathname === item.href ? 'white' : 'inherit'
                                        }}
                                    >
                                        {item.icon} {item.label}
                                    </Link>
                                )}

                                {/* Dropdown (Drivers) */}
                                {item.children && (
                                    <div>
                                        <button
                                            onClick={() => setDriversOpen(!driversOpen)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                width: '100%', padding: '10px 12px', borderRadius: '8px',
                                                background: 'transparent', border: 'none', cursor: 'pointer',
                                                textAlign: 'left', fontWeight: '400', marginBottom: '4px'
                                            }}
                                        >
                                            {item.icon} {item.label} {driversOpen ? '▲' : '▼'}
                                        </button>

                                        {driversOpen && (
                                            <div style={{ paddingLeft: '24px' }}>
                                                {item.children.map((child) => (
                                                    <Link
                                                        key={child.href}
                                                        href={child.href}
                                                        style={{
                                                            display: 'block',
                                                            padding: '8px 12px',
                                                            borderRadius: '8px',
                                                            textDecoration: 'none',
                                                            marginBottom: '2px',
                                                            fontWeight: pathname === child.href ? '700' : '400',
                                                            background: pathname === child.href ? '#6C63FF' : 'transparent',
                                                            color: pathname === child.href ? 'white' : 'inherit'
                                                        }}
                                                    >
                                                        {child.label}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}

            </aside>

            {/* ── MAIN CONTENT ── */}
            <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                {/* Top bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <p style={{ fontWeight: '700', fontSize: '16px' }}>{user.name}</p>
                        <p style={{ fontSize: '12px', opacity: 0.5 }}>Super Administrator</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <span>🔔</span>
                        <span>👤</span>
                    </div>
                </div>

                {/* Page content renders here */}
                {children}
            </main>
        </div>
    );
}