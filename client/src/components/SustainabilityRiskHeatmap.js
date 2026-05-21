import React, { useCallback, useEffect, useState } from 'react';
import { Row, Col, Card, Badge, Alert } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FaThermometerHalf,
  FaSync,
  FaFireAlt,
  FaTint,
  FaWrench,
  FaLeaf,
  FaCloudSun,
  FaMapMarkedAlt,
  FaTrain,
  FaExclamationCircle,
  FaCheckCircle,
  FaLightbulb
} from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';

const SCORE_KEY_TO_CATEGORY = {
  highEmission: 'highEmissionSectors',
  resourceWastage: 'resourceWastageZones',
  overMaintained: 'overMaintainedAreas',
  poorSustainability: 'poorSustainabilityRegions',
  climateVulnerable: 'climateVulnerableInfrastructure'
};

const CATEGORY_META = {
  highEmissionSectors: {
    label: 'High emission',
    fullLabel: 'High emission sectors',
    icon: FaFireAlt,
    accent: '#ef4444'
  },
  resourceWastageZones: {
    label: 'Wastage',
    fullLabel: 'Resource wastage zones',
    icon: FaTint,
    accent: '#0ea5e9'
  },
  overMaintainedAreas: {
    label: 'Over-maintained',
    fullLabel: 'Over-maintained areas',
    icon: FaWrench,
    accent: '#8b5cf6'
  },
  poorSustainabilityRegions: {
    label: 'Poor sustainability',
    fullLabel: 'Poor sustainability regions',
    icon: FaLeaf,
    accent: '#f97316'
  },
  climateVulnerableInfrastructure: {
    label: 'Climate risk',
    fullLabel: 'Climate-vulnerable infrastructure',
    icon: FaCloudSun,
    accent: '#6366f1'
  }
};

const STATUS_STYLES = {
  critical: {
    gradient: 'linear-gradient(145deg, #f87171 0%, #dc2626 50%, #991b1b 100%)',
    glow: '0 0 24px rgba(239, 68, 68, 0.45)',
    text: '#fff'
  },
  moderate: {
    gradient: 'linear-gradient(145deg, #fde047 0%, #eab308 50%, #ca8a04 100%)',
    glow: '0 0 20px rgba(234, 179, 8, 0.35)',
    text: '#422006'
  },
  sustainable: {
    gradient: 'linear-gradient(145deg, #4ade80 0%, #22c55e 50%, #15803d 100%)',
    glow: '0 0 20px rgba(34, 197, 94, 0.35)',
    text: '#fff'
  }
};

