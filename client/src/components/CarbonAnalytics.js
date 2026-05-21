import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaLeaf, FaChartLine, FaFireAlt, FaRecycle, FaLightbulb, FaExclamationTriangle, FaTrain } from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';
import { Link } from 'react-router-dom';

const MetricCard = ({ title, value, icon, color }) => (
  <Card className="h-100 shadow-sm" style={{ borderRadius: '18px' }}>
    <Card.Body>
      <div className="d-flex align-items-start justify-content-between">
        <div>
          <h6 className="text-uppercase text-muted mb-2">{title}</h6>
          <h3 className="fw-bold mb-0">{value}</h3>
        </div>
        <div className={`fs-1 text-${color}`}>
          {icon}
        </div>
      </div>
    </Card.Body>
  </Card>
);

const CarbonAnalytics = ({ showBackButton = true }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCarbonReport = async () => {
      try {
        const response = await axios.get('/api/inventory/carbon-summary');
        setReport(response.data.data);
      } catch (error) {
        console.error('Failed to load carbon analytics:', error);
        toast.error('Unable to fetch carbon analytics at this time.');
      } finally {
        setLoading(false);
      }
    };

    fetchCarbonReport();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading carbon analytics..." size="lg" />;
  }

  if (!report) {
    return (
      <Container className="py-5">
        <Card className="p-4 shadow-sm">
          <Card.Body>
            <h4 className="mb-3">Carbon analytics unavailable</h4>
            <p>There was a problem loading the environmental impact dashboard. Please try again later.</p>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  const { carbonReport, vendorScores = [], recommendations = [] } = report;
  const ratings = carbonReport?.sustainabilityRatings || {};
  const strategy = carbonReport?.strategyForecast || {};
  const yearlyBreakdown = strategy.yearlyBreakdown || [];
  const forecastProgress = strategy.reductionPercent
    ? Math.min(100, Math.max(0, strategy.reductionPercent))
    : 0;

  return (
    <Container fluid className="py-4">
      <Row className="align-items-center mb-4">
        <Col md={8}>
          <h1 className="display-6 fw-bold">Carbon Accounting Engine</h1>
        </Col>
        {showBackButton && (
          <Col md={4} className="text-md-end mt-3 mt-md-0">
            <Button as={Link} to="/dashboard" variant="dark">
              Back to Dashboard
            </Button>
          </Col>
        )}
      </Row>

      <Row className="g-4 mb-4">
        <Col md={6} lg={3}>
          <MetricCard
            title="Total Assets"
            value={carbonReport.totalAssets}
            icon={<FaTrain />}
            color="primary"
          />
        </Col>
        <Col md={6} lg={3}>
          <MetricCard
            title="Total CO₂ (kg)"
            value={carbonReport.totalEmissionsCO2.toLocaleString()}
            icon={<FaFireAlt />}
            color="danger"
          />
        </Col>
        <Col md={6} lg={3}>
          <MetricCard
            title="Avg Lifecycle Impact"
            value={`${carbonReport.averageLifecycleImpactScore}`}
            icon={<FaChartLine />}
            color="warning"
          />
        </Col>
        <Col md={6} lg={3}>
          <MetricCard
            title="Hotspots"
            value={carbonReport.hotspots}
            icon={<FaExclamationTriangle />}
            color="danger"
          />
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col lg={8}>
          <Card className="shadow-sm" style={{ borderRadius: '20px' }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h5 className="fw-bold">High-Emission Assets</h5>
                  <p className="text-muted mb-0">Assets that are driving the largest carbon footprint today.</p>
                </div>
                <Badge bg="danger">Top {carbonReport.highEmissionAssets.length}</Badge>
              </div>
              <Table responsive hover className="mb-0">
                <thead>
                  <tr>
                    <th>Serial</th>
                    <th>Type</th>
                    <th>Vendor</th>
                    <th>Location</th>
                    <th>CO₂</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {(carbonReport.highEmissionAssets || []).map((asset) => (
                    <tr key={asset.id}>
                      <td>{asset.serialNumber || 'N/A'}</td>
                      <td>{asset.itemType || 'Unknown'}</td>
                      <td>{asset.vendorName || 'Unknown'}</td>
                      <td>{asset.currentLocation || 'Unknown'}</td>
                      <td>{asset.totalEmissionsCO2.toLocaleString()}</td>
                      <td>
                        <Badge bg={asset.hotspot ? 'danger' : 'success'}>{asset.sustainabilityRating}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="shadow-sm" style={{ borderRadius: '20px' }}>
            <Card.Body>
              <h5 className="fw-bold mb-3">Strategy & Forecast</h5>
              <p className="text-muted mb-3">
                Five-year operational forecast from recurring emissions (maintenance, replacement, energy, waste), with a {((strategy.efficiencyImprovementRate || 0.02) * 100).toFixed(0)}% annual efficiency gain.
              </p>
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span>Current inventory footprint</span>
                  <strong>{carbonReport.totalEmissionsCO2.toLocaleString()} kg</strong>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span>Annual recurring (portfolio)</span>
                  <strong>{(strategy.annualRecurringTotal || 0).toLocaleString()} kg/yr</strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Projected next 5 years</span>
                  <strong>{carbonReport.projectedNext5Years.toLocaleString()} kg</strong>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <small className="text-muted">Efficiency trajectory (Y1 → Y5)</small>
                  <small className="text-muted">{forecastProgress}% reduction</small>
                </div>
                <div className="progress" style={{ height: 8 }}>
                  <div
                    className="progress-bar bg-success"
                    role="progressbar"
                    style={{ width: `${forecastProgress}%` }}
                    aria-valuenow={forecastProgress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  />
                </div>
              </div>

              {yearlyBreakdown.length > 0 && (
                <div className="mb-3">
                  <h6 className="fw-semibold">Year-by-year projection</h6>
                  <Table size="sm" className="mb-0">
                    <tbody>
                      {yearlyBreakdown.map((row) => (
                        <tr key={row.year}>
                          <td>{row.year}</td>
                          <td className="text-end">{row.projectedKgCO2.toLocaleString()} kg</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}

              <div>
                <h6 className="fw-semibold">Sustainability Rating Mix</h6>
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {Object.entries(ratings).map(([rating, count]) => (
                    <Badge key={rating} bg="secondary" pill>
                      {rating}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col xs={12}>
          <Card className="shadow-sm" style={{ borderRadius: '20px' }}>
            <Card.Body style={{ maxHeight: '360px', overflowY: 'auto' }}>
              <h5 className="fw-bold mb-3">Vendor Carbon Signals</h5>
              <div className="d-flex flex-column gap-3">
                {vendorScores.slice(0, 6).map((vendor) => (
                  <div key={vendor.vendorId} className="p-3 rounded-3" style={{ backgroundColor: '#f8fafc' }}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <strong>{vendor.vendorName}</strong>
                      <Badge bg={vendor.sustainabilityScore >= 70 ? 'success' : vendor.sustainabilityScore >= 50 ? 'warning' : 'danger'}>
                        {vendor.sustainabilityScore}
                      </Badge>
                    </div>
                    <small className="text-muted">{vendor.evaluationNote}</small>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={8}>
          <Card className="shadow-sm" style={{ borderRadius: '20px' }}>
            <Card.Body>
              <h5 className="fw-bold mb-3">Actionable Recommendations</h5>
              <ul className="list-unstyled mb-0">
                {recommendations.map((item, index) => (
                  <li key={index} className="mb-3 d-flex gap-2 align-items-start">
                    <span className="text-success mt-1"><FaLeaf /></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="shadow-sm" style={{ borderRadius: '20px' }}>
            <Card.Body>
              <div className="d-flex align-items-center mb-3">
                <span className="fs-3 text-success me-3"><FaLightbulb /></span>
                <div>
                  <h5 className="fw-bold mb-0">Performance Guidance</h5>
                  <small className="text-muted">Use the carbon engine to drive smarter asset decisions.</small>
                </div>
              </div>
              <p className="text-muted mb-0">
                The engine continuously evaluates manufacturing impact, fuel and energy use, maintenance cadence, replacement cycles, waste and recyclability. It flags the highest-impact fittings and recommends lower-carbon operations for each asset.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CarbonAnalytics;
