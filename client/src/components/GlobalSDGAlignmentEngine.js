import React, { useCallback, useEffect, useState } from 'react';
import { Row, Col, Card, Badge, Button, Alert, ProgressBar } from 'react-bootstrap';
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
  FaGlobe,
  FaSync,
  FaTrain,
  FaMicrochip,
  FaLightbulb,
  FaCheckCircle,
  FaBookOpen,
  FaLink
} from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    y: { min: 0, max: 100, grid: { color: 'rgba(148,163,184,0.12)' } }
  }
};

const levelBadge = (level) => {
  if (level === 'strong') return 'success';
  if (level === 'moderate') return 'primary';
  return 'warning';
};

const statusBadge = (status) => {
  if (status === 'on_track') return 'success';
  if (status === 'progressing') return 'info';
  return 'warning';
};

const SdgCard = ({ sdg, isSelected, onSelect }) => (
  <Card
    className={`border-0 shadow-sm h-100 sdg-card ${isSelected ? 'selected' : ''}`}
    style={{
      borderRadius: 16,
      borderLeft: `5px solid ${sdg.color}`,
      cursor: 'pointer'
    }}
    onClick={() => onSelect(sdg.id)}
  >
    <Card.Body>
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div
          className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
          style={{ width: 44, height: 44, background: sdg.color, fontSize: '1rem' }}
        >
          {sdg.number}
        </div>
        <Badge bg={levelBadge(sdg.alignmentLevel)}>{sdg.alignmentLevel}</Badge>
      </div>
      <h6 className="fw-bold small mb-1">SDG {sdg.number}</h6>
      <p className="text-muted small mb-2" style={{ lineHeight: 1.3 }}>
        {sdg.title}
      </p>
      <div className="display-6 fw-bold mb-1" style={{ color: sdg.color }}>
        {sdg.alignmentScore}
      </div>
      <small className="text-muted">/100 alignment</small>
      <ProgressBar
        now={sdg.alignmentScore}
        style={{ height: 6, backgroundColor: `${sdg.color}22` }}
        className="mt-2"
      />
    </Card.Body>
  </Card>
);

