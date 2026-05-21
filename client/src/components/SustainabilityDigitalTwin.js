import React, { useCallback, useEffect, useState } from 'react';
import { Row, Col, Card, Badge, Table, ProgressBar, Alert } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import {
  FaCube,
  FaBolt,
  FaLeaf,
  FaHeartbeat,
  FaChartArea,
  FaSync,
  FaTrain,
  FaExclamationTriangle
} from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend
);

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: 'rgba(148,163,184,0.15)' }, ticks: { color: '#94a3b8', maxTicksLimit: 8 } },
    y: { grid: { color: 'rgba(148,163,184,0.15)' }, ticks: { color: '#94a3b8' } }
  }
};

const MetricTile = ({ label, value, sub, icon, accent }) => (
  <div
    className="p-3 rounded-3 h-100"
    style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', border: '1px solid #334155' }}
  >
    <div className="d-flex justify-content-between align-items-start">
      <div>
        <small className="text-uppercase" style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
          {label}
        </small>
        <h4 className="fw-bold mb-0 mt-1" style={{ color: '#f8fafc' }}>
          {value}
        </h4>
        {sub && (
          <small style={{ color: accent || '#64748b' }}>{sub}</small>
        )}
      </div>
      <span style={{ color: accent || '#38bdf8', fontSize: '1.25rem' }}>{icon}</span>
    </div>
  </div>
);

const CorridorTwinMap = ({ segments, selectedKey, onSelect }) => {
  if (!segments.length) {
    return (
      <div className="text-center py-5" style={{ color: '#94a3b8' }}>
        No corridor segments in portfolio — add track fittings with KM markers or locations.
      </div>
    );
  }

  const width = 720;
  const height = 200;
  const padding = 48;
  const y = height / 2;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-100" style={{ maxHeight: 220 }}>
      <defs>
        <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="50%" stopColor="#475569" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>
      <line
        x1={padding}
        y1={y}
        x2={width - padding}
        y2={y}
        stroke="url(#trackGrad)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <line
        x1={padding}
        y1={y}
        x2={width - padding}
        y2={y}
        stroke="#64748b"
        strokeWidth="2"
        strokeDasharray="12 8"
      />
      {segments.map((seg, index) => {
        const x =
          padding + (index / Math.max(segments.length - 1, 1)) * (width - padding * 2);
        const isSelected = seg.segmentKey === selectedKey;
        const r = isSelected ? 14 : 10;
        return (
          <g
            key={seg.segmentKey}
            onClick={() => onSelect(seg.segmentKey)}
            style={{ cursor: 'pointer' }}
          >
            <circle
              cx={x}
              cy={y}
              r={r + 6}
              fill={seg.color}
              opacity={isSelected ? 0.35 : 0.15}
            />
            <circle
              cx={x}
              cy={y}
              r={r}
              fill={seg.color}
              stroke={isSelected ? '#f8fafc' : '#0f172a'}
              strokeWidth={isSelected ? 3 : 2}
            />
            <text
              x={x}
              y={y - 28}
              textAnchor="middle"
              fill="#e2e8f0"
              fontSize="10"
              fontWeight={isSelected ? '700' : '500'}
            >
              {seg.label.length > 18 ? `${seg.label.slice(0, 16)}…` : seg.label}
            </text>
            <text x={x} y={y + 32} textAnchor="middle" fill="#94a3b8" fontSize="9">
              {seg.assetCount} assets · {seg.structuralHealth}% health
            </text>
          </g>
        );
      })}
      <text x={padding} y={24} fill="#64748b" fontSize="10">
        ← Corridor start
      </text>
      <text x={width - padding} y={24} textAnchor="end" fill="#64748b" fontSize="10">
        Corridor end →
      </text>
    </svg>
  );
};

