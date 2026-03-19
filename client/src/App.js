import './App.css';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import axios from 'axios';
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

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: false },
    title: { display: true, text: 'Top categories' },
  },
  scales: {
    y: { beginAtZero: true },
  },
};

function ErrorBox({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div
      style={{
        marginTop: 16,
        background: '#ffebee',
        border: '1px solid #ffcdd2',
        color: '#b00020',
        padding: 12,
        borderRadius: 12,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <div style={{ lineHeight: 1.4 }}>
        <strong style={{ display: 'block', marginBottom: 4 }}>Error</strong>
        <div>{message}</div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        style={{
          border: 'none',
          background: 'transparent',
          color: '#b00020',
          fontSize: 18,
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
  const topCategories = analysis.top_categories && typeof analysis.top_categories === 'object'
    ? analysis.top_categories
    : {};
  const missingValues = analysis.missing_values && typeof analysis.missing_values === 'object'
    ? analysis.missing_values
    : {};
  const insightsText = result.insights || '';

  const chartData = {
    labels: Object.keys(topCategories),
    datasets: [
      {
        label: 'Count',
        data: Object.values(topCategories),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgb(54, 162, 235)',
        borderWidth: 1,
      },
    ],
  };

  const columnsWithMissing = Object.entries(missingValues).filter(([, count]) => Number(count) > 0);

  return (
    <div style={{ marginTop: 24, textAlign: 'left' }}>
      <section style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 8 }}>Summary</h3>
        <p style={{ marginBottom: 12 }}>
          <strong>Rows:</strong> <span style={{ padding: '4px 10px', background: '#e3f2fd', borderRadius: 16 }}>{rowCount}</span>
        </p>
        <p style={{ marginBottom: 4 }}><strong>Columns:</strong></p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {columnNames.map((name) => (
            <span
              key={name}
              style={{
                padding: '4px 12px',
                background: '#e8eaf6',
                borderRadius: 16,
                fontSize: 14,
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      {Object.keys(topCategories).length > 0 ? (
        <section style={{ marginBottom: 24, maxWidth: 500 }}>
          <div style={{ height: 280 }}>
            <Bar data={chartData} options={chartOptions} />
          </div>
        </section>
      ) : null}

      {insightsText.trim() ? (
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 8 }}>AI insights</h3>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {insightsText
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line, i) => (
                <li key={i} style={{ marginBottom: 4 }}>{line}</li>
              ))}
          </ul>
        </section>
      ) : null}

      {Object.keys(missingValues).length > 0 ? (
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 8 }}>Missing values</h3>
          {columnsWithMissing.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {columnsWithMissing.map(([col, count]) => (
                <li key={col}>
                  <strong>{col}</strong>: {count} missing
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#2e7d32', margin: 0 }}>No missing values in any column.</p>
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

  if (loading) return <div style={{ marginTop: 16 }}>Loading history…</div>;

  if (error) {
    return (
      <ErrorBox message={error} onDismiss={() => setError('')} />
    );
  }

  return (
    <div style={{ marginTop: 20, textAlign: 'left' }}>
      {history.length === 0 ? (
        <div>No uploads yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {history.map((item) => (
            <div
              key={item.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: 12,
                padding: 14,
                background: '#fff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontWeight: 700 }}>{item.original_name || '(no name)'}</div>
                <div style={{ color: '#555' }}>{formatKB(item.file_size)}</div>
              </div>
              <div style={{ marginTop: 6, color: '#666', fontSize: 14 }}>
                {formatDate(item.uploaded_at)}
              </div>
              <div style={{ marginTop: 10, whiteSpace: 'pre-wrap', color: '#222' }}>
                {truncate(item.insights_text || '', 200) || '(no insights yet)'}
              </div>
            </div>
          ))}
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
    <div className="App" style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
     
      <h1 className="App-title">AI Data Analyzer</h1>

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
        <>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
             <label style={{
                border: '2px dashed #ccc',
                borderRadius: 8,
                padding: '10px 16px',
                cursor: 'pointer',
                flex: 1,
                color: '#666',
                fontSize: 14,
                transition: 'border-color 0.2s ease'
              }}>
                {file ? file.name : 'Choose a CSV file...'}
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
        </>
      ) : (
        <HistoryView />
      )}
    </div>
  );
}

export default App;
