import React, { useCallback, useEffect, useState } from 'react';
import { Row, Col, Card, Badge, Button, Alert, ProgressBar, Table } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import {
  FaCertificate,
  FaSync,
  FaLeaf,
  FaMapMarkedAlt,
  FaLightbulb,
  FaAward,
  FaIndustry,
  FaBolt,
  FaRecycle,
  FaHandshake,
  FaWrench
} from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const FACTOR_ICONS = {
  carbonEfficiency: FaLeaf,
  assetLongevity: FaAward,
  wasteReduction: FaRecycle,
  energyOptimization: FaBolt,
  vendorSustainability: FaHandshake,
  maintenanceEfficiency: FaWrench
};

const RailwayGreenScore = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedZoneKey, setSelectedZoneKey] = useState(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await axios.get('/api/carbon/railway-green-score');
      if (res.data.success) {
        setData(res.data.data);
        setSelectedZoneKey(res.data.data.topZones?.[0]?.zoneKey || null);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load Railway Green Score.');
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
    return <LoadingSpinner message="Computing universal Railway Green Scores..." size="lg" />;
  }

  if (!data) {
    return <Alert variant="warning">Railway Green Score unavailable.</Alert>;
  }

  const {
    railwayGreenScore,
    portfolioFactors,
    zoneScores,
    topZones,
    certifications,
    summary,
    insights,
    gradeBands
  } = data;

  const selected = zoneScores.find((z) => z.zoneKey === selectedZoneKey) || topZones?.[0];
  const factorEntries = Object.entries(portfolioFactors || {});

  const radarData = {
    labels: factorEntries.map(([, f]) => f.label),
    datasets: [
      {
        label: 'Portfolio factors',
        data: factorEntries.map(([, f]) => f.score),
        backgroundColor: 'rgba(34, 197, 94, 0.25)',
        borderColor: '#22c55e',
        borderWidth: 2,
        pointBackgroundColor: '#15803d'
      },
      ...(selected
        ? [
            {
              label: selected.label,
              data: Object.keys(portfolioFactors).map((k) => selected.factors[k]?.score ?? 0),
              backgroundColor: 'rgba(79, 70, 229, 0.15)',
              borderColor: '#6366f1',
              borderWidth: 2,
              pointBackgroundColor: '#4f46e5'
            }
          ]
        : [])
    ]
  };

  const radarOpts = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: { stepSize: 20, backdropColor: 'transparent' },
        grid: { color: 'rgba(148,163,184,0.2)' },
        pointLabels: { font: { size: 10 } }
      }
    },
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } }
  };

  return (
    <div className="railway-green-score">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .railway-green-score .signature-hero {
          background: linear-gradient(135deg, #052e16 0%, #166534 35%, #22c55e 70%, #4ade80 100%);
          border-radius: 24px;
          box-shadow: 0 20px 50px rgba(21, 128, 61, 0.35);
          position: relative;
          overflow: hidden;
        }
        .railway-green-score .signature-hero::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 60%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%);
        }
        .railway-green-score .score-ring {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: rgba(255,255,255,0.95);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 12px 40px rgba(0,0,0,0.15);
          border: 6px solid ${railwayGreenScore.color};
        }
        .railway-green-score .score-value {
          font-size: 3rem;
          font-weight: 800;
          line-height: 1;
          color: ${railwayGreenScore.color};
        }
        .railway-green-score .zone-row {
          cursor: pointer;
          transition: background 0.15s;
        }
        .railway-green-score .zone-row:hover,
        .railway-green-score .zone-row.selected {
          background: #ecfdf5;
        }
        .railway-green-score .factor-card {
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 1rem;
          height: 100%;
          background: #fff;
        }
        .railway-green-score .cert-badge {
          border-radius: 12px;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, #ecfdf5, #fff);
          border: 1px solid #bbf7d0;
        }
        .railway-green-score .chart-box { height: 280px; }
      `}</style>

      <div className="signature-hero text-white p-4 p-md-5 mb-4 position-relative">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 position-relative">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <FaCertificate size={24} />
              <span className="text-uppercase fw-bold" style={{ fontSize: '0.75rem', letterSpacing: '0.15em' }}>
                Signature sustainability metric
              </span>
            </div>
            <h3 className="fw-bold mb-1">Railway Green Score</h3>
            <p className="mb-0 opacity-90" style={{ maxWidth: 480 }}>
              Universal zone sustainability scoring across six weighted factors — your portfolio&apos;s
              definitive green performance index.
            </p>
          </div>
          <Button variant="light" size="sm" className="d-flex align-items-center gap-2" onClick={() => fetchData(true)} disabled={refreshing}>
            <FaSync style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
            Refresh
          </Button>
        </div>

        <Row className="align-items-center mt-4 position-relative">
          <Col md={5} className="text-center text-md-start mb-4 mb-md-0">
            <div className="score-ring mx-auto mx-md-0">
              <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.65rem', letterSpacing: '0.1em' }}>
                Portfolio score
              </small>
              <div className="score-value">{railwayGreenScore.score}</div>
              <span className="text-muted fw-semibold">/ 100</span>
              <Badge
                className="mt-2 px-3 py-2"
                style={{ background: railwayGreenScore.color, fontSize: '0.9rem' }}
              >
                Grade {railwayGreenScore.grade} · {railwayGreenScore.gradeLabel}
              </Badge>
            </div>
          </Col>
          <Col md={7}>
            {selected && (
              <div className="p-3 rounded-4" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <FaMapMarkedAlt />
                  <strong>Zone Sustainability Score</strong>
                </div>
                <div className="display-4 fw-bold mb-0">{selected.zoneSustainabilityScore}/100</div>
                <div className="opacity-90">{selected.label} · Grade {selected.grade} · Rank #{selected.rank}</div>
                <small className="opacity-75">{selected.assetCount} assets in zone</small>
              </div>
            )}
            <Row className="g-2 mt-3">
              <Col xs={4}>
                <div className="text-center p-2 rounded-3" style={{ background: 'rgba(0,0,0,0.15)' }}>
                  <div className="fw-bold fs-4">{summary.totalZones}</div>
                  <small className="opacity-90">Zones</small>
                </div>
              </Col>
              <Col xs={4}>
                <div className="text-center p-2 rounded-3" style={{ background: 'rgba(0,0,0,0.15)' }}>
                  <div className="fw-bold fs-4">{summary.zonesAbove90}</div>
                  <small className="opacity-90">Green leaders</small>
                </div>
              </Col>
              <Col xs={4}>
                <div className="text-center p-2 rounded-3" style={{ background: 'rgba(0,0,0,0.15)' }}>
                  <div className="fw-bold fs-4">{summary.avgZoneScore}</div>
                  <small className="opacity-90">Avg zone score</small>
                </div>
              </Col>
            </Row>
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

      <Row className="g-4 mb-4">
        <Col lg={5}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 18 }}>
            <Card.Header className="bg-white border-0 pt-4 px-4">
              <h5 className="fw-bold mb-0">Six-factor score model</h5>
            </Card.Header>
            <Card.Body>
              <div className="chart-box">
                <Radar data={radarData} options={radarOpts} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={7}>
          <Row className="g-2">
            {factorEntries.map(([key, factor]) => {
              const Icon = FACTOR_ICONS[key] || FaIndustry;
              return (
                <Col md={6} key={key}>
                  <div className="factor-card">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <Icon className="text-success" />
                        <strong className="small">{factor.label}</strong>
                      </div>
                      <span className="fw-bold text-success">{factor.score}</span>
                    </div>
                    <ProgressBar now={factor.score} variant="success" style={{ height: 8 }} />
                    <small className="text-muted d-block mt-1">
                      Weight {factor.weight}% · contributes {factor.weightedContribution} pts
                    </small>
                  </div>
                </Col>
              );
            })}
          </Row>
        </Col>
      </Row>

      {certifications?.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-4">
          {certifications.map((c) => (
            <div key={c.name} className="cert-badge d-flex align-items-center gap-2">
              <FaCertificate className="text-success" />
              <div>
                <strong className="small d-block">{c.name}</strong>
                <Badge bg="success">{c.badge}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: 18 }}>
        <Card.Header className="bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
            <FaMapMarkedAlt className="text-success" />
            Zone sustainability leaderboard
          </h5>
          <small className="text-muted">{gradeBands.map((b) => `${b.grade}≥${b.min}`).join(' · ')}</small>
        </Card.Header>
        <Card.Body className="px-0 pb-0">
          <Table responsive hover className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>Rank</th>
                <th>Zone</th>
                <th>Score</th>
                <th>Grade</th>
                <th>Assets</th>
                <th>Top factor</th>
              </tr>
            </thead>
            <tbody>
              {zoneScores.map((z) => {
                const topFactor = Object.entries(z.factors || {}).sort((a, b) => b[1].score - a[1].score)[0];
                const isSel = z.zoneKey === selectedZoneKey;
                return (
                  <tr
                    key={z.zoneKey}
                    className={`zone-row ${isSel ? 'selected' : ''}`}
                    onClick={() => setSelectedZoneKey(z.zoneKey)}
                  >
                    <td className="text-muted">#{z.rank}</td>
                    <td><strong>{z.label}</strong></td>
                    <td>
                      <span className="fw-bold fs-5" style={{ color: z.color }}>
                        {z.zoneSustainabilityScore}
                      </span>
                      <span className="text-muted">/100</span>
                    </td>
                    <td>
                      <Badge style={{ background: z.color }}>{z.grade}</Badge>
                    </td>
                    <td>{z.assetCount}</td>
                    <td className="small text-muted">
                      {topFactor ? `${topFactor[1].label}: ${topFactor[1].score}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {zoneScores.length === 0 && (
            <p className="text-muted text-center py-4">Add assets with km markers or locations to score zones.</p>
          )}
        </Card.Body>
      </Card>

      {selected && (
        <Card className="border-0 shadow-sm" style={{ borderRadius: 18 }}>
          <Card.Header className="bg-white border-0 pt-4 px-4">
            <h6 className="fw-bold mb-0">
              Factor breakdown — {selected.label} ({selected.displayScore})
            </h6>
          </Card.Header>
          <Card.Body>
            <Row className="g-2">
              {Object.entries(selected.factors || {}).map(([key, factor]) => {
                const Icon = FACTOR_ICONS[key] || FaIndustry;
                return (
                  <Col md={4} key={key}>
                    <div className="factor-card">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <Icon className="text-success" size={14} />
                        <strong className="small">{factor.label}</strong>
                      </div>
                      <div className="display-6 fw-bold text-success mb-1">{factor.score}</div>
                      <ProgressBar now={factor.score} variant="success" style={{ height: 6 }} />
                      <small className="text-muted">{factor.description}</small>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default RailwayGreenScore;
