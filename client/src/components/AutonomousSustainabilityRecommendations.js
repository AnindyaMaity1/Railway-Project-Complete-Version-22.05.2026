import React, { useCallback, useEffect, useState } from 'react';
import { Row, Col, Card, Badge, Button, Alert } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FaRobot,
  FaSync,
  FaExchangeAlt,
  FaWrench,
  FaRoute,
  FaRecycle,
  FaHandshake,
  FaLightbulb,
  FaBolt,
  FaClock,
  FaCheckCircle
} from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';

const TYPE_META = {
  replace_asset: { icon: FaExchangeAlt, color: '#8b5cf6', label: 'Replace asset' },
  delay_maintenance: { icon: FaWrench, color: '#0ea5e9', label: 'Delay maintenance' },
  combine_routes: { icon: FaRoute, color: '#059669', label: 'Combine routes' },
  alternative_material: { icon: FaRecycle, color: '#22c55e', label: 'Alternative material' },
  greener_vendor: { icon: FaHandshake, color: '#d97706', label: 'Greener vendor' }
};

const priorityVariant = (p) => (p === 'high' ? 'danger' : p === 'medium' ? 'warning' : 'secondary');

const DecisionCard = ({ rec, featured = false, onSelect, isSelected }) => {
  const meta = TYPE_META[rec.type] || TYPE_META.replace_asset;
  const Icon = meta.icon;

  return (
    <div
      className={`agent-decision-card ${featured ? 'featured' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect?.(rec.id)}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => onSelect && e.key === 'Enter' && onSelect(rec.id)}
    >
      {featured && (
        <div className="agent-pick-badge">
          <FaBolt className="me-1" />
          Top autonomous pick
        </div>
      )}
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div className="d-flex align-items-center gap-2">
          <span
            className="d-inline-flex align-items-center justify-content-center rounded-3"
            style={{ width: 36, height: 36, background: `${meta.color}22`, color: meta.color }}
          >
            <Icon size={16} />
          </span>
          <div>
            <Badge bg="dark" className="mb-1" style={{ fontSize: '0.6rem' }}>
              <FaRobot className="me-1" size={10} />
              {rec.autonomy}
            </Badge>
            <div className="small text-muted">{meta.label}</div>
          </div>
        </div>
        <Badge bg={priorityVariant(rec.priority)}>{rec.priority}</Badge>
      </div>

      <h6 className="fw-bold mb-2">{rec.title}</h6>
      <div
        className="action-banner mb-2 py-2 px-3 rounded-3 text-center"
        style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}44` }}
      >
        <small className="text-muted d-block text-uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.08em' }}>
          Autonomous decision
        </small>
        <strong style={{ color: meta.color }}>{rec.actionLabel}</strong>
        <div className="small text-muted mt-1">{rec.confidence}% confidence</div>
      </div>

      <p className="small text-muted mb-2">{rec.rationale.replace(/\*\*/g, '')}</p>
      {rec.impact?.estimatedSavingsKg > 0 && (
        <div className="d-flex justify-content-between small">
          <span className="text-muted">Est. CO₂ impact</span>
          <strong className="text-success">{rec.impact.estimatedSavingsKg} kg saved</strong>
        </div>
      )}
    </div>
  );
};

