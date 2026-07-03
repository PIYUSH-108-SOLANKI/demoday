import { useLocation, useNavigate } from 'react-router-dom';
import { transactions, caseTimeline, ringDetail } from '../data/mockData';
import './CaseFile.css';

function formatAmount(n) {
  return '₹' + n.toLocaleString('en-IN');
}

function getRiskClass(score) {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function ScoreBreakdown({ reasons }) {
  const total = reasons.reduce((s, r) => s + r.weight, 0);

  return (
    <div className="score-breakdown">
      <div className="breakdown-bar">
        {reasons.map((r, i) => (
          <div
            key={i}
            className="breakdown-segment"
            style={{
              width: `${(r.weight / total) * 100}%`,
              background: r.type === 'normal' ? 'var(--safe)' :
                i === 0 ? 'var(--string)' :
                i === 1 ? 'var(--risk-high)' :
                'var(--brass)',
            }}
            title={`${r.type}: ${Math.round((r.weight / total) * 100)}%`}
          />
        ))}
      </div>
      <div className="breakdown-legend">
        {reasons.map((r, i) => (
          <div className="breakdown-item" key={i}>
            <span className="breakdown-dot" style={{
              background: r.type === 'normal' ? 'var(--safe)' :
                i === 0 ? 'var(--string)' :
                i === 1 ? 'var(--risk-high)' :
                'var(--brass)',
            }} />
            <span className="breakdown-label">{r.type.replace(/_/g, ' ')}</span>
            <span className="breakdown-pct">{Math.round((r.weight / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CaseFile() {
  const location = useLocation();
  const navigate = useNavigate();
  const txn = location.state?.txn || transactions.find(t => t.risk_score >= 80);

  if (!txn) {
    return (
      <div className="page animate-in">
        <div className="topbar">
          <div className="topbar-left">
            <h1>Case File</h1>
          </div>
        </div>
        <div className="page-content" style={{ textAlign: 'center', paddingTop: 80 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
          <h2>No case selected</h2>
          <p className="lead" style={{ color: 'var(--text-dim)', maxWidth: 400, margin: '12px auto 24px' }}>
            Select a flagged transaction from the Dashboard to view the full case investigation.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Go to Dashboard</button>
        </div>
      </div>
    );
  }

  const riskClass = getRiskClass(txn.risk_score);

  return (
    <div className="page animate-in">
      <div className="topbar">
        <div className="topbar-left">
          <button className="btn btn-outline" onClick={() => navigate('/')} style={{ padding: '6px 12px', fontSize: 12 }}>
            ← Back
          </button>
          <h1>Case File: {txn.id}</h1>
          <span className={`risk-badge ${riskClass}`} style={{ fontSize: 12, padding: '5px 14px' }}>
            <span className="dot" />
            {riskClass.toUpperCase()} — {txn.risk_score}
          </span>
        </div>
        <div className="topbar-right">
          <span className="latency-badge">
            <span className="lightning">⚡</span>
            Scored in {txn.latency_ms}ms
          </span>
        </div>
      </div>

      <div className="page-content">
        {/* Transaction Details + Score */}
        <div className="case-top-grid">
          {/* Transaction Details Card */}
          <div className="card animate-in">
            <div className="card-header">
              <span className="card-title">📋 Transaction Details</span>
              <span className="tag gold">{txn.id}</span>
            </div>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Sender UPI</span>
                <span className="detail-value">{txn.sender_upi}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Receiver UPI</span>
                <span className="detail-value" style={{ color: 'var(--string)' }}>{txn.receiver_upi}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Amount</span>
                <span className="detail-value mono" style={{ fontSize: 18, fontWeight: 700 }}>{formatAmount(txn.amount)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Timestamp</span>
                <span className="detail-value mono">{new Date(txn.timestamp).toLocaleString('en-IN')}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Sender Bank</span>
                <span className="detail-value">{txn.bank_sender} · {txn.city_sender}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Receiver Bank</span>
                <span className="detail-value">{txn.bank_receiver} · {txn.city_receiver}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Device ID</span>
                <span className="detail-value mono">{txn.device_id}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">IP Address</span>
                <span className="detail-value mono">{txn.ip}</span>
              </div>
            </div>
          </div>

          {/* Score & Confidence Card */}
          <div className="card animate-in animate-in-delay-1">
            <div className="card-header">
              <span className="card-title">🎯 Risk Assessment</span>
            </div>
            <div className="score-panel">
              <div className="big-score" style={{ color: riskClass === 'critical' ? 'var(--string)' : riskClass === 'high' ? 'var(--risk-high)' : 'var(--safe)' }}>
                {txn.risk_score}
              </div>
              <div className="score-meta">
                <div className={`risk-badge ${riskClass}`} style={{ fontSize: 13, padding: '6px 16px' }}>
                  <span className="dot" />
                  {riskClass.toUpperCase()}
                </div>
                <div className="confidence-row">
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1 }}>CONFIDENCE</span>
                  <span className="mono" style={{ fontSize: 24, fontWeight: 700 }}>{Math.round(txn.confidence * 100)}%</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div className="card-title" style={{ marginBottom: 12 }}>SCORE BREAKDOWN</div>
              <ScoreBreakdown reasons={txn.reasons} />
            </div>
          </div>
        </div>

        {/* Explainability + Timeline */}
        <div className="case-bottom-grid">
          {/* Explainability */}
          <div className="card animate-in animate-in-delay-2">
            <div className="card-header">
              <span className="card-title">🔎 Explainability — Why Flagged</span>
            </div>
            {txn.reasons.map((r, i) => (
              <div className="reason-item" key={i}>
                <div className="reason-icon">
                  {r.type === 'normal' ? '✅' : '⚠️'}
                </div>
                <div className="reason-text">
                  <div className="reason-type">{r.type.replace(/_/g, ' ')}</div>
                  <div className="reason-detail">{r.detail}</div>
                </div>
                <div className="reason-weight">{Math.round(r.weight * 100)}%</div>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="card animate-in animate-in-delay-3">
            <div className="card-header">
              <span className="card-title">⏱ Investigation Timeline</span>
              <span className="tag red">Ring #{ringDetail.ring_id.split('-')[1]}</span>
            </div>
            <div className="timeline">
              {caseTimeline.map((item, i) => (
                <div className={`timeline-item ${item.type}`} key={i}>
                  <div className="timeline-time">{item.time}</div>
                  <div className="timeline-event">{item.event}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="case-actions animate-in animate-in-delay-4">
          <button className="btn btn-primary" onClick={() => navigate('/graph')}>
            🔗 View in Graph Explorer
          </button>
          <button className="btn btn-stamp">
            🚨 Escalate to Investigation
          </button>
          <button className="btn btn-outline" style={{ color: 'var(--safe)' }}>
            ✅ Mark as Safe
          </button>
        </div>
      </div>
    </div>
  );
}
