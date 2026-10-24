'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/lib/client';
import Shell from '@/components/Shell';

export default function SecurityPage() {
  const { user, loading } = useUser();
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState('');

  async function load() {
    const auditResponse = await fetch('/api/admin/audit-logs');
    if (auditResponse.ok) setLogs((await auditResponse.json()).logs || []);
    if (user?.role === 'admin') {
      const userResponse = await fetch('/api/admin/users');
      if (userResponse.ok) setUsers((await userResponse.json()).users || []);
    }
  }

  useEffect(() => { if (user && ['admin', 'auditor'].includes(user.role)) load(); }, [user]);

  async function updateAccess(target, role, status) {
    setMessage('');
    const response = await fetch(`/api/admin/users/${target.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, status }),
    });
    const data = await response.json();
    setMessage(response.ok ? 'Access updated.' : data.error || 'Update failed.');
    if (response.ok) load();
  }

  if (loading || !user) return null;
  if (!['admin', 'auditor'].includes(user.role)) return <Shell user={user}><div className="alert error">Access denied.</div></Shell>;

  return (
    <Shell user={user}>
      <div className="page-title">Security Center</div>
      <div className="page-sub">Role management and append-only security audit events.</div>
      {message && <div className="alert" style={{ margin: '16px 0' }}>{message}</div>}

      {user.role === 'admin' && <div className="card card-pad" style={{ marginBottom: 24, overflowX: 'auto' }}>
        <h2>Users and roles</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th align="left">User</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{users.map((entry) => <AccessRow key={entry.id} entry={entry} onSave={updateAccess} />)}</tbody>
        </table>
      </div>}

      <div className="card card-pad" style={{ overflowX: 'auto' }}>
        <h2>Recent audit events</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th align="left">Time</th><th align="left">Actor</th><th align="left">Action</th><th>Outcome</th><th align="left">Target</th></tr></thead>
          <tbody>{logs.map((log) => <tr key={log.id}><td>{new Date(log.created_at).toLocaleString()}</td><td>{log.actor_email || 'Anonymous'}</td><td>{log.action}</td><td>{log.outcome}</td><td>{log.target_type ? `${log.target_type} ${log.target_id || ''}` : '—'}</td></tr>)}</tbody>
        </table>
      </div>
    </Shell>
  );
}

function AccessRow({ entry, onSave }) {
  const [role, setRole] = useState(entry.role);
  const [status, setStatus] = useState(entry.status);
  return <tr><td>{entry.full_name}<br /><small>{entry.email}</small></td>
    <td><select value={role} onChange={(event) => setRole(event.target.value)}><option>customer</option><option>auditor</option><option>admin</option></select></td>
    <td><select value={status} onChange={(event) => setStatus(event.target.value)}><option>active</option><option>locked</option><option>disabled</option></select></td>
    <td><button className="btn" onClick={() => onSave(entry, role, status)}>Save</button></td></tr>;
}
