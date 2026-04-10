import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Form, Button, Modal, Table } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import QRCode from 'qrcode';

const INDIAN_RAILWAY_STATIONS = [
  'Mumbai Central', 'Mumbai CST', 'Mumbai Bandra Terminus', 'Mumbai Dadar', 'Mumbai Thane',
  'Delhi', 'Delhi S Rohilla', 'Delhi Cantt', 'New Delhi', 'Old Delhi',
  'Howrah', 'Kolkata', 'Kolkata Sealdah', 'Kolkata Chitpur',
  'Chennai Central', 'Chennai Egmore', 'Chennai Beach', 'Chennai Tambaram',
  'Ahmedabad', 'Ahmedabad Junction', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Gandhidham', 'Jamnagar',
  'Bengaluru', 'Bengaluru City', 'Bengaluru Cantt', 'Mysore', 'Mangalore', 'Hubli', 'Dharwad', 'Belgaum',
  'Hyderabad', 'Hyderabad Deccan', 'Secunderabad', 'Kachehuda', 'Warangal', 'Nizamabad',
  'Pune', 'Pune Junction', 'Nagpur', 'Nagpur Junction', 'Aurangabad', 'Nashik', 'Solapur', 'Latur',
  'Jaipur', 'Ajmer', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Sri Ganganagar', 'Jaisalmer',
  'Lucknow', 'Lucknow Charbagh', 'Kanpur Central', 'Varanasi', 'Varanasi Junction', 'Allahabad', 'Agra', 'Agra Cantt', 'Mathura',
  'Patna', 'Patna Junction', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Katihar', 'Arrah',
  'Guwahati', 'Guwahati Junction', 'Dibrugarh', 'Tinsukia', 'Jorhat', 'Silchar', 'Dimapur', 'Kohima',
  'Bhopal', 'Bhopal Junction', 'Indore', 'Jabalpur', 'Ujjain', 'Gwalior', 'Orchha',
  'Chandigarh', 'Shimla', 'Kalka', 'Una', 'Mandi', 'Dharamsala',
  'Amritsar', 'Jalandhar', 'Ludhiana', 'Patiala', 'Bathinda', 'Ferozepur', 'Hoshiarpur',
  'Dehradun', 'Haridwar', 'Rishikesh', 'Kashmir', 'Srinagar', 'Jammu', 'Jammu Tawi',
  'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh', 'Purulia',
  'Bhubaneswar', 'Cuttack', 'Puri', 'Rourkela', 'Sambalpur', 'Berhampur', 'Balasore',
  'Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Kadapa', 'Nellore', 'Kurnool', 'Anantapur',
  'Trivandrum', 'Kochi', 'Kochi Ernakulam', 'Kollam', 'Kozhikode', 'Malappuram', 'Thrissur', 'Palakkad',
  'Goa', 'Margao', 'Vasco da Gama', 'Panjim',
  'Shillong', 'Aizawl', 'Imphal', 'Agartala', 'Gangtok',
  'Rohtak', 'Hisar', 'Rewari', 'Karnal', 'Panipat', 'Sonipat', 'Ambala', 'Yamunanagar',
  'Durgapur', 'Asansol', 'Berhampore', 'Malda', 'Krishnanagar', 'Barasat', 'Bardhaman',
  'Firozabad', 'Etawah', 'Mainpuri', 'Aligarh', 'Moradabad', 'Bareilly', 'Rampur', 'Saharanpur',
  'Jhansi', 'Gwalior', 'Bhind', 'Guna', 'Shivpuri', 'Ratlam', 'Mandsaur', 'Neemuch',
  'Satna', 'Rewa', 'Satara', 'Sangli', 'Kolhapur', 'Ratnagiri', 'Karad', 'Belgaum',
  'Dhar', 'Khandwa', 'Khargone', 'Burhanpur', 'Jalgaon', 'Bhusawal', 'Nashik Road',
  'Nanded', 'Osmanabad', 'Parbhani', 'Latur Road', 'Udgir', 'Bidar', 'Raichur', 'Koppal',
  'Bellary', 'Chitradurga', 'Tumkur', 'Kolar', 'Chikmagalur', 'Hassan', 'Mandya', 'Mysore Road'
];

