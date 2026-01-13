'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

type SubmissionResponse = {
  id: string;
  birthInput: Record<string, unknown>;
  chart?: { chartJson: Record<string, unknown> } | null;
  readings?: Array<{
    id: string;
    status: string;
    readingText?: string | null;
  }>;
};

type Reading = {
  id: string;
  status: string;
  readingText?: string | null;
};

export default function SubmissionDetail() {
  const params = useParams<{ id: string }>();
  const [submission, setSubmission] = useState<SubmissionResponse | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSubmission = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/submissions/${params.id}`);
      if (!response.ok) {
        setError('Không tìm thấy submission');
        setLoading(false);
        return;
      }
      const data = (await response.json()) as SubmissionResponse;
      setSubmission(data);
      const latestReading = data.readings?.[0];
      if (latestReading) {
        setReading(latestReading);
      }
      setLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(
        `${message}. Nếu gặp ERR_CONNECTION_REFUSED, hãy kiểm tra API đang chạy ở ${apiBase} và biến NEXT_PUBLIC_API_BASE_URL.`
      );
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  const pollReading = useCallback(
    async (readingId: string) => {
      const response = await fetch(`${apiBase}/readings/${readingId}`);
      if (response.ok) {
        const data = (await response.json()) as Reading;
        setReading(data);
      }
    },
    []
  );

  useEffect(() => {
    if (!reading || reading.status === 'DONE' || reading.status === 'FAILED') {
      return;
    }
    const interval = setInterval(() => {
      pollReading(reading.id);
    }, 1500);
    return () => clearInterval(interval);
  }, [reading, pollReading]);

  const onRequestReading = async () => {
    setError('');
    try {
      const response = await fetch(`${apiBase}/submissions/${params.id}/readings`, {
        method: 'POST',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error || 'Không thể tạo reading');
        return;
      }
      const data = (await response.json()) as { readingId: string };
      setReading({ id: data.readingId, status: 'QUEUED' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(
        `${message}. Nếu gặp ERR_CONNECTION_REFUSED, hãy kiểm tra API đang chạy ở ${apiBase} và biến NEXT_PUBLIC_API_BASE_URL.`
      );
    }
  };

  const chartJson = useMemo(() => JSON.stringify(submission?.chart?.chartJson, null, 2), [submission]);

  if (loading) {
    return <p>Đang tải...</p>;
  }

  if (!submission) {
    return <p>{error || 'Không có dữ liệu'}</p>;
  }

  return (
    <main style={{ maxWidth: 960, margin: '0 auto' }}>
      <h1>Submission {submission.id}</h1>
      <section>
        <h2>Birth Input</h2>
        <pre>{JSON.stringify(submission.birthInput, null, 2)}</pre>
      </section>
      <section>
        <h2>Chart</h2>
        <pre>{chartJson}</pre>
      </section>
      <section style={{ marginTop: 24 }}>
        <button onClick={onRequestReading}>Luận quẻ</button>
        {reading ? (
          <div style={{ marginTop: 12 }}>
            <p>Trạng thái: {reading.status}</p>
            {reading.readingText ? <pre>{reading.readingText}</pre> : null}
          </div>
        ) : (
          <p>Chưa có luận quẻ.</p>
        )}
      </section>
      {error ? <p style={{ color: 'red' }}>{error}</p> : null}
    </main>
  );
}