const GlobalSDGAlignmentEngine = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('sdg');
  const [selectedSdgId, setSelectedSdgId] = useState('SDG13');

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await axios.get('/api/carbon/sdg-alignment');
      if (res.data.success) {
        setData(res.data.data);
        const sdgs = res.data.data.unSustainableDevelopmentGoals || [];
        const top = [...sdgs].sort((a, b) => b.alignmentScore - a.alignmentScore)[0];
        if (top) setSelectedSdgId(top.id);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load SDG alignment engine.');
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
    return <LoadingSpinner message="Mapping platform actions to UN SDGs and global initiatives..." size="lg" />;
  }

  if (!data) {
    return <Alert variant="warning">SDG alignment engine unavailable.</Alert>;
  }

  const {
    overallAlignment,
    summary,
    unSustainableDevelopmentGoals,
    greenTransportationInitiatives,
    smartInfrastructureObjectives,
    researchHighlights,
    insights
  } = data;

  const selectedSdg = unSustainableDevelopmentGoals.find((s) => s.id === selectedSdgId);

  const sdgChart = {
    labels: unSustainableDevelopmentGoals.map((s) => `SDG ${s.number}`),
    datasets: [
      {
        label: 'Alignment score',
        data: unSustainableDevelopmentGoals.map((s) => s.alignmentScore),
        backgroundColor: unSustainableDevelopmentGoals.map((s) => s.color),
        borderRadius: 8
      }
    ]
  };

  const tabs = [
    { id: 'sdg', label: 'UN SDGs', icon: FaGlobe },
    { id: 'transport', label: 'Green transport', icon: FaTrain },
    { id: 'infra', label: 'Smart infrastructure', icon: FaMicrochip }
  ];

  return (
    <div className="sdg-alignment-engine">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .sdg-alignment-engine .hero-banner {
          background: linear-gradient(135deg, #0c1929 0%, #1e3a5f 40%, #0284c7 100%);
          border-radius: 20px;
          box-shadow: 0 16px 40px rgba(2, 132, 199, 0.28);
        }
        .sdg-alignment-engine .stat-pill {
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 14px;
          padding: 1rem 1.25rem;
          color: #fff;
        }
        .sdg-alignment-engine .tab-btn {
          border: 1px solid #e2e8f0;
          background: #fff;
          border-radius: 12px;
          padding: 0.6rem 1rem;
          font-weight: 600;
          font-size: 0.85rem;
          color: #64748b;
        }
        .sdg-alignment-engine .tab-btn.active {
          background: linear-gradient(135deg, #1e3a5f, #0284c7);
          color: #fff;
          border-color: transparent;
        }
        .sdg-alignment-engine .sdg-card.selected {
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.25);
        }
        .sdg-alignment-engine .initiative-card {
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 1.25rem;
          height: 100%;
          background: #fff;
        }
        .sdg-alignment-engine .research-card {
          border-radius: 14px;
          padding: 1rem;
          background: linear-gradient(135deg, #f0f9ff 0%, #fff 100%);
          border: 1px solid #bae6fd;
          height: 100%;
        }
        .sdg-alignment-engine .chart-box { height: 260px; }
        .sdg-alignment-engine .globe-score {
          font-size: 4rem;
          font-weight: 800;
          line-height: 1;
          background: linear-gradient(90deg, #38bdf8, #22c55e);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      <div className="hero-banner text-white p-4 p-md-5 mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <FaGlobe size={24} />
              <span className="text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.12em' }}>
                UN 2030 Agenda · Research-grade reporting
              </span>
            </div>
            <h4 className="fw-bold mb-2">Global SDG Alignment Engine</h4>
            <p className="mb-0 opacity-90" style={{ maxWidth: 580 }}>
              Maps every platform action to UN Sustainable Development Goals, green transportation
              initiatives, and smart infrastructure objectives — internationally relevant impact evidence.
            </p>
          </div>
          <Button variant="light" size="sm" className="d-flex align-items-center gap-2" onClick={() => fetchData(true)} disabled={refreshing}>
            <FaSync style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
            Refresh
          </Button>
        </div>

        <Row className="align-items-center mt-4">
          <Col md={4} className="text-center mb-3 mb-md-0">
            <div className="globe-score">{overallAlignment.index}</div>
            <div className="opacity-90">Global SDG Alignment Index</div>
            <Badge bg="light" text="dark" className="mt-2 px-3 py-2">
              Grade {overallAlignment.grade} · {overallAlignment.label}
            </Badge>
          </Col>
          <Col md={8}>
            <Row className="g-2">
              <Col xs={6} md={3}>
                <div className="stat-pill text-center">
                  <div className="fw-bold fs-4">{summary.sdgCount}</div>
                  <small>SDGs mapped</small>
                </div>
              </Col>
              <Col xs={6} md={3}>
                <div className="stat-pill text-center">
                  <div className="fw-bold fs-4">{summary.strongAlignments}</div>
                  <small>Strong alignments</small>
                </div>
              </Col>
              <Col xs={6} md={3}>
                <div className="stat-pill text-center">
                  <div className="fw-bold fs-4">{summary.greenTransportAvg}</div>
                  <small>Green transport</small>
                </div>
              </Col>
              <Col xs={6} md={3}>
                <div className="stat-pill text-center">
                  <div className="fw-bold fs-4">{summary.smartInfraAvg}</div>
                  <small>Smart infra</small>
                </div>
              </Col>
            </Row>
            {summary.reportingReady && (
              <div className="mt-3 small d-flex align-items-center gap-2 opacity-90">
                <FaCheckCircle />
                Reporting-ready for sustainability disclosures and academic publications
              </div>
            )}
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

      <Row className="g-3 mb-4">
        {researchHighlights.map((h, i) => (
          <Col md={4} key={i}>
            <div className="research-card">
              <FaBookOpen className="text-primary mb-2" />
              <h6 className="fw-bold small">{h.title}</h6>
              <p className="small text-muted mb-0">{h.body.replace(/\*\*/g, '')}</p>
            </div>
          </Col>
        ))}
      </Row>

      <div className="d-flex flex-wrap gap-2 mb-4">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`tab-btn d-flex align-items-center gap-2 ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'sdg' && (
        <>
          <Row className="g-4 mb-4">
            <Col lg={7}>
              <Row className="g-2">
                {unSustainableDevelopmentGoals.map((sdg) => (
                  <Col sm={6} md={4} key={sdg.id}>
                    <SdgCard
                      sdg={sdg}
                      isSelected={selectedSdgId === sdg.id}
                      onSelect={setSelectedSdgId}
                    />
                  </Col>
                ))}
              </Row>
            </Col>
            <Col lg={5}>
              {selectedSdg && (
                <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 18 }}>
                  <Card.Body>
                    <Badge style={{ background: selectedSdg.color }} className="mb-2">
                      SDG {selectedSdg.number}
                    </Badge>
                    <h5 className="fw-bold">{selectedSdg.title}</h5>
                    <p className="small text-muted">{selectedSdg.targets}</p>
                    <hr />
                    <h6 className="fw-bold small text-uppercase text-muted">Platform contributions</h6>
                    <ul className="small ps-3 mb-3">
                      {selectedSdg.contributions.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                    <h6 className="fw-bold small text-uppercase text-muted">Mapped modules</h6>
                    <div className="d-flex flex-wrap gap-1">
                      {selectedSdg.platformActions.map((a) => (
                        <Badge key={a.id} bg="light" text="dark" className="border">
                          <FaLink className="me-1" size={10} />
                          {a.label}
                        </Badge>
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              )}
            </Col>
          </Row>
          <Card className="border-0 shadow-sm" style={{ borderRadius: 18 }}>
            <Card.Body>
              <div className="chart-box">
                <Bar data={sdgChart} options={chartOpts} />
              </div>
            </Card.Body>
          </Card>
        </>
      )}

      {activeTab === 'transport' && (
        <Row className="g-3">
          {greenTransportationInitiatives.map((init) => (
            <Col md={6} key={init.id}>
              <div className="initiative-card">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <FaTrain className="text-primary" size={20} />
                  <Badge bg={statusBadge(init.status)}>{init.status.replace(/_/g, ' ')}</Badge>
                </div>
                <h6 className="fw-bold">{init.title}</h6>
                <p className="small text-muted mb-2">{init.description}</p>
                <div className="d-flex flex-wrap gap-1 mb-2">
                  {init.sdgLinks.map((s) => (
                    <Badge key={s} bg="primary" className="opacity-75">
                      {s}
                    </Badge>
                  ))}
                </div>
                <div className="fw-bold fs-4 text-primary">{init.score}/100</div>
                <ProgressBar now={init.score} variant="primary" style={{ height: 8 }} />
              </div>
            </Col>
          ))}
        </Row>
      )}

      {activeTab === 'infra' && (
        <Row className="g-3">
          {smartInfrastructureObjectives.map((obj) => (
            <Col md={6} key={obj.id}>
              <div className="initiative-card">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <FaMicrochip className="text-info" size={20} />
                  <Badge bg={statusBadge(obj.status)}>{obj.status.replace(/_/g, ' ')}</Badge>
                </div>
                <h6 className="fw-bold">{obj.title}</h6>
                <p className="small text-muted mb-2">{obj.description}</p>
                <div className="d-flex flex-wrap gap-1 mb-2">
                  {obj.sdgLinks.map((s) => (
                    <Badge key={s} bg="info" className="opacity-75">
                      {s}
                    </Badge>
                  ))}
                </div>
                <div className="fw-bold fs-4 text-info">{obj.score}/100</div>
                <ProgressBar now={obj.score} variant="info" style={{ height: 8 }} />
              </div>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default GlobalSDGAlignmentEngine;
