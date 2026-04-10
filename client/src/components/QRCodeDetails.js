import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Form, InputGroup, Button, Modal } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import QRCode from 'qrcode';

const QRCodeDetails = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [qrImages, setQrImages] = useState({});
  const [selectedQrItem, setSelectedQrItem] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/inventory', {
        params: { limit: 500 }
      });
      if (response.data.success) {
        setItems(response.data.data.trackFittings || []);
        
        const images = {};
        for (const item of response.data.data.trackFittings || []) {
          if (item.qrCode) {
            try {
              const img = await QRCode.toDataURL(item.qrCode, {
                width: 120,
                margin: 1,
                color: { dark: '#000000', light: '#FFFFFF' }
              });
              images[item._id] = img;
            } catch (e) {
              console.error('QR generation error:', e);
            }
          }
        }
        setQrImages(images);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to fetch QR code details');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.serialNumber?.toLowerCase().includes(term) ||
      item.itemType?.toLowerCase().includes(term) ||
      item.vendorName?.toLowerCase().includes(term) ||
      item.fromStation?.toLowerCase().includes(term) ||
      item.toStation?.toLowerCase().includes(term)
    );
  });

  const formatItemType = (type) => {
    if (!type) return 'N/A';
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusColor = (status) => {
    const colors = {
      'manufactured': 'secondary',
      'inspected': 'info',
      'supplied': 'warning',
      'installed': 'success',
      'in_service': 'primary',
      'maintenance': 'warning',
      'replaced': 'dark',
      'scrapped': 'danger',
      'in_progress': 'info',
      'completed': 'success',
      'missed': 'danger'
    };
    return colors[status] || 'secondary';
  };

  const getQualityColor = (grade) => {
    if (!grade) return 'secondary';
    const firstChar = grade.charAt(0).toUpperCase();
    if (firstChar >= 'A' && firstChar <= 'F') {
      const colors = {
        'A': 'success',
        'B': 'info',
        'C': 'primary',
        'D': 'warning',
        'E': 'orange',
        'F': 'danger'
      };
      return colors[firstChar] || 'secondary';
    }
    return 'secondary';
  };

  const downloadQR = (item) => {
    if (!qrImages[item._id]) return;
    const link = document.createElement('a');
    link.href = qrImages[item._id];
    link.download = `QR_${item.serialNumber}.png`;
    link.click();
  };

  const openQrModal = (item) => {
    if (!qrImages[item._id]) return;
    setSelectedQrItem(item);
    setShowQrModal(true);
  };

  const deleteTrackFitting = (item) => {
    if (!item?._id) return;
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDeleteTrackFitting = async () => {
    if (!itemToDelete?._id) return;

    try {
      const response = await axios.delete(`/api/inventory/${itemToDelete._id}`);
      if (!response.data?.success) {
        toast.error(response.data?.message || 'Failed to delete track fitting');
        return;
      }
      setItems(prev => prev.filter(i => i._id !== itemToDelete._id));
      toast.success('QR / track fitting deleted successfully');
    } catch (error) {
      console.error('Error deleting track fitting:', error);
      toast.error(error.response?.data?.message || 'Failed to delete track fitting');
    } finally {
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading QR Code Details...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0">QR Code Details</h2>
          <p className="text-muted">View all generated QR codes and their details</p>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={6}>
              <InputGroup>
                <Form.Control
                  placeholder="Search by serial number, type, vendor, station..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button variant="primary" onClick={() => fetchItems()}>
                  Refresh
                </Button>
              </InputGroup>
            </Col>
            <Col md={6} className="text-md-end mt-3 mt-md-0">
              <Badge bg="primary" className="me-2">
                Total: {filteredItems.length}
              </Badge>
              <Badge bg="success">
                With QR: {filteredItems.filter(i => i.qrCode).length}
              </Badge>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <div style={{ overflowX: 'auto' }}>
            <Table responsive hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th className="text-center" style={{ minWidth: '140px' }}>QR Code</th>
                  <th>Serial Number</th>
                  <th>Item Type</th>
                  <th>Vendor</th>
                  <th>From Station</th>
                  <th>To Station</th>
                  <th>Mfg Date</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item._id}>
                    <td className="text-center">
                      {qrImages[item._id] ? (
                        <div
                          className="d-flex flex-column align-items-center"
                          style={{ cursor: 'pointer' }}
                          onClick={() => openQrModal(item)}
                          title="Click to view larger QR"
                        >
                          <img 
                            src={qrImages[item._id]} 
                            alt="QR Code" 
                            style={{ width: '80px', height: '80px', borderRadius: '4px' }}
                          />
                          <small className="text-muted mt-1">{item.serialNumber?.slice(-8)}</small>
                        </div>
                      ) : (
                        <Badge bg="secondary">No QR</Badge>
                      )}
                    </td>
                    <td>
                      <strong>{item.serialNumber || 'N/A'}</strong>
                      {item.batchNumber && <br />}
                      {item.batchNumber && <small className="text-muted">Batch: {item.batchNumber}</small>}
                    </td>
                    <td>
                      <span className="text-capitalize">{formatItemType(item.itemType)}</span>
                      {item.grade && <Badge bg="secondary" className="ms-1">{item.grade}</Badge>}
                      {(item.qualityGrade || item.quality?.qualityGrade) && 
                        <Badge bg={getQualityColor(item.qualityGrade || item.quality?.qualityGrade)} className="ms-1">
                          {item.qualityGrade || item.quality?.qualityGrade}
                        </Badge>
                      }
                    </td>
                    <td>{item.vendorName || 'N/A'}</td>
                    <td>{item.fromStation || 'N/A'}</td>
                    <td>{item.toStation || 'N/A'}</td>
                    <td>
                      {item.manufacturingDate 
                        ? new Date(item.manufacturingDate).toLocaleDateString() 
                        : 'N/A'}
                    </td>
                    <td>
                      <Badge bg={getStatusColor(item.status || 'in_progress')}>
                        {(item.status || 'in_progress').replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => downloadQR(item)}
                          disabled={!qrImages[item._id]}
                          title="Download QR Code"
                        >
                          <i className="bi bi-download"></i>
                        </Button>
                        {user?.role === 'admin' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => deleteTrackFitting(item)}
                            title="Delete QR / Track Fitting"
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          
          {filteredItems.length === 0 && (
            <div className="text-center py-5">
              <i className="bi bi-qr-code text-muted" style={{ fontSize: '3rem' }}></i>
              <p className="text-muted mt-3">No QR codes found</p>
            </div>
          )}
        </Card.Body>
      </Card>
      {/* Large QR preview modal */}
      <Modal show={showQrModal} onHide={() => setShowQrModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            QR Code – {selectedQrItem?.serialNumber || 'Track Fitting'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedQrItem && qrImages[selectedQrItem._id] && (
            <div className="d-flex flex-column align-items-center">
              <Card className="border-0 shadow-sm">
                <Card.Body className="p-3">
                  <img
                    src={qrImages[selectedQrItem._id]}
                    alt="QR Code Large"
                    style={{ width: '240px', height: '240px', borderRadius: '8px' }}
                  />
                </Card.Body>
              </Card>
              <small className="text-muted mt-2">
                Serial: {selectedQrItem.serialNumber || 'N/A'}
              </small>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQrModal(false)}>
            Close
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
            <h5>Delete QR / Track Fitting</h5>
            <p className="text-muted">
              Are you sure you want to delete QR / track fitting <strong>{itemToDelete?.serialNumber}</strong>?
              <br />
              <span className="text-danger">This action cannot be undone.</span>
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeleteTrackFitting}>
            <i className="bi bi-trash me-2"></i>Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default QRCodeDetails;
