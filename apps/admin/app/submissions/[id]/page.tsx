'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import ReactECharts from 'echarts-for-react';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

type Correction = {
  id: string;
  type: string;
  severity: number;
  correctedText: string;
  notes?: string | null;
};

type Reading = {
  id: string;
  status: string;
  readingText?: string | null;
  corrections?: Correction[];
};

type SubmissionDetail = {
  id: string;
  birthInput: Record<string, unknown>;
  chart?: { chartJson: Record<string, unknown> } | null;
  readings: Reading[];
};

type ScorePayload = {
  logic: number;
  facts: number;
  style: number;
  completeness: number;
  consistency: number;
};

const emptyScores: ScorePayload = {
  logic: 5,
  facts: 5,
  style: 5,
  completeness: 5,
  consistency: 5,
};

function parseScores(notes?: string | null): ScorePayload | null {
  if (!notes) {
    return null;
  }
  try {
    const parsed = JSON.parse(notes) as { scores?: ScorePayload };
    return parsed.scores ?? null;
  } catch {
    return null;
  }
}

export default function AdminSubmissionDetail() {
  const params = useParams<{ id: string }>();
  const [token, setToken] = useState('');
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [error, setError] = useState('');
  const [correctionForm, setCorrectionForm] = useState({
    type: 'FACT',
    severity: 3,
    correctedText: '',
    notes: '',
  });
  const [scores, setScores] = useState<ScorePayload>(emptyScores);
  const [promptForm, setPromptForm] = useState({
    name: '',
    systemPrompt: '',
    temperature: '',
    maxOutputTokens: '',
    notes: '',
  });
  const [activateId, setActivateId] = useState('');

  const fetchDetail = useCallback(async () => {
    if (!token) {
      return;
    }
    setError('');
    const response = await fetch(`${apiBase}/admin/submissions/${params.id}`, {
      headers: { 'x-admin-token': token },
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error || 'Không thể tải dữ liệu');
      return;
    }
    const data = (await response.json()) as SubmissionDetail;
    setSubmission(data);
  }, [params.id, token]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const latestReading = submission?.readings?.[0];
  const scoreSummary = useMemo(() => {
    const allScores = submission?.readings
      ?.flatMap((reading) => reading.corrections || [])
      .map((correction) => parseScores(correction.notes))
      .filter(Boolean) as ScorePayload[] | undefined;
    if (!allScores || allScores.length === 0) {
      return emptyScores;
    }
    const totals = allScores.reduce(
      (acc, current) => {
        acc.logic += current.logic;
        acc.facts += current.facts;
        acc.style += current.style;
        acc.completeness += current.completeness;
        acc.consistency += current.consistency;
        return acc;
      },
      { ...emptyScores }
    );
    return {
      logic: totals.logic / allScores.length,
      facts: totals.facts / allScores.length,
      style: totals.style / allScores.length,
      completeness: totals.completeness / allScores.length,
      consistency: totals.consistency / allScores.length,
    };
  }, [submission]);

  const radarOption = useMemo(
    () => ({
      tooltip: {},
      radar: {
        indicator: [
          { name: 'Logic', max: 10 },
          { name: 'Facts', max: 10 },
          { name: 'Style', max: 10 },
          { name: 'Completeness', max: 10 },
          { name: 'Consistency', max: 10 },
        ],
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: [
                scoreSummary.logic,
                scoreSummary.facts,
                scoreSummary.style,
                scoreSummary.completeness,
                scoreSummary.consistency,
              ],
              name: 'Scores',
            },
          ],
        },
      ],
    }),
    [scoreSummary]
  );

  const submitCorrection = async () => {
    if (!latestReading) {
      setError('Chưa có reading để correction');
      return;
    }
    const payload = {
      type: correctionForm.type,
      severity: Number(correctionForm.severity),
      correctedText: correctionForm.correctedText,
      notes: JSON.stringify({ notes: correctionForm.notes, scores }),
    };
    const response = await fetch(`${apiBase}/admin/readings/${latestReading.id}/corrections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || 'Không thể tạo correction');
      return;
    }
    setCorrectionForm({ type: 'FACT', severity: 3, correctedText: '', notes: '' });
    setScores(emptyScores);
    fetchDetail();
  };

  const createPromptVersion = async () => {
    const payload = {
      name: promptForm.name,
      systemPrompt: promptForm.systemPrompt,
      temperature: promptForm.temperature ? Number(promptForm.temperature) : undefined,
      maxOutputTokens: promptForm.maxOutputTokens ? Number(promptForm.maxOutputTokens) : undefined,
      notes: promptForm.notes || undefined,
    };
    const response = await fetch(`${apiBase}/admin/prompt-versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || 'Không thể tạo prompt version');
      return;
    }
    const data = (await response.json()) as { id: string };
    setActivateId(data.id);
  };

  const activatePromptVersion = async () => {
    const response = await fetch(`${apiBase}/admin/prompt-versions/${activateId}/activate`, {
      method: 'PATCH',
      headers: { 'x-admin-token': token },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || 'Không thể activate prompt version');
      return;
    }
  };

  if (!token) {
    return (
      <main style={{ maxWidth: 960, margin: '0 auto' }}>
        <h1>Submission Detail</h1>
        <label>
          Admin Token
          <input value={token} onChange={(e) => setToken(e.target.value)} style={{ marginLeft: 8 }} />
        </label>
      </main>
    );
  }

  if (!submission) {
    return <p>{error || 'Đang tải...'}</p>;
  }

  return (
    <main style={{ maxWidth: 960, margin: '0 auto' }}>
      <h1>Submission {submission.id}</h1>
      {error ? <p style={{ color: 'red' }}>{error}</p> : null}
      <section>
        <h2>Birth Input</h2>
        <pre>{JSON.stringify(submission.birthInput, null, 2)}</pre>
      </section>
      <section>
        <h2>Chart JSON</h2>
        <pre>{JSON.stringify(submission.chart?.chartJson, null, 2)}</pre>
      </section>
      <section>
        <h2>Latest Reading</h2>
        <p>Status: {latestReading?.status || 'N/A'}</p>
        {latestReading?.readingText ? <pre>{latestReading.readingText}</pre> : <p>Chưa có</p>}
      </section>
      <section style={{ marginTop: 24 }}>
        <h2>Create Correction</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          <label>
            Type
            <select
              value={correctionForm.type}
              onChange={(e) => setCorrectionForm((prev) => ({ ...prev, type: e.target.value }))}
            >
              <option value="FACT">FACT</option>
              <option value="LOGIC">LOGIC</option>
              <option value="STYLE">STYLE</option>
              <option value="MISSING">MISSING</option>
              <option value="OTHER">OTHER</option>
            </select>
          </label>
          <label>
            Severity (1-5)
            <input
              type="number"
              min={1}
              max={5}
              value={correctionForm.severity}
              onChange={(e) =>
                setCorrectionForm((prev) => ({ ...prev, severity: Number(e.target.value) }))
              }
            />
          </label>
          <label>
            Corrected Text
            <textarea
              value={correctionForm.correctedText}
              onChange={(e) => setCorrectionForm((prev) => ({ ...prev, correctedText: e.target.value }))}
            />
          </label>
          <label>
            Notes
            <textarea
              value={correctionForm.notes}
              onChange={(e) => setCorrectionForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </label>
          <fieldset style={{ border: '1px solid #ddd', padding: 12 }}>
            <legend>Radar Scores (1-10)</legend>
            {Object.entries(scores).map(([key, value]) => (
              <label key={key} style={{ display: 'block' }}>
                {key}
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={value}
                  onChange={(e) =>
                    setScores((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                  }
                />
              </label>
            ))}
          </fieldset>
          <button onClick={submitCorrection}>Create Correction</button>
        </div>
      </section>
      <section style={{ marginTop: 24 }}>
        <h2>Radar Chart</h2>
        <ReactECharts option={radarOption} style={{ height: 320 }} />
      </section>
      <section style={{ marginTop: 24 }}>
        <h2>Prompt Versions</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          <label>
            Name
            <input value={promptForm.name} onChange={(e) => setPromptForm((p) => ({ ...p, name: e.target.value }))} />
          </label>
          <label>
            System Prompt
            <textarea
              value={promptForm.systemPrompt}
              onChange={(e) => setPromptForm((p) => ({ ...p, systemPrompt: e.target.value }))}
            />
          </label>
          <label>
            Temperature
            <input
              value={promptForm.temperature}
              onChange={(e) => setPromptForm((p) => ({ ...p, temperature: e.target.value }))}
            />
          </label>
          <label>
            Max Output Tokens
            <input
              value={promptForm.maxOutputTokens}
              onChange={(e) => setPromptForm((p) => ({ ...p, maxOutputTokens: e.target.value }))}
            />
          </label>
          <label>
            Notes
            <input value={promptForm.notes} onChange={(e) => setPromptForm((p) => ({ ...p, notes: e.target.value }))} />
          </label>
          <button onClick={createPromptVersion}>Create Prompt Version</button>
        </div>
        <div style={{ marginTop: 12 }}>
          <label>
            Activate Prompt Version ID
            <input value={activateId} onChange={(e) => setActivateId(e.target.value)} />
          </label>
          <button onClick={activatePromptVersion} style={{ marginLeft: 8 }}>
            Activate
          </button>
        </div>
      </section>
    </main>
  );
}
