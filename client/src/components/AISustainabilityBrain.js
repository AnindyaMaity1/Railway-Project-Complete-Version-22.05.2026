import React, { useEffect, useState, useCallback } from 'react';
import { Row, Col, Card, Badge, Table, ProgressBar, Alert } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FaBrain,
  FaBolt,
  FaCog,
  FaLeaf,
  FaRecycle,
  FaHeartbeat,
  FaTruck,
  FaExclamationTriangle,
  FaLightbulb,
  FaChartLine,
  FaSync
} from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';

const DIMENSION_META = {
  carbon: { label: 'Carbon Emissions', icon: <FaLeaf />, color: 'success' },
  energy: { label: 'Energy Usage', icon: <FaBolt />, color: 'warning' },
  maintenance: { label: 'Maintenance Efficiency', icon: <FaCog />, color: 'primary' },
  material: { label: 'Material Sustainability', icon: <FaRecycle />, color: 'info' },
  lifecycle: { label: 'Asset Lifecycle Health', icon: <FaHeartbeat />, color: 'danger' },
  vendor: { label: 'Vendor Environmental Impact', icon: <FaTruck />, color: 'secondary' }
};

const severityVariant = (severity) => {
  if (severity === 'critical') return 'danger';
  if (severity === 'warning') return 'warning';
  return 'info';
};

const gradeVariant = (grade) => {
  if (grade === 'A') return 'success';
  if (grade === 'B') return 'info';
  if (grade === 'C') return 'warning';
  if (grade === 'D') return 'secondary';
  return 'danger';
};

const ScoreRing = ({ score, grade }) => (
  <div
    className="d-flex flex-column align-items-center justify-content-center rounded-circle mx-auto"
    style={{
      width: 140,
      height: 140,
      background: `conic-gradient(#22c55e ${score * 3.6}deg, #e2e8f0 0deg)`,
      position: 'relative'
    }}
  >
    <div
      className="rounded-circle bg-white d-flex flex-column align-items-center justify-content-center"
      style={{ width: 118, height: 118 }}
    >
      <span className="fw-bold display-6 mb-0">{score}</span>
      <Badge bg={gradeVariant(grade)} className="mt-1">
        Grade {grade}
      </Badge>
    </div>
  </div>
);

const DimensionCard = ({ dimensionKey, score }) => {
  const meta = DIMENSION_META[dimensionKey];
  if (!meta) return null;

  return (
    <Card className="h-100 border-0 shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className={`text-${meta.color} fs-5`}>{meta.icon}</div>
          <Badge bg={score >= 70 ? 'success' : score >= 50 ? 'warning' : 'danger'}>{score}</Badge>
        </div>
        <h6 className="fw-semibold mb-2" style={{ fontSize: '0.85rem' }}>
          {meta.label}
        </h6>
        <ProgressBar
          now={score}
          variant={score >= 70 ? 'success' : score >= 50 ? 'warning' : 'danger'}
          style={{ height: 6 }}
        />
      </Card.Body>
    </Card>
  );
};