const AutonomousSustainabilityRecommendations = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeType, setActiveType] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await axios.get('/api/carbon/autonomous-recommendations');
      if (res.data.success) {
        setData(res.data.data);
        setSelectedId(res.data.data.featured?.id || res.data.data.recommendations?.[0]?.id || null);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load autonomous sustainability recommendations.');
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
    return <LoadingSpinner message="Autonomous agent is analyzing fleet and issuing recommendations..." size="lg" />;
  }

  if (!data) {
    return <Alert variant="warning">Autonomous recommendations unavailable.</Alert>;
  }

  const { summary, agentSummary, featured, recommendations, byType, insights, agenticLabel } = data;
  const list = activeType === 'all' ? recommendations : byType[activeType] || [];
  const selected = recommendations.find((r) => r.id === selectedId);

  const typeFilters = [
    { id: 'all', label: 'All actions', count: summary.totalRecommendations },
    { id: 'replace_asset', label: 'Replace', count: summary.replaceNowCount + summary.replaceLaterCount },
    { id: 'delay_maintenance', label: 'Maintenance', count: summary.maintenanceDelays },
    { id: 'combine_routes', label: 'Routes', count: summary.routesCombined },
    { id: 'alternative_material', label: 'Materials', count: summary.materialSwaps },
    { id: 'greener_vendor', label: 'Vendors', count: summary.vendorSwitches }
  ];

  return (
    <div className="autonomous-sustainability">
      <style>{`
        @keyframes pulse-agent { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .autonomous-sustainability .hero-banner {
          background: linear-gradient(135deg, #312e81 0%, #4f46e5 45%, #7c3aed 100%);
          border-radius: 20px;
          box-shadow: 0 16px 40px rgba(79, 70, 229, 0.3);
        }
        .autonomous-sustainability .stat-pill {
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.28);
          border-radius: 14px;
          padding: 1rem 1.25rem;
          color: #fff;
        }
        .autonomous-sustainability .agent-status {
          background: rgba(255,255,255,0.12);
          border-radius: 16px;
          padding: 1rem 1.25rem;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .autonomous-sustainability .agent-pulse {
          width: 10px;
          height: 10px;
          background: #4ade80;
          border-radius: 50%;
          animation: pulse-agent 1.5s ease infinite;
        }
        .autonomous-sustainability .filter-chip {
          border: 1px solid #e2e8f0;
          background: #fff;
          border-radius: 999px;
          padding: 0.4rem 0.9rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
        }
        .autonomous-sustainability .filter-chip.active {
          background: #4f46e5;
          color: #fff;
          border-color: transparent;
        }
        .autonomous-sustainability .agent-decision-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 1.25rem;
          height: 100%;
          transition: all 0.2s;
          cursor: pointer;
        }
        .autonomous-sustainability .agent-decision-card:hover {
          border-color: #a5b4fc;
          box-shadow: 0 8px 24px rgba(79, 70, 229, 0.12);
          transform: translateY(-2px);
        }
        .autonomous-sustainability .agent-decision-card.selected {
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
        }
        .autonomous-sustainability .agent-decision-card.featured {
          border: 2px solid #4f46e5;
          background: linear-gradient(180deg, #eef2ff 0%, #fff 35%);
        }
        .autonomous-sustainability .agent-pick-badge {
          display: inline-flex;
          align-items: center;
          background: linear-gradient(90deg, #4f46e5, #7c3aed);
          color: #fff;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .autonomous-sustainability .detail-panel {
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          background: linear-gradient(180deg, #f5f3ff 0%, #fff 40%);
        }
      `}</style>

      <div className="hero-banner text-white p-4 p-md-5 mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2 opacity-90">
              <FaRobot size={22} />
              <span className="text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.12em' }}>
                {agenticLabel}
              </span>
            </div>
            <h4 className="fw-bold mb-2">Autonomous Sustainability Recommendations</h4>
            <p className="mb-0 opacity-90" style={{ maxWidth: 580 }}>
              The AI independently decides: replace now or later, delay maintenance, combine routes, switch
              materials, and route to greener vendors — without waiting for manual prompts.
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
            Refresh agent
          </Button>
        </div>

        <div className="agent-status mt-4 mb-3">
          <div className="d-flex align-items-center gap-2 mb-2">
            <span className="agent-pulse" />
            <strong>Agent status: {agentSummary.status.replace(/_/g, ' ')}</strong>
            <Badge bg="light" text="dark" className="ms-auto">
              {agentSummary.confidenceAvg}% avg confidence
            </Badge>
          </div>
          {agentSummary.narrative?.map((line, i) => (
            <p key={i} className="small mb-1 opacity-90">
              {line.replace(/\*\*(.*?)\*\*/g, '$1')}
            </p>
          ))}
        </div>

        <Row className="g-3">
          <Col xs={6} md={3}>
            <div className="stat-pill">
              <div className="display-6 fw-bold mb-0">{summary.totalRecommendations}</div>
              <small className="opacity-90">Autonomous actions</small>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-pill">
              <div className="display-6 fw-bold mb-0">{summary.highPriorityCount}</div>
              <small className="opacity-90">High priority</small>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-pill">
              <div className="display-6 fw-bold mb-0">{summary.totalSavingsPotentialKg.toLocaleString()}</div>
              <small className="opacity-90">kg CO₂ potential</small>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-pill">
              <div className="display-6 fw-bold mb-0">{summary.autonomousActions}</div>
              <small className="opacity-90">Agent-issued decisions</small>
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

      {featured && (
        <Row className="g-4 mb-4">
          <Col lg={7}>
            <DecisionCard rec={featured} featured onSelect={setSelectedId} isSelected={selectedId === featured.id} />
          </Col>
          <Col lg={5}>
            {selected && (
              <div className="detail-panel p-4 h-100">
                <h6 className="fw-bold text-muted text-uppercase mb-3" style={{ fontSize: '0.7rem', letterSpacing: '0.08em' }}>
                  Agent decision detail
                </h6>
                <Badge bg={priorityVariant(selected.priority)} className="mb-2">
                  {selected.priority} priority
                </Badge>
                <h5 className="fw-bold">{selected.actionLabel}</h5>
                <p className="text-muted small">{selected.rationale.replace(/\*\*/g, '')}</p>
                <hr />
                <div className="small">
                  <div className="d-flex justify-content-between mb-2">
                    <span>Type</span>
                    <strong>{TYPE_META[selected.type]?.label}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Decision</span>
                    <strong className="text-capitalize">{selected.decision}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Confidence</span>
                    <strong>{selected.confidence}%</strong>
                  </div>
                  {selected.impact?.estimatedSavingsKg > 0 && (
                    <div className="d-flex justify-content-between">
                      <span>CO₂ savings</span>
                      <strong className="text-success">{selected.impact.estimatedSavingsKg} kg</strong>
                    </div>
                  )}
                </div>
                {selected.target?.serialNumber && (
                  <div className="mt-3 p-2 rounded-3 bg-white border small">
                    <FaCheckCircle className="text-success me-1" />
                    Asset: <strong>{selected.target.serialNumber}</strong>
                  </div>
                )}
                {selected.target?.label && (
                  <div className="mt-2 p-2 rounded-3 bg-white border small">
                    <FaRoute className="text-primary me-1" />
                    Corridor: <strong>{selected.target.label}</strong> ({selected.target.assetCount} assets)
                  </div>
                )}
              </div>
            )}
          </Col>
        </Row>
      )}

      <div className="d-flex flex-wrap gap-2 mb-4">
        {typeFilters.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`filter-chip ${activeType === f.id ? 'active' : ''}`}
            onClick={() => setActiveType(f.id)}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      <Row className="g-3">
        {list.map((rec) => (
          <Col md={6} lg={4} key={rec.id}>
            <DecisionCard
              rec={rec}
              onSelect={setSelectedId}
              isSelected={selectedId === rec.id}
            />
          </Col>
        ))}
      </Row>

      {list.length === 0 && (
        <Alert variant="info" className="text-center">
          No autonomous recommendations for this category. Add fleet data or try another filter.
        </Alert>
      )}

      <Card className="border-0 shadow-sm mt-4" style={{ borderRadius: 16 }}>
        <Card.Body className="py-3">
          <Row className="text-center g-2">
            <Col xs={4} md={2}>
              <FaExchangeAlt className="text-primary mb-1" />
              <div className="fw-bold">{summary.replaceNowCount}</div>
              <small className="text-muted">Replace now</small>
            </Col>
            <Col xs={4} md={2}>
              <FaClock className="text-info mb-1" />
              <div className="fw-bold">{summary.replaceLaterCount}</div>
              <small className="text-muted">Replace later</small>
            </Col>
            <Col xs={4} md={2}>
              <FaWrench className="text-info mb-1" />
              <div className="fw-bold">{summary.maintenanceDelays}</div>
              <small className="text-muted">Delay maint.</small>
            </Col>
            <Col xs={4} md={2}>
              <FaRoute className="text-success mb-1" />
              <div className="fw-bold">{summary.routesCombined}</div>
              <small className="text-muted">Route merges</small>
            </Col>
            <Col xs={4} md={2}>
              <FaRecycle className="text-success mb-1" />
              <div className="fw-bold">{summary.materialSwaps}</div>
              <small className="text-muted">Materials</small>
            </Col>
            <Col xs={4} md={2}>
              <FaHandshake className="text-warning mb-1" />
              <div className="fw-bold">{summary.vendorSwitches}</div>
              <small className="text-muted">Vendors</small>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AutonomousSustainabilityRecommendations;
