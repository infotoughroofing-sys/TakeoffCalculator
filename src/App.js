import { useState } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === 'application/pdf') {
      setFile(dropped);
      setResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('blueprint', file);

    try {
      const res = await fetch('http://localhost:3001/api/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <h1>Tough Roofing</h1>
          <p className="subtitle">Material Takeoff Calculator</p>
        </div>
      </header>

      <main className="main">
        <section className="upload-section">
          <div
            className={`drop-zone ${file ? 'has-file' : ''}`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {file ? (
              <div className="file-ready">
                <span className="file-icon">📄</span>
                <span className="file-name">{file.name}</span>
                <button className="clear-btn" onClick={() => setFile(null)}>✕</button>
              </div>
            ) : (
              <>
                <span className="upload-icon">⬆</span>
                <p>Drag &amp; drop your blueprint PDF here</p>
                <p className="or">or</p>
              </>
            )}
            <label className="browse-btn">
              {file ? 'Change File' : 'Browse Files'}
              <input type="file" accept=".pdf" onChange={handleFileChange} hidden />
            </label>
          </div>

          <button
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={!file || loading}
          >
            {loading ? (
              <span className="loading-text">
                <span className="spinner" />
                Reading Blueprint...
              </span>
            ) : 'Generate Material Takeoff'}
          </button>

          {error && <div className="error-box">⚠ {error}</div>}
        </section>

        {result && (
          <section className="results">
            <div className="results-header">
              <h2>Material Takeoff Report</h2>
              <button className="print-btn" onClick={handlePrint}>🖨 Print / Save PDF</button>
            </div>

            <div className="summary-card">
              <h3>Project Summary</h3>
              <div className="summary-grid">
                <div className="summary-item">
                  <label>Total Roof Area</label>
                  <value>{result.projectSummary.totalRoofArea}</value>
                </div>
                <div className="summary-item">
                  <label>Roof Pitch</label>
                  <value>{result.projectSummary.roofPitch}</value>
                </div>
                <div className="summary-item">
                  <label>Number of Slopes</label>
                  <value>{result.projectSummary.numberOfSlopes}</value>
                </div>
              </div>
              {result.projectSummary.notes && (
                <p className="summary-notes">{result.projectSummary.notes}</p>
              )}
            </div>

            {result.materials.map((category, i) => (
              <div className="category-card" key={i}>
                <h3>{category.category}</h3>
                <table className="materials-table">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.items.map((item, j) => (
                      <tr key={j}>
                        <td>{item.name}</td>
                        <td className="qty">{item.quantity}</td>
                        <td className="unit">{item.unit}</td>
                        <td className="notes">{item.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {result.warnings && result.warnings.length > 0 && (
              <div className="warnings-card">
                <h3>⚠ Items Needing Attention</h3>
                <ul>
                  {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
