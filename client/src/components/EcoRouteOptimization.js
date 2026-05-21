import React, { useCallback, useEffect, useState } from 'react';
import { Row, Col, Card, Badge, Table, ProgressBar, Alert } from 'react-bootstrap';
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
  FaRoute,
  FaGasPump,
  FaLeaf,
  FaUsers,
  FaWrench,
  FaClipboardCheck,
  FaSync,
  FaMapMarkedAlt,
  FaTruck
} from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: true, labels: { boxWidth: 12 } } },
  scales: {
    x: { grid: { color: 'rgba(148,163,184,0.12)' } },
    y: { grid: { color: 'rgba(148,163,184,0.12)' }, beginAtZero: true }
  }
};

const priorityVariant = (p) => {
  if (p === 'high') return 'danger';
  if (p === 'medium') return 'warning';
  return 'secondary';
};

const RouteMap = ({ depot, stops }) => {
  if (!stops?.length) {
    return <p className="text-muted text-center py-4 mb-0">No route stops to display.</p>;
  }

  const width = 700;
  const height = 220;
  const pad = 40;
  const lats = [depot.latitude, ...stops.map((s) => s.latitude)];
  const lngs = [depot.longitude, ...stops.map((s) => s.longitude)];
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = maxLat - minLat || 0.01;
  const lngSpan = maxLng - minLng || 0.01;

  const toXY = (lat, lng) => ({
    x: pad + ((lng - minLng) / lngSpan) * (width - pad * 2),
    y: pad + (1 - (lat - minLat) / latSpan) * (height - pad * 2)
  });

  const depotPt = toXY(depot.latitude, depot.longitude);
  const points = stops.map((s) => ({ ...s, ...toXY(s.latitude, s.longitude) }));
  const pathD = [
    `M ${depotPt.x} ${depotPt.y}`,
    ...points.map((p) => `L ${p.x} ${p.y}`),
    `L ${depotPt.x} ${depotPt.y}`
  ].join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-100" style={{ maxHeight: 240 }}>
      <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="6 4" opacity="0.8" />
      <circle cx={depotPt.x} cy={depotPt.y} r="10" fill="#0ea5e9" stroke="#fff" strokeWidth="2" />
      <text x={depotPt.x} y={depotPt.y - 14} textAnchor="middle" fontSize="10" fill="#0ea5e9" fontWeight="700">
        Depot
      </text>
      {points.map((p, i) => (
        <g key={p.id}>
          <circle
            cx={p.x}
            cy={p.y}
            r="8"
            fill={p.type === 'maintenance' ? '#f97316' : '#8b5cf6'}
            stroke="#fff"
            strokeWidth="2"
          />
          <text x={p.x} y={p.y + 22} textAnchor="middle" fontSize="9" fill="#64748b">
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
};

const MetricTile = ({ label, value, sub, icon, accent }) => (
  <div className="p-3 rounded-3 h-100 border" style={{ backgroundColor: '#f8fafc' }}>
    <div className="d-flex justify-content-between align-items-start">
      <div>
        <small className="text-uppercase text-muted" style={{ fontSize: '0.7rem' }}>
          {label}
        </small>
        <h4 className="fw-bold mb-0 mt-1">{value}</h4>
        {sub && <small className="text-muted">{sub}</small>}
      </div>
      <span style={{ color: accent || '#d97706', fontSize: '1.25rem' }}>{icon}</span>
    </div>
  </div>
);

const EcoRouteOptimization = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState('combined');

  const fetchOptimization = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await axios.get('/api/carbon/eco-route');
      if (res.data.success) setData(res.data.data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load eco-route optimization.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOptimization();
    const interval = setInterval(() => fetchOptimization(true), 120000);
    return () => clearInterval(interval);
  }, [fetchOptimization]);

  if (loading) {
    return <LoadingSpinner message="AI is computing lowest-emission routes..." size="lg" />;
  }

  if (!data) {
    return <Alert variant="warning">Eco-route optimization unavailable.</Alert>;
  }

  const { summary, depot, maintenanceRoute, inspectionPlan, technicianDeployment, travelEmissions, recommendations, optimizedRoute } = data;

  const comparisonChart = {
    labels: ['Distance (km)', 'Fuel (L)', 'CO₂ (kg)'],
    datasets: [
      {
        label: 'Baseline plan',
        data: [
          travelEmissions.baseline.totalKm,
          travelEmissions.baseline.fuelLitres,
          travelEmissions.baseline.co2Kg
        ],
        backgroundColor: 'rgba(148,163,184,0.7)'
      },
      {
        label: 'Eco-optimized',
        data: [
          travelEmissions.optimized.totalKm,
          travelEmissions.optimized.fuelLitres,
          travelEmissions.optimized.co2Kg
        ],
        backgroundColor: 'rgba(34,197,94,0.75)'
      }
    ]
  };

  const routeStops =
    activeView === 'maintenance'
      ? maintenanceRoute.stops
      : activeView === 'inspection'
        ? inspectionPlan.stops
        : optimizedRoute.stops;

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h5 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <FaRoute className="text-warning" />
            Eco-Route Optimization Engine
          </h5>
          <p className="text-muted mb-0 small">
            Operational intelligence — lowest-emission maintenance routes, fuel-minimized inspections,
            smart technician deployment, and reduced travel CO₂.
          </p>
        </div>
        <ButtonRefresh refreshing={refreshing} onRefresh={() => fetchOptimization(true)} />
      </div>

      <Row className="g-3 mb-4">
        <Col sm={6} lg={3}>
          <MetricTile
            label="Travel savings"
            value={`${summary.savingsPercent}%`}
            sub={`${summary.savingsKm} km saved vs baseline`}
            icon={<FaRoute />}
            accent="#22c55e"
          />
        </Col>
        <Col sm={6} lg={3}>
          <MetricTile
            label="CO₂ reduced"
            value={`${summary.co2SavedKg} kg`}
            sub={`Optimized ${summary.optimizedCo2Kg} kg`}
            icon={<FaLeaf />}
            accent="#16a34a"
          />
        </Col>
        <Col sm={6} lg={3}>
          <MetricTile
            label="Fuel saved"
            value={`${summary.fuelSavedLitres} L`}
            sub={`${summary.optimizedFuelLitres} L optimized tour`}
            icon={<FaGasPump />}
            accent="#d97706"
          />
        </Col>
        <Col sm={6} lg={3}>
          <MetricTile
            label="Technician teams"
            value={summary.technicianTeams}
            sub={`${summary.totalStops} stops · ${summary.optimizedDurationHours}h`}
            icon={<FaUsers />}
            accent="#3b82f6"
          />
        </Col>
      </Row>

      {summary.savingsPercent > 0 && (
        <Alert variant="success" className="border-0 shadow-sm mb-4 py-3">
          <strong>AI route optimization active:</strong> {summary.co2SavedKg} kg CO₂ and{' '}
          {summary.fuelSavedLitres} L fuel saved per full corridor tour versus KM-ordered scheduling.
        </Alert>
      )}

      <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: 20 }}>
        <Card.Body>
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
            <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
              <FaMapMarkedAlt className="text-primary" />
              Optimized corridor map
            </h6>
            <div className="d-flex gap-1">
              {[
                { key: 'combined', label: 'Full tour' },
                { key: 'maintenance', label: 'Maintenance' },
                { key: 'inspection', label: 'Inspection' }
              ].map((v) => (
                <Badge
                  key={v.key}
                  bg={activeView === v.key ? 'warning' : 'light'}
                  text={activeView === v.key ? 'dark' : 'dark'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setActiveView(v.key)}
                >
                  {v.label}
                </Badge>
              ))}
            </div>
          </div>
          <RouteMap depot={depot} stops={routeStops} />
          <div className="d-flex flex-wrap gap-3 mt-2 small text-muted">
            <span>
              <span className="d-inline-block rounded-circle me-1" style={{ width: 10, height: 10, background: '#0ea5e9' }} />
              Depot: {depot.label}
            </span>
            <span>
              <span className="d-inline-block rounded-circle me-1" style={{ width: 10, height: 10, background: '#f97316' }} />
              Maintenance
            </span>
            <span>
              <span className="d-inline-block rounded-circle me-1" style={{ width: 10, height: 10, background: '#8b5cf6' }} />
              Inspection
            </span>
          </div>
        </Card.Body>
      </Card>

      <Row className="g-4 mb-4">
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 18 }}>
            <Card.Body>
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <FaWrench className="text-warning" />
                Lowest-emission maintenance route
              </h6>
              <p className="text-muted small">{maintenanceRoute.algorithm}</p>
              <div className="mb-3">
                <small className="text-muted d-block">Route efficiency</small>
                <ProgressBar
                  now={Math.min(100, summary.savingsPercent + 50)}
                  variant="success"
                  label={`${maintenanceRoute.metrics.totalKm} km`}
                />
              </div>
              <Table responsive size="sm" className="mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Stop</th>
                    <th>Priority</th>
                    <th>CO₂ leg</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceRoute.stops.slice(0, 8).map((s) => (
                    <tr key={s.id}>
                      <td>{s.order}</td>
                      <td>{s.label}</td>
                      <td>
                        <Badge bg={priorityVariant(s.priority)}>{s.priority}</Badge>
                      </td>
                      <td>{s.legCo2Kg ?? '—'} kg</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 18 }}>
            <Card.Body>
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <FaClipboardCheck className="text-primary" />
                Least fuel-consuming inspection plan
              </h6>
              <p className="text-muted small">{inspectionPlan.algorithm}</p>
              <div className="d-flex flex-wrap gap-3 mb-3">
                <div>
                  <small className="text-muted d-block">Stops</small>
                  <strong>{inspectionPlan.stops.length}</strong>
                </div>
                <div>
                  <small className="text-muted d-block">Distance</small>
                  <strong>{inspectionPlan.metrics.totalKm} km</strong>
                </div>
                <div>
                  <small className="text-muted d-block">Fuel</small>
                  <strong>{inspectionPlan.metrics.fuelLitres} L</strong>
                </div>
                <div>
                  <small className="text-muted d-block">CO₂</small>
                  <strong>{inspectionPlan.metrics.co2Kg} kg</strong>
                </div>
              </div>
              {inspectionPlan.fuelOptimized && (
                <Badge bg="success" className="mb-3">
                  Fuel-optimized sequencing enabled
                </Badge>
              )}
              <Table responsive size="sm" className="mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Inspection</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectionPlan.stops.slice(0, 8).map((s) => (
                    <tr key={s.id}>
                      <td>{s.order}</td>
                      <td>{s.label}</td>
                      <td>{s.locationName}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: 18 }}>
        <Card.Body>
          <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
            <FaUsers className="text-info" />
            Smart technician deployment
          </h6>
          <Row className="g-3">
            {technicianDeployment.map((tech) => (
              <Col md={4} key={tech.technicianId}>
                <Card className="bg-light border-0 h-100">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <strong>{tech.name}</strong>
                        <div className="small text-muted">{tech.zone}</div>
                      </div>
                      <Badge bg="info">{tech.stopCount} stops</Badge>
                    </div>
                    <div className="small mb-2">
                      <FaTruck className="me-1 text-muted" />
                      {tech.distanceKm} km · {tech.fuelLitres} L · {tech.co2Kg} kg CO₂
                    </div>
                    <div className="small text-muted">{tech.durationHours} hours estimated</div>
                    <ul className="small mb-0 ps-3 mt-2">
                      {tech.stops.slice(0, 4).map((s) => (
                        <li key={s.id}>
                          {s.order}. {s.label} ({s.type})
                        </li>
                      ))}
                    </ul>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Card.Body>
      </Card>

      <Row className="g-4">
        <Col lg={7}>
          <Card className="border-0 shadow-sm" style={{ borderRadius: 18 }}>
            <Card.Body>
              <h6 className="fw-bold mb-2">Baseline vs eco-optimized travel</h6>
              <div style={{ height: 220 }}>
                <Bar data={comparisonChart} options={chartOpts} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 18 }}>
            <Card.Body>
              <h6 className="fw-bold mb-3">AI operational recommendations</h6>
              <ul className="list-unstyled mb-0">
                {recommendations.map((rec, i) => (
                  <li key={i} className="mb-2 small d-flex gap-2">
                    <FaLeaf className="text-success mt-1 flex-shrink-0" />
                    <span>{rec.replace(/\*\*/g, '')}</span>
                  </li>
                ))}
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

const ButtonRefresh = ({ refreshing, onRefresh }) => (
  <button
    type="button"
    className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
    onClick={onRefresh}
    disabled={refreshing}
  >
    <FaSync style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
    {refreshing ? 'Optimizing…' : 'Re-optimize'}
  </button>
);

export default EcoRouteOptimization;
