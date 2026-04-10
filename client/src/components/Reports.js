import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Tabs, Tab, Image, Spinner } from 'react-bootstrap';
import { FaQrcode, FaMapMarkerAlt, FaRobot, FaCalendarAlt, FaSync } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axios from 'axios';
import LoadingSpinner from './LoadingSpinner';

const Reports = () => {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inspections');
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });

  useEffect(() => {
    fetchInspections(1);
  }, []);

  const fetchInspections = async (page = 1) => {
    try {
      setLoading(true);
      const response = await axios.get('/api/inspections', {
        params: { 
          status: 'completed', 
          limit: 10,
          page: page
        }
      });
      if (response.data.success) {
        setInspections(response.data.data.inspections || []);
        setPagination(response.data.data.pagination || { current: 1, pages: 1, total: 0 });
      }
    } catch (error) {
      console.error('Error fetching inspections:', error);
      toast.error('Failed to load inspection reports');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-0">Admin Reports Center</h2>
          <p className="text-muted mb-0">Comprehensive site inspection logs and field activity</p>
        </Col>
        <Col xs="auto">
          <button 
            className="btn btn-dark btn-sm rounded-pill px-3 shadow-sm" 
            onClick={() => fetchInspections(pagination.current)}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" animation="border" className="me-2" /> : <FaSync className="me-2" />}
            Refresh Logs
          </button>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4 modern-tabs"
      >
        <Tab eventKey="inspections" title="Site Inspection Logs">
          <Row>
            <Col>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white py-3">
                  <h5 className="mb-0 fw-bold">Verified Field Reports</h5>
                </Card.Header>
                <Card.Body className="p-0">
                  <div className="table-responsive">
                    <Table hover align="middle" className="mb-0 inspection-report-table">
                      <thead className="bg-light">
                        <tr>
                          <th className="ps-4">QR Code ID</th>
                          <th>Inspection Images</th>
                          <th>AI Analysis</th>
                          <th>Details</th>
                          <th className="text-center pe-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan="5" className="text-center py-5">
                              <div className="d-flex flex-column align-items-center justify-content-center">
                                <LoadingSpinner />
                                <p className="text-muted mt-3">Fetching field logs...</p>
                              </div>
                            </td>
                          </tr>
                        ) : inspections.length > 0 ? inspections.map((ins) => (
                          <tr key={ins._id}>
                            <td className="ps-4">
                              <div className="d-flex align-items-center">
                                <div className="p-2 bg-primary-subtle rounded me-3">
                                  <FaQrcode className="text-primary" />
                                </div>
                                <div>
                                  <div className="fw-bold">{ins.trackFittingId}</div>
                                  <small className="text-muted">ID: {ins.inspectionId}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="d-flex gap-1 overflow-auto py-2" style={{ maxWidth: '200px' }}>
                                {ins.documents && ins.documents.length > 0 ? ins.documents.map((doc, i) => (
                                  <Image 
                                    key={i} 
                                    src={doc} 
                                    rounded 
                                    style={{ width: '45px', height: '45px', objectFit: 'cover', border: '1px solid #eee' }} 
                                    alt="Site capture"
                                  />
                                )) : <span className="text-muted small">No images</span>}
                              </div>
                            </td>
                            <td>
                              {ins.aiAnalysis ? (
                                <div className={`p-2 rounded small d-flex align-items-center ${ins.isAnomalous ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'}`}>
                                  <FaRobot className="me-2" />
                                  <div>
                                    <div className="fw-bold">{ins.aiAnalysis.confidence}% Match</div>
                                    <div style={{ fontSize: '0.7rem' }}>{ins.aiAnalysis.recommendation}</div>
                                  </div>
                                </div>
                              ) : <Badge bg="secondary">No AI Data</Badge>}
                            </td>
                            <td>
                              <div className="small">
                                <div className="d-flex align-items-center mb-1">
                                  <FaCalendarAlt className="me-2 text-muted" />
                                  <span>{new Date(ins.actualDate || ins.scheduledDate).toLocaleDateString()}</span>
                                </div>
                                <div className="text-truncate" style={{ maxWidth: '150px' }}>
                                  <small className="text-muted">By: {ins.inspectorName}</small>
                                </div>
                              </div>
                            </td>
                            <td className="text-center pe-4">
                              <Badge bg="success" className="rounded-pill px-3 py-2">
                                VERIFIED
                              </Badge>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="5" className="text-center py-5">
                              <p className="text-muted mb-0">No completed inspection reports found.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
                {pagination.pages > 1 && (
                  <Card.Footer className="bg-white py-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <p className="text-muted small mb-0">
                        Showing {(pagination.current - 1) * 10 + 1} to {Math.min(pagination.current * 10, pagination.total)} of {pagination.total} reports
                      </p>
                      <div className="btn-group">
                        <button 
                          className="btn btn-outline-secondary btn-sm" 
                          onClick={() => fetchInspections(pagination.current - 1)}
                          disabled={pagination.current === 1 || loading}
                        >
                          Previous
                        </button>
                        {[...Array(pagination.pages)].map((_, i) => (
                          <button
                            key={i + 1}
                            className={`btn btn-sm ${pagination.current === i + 1 ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => fetchInspections(i + 1)}
                            disabled={loading}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button 
                          className="btn btn-outline-secondary btn-sm" 
                          onClick={() => fetchInspections(pagination.current + 1)}
                          disabled={pagination.current === pagination.pages || loading}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </Card.Footer>
                )}
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default Reports;
