import React, { useCallback, useEffect, useState } from 'react';
import { Row, Col, Card, Badge, Button, Alert, ProgressBar, Table } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import {
  FaBullseye,
  FaSync,
  FaLeaf,
  FaChartLine,
  FaRobot,
  FaTrophy,
  FaLightbulb,
  FaCheckCircle,
  FaExclamationCircle
} from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { boxWidth: 12, font: { size: 11 } } } },
  scales: {
    x: { grid: { color: 'rgba(148,163,184,0.12)' } },
    y: { grid: { color: 'rgba(148,163,184,0.12)' }, beginAtZero: true }
  }
};

const targetStatusBadge = (status) => {
  const map = {
    on_track: 'success',
    in_progress: 'primary',
    planned: 'secondary',
    behind: 'danger'
  };
  return map[status] || 'secondary';
};

const kpiStatusIcon = (status) => {
  if (status === 'on_track') return <FaCheckCircle className="text-success" />;
  if (status === 'attention') return <FaExclamationCircle className="text-warning" />;
  return <FaChartLine className="text-info" />;
};

const NetZeroMissionDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await axios.get('/api/carbon/net-zero-mission');
      if (res.data.success) setData(res.data.data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load net-zero mission dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 120000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return <LoadingSpinner message="Building net-zero mission metrics and AI impact dashboard..." size="lg" />;
  }

  if (!data) {
    return <Alert variant="warning">Net-zero mission dashboard unavailable.</Alert>;
  }

  const {
    netZeroProgress,
    emissionReductionTargets,
    sustainabilityEfficiencyTrend,
    greenPerformanceKpis,
    aiOptimizationSavings,
    measurableImpact,
    milestones,
    insights
  } = data;

  const efficiencyChart = {
    labels: sustainabilityEfficiencyTrend.historical.map((h) => h.period),
    datasets: [
      {
        label: 'Efficiency index',
        data: sustainabilityEfficiencyTrend.historical.map((h) => h.efficiencyIndex),
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.15)',
        fill: true,
        tension: 0.35,
        yAxisID: 'y'
      },
      {
        label: 'Emissions (kg)',
        data: sustainabilityEfficiencyTrend.historical.map((h) => h.emissionsKg),
        borderColor: '#0369a1',
        backgroundColor: 'rgba(3, 105, 161, 0.08)',
        tension: 0.35,
        yAxisID: 'y1'
      }
    ]
  };

  const efficiencyOpts = {
    ...chartOpts,
    scales: {
      ...chartOpts.scales,
      y: { ...chartOpts.scales.y, position: 'left', title: { display: true, text: 'Efficiency' } },
      y1: {
        position: 'right',
        grid: { drawOnChartArea: false },
        beginAtZero: true,
        title: { display: true, text: 'kg CO₂' }
      }
    }
  };

  const forecastChart = {
    labels: sustainabilityEfficiencyTrend.forecast.map((f) => f.year),
    datasets: [
      {
        label: 'Projected operational kg CO₂',
        data: sustainabilityEfficiencyTrend.forecast.map((f) => f.projectedKg),
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
        borderRadius: 8
      }
    ]
  };

  const aiBreakdownChart = {
    labels: aiOptimizationSavings.breakdown.map((b) => b.source.replace('AI ', '')),
    datasets: [
      {
        label: 'Realized (kg)',
        data: aiOptimizationSavings.breakdown.map((b) => b.realizedKg),
        backgroundColor: '#22c55e'
      },
      {
        label: 'Potential (kg)',
        data: aiOptimizationSavings.breakdown.map((b) => b.potentialKg),
        backgroundColor: 'rgba(34, 197, 94, 0.35)'
      }
    ]
  };

  const progressRing = {
    labels: ['Progress', 'Remaining'],
    datasets: [
      {
        data: [netZeroProgress.percent, 100 - netZeroProgress.percent],
        backgroundColor: ['#059669', '#e2e8f0'],
        borderWidth: 0
      }
    ]
  };

  return (
    <div className="net-zero-mission">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .net-zero-mission .hero-banner {
          background: linear-gradient(135deg, #14532d 0%, #15803d 45%, #22c55e 100%);
          border-radius: 20px;
          box-shadow: 0 16px 40px rgba(21, 128, 61, 0.28);
        }
        .net-zero-mission .stat-pill {
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.28);
          border-radius: 14px;
          padding: 1rem 1.25rem;
          color: #fff;
        }
        .net-zero-mission .kpi-card {
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 1.25rem;
          height: 100%;
          background: #fff;
        }
        .net-zero-mission .chart-box { height: 260px; position: relative; }
        .net-zero-mission .ring-box { height: 180px; width: 180px; margin: 0 auto; }
        .net-zero-mission .impact-tile {
          border-radius: 14px;
          padding: 1rem;
          background: linear-gradient(135deg, #ecfdf5 0%, #fff 100%);
          border: 1px solid #bbf7d0;
        }
      `}</style>

      <div className="hero-banner text-white p-4 p-md-5 mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2 opacity-90">
              <FaBullseye size={22} />
              <span className="text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.12em' }}>
                Measurable climate impact
              </span>
            </div>
            <h4 className="fw-bold mb-2">AI Net-Zero Mission Dashboard</h4>
            <p className="mb-0 opacity-90" style={{ maxWidth: 600 }}>
              Net-zero progress, emission reduction targets, efficiency trends, green KPIs, and carbon savings
              achieved by AI optimization — judge-ready measurable impact.
            </p>
          </div>
          <Button
            variant="light"
            size="sm"
            className="d-flex align-items-center gap-2"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <FaSync style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
            Refresh
          </Button>
        </div>
        <Row className="g-3 mt-3">
          <Col xs={6} md={3}>
            <div className="stat-pill">
              <div className="display-6 fw-bold mb-0">{netZeroProgress.percent}%</div>
              <small className="opacity-90">Net-zero progress</small>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-pill">
              <div className="display-6 fw-bold mb-0">{measurableImpact.aiSavingsRealizedKg.toLocaleString()}</div>
              <small className="opacity-90">kg CO₂ AI savings (realized)</small>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-pill">
              <div className="display-6 fw-bold mb-0">Grade {netZeroProgress.grade}</div>
              <small className="opacity-90">Score {netZeroProgress.sustainabilityScore}/100</small>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-pill">
              <div className="display-6 fw-bold mb-0">{netZeroProgress.targetYear}</div>
              <small className="opacity-90">{netZeroProgress.yearsRemaining} years to target</small>
            </div>
          </Col>
        </Row>
      </div>

      {insights?.length > 0 && (
        <Alert variant="light" className="border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
          <FaLightbulb className="text-warning me-2" />
          {insights.map((line, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              {line.replace(/\*\*(.*?)\*\*/g, '$1')}
            </span>
          ))}
        </Alert>
      )}

      <Row className="g-4 mb-4">
        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 18 }}>
            <Card.Body className="text-center">
              <h6 className="fw-bold text-muted text-uppercase mb-3" style={{ fontSize: '0.7rem', letterSpacing: '0.08em' }}>
                Net-zero progress
              </h6>
              <div className="ring-box">
                <Doughnut
                  data={progressRing}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    cutout: '72%',
                    plugins: { legend: { display: false } }
                  }}
                />
              </div>
              <div className="display-4 fw-bold text-success mb-1">{netZeroProgress.percent}%</div>
              <Badge bg={netZeroProgress.onTrack ? 'success' : 'warning'} className="mb-3">
                {netZeroProgress.onTrack ? 'On trajectory' : 'Accelerate interventions'}
              </Badge>
              <div className="text-start small text-muted">
                <div className="d-flex justify-content-between mb-1">
                  <span>Baseline</span>
                  <strong>{netZeroProgress.baselineEmissionsKg.toLocaleString()} kg</strong>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span>AI contribution</span>
                  <strong className="text-success">{netZeroProgress.aiContributionKg.toLocaleString()} kg</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Trajectory reduction</span>
                  <strong>{netZeroProgress.trajectoryContributionKg.toLocaleString()} kg</strong>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={8}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 18 }}>
            <Card.Header className="bg-white border-0 pt-4 px-4">
              <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <FaBullseye className="text-success" />
                Emission reduction targets
              </h5>
            </Card.Header>
            <Card.Body>
              {emissionReductionTargets.map((t) => (
                <div key={t.year} className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <div>
                      <strong>{t.label}</strong>
                      <small className="text-muted ms-2">−{t.reductionPercent}% → {t.targetEmissionsKg.toLocaleString()} kg</small>
                    </div>
                    <Badge bg={targetStatusBadge(t.status)}>{t.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <ProgressBar
                    now={t.progressPercent}
                    label={`${t.progressPercent}%`}
                    variant={t.status === 'behind' ? 'danger' : t.status === 'on_track' ? 'success' : 'info'}
                    style={{ height: 14 }}
                  />
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col lg={6}>
          <Card className="border-0 shadow-sm" style={{ borderRadius: 18 }}>
            <Card.Header className="bg-white border-0 pt-4 px-4">
              <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <FaChartLine className="text-primary" />
                Sustainability efficiency trends
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="chart-box">
                <Line data={efficiencyChart} options={efficiencyOpts} />
              </div>
              <small className="text-muted d-block mt-2 text-center">
                {sustainabilityEfficiencyTrend.summary.efficiencyImprovementRate}% annual efficiency gain ·{' '}
                {sustainabilityEfficiencyTrend.summary.forecastReductionPercent}% 5-yr forecast reduction
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="border-0 shadow-sm" style={{ borderRadius: 18 }}>
            <Card.Header className="bg-white border-0 pt-4 px-4">
              <h5 className="fw-bold mb-0">5-year emission forecast</h5>
            </Card.Header>
            <Card.Body>
              <div className="chart-box">
                <Bar data={forecastChart} options={chartOpts} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
        <FaTrophy className="text-warning" />
        Green performance KPIs
      </h5>
      <Row className="g-3 mb-4">
        {greenPerformanceKpis.map((kpi) => (
          <Col md={6} lg={4} key={kpi.id}>
            <div className="kpi-card">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <small className="text-muted fw-semibold text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>
                  {kpi.label}
                </small>
                {kpiStatusIcon(kpi.status)}
              </div>
              <div className="display-6 fw-bold mb-1">
                {typeof kpi.value === 'number' && kpi.value >= 1000
                  ? kpi.value.toLocaleString()
                  : kpi.value}
                <span className="fs-6 text-muted ms-1">{kpi.unit}</span>
              </div>
              <ProgressBar
                now={Math.min(100, (kpi.value / Math.max(kpi.target, 1)) * 100)}
                variant={kpi.status === 'on_track' ? 'success' : 'info'}
                style={{ height: 6 }}
              />
              <small className="text-muted">Target: {kpi.target}{kpi.unit === '%' ? '%' : ` ${kpi.unit}`}</small>
            </div>
          </Col>
        ))}
      </Row>

      <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: 18 }}>
        <Card.Header className="bg-white border-0 pt-4 px-4">
          <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
            <FaRobot className="text-success" />
            Carbon savings by AI optimization
          </h5>
        </Card.Header>
        <Card.Body>
          <Row className="g-4">
            <Col lg={7}>
              <div className="chart-box">
                <Bar data={aiBreakdownChart} options={{ ...chartOpts, scales: { ...chartOpts.scales, x: { stacked: false } } }} />
              </div>
            </Col>
            <Col lg={5}>
              <div className="impact-tile mb-3">
                <div className="fw-bold text-success display-6 mb-0">
                  {aiOptimizationSavings.realizedTotalKg.toLocaleString()} kg
                </div>
                <small className="text-muted">Realized AI savings ({aiOptimizationSavings.adoptionRatePercent}% adoption)</small>
              </div>
              <div className="impact-tile mb-3">
                <div className="fw-bold mb-0">{aiOptimizationSavings.potentialTotalKg.toLocaleString()} kg</div>
                <small className="text-muted">Total AI optimization potential</small>
              </div>
              <Row className="g-2">
                <Col xs={6}>
                  <div className="p-2 rounded-3 bg-light border text-center">
                    <FaLeaf className="text-success mb-1" />
                    <div className="fw-bold">{measurableImpact.equivalentTreesPlanted}</div>
                    <small className="text-muted">tree-yr equivalent</small>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="p-2 rounded-3 bg-light border text-center">
                    <div className="fw-bold">{measurableImpact.equivalentHomesPoweredYear}</div>
                    <small className="text-muted">homes / yr equiv.</small>
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>
          <Table responsive className="mt-4 mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>AI module</th>
                <th>Potential (kg)</th>
                <th>Realized (kg)</th>
                <th>Impact</th>
              </tr>
            </thead>
            <tbody>
              {aiOptimizationSavings.breakdown.map((row) => (
                <tr key={row.module}>
                  <td>
                    <strong>{row.source}</strong>
                    <br />
                    <small className="text-muted">{row.description}</small>
                  </td>
                  <td>{row.potentialKg.toLocaleString()}</td>
                  <td className="text-success fw-semibold">{row.realizedKg.toLocaleString()}</td>
                  <td>
                    <ProgressBar
                      now={row.potentialKg > 0 ? (row.realizedKg / row.potentialKg) * 100 : 0}
                      style={{ height: 8, minWidth: 80 }}
                      variant="success"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm" style={{ borderRadius: 18 }}>
        <Card.Header className="bg-white border-0 pt-4 px-4">
          <h6 className="fw-bold mb-0">Mission milestones</h6>
        </Card.Header>
        <Card.Body>
          <Row className="g-2">
            {milestones.map((m) => (
              <Col md={6} key={m.id}>
                <div
                  className="d-flex align-items-center gap-3 p-3 rounded-3"
                  style={{
                    background: m.completed ? '#ecfdf5' : '#f8fafc',
                    border: `1px solid ${m.completed ? '#bbf7d0' : '#e2e8f0'}`
                  }}
                >
                  {m.completed ? (
                    <FaCheckCircle className="text-success flex-shrink-0" size={20} />
                  ) : (
                    <div
                      className="rounded-circle flex-shrink-0"
                      style={{ width: 20, height: 20, border: '2px solid #cbd5e1' }}
                    />
                  )}
                  <div>
                    <div className="fw-semibold small">{m.label}</div>
                    <small className="text-muted">{m.metric}</small>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

export default NetZeroMissionDashboard;
