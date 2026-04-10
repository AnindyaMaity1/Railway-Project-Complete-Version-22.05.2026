import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';

// Fix for default marker icon issue with webpack
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    iconRetinaUrl: iconRetina,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapUpdater = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);
  return null;
};

const ShortestPathFinder = () => {
  const { token } = useAuth();
  const [inspectorLat, setInspectorLat] = useState('');
  const [inspectorLon, setInspectorLon] = useState('');
  const [qrCodeId, setQrCodeId] = useState('');
  const [pathData, setPathData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [userPosition, setUserPosition] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef(null);

  const handleStartTracking = () => {
    if (navigator.geolocation) {
      setIsTracking(true);
      setShowMap(true); // Show map as soon as tracking starts
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setInspectorLat(latitude);
          setInspectorLon(longitude);
          setUserPosition([latitude, longitude]);
          if (!isTracking) { // Show toast only on initial fetch
            toast.success('Live location tracking started!');
          }
        },
        (err) => {
          setError(`Error fetching location: ${err.message}`);
          toast.error(`Error fetching location: ${err.message}`);
          setIsTracking(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
      toast.error('Geolocation is not supported by this browser.');
    }
  };

  const handleStopTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setShowMap(false);
    setUserPosition(null);
    setPathData(null);
    setError(null);
    setQrCodeId('');
    setInspectorLat('');
    setInspectorLon('');
    toast.info('Live location tracking stopped.');
  };

  useEffect(() => {
    // Cleanup function to stop tracking when the component unmounts
    return () => {
      handleStopTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPathData(null);

    try {
      const response = await axios.get('/api/qr/shortest-path', {
        params: {
          inspectorLat,
          inspectorLon,
          qrCodeId,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        const routeData = response.data.data;
        // OSRM provides coordinates as [longitude, latitude], but Leaflet needs [latitude, longitude]
        const formattedRoute = routeData.route.map(coord => [coord[1], coord[0]]);
        
        setPathData({
          ...routeData,
          route: formattedRoute,
        });
        toast.success('Shortest path calculated successfully!');
      } else {
        setError(response.data.message || 'Failed to calculate shortest path.');
        toast.error(response.data.message || 'Failed to calculate shortest path.');
      }
    } catch (err) {
      console.error('Shortest path error:', err);
      setError(err.response?.data?.message || 'An error occurred while fetching the shortest path.');
      toast.error(err.response?.data?.message || 'An error occurred while fetching the shortest path.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="mt-4">
      <Row className="justify-content-md-center">
        <Col md={8}>
          <Card>
            <Card.Header as="h4">Find Shortest Path to QR Code</Card.Header>
            <Card.Body>
              {!showMap ? (
                <div className="text-center">
                  <p>Click the button to start live tracking and view the map.</p>
                  <Button variant="primary" onClick={handleStartTracking}>
                    Start Live Tracking
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    {!isTracking ? (
                      <Button variant="success" onClick={handleStartTracking}>
                        Start Live Tracking
                      </Button>
                    ) : (
                      <Button variant="danger" onClick={handleStopTracking}>
                        Stop Live Tracking
                      </Button>
                    )}
                  </div>
                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3" controlId="formQrCodeId">
                      <Form.Label>QR Code Serial Number</Form.Label>
                      <Form.Control
                        type="text"
                        value={qrCodeId}
                        onChange={(e) => setQrCodeId(e.target.value)}
                        placeholder="Enter Serial Number (e.g., ELA-0001)"
                        required
                      />
                    </Form.Group>

                    <Button variant="primary" type="submit" disabled={loading}>
                      {loading ? 'Calculating...' : 'Find Shortest Path'}
                    </Button>
                  </Form>

                  {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

                  {userPosition && (
                    <div className="mt-4">
                      {pathData && (
                        <>
                          <h5>Shortest Path Details:</h5>
                          <p className="mb-1"><strong>Fitting is between:</strong> {pathData.fromStation || 'N/A'} and {pathData.toStation || 'N/A'}</p>
                          <p className="mb-1 text-success"><strong>Closer to:</strong> {pathData.closestStation}</p>
                          <p className="mb-1"><strong>Distance:</strong> {(pathData.distance / 1000).toFixed(2)} km</p>
                          <p className="mb-3"><strong>Estimated Duration:</strong> {(pathData.duration / 60).toFixed(2)} minutes</p>
                        </>
                      )}

                      <MapContainer
                        center={userPosition}
                        zoom={15} // Increased zoom for better live view
                        scrollWheelZoom={true} // Enabled scroll wheel zoom
                        style={{ height: '400px', width: '100%' }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapUpdater position={userPosition} />
                        {userPosition && (
                          <Marker position={userPosition}>
                            <Popup>Your Location</Popup>
                          </Marker>
                        )}
                        
                        {/* Marker for From Station */}
                        {pathData && pathData.fromStationCoordinates && pathData.fromStationCoordinates.latitude !== 0 && (
                          <Marker position={[pathData.fromStationCoordinates.latitude, pathData.fromStationCoordinates.longitude]}>
                            <Popup>
                              From Station: {pathData.fromStation}
                              {pathData.closestStation === pathData.fromStation && " (CLOSET)"}
                            </Popup>
                          </Marker>
                        )}

                        {/* Marker for To Station */}
                        {pathData && pathData.toStationCoordinates && pathData.toStationCoordinates.latitude !== 0 && (
                          <Marker position={[pathData.toStationCoordinates.latitude, pathData.toStationCoordinates.longitude]}>
                            <Popup>
                              To Station: {pathData.toStation}
                              {pathData.closestStation === pathData.toStation && " (CLOSET)"}
                            </Popup>
                          </Marker>
                        )}

                        {pathData && pathData.route && (
                          <>
                            {/* Casing for the route */}
                            <Polyline
                              positions={pathData.route}
                              pathOptions={{ color: 'black', weight: 7, opacity: 0.7 }}
                            />
                            {/* Main route line */}
                            <Polyline
                              positions={pathData.route}
                              pathOptions={{ color: '#00BFFF', weight: 4 }}
                            />
                          </>
                        )}
                      </MapContainer>
                    </div>
                  )}

                  {!userPosition && isTracking && (
                    <Alert variant="info" className="mt-3">
                      Acquiring your location...
                    </Alert>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ShortestPathFinder;