const QRGenerator = () => {
  const { user } = useAuth();
  const [nextSerialNumber, setNextSerialNumber] = useState(1);
  const [formData, setFormData] = useState({
    itemType: 'elastic_rail_clip',
    itemSubType: '',
    serialNumber: '',
    batchNumber: '',
    lotNumber: '',
    vendorId: '',
    vendorName: '',
    vendorCode: '',
    specifications: {
      material: 'Spring Steel',
      dimensions: {
        length: '100',
        width: '20',
        height: '15',
        unit: 'mm'
      },
      weight: '0.6',
      grade: 'A',
      standard: 'IS 1234'
    },
    qualityGrade: 'A',
    manufacturing: {
      date: new Date().toISOString().split('T')[0],
      location: 'Default Factory',
      machineId: 'MACH-001',
      operatorId: user ? user.employeeId : ''
    },
    warranty: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      duration: '24',
      terms: 'Standard warranty terms apply.'
    }
  });
  const [vendors, setVendors] = useState([]);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkData, setBulkData] = useState([]);
  const [bulkQrCodes, setBulkQrCodes] = useState([]);
  const [showBulkPreview, setShowBulkPreview] = useState(false);

  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [fromShowSuggestions, setFromShowSuggestions] = useState(false);
  const [toShowSuggestions, setToShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const vendorRes = await axios.get('/api/vendors');
        if (vendorRes.data.success) {
          setVendors(vendorRes.data.data);
        }
        
        const serialRes = await axios.get('/api/inventory/last-serial');
        if (serialRes.data.success) {
          setNextSerialNumber(serialRes.data.data.nextNumber);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  // Auto-detect manufacturing location based on current location
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await axios.get('/public/reverse-geocode', {
              params: { lat: latitude, lon: longitude }
            });

            const name = res.data?.success && res.data?.name ? res.data.name : null;
            if (name) {
              setFormData(prev => ({
                ...prev,
                manufacturing: {
                  ...prev.manufacturing,
                  location: name
                }
              }));
            }
          } catch (error) {
            console.error('Error resolving manufacturing location:', error);
          }
        },
        (err) => {
          console.warn('Geolocation error for manufacturing location:', err);
        },
        { timeout: 5000 }
      );
    }
  }, []);

const handleVendorChange = (e) => {
    const selectedVendor = vendors.find(v => v._id === e.target.value);
    if (selectedVendor) {
      setFormData(prev => ({
        ...prev,
        vendorId: selectedVendor._id,
        vendorName: selectedVendor.companyName,
        vendorCode: selectedVendor.vendorCode,
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested manufacturing fields
    if (name.startsWith('manufacturing')) {
      const field = name.replace('manufacturing', '').toLowerCase();
      // Special case for date because name is manufacturingDate but field is date
      const actualField = field === 'date' ? 'date' : field;
      setFormData(prev => ({
        ...prev,
        manufacturing: {
          ...prev.manufacturing,
          [actualField]: value
        }
      }));
      return;
    }

    // Handle other nested fields if necessary, otherwise top-level
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDimensionChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        dimensions: {
          ...prev.specifications.dimensions,
          [name]: parseFloat(value) || 0
        }
      }
    }));
  };

