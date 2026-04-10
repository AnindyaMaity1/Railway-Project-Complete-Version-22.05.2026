import React, { useState, useEffect, useContext, useRef } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Badge, Modal, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import axios from 'axios';
import { SocketContext } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { FaClipboardList, FaCamera, FaClipboardCheck, FaRobot, FaCheckCircle, FaTrash } from 'react-icons/fa';

const Inspections = () => {
  const socket = useContext(SocketContext);
  const { user } = useAuth();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [inspectionToDelete, setInspectionToDelete] = useState(null);

  // Active Inspection Modal State
  const [showActiveModal, setShowActiveModal] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [capturedImages, setCapturedImages] = useState([null, null, null]);
  const [activeForm, setActiveForm] = useState({
    condition: 'good',
    notes: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    findings: []
  });
  const [cameraActive, setCameraActive] = useState([false, false, false]);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  const [editForm, setEditForm] = useState({
    inspectorName: '',
    scheduledDate: '',
    inspectionType: '',
    status: ''
  });
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    inspector: '',
    dateRange: ''
  });

  const [scheduleForm, setScheduleForm] = useState({
    trackFittingId: '',
    inspectionType: '',
    scheduledDate: '',
    inspectorId: '',
    inspectorName: '',
    location: '',
    criteria: []
  });

  useEffect(() => {
    fetchInspections();
  }, [filters]);

  useEffect(() => {
    if (socket) {
      const handleNewInspection = (data) => {
        // If user is inspector, only add if it belongs to them
        if (user?.role === 'inspector' && data.inspection.inspectorName !== user.username) {
          return;
        }
        
        const normalized = normalizeInspectionFromApi(data.inspection);
        setInspections(prev => {
          if (prev.find(ins => ins.id === normalized.id)) return prev;
          return [normalized, ...prev];
        });
        toast.info(data.message || 'A new inspection has been scheduled');
      };

      const handleUpdateInspection = (data) => {
        const normalized = normalizeInspectionFromApi(data.inspection);
        setInspections(prev => prev.map(ins => (ins.id === normalized.id ? normalized : ins)));
        toast.info(data.message || 'An inspection has been updated');
      };

      const handleDeleteInspection = (data) => {
        setInspections(prev => prev.filter(ins => ins.id !== data.id));
        toast.info(data.message || 'An inspection has been deleted');
      };

      socket.on('new-inspection', handleNewInspection);
      socket.on('update-inspection', handleUpdateInspection);
      socket.on('delete-inspection', handleDeleteInspection);

      return () => {
        socket.off('new-inspection', handleNewInspection);
        socket.off('update-inspection', handleUpdateInspection);
        socket.off('delete-inspection', handleDeleteInspection);
      };
    }
  }, [socket]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = () => {
    fetchInspections();
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      status: '',
      inspector: '',
      dateRange: ''
    });
  };

  const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
  };

  const normalizeInspectionFromApi = (inspection) => {
    if (!inspection) return null;

    return {
      id: inspection.id || inspection._id,
      inspectionId: inspection.inspectionId || '',
      trackFittingId: inspection.trackFittingId || inspection.trackFitting?.serialNumber || '',
      inspectionType: inspection.inspectionType || '',
      scheduledDate: inspection.scheduledDate,
      assignedDate: inspection.assignedDate,
      actualDate: inspection.actualDate,
      inspector: {
        name: inspection.inspector?.name || inspection.inspectorName || '',
        designation: inspection.inspector?.designation || inspection.inspectorDesignation || ''
      },
      overallResult: inspection.overallResult || null,
      status: inspection.status || 'scheduled',
      findings: inspection.findings || [],
      isAnomalous: inspection.isAnomalous || false,
      anomalyDetails: inspection.anomalyDetails || null
    };
  };

  const fetchInspections = async () => {
    try {
      setLoading(true);

      const params = {
        page: 1,
        limit: 100
      };

      if (filters.type) params.inspectionType = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.inspector) params.inspector = filters.inspector;
      if (filters.dateRange) params.dateFrom = filters.dateRange;

      const response = await axios.get('/api/inspections', { params });

      if (response.data.success) {
        const raw = response.data.data?.inspections || [];
        const normalized = raw.map(normalizeInspectionFromApi);
        setInspections(normalized);
      } else {
        toast.error('Failed to fetch inspections data');
      }
    } catch (error) {
      console.error('Error fetching inspections:', error);
      toast.error('Failed to fetch inspections data');
      setInspections([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredInspections = inspections.filter(inspection => {
    return (
      (!filters.type || inspection.inspectionType === filters.type) &&
      (!filters.status || inspection.status === filters.status) &&
      (!filters.inspector || inspection.inspector?.name?.toLowerCase().includes(filters.inspector.toLowerCase()))
    );
  });

  const getResultColor = (result) => {
    const colors = {
      'pass': 'success',
      'fail': 'danger',
      'conditional': 'warning'
    };
    return colors[result] || 'secondary';
  };

  const getStatusColor = (status) => {
    const colors = {
      'scheduled': 'info',
      'in_progress': 'warning',
      'completed': 'success',
      'cancelled': 'secondary',
      'overdue': 'danger',
      'maintenance': 'danger'
    };
    return colors[status] || 'secondary';
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'scheduled':
      case 'in_progress':
        return 'PROGRESS';
      case 'completed':
        return 'COMPLETED';
      case 'overdue':
        return 'MISSED';
      case 'cancelled':
        return 'CANCELLED';
      default:
        return (status || '').toUpperCase();
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'low': 'success',
      'medium': 'warning',
      'high': 'danger',
      'critical': 'dark'
    };
    return colors[severity] || 'secondary';
  };

  const handleScheduleInspection = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        trackFittingId: scheduleForm.trackFittingId,
        inspectionType: scheduleForm.inspectionType,
        scheduledDate: scheduleForm.scheduledDate,
        inspectorId: scheduleForm.inspectorId || scheduleForm.inspectorName || 'MANUAL',
        inspectorName: scheduleForm.inspectorName,
        locationName: scheduleForm.location,
        qrCode: scheduleForm.trackFittingId,
        assignedDate: new Date().toISOString()
      };

      const response = await axios.post('/api/inspections', payload);

      if (!response.data?.success) {
        toast.error(response.data?.message || 'Failed to schedule inspection');
        return;
      }

      const created = normalizeInspectionFromApi(response.data.data);
      setInspections(prev => [created, ...prev]);
      setShowScheduleModal(false);
      setScheduleForm({
        trackFittingId: '',
        inspectionType: '',
        scheduledDate: '',
        inspectorId: '',
        inspectorName: '',
        location: '',
        criteria: []
      });
      toast.success('Inspection scheduled successfully!');
    } catch (error) {
      console.error('Failed to schedule inspection', error);
      toast.error(error.response?.data?.message || 'Failed to schedule inspection');
    }
  };

  const handleViewDetails = (inspection) => {
    setSelectedInspection(inspection);
    setShowDetails(true);
  };

  const handleDeleteInspection = async (inspection) => {
    if (!inspection?.id) return;
    setInspectionToDelete(inspection);
    setShowDeleteModal(true);
  };

  const confirmDeleteInspection = async () => {
    if (!inspectionToDelete?.id) return;
    try {
      await axios.delete(`/api/inspections/${inspectionToDelete.id}`);
      toast.success('Inspection deleted successfully');
      fetchInspections();
    } catch (error) {
      console.error('Delete inspection error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete inspection');
    } finally {
      setShowDeleteModal(false);
      setInspectionToDelete(null);
    }
  };

  const handleEditClick = () => {
    if (!selectedInspection) return;
    setEditForm({
      inspectorName: selectedInspection.inspector?.name || selectedInspection.inspectorName || '',
      scheduledDate: selectedInspection.scheduledDate ? selectedInspection.scheduledDate.split('T')[0] : '',
      inspectionType: selectedInspection.inspectionType || '',
      status: selectedInspection.status || ''
    });
    setShowEditModal(true);
    setShowDetails(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedInspection?.id) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`/api/inspections/${selectedInspection.id}`, {
        inspectorName: editForm.inspectorName,
        scheduledDate: editForm.scheduledDate,
        inspectionType: editForm.inspectionType,
        status: editForm.status
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('Update response:', response.data);
      toast.success('Inspection updated successfully');
      setShowEditModal(false);
      fetchInspections();
    } catch (error) {
      console.error('Update inspection error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to update inspection');
    }
  };

  const handleStartInspection = (inspection) => {
    setSelectedInspection(inspection);
    setShowActiveModal(true);
    setActiveStep(1);
    setCapturedImages([null, null, null]);
    setCameraActive([false, false, false]);
    setActiveForm({
      condition: 'good',
      notes: '',
      inspectionDate: new Date().toISOString().split('T')[0],
      findings: []
    });
    setAiResult(null);
  };

  const startCamera = async (index) => {
    try {
      setCameraLoading(true);
      stopCamera(); // Ensure previous streams are cleaned up

      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      const newCameraActive = [false, false, false];
      newCameraActive[index] = true;
      setCameraActive(newCameraActive);

      // Use a small timeout to ensure the video element is rendered before attaching the stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(e => console.error("Video play failed:", e));
            setCameraLoading(false);
          };
        }
      }, 100);

    } catch (err) {
      console.error('Camera error:', err);
      setCameraLoading(false);
      toast.error('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive([false, false, false]);
  };

  const handleCaptureImage = (index) => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = canvas.toDataURL('image/jpeg');
      const newImages = [...capturedImages];
      newImages[index] = imageData;
      setCapturedImages(newImages);
      
      stopCamera();
      toast.success(`Photo ${index + 1} clicked!`);
    }
  };

  const runAiAnalysis = async () => {
    setAiAnalyzing(true);
    // Simulate AI processing
    setTimeout(() => {
      const results = {
        confidence: 94.5,
        anomalies: activeForm.condition === 'poor' ? ['Corrosion detected', 'Loose bolt'] : [],
        recommendation: activeForm.condition === 'poor' ? 'Urgent maintenance' : 'Continue monitoring'
      };
      setAiResult(results);
      setAiAnalyzing(false);
      setActiveStep(4);
    }, 2000);
  };

  const handleCompleteInspection = async () => {
    if (!selectedInspection?.id) return;
    
    try {
      const payload = {
        status: 'completed',
        actualDate: new Date().toISOString(),
        overallResult: aiResult?.anomalies.length > 0 ? 'fail' : 'pass',
        findings: [
          ...activeForm.findings,
          { category: 'Visual', description: activeForm.notes, severity: activeForm.condition === 'poor' ? 'high' : 'low' }
        ],
        aiAnalysis: aiResult,
        documents: capturedImages.filter(img => img !== null),
        isAnomalous: aiResult?.anomalies.length > 0
      };

      const response = await axios.put(`/api/inspections/${selectedInspection.id}/complete`, payload);
      
      if (response.data.success) {
        toast.success('Inspection completed and saved to database!');
        setShowActiveModal(false);
        fetchInspections();
        
        // Notify socket
        if (socket) {
          socket.emit('update-inspection', {
            message: `Inspection ${selectedInspection.inspectionId} completed by ${user.username}`,
            inspection: response.data.data
          });
        }
      }
    } catch (error) {
      console.error('Failed to complete inspection:', error);
      toast.error('Error completing inspection');
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading inspections...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0">Inspections Management</h2>
          <p className="text-muted">Schedule and manage track fitting inspections</p>
        </Col>
        {user?.role === 'admin' && (
          <Col xs="auto">
            <Button variant="primary" onClick={() => setShowScheduleModal(true)}>
              <i className="bi bi-plus me-1"></i>
              Schedule Inspection
            </Button>
          </Col>
        )}
      </Row>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-info text-white">
            <Card.Body className="text-center">
              <h3>{inspections.filter(i => i.status === 'in_progress' || i.status === 'scheduled').length}</h3>
              <p className="mb-0">In Progress</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-warning text-white">
            <Card.Body className="text-center">
              <h3>{inspections.filter(i => i.status === 'overdue').length}</h3>
              <p className="mb-0">Missed</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-success text-white">
            <Card.Body className="text-center">
              <h3>{inspections.filter(i => i.status === 'completed').length}</h3>
              <p className="mb-0">Completed</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-danger text-white">
            <Card.Body className="text-center">
              <h3>{inspections.filter(i => i.status === 'overdue').length}</h3>
              <p className="mb-0">Overdue</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Inspection Type</Form.Label>
                <Form.Select
                  value={filters.type}
                  onChange={(e) => setFilters({...filters, type: e.target.value})}
                >
                  <option value="">All Types</option>
                  <option value="initial">Initial</option>
                  <option value="periodic">Periodic</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="quality">Quality</option>
                  <option value="safety">Safety</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                  <option value="">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="overdue">Overdue</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Inspector</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Search inspector..."
                  value={filters.inspector}
                  onChange={(e) => setFilters({...filters, inspector: e.target.value})}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Date Range</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.dateRange}
                  onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Inspections Table */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-light">
          <h5 className="mb-0">Inspections ({filteredInspections.length})</h5>
        </Card.Header>
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Inspection ID</th>
                <th>Track Fitting</th>
                <th>Type</th>
                <th>Scheduled Date</th>
                <th>Inspector</th>
                <th>Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInspections.map((inspection) => (
                <tr key={inspection.id}>
                  <td>
                    <strong>{inspection.inspectionId}</strong>
                  </td>
                  <td>{inspection.trackFittingId}</td>
                  <td>
                    <Badge bg="info">
                      {capitalize(inspection.inspectionType)}
                    </Badge>
                  </td>
                  <td>
                    {new Date(inspection.scheduledDate).toLocaleDateString()}
                  </td>
                  <td>
                    {inspection.inspector?.name}
                  </td>
                  <td>
                    <Badge bg={getStatusColor(inspection.status)}>
                      {getStatusLabel(inspection.status)}
                    </Badge>
                  </td>
                  <td className="text-center">
                    <div className="d-flex gap-2 justify-content-center">
                      {user?.role === 'inspector' && (
                        <Button
                          variant={inspection.status === 'completed' ? "secondary" : "success"}
                          size="sm"
                          onClick={() => handleStartInspection(inspection)}
                          title={inspection.status === 'completed' ? "Inspection Completed" : "Start Inspection"}
                          className="px-3 rounded-pill fw-bold"
                          disabled={inspection.status === 'completed'}
                        >
                          <i className={`bi ${inspection.status === 'completed' ? 'bi-check-circle-fill' : 'bi-play-fill'} me-1`}></i>
                          {inspection.status === 'completed' ? 'Done' : 'Start'}
                        </Button>
                      )}
                      {user?.role === 'admin' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleViewDetails(inspection)}
                            title="View Details"
                          >
                            <i className="bi bi-eye"></i>
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteInspection(inspection)}
                            title="Delete Inspection"
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          
          {filteredInspections.length === 0 && (
            <div className="text-center py-5">
              <i className="bi bi-clipboard-check text-muted" style={{ fontSize: '3rem' }}></i>
              <p className="text-muted mt-3">No inspections found matching your criteria</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Active Inspection Multi-Step Modal */}
      <Modal 
        show={showActiveModal} 
        onHide={() => {
          stopCamera();
          setShowActiveModal(false);
        }} 
        size="lg" 
        centered 
        backdrop="static"
      >
        <Modal.Header closeButton className="bg-success text-white border-0 py-3">
          <Modal.Title className="fw-bold d-flex align-items-center">
            <FaClipboardCheck className="me-2" />
            Active Inspection: {selectedInspection?.trackFittingId}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0" style={{ backgroundColor: '#fcfdf9' }}>
          {/* Hidden Canvas for Snapshots */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Custom Modern Stepper */}
          <div className="px-4 py-4 bg-white border-bottom shadow-sm">
            <div className="d-flex align-items-center justify-content-between mx-auto" style={{ maxWidth: '600px' }}>
              {[1, 2, 3, 4].map((step, idx) => (
                <React.Fragment key={step}>
                  <div className="d-flex flex-column align-items-center" style={{ width: '80px' }}>
                    <div 
                      className={`rounded-circle d-flex align-items-center justify-content-center border-2 mb-2 transition-all`}
                      style={{ 
                        width: '45px', 
                        height: '45px', 
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        backgroundColor: activeStep === step ? '#ffffff' : (activeStep > step ? '#198754' : '#ffffff'),
                        borderColor: activeStep >= step ? '#198754' : '#e2e8f0',
                        color: activeStep === step ? '#198754' : (activeStep > step ? '#ffffff' : '#94a3b8'),
                        boxShadow: activeStep === step ? '0 0 0 4px rgba(25, 135, 84, 0.1)' : 'none'
                      }}
                    >
                      {activeStep > step ? <FaCheckCircle /> : step}
                    </div>
                    <span className={`small fw-bold ${activeStep === step ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.75rem' }}>
                      {step === 1 && 'Capture'}
                      {step === 2 && 'Details'}
                      {step === 3 && 'AI Analysis'}
                      {step === 4 && 'Review'}
                    </span>
                  </div>
                  {idx < 3 && (
                    <div 
                      className="flex-grow-1 mx-2 mb-4" 
                      style={{ 
                        height: '2px', 
                        backgroundColor: activeStep > step ? '#198754' : '#e2e8f0',
                        marginTop: '-15px'
                      }}
                    ></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="p-4">
            {/* Step 1: Image Capture */}
            {activeStep === 1 && (
              <div className="text-center">
                <h4 className="fw-bold mb-4" style={{ color: '#2c3e50' }}>Submit 3 images of the site</h4>
                <Row className="g-4">
                  {[0, 1, 2].map(idx => (
                    <Col key={idx} md={4}>
                      <Card 
                        className={`h-100 border-0 shadow-sm transition-all ${capturedImages[idx] ? 'bg-white' : 'bg-light'}`}
                        style={{ borderRadius: '20px', minHeight: '260px', border: capturedImages[idx] ? '2px solid #198754' : '2px dashed #cbd5e1' }}
                      >
                        <Card.Body className="d-flex flex-column align-items-center justify-content-center p-3">
                          {cameraActive[idx] ? (
                            <div className="w-100 text-center">
                              <div className="bg-dark rounded-4 mb-3 overflow-hidden d-flex align-items-center justify-content-center position-relative" style={{ height: '160px' }}>
                                {cameraLoading && (
                                  <div className="position-absolute top-50 start-50 translate-middle text-white text-center" style={{ zIndex: 10 }}>
                                    <div className="spinner-border text-success mb-2" role="status"></div>
                                    <div className="small fw-bold">Starting Camera...</div>
                                  </div>
                                )}
                                <video
                                  ref={videoRef}
                                  autoPlay
                                  playsInline
                                  muted
                                  className={cameraLoading ? 'opacity-0' : 'opacity-100'}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.3s' }}
                                />
                              </div>
                              <Button 
                                variant="success" 
                                className="w-100 rounded-pill fw-bold shadow-sm"
                                onClick={() => handleCaptureImage(idx)}
                                disabled={cameraLoading}
                              >
                                <i className="bi bi-camera-fill me-2"></i>
                                Click Photo {idx + 1}
                              </Button>
                            </div>
                          ) : capturedImages[idx] ? (
                            <div className="position-relative w-100 text-center overflow-hidden rounded-4 shadow-sm" style={{ height: '160px' }}>
                              <img 
                                src={capturedImages[idx]} 
                                alt={`Capture ${idx + 1}`} 
                                className="img-fluid w-100 h-100" 
                                style={{ objectFit: 'cover' }}
                              />
                              {/* Always-on Dark Overlay */}
                              <div 
                                className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                                style={{ 
                                  backgroundColor: 'rgba(0,0,0,0.4)',
                                  backdropFilter: 'blur(2px)',
                                  transition: 'background-color 0.3s ease'
                                }}
                              >
                                <Button 
                                  variant="light" 
                                  size="sm" 
                                  className="rounded-pill fw-bold px-3 shadow"
                                  onClick={() => startCamera(idx)}
                                >
                                  <i className="bi bi-arrow-repeat me-1"></i>
                                  Retake
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <div className="bg-white rounded-circle shadow-sm d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '70px', height: '70px' }}>
                                <FaCamera size={30} className="text-muted opacity-50" />
                              </div>
                              <p className="fw-bold text-muted mb-3">Frame {idx + 1}</p>
                              <Button 
                                variant="primary" 
                                className="px-4 rounded-pill shadow-sm fw-bold"
                                style={{ background: 'linear-gradient(45deg, #4facfe, #00f2fe)', border: 'none' }}
                                onClick={() => startCamera(idx)}
                              >
                                Start Photo {idx + 1}
                              </Button>
                            </div>
                          )}
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
                <div className="mt-5 d-flex justify-content-end">
                  <Button 
                    variant="primary" 
                    disabled={capturedImages.some(img => img === null)}
                    onClick={() => setActiveStep(2)}
                    className="px-5 py-2 rounded-pill fw-bold shadow-lg"
                    style={{ background: 'linear-gradient(45deg, #4facfe, #00f2fe)', border: 'none' }}
                  >
                    Next Step <i className="bi bi-arrow-right ms-2"></i>
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Basic Details Form */}
            {activeStep === 2 && (
              <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h4 className="fw-bold mb-4 text-center" style={{ color: '#2c3e50' }}>Inspection Details</h4>
                <Card className="border-0 shadow-sm p-4 rounded-4">
                  <Form>
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-bold text-muted small text-uppercase">Inspection Date</Form.Label>
                      <Form.Control 
                        type="date" 
                        className="form-control-lg border-2"
                        style={{ borderRadius: '12px' }}
                        value={activeForm.inspectionDate}
                        onChange={(e) => setActiveForm({...activeForm, inspectionDate: e.target.value})}
                      />
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label className="fw-bold text-muted small text-uppercase">Overall Condition</Form.Label>
                      <div className="d-flex gap-2">
                        {['good', 'satisfactory', 'poor'].map(cond => (
                          <Button
                            key={cond}
                            variant={activeForm.condition === cond ? (cond === 'good' ? 'success' : cond === 'poor' ? 'danger' : 'warning') : 'outline-light'}
                            className={`flex-grow-1 py-3 rounded-4 fw-bold border-2 ${activeForm.condition !== cond ? 'text-muted border-light-subtle' : 'shadow-sm text-white'}`}
                            onClick={() => setActiveForm({...activeForm, condition: cond})}
                          >
                            {cond.toUpperCase()}
                          </Button>
                        ))}
                      </div>
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label className="fw-bold text-muted small text-uppercase">Observations / Notes</Form.Label>
                      <Form.Control 
                        as="textarea" 
                        rows={4} 
                        className="border-2"
                        style={{ borderRadius: '12px' }}
                        placeholder="Describe wear, loose parts, or environment issues..."
                        value={activeForm.notes}
                        onChange={(e) => setActiveForm({...activeForm, notes: e.target.value})}
                      />
                    </Form.Group>
                  </Form>
                </Card>
                <div className="mt-5 d-flex justify-content-between">
                  <Button variant="link" className="text-muted fw-bold text-decoration-none" onClick={() => setActiveStep(1)}>
                    <i className="bi bi-arrow-left me-2"></i> Back to Photos
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={() => setActiveStep(3)} 
                    className="px-5 py-2 rounded-pill fw-bold shadow-lg"
                    style={{ background: 'linear-gradient(45deg, #4facfe, #00f2fe)', border: 'none' }}
                  >
                    Next Step <i className="bi bi-arrow-right ms-2"></i>
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: AI Analysis */}
            {activeStep === 3 && (
              <div className="text-center py-5">
                <div 
                  className={`mb-5 mx-auto d-flex align-items-center justify-content-center rounded-circle shadow-lg ${aiAnalyzing ? 'bg-light' : 'bg-success-subtle'}`} 
                  style={{ width: '120px', height: '120px', position: 'relative' }}
                >
                  {aiAnalyzing ? (
                    <div className="spinner-border text-success" style={{ width: '80px', height: '80px' }}></div>
                  ) : (
                    <FaRobot size={60} className="text-success" />
                  )}
                </div>
                <h3 className="fw-bold mb-3">{aiAnalyzing ? 'Drishti AI Analyzing Photos...' : 'Ready for AI Diagnostic'}</h3>
                <p className="text-muted mx-auto" style={{ maxWidth: '500px' }}>
                  Our Drishti AI model will now perform a deep-scan analysis on your 3 uploaded site photos to detect cracks, 
                  alignment deviations, and material integrity.
                </p>
                
                {!aiAnalyzing && (
                  <Button 
                    variant="success" 
                    size="lg" 
                    className="mt-4 px-5 py-3 rounded-pill shadow-lg fw-bold border-0"
                    style={{ background: 'linear-gradient(45deg, #198754, #20c997)' }}
                    onClick={runAiAnalysis}
                  >
                    <FaRobot className="me-2" /> RUN AI DIAGNOSTIC
                  </Button>
                )}
              </div>
            )}

            {/* Step 4: Final Review */}
            {activeStep === 4 && (
              <div>
                <h4 className="fw-bold mb-4 text-center" style={{ color: '#2c3e50' }}>Review & Complete</h4>
                <Row className="g-4">
                  <Col md={7}>
                    <Card className="h-100 border-0 shadow-sm p-4 rounded-4 bg-white">
                      <h6 className="fw-bold text-muted small text-uppercase mb-3">Inspection Summary</h6>
                      <div className="d-flex flex-column gap-3">
                        <div className="d-flex justify-content-between border-bottom pb-2">
                          <span className="text-muted">Inspector</span>
                          <span className="fw-bold">{user.username}</span>
                        </div>
                        <div className="d-flex justify-content-between border-bottom pb-2">
                          <span className="text-muted">Track Fitting</span>
                          <span className="fw-bold">{selectedInspection?.trackFittingId}</span>
                        </div>
                        <div className="d-flex justify-content-between border-bottom pb-2">
                          <span className="text-muted">Date</span>
                          <span className="fw-bold">{new Date(activeForm.inspectionDate).toLocaleDateString()}</span>
                        </div>
                        <div className="d-flex justify-content-between border-bottom pb-2">
                          <span className="text-muted">Manual Condition</span>
                          <Badge bg={activeForm.condition === 'good' ? 'success' : activeForm.condition === 'poor' ? 'danger' : 'warning'} className="rounded-pill px-3">
                            {activeForm.condition.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="mt-2">
                          <span className="text-muted small d-block mb-1">Inspector Notes:</span>
                          <p className="p-3 bg-light rounded-3 small mb-0">{activeForm.notes || 'No notes provided.'}</p>
                        </div>
                      </div>
                    </Card>
                  </Col>
                  <Col md={5}>
                    <Card className={`h-100 border-0 shadow-sm p-4 rounded-4 ${aiResult?.anomalies.length > 0 ? 'bg-danger-subtle' : 'bg-success-subtle'}`}>
                      <div className="d-flex align-items-center mb-3">
                        <div className={`p-2 rounded-3 me-3 ${aiResult?.anomalies.length > 0 ? 'bg-danger text-white' : 'bg-success text-white'}`}>
                          <FaRobot size={24} />
                        </div>
                        <h6 className="fw-bold mb-0">Drishti AI Report</h6>
                      </div>
                      <div className="mb-3">
                        <div className="small text-muted mb-1">AI Confidence Score:</div>
                        <h3 className={`fw-bold mb-0 ${aiResult?.anomalies.length > 0 ? 'text-danger' : 'text-success'}`}>
                          {aiResult?.confidence}%
                        </h3>
                      </div>
                      <hr className="my-3 opacity-10" />
                      {aiResult?.anomalies.length > 0 ? (
                        <div>
                          <p className="small fw-bold text-danger mb-2">Detected Anomalies:</p>
                          <ul className="small ps-3 text-danger">
                            {aiResult.anomalies.map((a, i) => <li key={i}>{a}</li>)}
                          </ul>
                        </div>
                      ) : (
                        <p className="small text-success fw-bold">No structural anomalies detected. Components verified as safe.</p>
                      )}
                      <div className="mt-auto pt-3">
                        <div className="p-3 bg-white rounded-3 shadow-sm text-center">
                          <div className="small text-muted text-uppercase fw-bold mb-1" style={{ fontSize: '0.6rem' }}>AI Recommendation</div>
                          <div className={`fw-bold ${aiResult?.anomalies.length > 0 ? 'text-danger' : 'text-success'}`}>{aiResult?.recommendation}</div>
                        </div>
                      </div>
                    </Card>
                  </Col>
                </Row>
                <div className="mt-5 d-flex justify-content-between align-items-center">
                  <Button variant="link" className="text-muted fw-bold text-decoration-none" onClick={() => setActiveStep(2)}>
                    <i className="bi bi-arrow-left me-2"></i> Edit Details
                  </Button>
                  <Button 
                    variant="success" 
                    onClick={handleCompleteInspection} 
                    className="px-5 py-3 rounded-pill fw-bold shadow-lg border-0"
                    style={{ background: 'linear-gradient(45deg, #198754, #20c997)' }}
                  >
                    COMPLETE & SUBMIT INSPECTION
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal.Body>
      </Modal>

      {/* Schedule Inspection Modal */}
      <Modal show={showScheduleModal} onHide={() => setShowScheduleModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Schedule New Inspection</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleScheduleInspection}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Track Fitting ID *</Form.Label>
                  <Form.Control
                    type="text"
                    value={scheduleForm.trackFittingId}
                    onChange={(e) => setScheduleForm({...scheduleForm, trackFittingId: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Inspection Type *</Form.Label>
                  <Form.Select
                    value={scheduleForm.inspectionType}
                    onChange={(e) => setScheduleForm({...scheduleForm, inspectionType: e.target.value})}
                    required
                  >
                    <option value="">Select type</option>
                    <option value="initial">Initial</option>
                    <option value="periodic">Periodic</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="quality">Quality</option>
                    <option value="safety">Safety</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Scheduled Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={scheduleForm.scheduledDate}
                    onChange={(e) => setScheduleForm({...scheduleForm, scheduledDate: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Inspector Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={scheduleForm.inspectorName}
                    onChange={(e) => setScheduleForm({...scheduleForm, inspectorName: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Inspector ID (optional)</Form.Label>
                  <Form.Control
                    type="text"
                    value={scheduleForm.inspectorId}
                    onChange={(e) => setScheduleForm({...scheduleForm, inspectorId: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Location</Form.Label>
              <Form.Control
                type="text"
                value={scheduleForm.location}
                onChange={(e) => setScheduleForm({...scheduleForm, location: e.target.value})}
                placeholder="Enter inspection location"
              />
            </Form.Group>
            
            <div className="d-grid">
              <Button type="submit" variant="primary">
                Schedule Inspection
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Inspection Details Modal */}
      <Modal show={showDetails} onHide={() => setShowDetails(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Inspection Details - {selectedInspection?.inspectionId}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedInspection && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <h6>Basic Information</h6>
                  <p><strong>Inspection ID:</strong> {selectedInspection.inspectionId}</p>
                  <p><strong>Track Fitting ID:</strong> {selectedInspection.trackFittingId}</p>
                  <p><strong>Type:</strong> {capitalize(selectedInspection.inspectionType)}</p>
                  <p><strong>Status:</strong> 
                    <Badge bg={getStatusColor(selectedInspection.status)} className="ms-2">
                      {selectedInspection.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </p>
                </Col>
                <Col md={6}>
                  <h6>Schedule & Inspector</h6>
                  <p><strong>Scheduled Date:</strong> {selectedInspection.scheduledDate ? new Date(selectedInspection.scheduledDate).toLocaleDateString() : '-'}</p>
                  <p><strong>Assigned Date:</strong> {selectedInspection.assignedDate ? new Date(selectedInspection.assignedDate).toLocaleString() : new Date().toLocaleString()}</p>
                  <p><strong>Inspector:</strong> {selectedInspection.inspector?.name || selectedInspection.inspectorName || '-'}</p>
                </Col>
              </Row>
              
              {selectedInspection.overallResult && (
                <Row className="mb-3">
                  <Col>
                    <h6>Result</h6>
                    <p><strong>Overall Result:</strong> 
                      <Badge bg={getResultColor(selectedInspection.overallResult)} className="ms-2">
                        {selectedInspection.overallResult.toUpperCase()}
                      </Badge>
                    </p>
                  </Col>
                </Row>
              )}
              
              {selectedInspection.findings && selectedInspection.findings.length > 0 && (
                <Row>
                  <Col>
                    <h6>Findings</h6>
                    {selectedInspection.findings.map((finding, index) => (
                      <div key={index} className="mb-2 p-2 border rounded">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <strong>{finding.category}</strong>
                            <p className="mb-1">{finding.description}</p>
                          </div>
                          <Badge bg={getSeverityColor(finding.severity)}>
                            {finding.severity.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </Col>
                </Row>
              )}

              {selectedInspection.isAnomalous && (
                <Alert variant="danger">
                  <Alert.Heading>AI Anomaly Detected!</Alert.Heading>
                  <p>
                    <strong>Anomaly Score:</strong> {selectedInspection.anomalyDetails?.anomaly_score || 'N/A'}%
                  </p>
                  <ul>
                    {selectedInspection.anomalyDetails?.details?.map((detail, index) => (
                      <li key={index}>{detail}</li>
                    ))}
                  </ul>
                </Alert>
              )}

              <h5>Inspection Criteria</h5>
              <Table striped bordered hover responsive size="sm" className="mt-3">
                <thead>
                  <tr>
                    <th>Criteria</th>
                    <th>Result</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {/* This section would typically be populated with actual criteria data */}
                  <tr>
                    <td>Track Fitting Alignment</td>
                    <td>Pass</td>
                    <td>Low</td>
                  </tr>
                  <tr>
                    <td>Wheel Flange Condition</td>
                    <td>Fail</td>
                    <td>High</td>
                  </tr>
                  <tr>
                    <td>Bearing Temperature</td>
                    <td>Pass</td>
                    <td>Low</td>
                  </tr>
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetails(false)}>
            Close
          </Button>
          {user?.role === 'admin' && (
            <Button variant="primary" onClick={handleEditClick}>
              Edit Inspection
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Edit Inspection Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Inspection</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Inspector Name</Form.Label>
              <Form.Control
                type="text"
                value={editForm.inspectorName}
                onChange={(e) => setEditForm({...editForm, inspectorName: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Scheduled Date</Form.Label>
              <Form.Control
                type="date"
                value={editForm.scheduledDate}
                onChange={(e) => setEditForm({...editForm, scheduledDate: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Inspection Type</Form.Label>
              <Form.Select
                value={editForm.inspectionType}
                onChange={(e) => setEditForm({...editForm, inspectionType: e.target.value})}
              >
                <option value="">Select Type</option>
                <option value="initial">Initial</option>
                <option value="periodic">Periodic</option>
                <option value="maintenance">Maintenance</option>
                <option value="quality">Quality</option>
                <option value="safety">Safety</option>
                <option value="pre_installation">Pre Installation</option>
                <option value="post_installation">Post Installation</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={editForm.status}
                onChange={(e) => setEditForm({...editForm, status: e.target.value})}
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveEdit}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center">
            <div className="mb-3">
              <i className="bi bi-exclamation-triangle-fill text-danger" style={{ fontSize: '3rem' }}></i>
            </div>
            <h5>Delete Inspection</h5>
            <p className="text-muted">
              Are you sure you want to delete inspection <strong>{inspectionToDelete?.inspectionId}</strong>?
              <br />
              <span className="text-danger">This action cannot be undone.</span>
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeleteInspection}>
            <i className="bi bi-trash me-2"></i>Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Inspections;
