'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

type Submission = {
  id: string;
  createdAt: string;
  birthInput: Record<string, unknown>;
  readings?: Array<{ status: string }>;
};

export default function AdminHome() {
  const [token, setToken] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      return;
    }
    const load = async () => {
      setError('');
      const response = await fetch(`${apiBase}/admin/submissions`, {
        headers: { 'x-admin-token': token },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error || 'Không thể tải submissions');
        return;
      }
      const data = (await response.json()) as Submission[];
      setSubmissions(data);
    };
    load();
  }, [token]);

  return (
    <main style={{ maxWidth: 960, margin: '0 auto' }}>
      <h1>Admin Submissions</h1>
      <label>
        Admin Token
        <input value={token} onChange={(e) => setToken(e.target.value)} style={{ marginLeft: 8 }} />
      </label>
      {error ? <p style={{ color: 'red' }}>{error}</p> : null}
      <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>ID</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Created</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((submission) => (
            <tr key={submission.id}>
              <td style={{ padding: '8px 0' }}>
                <Link href={`/submissions/${submission.id}`}>{submission.id}</Link>
              </td>
              <td>{new Date(submission.createdAt).toLocaleString()}</td>
              <td>{submission.readings?.[0]?.status || 'CHART_READY'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
