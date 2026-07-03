import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactions, stats, getRiskLevel } from '../data/mockData';
import './Dashboard.css';

function formatAmount(n) {
  return '₹' + n.toLocaleString('en-IN');
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function getRiskClass(score) {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function getRiskLabel(score) {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  return 'LOW';
}

// Donut chart SVG component
function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const size = 140;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="donut-container">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((segment, i) => {
          const segmentLength = (segment.count / total) * circumference;
          const dashOffset = offset;
          offset += segmentLength;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
              strokeDashoffset={-dashOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.8s ease, stroke-dashoffset 0.8s ease' }}
              opacity={0.85}
            />
          );
        })}
        <text x={size / 2} y={size / 2 - 6} textAnchor="middle" fill="#eeeae1" fontSize="28" fontWeight="700" fontFamily="Space Grotesk">{total}</text>
        <text x={size / 2} y={size / 2 + 12} textAnchor="middle" fill="#7a756c" fontSize="9" fontFamily="JetBrains Mono" letterSpacing="1">TOTAL</text>
      </svg>
      <div className="donut-legend">
        {data.map((segment, i) => (
          <div className="donut-legend-item" key={i}>
            <span className="legend-dot" style={{ background: segment.color }} />
            <span>{segment.label}</span>
            <span className="legend-count">{segment.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Live feed item
function FeedItem({ txn, delay }) {
  const navigate = useNavigate();
  const riskClass = getRiskClass(txn.risk_score);

  return (
    <div
      className="feed-item"
      style={{ animationDelay: `${delay}ms` }}
      onClick={() => navigate('/case', { state: { txn } })}
    >
      <span className="feed-time">{formatTime(txn.timestamp)}</span>
      <div className="feed-detail">
        <div className="feed-parties">
          {txn.sender_upi.split('@')[0]} → {txn.receiver_upi.split('@')[0]}
        </div>
      </div>
      <span className="feed-amount">{formatAmount(txn.amount)}</span>
      <span className="feed-score">
        <span className={`risk-badge ${riskClass}`}>
          <span className="dot" />
          {txn.risk_score}
        </span>
      </span>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [visibleTxns, setVisibleTxns] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Simulate live feed — add transactions one by one
  useEffect(() => {
    const sorted = [...transactions].sort((a, b) => b.risk_score - a.risk_score);
    let idx = 1;
    setVisibleTxns([sorted[0]]);

    const interval = setInterval(() => {
      if (idx >= sorted.length) {
        clearInterval(interval);
        return;
      }
      const txn = sorted[idx];
      idx++;
      setVisibleTxns(prev => [txn, ...prev]);
    }, 800);

    return () => clearInterval(interval);
  }, []);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const flaggedTxns = transactions.filter(t => t.risk_score >= 60);
  const criticalCount = transactions.filter(t => t.risk_score >= 80).length;
  const highCount = transactions.filter(t => t.risk_score >= 60 && t.risk_score < 80).length;
  const mediumCount = transactions.filter(t => t.risk_score >= 35 && t.risk_score < 60).length;
  const lowCount = transactions.filter(t => t.risk_score < 35).length;

  const donutData = [
    { label: 'Critical', count: criticalCount, color: '#e5484d' },
    { label: 'High', count: highCount, color: '#e5844d' },
    { label: 'Medium', count: mediumCount, color: '#f5a623' },
    { label: 'Low', count: lowCount, color: '#3fb67f' },
  ];

  return (
    <div className="page animate-in">
      {/* Top Bar */}
      <div className="topbar">
        <div className="topbar-left">
          <h1>Command Center</h1>
          <span className="case-badge">
            <span className="pulse" />
            MONITORING ACTIVE
          </span>
        </div>
        <div className="topbar-right">
          <span className="clock mono">{currentTime.toLocaleTimeString('en-IN', { hour12: false })}</span>
        </div>
      </div>

      <div className="page-content">
        {/* Stats Row */}
        <div className="grid-4 animate-in" style={{ marginBottom: 24 }}>
          <div className="stat-card" style={{ '--accent-color': 'var(--string)' }}>
            <div className="stat-label">Transactions Scanned</div>
            <div className="stat-value" style={{ color: 'var(--text)' }}>{stats.total_transactions.toLocaleString()}</div>
            <div className="stat-sub">Last 24 hours</div>
          </div>
          <div className="stat-card" style={{ '--accent-color': 'var(--string)' }}>
            <div className="stat-label">Flagged</div>
            <div className="stat-value" style={{ color: 'var(--string)' }}>{stats.flagged_count}</div>
            <div className="stat-sub">{stats.flagged_percentage}% of total</div>
          </div>
          <div className="stat-card" style={{ '--accent-color': 'var(--safe)' }}>
            <div className="stat-label">Avg Latency</div>
            <div className="stat-value" style={{ color: 'var(--safe)' }}>{stats.avg_latency_ms}ms</div>
            <div className="stat-sub">Well under 200ms target</div>
          </div>
          <div className="stat-card" style={{ '--accent-color': 'var(--brass)' }}>
            <div className="stat-label">Active Rings</div>
            <div className="stat-value" style={{ color: 'var(--brass)' }}>{stats.active_rings}</div>
            <div className="stat-sub">Cross-bank clusters</div>
          </div>
        </div>

        {/* Main Grid: Live Feed + Distribution */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          {/* Live Feed */}
          <div className="card animate-in animate-in-delay-1">
            <div className="card-header">
              <span className="card-title">⚡ Live Transaction Feed</span>
              <span className="case-badge" style={{ padding: '3px 8px', fontSize: '9px' }}>
                <span className="pulse" />
                LIVE
              </span>
            </div>
            <div className="feed-container">
              {visibleTxns.map((txn, i) => (
                <FeedItem key={txn.id} txn={txn} delay={0} />
              ))}
            </div>
          </div>

          {/* Risk Distribution */}
          <div className="card animate-in animate-in-delay-2">
            <div className="card-header">
              <span className="card-title">📊 Risk Distribution</span>
            </div>
            <div style={{ padding: '20px 0' }}>
              <DonutChart data={donutData} />
            </div>
            <div className="distribution-bars">
              {donutData.map((d, i) => (
                <div className="dist-bar-row" key={i}>
                  <span className="dist-label" style={{ color: d.color }}>{d.label}</span>
                  <div className="dist-bar-track">
                    <div
                      className="dist-bar-fill"
                      style={{
                        width: `${(d.count / transactions.length) * 100}%`,
                        background: d.color,
                      }}
                    />
                  </div>
                  <span className="dist-pct">{Math.round((d.count / transactions.length) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Flagged Transactions Table */}
        <div className="card animate-in animate-in-delay-3">
          <div className="card-header">
            <span className="card-title">🚨 Flagged Transactions</span>
            <span className="tag red">{flaggedTxns.length} flagged</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>TXN ID</th>
                  <th>Sender</th>
                  <th>Receiver</th>
                  <th>Amount</th>
                  <th>Banks</th>
                  <th>Risk</th>
                  <th>Confidence</th>
                  <th>Latency</th>
                  <th>Top Reason</th>
                </tr>
              </thead>
              <tbody>
                {flaggedTxns.sort((a, b) => b.risk_score - a.risk_score).map(txn => (
                  <tr key={txn.id} onClick={() => navigate('/case', { state: { txn } })}>
                    <td>
                      <span className="mono" style={{ color: 'var(--brass)', fontSize: 12 }}>{txn.id}</span>
                    </td>
                    <td>{txn.sender_upi}</td>
                    <td style={{ color: 'var(--string)' }}>{txn.receiver_upi}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>{formatAmount(txn.amount)}</td>
                    <td>
                      <span className="tag">{txn.bank_sender.split(' ')[0]}</span>
                      <span style={{ margin: '0 4px', color: 'var(--text-dim)' }}>→</span>
                      <span className="tag">{txn.bank_receiver.split(' ')[0]}</span>
                    </td>
                    <td>
                      <span className={`risk-badge ${getRiskClass(txn.risk_score)}`}>
                        <span className="dot" />
                        {getRiskLabel(txn.risk_score)} · {txn.risk_score}
                      </span>
                    </td>
                    <td className="mono">{Math.round(txn.confidence * 100)}%</td>
                    <td>
                      <span className="latency-badge">
                        <span className="lightning">⚡</span>
                        {txn.latency_ms}ms
                      </span>
                    </td>
                    <td style={{ maxWidth: 200, whiteSpace: 'normal', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {txn.reasons[0]?.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
