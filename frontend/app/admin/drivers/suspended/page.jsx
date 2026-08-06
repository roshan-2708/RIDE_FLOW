'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function SuspendedDriversPage() {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => { fetchSuspended(); }, []);

    const fetchSuspended = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/drivers?status=SUSPENDED');
            setDrivers(res.data.data || res.data.drivers || []);
        } catch {
            toast.error('Failed to load suspended drivers');
        } finally {
            setLoading(false);
        }
    };

    const handleReApprove = async (targetId) => {
        setActionLoading(targetId);
        try {
            await api.put(`/admin/drivers/${targetId}/approve`);
            toast.success('Driver re-approved!');
            setDrivers(prev => prev.filter(d => (d.userId || d.id) !== targetId));
        } catch {
            toast.error('Failed to re-approve driver');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return <p>Loading suspended drivers...</p>;

    return (
        <div>
            <h1>Suspended Drivers ({drivers.length})</h1>

            {drivers.length === 0 ? (
                <p style={{ marginTop: '16px', color: '#666' }}>No suspended drivers.</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                            <th style={{ padding: '12px 8px' }}>#</th>
                            <th style={{ padding: '12px 8px' }}>Name</th>
                            <th style={{ padding: '12px 8px' }}>Email</th>
                            <th style={{ padding: '12px 8px' }}>Phone</th>
                            <th style={{ padding: '12px 8px' }}>Vehicle</th>
                            <th style={{ padding: '12px 8px' }}>Status</th>
                            <th style={{ padding: '12px 8px' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {drivers.map((d, i) => {
                            const targetId = d.userId || d.id;
                            return (
                                <tr key={d.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '12px 8px' }}>{i + 1}</td>
                                    <td style={{ padding: '12px 8px', fontWeight: '600' }}>{d.user?.name || 'N/A'}</td>
                                    <td style={{ padding: '12px 8px' }}>{d.user?.email || 'N/A'}</td>
                                    <td style={{ padding: '12px 8px' }}>{d.user?.phone || 'N/A'}</td>
                                    <td style={{ padding: '12px 8px' }}>
                                        {d.vehicleType || 'N/A'} — {d.vehiclePlate || d.vehicleNumber || 'N/A'}
                                    </td>
                                    <td style={{ padding: '12px 8px', color: 'red', fontWeight: '600' }}>
                                        ⚫ SUSPENDED
                                    </td>
                                    <td style={{ padding: '12px 8px' }}>
                                        <button
                                            onClick={() => handleReApprove(targetId)}
                                            disabled={actionLoading === targetId}
                                        >
                                            ♻️ Re-Approve
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}