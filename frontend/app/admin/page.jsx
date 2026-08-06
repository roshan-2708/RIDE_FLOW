'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);

    useEffect(() => { fetchStats(); }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/admin/stats');
            setStats(res.data.stats);
        } catch (err) {
            console.error('Error fetching admin stats:', err);
        }
    };

    if (!stats) return <p>Loading stats...</p>;

    const revenue = stats.totalCollection ?? stats.totalRevenue ?? 0;
    const totalRides = stats.totalRide ?? stats.totalRides ?? 0;

    const cards = [
        { label: 'Total Users', value: stats.totalUsers ?? 0, icon: '👥' },
        { label: 'Total Riders', value: stats.totalRiders ?? 0, icon: '🧑' },
        { label: 'Total Drivers', value: stats.totalDrivers ?? 0, icon: '🚗' },
        { label: 'Pending Approvals', value: stats.pendingDrivers ?? 0, icon: '⏳' },
        { label: 'Active Rides', value: stats.activeRides ?? 0, icon: '📍' },
        { label: 'Completed Rides', value: stats.completedRides ?? 0, icon: '✅' },
        { label: 'Total Revenue', value: `₹${Number(revenue).toFixed(0)}`, icon: '💰' },
        { label: 'Total Rides', value: totalRides, icon: '🗺️' },
    ];

    return (
        <div>
            <h1>Dashboard</h1>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginTop: '16px' }}>
                {cards.map((card) => (
                    <div key={card.label} style={{ border: '1px solid #ccc', borderRadius: '12px', padding: '20px' }}>
                        <div style={{ fontSize: '28px' }}>{card.icon}</div>
                        <div style={{ fontSize: '28px', fontWeight: '700', marginTop: '8px' }}>{card.value}</div>
                        <div style={{ fontSize: '13px', opacity: 0.6, marginTop: '4px' }}>{card.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}