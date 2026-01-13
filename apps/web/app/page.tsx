'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export default function HomePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    date: '',
    time: '',
    gender: '',
    timezone: 'Asia/Bangkok',
    locationName: '',
    calendar: 'solar',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthInput: {
            date: form.date,
            time: form.time || undefined,
            gender: form.gender || undefined,
            timezone: form.timezone,
            locationName: form.locationName || undefined,
            calendar: form.calendar as 'solar' | 'lunar',
          },
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to submit');
      }
      const data = (await response.json()) as { id: string };
      router.push(`/submissions/${data.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(
        `${message}. Nếu gặp ERR_CONNECTION_REFUSED, hãy kiểm tra API đang chạy ở ${apiBase} và biến NEXT_PUBLIC_API_BASE_URL.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1>Tu Vi AI - Nhập ngày sinh</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          Ngày sinh (YYYY-MM-DD)
          <input
            required
            value={form.date}
            onChange={(e) => onChange('date', e.target.value)}
            placeholder="1990-01-01"
          />
        </label>
        <label>
          Giờ sinh (HH:mm)
          <input
            value={form.time}
            onChange={(e) => onChange('time', e.target.value)}
            placeholder="08:30"
          />
        </label>
        <label>
          Giới tính
          <input
            value={form.gender}
            onChange={(e) => onChange('gender', e.target.value)}
            placeholder="Nam / Nữ"
          />
        </label>
        <label>
          Múi giờ
          <input
            value={form.timezone}
            onChange={(e) => onChange('timezone', e.target.value)}
          />
        </label>
        <label>
          Địa điểm
          <input
            value={form.locationName}
            onChange={(e) => onChange('locationName', e.target.value)}
            placeholder="Hà Nội"
          />
        </label>
        <label>
          Lịch
          <select value={form.calendar} onChange={(e) => onChange('calendar', e.target.value)}>
            <option value="solar">Dương lịch</option>
            <option value="lunar">Âm lịch</option>
          </select>
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Đang gửi...' : 'Tạo lá số'}
        </button>
        {error ? <p style={{ color: 'red' }}>{error}</p> : null}
      </form>
    </main>
  );
}
