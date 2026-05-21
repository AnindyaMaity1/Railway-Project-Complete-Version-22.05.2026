import React, { useCallback, useEffect, useState } from 'react';
import { Row, Col, Card, Badge, Button, Alert, ProgressBar } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FaCloudSun,
  FaSync,
  FaTint,
  FaThermometerFull,
  FaExclamationTriangle,
  FaWind,
  FaShieldAlt,
  FaLightbulb,
  FaMapMarkedAlt,
  FaWater
} from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';

const RISK_BADGE = {
  critical: 'danger',
  high: 'warning',
  moderate: 'info',
  low: 'success'
};

const RiskBadge = ({ level }) => (
  <Badge bg={RISK_BADGE[level] || 'secondary'} className="text-capitalize">
    {level}
  </Badge>
);

const ScoreBar = ({ score, variant }) => (
  <ProgressBar
    now={score}
    label={`${score}`}
    variant={variant || (score >= 70 ? 'danger' : score >= 50 ? 'warning' : score >= 30 ? 'info' : 'success')}
    style={{ minWidth: 90, height: 22 }}
  />
);

const ZoneCard = ({ zone, accent, icon: Icon, metricKey, detail }) => {
  const metric = zone[metricKey];
  if (!metric) return null;
  return (
    <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 16 }}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="d-flex align-items-center gap-2">
            <span
              className="d-inline-flex align-items-center justify-content-center rounded-3"
              style={{ width: 36, height: 36, background: `${accent}22`, color: accent }}
            >
              <Icon size={16} />
            </span>
            <div>
              <h6 className="fw-bold mb-0">{zone.label}</h6>
              <small className="text-muted">{zone.assetCount} asset(s)</small>
            </div>
          </div>
          <RiskBadge level={metric.level} />
        </div>
        <ScoreBar score={metric.score} />
        <p className="small text-muted mt-3 mb-0">{detail(metric, zone)}</p>
      </Card.Body>
    </Card>
  );
};