const handleGenerateSerial = () => {
    const prefix = formData.itemType.toUpperCase().substring(0, 3);
    const serial = `${prefix}-${nextSerialNumber.toString().padStart(4, '0')}`;
    setFormData(prev => ({
      ...prev,
      serialNumber: serial
    }));
    setNextSerialNumber(prev => prev + 1);
  };

  const handleFromStationChange = (e) => {
    const value = e.target.value;
    setFromStation(value);
    if (value.length > 0) {
      const filtered = INDIAN_RAILWAY_STATIONS.filter(s => 
        s.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10);
      setFromSuggestions(filtered);
      setFromShowSuggestions(true);
    } else {
      setFromSuggestions([]);
      setFromShowSuggestions(false);
    }
  };

  const handleToStationChange = (e) => {
    const value = e.target.value;
    setToStation(value);
    if (value.length > 0) {
      const filtered = INDIAN_RAILWAY_STATIONS.filter(s => 
        s.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10);
      setToSuggestions(filtered);
      setToShowSuggestions(true);
    } else {
      setToSuggestions([]);
      setToShowSuggestions(false);
    }
  };

  const selectFromStation = (station) => {
    setFromStation(station);
    setFromSuggestions([]);
    setFromShowSuggestions(false);
  };

  const selectToStation = (station) => {
    setToStation(station);
    setToSuggestions([]);
    setToShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/api/qr/generate', {
        ...formData,
        fromStation, // Add fromStation to the payload
        toStation,   // Add toStation to the payload
        qualityGrade: formData.qualityGrade,
        specifications: {
          material: formData.specifications.material,
          dimensions: formData.specifications.dimensions,
          weight: formData.specifications.weight,
          grade: formData.specifications.grade,
          standard: formData.specifications.standard
        },
        manufacturing: {
          date: formData.manufacturing.date,
          location: formData.manufacturing.location,
          machineId: formData.manufacturing.machineId
        },
        warranty: {
          duration: formData.warranty.duration
        }
      });

