import React, { useCallback, useEffect, useState } from 'react';
import { Row, Col, Card, Badge, Button, Alert, Table, ProgressBar } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FaHandshake,
  FaSync,
  FaTrophy,
  FaShieldAlt,
  FaIndustry,
  FaShoppingCart,
  FaLeaf,
  FaExclamationTriangle,
  FaCheckCircle,
  FaLightbulb,
  FaChartLine
} from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';

const PROCUREMENT_CONFIG = {
  preferred: { bg: 'success', label: 'Preferred' },
  approved: { bg: 'info', label: 'Approved' },
  review: { bg: 'warning', label: 'Review' },
  phase_out: { bg: 'danger', label: 'Phase-out' }
};

const ETHICAL_BADGE = {
  strong: { bg: 'success', label: 'Strong' },
  adequate: { bg: 'primary', label: 'Adequate' },
  needs_improvement: { bg: 'warning', label: 'Needs improvement' }
};

const TierBadge = ({ tier, color, label }) => (
  <span
    className="d-inline-flex align-items-center justify-content-center fw-bold rounded-circle"
    style={{
      width: 36,
      height: 36,
      background: `${color}22`,
      color,
      border: `2px solid ${color}`,
      fontSize: '0.95rem'
    }}
    title={label}
  >
    {tier}
  </span>
);