const ClimateResilienceIntelligence = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedZoneKey, setSelectedZoneKey] = useState(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await axios.get('/api/carbon/climate-resilience');
      if (res.data.success) {
        setData(res.data.data);
        const first = res.data.data.corridorZones?.[0];
        if (first) setSelectedZoneKey(first.zoneKey);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load climate resilience intelligence.');
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
    return <LoadingSpinner message="Analyzing flood, heat, and climate stress across corridors..." size="lg" />;
  }

  if (!data) {
    return <Alert variant="warning">Climate resilience intelligence unavailable.</Alert>;
  }

  const {
    summary,
    corridorZones,
    floodVulnerabilityPrediction,
    heatImpactOnTracks,
    climateStressAnalysis,
    weatherSustainabilityRisk,
    adaptationActions,
    featuredZone,
    insights
  } = data;

  const selected = corridorZones.find((z) => z.zoneKey === selectedZoneKey) || featuredZone;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FaCloudSun },
    { id: 'flood', label: 'Flood risk', icon: FaTint },
    { id: 'heat', label: 'Heat impact', icon: FaThermometerFull },
    { id: 'stress', label: 'Climate stress', icon: FaExclamationTriangle },
    { id: 'weather', label: 'Weather risk', icon: FaWind },
    { id: 'adapt', label: 'Adaptation', icon: FaShieldAlt }
  ];

  const readinessBadge =
    summary.adaptationReadiness === 'strong'
      ? 'success'
      : summary.adaptationReadiness === 'moderate'
        ? 'warning'
        : 'danger';

  return (
    <div className="climate-resilience-intel">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .climate-resilience-intel .hero-banner {
          background: linear-gradient(135deg, #0c4a6e 0%, #0369a1 40%, #0891b2 100%);
          border-radius: 20px;
          box-shadow: 0 16px 40px rgba(8, 145, 178, 0.28);
        }
        .climate-resilience-intel .stat-pill {
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.28);
          border-radius: 14px;
          padding: 1rem 1.25rem;
          color: #fff;
        }
        .climate-resilience-intel .tab-btn {
          border: 1px solid #e2e8f0;
          background: #fff;
          border-radius: 12px;
          padding: 0.6rem 1rem;
          font-weight: 600;
          font-size: 0.85rem;
          color: #64748b;
          transition: all 0.2s;
        }
        .climate-resilience-intel .tab-btn.active {
          background: linear-gradient(135deg, #0369a1, #0891b2);
          color: #fff;
          border-color: transparent;
          box-shadow: 0 4px 14px rgba(8, 145, 178, 0.35);
        }
        .climate-resilience-intel .corridor-cell {
          border-radius: 14px;
          padding: 1rem;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.2s;
          min-height: 100px;
        }
        .climate-resilience-intel .corridor-cell:hover,
        .climate-resilience-intel .corridor-cell.selected {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
        }
        .climate-resilience-intel .corridor-cell.selected {
          border-color: #0891b2;
          box-shadow: 0 0 0 3px rgba(8, 145, 178, 0.25);
        }
        .climate-resilience-intel .detail-panel {
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          background: linear-gradient(180deg, #f0f9ff 0%, #fff 35%);
        }
        .climate-resilience-intel .adapt-card {
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 1.25rem;
          height: 100%;
        }
      `}</style>

      <div className="hero-banner text-white p-4 p-md-5 mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2 opacity-90">
              <FaCloudSun size={22} />
              <span className="text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.12em' }}>
                Environmental adaptation intelligence
              </span>
            </div>
            <h4 className="fw-bold mb-2">Climate Resilience Intelligence</h4>
            <p className="mb-0 opacity-90" style={{ maxWidth: 580 }}>
              Flood vulnerability prediction, heat impact on tracks, climate stress analysis, and weather
              sustainability risk — future-oriented corridor adaptation for global rail networks.
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
              <div className="display-6 fw-bold mb-0">{summary.portfolioFloodVulnerability}</div>
              <small className="opacity-90">Flood vulnerability index</small>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-pill">
              <div className="display-6 fw-bold mb-0">{summary.portfolioHeatImpact}</div>
              <small className="opacity-90">Heat impact index</small>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-pill">
              <div className="display-6 fw-bold mb-0">{summary.portfolioClimateStress}</div>
              <small className="opacity-90">Climate stress index</small>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-pill">
              <div className="display-6 fw-bold mb-0">{summary.portfolioWeatherRisk}</div>
              <small className="opacity-90">Weather sustainability risk</small>
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

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Badge bg={readinessBadge} className="px-3 py-2">
          Adaptation readiness: {summary.adaptationReadiness.replace(/_/g, ' ')}
        </Badge>
        <Badge bg="danger" className="px-3 py-2">
          {summary.criticalZones} critical zone(s)
        </Badge>
        <Badge bg="info" className="px-3 py-2">
          {summary.totalZones} corridors · {summary.totalAssets} assets
        </Badge>
      </div>

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

      {activeTab === 'overview' && (
        <Row className="g-4">
          <Col lg={8}>
            <Card className="border-0 shadow-sm" style={{ borderRadius: 18 }}>
              <Card.Header className="bg-white border-0 pt-4 px-4">
                <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                  <FaMapMarkedAlt className="text-info" />
                  Corridor climate risk map
                </h5>
              </Card.Header>
              <Card.Body>
                <Row className="g-2">
                  {corridorZones.map((z) => (
                    <Col xs={6} md={4} key={z.zoneKey}>
                      <div
                        className={`corridor-cell ${selectedZoneKey === z.zoneKey ? 'selected' : ''}`}
                        style={{
                          background: `linear-gradient(145deg, ${z.color}18 0%, #fff 60%)`,
                          borderLeft: `4px solid ${z.color}`
                        }}
                        onClick={() => setSelectedZoneKey(z.zoneKey)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setSelectedZoneKey(z.zoneKey)}
                      >
                        <div className="fw-bold small mb-1">{z.label}</div>
                        <RiskBadge level={z.adaptationLevel} />
                        <div className="mt-2 small text-muted">
                          Adaptation score: <strong>{z.adaptationScore}</strong>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
                {corridorZones.length === 0 && (
                  <p className="text-muted text-center py-4">No corridor zones — add track fittings with km or location data.</p>
                )}
              </Card.Body>
            </Card>
          </Col>
          <Col lg={4}>
            {selected && (
              <div className="detail-panel p-4 h-100">
                <h5 className="fw-bold mb-3">{selected.label}</h5>
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Composite adaptation risk</small>
                  <ScoreBar score={selected.adaptationScore} />
                </div>
                <Row className="g-2 mb-3">
                  <Col xs={6}>
                    <div className="p-2 rounded-3 bg-white border text-center">
                      <FaTint className="text-primary mb-1" />
                      <div className="fw-bold">{selected.floodVulnerability.score}</div>
                      <small className="text-muted">Flood</small>
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="p-2 rounded-3 bg-white border text-center">
                      <FaThermometerFull className="text-danger mb-1" />
                      <div className="fw-bold">{selected.heatImpact.score}</div>
                      <small className="text-muted">Heat</small>
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="p-2 rounded-3 bg-white border text-center">
                      <FaExclamationTriangle className="text-warning mb-1" />
                      <div className="fw-bold">{selected.climateStress.score}</div>
                      <small className="text-muted">Stress</small>
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="p-2 rounded-3 bg-white border text-center">
                      <FaWind className="text-info mb-1" />
                      <div className="fw-bold">{selected.weatherSustainabilityRisk.score}</div>
                      <small className="text-muted">Weather</small>
                    </div>
                  </Col>
                </Row>
                <p className="small text-muted mb-0">{selected.floodVulnerability.prediction}</p>
              </div>
            )}
          </Col>
        </Row>
      )}

      {activeTab === 'flood' && (
        <Row className="g-3">
          {floodVulnerabilityPrediction.map((zone) => (
            <Col md={6} lg={4} key={zone.zoneKey}>
              <ZoneCard
                zone={zone}
                accent="#0ea5e9"
                icon={FaWater}
                metricKey="floodVulnerability"
                detail={(m) => (
                  <>
                    <strong>Prediction:</strong> {m.prediction}
                    <br />
                    <span className="text-muted">Horizon {m.horizon} · {m.confidence} confidence</span>
                  </>
                )}
              />
            </Col>
          ))}
        </Row>
      )}

      {activeTab === 'heat' && (
        <Row className="g-3">
          {heatImpactOnTracks.map((zone) => (
            <Col md={6} lg={4} key={zone.zoneKey}>
              <ZoneCard
                zone={zone}
                accent="#ef4444"
                icon={FaThermometerFull}
                metricKey="heatImpact"
                detail={(m) => (
                  <>
                    {m.summary}
                    <br />
                    <span className="text-muted">
                      Buckling risk: <strong>{m.trackBucklingRisk}</strong> · Peak: {m.peakRiskMonths?.join(', ')}
                    </span>
                  </>
                )}
              />
            </Col>
          ))}
        </Row>
      )}

      {activeTab === 'stress' && (
        <Row className="g-3">
          {climateStressAnalysis.map((zone) => (
            <Col md={6} lg={4} key={zone.zoneKey}>
              <ZoneCard
                zone={zone}
                accent="#8b5cf6"
                icon={FaExclamationTriangle}
                metricKey="climateStress"
                detail={(m, z) => (
                  <>
                    Degradation index <strong>{m.degradationIndex}</strong> · Avg infrastructure age stress{' '}
                    <strong>{m.infrastructureAgeStress}</strong> yr
                    <br />
                    <span className="text-muted">{z.assetCount} assets under climate stress monitoring</span>
                  </>
                )}
              />
            </Col>
          ))}
        </Row>
      )}

      {activeTab === 'weather' && (
        <Row className="g-3">
          {weatherSustainabilityRisk.map((zone) => (
            <Col md={6} lg={4} key={zone.zoneKey}>
              <ZoneCard
                zone={zone}
                accent="#6366f1"
                icon={FaWind}
                metricKey="weatherSustainabilityRisk"
                detail={(m) => (
                  <>
                    Seasonal outlook: <strong>{m.seasonalOutlook}</strong>
                    {m.disruptionFactors?.length > 0 && (
                      <ul className="mb-0 mt-2 ps-3">
                        {m.disruptionFactors.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              />
            </Col>
          ))}
        </Row>
      )}

      {activeTab === 'adapt' && (
        <Row className="g-3">
          {adaptationActions.map((action, i) => (
            <Col md={6} key={i}>
              <div className="adapt-card">
                <div className="d-flex justify-content-between mb-2">
                  <Badge bg={action.priority === 'high' ? 'danger' : 'warning'}>{action.priority} priority</Badge>
                  {action.type === 'flood' && <FaTint className="text-primary" />}
                  {action.type === 'heat' && <FaThermometerFull className="text-danger" />}
                  {action.type === 'monitor' && <FaCloudSun className="text-info" />}
                  {action.type === 'policy' && <FaShieldAlt className="text-success" />}
                </div>
                <h6 className="fw-bold">{action.title}</h6>
                <p className="small text-muted mb-2">{action.description.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
                {action.zones?.length > 0 && (
                  <div className="d-flex flex-wrap gap-1 mb-2">
                    {action.zones.map((z) => (
                      <Badge key={z} bg="light" text="dark" className="border">
                        {z}
                      </Badge>
                    ))}
                  </div>
                )}
                <small className="text-success fw-semibold">{action.impact}</small>
              </div>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default ClimateResilienceIntelligence;
