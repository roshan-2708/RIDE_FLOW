'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function SingleDriverApplicationPage() {
    const { id } = useParams();
    const router = useRouter();
    const [driver, setDriver] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [rejectModal, setRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        if (id) fetchDriver();
    }, [id]);

    const fetchDriver = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/drivers/${id}`);
            setDriver(res.data.data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load driver details');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        setActionLoading(true);
        try {
            await api.put(`/admin/drivers/${id}/approve`);
            toast.success('✅ Driver approved successfully!');
            fetchDriver();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to approve driver');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) return toast.error('Please enter a rejection reason');
        setActionLoading(true);
        try {
            await api.put(`/admin/drivers/${id}/reject`, { reason: rejectReason });
            toast.success('Driver application rejected');
            setRejectModal(false);
            setRejectReason('');
            fetchDriver();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to reject application');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSuspend = async () => {
        const reason = prompt('Reason for suspension?');
        if (!reason) return;
        setActionLoading(true);
        try {
            await api.put(`/admin/drivers/${id}/suspend`, { reason });
            toast.success('Driver suspended');
            fetchDriver();
        } catch {
            toast.error('Failed to suspend driver');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <p style={{ padding: '24px' }}>Loading driver documents and profile...</p>;
    if (!driver) return <p style={{ padding: '24px' }}>Driver profile not found.</p>;

    const statusBadgeStyle = {
        PENDING: { bg: '#FFF9C4', color: '#F57F17' },
        APPROVED: { bg: '#E8F5E9', color: '#2E7D32' },
        REJECTED: { bg: '#FFEBEE', color: '#C62828' },
        SUSPENDED: { bg: '#E0E0E0', color: '#424242' }
    };

    const currentBadge = statusBadgeStyle[driver.status] || { bg: '#EEE', color: '#333' };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
            {/* Header / Back */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <button
                    onClick={() => router.back()}
                    style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #ccc' }}
                >
                    ← Back to Drivers
                </button>

                <span style={{
                    padding: '6px 16px',
                    borderRadius: '20px',
                    fontWeight: '700',
                    fontSize: '14px',
                    backgroundColor: currentBadge.bg,
                    color: currentBadge.color
                }}>
                    STATUS: {driver.status}
                </span>
            </div>

            <h1>Driver Verification & Application Review</h1>

            {/* Applicant Personal Info */}
            <div style={{ border: '1px solid #E0E0E0', borderRadius: '12px', padding: '20px', marginTop: '20px', background: '#FAFAFA' }}>
                <h3 style={{ marginBottom: '12px' }}>👤 Applicant Profile</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><strong>Full Name:</strong> {driver.user?.name || 'N/A'}</div>
                    <div><strong>Email:</strong> {driver.user?.email || 'N/A'}</div>
                    <div><strong>Phone:</strong> {driver.user?.phone || 'N/A'}</div>
                    <div><strong>Applied Date:</strong> {driver.createdAt ? new Date(driver.createdAt).toLocaleString() : 'N/A'}</div>
                </div>
            </div>

            {/* Vehicle Details */}
            <div style={{ border: '1px solid #E0E0E0', borderRadius: '12px', padding: '20px', marginTop: '20px', background: '#FAFAFA' }}>
                <h3 style={{ marginBottom: '12px' }}>🚗 Vehicle & License Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><strong>Vehicle Type:</strong> {driver.vehicleType || 'N/A'}</div>
                    <div><strong>Plate Number:</strong> {driver.vehiclePlate || 'N/A'}</div>
                    <div><strong>Model:</strong> {driver.vehicleModel || 'N/A'}</div>
                    <div><strong>Color:</strong> {driver.vehicleColor || 'N/A'}</div>
                    <div><strong>License Number:</strong> {driver.licenseNumber || 'N/A'}</div>
                    <div><strong>Availability:</strong> {driver.availability || 'OFFLINE'}</div>
                </div>
            </div>

            {/* Document Photos Verification */}
            <div style={{ marginTop: '24px' }}>
                <h3 style={{ marginBottom: '16px' }}>📄 Uploaded Documents Inspection</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                    
                    {/* License Photo */}
                    <div style={{ border: '1px solid #DDD', borderRadius: '8px', padding: '12px', background: '#FFF' }}>
                        <p style={{ fontWeight: '600', marginBottom: '8px' }}>💳 Driving License</p>
                        {driver.licensePhoto ? (
                            <img
                                src={driver.licensePhoto.startsWith('http') ? driver.licensePhoto : `http://localhost:5000${driver.licensePhoto.startsWith('/') ? '' : '/'}${driver.licensePhoto}`}
                                alt="License Photo"
                                style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '6px' }}
                            />
                        ) : (
                            <p style={{ color: '#999', padding: '40px 0', textAlign: 'center' }}>No image uploaded</p>
                        )}
                    </div>

                    {/* RC Photo */}
                    <div style={{ border: '1px solid #DDD', borderRadius: '8px', padding: '12px', background: '#FFF' }}>
                        <p style={{ fontWeight: '600', marginBottom: '8px' }}>📜 Vehicle RC</p>
                        {driver.rcPhoto ? (
                            <img
                                src={driver.rcPhoto.startsWith('http') ? driver.rcPhoto : `http://localhost:5000${driver.rcPhoto.startsWith('/') ? '' : '/'}${driver.rcPhoto}`}
                                alt="RC Photo"
                                style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '6px' }}
                            />
                        ) : (
                            <p style={{ color: '#999', padding: '40px 0', textAlign: 'center' }}>No image uploaded</p>
                        )}
                    </div>

                    {/* Vehicle Photo */}
                    <div style={{ border: '1px solid #DDD', borderRadius: '8px', padding: '12px', background: '#FFF' }}>
                        <p style={{ fontWeight: '600', marginBottom: '8px' }}>🚘 Vehicle Photo</p>
                        {driver.vehiclePhoto ? (
                            <img
                                src={driver.vehiclePhoto.startsWith('http') ? driver.vehiclePhoto : `http://localhost:5000${driver.vehiclePhoto.startsWith('/') ? '' : '/'}${driver.vehiclePhoto}`}
                                alt="Vehicle Photo"
                                style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '6px' }}
                            />
                        ) : (
                            <p style={{ color: '#999', padding: '40px 0', textAlign: 'center' }}>No image uploaded</p>
                        )}
                    </div>
                </div>
            </div>


            {/* Admin Actions Bar */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '30px', borderTop: '1px solid #DDD', paddingTop: '20px' }}>
                {driver.status !== 'APPROVED' && (
                    <button
                        onClick={handleApprove}
                        disabled={actionLoading}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#2E7D32',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        ✅ Approve Application
                    </button>
                )}

                {driver.status === 'PENDING' && (
                    <button
                        onClick={() => setRejectModal(true)}
                        disabled={actionLoading}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#C62828',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        ❌ Reject Application
                    </button>
                )}

                {driver.status === 'APPROVED' && (
                    <button
                        onClick={handleSuspend}
                        disabled={actionLoading}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#424242',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        🚫 Suspend Driver
                    </button>
                )}
            </div>

            {/* Reject Modal */}
            {rejectModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 999
                }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '12px', minWidth: '400px' }}>
                        <h3>Reject Application</h3>
                        <p>Please provide a reason for rejecting this application:</p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="e.g. License photo blurred, Vehicle plate mismatch..."
                            rows={4}
                            style={{ width: '100%', padding: '8px', marginTop: '12px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                            <button onClick={handleReject} disabled={actionLoading} style={{ padding: '8px 16px', background: '#C62828', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                Confirm Reject
                            </button>
                            <button onClick={() => setRejectModal(false)} style={{ padding: '8px 16px', background: '#EEE', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
