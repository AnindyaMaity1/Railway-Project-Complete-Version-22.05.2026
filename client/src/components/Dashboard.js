import React, { useEffect, useState, useContext } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import {
  FaBoxes, 
  FaClipboardCheck, 
  FaExclamationTriangle, 
  FaTools, 
  FaQrcode, 
  FaBrain, 
  FaMobileAlt, 
  FaShieldAlt,
  FaRocket,
  FaChartLine,
  FaCog,
  FaSpinner,
  FaTrain,
  FaLeaf
} from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';
import { Link } from 'react-router-dom';
import RailImage from './Rail.webp';


const StatCard = ({ title, value, icon, variant, gradient }) => (
  <Card className="shadow-lg border-0 stat-card-modern" style={{ 
    background: gradient || `linear-gradient(135deg, var(--bs-${variant}), var(--bs-${variant}-light))`,
    color: 'white',
    borderRadius: '20px',
    overflow: 'hidden',
    position: 'relative'
  }}>
    <Card.Body className="p-4">
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <h2 className="mb-1 fw-bold">{value}</h2>
          <p className="mb-0 opacity-75">{title}</p>
        </div>
        <div className="fs-1 opacity-75">
          {icon}
        </div>
      </div>
    </Card.Body>
  </Card>
);

const featureBackgrounds = {
  primary: '#eef2ff',
  success: '#ecfdf3',
  warning: '#fffbeb',
  danger: '#fef2f2',
  info: '#e0f2fe'
};

const FeatureCard = ({ icon, title, description, color, onExplain }) => (
  <Card
    className="h-100 border-0 shadow-sm feature-card"
    style={{ borderRadius: '15px', backgroundColor: featureBackgrounds[color] || '#ffffff' }}
  >
    <Card.Body className="text-center p-4">
      <div className={`fs-1 mb-3 text-${color}`}>
        {icon}
      </div>
      <h5 className="fw-bold mb-3">{title}</h5>
      <p className="text-muted mb-2">{description}</p>
      {onExplain && (
        <Button
          variant="success"
          size="sm"
          className="mt-2 px-3 feature-explain-btn"
          onClick={onExplain}
        >
          Explain
        </Button>
      )}
    </Card.Body>
  </Card>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [carbonSummary, setCarbonSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const socket = useContext(SocketContext);
  const [featureModal, setFeatureModal] = useState({
    show: false,
    title: '',
    body: ''
  });
  const [environment, setEnvironment] = useState({
    locationLabel: 'Detecting location…',
    weatherLabel: '',
    dateLabel: ''
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (socket) {
      const handleNewItem = (data) => {
        toast.info(data.message || 'A new item has been added.');
        fetchDashboardData(); // Re-fetch data to update dashboard
      };

      const handleBulkUpdate = (data) => {
        toast.info(data.message || 'Inventory has been updated in bulk.');
        fetchDashboardData(); // Re-fetch data to update dashboard
      };

      socket.on('new-item', handleNewItem);
      socket.on('bulk-update', handleBulkUpdate);

      return () => {
        socket.off('new-item', handleNewItem);
        socket.off('bulk-update', handleBulkUpdate);
      };
    }
  }, [socket]);

  // Lightweight environment info: browser location (name if possible), time-of-day "weather", and date
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const coordsText = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;

          // First show coordinates quickly
          setEnvironment((prev) => ({
            ...prev,
            locationLabel: coordsText
          }));

          // Ask backend to resolve a human-friendly location name
          try {
            const res = await axios.get('/public/reverse-geocode', {
              params: { lat: latitude, lon: longitude }
            });

            if (res.data?.success && res.data?.name) {
              setEnvironment((prev) => ({
                ...prev,
                locationLabel: res.data.name
              }));
            }
          } catch {
            // Ignore reverse-geo errors; coordinates are already shown
          }
        },
        () => {
          setEnvironment((prev) => ({
            ...prev,
            locationLabel: 'Location not shared'
          }));
        },
        { timeout: 5000 }
      );
    } else {
      setEnvironment((prev) => ({
        ...prev,
        locationLabel: 'Location not available'
      }));
    }

    const hour = new Date().getHours();
    let weatherLabel = 'Clear sky';
    if (hour >= 5 && hour < 12) weatherLabel = 'Sunny morning';
    else if (hour >= 12 && hour < 17) weatherLabel = 'Warm afternoon';
    else if (hour >= 17 && hour < 21) weatherLabel = 'Cool evening';
    else weatherLabel = 'Quiet night';

    setEnvironment((prev) => ({
      ...prev,
      weatherLabel
    }));

    const now = new Date();
    const dateLabel = now.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    setEnvironment((prev) => ({
      ...prev,
      dateLabel
    }));
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch real data from APIs
      const [trackFittingsRes, inspectionsRes, vendorsRes, carbonSummaryRes] = await Promise.all([
        axios.get('/api/inventory'),
        axios.get('/api/inspections'),
        axios.get('/api/vendors'),
        axios.get('/api/inventory/carbon-summary')
      ]);

      const trackFittings = trackFittingsRes.data.data?.trackFittings || [];
      const inspections = inspectionsRes.data.data?.inspections || [];
      const vendors = vendorsRes.data.data || [];
      const carbonSummaryData = carbonSummaryRes.data.data?.carbonReport || null;

      setCarbonSummary(carbonSummaryData);

      // Calculate real statistics
      const totalFittings = trackFittings.length;
      const activeInspections = inspections.filter(i => i.status === 'in_progress').length;
      const pendingMaintenance = inspections.filter(i => i.status === 'pending').length;
      const qualityIssues = inspections.filter(i => i.isAnomalous === true).length;

      const realStats = {
        totalFittings,
        activeInspections,
        pendingMaintenance,
        qualityIssues,
        totalVendors: vendors.length
      };
      
      setStats(realStats);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      toast.error('Failed to load dashboard data');
      // Set empty stats if API fails
      setStats({
        totalFittings: 0,
        activeInspections: 0,
        pendingMaintenance: 0,
        qualityIssues: 0,
        itemsByType: {},
        inspectionStatus: { pass: 0, fail: 0, pending: 0 },
        totalVendors: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return <LoadingSpinner message="Loading your AI-powered dashboard..." size="lg" />;
  }

  return (
    <div className="dashboard-modern">
      {/* Hero Section – cute railway platform theme on white background */}
      <div className="py-4 mb-4 hero-railway">
        <Container>
          <Row className="align-items-center g-4 flex-column-reverse flex-lg-row">
            <Col lg={7}>
              <Card className="hero-intro-card border-0">
                <Card.Body className="p-4 p-lg-4">
                  <Badge bg="warning" text="dark" className="mb-3 px-3 py-2 rounded-pill">
                    <FaTrain className="me-2" /> Live Railway Yard Overview
                  </Badge>
                  <h1 className="fw-bold mb-2 hero-intro-title">
                    Railway Track Fittings
                  </h1>
                  <h2 className="fw-semibold mb-3 hero-intro-subtitle">
                    Smart platform for your maintenance crew
                  </h2>
                  <p className="mb-4 hero-intro-text">
                    Keep every track fitting on the right platform from QR generation to field
                    inspections. See which sections are busy, which need love, and let the AI
                    copilot guide safer decisions for your teams.
                  </p>
                  <div className="d-flex flex-wrap gap-3">
                    {user?.role === 'admin' && (
                      <Button
                        as={Link}
                        to="/qr-generator"
                        variant="primary"
                        size="lg"
                        className="px-4 py-3 rounded-pill hero-primary-btn"
                      >
                        <FaQrcode className="me-2" /> Generate QR Code
                      </Button>
                    )}
                    <Button
                      as={Link}
                      to="/decision-copilot"
                      variant="success"
                      size="lg"
                      className="px-4 py-3 rounded-pill hero-secondary-btn"
                    >
                      <FaBrain className="me-2" /> Open Drishti Copilot
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={5}>
              <Card className="border-0 shadow-sm" style={{ borderRadius: 24, overflow: 'hidden' }}>
                <div
                  style={{
                    background:
                      'linear-gradient(135deg, #bfdbfe 0%, #e5e7eb 40%, #fee2e2 100%)',
                    padding: '1.2rem 1.5rem 0.2rem',
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="badge rounded-pill bg-primary-subtle text-primary">
                      <FaTrain className="me-1" />
                      Platform View
                    </span>
                    <small className="text-muted">Today</small>
                  </div>
                  <div className="text-center">
                    <img
                      src={RailImage}
                      alt="Railway platform illustration"
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        borderRadius: 18,
                      }}
                    />
                  </div>
                </div>
                <Card.Body className="pt-3 pb-3">
                  <Row className="g-2 text-center small">
                    <Col>
                      <div className="p-2 rounded-3" style={{ backgroundColor: '#fed7aa' }}>
                        <div className="fw-semibold">Current location</div>
                        <div className="text-primary">{environment.locationLabel}</div>
                      </div>
                    </Col>
                    <Col>
                      <div
                        className="p-2 rounded-3"
                        style={{ backgroundColor: '#e5e7eb', border: '1px solid #d1d5db' }}
                      >
                        <div className="fw-semibold">Weather</div>
                        <div className="text-success">{environment.weatherLabel}</div>
                      </div>
                    </Col>
                    <Col>
                      <div className="p-2 rounded-3" style={{ backgroundColor: '#bbf7d0' }}>
                        <div className="fw-semibold">Date</div>
                        <div className="text-success">{environment.dateLabel}</div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      <Container fluid className="px-4">
        {/* Features Section */}
        <Row className="mb-5">
          <Col className="text-center">
            <h2 className="mb-5 fw-bold section-title-underline">Why Choose Our System?</h2>
          </Col>
        </Row>
        
        <Row className="g-4 mb-5">
          <Col md={6} lg={3}>
            <FeatureCard 
              icon={<FaQrcode />} 
              title="Laser QR Marking" 
              description="Precision laser-based QR code marking on all track fittings for identification."
              color="primary"
              onExplain={() =>
                setFeatureModal({
                  show: true,
                  title: 'Laser QR Marking',
                  body:
                    'Each track fitting is assigned a unique QR code generated from the dashboard and marked on the component. ' +
                    'The code links to detailed inventory, vendor and quality data, so maintenance teams can instantly identify parts, ' +
                    'trace manufacturing history, and avoid mix‑ups on the ground.'
                })
              }
            />
          </Col>
          <Col md={6} lg={3}>
            <FeatureCard 
              icon={<FaMobileAlt />} 
              title="Mobile Scanning" 
              description="Scan QR codes with any mobile device to instantly access detailed information."
              color="success"
              onExplain={() =>
                setFeatureModal({
                  show: true,
                  title: 'Mobile Scanning',
                  body:
                    'Using the mobile scanner, field staff point the camera at a fitting and the system decodes the QR code, ' +
                    'fetches its full record, and logs a geo‑tagged scan. This makes on‑site inspections faster, reduces manual ' +
                    'data entry errors, and keeps a live history of where each fitting was last seen.'
                })
              }
            />
          </Col>
          <Col md={6} lg={3}>
            <FeatureCard 
              icon={<FaBrain />} 
              title="AI Analytics" 
              description="Advanced AI algorithms for quality monitoring, anomaly detection."
              color="warning"
              onExplain={() =>
                setFeatureModal({
                  show: true,
                  title: 'AI Analytics & Drishti Copilot',
                  body:
                    'Inspection results, scan events and performance metrics are analysed by the AI services. ' +
                    'They flag anomalies, estimate risk and support the Drishti Copilot, which helps teams compare options, ' +
                    'detect biases and choose safer maintenance strategies with confidence scores.'
                })
              }
            />
          </Col>
          <Col md={6} lg={3}>
            <FeatureCard 
              icon={<FaShieldAlt />} 
              title="Quality Assurance" 
              description="Comprehensive quality tracking from manufacturing to in-service monitoring."
              color="danger"
              onExplain={() =>
                setFeatureModal({
                  show: true,
                  title: 'Quality Assurance & Traceability',
                  body:
                    'From the moment a fitting is created in inventory until it is installed, inspected and eventually replaced, ' +
                    'the system keeps a single source of truth. Vendors, batches, inspection grades and AI alerts are all linked, ' +
                    'so quality teams can trace any issue back to its source and prove compliance during audits.'
                })
              }
            />
          </Col>
        </Row>

        {/* Live Statistics */}
        <Row className="mb-5">
          <Col className="text-center">
            <h3 className="mb-4 fw-bold section-title-underline">Live System Statistics</h3>
          </Col>
        </Row>
        
        <Row className="g-4 mb-5">
          <Col xs={12} sm={6} lg={3}>
            <StatCard 
              title="Total Track Fittings" 
              value={stats.totalFittings.toLocaleString()} 
              icon={<FaBoxes />} 
              variant="primary"
              gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <StatCard 
              title="Active Inspections" 
              value={stats.activeInspections} 
              icon={<FaClipboardCheck />} 
              variant="warning"
              gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <StatCard 
              title="Pending Maintenance" 
              value={stats.pendingMaintenance} 
              icon={<FaTools />} 
              variant="danger"
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <StatCard 
              title="AI Detected Issues" 
              value={stats.qualityIssues} 
              icon={<FaExclamationTriangle />} 
              variant="info"
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
            />
          </Col>
        </Row>

        <Row className="g-4 mb-5">
          <Col xs={12} sm={6} lg={3}>
            <StatCard
              title="Current CO₂ Emissions"
              value={carbonSummary ? `${carbonSummary.totalEmissionsCO2.toLocaleString()} kg` : 'N/A'}
              icon={<FaLeaf />}
              variant="success"
              gradient="linear-gradient(135deg, #22c55e 0%, #4ade80 100%)"
            />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <StatCard
              title="Projected 5yr Emissions"
              value={carbonSummary ? `${carbonSummary.projectedNext5Years.toLocaleString()} kg` : 'N/A'}
              icon={<FaChartLine />}
              variant="warning"
              gradient="linear-gradient(135deg, #fbbf24 0%, #fde047 100%)"
            />
          </Col>
        </Row>
      </Container>

      {/* Feature explain modal */}
      <Modal
        show={featureModal.show}
        onHide={() => setFeatureModal((prev) => ({ ...prev, show: false }))}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{featureModal.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2" style={{ whiteSpace: 'pre-line', textAlign: 'justify' }}>
            {featureModal.body}
          </p>
          <p className="mb-0 text-muted small" style={{ textAlign: 'justify' }}>
            These features are designed to work together so the maintenance team can trust the data
            they see during inspections, vendor reviews and decision-making meetings.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-success"
            className="modal-gotit-btn"
            onClick={() => setFeatureModal((prev) => ({ ...prev, show: false }))}
          >
            Got it
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Dashboard;
