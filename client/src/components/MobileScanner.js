import React, { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Modal, Badge } from 'react-bootstrap';
import QrScanner from 'qr-scanner';
import axios from 'axios';
import { toast } from 'react-toastify';

const MobileScanner = () => {
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualInputValue, setManualInputValue] = useState('');

  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setError('');
      setScanning(true);

      if (!videoRef.current) {
        throw new Error('Video element not found');
      }

      // Basic capability checks to give clearer errors
      if (typeof navigator !== 'undefined' && !navigator.mediaDevices) {
        throw new Error('Camera API is not available in this browser.');
      }

      if (typeof window !== 'undefined' && window.isSecureContext === false && window.location.hostname !== 'localhost') {
        throw new Error('Camera access requires HTTPS or localhost.');
      }

      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        throw new Error('No camera device detected.');
      }

      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          handleScanResult(result.data);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment'
        }
      );

      await qrScannerRef.current.start();
    } catch (err) {
      console.error('Scanner start error:', err);
      // Map common error messages to more user-friendly hints
      if (err.message && err.message.includes('secure context')) {
        setError('Failed to start camera. Please use HTTPS or localhost for camera access.');
      } else if (err.message && err.message.includes('device')) {
        setError('No camera found. Please connect a camera or use a device with a camera.');
      } else if (err.name === 'NotAllowedError') {
        setError('Camera permission was denied. Please allow camera access in your browser settings.');
      } else {
        setError('Failed to start camera. Please check browser permissions and that a camera is available.');
      }
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setScanning(false);
  };

  const handleScanResult = async (qrData) => {
    try {
      setLoading(true);
      stopScanning();

      // Get current location
      const location = await getCurrentLocation();

      const response = await axios.post('/api/scan/process', {
        qrCode: qrData,
        scanLocation: location,
        scanType: 'mobile'
      });

      if (response.data.success) {
        setScannedData(response.data.data);
        setShowDetails(true);
        
        // Add to scan history
        setScanHistory(prev => [{
          id: Date.now(),
          qrCode: qrData,
          timestamp: new Date(),
          data: response.data.data
        }, ...prev.slice(0, 9)]); // Keep last 10 scans

        toast.success('QR code scanned successfully!');
      }
    } catch (error) {
      console.error('Scan processing error:', error);
      toast.error(error.response?.data?.message || 'Failed to process QR code');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({
          name: 'Unknown Location',
          coordinates: { latitude: 0, longitude: 0 }
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          let locationName = 'Current Location';

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
            name: 'Unknown Location',
            coordinates: { latitude: 0, longitude: 0 }
          });
        },
        { timeout: 5000 }
      );
    });
  };

  const handleManualInput = () => {
    setManualInputValue('');
    setShowManualModal(true);
  };

  const handleBrowseFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const result = await QrScanner.scanImage(file);
      if (result) {
        await handleScanResult(result.data || result);
      } else {
        toast.error('No QR code detected in the selected image.');
      }
    } catch (err) {
      console.error('File scan error:', err);
      toast.error('Failed to read QR code from the selected file.');
    } finally {
      setLoading(false);
      // Reset input so the same file can be selected again if needed
      event.target.value = '';
    }
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
      'scrapped': 'danger'
    };
    return colors[status] || 'secondary';
  };

  const getQualityColor = (grade) => {
    const colors = {
      'A': 'success',
      'B': 'info',
      'C': 'warning',
      'D': 'danger'
    };
    return colors[grade] || 'secondary';
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualInputValue.trim()) {
      toast.error('Please enter QR code data.');
      return;
    }
    setShowManualModal(false);
    await handleScanResult(manualInputValue.trim());
  };

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0">Mobile QR Scanner</h2>
          <p className="text-muted">Scan track fitting QR codes with your mobile device</p>
        </Col>
      </Row>

      <Row>
        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-light">
              <h5 className="mb-0">QR Code Scanner</h5>
            </Card.Header>
            <Card.Body>
              {error && (
                <Alert variant="danger" className="mb-3">
                  {error}
                </Alert>
              )}

              <div className="text-center mb-4">
                <div
                  style={{
                    width: '100%',
                    maxWidth: '400px',
                    height: '300px',
                    backgroundColor: '#f8f9fa',
                    border: '2px dashed #dee2e6',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    overflow: 'hidden'
                  }}
                >
                  <video
                    ref={videoRef}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: scanning ? 'block' : 'none'
                    }}
                    muted
                    playsInline
                  />
                  {!scanning && (
                    <div className="text-muted">
                      <i className="bi bi-camera" style={{ fontSize: '3rem' }}></i>
                      <p className="mt-2">Camera will appear here when scanning starts</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="d-grid gap-2 d-md-flex justify-content-md-center">
                {!scanning ? (
                  <>
                    <Button
                      variant="success"
                      className="mobile-start-btn"
                      size="lg"
                      onClick={startScanning}
                      disabled={loading}
                    >
                      <i className="bi bi-camera me-2"></i>
                      Start Scanning
                    </Button>
                    <Button
                      variant="danger"
                      className="mobile-manual-btn"
                      size="lg"
                      onClick={handleManualInput}
                    >
                      <i className="bi bi-keyboard me-2"></i>
                      Manual Input
                    </Button>
                    <Button
                      variant="secondary"
                      className="mobile-browse-btn"
                      size="lg"
                      onClick={handleBrowseFile}
                    >
                      <i className="bi bi-folder2-open me-2"></i>
                      Browse
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="danger"
                    size="lg"
                    onClick={stopScanning}
                  >
                    <i className="bi bi-stop-circle me-2"></i>
                    Stop Scanning
                  </Button>
                )}
              </div>

              {loading && (
                <div className="text-center mt-3">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Processing...</span>
                  </div>
                  <p className="mt-2">Processing QR code...</p>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileSelected}
                style={{ display: 'none' }}
              />
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
              <h6 className="mb-0">Scanning Instructions</h6>
            </Card.Header>
            <Card.Body>
              <ol className="small">
                <li>Ensure good lighting conditions.</li>
                <li>Hold the QR code steady in front of the camera.</li>
                <li>Keep the QR code within the scanning area.</li>
                <li>Wait for the automatic scan detection.</li>
                <li>Use manual input if camera scanning fails.</li>
              </ol>
              
              <hr />
              
              <h6>Tips for Better Scanning</h6>
              <ul className="small">
                <li>Clean the QR code surface.</li>
                <li>Ensure QR code is not damaged.</li>
                <li>Hold device steady.</li>
                <li>Try different angles if needed.</li>
                <li>Use flashlight in low light.</li>
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
            startScanning();
          }}>
            Scan Another
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Manual Input Modal */}
      <Modal show={showManualModal} onHide={() => setShowManualModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Enter QR Code Data</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleManualSubmit}>
            <div className="mb-3">
              <label htmlFor="manualQrInput" className="form-label">
                QR code data
              </label>
              <textarea
                id="manualQrInput"
                className="form-control qrscan-textarea"
                rows={5}
                value={manualInputValue}
                onChange={(e) => setManualInputValue(e.target.value)}
                placeholder="Paste or type the QR code contents here..."
              />
            </div>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setShowManualModal(false)}>
                Cancel
              </Button>
              <Button variant="success" type="submit">
                Use QR Data
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default MobileScanner;
