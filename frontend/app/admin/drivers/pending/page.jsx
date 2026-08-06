'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function PendingDriversPage() {
    const router = useRouter();
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [rejectModal, setRejectModal] = useState({ open: false, targetId: null });
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => { fetchPending(); }, []);

    const fetchPending = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/drivers/pending');
            setDrivers(res.data.data || res.data.drivers || []);
        } catch {
            toast.error('Failed to load pending applications');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (targetId) => {
        setActionLoading(targetId);
        try {
            await api.put(`/admin/drivers/${targetId}/approve`);
            toast.success('✅ Driver approved!');
            setDrivers(prev => prev.filter(d => (d.userId || d.id) !== targetId));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to approve');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) return toast.error('Please enter a rejection reason');
        setActionLoading(rejectModal.targetId);
        try {
            await api.put(`/admin/drivers/${rejectModal.targetId}/reject`, { reason: rejectReason });
            toast.success('Driver application rejected');
            setDrivers(prev => prev.filter(d => (d.userId || d.id) !== rejectModal.targetId));
            setRejectModal({ open: false, targetId: null });
            setRejectReason('');
        } catch {
            toast.error('Failed to reject application');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return <p>Loading pending applications...</p>;

    return (
        <div>
            <h1>Pending Driver Applications ({drivers.length})</h1>

            {drivers.length === 0 ? (
                <p style={{ marginTop: '16px', color: '#4CAF50', fontWeight: '600' }}>✅ No pending driver applications!</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                            <th style={{ padding: '12px 8px' }}>#</th>
                            <th style={{ padding: '12px 8px' }}>Driver Name</th>
                            <th style={{ padding: '12px 8px' }}>Email</th>
                            <th style={{ padding: '12px 8px' }}>Phone</th>
                            <th style={{ padding: '12px 8px' }}>Vehicle</th>
                            <th style={{ padding: '12px 8px' }}>Applied On</th>
                            <th style={{ padding: '12px 8px' }}>Documents</th>
                            <th style={{ padding: '12px 8px' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {drivers.map((d, i) => {
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
                                        <button onClick={() => router.push(`/admin/drivers/${targetId}`)}>
                                            👁️ View Docs
                                        </button>
                                    </td>
                                    <td style={{ padding: '12px 8px', display: 'flex', gap: '6px' }}>
                                        <button
                                            onClick={() => handleApprove(targetId)}
                                            disabled={actionLoading === targetId}
                                        >
                                            ✅ Approve
                                        </button>
                                        <button
                                            onClick={() => setRejectModal({ open: true, targetId })}
                                        >
                                            ❌ Reject
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}

            {/* Reject Modal */}
            {rejectModal.open && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 999
                }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '12px', minWidth: '400px' }}>
                        <h3>Reject Driver</h3>
                        <p>Please provide a reason for rejection:</p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="e.g. Documents not clear, License expired..."
                            rows={4}
                            style={{ width: '100%', padding: '8px', marginTop: '12px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                            <button onClick={handleReject} disabled={actionLoading}>
                                Confirm Reject
                            </button>
                            <button onClick={() => { setRejectModal({ open: false, targetId: null }); setRejectReason(''); }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}