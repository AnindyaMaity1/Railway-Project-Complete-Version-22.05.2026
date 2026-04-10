import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Modal, Badge } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';

const QRScanner = () => {
  const [qrCode, setQrCode] = useState('');
  const [scannedData, setScannedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);

  const handleScan = async () => {
    if (!qrCode.trim()) {
      toast.error('Please enter a QR code');
      return;
    }

    setLoading(true);
    try {
      // Get current location
      const location = await getCurrentLocation();

      const response = await axios.post('/api/scan/process', {
        qrCode: qrCode.trim(),
        scanLocation: location,
        scanType: 'desktop'
      });

      if (response.data.success) {
        setScannedData(response.data.data);
        setShowDetails(true);
        
        // Add to scan history
        setScanHistory(prev => [{
          id: Date.now(),
          qrCode: qrCode.trim(),
          timestamp: new Date(),
          data: response.data.data
        }, ...prev.slice(0, 9)]);

        toast.success('QR code processed successfully!');
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error(error.response?.data?.message || 'Failed to process QR code');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({
          name: 'Desktop Scanner',
          coordinates: { latitude: 0, longitude: 0 }
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          let locationName = 'Desktop Scanner';

          try {
            // Try to get a more accurate address using our internal reverse geocoding API
            const response = await axios.get('/public/reverse-geocode', {
              params: { lat: latitude, lon: longitude }
            });
            if (response.data && response.data.success) {
              locationName = response.data.name;
            }
          } catch (error) {
            console.warn('Reverse geocoding failed:', error);
          }

          resolve({
            name: locationName,
            coordinates: { latitude, longitude }
          });
        },
        () => {
          resolve({
            name: 'Desktop Scanner',
            coordinates: { latitude: 0, longitude: 0 }
          });
        },
        { timeout: 5000 }
      );
    });
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

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0">QR Code Scanner</h2>
          <p className="text-muted">Enter QR code data to retrieve track fitting information</p>
        </Col>
      </Row>

      <Row>
        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-light">
              <h5 className="mb-0">QR Code Input</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <label htmlFor="qrCode" className="form-label">QR Code Data</label>
                <textarea
                  id="qrCode"
                  className="form-control qrscan-textarea"
                  rows={2}
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  placeholder="Paste QR code data here or enter manually..."
                />
              </div>
              
              <div className="d-grid">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleScan}
                  disabled={loading || !qrCode.trim()}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-search me-2"></i>
                      Process QR Code
                    </>
                  )}
                </Button>
              </div>
            </Card.Body>
          </Card>

          {/* Scan History */}
          {scanHistory.length > 0 && (
            <Card className="border-0 shadow-sm mt-4">
              <Card.Header className="bg-light">
                <h6 className="mb-0">Recent Scans</h6>
              </Card.Header>
              <Card.Body>
                <div className="list-group list-group-flush">
                  {scanHistory.map((scan) => (
                    <div key={scan.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-1">{scan.data?.trackFitting?.serialNumber || 'Unknown'}</h6>
                        <p className="mb-1 text-muted">
                          {scan.data?.trackFitting?.itemType || 'Unknown Type'}
                        </p>
                        <small className="text-muted">
                          {scan.timestamp.toLocaleString()}
                        </small>
                      </div>
                      <div>
                        <Badge bg={getStatusColor(scan.data?.trackFitting?.status)}>
                          {scan.data?.trackFitting?.status || 'Unknown'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Scanner Instructions</h6>
            </Card.Header>
            <Card.Body>
              <ol className="small">
                <li>Copy QR code data from mobile scanner</li>
                <li>Paste the data into the text area</li>
                <li>Click "Process QR Code" to analyze</li>
                <li>View detailed information in the popup</li>
                <li>Use mobile scanner for camera-based scanning</li>
              </ol>
              
              <hr />
              
              <h6>QR Code Sources</h6>
              <ul className="small">
                <li>Mobile camera scanner</li>
                <li>QR code generator output</li>
                <li>Printed QR code labels</li>
                <li>Laser-marked QR codes</li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Scan Details Modal */}
      <Modal show={showDetails} onHide={() => setShowDetails(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Track Fitting Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {scannedData && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <h6>Basic Information</h6>
                  <p><strong>Serial Number:</strong> {scannedData.trackFitting.serialNumber}</p>
                  <p><strong>Item Type:</strong> {scannedData.trackFitting.itemType}</p>
                  <p><strong>Item Sub Type:</strong> {scannedData.trackFitting.itemSubType}</p>
                  <p><strong>Batch Number:</strong> {scannedData.trackFitting.batchNumber}</p>
                  <p><strong>Lot Number:</strong> {scannedData.trackFitting.lotNumber}</p>
                </Col>
                <Col md={6}>
                  <h6>Status & Quality</h6>
                  <p>
                    <strong>Status:</strong>{' '}
                    <Badge bg={getStatusColor(scannedData.trackFitting.status || 'in_progress')}>
                      {(scannedData.trackFitting.status || 'in_progress').replace('_', ' ').toUpperCase()}
                    </Badge>
                  </p>
                  <p>
                    <strong>Quality Grade:</strong>{' '}
                    <Badge bg={getQualityColor(scannedData.trackFitting.quality?.qualityGrade || 'A')}>
                      {scannedData.trackFitting.quality?.qualityGrade || 'A'}
                    </Badge>
                  </p>
                  <p><strong>Vendor:</strong> {scannedData.trackFitting.vendor?.vendorName || scannedData.trackFitting.vendorName || 'Unknown'}</p>
                  <p><strong>Location:</strong> {scannedData.trackFitting.manufacturing?.location || 'Factory'}</p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col>
                  <h6>Specifications</h6>
                  <p><strong>Material:</strong> {scannedData.trackFitting.specifications?.material || 'N/A'}</p>
                  <p><strong>Dimensions:</strong> {scannedData.trackFitting.specifications?.dimensions ? 
                    `${scannedData.trackFitting.specifications.dimensions.length} x ${scannedData.trackFitting.specifications.dimensions.width} x ${scannedData.trackFitting.specifications.dimensions.height} ${scannedData.trackFitting.specifications.dimensions.unit}` : 'N/A'}</p>
                  <p><strong>Weight:</strong> {scannedData.trackFitting.specifications?.weight || 'N/A'} kg</p>
                  <p><strong>Grade:</strong> {scannedData.trackFitting.specifications?.grade || 'N/A'}</p>
                </Col>
              </Row>

              {scannedData.performance && (
                <Row className="mb-3">
                  <Col>
                    <h6>Performance Metrics</h6>
                    <p><strong>Service Life:</strong> {scannedData.performance.serviceLife} days</p>
                    <p><strong>Inspection Pass Rate:</strong> {scannedData.performance.inspectionPassRate}%</p>
                    <p><strong>Warranty Days Remaining:</strong> {scannedData.performance.warrantyDaysRemaining}</p>
                  </Col>
                </Row>
              )}

              {scannedData.aiAnalysis && (
                <Row className="mb-3">
                  <Col>
                    <h6>AI Analysis</h6>
                    <p><strong>Risk Score:</strong> {scannedData.aiAnalysis.riskScore || 'N/A'}</p>
                    <p><strong>Predicted Failure Date:</strong> {scannedData.aiAnalysis.predictedFailureDate || 'N/A'}</p>
                    {scannedData.aiAnalysis.maintenanceRecommendations && (
                      <div>
                        <strong>Maintenance Recommendations:</strong>
                        <ul>
                          {scannedData.aiAnalysis.maintenanceRecommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Col>
                </Row>
              )}

              <Row>
                <Col>
                  <h6>Scan Information</h6>
                  <p><strong>Scan Time:</strong> {new Date(scannedData.scanInfo.scanTime).toLocaleString()}</p>
                  <p><strong>Location:</strong> {scannedData.scanInfo.scanLocation.name}</p>
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetails(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={() => {
            setShowDetails(false);
            setQrCode('');
          }}>
            Scan Another
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default QRScanner;