const VendorSustainabilityIntelligence = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('ranking');
  const [selectedVendorId, setSelectedVendorId] = useState(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await axios.get('/api/carbon/vendor-intelligence');
      if (res.data.success) {
        setData(res.data.data);
        const first = res.data.data.greenRanking?.[0];
        if (first) setSelectedVendorId(first.vendorId);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load vendor sustainability intelligence.');
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
    return <LoadingSpinner message="AI is ranking vendors and analyzing ethical sourcing..." size="lg" />;
  }

  if (!data) {
    return <Alert variant="warning">Vendor sustainability intelligence unavailable.</Alert>;
  }

  const {
    summary,
    greenRanking,
    ethicalAnalysis,
    emissionEfficiencyLeaderboard,
    procurementSuggestions,
    insights,
    tiers
  } = data;

  const selected = greenRanking.find((v) => v.vendorId === selectedVendorId) || greenRanking[0];

  const tabs = [
    { id: 'ranking', label: 'Green ranking', icon: FaTrophy },
    { id: 'ethical', label: 'Ethical sourcing', icon: FaShieldAlt },
    { id: 'emissions', label: 'Emission efficiency', icon: FaIndustry },
    { id: 'procurement', label: 'Procurement', icon: FaShoppingCart }
  ];

  return (
    <div className="vendor-sustainability-intel">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .vendor-sustainability-intel .hero-banner {
          background: linear-gradient(135deg, #1e3a5f 0%, #0f766e 45%, #059669 100%);
          border-radius: 20px;
          box-shadow: 0 16px 40px rgba(15, 118, 110, 0.25);
        }
        .vendor-sustainability-intel .stat-pill {
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.28);
          border-radius: 14px;
          padding: 1rem 1.25rem;
          color: #fff;
        }
        .vendor-sustainability-intel .tab-btn {
          border: 1px solid #e2e8f0;
          background: #fff;
          border-radius: 12px;
          padding: 0.6rem 1rem;
          font-weight: 600;
          font-size: 0.85rem;
          color: #64748b;
          transition: all 0.2s;
        }
        .vendor-sustainability-intel .tab-btn.active {
          background: linear-gradient(135deg, #0f766e, #059669);
          color: #fff;
          border-color: transparent;
          box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);
        }
        .vendor-sustainability-intel .rank-row {
          cursor: pointer;
          transition: background 0.15s;
        }
        .vendor-sustainability-intel .rank-row:hover,
        .vendor-sustainability-intel .rank-row.selected {
          background: #ecfdf5;
        }
        .vendor-sustainability-intel .detail-panel {
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          background: linear-gradient(180deg, #f8fafc 0%, #fff 30%);
        }
        .vendor-sustainability-intel .proc-card {
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 1.25rem;
          height: 100%;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .vendor-sustainability-intel .proc-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
        }
        .vendor-sustainability-intel .tier-bar {
          height: 8px;
          border-radius: 4px;
          background: #e2e8f0;
          overflow: hidden;
        }
        .vendor-sustainability-intel .tier-segment {
          height: 100%;
          float: left;
        }
      `}</style>

      <div className="hero-banner text-white p-4 p-md-5 mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2 opacity-90">
              <FaHandshake size={22} />
              <span className="text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.12em' }}>
                Enterprise procurement intelligence
              </span>
            </div>
            <h4 className="fw-bold mb-2">Vendor Sustainability Intelligence</h4>
            <p className="mb-0 opacity-90" style={{ maxWidth: 560 }}>
              AI green ranking, ethical sourcing analysis, emission efficiency scoring, and sustainable procurement
              recommendations across your supplier network.
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
              <div className="display-6 fw-bold mb-0">{summary.totalVendors}</div>
              <small className="opacity-90">Vendors analyzed</small>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-pill">
              <div className="display-6 fw-bold mb-0">{summary.avgGreenScore}</div>
              <small className="opacity-90">Avg green score</small>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-pill">
              <div className="display-6 fw-bold mb-0">{summary.preferredCount}</div>
              <small className="opacity-90">Preferred suppliers</small>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-pill">
              <div className="display-6 fw-bold mb-0">{summary.phaseOutCount}</div>
              <small className="opacity-90">Phase-out candidates</small>
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

      <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: 18 }}>
        <Card.Body>
          <h6 className="fw-bold text-muted text-uppercase mb-3" style={{ fontSize: '0.7rem', letterSpacing: '0.08em' }}>
            Tier distribution
          </h6>
          <div className="tier-bar mb-2 clearfix">
            {tiers.map((t) => {
              const count = summary.tierDistribution[t.tier] || 0;
              const pct = summary.totalVendors ? (count / summary.totalVendors) * 100 : 0;
              if (!pct) return null;
              return (
                <div
                  key={t.tier}
                  className="tier-segment"
                  style={{ width: `${pct}%`, background: t.color }}
                  title={`Tier ${t.tier}: ${count}`}
                />
              );
            })}
          </div>
          <div className="d-flex flex-wrap gap-3">
            {tiers.map((t) => (
              <small key={t.tier} className="text-muted">
                <span
                  className="d-inline-block rounded-circle me-1"
                  style={{ width: 10, height: 10, background: t.color }}
                />
                Tier {t.tier} ({summary.tierDistribution[t.tier] || 0}) — {t.label}
              </small>
            ))}
          </div>
        </Card.Body>
      </Card>

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

      {activeTab === 'ranking' && (
        <Row className="g-4">
          <Col lg={7}>
            <Card className="border-0 shadow-sm" style={{ borderRadius: 18 }}>
              <Card.Header className="bg-white border-0 pt-4 px-4">
                <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                  <FaTrophy className="text-success" />
                  AI Vendor Green Ranking
                </h5>
              </Card.Header>
              <Card.Body className="px-0 pb-0">
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Vendor</th>
                      <th>Tier</th>
                      <th>Score</th>
                      <th>Procurement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {greenRanking.map((v) => {
                      const proc = PROCUREMENT_CONFIG[v.procurement.action] || PROCUREMENT_CONFIG.review;
                      const isSel = v.vendorId === selectedVendorId;
                      return (
                        <tr
                          key={v.vendorId}
                          className={`rank-row ${isSel ? 'selected' : ''}`}
                          onClick={() => setSelectedVendorId(v.vendorId)}
                        >
                          <td className="text-muted">{v.greenRanking.rank}</td>
                          <td>
                            <strong>{v.companyName}</strong>
                            {v.vendorCode && (
                              <small className="d-block text-muted">{v.vendorCode}</small>
                            )}
                          </td>
                          <td>
                            <TierBadge
                              tier={v.greenRanking.tier}
                              color={v.greenRanking.color}
                              label={v.greenRanking.tierLabel}
                            />
                          </td>
                          <td>
                            <span className="fw-bold">{v.greenRanking.score}</span>
                          </td>
                          <td>
                            <Badge bg={proc.bg}>{proc.label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
                {greenRanking.length === 0 && (
                  <p className="text-muted text-center py-4">No vendors in database. Add vendors to enable ranking.</p>
                )}
              </Card.Body>
            </Card>
          </Col>
          <Col lg={5}>
            {selected && (
              <div className="detail-panel p-4 h-100">
                <div className="d-flex align-items-center gap-3 mb-4">
                  <TierBadge
                    tier={selected.greenRanking.tier}
                    color={selected.greenRanking.color}
                    label={selected.greenRanking.tierLabel}
                  />
                  <div>
                    <h5 className="fw-bold mb-0">{selected.companyName}</h5>
                    <small className="text-muted">{selected.greenRanking.tierLabel}</small>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="d-flex justify-content-between small mb-1">
                    <span>Composite green score</span>
                    <strong>{selected.greenRanking.score}</strong>
                  </div>
                  <ProgressBar now={selected.greenRanking.score} variant="success" style={{ height: 8 }} />
                </div>
                <Row className="g-2 mb-3">
                  <Col xs={4}>
                    <div className="text-center p-2 rounded-3 bg-white border">
                      <small className="text-muted d-block">Carbon</small>
                      <strong>{selected.carbonScore.sustainabilityScore}</strong>
                    </div>
                  </Col>
                  <Col xs={4}>
                    <div className="text-center p-2 rounded-3 bg-white border">
                      <small className="text-muted d-block">Ethical</small>
                      <strong>{selected.ethicalSourcing.score}</strong>
                    </div>
                  </Col>
                  <Col xs={4}>
                    <div className="text-center p-2 rounded-3 bg-white border">
                      <small className="text-muted d-block">Emissions</small>
                      <strong>{selected.emissionEfficiency.score}</strong>
                    </div>
                  </Col>
                </Row>
                <p className="small text-muted mb-0">{selected.procurement.rationale}</p>
                <hr />
                <small className="text-muted">
                  <FaLeaf className="me-1 text-success" />
                  {selected.linkedAssets} linked asset(s) · Intensity {selected.emissionEfficiency.carbonIntensity} kg
                  CO₂/unit
                </small>
              </div>
            )}
          </Col>
        </Row>
      )}

      {activeTab === 'ethical' && (
        <Row className="g-3">
          {ethicalAnalysis.map((e) => {
            const badge = ETHICAL_BADGE[e.rating] || ETHICAL_BADGE.adequate;
            return (
              <Col md={6} lg={4} key={e.vendorId}>
                <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 16 }}>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h6 className="fw-bold mb-0">{e.companyName}</h6>
                      <Badge bg={badge.bg}>{badge.label}</Badge>
                    </div>
                    <div className="display-6 fw-bold text-primary mb-2">{e.score}</div>
                    <small className="text-muted d-block mb-2">
                      {e.certificationCount} certification(s)
                    </small>
                    {e.flags?.length > 0 ? (
                      <ul className="small text-muted mb-0 ps-3">
                        {e.flags.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="small text-muted">No flags</span>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
          {ethicalAnalysis.length === 0 && (
            <Col>
              <Alert variant="info">Ethical sourcing analysis requires vendor records.</Alert>
            </Col>
          )}
        </Row>
      )}

      {activeTab === 'emissions' && (
        <Card className="border-0 shadow-sm" style={{ borderRadius: 18 }}>
          <Card.Header className="bg-white border-0 pt-4 px-4">
            <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
              <FaChartLine className="text-info" />
              Emission efficiency scoring
            </h5>
          </Card.Header>
          <Card.Body>
            <Table responsive className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Vendor</th>
                  <th>Efficiency score</th>
                  <th>Carbon intensity</th>
                  <th>Linked emissions (kg)</th>
                  <th>Level</th>
                </tr>
              </thead>
              <tbody>
                {emissionEfficiencyLeaderboard.map((row, i) => (
                  <tr key={row.vendorId}>
                    <td>
                      <span className="text-muted me-2">{i + 1}.</span>
                      <strong>{row.companyName}</strong>
                    </td>
                    <td>
                      <ProgressBar
                        now={row.score}
                        label={`${row.score}`}
                        variant={row.score >= 70 ? 'success' : row.score >= 45 ? 'warning' : 'danger'}
                        style={{ minWidth: 100, height: 22 }}
                      />
                    </td>
                    <td>{row.carbonIntensity}</td>
                    <td>{row.linkedEmissionsKg}</td>
                    <td>
                      <Badge bg={row.level === 'efficient' ? 'success' : row.level === 'average' ? 'warning' : 'danger'}>
                        {row.level}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {activeTab === 'procurement' && (
        <Row className="g-3">
          {procurementSuggestions.map((s, i) => (
            <Col md={6} key={i}>
              <div className="proc-card">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <Badge bg={s.priority === 'high' ? 'danger' : 'warning'}>{s.priority} priority</Badge>
                  {s.type === 'allocate' && <FaCheckCircle className="text-success" />}
                  {s.type === 'reduce' && <FaExclamationTriangle className="text-danger" />}
                  {s.type === 'audit' && <FaShieldAlt className="text-warning" />}
                  {s.type === 'certify' && <FaLeaf className="text-success" />}
                </div>
                <h6 className="fw-bold">{s.title}</h6>
                <p className="small text-muted mb-2">
                  {s.description.replace(/\*\*(.*?)\*\*/g, '$1')}
                </p>
                {s.vendors?.length > 0 && (
                  <div className="d-flex flex-wrap gap-1 mb-2">
                    {s.vendors.map((name) => (
                      <Badge key={name} bg="light" text="dark" className="border">
                        {name}
                      </Badge>
                    ))}
                  </div>
                )}
                <small className="text-success fw-semibold">{s.estimatedImpact}</small>
              </div>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default VendorSustainabilityIntelligence;