const StatCard = ({ count, label, color, icon: Icon }) => (
  <div
    className="h-100 p-4 rounded-4 position-relative overflow-hidden"
    style={{
      background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`,
      border: `1px solid ${color}33`,
      boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)'
    }}
  >
    <div
      className="position-absolute rounded-circle"
      style={{
        width: 80,
        height: 80,
        background: color,
        opacity: 0.08,
        top: -20,
        right: -20
      }}
    />
    <div className="d-flex align-items-center justify-content-between position-relative">
      <div>
        <div className="display-6 fw-bold mb-0" style={{ color }}>
          {count}
        </div>
        <div className="text-muted small fw-semibold text-uppercase mt-1" style={{ letterSpacing: '0.06em' }}>
          {label}
        </div>
      </div>
      <div
        className="rounded-3 d-flex align-items-center justify-content-center"
        style={{ width: 48, height: 48, backgroundColor: `${color}22`, color }}
      >
        <Icon size={22} />
      </div>
    </div>
  </div>
);

const CorridorHeatmap = ({ cells, grid, selectedKey, onSelect }) => {
  if (!cells?.length) {
    return (
      <div className="text-center py-5 text-white-50">
        <FaMapMarkedAlt size={32} className="mb-3 opacity-50" />
        <p className="mb-0">No corridor zones to map. Add track fittings with KM or location data.</p>
      </div>
    );
  }

  return (
    <div className="corridor-heatmap-wrapper">
      <div className="d-flex align-items-center gap-2 mb-4 px-1">
        <div className="depot-pill">
          <FaTrain className="me-2" />
          Operations Depot
        </div>
        <div className="corridor-line flex-grow-1" />
        <small className="text-white-50 fw-semibold">Corridor direction →</small>
      </div>

      <div
        className="heatmap-grid"
        style={{
          gridTemplateColumns: `repeat(${grid.cols}, minmax(140px, 1fr))`
        }}
      >
        {cells.map((cell, index) => {
          const style = STATUS_STYLES[cell.status] || STATUS_STYLES.moderate;
          const isSelected = cell.zoneKey === selectedKey;
          return (
            <button
              key={cell.zoneKey}
              type="button"
              className={`heatmap-cell ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(cell.zoneKey)}
              style={{
                background: style.gradient,
                color: style.text,
                boxShadow: isSelected ? style.glow : '0 4px 14px rgba(0,0,0,0.2)'
              }}
            >
              <span className="cell-order">#{index + 1}</span>
              <span className="cell-label">{cell.label}</span>
              <span className="cell-score">{cell.compositeScore}</span>
              <span className="cell-status">{cell.status}</span>
              <span className="cell-meta">{cell.metrics.assetCount} assets</span>
              {isSelected && <span className="cell-pulse" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const RiskBar = ({ label, score, color, icon: Icon }) => (
  <div className="risk-bar-row mb-3">
    <div className="d-flex justify-content-between align-items-center mb-2">
      <span className="d-flex align-items-center gap-2 small fw-semibold text-secondary">
        <Icon style={{ color, fontSize: '0.85rem' }} />
        {label}
      </span>
      <span className="fw-bold" style={{ color }}>
        {score}
      </span>
    </div>
    <div className="risk-bar-track">
      <div
        className="risk-bar-fill"
        style={{
          width: `${score}%`,
          background: `linear-gradient(90deg, ${color}99, ${color})`
        }}
      />
    </div>
  </div>
);

const SustainabilityRiskHeatmap = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [activeCategory, setActiveCategory] = useState('highEmissionSectors');

  const fetchHeatmap = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await axios.get('/api/carbon/risk-heatmap');
      if (res.data.success) {
        setData(res.data.data);
        setSelectedKey((prev) => prev || res.data.data.cells?.[0]?.zoneKey || null);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load sustainability risk heatmap.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHeatmap();
    const interval = setInterval(() => fetchHeatmap(true), 120000);
    return () => clearInterval(interval);
  }, [fetchHeatmap]);

  if (loading) {
    return <LoadingSpinner message="Building intelligent railway risk heatmap..." size="lg" />;
  }

  if (!data) {
    return <Alert variant="warning">Risk heatmap unavailable.</Alert>;
  }

  const { legend, summary, cells, grid, categories, recommendations } = data;
  const selected = cells.find((c) => c.zoneKey === selectedKey) || cells[0];
  const categoryList = categories[activeCategory] || [];
  const activeMeta = CATEGORY_META[activeCategory];

  return (
    <div className="sustainability-risk-heatmap">
      <style>{`
        .sustainability-risk-heatmap {
          --heatmap-bg: #0f172a;
          --heatmap-surface: #1e293b;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 0.2; }
        }
        .heatmap-hero {
          background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0f766e 100%);
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.15);
        }
        .gradient-legend {
          height: 12px;
          border-radius: 999px;
          background: linear-gradient(90deg, #22c55e 0%, #eab308 50%, #ef4444 100%);
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.15);
        }
        .corridor-panel {
          background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
          border-radius: 20px;
          padding: 1.75rem;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.25);
        }
        .depot-pill {
          display: inline-flex;
          align-items: center;
          padding: 0.4rem 1rem;
          background: rgba(14, 165, 233, 0.25);
          border: 1px solid rgba(14, 165, 233, 0.4);
          border-radius: 999px;
          color: #7dd3fc;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .corridor-line {
          height: 2px;
          background: linear-gradient(90deg, rgba(14,165,233,0.6), rgba(34,197,94,0.3), transparent);
          border-radius: 2px;
        }
        .heatmap-grid {
          display: grid;
          gap: 14px;
          width: 100%;
        }
        .heatmap-cell {
          position: relative;
          border: none;
          border-radius: 16px;
          padding: 1.1rem 1rem;
          text-align: left;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          min-height: 130px;
          overflow: hidden;
        }
        .heatmap-cell:hover {
          transform: translateY(-4px) scale(1.02);
        }
        .heatmap-cell.selected {
          transform: translateY(-6px) scale(1.03);
          outline: 3px solid #f8fafc;
          outline-offset: 2px;
          z-index: 2;
        }
        .heatmap-cell .cell-order {
          position: absolute;
          top: 10px;
          right: 12px;
          font-size: 0.65rem;
          opacity: 0.75;
          font-weight: 700;
        }
        .heatmap-cell .cell-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 700;
          line-height: 1.3;
          margin-bottom: 0.5rem;
          padding-right: 1.5rem;
        }
        .heatmap-cell .cell-score {
          display: block;
          font-size: 2rem;
          font-weight: 800;
          line-height: 1;
        }
        .heatmap-cell .cell-status {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: 0.35rem;
          opacity: 0.9;
        }
        .heatmap-cell .cell-meta {
          display: block;
          font-size: 0.7rem;
          opacity: 0.85;
          margin-top: 0.25rem;
        }
        .heatmap-cell .cell-pulse {
          position: absolute;
          inset: -4px;
          border: 2px solid rgba(255,255,255,0.5);
          border-radius: 18px;
          animation: pulse-ring 2s ease infinite;
          pointer-events: none;
        }
        .zone-detail-card {
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
          overflow: hidden;
        }
        .zone-detail-header {
          padding: 1.25rem 1.5rem;
          color: #fff;
        }
        .metric-chip {
          background: #f8fafc;
          border-radius: 12px;
          padding: 0.75rem 1rem;
          border: 1px solid #e2e8f0;
        }
        .risk-bar-track {
          height: 8px;
          background: #e2e8f0;
          border-radius: 999px;
          overflow: hidden;
        }
        .risk-bar-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.5s ease;
        }
        .category-tab {
          border: 1px solid #e2e8f0;
          background: #fff;
          border-radius: 14px;
          padding: 0.65rem 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          width: 100%;
        }
        .category-tab:hover {
          border-color: #94a3b8;
          background: #f8fafc;
        }
        .category-tab.active {
          border-color: #0f172a;
          background: #0f172a;
          color: #fff;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.2);
        }
        .category-tab.active .tab-count {
          background: rgba(255,255,255,0.2);
          color: #fff;
        }
        .tab-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          border-radius: 999px;
          background: #e2e8f0;
          font-size: 0.7rem;
          font-weight: 700;
        }
        .zone-list-item {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 1rem 1.15rem;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #fff;
        }
        .zone-list-item:hover {
          border-color: #94a3b8;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
          transform: translateX(4px);
        }
        .zone-list-item.active-zone {
          border-color: #0f172a;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.1);
        }
        .flag-pill {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.35rem 0.65rem;
          border-radius: 8px;
        }
      `}</style>

      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <Badge bg="dark" className="mb-2 px-3 py-2 rounded-pill">
            <FaThermometerHalf className="me-1" />
            Live risk intelligence
          </Badge>
          <h5 className="fw-bold mb-1">Sustainability Risk Heatmap</h5>
          <p className="text-muted mb-0 small" style={{ maxWidth: 520 }}>
            Intelligent railway corridor visualization — critical, moderate, and sustainable zones
            across emissions, wastage, maintenance, and climate exposure.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-dark btn-sm d-flex align-items-center gap-2 px-3 py-2 rounded-3"
          onClick={() => fetchHeatmap(true)}
          disabled={refreshing}
        >
          <FaSync style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
          {refreshing ? 'Updating map…' : 'Refresh map'}
        </button>
      </div>

      {/* Hero strip */}
      <div className="heatmap-hero p-4 mb-4 text-white">
        <Row className="align-items-center g-3">
          <Col lg={7}>
            <h6 className="fw-bold mb-2 opacity-90">Portfolio risk overview</h6>
            <p className="mb-0 small opacity-75">
              <strong>{summary.totalZones}</strong> corridor zones ·{' '}
              <strong>{summary.totalAssets}</strong> assets ·{' '}
              <strong>{summary.portfolioEmissionsKg?.toLocaleString()}</strong> kg CO₂ under monitoring
            </p>
          </Col>
          <Col lg={5}>
            <div className="gradient-legend mb-2" />
            <div className="d-flex justify-content-between small opacity-90">
              <span>🟢 Sustainable</span>
              <span>🟡 Moderate</span>
              <span>🔴 Critical</span>
            </div>
          </Col>
        </Row>
      </div>

      {/* Stats */}
      <Row className="g-3 mb-4">
        <Col sm={4}>
          <StatCard count={summary.criticalZones} label="Critical zones" color="#ef4444" icon={FaExclamationCircle} />
        </Col>
        <Col sm={4}>
          <StatCard count={summary.moderateZones} label="Moderate zones" color="#eab308" icon={FaThermometerHalf} />
        </Col>
        <Col sm={4}>
          <StatCard count={summary.sustainableZones} label="Sustainable zones" color="#22c55e" icon={FaCheckCircle} />
        </Col>
      </Row>

      {/* Main: heatmap + detail */}
      <Row className="g-4 mb-4">
        <Col xl={7}>
          <div className="corridor-panel">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="text-white fw-bold mb-0 d-flex align-items-center gap-2">
                <FaMapMarkedAlt />
                Railway corridor heatmap
              </h6>
              <Badge bg="light" text="dark" className="rounded-pill">
                Click a zone
              </Badge>
            </div>
            <CorridorHeatmap
              cells={cells}
              grid={grid}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
            />
          </div>
        </Col>

        <Col xl={5}>
          {selected && (
            <div className="zone-detail-card h-100">
              <div
                className="zone-detail-header"
                style={{ background: STATUS_STYLES[selected.status]?.gradient }}
              >
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <small className="opacity-75 text-uppercase fw-semibold" style={{ fontSize: '0.65rem', letterSpacing: '0.1em' }}>
                      Selected zone
                    </small>
                    <h5 className="fw-bold mb-1 mt-1">{selected.label}</h5>
                    <Badge bg="light" text="dark" className="rounded-pill">
                      {selected.status} · risk {selected.compositeScore}
                    </Badge>
                  </div>
                  <div className="text-end">
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>
                      {selected.compositeScore}
                    </div>
                    <small className="opacity-85">composite</small>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <Row className="g-2 mb-4">
                  <Col xs={6}>
                    <div className="metric-chip">
                      <small className="text-muted d-block">Total CO₂</small>
                      <strong>{selected.metrics.totalEmissionsKg.toLocaleString()} kg</strong>
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="metric-chip">
                      <small className="text-muted d-block">Sustainability</small>
                      <strong>{selected.metrics.avgSustainabilityScore} / 100</strong>
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="metric-chip">
                      <small className="text-muted d-block">Hotspots</small>
                      <strong>{selected.metrics.hotspotCount}</strong>
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="metric-chip">
                      <small className="text-muted d-block">Assets</small>
                      <strong>{selected.metrics.assetCount}</strong>
                    </div>
                  </Col>
                </Row>

                <h6 className="small fw-bold text-muted text-uppercase mb-3" style={{ letterSpacing: '0.06em' }}>
                  Active risk flags
                </h6>
                <div className="d-flex flex-wrap gap-2 mb-4">
                  {selected.flags.highEmission && (
                    <span className="flag-pill bg-danger-subtle text-danger">🔥 High emission</span>
                  )}
                  {selected.flags.resourceWastage && (
                    <span className="flag-pill bg-info-subtle text-info">💧 Wastage</span>
                  )}
                  {selected.flags.overMaintained && (
                    <span className="flag-pill bg-primary-subtle text-primary">🔧 Over-maintained</span>
                  )}
                  {selected.flags.poorSustainability && (
                    <span className="flag-pill bg-warning-subtle text-warning">🍃 Poor sustainability</span>
                  )}
                  {selected.flags.climateVulnerable && (
                    <span className="flag-pill bg-secondary-subtle text-secondary">⛈ Climate vulnerable</span>
                  )}
                  {!Object.values(selected.flags).some(Boolean) && (
                    <span className="flag-pill bg-success-subtle text-success">✓ Sustainable profile</span>
                  )}
                </div>

                <h6 className="small fw-bold text-muted text-uppercase mb-3" style={{ letterSpacing: '0.06em' }}>
                  Dimension scores
                </h6>
                {Object.entries(selected.categoryScores).map(([key, score]) => {
                  const meta = CATEGORY_META[SCORE_KEY_TO_CATEGORY[key]];
                  const Icon = meta?.icon || FaLeaf;
                  const color =
                    score >= 70 ? legend.critical.color : score >= 40 ? legend.moderate.color : legend.sustainable.color;
                  return (
                    <RiskBar
                      key={key}
                      label={meta?.fullLabel || key}
                      score={score}
                      color={color}
                      icon={Icon}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </Col>
      </Row>

      {/* Category explorer */}
      <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: 20 }}>
        <Card.Body className="p-4">
          <h6 className="fw-bold mb-4">Explore risk categories</h6>
          <Row className="g-4">
            <Col lg={4}>
              <div className="d-flex flex-column gap-2">
                {Object.entries(CATEGORY_META).map(([catKey, meta]) => {
                  const Icon = meta.icon;
                  const count = (categories[catKey] || []).length;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      className={`category-tab ${activeCategory === catKey ? 'active' : ''}`}
                      onClick={() => setActiveCategory(catKey)}
                    >
                      <div className="d-flex align-items-center justify-content-between">
                        <span className="d-flex align-items-center gap-2 fw-semibold small">
                          <Icon style={{ color: activeCategory === catKey ? '#fff' : meta.accent }} />
                          {meta.label}
                        </span>
                        <span className="tab-count">{count}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Col>
            <Col lg={8}>
              <div className="d-flex align-items-center gap-2 mb-3">
                {activeMeta && (
                  <>
                    <activeMeta.icon style={{ color: activeMeta.accent }} />
                    <h6 className="fw-bold mb-0">{activeMeta.fullLabel}</h6>
                  </>
                )}
              </div>
              {categoryList.length === 0 ? (
                <div className="text-center py-5 rounded-4 bg-light">
                  <FaCheckCircle className="text-success mb-2" size={28} />
                  <p className="text-muted mb-0 small">No zones flagged in this category — good news.</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {categoryList.map((z) => (
                    <div
                      key={z.zoneKey}
                      className={`zone-list-item ${selectedKey === z.zoneKey ? 'active-zone' : ''}`}
                      onClick={() => setSelectedKey(z.zoneKey)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedKey(z.zoneKey)}
                    >
                      <div className="d-flex justify-content-between align-items-start gap-3">
                        <div>
                          <div className="fw-bold">{z.label}</div>
                          <div className="small text-muted mt-1">{z.summary}</div>
                        </div>
                        <div className="text-end flex-shrink-0">
                          <div
                            className="fw-bold fs-5"
                            style={{ color: z.color }}
                          >
                            {z.score}
                          </div>
                          <Badge
                            className="mt-1"
                            style={{ backgroundColor: z.color, fontSize: '0.65rem' }}
                          >
                            {z.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Insights */}
      <Card
        className="border-0 mb-0"
        style={{
          borderRadius: 20,
          background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
          border: '1px solid #bbf7d0'
        }}
      >
        <Card.Body className="p-4">
          <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 text-success">
            <FaLightbulb />
            AI heatmap insights
          </h6>
          <Row className="g-2">
            {recommendations.map((rec, i) => (
              <Col md={6} key={i}>
                <div className="d-flex gap-2 align-items-start small p-2 rounded-3 bg-white bg-opacity-75">
                  <span className="text-success fw-bold">{i + 1}.</span>
                  <span>{rec.replace(/\*\*/g, '')}</span>
                </div>
              </Col>
            ))}
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

export default SustainabilityRiskHeatmap;