const SustainabilityDigitalTwin = () => {
  const [twin, setTwin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState(null);

  const fetchTwin = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await axios.get('/api/inventory/digital-twin');
      const data = response.data.data;
      setTwin(data);
      setSelectedSegment((prev) => prev || data.segments?.[0]?.segmentKey || null);
    } catch (error) {
      console.error('Digital twin error:', error);
      toast.error('Unable to sync Sustainability Digital Twin.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTwin();
    const interval = setInterval(() => fetchTwin(true), 90000);
    return () => clearInterval(interval);
  }, [fetchTwin]);

  if (loading) {
    return <LoadingSpinner message="Syncing digital twin with live infrastructure..." size="lg" />;
  }

  if (!twin) {
    return <Alert variant="warning">Digital twin unavailable. Please retry sync.</Alert>;
  }

  const { globalMetrics, segments, corridor, healthTimeline, impactPulse, assets } = twin;
  const activeSegment = segments.find((s) => s.segmentKey === selectedSegment) || segments[0];
  const segmentAssets = assets.filter((a) => a.segmentKey === activeSegment?.segmentKey).slice(0, 8);

  const healthChartData = {
    labels: healthTimeline.map((p) => p.month),
    datasets: [
      {
        label: 'Sustainability Health',
        data: healthTimeline.map((p) => p.sustainabilityHealth),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.15)',
        fill: true,
        tension: 0.35
      },
      {
        label: 'Degradation',
        data: healthTimeline.map((p) => p.degradation),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249,115,22,0.08)',
        fill: true,
        tension: 0.35
      }
    ]
  };

  const pulseChartData = {
    labels: impactPulse.map((p) => p.label),
    datasets: [
      {
        label: 'Impact (kg)',
        data: impactPulse.map((p) => p.impactKg),
        backgroundColor: 'rgba(56,189,248,0.6)',
        borderRadius: 4
      }
    ]
  };

  const intensityChartData = {
    labels: segments.map((s) => (s.label.length > 14 ? `${s.label.slice(0, 12)}…` : s.label)),
    datasets: [
      {
        label: 'kg CO₂/km',
        data: segments.map((s) => s.emissionIntensityKgPerKm),
        backgroundColor: segments.map((s) => s.color)
      }
    ]
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h5 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <FaCube className="text-info" />
            Sustainability Digital Twin
          </h5>
          <p className="text-muted mb-0 small">
            Live mirror of railway infrastructure — environmental impact, degradation, energy,
            emission intensity, and predicted sustainability health.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Badge bg="info" pill className="d-flex align-items-center gap-1">
            <span
              className="rounded-circle bg-white d-inline-block"
              style={{ width: 8, height: 8, animation: 'pulse 1.5s infinite' }}
            />
            {twin.syncStatus.toUpperCase()}
          </Badge>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={() => fetchTwin(true)}
            disabled={refreshing}
          >
            <FaSync style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
            {refreshing ? 'Syncing…' : 'Sync twin'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <Row className="g-3 mb-4">
        <Col sm={6} lg={3}>
          <MetricTile
            label="Real-time impact"
            value={`${globalMetrics.realTimeEnvironmentalImpactKgPerDay.toLocaleString()} kg/day`}
            sub={`${globalMetrics.totalEnvironmentalImpactKg.toLocaleString()} kg total footprint`}
            icon={<FaLeaf />}
            accent="#4ade80"
          />
        </Col>
        <Col sm={6} lg={3}>
          <MetricTile
            label="Asset degradation"
            value={`${globalMetrics.avgDegradationPercent}%`}
            sub={`Structural health ${globalMetrics.avgStructuralHealth}%`}
            icon={<FaHeartbeat />}
            accent="#fb923c"
          />
        </Col>
        <Col sm={6} lg={3}>
          <MetricTile
            label="Energy consumption"
            value={`${globalMetrics.totalEnergyConsumptionKWh.toLocaleString()} kWh`}
            sub="Portfolio operational draw"
            icon={<FaBolt />}
            accent="#fbbf24"
          />
        </Col>
        <Col sm={6} lg={3}>
          <MetricTile
            label="Emission intensity"
            value={`${globalMetrics.avgEmissionIntensityKgPerKm} kg/km`}
            sub={`${globalMetrics.hotspots} emission hotspot(s)`}
            icon={<FaChartArea />}
            accent="#38bdf8"
          />
        </Col>
      </Row>

      <Card
        className="mb-4 border-0 shadow-sm"
        style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)', borderRadius: 20 }}
      >
        <Card.Body className="py-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
            <div>
              <h6 className="fw-bold mb-0" style={{ color: '#f1f5f9' }}>
                <FaTrain className="me-2 text-info" />
                {corridor.name}
              </h6>
              <small style={{ color: '#94a3b8' }}>
                {corridor.totalAssets} assets · {corridor.segmentCount} segments ·{' '}
                {corridor.totalLengthKm} km mapped
              </small>
            </div>
            <small style={{ color: '#64748b' }}>
              Twin ID: {twin.twinId.slice(-12)} · {new Date(twin.lastSyncAt).toLocaleTimeString()}
            </small>
          </div>
          <CorridorTwinMap
            segments={segments}
            selectedKey={activeSegment?.segmentKey}
            onSelect={setSelectedSegment}
          />
        </Card.Body>
      </Card>

      <Row className="g-4 mb-4">
        <Col lg={4}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body>
              <h6 className="fw-bold mb-3">Predicted Sustainability Health</h6>
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span className="small text-muted">6 months</span>
                  <strong>{globalMetrics.predictedSustainabilityHealth.months6}%</strong>
                </div>
                <ProgressBar
                  now={globalMetrics.predictedSustainabilityHealth.months6}
                  variant={
                    globalMetrics.predictedSustainabilityHealth.months6 >= 65 ? 'success' : 'warning'
                  }
                />
                <Badge bg="secondary" className="mt-1">
                  {globalMetrics.predictedSustainabilityHealth.status6m}
                </Badge>
              </div>
              <div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="small text-muted">12 months</span>
                  <strong>{globalMetrics.predictedSustainabilityHealth.months12}%</strong>
                </div>
                <ProgressBar
                  now={globalMetrics.predictedSustainabilityHealth.months12}
                  variant={
                    globalMetrics.predictedSustainabilityHealth.months12 >= 65 ? 'info' : 'danger'
                  }
                />
                <Badge bg="secondary" className="mt-1">
                  {globalMetrics.predictedSustainabilityHealth.status12m}
                </Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={8}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body>
              <h6 className="fw-bold mb-2">Health & Degradation Forecast</h6>
              <div style={{ height: 200 }}>
                <Line data={healthChartData} options={{ ...chartOpts, plugins: { legend: { display: true, labels: { boxWidth: 12 } } } }} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {activeSegment && (
        <Row className="g-4 mb-4">
          <Col lg={5}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <h6 className="fw-bold mb-3">
                  Segment Twin: {activeSegment.label}
                  <Badge bg="dark" className="ms-2 text-capitalize">
                    {activeSegment.status}
                  </Badge>
                </h6>
                <Row className="g-2 mb-3">
                  <Col xs={6}>
                    <div className="p-2 rounded bg-light">
                      <small className="text-muted d-block">Impact</small>
                      <strong>{activeSegment.environmentalImpactKg.toLocaleString()} kg</strong>
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="p-2 rounded bg-light">
                      <small className="text-muted d-block">Live rate</small>
                      <strong>{activeSegment.realTimeImpactKgPerDay} kg/day</strong>
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="p-2 rounded bg-light">
                      <small className="text-muted d-block">Energy</small>
                      <strong>{activeSegment.energyKWh.toLocaleString()} kWh</strong>
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="p-2 rounded bg-light">
                      <small className="text-muted d-block">Intensity</small>
                      <strong>{activeSegment.emissionIntensityKgPerKm} kg/km</strong>
                    </div>
                  </Col>
                </Row>
                <div className="mb-2">
                  <small className="text-muted">Degradation {activeSegment.degradationPercent}%</small>
                  <ProgressBar
                    now={activeSegment.degradationPercent}
                    variant="warning"
                    className="mt-1"
                  />
                </div>
                <div>
                  <small className="text-muted">Structural health {activeSegment.structuralHealth}%</small>
                  <ProgressBar
                    now={activeSegment.structuralHealth}
                    variant="success"
                    className="mt-1"
                  />
                </div>
                {activeSegment.hotspotCount > 0 && (
                  <Alert variant="danger" className="mt-3 mb-0 py-2 small d-flex align-items-center gap-2">
                    <FaExclamationTriangle />
                    {activeSegment.hotspotCount} emission hotspot(s) in this segment
                  </Alert>
                )}
              </Card.Body>
            </Card>
          </Col>
          <Col lg={7}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <h6 className="fw-bold mb-3">Assets in segment</h6>
                <Table responsive size="sm" className="mb-0">
                  <thead>
                    <tr>
                      <th>Serial</th>
                      <th>Health</th>
                      <th>CO₂</th>
                      <th>Intensity</th>
                      <th>6mo pred.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segmentAssets.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-muted text-center">
                          No assets in this segment
                        </td>
                      </tr>
                    ) : (
                      segmentAssets.map((asset) => (
                        <tr key={asset.id}>
                          <td>{asset.serialNumber || '—'}</td>
                          <td>
                            <Badge
                              style={{
                                backgroundColor:
                                  asset.degradation.status === 'excellent'
                                    ? '#22c55e'
                                    : asset.degradation.status === 'critical'
                                      ? '#ef4444'
                                      : '#3b82f6'
                              }}
                            >
                              {asset.degradation.structuralHealth}%
                            </Badge>
                          </td>
                          <td>{asset.environmentalImpact.totalKgCO2.toLocaleString()}</td>
                          <td>{asset.emissionIntensity.kgCO2PerKm}</td>
                          <td>{asset.predictedSustainabilityHealth.months6}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Row className="g-4">
        <Col md={6}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h6 className="fw-bold mb-2">Real-time Impact Pulse</h6>
              <div style={{ height: 180 }}>
                <Bar data={pulseChartData} options={chartOpts} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h6 className="fw-bold mb-2">Emission Intensity by Corridor Segment</h6>
              <div style={{ height: 180 }}>
                <Bar data={intensityChartData} options={chartOpts} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SustainabilityDigitalTwin;
