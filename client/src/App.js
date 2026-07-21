import './App.css';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import axios from 'axios';
import PurpleGridBackground from './PurpleGridBackground';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function ErrorBox({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div
      style={{
        marginTop: 16,
        background: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        color: '#fca5a5',
        padding: 12,
        borderRadius: 12,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'center',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ lineHeight: 1.4, textAlign: 'left' }}>
        <strong style={{ display: 'block', marginBottom: 2 }}>Error</strong>
        <div>{message.replace(/\*/g, '')}</div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        style={{
          border: 'none',
          background: 'transparent',
          color: '#fca5a5',
          fontSize: 20,
          lineHeight: 1,
          cursor: 'pointer',
          padding: 4,
        }}
      >
        ×
      </button>
    </div>
  );
}

function formatKB(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n)) return '-';
  return `${(n / 1024).toFixed(1)} KB`;
}

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value ?? '-');
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(text, max = 200) {
  const s = String(text ?? '');
  if (s.length <= max) return s;
  return `${s.slice(0, max)}...`;
}

function ResultsView({ result }) {
  const analysis = result.analysisResult || result;
  const rowCount = analysis.row_count ?? 0;
  const columnNames = Array.isArray(analysis.column_names) ? analysis.column_names : [];
  const columnCount = analysis.column_count ?? columnNames.length;
  
  const topCategories = analysis.top_categories && typeof analysis.top_categories === 'object'
    ? analysis.top_categories
    : {};
  const missingValues = analysis.missing_values && typeof analysis.missing_values === 'object'
    ? analysis.missing_values
    : {};
  
  // Strip all asterisks from Groq AI insights text
  const rawInsights = result.insights || '';
  const cleanInsights = rawInsights.replace(/\*/g, '');

  // Chart 1: Rows vs Columns Data Chart
  const dimensionsChartData = {
    labels: ['Rows', 'Columns'],
    datasets: [
      {
        label: 'Count',
        data: [rowCount, columnCount],
        backgroundColor: ['rgba(168, 85, 247, 0.75)', 'rgba(236, 72, 153, 0.75)'],
        borderColor: ['rgb(192, 132, 252)', 'rgb(244, 114, 182)'],
        borderWidth: 1.5,
        borderRadius: 8,
      },
    ],
  };

  const dimensionsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Dataset Dimensions (Rows & Columns)', color: '#e9d5ff', font: { size: 14, weight: '600' } },
    },
    scales: {
      x: {
        ticks: { color: '#c084fc' },
        grid: { color: 'rgba(168, 85, 247, 0.15)' }
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#c084fc' },
        grid: { color: 'rgba(168, 85, 247, 0.15)' }
      },
    },
  };

  // Chart 2: Top Values Visualization Chart
  const topValuesChartData = {
    labels: Object.keys(topCategories),
    datasets: [
      {
        label: 'Frequency',
        data: Object.values(topCategories),
        backgroundColor: [
          'rgba(147, 51, 234, 0.75)',
          'rgba(168, 85, 247, 0.75)',
          'rgba(192, 132, 252, 0.75)',
          'rgba(216, 180, 254, 0.75)',
          'rgba(236, 72, 153, 0.75)',
        ],
        borderColor: 'rgb(192, 132, 252)',
        borderWidth: 1.5,
        borderRadius: 8,
      },
    ],
  };

  const topValuesChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Top Category Values Visualization', color: '#e9d5ff', font: { size: 14, weight: '600' } },
    },
    scales: {
      x: {
        ticks: { color: '#c084fc' },
        grid: { color: 'rgba(168, 85, 247, 0.15)' }
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#c084fc' },
        grid: { color: 'rgba(168, 85, 247, 0.15)' }
      },
    },
  };

  const columnsWithMissing = Object.entries(missingValues).filter(([, count]) => Number(count) > 0);

  return (
    <div className="content-section">
      {/* Dataset Summary Cards (Rows & Columns) */}
      <section style={{ marginBottom: 24, width: '100%' }}>
        <h3 style={{ marginBottom: 16, color: '#e9d5ff', textAlign: 'center' }}>Dataset Summary</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ padding: '12px 28px', background: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(192, 132, 252, 0.4)', borderRadius: 16, color: '#f3e8ff', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: '#a78bfa', display: 'block', marginBottom: 2 }}>Number of Rows</span>
            <strong style={{ fontSize: 22, color: '#fff' }}>{rowCount.toLocaleString()}</strong>
          </div>
          <div style={{ padding: '12px 28px', background: 'rgba(236, 72, 153, 0.2)', border: '1px solid rgba(244, 114, 182, 0.4)', borderRadius: 16, color: '#f3e8ff', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: '#f472b6', display: 'block', marginBottom: 2 }}>Number of Columns</span>
            <strong style={{ fontSize: 22, color: '#fff' }}>{columnCount.toLocaleString()}</strong>
          </div>
        </div>

        <p style={{ marginBottom: 10, textAlign: 'center' }}><strong>Columns List:</strong></p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {columnNames.map((name) => (
            <span
              key={name}
              style={{
                padding: '5px 14px',
                background: 'rgba(147, 51, 234, 0.2)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: 16,
                fontSize: 14,
                color: '#d8b4fe'
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* Visualizations: Chart 1 (Rows & Columns) + Chart 2 (Top Values) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, width: '100%', marginBottom: 32 }}>
        {/* Chart 1: Rows vs Columns */}
        <div style={{ background: 'rgba(30, 20, 60, 0.5)', padding: 18, borderRadius: 16, border: '1px solid rgba(168, 85, 247, 0.25)' }}>
          <div style={{ height: 260 }}>
            <Bar data={dimensionsChartData} options={dimensionsChartOptions} />
          </div>
        </div>

        {/* Chart 2: Top Values Visualization */}
        <div style={{ background: 'rgba(30, 20, 60, 0.5)', padding: 18, borderRadius: 16, border: '1px solid rgba(168, 85, 247, 0.25)' }}>
          {Object.keys(topCategories).length > 0 ? (
            <div style={{ height: 260 }}>
              <Bar data={topValuesChartData} options={topValuesChartOptions} />
            </div>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', fontSize: 14, textAlign: 'center', padding: 16 }}>
              No non-numeric category values found for top value chart.
            </div>
          )}
        </div>
      </div>

      {/* AI Insights Section (Cleaned text without asterisks) */}
      {cleanInsights.trim() ? (
        <section style={{ marginBottom: 24, width: '100%', textAlign: 'center' }}>
          <h3 style={{ marginBottom: 14, color: '#e9d5ff' }}>AI Insights (Groq API)</h3>
          <ul style={{ margin: '0 auto', padding: 0, listStyle: 'none', maxWidth: 650, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cleanInsights
              .split(/\r?\n/)
              .map((line) => line.replace(/\*/g, '').trim())
              .filter(Boolean)
              .map((line, i) => (
                <li key={i} style={{ padding: '12px 18px', background: 'rgba(147, 51, 234, 0.15)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: 12, textAlign: 'left', color: '#f3e8ff', fontSize: 14, lineHeight: 1.5 }}>
                  {line}
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      {/* Missing Values Section */}
      {Object.keys(missingValues).length > 0 ? (
        <section style={{ marginBottom: 24, width: '100%', textAlign: 'center' }}>
          <h3 style={{ marginBottom: 12, color: '#e9d5ff' }}>Missing Values</h3>
          {columnsWithMissing.length > 0 ? (
            <ul style={{ margin: '0 auto', padding: 0, listStyle: 'none', maxWidth: 500, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {columnsWithMissing.map(([col, count]) => (
                <li key={col} style={{ padding: '6px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, color: '#fca5a5', fontSize: 14 }}>
                  <strong>{col}</strong>: {count} missing
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#4ade80', margin: 0 }}>No missing values in any column.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}

function HistoryView() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError('');
        const resp = await axios.get(`${process.env.REACT_APP_API_URL}/api/history`);
        if (!cancelled) setHistory(Array.isArray(resp.data) ? resp.data : []);
      } catch (err) {
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.details ||
          err?.message ||
          'Failed to load history.';
        if (!cancelled) setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div style={{ marginTop: 24, color: '#c084fc', textAlign: 'center' }}>Loading history…</div>;

  if (error) {
    return (
      <ErrorBox message={error} onDismiss={() => setError('')} />
    );
  }

  return (
    <div className="content-section">
      {history.length === 0 ? (
        <div style={{ color: '#a78bfa', padding: 20 }}>No uploads yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 14, width: '100%', maxWidth: 650, margin: '0 auto' }}>
          {history.map((item) => {
            const cleanHistoryInsights = (item.insights_text || '').replace(/\*/g, '');
            return (
              <div key={item.id} className="history-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, color: '#e9d5ff', fontSize: 16 }}>{item.original_name || '(no name)'}</div>
                  <div style={{ color: '#c084fc', fontSize: 14 }}>{formatKB(item.file_size)}</div>
                </div>
                <div style={{ marginTop: 4, color: '#a78bfa', fontSize: 13 }}>
                  {formatDate(item.uploaded_at)}
                </div>
                <div style={{ marginTop: 10, whiteSpace: 'pre-wrap', color: '#f3e8ff', fontSize: 14, lineHeight: 1.5 }}>
                  {truncate(cleanHistoryInsights, 200) || '(no insights yet)'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [view, setView] = useState('analyze'); // 'analyze' | 'history'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!file) {
      setError('Please select a CSV file first.');
      return;
    }

    if (!file.name?.toLowerCase().endsWith('.csv')) {
      setError('Invalid file type. Please upload a .csv file.');
      return;
    }

    const maxBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxBytes) {
      setError('File is too large. Maximum allowed size is 10MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const resp = await axios.post(`${process.env.REACT_APP_API_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(resp.data);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.details ||
        err?.message ||
        'Upload failed.';
      setError(typeof message === 'string' ? message : JSON.stringify(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PurpleGridBackground />
      <div className="App-page">
        <main className="main-card">
          <h1 className="App-title">AI Data Analyzer</h1>
          <p className="App-subtitle">Upload CSV datasets to explore AI insights & visualizations</p>

          <div className="nav-tabs">
            <button
              type="button"
              onClick={() => setView('analyze')}
              className={`tab-btn ${view === 'analyze' ? 'active' : ''}`}
            >
              Analyze
            </button>
            <button
              type="button"
              onClick={() => setView('history')}
              className={`tab-btn ${view === 'history' ? 'active' : ''}`}
            >
              History
            </button>
          </div>

          {view === 'analyze' ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <form onSubmit={handleSubmit} className="upload-form">
                <label className="file-label">
                  <span style={{ fontSize: 24 }}>📁</span>
                  <span>{file ? file.name : 'Choose or drag a CSV file...'}</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    disabled={loading}
                    style={{ display: 'none' }}
                  />
                </label>
                
                <button type="submit" disabled={loading || !file} className="submit-btn">
                  {loading ? 'Uploading…' : 'Upload & Analyze'}
                </button>
              </form>

              <ErrorBox message={error} onDismiss={() => setError('')} />

              {result ? <ResultsView result={result} /> : null}
            </div>
          ) : (
            <HistoryView />
          )}
        </main>
      </div>
    </>
  );
}

export default App;
