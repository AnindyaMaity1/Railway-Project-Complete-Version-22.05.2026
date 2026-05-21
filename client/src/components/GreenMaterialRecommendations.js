import React, { useCallback, useEffect, useState } from 'react';
import { Row, Col, Card, Badge, Button, Alert } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FaGraduationCap,
  FaSync,
  FaRecycle,
  FaLeaf,
  FaExchangeAlt,
  FaClock,
  FaArrowRight,
  FaLightbulb,
  FaCheckCircle,
  FaBolt
} from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';

const TYPE_CONFIG = {
  recyclable_alternative: {
    label: 'Recyclable alternatives',
    icon: FaRecycle,
    color: '#22c55e',
    bg: 'success'
  },
  lower_emission: {
    label: 'Lower-emission materials',
    icon: FaLeaf,
    color: '#0ea5e9',
    bg: 'info'
  },
  sustainable_replacement: {
    label: 'Sustainable replacements',
    icon: FaExchangeAlt,
    color: '#8b5cf6',
    bg: 'primary'
  },
  long_life_component: {
    label: 'Long-life components',
    icon: FaClock,
    color: '#d97706',
    bg: 'warning'
  }
};

const priorityBadge = (p) => {
  if (p === 'high') return 'danger';
  if (p === 'medium') return 'warning';
  return 'secondary';
};