const AISustainabilityBrain = () => {
  const [brain, setBrain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBrain = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await axios.get('/api/inventory/sustainability-brain');
      setBrain(response.data.data);
    } catch (error) {
      console.error('Sustainability brain error:', error);
      toast.error('Unable to run AI Sustainability Brain analysis.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBrain();
    const interval = setInterval(() => fetchBrain(true), 120000);
    return () => clearInterval(interval);
  }, [fetchBrain]);

  if (loading) {
    return <LoadingSpinner message="AI Sustainability Brain analyzing portfolio..." size="lg" />;
  }

  if (!brain) {
    return (
      <Alert variant="warning" className="mb-0">
        Sustainability analysis is unavailable. Please try again.
      </Alert>
    );
  }

  const {
    overallSustainabilityScore,
    overallGrade,
    dimensionScores,
    riskAlerts,
    optimizations,
    environmentalForecast,
    topHotspotAssets,
    aiSummary,
    lastAnalyzedAt,
    portfolio
  } = brain;

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h5 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <FaBrain className="text-danger" />
            AI Sustainability Brain
          </h5>
          <p className="text-muted mb-0 small">
            Continuously analyzes carbon, energy, maintenance, materials, lifecycle, and vendor impact —
            then generates scores, risk alerts, optimizations, and forecasts.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Badge bg="success" pill>
            {brain.status === 'active' ? 'Live' : 'Idle'}
          </Badge>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={() => fetchBrain(true)}
            disabled={refreshing}
          >
            <FaSync style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
            {refreshing ? 'Analyzing…' : 'Re-analyze'}
          </button>
        </div>
      </div>

      <Alert variant="light" className="border mb-4 py-3">
        <strong>AI insight:</strong> {aiSummary.headline}
        <span className="text-muted ms-2">
          · {aiSummary.criticalAlerts} critical alert(s) · {aiSummary.optimizationCount} optimization(s) ·
          Est. savings {aiSummary.totalEstimatedSavingsKg.toLocaleString()} kg CO₂
        </span>
      </Alert>

      <Row className="g-4 mb-4">
        <Col lg={4}>
          <Card className="h-100 border-0 shadow-sm text-center">
            <Card.Body className="py-4">
              <h6 className="text-uppercase text-muted mb-3">Overall Sustainability Score</h6>
              <ScoreRing score={overallSustainabilityScore} grade={overallGrade} />
              <p className="text-muted small mt-3 mb-0">
                Last analyzed: {new Date(lastAnalyzedAt).toLocaleString()}
              </p>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={8}>
          <Row className="g-3">
            {Object.keys(DIMENSION_META).map((key) => (
              <Col sm={6} md={4} key={key}>
                <DimensionCard dimensionKey={key} score={dimensionScores[key] ?? 0} />
              </Col>
            ))}
          </Row>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col lg={6}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body>
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <FaExclamationTriangle className="text-danger" />
                Risk Alerts
                <Badge bg="danger" pill>
                  {riskAlerts.length}
                </Badge>
              </h6>
              {riskAlerts.length === 0 ? (
                <p className="text-muted small mb-0">No active risks — portfolio within thresholds.</p>
              ) : (
                <div className="d-flex flex-column gap-2" style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {riskAlerts.map((alert) => (
                    <Alert key={alert.id} variant={severityVariant(alert.severity)} className="mb-0 py-2 px-3">
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div>
                          <strong className="small">{alert.title}</strong>
                          <p className="mb-0 small">{alert.message}</p>
                        </div>
                        <Badge bg={severityVariant(alert.severity)} className="text-uppercase">
                          {alert.severity}
                        </Badge>
                      </div>
                      <small className="text-muted">
                        {DIMENSION_META[alert.dimension]?.label} · {alert.metric}
                      </small>
                    </Alert>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body>
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <FaLightbulb className="text-warning" />
                Optimization Suggestions
              </h6>
              {optimizations.length === 0 ? (
                <p className="text-muted small mb-0">No optimizations required at this time.</p>
              ) : (
                <div className="d-flex flex-column gap-2" style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {optimizations.map((opt, index) => (
                    <div key={index} className="p-3 rounded-3" style={{ backgroundColor: '#f8fafc' }}>
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <strong className="small">{opt.title}</strong>
                        <Badge bg={opt.priority === 'high' ? 'danger' : opt.priority === 'medium' ? 'warning' : 'secondary'}>
                          {opt.priority}
                        </Badge>
                      </div>
                      <p className="text-muted small mb-1">{opt.suggestion}</p>
                      <small>
                        Impact: {opt.impact}
                        {opt.estimatedSavingsKg != null &&
                          ` · Est. ${opt.estimatedSavingsKg.toLocaleString()} kg CO₂`}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={7}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <FaChartLine className="text-info" />
                Environmental Forecast
                <Badge
                  bg={
                    environmentalForecast.trajectory === 'improving'
                      ? 'success'
                      : environmentalForecast.trajectory === 'stable'
                        ? 'warning'
                        : 'danger'
                  }
                >
                  {environmentalForecast.trajectory.replace('_', ' ')}
                </Badge>
              </h6>
              <p className="text-muted small">{environmentalForecast.narrative}</p>
              <div className="d-flex flex-wrap gap-3 mb-3">
                <div>
                  <small className="text-muted d-block">5-year projection</small>
                  <strong>{environmentalForecast.projectedNext5YearsKg.toLocaleString()} kg</strong>
                </div>
                <div>
                  <small className="text-muted d-block">Annual recurring</small>
                  <strong>{environmentalForecast.annualRecurringKg.toLocaleString()} kg/yr</strong>
                </div>
                <div>
                  <small className="text-muted d-block">Y1 → Y5 reduction</small>
                  <strong>{environmentalForecast.reductionPercent}%</strong>
                </div>
              </div>
              <Table size="sm" className="mb-0">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th className="text-end">Projected CO₂ (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {(environmentalForecast.yearlyBreakdown || []).map((row) => (
                    <tr key={row.year}>
                      <td>{row.year}</td>
                      <td className="text-end">{row.projectedKgCO2.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <h6 className="fw-bold mb-3">Emission Hotspots (AI-detected)</h6>
              <p className="text-muted small mb-3">
                {portfolio.hotspots} of {portfolio.totalAssets} assets flagged ·{' '}
                {portfolio.totalEmissionsCO2.toLocaleString()} kg total footprint
              </p>
              {topHotspotAssets.length === 0 ? (
                <p className="text-muted small mb-0">No hotspots in current portfolio.</p>
              ) : (
                <Table size="sm" responsive className="mb-0">
                  <thead>
                    <tr>
                      <th>Serial</th>
                      <th>CO₂</th>
                      <th>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topHotspotAssets.map((asset) => (
                      <tr key={asset.id}>
                        <td>{asset.serialNumber || '—'}</td>
                        <td>{asset.totalEmissionsCO2.toLocaleString()}</td>
                        <td>
                          <Badge bg={asset.rating === 'A' || asset.rating === 'B' ? 'success' : 'danger'}>
                            {asset.rating}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AISustainabilityBrain;
