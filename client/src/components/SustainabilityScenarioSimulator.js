import React, { useCallback, useEffect, useState } from 'react';
import { Row, Col, Card, Badge, Button, Alert } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js';
import {
  FaFlask,
  FaSync,
  FaRecycle,
  FaClipboardCheck,
  FaRoute,
  FaLeaf,
  FaDollarSign,
  FaChartLine,
  FaLightbulb,
  FaPlay,
  FaArrowRight
} from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const SCENARIO_ICONS = {
  recycle: FaRecycle,
  inspection: FaClipboardCheck,
  route: FaRoute
};

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false } },
    y: { grid: { color: 'rgba(148,163,184,0.12)' }, beginAtZero: true, title: { display: true, text: 'kg CO₂' } }
  }
};

const ScenarioCard = ({ scenario, isActive, onRun }) => {
  const Icon = SCENARIO_ICONS[scenario.icon] || FaFlask;
  const { predictions, impact } = scenario;

  return (
    <Card
      className={`border-0 shadow-sm h-100 scenario-card ${isActive ? 'active' : ''}`}
      style={{
        borderRadius: 18,
        border: isActive ? `2px solid ${scenario.color}` : '2px solid transparent',
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
      onClick={() => onRun(scenario.id)}
    >
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-3">
          <span
            className="d-inline-flex align-items-center justify-content-center rounded-3"
            style={{ width: 44, height: 44, background: `${scenario.color}22`, color: scenario.color }}
          >
            <Icon size={20} />
          </span>
          <Badge bg={scenario.confidence === 'high' ? 'success' : scenario.confidence === 'medium' ? 'warning' : 'secondary'}>
            {scenario.confidence} confidence
          </Badge>
        </div>
        <h6 className="fw-bold text-muted small mb-1">What if...</h6>
        <p className="fw-semibold mb-2" style={{ fontSize: '0.95rem' }}>
          {scenario.question.replace(/^What if /i, '')}
        </p>
        <p className="small text-muted mb-3">{scenario.description}</p>
        <Button
          variant={isActive ? 'success' : 'outline-primary'}
          size="sm"
          className="w-100 d-flex align-items-center justify-content-center gap-2"
          onClick={(e) => {
            e.stopPropagation();
            onRun(scenario.id);
          }}
        >
          <FaPlay size={12} />
          {isActive ? 'Simulating' : 'Run simulation'}
        </Button>
        {isActive && impact && (
          <div className="mt-3 pt-3 border-top">
            <div className="d-flex justify-content-between small mb-1">
              <span className="text-muted">CO₂</span>
              <strong className="text-success">−{predictions.carbonReduction.kg} kg</strong>
            </div>
            <div className="d-flex justify-content-between small mb-1">
              <span className="text-muted">Cost</span>
              <strong>${predictions.costSavings.usd}</strong>
            </div>
            <div className="d-flex justify-content-between small">
              <span className="text-muted">Score</span>
              <strong className="text-primary">+{predictions.sustainabilityImprovement.scoreDelta}</strong>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

const SustainabilityScenarioSimulator = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState(null);
  const [simulating, setSimulating] = useState(false);

  const fetchData = useCallback(async (scenarioId = null, showSimulating = false) => {
    if (showSimulating) setSimulating(true);
    else if (!data) setLoading(true);
    else setRefreshing(true);
    try {
      const url = scenarioId
        ? `/api/carbon/scenario-simulator?scenario=${scenarioId}`
        : '/api/carbon/scenario-simulator';
      const res = await axios.get(url);
      if (res.data.success) {
        setData(res.data.data);
        setActiveScenarioId(scenarioId || res.data.data.activeScenarioId || res.data.data.scenarios?.[0]?.id);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load scenario simulator.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setSimulating(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(activeScenarioId), 120000);
    return () => clearInterval(interval);
  }, []);

  const runScenario = (id) => {
    setActiveScenarioId(id);
    fetchData(id, true);
  };

  if (loading) {
    return <LoadingSpinner message="AI is building what-if scenarios for your fleet..." size="lg" />;
  }

  if (!data) {
    return <Alert variant="warning">Scenario simulator unavailable.</Alert>;
  }

  const { baseline, scenarios, combined, comparisonChart, insights } = data;
  const active = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];

  const barChart = {
    labels: comparisonChart.labels,
    datasets: [
      {
        label: 'Portfolio emissions (kg CO₂)',
        data: comparisonChart.values,
        backgroundColor: comparisonChart.labels.map((_, i) =>
          i === 0 ? '#94a3b8' : i === comparisonChart.labels.indexOf(active?.label) ? active?.color || '#22c55e' : '#cbd5e1'
        ),
        borderRadius: 8
      }
    ]
  };

  return (
    <div className="scenario-simulator">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .scenario-simulator .hero-banner {
          background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #6366f1 100%);
          border-radius: 20px;
          box-shadow: 0 16px 40px rgba(99, 102, 241, 0.3);
        }
        .scenario-simulator .stat-pill {
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.28);
          border-radius: 14px;
          padding: 1rem 1.25rem;
          color: #fff;
        }
        .scenario-simulator .prediction-tile {
          border-radius: 16px;
          padding: 1.25rem;
          height: 100%;
          border: 1px solid #e2e8f0;
          background: #fff;
        }
        .scenario-simulator .chart-box { height: 280px; }
        .scenario-simulator .scenario-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(15,23,42,0.1) !important; }
        .scenario-simulator .scenario-card.active { box-shadow: 0 8px 28px rgba(99,102,241,0.2) !important; }
        .scenario-simulator .before-after {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .scenario-simulator .before-after .box {
          flex: 1;
          min-width: 120px;
          text-align: center;
          padding: 1rem;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }
      `}</style>

      <div className="hero-banner text-white p-4 p-md-5 mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2 opacity-90">
              <FaFlask size={22} />
              <span className="text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.12em' }}>
                What-if demo · AI predictions
              </span>
            </div>
            <h4 className="fw-bold mb-2">Sustainability Scenario Simulator</h4>
            <p className="mb-0 opacity-90" style={{ maxWidth: 560 }}>
              Simulate recycled materials, reduced inspections, and optimized routes — AI predicts carbon
              reduction, cost savings, and sustainability improvement instantly.
            </p>
          </div>
          <Button variant="light" size="sm" className="d-flex align-items-center gap-2" onClick={() => fetchData(activeScenarioId)} disabled={refreshing || simulating}>
            <FaSync style={refreshing || simulating ? { animation: 'spin 1s linear infinite' } : undefined} />
            Refresh
          </Button>
        </div>
        <Row className="g-3 mt-3">
          <Col xs={6} md={3}>
            <div className="stat-pill">
              <div className="display-6 fw-bold mb-0">{baseline.totalEmissionsKg.toLocaleString()}</div>
              <small className="opacity-90">Baseline kg CO₂</small>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-pill">
              <div className="display-6 fw-bold mb-0">{baseline.totalAssets}</div>
              <small className="opacity-90">Assets modeled</small>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-pill">
              <div className="display-6 fw-bold mb-0">{baseline.averageSustainabilityScore}</div>
              <small className="opacity-90">Avg score</small>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-pill">
              <div className="display-6 fw-bold mb-0">{scenarios.length}</div>
              <small className="opacity-90">Live scenarios</small>
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
              {String(line).replace(/\*\*(.*?)\*\*/g, '$1')}
            </span>
          ))}
        </Alert>
      )}

      <h5 className="fw-bold mb-3">Choose a what-if scenario</h5>
      <Row className="g-3 mb-4">
        {scenarios.map((s) => (
          <Col md={4} key={s.id}>
            <ScenarioCard scenario={s} isActive={activeScenarioId === s.id} onRun={runScenario} />
          </Col>
        ))}
      </Row>

      {active && (
        <>
          <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: 18, borderLeft: `4px solid ${active.color}` }}>
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <FaFlask style={{ color: active.color }} />
                AI prediction — {active.label}
              </h5>
              <p className="text-muted mb-4">{active.aiNarrative.replace(/\*\*/g, '')}</p>

              <Row className="g-3 mb-4">
                <Col md={4}>
                  <div className="prediction-tile text-center">
                    <FaLeaf className="text-success mb-2" size={28} />
                    <div className="display-6 fw-bold text-success mb-0">
                      {active.predictions.carbonReduction.kg.toLocaleString()}
                    </div>
                    <small className="text-muted d-block">kg CO₂ reduced</small>
                    <Badge bg="success" className="mt-2">
                      {active.predictions.carbonReduction.percent}% reduction
                    </Badge>
                    {active.predictions.carbonReduction.fiveYearKg > 0 && (
                      <small className="d-block mt-2 text-muted">
                        5-yr ops: −{active.predictions.carbonReduction.fiveYearKg.toLocaleString()} kg
                      </small>
                    )}
                  </div>
                </Col>
                <Col md={4}>
                  <div className="prediction-tile text-center">
                    <FaDollarSign className="text-primary mb-2" size={28} />
                    <div className="display-6 fw-bold text-primary mb-0">
                      ${active.predictions.costSavings.usd.toLocaleString()}
                    </div>
                    <small className="text-muted d-block">estimated cost savings</small>
                    <small className="d-block mt-2 text-muted">Maintenance, transport & carbon value</small>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="prediction-tile text-center">
                    <FaChartLine className="text-info mb-2" size={28} />
                    <div className="display-6 fw-bold text-info mb-0">
                      +{active.predictions.sustainabilityImprovement.scoreDelta}
                    </div>
                    <small className="text-muted d-block">sustainability score gain</small>
                    <small className="d-block mt-2 text-muted">
                      {active.predictions.sustainabilityImprovement.baselineScore} →{' '}
                      {active.predictions.sustainabilityImprovement.projectedScore} ·{' '}
                      {active.predictions.sustainabilityImprovement.assetsImproved} assets improved
                    </small>
                  </div>
                </Col>
              </Row>

              <div className="before-after mb-4">
                <div className="box">
                  <small className="text-muted d-block">Before</small>
                  <div className="fw-bold fs-4">{active.impact.baselineTotalKg.toLocaleString()}</div>
                  <small>kg CO₂ · score {active.impact.baselineAvgScore}</small>
                </div>
                <FaArrowRight className="text-muted" />
                <div className="box" style={{ background: '#ecfdf5', borderColor: '#bbf7d0' }}>
                  <small className="text-muted d-block">After simulation</small>
                  <div className="fw-bold fs-4 text-success">{active.impact.projectedTotalKg.toLocaleString()}</div>
                  <small>kg CO₂ · score {active.impact.projectedAvgScore}</small>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Row className="g-4">
            <Col lg={8}>
              <Card className="border-0 shadow-sm" style={{ borderRadius: 18 }}>
                <Card.Header className="bg-white border-0 pt-4 px-4">
                  <h6 className="fw-bold mb-0">Portfolio emissions comparison</h6>
                </Card.Header>
                <Card.Body>
                  <div className="chart-box">
                    <Bar data={barChart} options={chartOpts} />
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 18, background: 'linear-gradient(180deg,#f5f3ff,#fff)' }}>
                <Card.Body>
                  <h6 className="fw-bold mb-3">All scenarios combined</h6>
                  <p className="small text-muted">{combined.impact?.note || combined.question}</p>
                  <div className="mb-2">
                    <small className="text-muted">Carbon</small>
                    <div className="fw-bold text-success">
                      −{combined.predictions.carbonReduction.kg.toLocaleString()} kg
                    </div>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">Cost</small>
                    <div className="fw-bold">${combined.predictions.costSavings.usd.toLocaleString()}</div>
                  </div>
                  <div>
                    <small className="text-muted">Score uplift</small>
                    <div className="fw-bold text-info">
                      +{combined.predictions.sustainabilityImprovement.scoreDelta}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default SustainabilityScenarioSimulator;