const RecommendationCard = ({ rec, featured = false, onSelect, isSelected }) => {
  const config = TYPE_CONFIG[rec.recommendationType] || TYPE_CONFIG.recyclable_alternative;
  const Icon = config.icon;

  return (
    <div
      className={`recommendation-card ${featured ? 'featured' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect?.(rec.id)}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => onSelect && e.key === 'Enter' && onSelect(rec.id)}
    >
      {featured && (
        <div className="featured-badge">
          <FaBolt className="me-1" />
          Top AI pick
        </div>
      )}
      <div className="d-flex justify-content-between align-items-start mb-3">
        <Badge bg={config.bg} className="d-flex align-items-center gap-1 px-2 py-2">
          <Icon size={12} />
          {config.label}
        </Badge>
        <Badge bg={priorityBadge(rec.priority)}>{rec.priority} priority</Badge>
      </div>

      <div className="swap-flow mb-3">
        <div className="swap-from">
          <small className="text-muted d-block mb-1">Replace</small>
          <strong className="d-block">{rec.currentMaterial}</strong>
        </div>
        <div className="swap-arrow">
          <FaArrowRight />
        </div>
        <div className="swap-to">
          <small className="text-muted d-block mb-1">With</small>
          <strong className="d-block text-success">{rec.recommendedMaterial}</strong>
        </div>
      </div>

      <div
        className="reduction-banner text-center py-3 px-2 rounded-3 mb-3"
        style={{
          background: `linear-gradient(135deg, ${config.color}22 0%, ${config.color}11 100%)`,
          border: `1px solid ${config.color}44`
        }}
      >
        <small className="text-muted d-block text-uppercase fw-semibold" style={{ fontSize: '0.65rem', letterSpacing: '0.08em' }}>
          Estimated CO₂ reduction
        </small>
        <div className="display-6 fw-bold mb-0" style={{ color: config.color }}>
          {rec.impact.percentReduction}%
        </div>
        <small className="text-muted">{rec.impact.co2SavedKg} kg saved · Grade → {rec.impact.projectedRating}</small>
      </div>

      <p className="small text-muted mb-2">{rec.description}</p>
      {rec.serialNumber && (
        <small className="text-muted">
          Asset: <strong>{rec.serialNumber}</strong>
          {rec.itemType && ` · ${rec.itemType.replace(/_/g, ' ')}`}
        </small>
      )}
    </div>
  );
};

const GreenMaterialRecommendations = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeType, setActiveType] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await axios.get('/api/carbon/material-recommendations');
      if (res.data.success) {
        setData(res.data.data);
        setSelectedId(res.data.data.featured?.id || res.data.data.topRecommendations?.[0]?.id || null);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load material recommendations.');
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
    return <LoadingSpinner message="AI is analyzing green material opportunities..." size="lg" />;
  }

  if (!data) {
    return <Alert variant="warning">Material recommendations unavailable.</Alert>;
  }

  const { summary, featured, topRecommendations, byType, insights } = data;
  const list =
    activeType === 'all'
      ? topRecommendations
      : byType[activeType] || [];
  const selected = [...topRecommendations, ...Object.values(byType).flat()].find((r) => r.id === selectedId);

  return (
    <div className="green-material-ai">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .green-material-ai .hero-banner {
          background: linear-gradient(135deg, #064e3b 0%, #047857 40%, #0d9488 100%);
          border-radius: 20px;
          box-shadow: 0 16px 40px rgba(6, 78, 59, 0.25);
        }
        .green-material-ai .stat-pill {
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 14px;
          padding: 1rem 1.25rem;
          color: #fff;
        }
        .green-material-ai .recommendation-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 1.25rem;
          height: 100%;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .green-material-ai .recommendation-card:hover {
          border-color: #94a3b8;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.1);
          transform: translateY(-2px);
        }
        .green-material-ai .recommendation-card.selected {
          border-color: #059669;
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.2);
        }
        .green-material-ai .recommendation-card.featured {
          border: 2px solid #059669;
          background: linear-gradient(180deg, #ecfdf5 0%, #fff 40%);
        }
        .green-material-ai .featured-badge {
          display: inline-flex;
          align-items: center;
          background: linear-gradient(90deg, #059669, #10b981);
          color: #fff;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.25rem 0.65rem;
          border-radius: 999px;
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .green-material-ai .swap-flow {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .green-material-ai .swap-from,
        .green-material-ai .swap-to {
          flex: 1;
          padding: 0.65rem 0.75rem;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }
        .green-material-ai .swap-to {
          background: #ecfdf5;
          border-color: #a7f3d0;
        }
        .green-material-ai .swap-arrow {
          color: #059669;
          font-size: 1.1rem;
          flex-shrink: 0;
        }
        .green-material-ai .type-filter {
          border: 1px solid #e2e8f0;
          background: #fff;
          border-radius: 12px;
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .green-material-ai .type-filter:hover {
          background: #f1f5f9;
        }
        .green-material-ai .type-filter.active {
          background: #064e3b;
          color: #fff;
          border-color: #064e3b;
        }
        .green-material-ai .detail-panel {
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
        }
      `}</style>

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <Badge bg="success" className="mb-2 px-3 py-2 rounded-pill">
            <FaGraduationCap className="me-1" />
            Smart Green Material AI
          </Badge>
          <h5 className="fw-bold mb-1">Smart Green Material Recommendation AI</h5>
          <p className="text-muted mb-0 small" style={{ maxWidth: 520 }}>
            Actionable swaps — recyclable alternatives, lower-emission materials, sustainable replacements,
            and long-life components with estimated CO₂ savings.
          </p>
        </div>
        <Button
          variant="outline-secondary"
          size="sm"
          className="d-flex align-items-center gap-2 rounded-3"
          onClick={() => fetchData(true)}
          disabled={refreshing}
        >
          <FaSync style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
          {refreshing ? 'Analyzing…' : 'Refresh'}
        </Button>
      </div>

      <div className="hero-banner p-4 mb-4 text-white">
        <Row className="g-3 align-items-center">
          <Col lg={7}>
            <h6 className="fw-bold mb-2 opacity-90">Portfolio material intelligence</h6>
            <p className="mb-0 small opacity-85">
              {summary.recommendationCount} AI-generated options across {summary.totalAssets} assets ·{' '}
              <strong>{summary.portfolioPotentialSavingsKg?.toLocaleString()} kg</strong> potential CO₂ avoided
            </p>
          </Col>
          <Col lg={5}>
            <Row className="g-2">
              <Col xs={6}>
                <div className="stat-pill text-center">
                  <div className="fs-4 fw-bold">{summary.averageReductionPercent}%</div>
                  <small className="opacity-85">Avg reduction</small>
                </div>
              </Col>
              <Col xs={6}>
                <div className="stat-pill text-center">
                  <div className="fs-4 fw-bold">{summary.highPriorityCount}</div>
                  <small className="opacity-85">High priority</small>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </div>

      {featured && (
        <div className="mb-4">
          <h6 className="fw-bold text-muted text-uppercase mb-3" style={{ fontSize: '0.75rem', letterSpacing: '0.08em' }}>
            Featured recommendation
          </h6>
          <Row>
            <Col lg={8}>
              <RecommendationCard
                rec={featured}
                featured
                onSelect={setSelectedId}
                isSelected={selectedId === featured.id}
              />
            </Col>
          </Row>
        </div>
      )}

      <div className="d-flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          className={`type-filter ${activeType === 'all' ? 'active' : ''}`}
          onClick={() => setActiveType('all')}
        >
          All ({topRecommendations.length})
        </button>
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            type="button"
            className={`type-filter ${activeType === key ? 'active' : ''}`}
            onClick={() => setActiveType(key)}
          >
            {cfg.label} ({(byType[key] || []).length})
          </button>
        ))}
      </div>

      <Row className="g-4">
        <Col xl={8}>
          <Row className="g-3">
            {list.length === 0 ? (
              <Col xs={12}>
                <div className="text-center py-5 rounded-4 bg-light">
                  <FaCheckCircle className="text-success mb-2" size={32} />
                  <p className="text-muted mb-0">No recommendations in this category.</p>
                </div>
              </Col>
            ) : (
              list.map((rec) => (
                <Col md={6} key={rec.id}>
                  <RecommendationCard
                    rec={rec}
                    onSelect={setSelectedId}
                    isSelected={selectedId === rec.id}
                  />
                </Col>
              ))
            )}
          </Row>
        </Col>

        <Col xl={4}>
          {selected ? (
            <div className="detail-panel bg-white sticky-top" style={{ top: 16 }}>
              <div
                className="p-4 text-white"
                style={{ background: 'linear-gradient(135deg, #064e3b, #10b981)' }}
              >
                <h6 className="fw-bold mb-1">Impact breakdown</h6>
                <small className="opacity-85">{selected.recommendedMaterial}</small>
              </div>
              <div className="p-4">
                <div className="mb-3">
                  <small className="text-muted d-block">Baseline emissions</small>
                  <strong>{selected.impact.baselineKg} kg CO₂</strong>
                </div>
                <div className="mb-3">
                  <small className="text-muted d-block">After green swap</small>
                  <strong className="text-success">{selected.impact.projectedKg} kg CO₂</strong>
                </div>
                <div className="p-3 rounded-3 bg-success-subtle mb-3 text-center">
                  <div className="display-6 fw-bold text-success">{selected.impact.percentReduction}%</div>
                  <small className="text-muted">estimated reduction</small>
                </div>
                {selected.recyclabilityGain > 0 && (
                  <div className="small mb-2">
                    <FaRecycle className="text-success me-1" />
                    +{selected.recyclabilityGain}% recyclability
                  </div>
                )}
                {selected.serviceLifeGainYears > 0 && (
                  <div className="small mb-3">
                    <FaClock className="text-warning me-1" />
                    +{selected.serviceLifeGainYears} years service life
                  </div>
                )}
                <p className="small text-muted mb-0">{selected.description}</p>
              </div>
            </div>
          ) : (
            <Card className="border-0 shadow-sm detail-panel">
              <Card.Body className="text-center py-5 text-muted">
                Select a recommendation to view impact details
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      <Card
        className="border-0 mt-4"
        style={{
          borderRadius: 20,
          background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%)',
          border: '1px solid #99f6e4'
        }}
      >
        <Card.Body className="p-4">
          <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 text-success">
            <FaLightbulb />
            AI material insights
          </h6>
          <ul className="mb-0 ps-3">
            {insights.map((line, i) => (
              <li key={i} className="mb-2 small">
                {line.replace(/\*\*/g, '')}
              </li>
            ))}
          </ul>
        </Card.Body>
      </Card>
    </div>
  );
};

export default GreenMaterialRecommendations;
