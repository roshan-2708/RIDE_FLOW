'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function AdminsPage() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState([]);

  useEffect(() => { fetchAdmins(); }, []);

  const fetchAdmins = async () => {
    try {
      const res = await api.get('/admin/users?role=ADMIN');
      setAdmins(res.data.data || res.data.users || []);
    } catch (err) {
      console.error('Error fetching admins:', err);
    }
  };

  return (
    <div>
      <h1>Admins</h1>
      <p style={{ opacity: 0.7 }}>Total Administrator Accounts: {admins.length}</p>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
            <th style={{ padding: '12px 8px' }}>#</th>
            <th style={{ padding: '12px 8px' }}>Name</th>
            <th style={{ padding: '12px 8px' }}>Email</th>
            <th style={{ padding: '12px 8px' }}>Phone</th>
            <th style={{ padding: '12px 8px' }}>Email Verified</th>
            <th style={{ padding: '12px 8px' }}>Joined</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((a, i) => (
            <tr key={a.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px 8px' }}>{i + 1}</td>
              <td style={{ padding: '12px 8px', fontWeight: '600' }}>
                {a.name}
                {a.id === user?.id && <span style={{ color: '#6C63FF', marginLeft: '6px' }}>(You)</span>}
              </td>
              <td style={{ padding: '12px 8px' }}>{a.email}</td>
              <td style={{ padding: '12px 8px' }}>{a.phone}</td>
              <td style={{ padding: '12px 8px' }}>{a.isEmailVerified ? '✅ Verified' : '❌ Unverified'}</td>
              <td style={{ padding: '12px 8px' }}>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}