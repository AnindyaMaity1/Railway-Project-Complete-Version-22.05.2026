import React, { useCallback, useEffect, useState } from 'react';
import { Row, Col, Card, Badge, Table, ProgressBar, Alert } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import {
  FaChartLine,
  FaExclamationTriangle,
  FaCubes,
  FaMapMarkedAlt,
  FaSync,
  FaLightbulb,
  FaLevelUpAlt
} from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend
);

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: true, labels: { boxWidth: 12 } } },
  scales: {
    x: { grid: { color: 'rgba(148,163,184,0.12)' } },
    y: { grid: { color: 'rgba(148,163,184,0.12)' }, beginAtZero: true }
  }
};

const riskVariant = (level) => {
  if (level === 'critical') return 'danger';
  if (level === 'high') return 'warning';
  if (level === 'medium') return 'info';
  return 'secondary';
};

const MetricTile = ({ label, value, sub, accent }) => (
  <div className="p-3 rounded-3 h-100 border" style={{ backgroundColor: '#f8fafc' }}>
    <small className="text-uppercase text-muted d-block" style={{ fontSize: '0.7rem' }}>
      {label}
    </small>
    <h4 className="fw-bold mb-0 mt-1" style={{ color: accent || '#1e293b' }}>
      {value}
    </h4>
    {sub && <small className="text-muted">{sub}</small>}
  </div>
);

const PredictiveSustainabilityAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await axios.get('/api/carbon/predictive-analytics');
      if (res.data.success) setData(res.data.data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load Predictive Sustainability Analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(() => fetchAnalytics(true), 120000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  if (loading) {
    return <LoadingSpinner message="Running Predictive Sustainability Analytics..." size="lg" />;
  }

  if (!data) {
    return <Alert variant="warning">Predictive analytics unavailable.</Alert>;
  }

  const {
    headline,
    summary,
    expensiveAssets,
    componentRisks,
    problemComponents,
    carbonHeavyZones,
    portfolioTimeline,
    recommendations
  } = data;

  const timelineChart = {
    labels: portfolioTimeline.map((p) => p.period),
    datasets: [
      {
        label: 'Period emissions (kg)',
        data: portfolioTimeline.map((p) => p.projectedKgCO2),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139,92,246,0.12)',
        fill: true,
        tension: 0.35
      },
      {
        label: 'Cumulative (kg)',
        data: portfolioTimeline.map((p) => p.cumulativeKg),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249,115,22,0.08)',
        fill: true,
        tension: 0.35
      }
    ]
  };

  const zoneChart = {
    labels: carbonHeavyZones.slice(0, 6).map((z) =>
      z.label.length > 14 ? `${z.label.slice(0, 12)}…` : z.label
    ),
    datasets: [
      {
        label: '5-year projected CO₂ (kg)',
        data: carbonHeavyZones.slice(0, 6).map((z) => z.fiveYearProjectedKg),
        backgroundColor: carbonHeavyZones.slice(0, 6).map((z) =>
          z.carbonHeavy ? 'rgba(239,68,68,0.75)' : 'rgba(59,130,246,0.6)'
        ),
        borderRadius: 6
      }
    ]
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <Badge bg="primary" className="mb-2 px-3 py-2">
            Predictive Sustainability Analytics
          </Badge>
          <h5 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <FaChartLine className="text-info" />
            AI Lifecycle Prediction
          </h5>
          <p className="text-muted mb-0 small">
            Forecasts which assets become environmentally expensive, which components drive long-term
            sustainability risk, and future carbon-heavy railway zones.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
          onClick={() => fetchAnalytics(true)}
          disabled={refreshing}
        >
          <FaSync style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
          {refreshing ? 'Predicting…' : 'Refresh predictions'}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <Card
        className="border-0 shadow-sm mb-4"
        style={{
          borderRadius: 20,
          background: 'linear-gradient(135deg, #312e81 0%, #4c1d95 50%, #6d28d9 100%)'
        }}
      >
        <Card.Body className="py-3 px-4">
          <p className="text-white mb-0 fw-semibold">{headline}</p>
        </Card.Body>
      </Card>

      <Row className="g-3 mb-4">
        <Col sm={6} lg={3}>
          <MetricTile
            label="Expensive assets (pred.)"
            value={summary.expensiveAssetCount}
            sub={`of ${summary.totalAssets} total assets`}
            accent="#dc2626"
          />
        </Col>
        <Col sm={6} lg={3}>
          <MetricTile
            label="Problem components"
            value={summary.problemComponentCount}
            sub="Long-term sustainability burden"
            accent="#d97706"
          />
        </Col>
        <Col sm={6} lg={3}>
          <MetricTile
            label="Carbon-heavy zones"
            value={summary.carbonHeavyZoneCount}
            sub="Future corridor hotspots"
            accent="#7c3aed"
          />
        </Col>
        <Col sm={6} lg={3}>
          <MetricTile
            label="5-year portfolio CO₂"
            value={`${(summary.portfolioFiveYearKg || 0).toLocaleString()} kg`}
            sub={`Avg expense score ${summary.avgExpenseScore}`}
            accent="#0d9488"
          />
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col lg={7}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 18 }}>
            <Card.Body>
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <FaExclamationTriangle className="text-danger" />
                Assets predicted to become environmentally expensive
              </h6>
              {expensiveAssets.length === 0 ? (
                <p className="text-muted small mb-0">No assets flagged above expense threshold.</p>
              ) : (
                <Table responsive size="sm" className="mb-0">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>5yr CO₂</th>
                      <th>Score</th>
                      <th>Trend</th>
                      <th>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensiveAssets.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <div className="fw-semibold">{a.serialNumber || '—'}</div>
                          <small className="text-muted">{a.itemType}</small>
                        </td>
                        <td>{a.fiveYearProjectedKg.toLocaleString()} kg</td>
                        <td>{a.expenseScore}</td>
                        <td>
                          <Badge bg={a.trend === 'accelerating' ? 'danger' : 'warning'}>
                            {a.trend}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={riskVariant(a.riskLevel)}>{a.riskLevel}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 18 }}>
            <Card.Body>
              <h6 className="fw-bold mb-2">Portfolio emission timeline</h6>
              <div style={{ height: 220 }}>
                <Line data={timelineChart} options={chartOpts} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 18 }}>
            <Card.Body>
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <FaCubes className="text-warning" />
                Long-term sustainability problem components
              </h6>
              {problemComponents.length === 0 ? (
                <p className="text-muted small mb-0">No critical component classes identified.</p>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {problemComponents.map((c) => (
                    <div key={c.component} className="p-3 rounded-3 border">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <strong>{c.component}</strong>
                        <Badge bg={riskVariant(c.longTermRisk)}>{c.problemScore}</Badge>
                      </div>
                      <ProgressBar
                        now={c.problemScore}
                        variant={c.problemScore >= 70 ? 'danger' : 'warning'}
                        className="mb-2"
                        style={{ height: 6 }}
                      />
                      <p className="text-muted small mb-1">{c.prediction}</p>
                      <small>
                        {c.assetCount} assets · {c.hotspotCount} hotspots · {c.poorRatingCount} poor ratings
                      </small>
                    </div>
                  ))}
                </div>
              )}
              {componentRisks.length > problemComponents.length && (
                <Table responsive size="sm" className="mt-3 mb-0">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Score</th>
                      <th>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {componentRisks
                      .filter((c) => !c.createsLongTermProblems)
                      .slice(0, 4)
                      .map((c) => (
                        <tr key={c.component}>
                          <td>{c.component}</td>
                          <td>{c.problemScore}</td>
                          <td>
                            <Badge bg={riskVariant(c.longTermRisk)}>{c.longTermRisk}</Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 18 }}>
            <Card.Body>
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <FaMapMarkedAlt className="text-danger" />
                Future carbon-heavy railway zones
              </h6>
              <div style={{ height: 160 }} className="mb-3">
                <Bar data={zoneChart} options={{ ...chartOpts, plugins: { legend: { display: false } } }} />
              </div>
              <div className="d-flex flex-column gap-2" style={{ maxHeight: 200, overflowY: 'auto' }}>
                {carbonHeavyZones.slice(0, 6).map((z) => (
                  <div
                    key={z.zoneKey}
                    className={`p-2 rounded-3 ${z.carbonHeavy ? 'bg-danger-subtle' : 'bg-light'}`}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-semibold small">
                        #{z.rank} {z.label}
                      </span>
                      <Badge bg={z.carbonHeavy ? 'danger' : 'secondary'}>
                        {z.fiveYearProjectedKg.toLocaleString()} kg
                      </Badge>
                    </div>
                    <small className="text-muted">
                      {z.assetCount} assets · {z.carbonHeavy ? 'Carbon-heavy' : z.riskLevel}
                    </small>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm" style={{ borderRadius: 18 }}>
        <Card.Body>
          <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
            <FaLightbulb className="text-success" />
            Predictive intelligence recommendations
          </h6>
          <ul className="list-unstyled mb-0">
            {recommendations.map((rec, i) => (
              <li key={i} className="mb-2 d-flex gap-2 align-items-start small">
                <FaLevelUpAlt className="text-primary mt-1 flex-shrink-0" />
                <span>{rec.replace(/\*\*/g, '')}</span>
              </li>
            ))}
          </ul>
        </Card.Body>
      </Card>
    </div>
  );
};

export default PredictiveSustainabilityAnalytics;