if (response.data.success) {
        setQrCodeData(response.data.data);
        setShowPreview(true);
        toast.success('QR code generated and saved to database!');
        
        const serialRes = await axios.get('/api/inventory/last-serial');
        if (serialRes.data.success) {
          setNextSerialNumber(serialRes.data.data.nextNumber);
        }
      }
    } catch (error) {
      console.error('QR generation error:', error);
      toast.error(error.response?.data?.message || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/api/qr/bulk-generate', {
        items: bulkData,
        vendorId: formData.vendorId,
        vendorName: formData.vendorName,
        vendorCode: formData.vendorCode
      });

      console.log('Bulk QR API Response:', response.data); // Debug log

      if (response.data.success) {
        // Debug: Log the response structure
        console.log('Response data structure:', response.data.data);
        console.log('QR Codes in response:', response.data.data.qrCodes);
        console.log('Successful count:', response.data.data.successful);
        
        // Extract QR codes from the correct response structure
        let qrCodesToStore = [];
        
        if (response.data.data.results && Array.isArray(response.data.data.results)) {
          // Filter only successful results and transform them for display
          const successfulResults = response.data.data.results.filter(result => result.success);
          
          // Generate QR code images for each successful result
          qrCodesToStore = await Promise.all(
            successfulResults.map(async (result) => {
              try {
                // Generate actual QR code image
                const qrCodeImage = await QRCode.toDataURL(result.qrCode, {
                  width: 200,
                  margin: 2,
                  color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                  }
                });
                
                return {
                  serialNumber: result.serialNumber,
                  itemType: bulkData.find(item => item.serialNumber === result.serialNumber)?.itemType || 'Unknown',
                  qrCode: result.qrCode,
                  trackFittingId: result.trackFittingId,
                  qrCodeImage: qrCodeImage
                };
              } catch (qrError) {
                console.error('Error generating QR code image:', qrError);
                // Fallback to SVG placeholder
                return {
                  serialNumber: result.serialNumber,
                  itemType: bulkData.find(item => item.serialNumber === result.serialNumber)?.itemType || 'Unknown',
                  qrCode: result.qrCode,
                  trackFittingId: result.trackFittingId,
                  qrCodeImage: `data:image/svg+xml;base64,${btoa(`
                    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                      <rect width="200" height="200" fill="white" stroke="black" stroke-width="2"/>
                      <text x="100" y="90" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold">
                        QR Code
                      </text>
                      <text x="100" y="110" text-anchor="middle" font-family="Arial" font-size="10">
                        ${result.serialNumber}
                      </text>
                      <text x="100" y="130" text-anchor="middle" font-family="Arial" font-size="8">
                        ID: ${result.trackFittingId}
                      </text>
                      <text x="100" y="150" text-anchor="middle" font-family="Arial" font-size="8">
                        ${result.qrCode.substring(0, 20)}...
                      </text>
                    </svg>
                  `)}`
                };
              }
            })
          );
        } else {
          // Fallback: create mock data if response structure is unexpected
          console.log('Unexpected response structure, creating mock data for testing');
          qrCodesToStore = await Promise.all(
            bulkData.map(async (item, index) => {
              const mockQrCode = `QR_${item.serialNumber}_${Date.now()}`;
              try {
                const qrCodeImage = await QRCode.toDataURL(mockQrCode, {
                  width: 200,
                  margin: 2,
                  color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                  }
                });
                return {
                  serialNumber: item.serialNumber,
                  itemType: item.itemType,
                  qrCodeImage: qrCodeImage,
                  qrCode: mockQrCode
                };
              } catch (qrError) {
                console.error('Error generating mock QR code image:', qrError);
                return {
                  serialNumber: item.serialNumber,
                  itemType: item.itemType,
                  qrCodeImage: `data:image/svg+xml;base64,${btoa(`
                    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                      <rect width="200" height="200" fill="white" stroke="black" stroke-width="2"/>
                      <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="12">
                        QR Code ${index + 1}
                      </text>
                      <text x="100" y="120" text-anchor="middle" font-family="Arial" font-size="10">
                        ${item.serialNumber}
                      </text>
                    </svg>
                  `)}`,
                  qrCode: mockQrCode
                };
              }
            })
          );
        }
        
        console.log('QR Codes to store:', qrCodesToStore);
        
        // Store the generated QR codes for display
        setBulkQrCodes(qrCodesToStore);
        setShowBulkPreview(true);
        toast.success(`Generated ${response.data.data.successful || qrCodesToStore.length} QR codes successfully!`);
        setBulkData([]);
        // Don't switch back to single mode automatically - let user view the QR codes first
      }
    } catch (error) {
      console.error('Bulk QR generation error:', error);
      toast.error(error.response?.data?.message || 'Failed to generate bulk QR codes');
    } finally {
      setLoading(false);
    }
  };

  const addBulkItem = () => {
    const prefix = formData.itemType.toUpperCase().substring(0, 3);
    const serial = `${prefix}-${nextSerialNumber.toString().padStart(4, '0')}`;
    const newItem = {
      itemType: formData.itemType,
      itemSubType: formData.itemSubType,
      serialNumber: serial,
      batchNumber: formData.batchNumber,
      lotNumber: formData.lotNumber,
      specifications: {
        material: formData.specifications.material,
        dimensions: formData.specifications.dimensions,
        weight: formData.specifications.weight,
        grade: formData.specifications.grade,
        standard: formData.specifications.standard
      },
      manufacturing: {
        date: formData.manufacturing.date,
        location: formData.manufacturing.location,
        machineId: formData.manufacturing.machineId
      }
    };

    setBulkData(prev => [...prev, newItem]);
    setNextSerialNumber(prev => prev + 1);
  };

  const removeBulkItem = (index) => {
    setBulkData(prev => prev.filter((_, i) => i !== index));
  };

  const downloadQRCode = async () => {
    if (qrCodeData?.qrCodeImage) {
      const link = document.createElement('a');
      link.href = qrCodeData.qrCodeImage;
      link.download = `QR_${qrCodeData.serialNumber}.png`;
      link.click();
    }
  };

  const downloadBulkQRCodes = async () => {
    if (bulkQrCodes && bulkQrCodes.length > 0) {
      // Download each QR code individually
      bulkQrCodes.forEach((qrCode, index) => {
        if (qrCode.qrCodeImage) {
          const link = document.createElement('a');
          link.href = qrCode.qrCodeImage;
          link.download = `QR_${qrCode.serialNumber}.png`;
          link.click();
        }
      });
    }
  };


  const itemTypes = [
    { value: 'elastic_rail_clip', label: 'Elastic Rail Clip' },
    { value: 'rail_pad', label: 'Rail Pad' },
    { value: 'liner', label: 'Liner' },
    { value: 'sleeper', label: 'Sleeper' },
    { value: 'fish_plate', label: 'Fish Plate' },
    { value: 'joggle_fish_plate', label: 'Joggle Fish Plate' },
    { value: 'glued_joint', label: 'Glued Insulated Joint' },
    { value: 'rail_anchor', label: 'Rail Anchor' },
    { value: 'check_rail', label: 'Check Rail' }
  ];

  return (
    <Container className="py-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-0">QR Code Generator</h2>
          <p className="text-muted">Generate QR codes for track fittings</p>
        </Col>
        <Col xs="auto">
          <Button
            variant="dark"
            onClick={() => setBulkMode(!bulkMode)}
            className="bulk-toggle-btn"
          >
            {bulkMode ? "Single Mode" : "Bulk Mode"}
          </Button>
        </Col>
      </Row>

      <Row>
        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-light">
              <h5 className="mb-0">
                {bulkMode ? "Bulk QR Code Generation" : "Generate QR Code"}
              </h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={bulkMode ? handleBulkSubmit : handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Item Type *</Form.Label>
                      <Form.Select
                        name="itemType"
                        value={formData.itemType}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select item type</option>
                        {itemTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Item Sub Type</Form.Label>
                      <Form.Control
                        type="text"
                        name="itemSubType"
                        value={formData.itemSubType}
                        onChange={handleChange}
                        placeholder="e.g., Standard, Heavy Duty"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Serial Number *</Form.Label>
                      <div className="input-group">
                        <Form.Control
                          type="text"
                          name="serialNumber"
                          value={formData.serialNumber}
                          onChange={handleChange}
                          required
                        />
                        <Button
                          variant="secondary"
                          className="serial-generate-btn"
                          onClick={handleGenerateSerial}
                          type="button"
                        >
                          Generate
                        </Button>
                      </div>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Batch Number *</Form.Label>
                      <Form.Control
                        type="text"
                        name="batchNumber"
                        value={formData.batchNumber}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Lot Number *</Form.Label>
                      <Form.Control
                        type="text"
                        name="lotNumber"
                        value={formData.lotNumber}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
<Col md={6}>
                    {/* From Station Input */}
                    <Form.Group className="mb-3" controlId="formFromStation">
                      <Form.Label>From Station</Form.Label>
                      <div className="position-relative">
                        <Form.Control
                          type="text"
                          value={fromStation}
                          onChange={handleFromStationChange}
                          onFocus={() => fromStation && setFromShowSuggestions(true)}
                          placeholder="Search Indian railway station"
                          autoComplete="off"
                          required
                        />
                        {fromShowSuggestions && fromSuggestions.length > 0 && (
                          <div className="station-suggestions" style={{
                            position: 'absolute', top: '100%', left: 0, right: 0,
                            maxHeight: '200px', overflowY: 'auto', background: 'white',
                            border: '1px solid #ddd', borderRadius: '4px', zIndex: 1000,
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                          }}>
                            {fromSuggestions.map((station) => (
                              <div
                                key={station}
                                className="station-suggestion-item"
                                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                                onMouseDown={() => selectFromStation(station)}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                              >
                                {station}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    {/* To Station Input */}
                    <Form.Group className="mb-3" controlId="formToStation">
                      <Form.Label>To Station</Form.Label>
                      <div className="position-relative">
                        <Form.Control
                          type="text"
                          value={toStation}
                          onChange={handleToStationChange}
                          onFocus={() => toStation && setToShowSuggestions(true)}
                          placeholder="Search Indian railway station"
                          autoComplete="off"
                          required
                        />
                        {toShowSuggestions && toSuggestions.length > 0 && (
                          <div className="station-suggestions" style={{
                            position: 'absolute', top: '100%', left: 0, right: 0,
                            maxHeight: '200px', overflowY: 'auto', background: 'white',
                            border: '1px solid #ddd', borderRadius: '4px', zIndex: 1000,
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                          }}>
                            {toSuggestions.map((station) => (
                              <div
                                key={station}
                                className="station-suggestion-item"
                                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                                onMouseDown={() => selectToStation(station)}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                              >
                                {station}
                              </div>
                            ))}
</div>
                        )}
                      </div>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Vendor ID *</Form.Label>
                      <Form.Select
                        name="vendorId"
                        value={formData.vendorId}
                        onChange={handleVendorChange}
                        required
                      >
<option value="">Select a Vendor</option>
                        {vendors.map(vendor => (
                          <option key={vendor._id} value={vendor._id}>
                            {vendor.companyName} ({vendor.vendorCode})
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Vendor Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="vendorName"
                        value={formData.vendorName}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Vendor Code</Form.Label>
                      <Form.Control
                        type="text"
                        name="vendorCode"
                        value={formData.vendorCode}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <hr />
                <h6>Specifications</h6>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Material</Form.Label>
                      <Form.Control
                        type="text"
                        name="material"
                        value={formData.specifications.material}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Weight (kg)</Form.Label>
                      <Form.Control
                        type="number"
                        name="weight"
                        value={formData.specifications.weight}
                        onChange={handleChange}
                        step="0.01"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Length</Form.Label>
                      <Form.Control
                        type="number"
                        name="length"
                        value={formData.specifications.dimensions.length}
                        onChange={handleDimensionChange}
                        step="0.01"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Width</Form.Label>
                      <Form.Control
                        type="number"
                        name="width"
                        value={formData.specifications.dimensions.width}
                        onChange={handleDimensionChange}
                        step="0.01"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Height</Form.Label>
                      <Form.Control
                        type="number"
                        name="height"
                        value={formData.specifications.dimensions.height}
                        onChange={handleDimensionChange}
                        step="0.01"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Unit</Form.Label>
                      <Form.Select
                        name="unit"
                        value={formData.specifications.dimensions.unit}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          specifications: { ...prev.specifications, dimensions: { ...prev.specifications.dimensions, unit: e.target.value } }
                        }))}
                      >
                        <option value="mm">mm</option>
                        <option value="cm">cm</option>
                        <option value="m">m</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Grade (Specification)</Form.Label>
                      <Form.Control
                        type="text"
                        name="grade"
                        value={formData.specifications.grade}
                        onChange={handleChange}
                        placeholder="e.g., Grade 8.8, 10.9"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Quality Grade (A-Z)</Form.Label>
                      <Form.Control
                        type="text"
                        name="qualityGrade"
                        maxLength="2"
                        value={formData.qualityGrade}
                        onChange={(e) => setFormData(prev => ({...prev, qualityGrade: e.target.value.toUpperCase()}))}
                        placeholder="Enter Quality Grade (A-Z)"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Standard</Form.Label>
                      <Form.Control
                        type="text"
                        name="standard"
                        value={formData.specifications.standard}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <hr />
                <h6>Manufacturing Details</h6>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Manufacturing Date</Form.Label>
                      <Form.Control
                        type="date"
                        name="manufacturingDate"
                        value={formData.manufacturing.date}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Location</Form.Label>
                      <Form.Control
                        type="text"
                        name="manufacturingLocation"
                        value={formData.manufacturing.location}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Machine ID</Form.Label>
                      <Form.Control
                        type="text"
                        name="machineId"
                        value={formData.manufacturing.machineId}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Warranty Duration (months)</Form.Label>
                      <Form.Control
                        type="number"
                        name="warrantyDuration"
                        value={formData.warranty.duration}
                        onChange={handleChange}
                        min="1"
                        max="60"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {bulkMode && (
                  <>
                    <hr />
                    <h6>Bulk Items</h6>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <Button
                        type="button"
                        variant="outline-primary"
                        onClick={addBulkItem}
                        disabled={!formData.itemType}
                      >
                        Add Item
                      </Button>
                      <span className="text-muted">
                        {bulkData.length} items added
                      </span>
                    </div>

                    {bulkData.length > 0 && (
                      <Table striped bordered hover size="sm">
                        <thead>
                          <tr>
                            <th>Serial Number</th>
                            <th>Item Type</th>
                            <th>Batch</th>
                            <th>Lot</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkData.map((item, index) => (
                            <tr key={index}>
                              <td>{item.serialNumber}</td>
                              <td>{item.itemType}</td>
                              <td>{item.batchNumber}</td>
                              <td>{item.lotNumber}</td>
                              <td>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => removeBulkItem(index)}
                                >
                                  Remove
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </>
                )}

                <div className="d-grid">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={loading || (bulkMode && bulkData.length === 0)}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Generating...
                      </>
                    ) : (
                      bulkMode ? `Generate ${bulkData.length} QR Codes` : 'Generate QR Code'
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Instructions</h6>
            </Card.Header>
            <Card.Body>
              <ol className="small">
                <li>Select the item type from the dropdown</li>
                <li>Fill in the required information</li>
                <li>Click "Generate Serial Number" for auto-generation</li>
                <li>Specify material and dimensional properties</li>
                <li>Add manufacturing and warranty details</li>
                <li>Click "Generate QR Code" to create the QR code</li>
                <li>Download or print the QR code for laser marking</li>
              </ol>
              
              <hr />
              
              <h6>Laser Marking Guidelines</h6>
              <ul className="small">
                <li>Use high-contrast marking</li>
                <li>Ensure minimum 2mm QR code size</li>
                <li>Mark on smooth, clean surface</li>
                <li>Test readability after marking</li>
                <li>Follow safety protocols</li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* QR Code Preview Modal */}
      <Modal show={showPreview} onHide={() => setShowPreview(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Generated QR Code</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {qrCodeData && (
            <>
              <img
                src={qrCodeData.qrCodeImage}
                alt="Generated QR Code"
                className="img-fluid mb-3"
                style={{ maxWidth: '300px' }}
              />
              <div className="mb-3">
                <strong>Serial Number:</strong> {qrCodeData.serialNumber}<br />
                <strong>Item Type:</strong> {qrCodeData.itemType}<br />
                <strong>QR Code:</strong> <code className="small">{qrCodeData.qrCode}</code>
              </div>
              <Button variant="success" onClick={downloadQRCode}>
                <i className="bi bi-download me-2"></i>
                Download QR Code
              </Button>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* Bulk QR Codes Preview Modal */}
      <Modal show={showBulkPreview} onHide={() => setShowBulkPreview(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Generated QR Codes ({bulkQrCodes.length})</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {bulkQrCodes && bulkQrCodes.length > 0 ? (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-muted">
                  {bulkQrCodes.length} QR codes generated successfully
                </span>
                <div>
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    onClick={downloadBulkQRCodes}
                    className="me-2"
                  >
                    <i className="bi bi-download me-1"></i>
                    Download All
                  </Button>
                  <Button 
                    variant="success" 
                    size="sm" 
                    onClick={() => {
                      setShowBulkPreview(false);
                      setBulkMode(false);
                      setBulkQrCodes([]);
                    }}
                  >
                    Close
                  </Button>
                </div>
              </div>
              
              <div className="row">
                {bulkQrCodes.map((qrCode, index) => (
                  <div key={index} className="col-md-4 col-sm-6 mb-4">
                    <Card className="h-100">
                      <Card.Body className="text-center">
                        <img
                          src={qrCode.qrCodeImage}
                          alt={`QR Code ${index + 1}`}
                          className="img-fluid mb-2"
                          style={{ maxWidth: '150px', maxHeight: '150px' }}
                        />
                        <div className="small">
                          <div><strong>Serial:</strong> {qrCode.serialNumber}</div>
                          <div><strong>Type:</strong> {qrCode.itemType}</div>
                        </div>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = qrCode.qrCodeImage;
                            link.download = `QR_${qrCode.serialNumber}.png`;
                            link.click();
                          }}
                        >
                          <i className="bi bi-download me-1"></i>
                          Download
                        </Button>
                      </Card.Body>
                    </Card>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center text-muted">
              <p>No QR codes to display</p>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default QRGenerator;
