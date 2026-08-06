'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function AllDriversPage() {
    const router = useRouter();
    const [drivers, setDrivers] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => { fetchDrivers(); }, [statusFilter]);

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/drivers?status=${statusFilter}`);
            setDrivers(res.data.data || res.data.drivers || []);
        } catch (err) {
            console.error('Error fetching drivers:', err);
            toast.error('Failed to load drivers');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (targetId) => {
        setActionLoading(targetId);
        try {
            await api.put(`/admin/drivers/${targetId}/approve`);
            toast.success('Driver approved!');
            fetchDrivers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to approve');
        } finally {
            setActionLoading(null);
        }
    };

    const handleSuspend = async (targetId) => {
        const reason = prompt('Reason for suspension?');
        if (!reason) return;
        setActionLoading(targetId);
        try {
            await api.put(`/admin/drivers/${targetId}/suspend`, { reason });
            toast.success('Driver suspended');
            fetchDrivers();
        } catch {
            toast.error('Failed to suspend driver');
        } finally {
            setActionLoading(null);
        }
    };

    const filtered = drivers.filter(d => {
        const name = d.user?.name || '';
        const email = d.user?.email || '';
        const plate = d.vehiclePlate || d.vehicleNumber || '';
        const query = search.toLowerCase();
        return name.toLowerCase().includes(query) || email.toLowerCase().includes(query) || plate.toLowerCase().includes(query);
    });

    const statusBadge = {
        PENDING: '🟡 PENDING',
        APPROVED: '🟢 APPROVED',
        REJECTED: '🔴 REJECTED',
        SUSPENDED: '⚫ SUSPENDED'
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Drivers ({drivers.length})</h1>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', margin: '16px 0' }}>
                <input
                    type="text"
                    placeholder="Search by name, email, vehicle plate..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ padding: '8px 12px', flex: 1 }}
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ padding: '8px 12px' }}
                >
                    <option value="">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="SUSPENDED">Suspended</option>
                </select>
                <button onClick={() => { setStatusFilter(''); setSearch(''); }}>Reset</button>
            </div>

            {/* Table */}
            {loading ? <p>Loading...</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                            <th style={{ padding: '12px 8px' }}>#</th>
                            <th style={{ padding: '12px 8px' }}>Driver Name</th>
                            <th style={{ padding: '12px 8px' }}>Email</th>
                            <th style={{ padding: '12px 8px' }}>Phone</th>
                            <th style={{ padding: '12px 8px' }}>Vehicle</th>
                            <th style={{ padding: '12px 8px' }}>Signup Date</th>
                            <th style={{ padding: '12px 8px' }}>Status</th>
                            <th style={{ padding: '12px 8px' }}>Documents</th>
                            <th style={{ padding: '12px 8px' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((d, i) => {
                            const targetId = d.userId || d.id;
                            const createdAt = d.user?.createdAt || d.createdAt;
                            return (
                                <tr key={d.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '12px 8px' }}>{i + 1}</td>
                                    <td style={{ padding: '12px 8px', fontWeight: '600' }}>{d.user?.name || 'N/A'}</td>
                                    <td style={{ padding: '12px 8px' }}>{d.user?.email || 'N/A'}</td>
                                    <td style={{ padding: '12px 8px' }}>{d.user?.phone || 'N/A'}</td>
                                    <td style={{ padding: '12px 8px' }}>
                                        {d.vehicleType || 'N/A'} — {d.vehiclePlate || d.vehicleNumber || 'N/A'}
                                    </td>
                                    <td style={{ padding: '12px 8px' }}>
                                        {createdAt ? new Date(createdAt).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td style={{ padding: '12px 8px' }}>
                                        {statusBadge[d.status] || d.status}
                                    </td>
                                    <td style={{ padding: '12px 8px' }}>
                                        <button onClick={() => router.push(`/admin/drivers/${targetId}`)}>
                                            👁️ View Docs
                                        </button>
                                    </td>
                                    <td style={{ padding: '12px 8px', display: 'flex', gap: '6px' }}>
                                        {d.status === 'PENDING' && (
                                            <button
                                                onClick={() => handleApprove(targetId)}
                                                disabled={actionLoading === targetId}
                                            >
                                                ✅ Approve
                                            </button>
                                        )}
                                        {d.status === 'APPROVED' && (
                                            <button
                                                onClick={() => handleSuspend(targetId)}
                                                disabled={actionLoading === targetId}
                                            >
                                                🚫 Suspend
                                            </button>
                                        )}
                                        {(d.status === 'REJECTED' || d.status === 'SUSPENDED') && (
                                            <button
                                                onClick={() => handleApprove(targetId)}
                                                disabled={actionLoading === targetId}
                                            >
                                                ♻️ Re-Approve
                                            </button>
                                        )}
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