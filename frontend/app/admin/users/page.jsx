'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [roleFilter, setRoleFilter] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchUsers(); }, [roleFilter]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/users?role=${roleFilter}`);
            const userList = res.data.data || res.data.users || [];
            const userTotal = res.data.count ?? res.data.total ?? userList.length;
            setUsers(userList);
            setTotal(userTotal);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    // Client-side search filter
    const filtered = users.filter(u =>
        (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.phone || '').includes(search)
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Users ({total})</h1>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', margin: '16px 0' }}>
                <input
                    type="text"
                    placeholder="Search by name, email, phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ padding: '8px 12px', flex: 1 }}
                />
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    style={{ padding: '8px 12px' }}
                >
                    <option value="">All Roles</option>
                    <option value="RIDER">Riders</option>
                    <option value="DRIVER">Drivers</option>
                    <option value="ADMIN">Admins</option>
                </select>
                <button onClick={fetchUsers}>Refresh</button>
                <button onClick={() => { setRoleFilter(''); setSearch(''); }}>Reset</button>
            </div>

            {/* Table */}
            {loading ? <p>Loading...</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                            <th style={{ padding: '12px 8px' }}>#</th>
                            <th style={{ padding: '12px 8px' }}>Name</th>
                            <th style={{ padding: '12px 8px' }}>Email</th>
                            <th style={{ padding: '12px 8px' }}>Phone</th>
                            <th style={{ padding: '12px 8px' }}>Role</th>
                            <th style={{ padding: '12px 8px' }}>Email Verified</th>
                            <th style={{ padding: '12px 8px' }}>Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((u, i) => (
                            <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px 8px' }}>{i + 1}</td>
                                <td style={{ padding: '12px 8px' }}>{u.name}</td>
                                <td style={{ padding: '12px 8px' }}>{u.email}</td>
                                <td style={{ padding: '12px 8px' }}>{u.phone}</td>
                                <td style={{ padding: '12px 8px' }}>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        background: u.role === 'ADMIN' ? '#6C63FF' : u.role === 'DRIVER' ? '#4CAF50' : '#E0E0E0',
                                        color: u.role === 'RIDER' ? '#333' : 'white'
                                    }}>{u.role}</span>
                                </td>
                                <td style={{ padding: '12px 8px' }}>{u.isEmailVerified ? '✅ Verified' : '❌ Unverified'}</td>
                                <td style={{ padding: '12px 8px' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
