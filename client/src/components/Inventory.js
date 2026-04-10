import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Badge, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import axios from 'axios';

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [filters, setFilters] = useState({
    itemType: '',
    status: '',
    vendor: '',
    search: ''
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    byType: {},
    byStatus: {},
    byVendor: {}
  });
  const [itemForm, setItemForm] = useState({
    qrCode: '',
    serialNumber: '',
    itemType: 'elastic_rail_clip',
    itemSubType: '',
    batchNumber: '',
    lotNumber: '',
    vendorId: '',
    vendorName: '',
    manufacturingDate: '',
    manufacturingLocation: '',
    status: 'in_progress',
    currentLocation: '',
    material: '',
    grade: '',
    standard: '',
    weight: '',
    dimensionsLength: '',
    dimensionsWidth: '',
    dimensionsHeight: '',
    warrantyEndDate: '',
    qualityGrade: ''
  });
  const [vendors, setVendors] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

useEffect(() => {
    fetchInventory();
    fetchVendors();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/vendors', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setVendors(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = () => {
    fetchInventory();
  };

  const clearFilters = () => {
    setFilters({
      itemType: '',
      status: '',
      vendor: '',
      search: ''
    });
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/inventory', {
        params: {
          page: 1,
          limit: 100,
          ...filters
        }
      });

      if (response.data.success) {
        setInventory(response.data.data.trackFittings);
        setStats(response.data.data.stats || {
          total: response.data.data.pagination.total,
          byType: {},
          byStatus: {},
          byVendor: {}
        });
      } else {
        toast.error('Failed to fetch inventory data');
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to fetch inventory data');
      
      // Fallback to mock data for development
      const mockInventory = [
        {
          id: '1',
          serialNumber: 'RF001234',
          itemType: 'elastic_rail_clip',
          itemSubType: 'Standard',
          status: 'in_service',
          vendorName: 'ABC Manufacturing',
          currentLocation: 'Track Section A',
          qualityGrade: 'A',
          manufacturingDate: '2023-01-15',
          warrantyEndDate: '2024-01-15'
        },
        {
          id: '2',
          serialNumber: 'RF001235',
          itemType: 'rail_pad',
          itemSubType: 'Heavy Duty',
          status: 'installed',
          vendorName: 'XYZ Industries',
          location: { current: 'Track Section B' },
          quality: { qualityGrade: 'B' },
          manufacturing: { date: '2023-02-20' },
          warranty: { endDate: '2024-02-20' }
        },
        {
          id: '3',
          serialNumber: 'RF001236',
          itemType: 'liner',
          itemSubType: 'Standard',
          status: 'maintenance',
          vendor: { vendorName: 'DEF Corp' },
          location: { current: 'Track Section C' },
          quality: { qualityGrade: 'C' },
          manufacturing: { date: '2023-03-10' },
          warranty: { endDate: '2024-03-10' }
        }
      ];

      setInventory(mockInventory);
      calculateStats(mockInventory);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const stats = {
      total: data.length,
      byType: {},
      byStatus: {},
      byVendor: {}
    };

    data.forEach(item => {
      // Count by type
      stats.byType[item.itemType] = (stats.byType[item.itemType] || 0) + 1;
      
      // Count by status
      stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;
      
      // Count by vendor
      const vendor = item.vendor?.vendorName || 'Unknown';
      stats.byVendor[vendor] = (stats.byVendor[vendor] || 0) + 1;
    });

    setStats(stats);
  };

  const filteredInventory = inventory.filter(item => {
    return (
      (!filters.itemType || item.itemType === filters.itemType) &&
      (!filters.status || item.status === filters.status) &&
      (!filters.vendor || item.vendor?.vendorName?.toLowerCase().includes(filters.vendor.toLowerCase())) &&
      (!filters.search || 
        item.serialNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.itemType.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.location?.current?.toLowerCase().includes(filters.search.toLowerCase())
      )
    );
  });

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

  const formatItemType = (type) => {
    if (!type) return 'Unknown';
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setShowDetails(true);
  };

const handleAddItem = () => {
    setItemForm({
      qrCode: '',
      serialNumber: '',
      itemType: 'elastic_rail_clip',
      itemSubType: '',
      batchNumber: '',
      lotNumber: '',
      vendorId: '',
      vendorName: '',
      manufacturingDate: new Date().toISOString().split('T')[0],
      manufacturingLocation: '',
      status: 'manufactured',
      currentLocation: '',
      material: '',
      grade: '',
      standard: '',
      weight: '',
      dimensionsLength: '',
      dimensionsWidth: '',
      dimensionsHeight: '',
      warrantyEndDate: '',
      qualityGrade: ''
    });
    setShowAddModal(true);
  };

  const handleSaveItem = async () => {
    try {
      const selectedVendor = vendors.find(v => v._id === itemForm.vendorId);
      const payload = {
        ...itemForm,
        vendorName: selectedVendor ? selectedVendor.companyName : itemForm.vendorName,
        vendorCode: selectedVendor ? selectedVendor.vendorCode : '',
        dimensions: {
          length: itemForm.dimensionsLength,
          width: itemForm.dimensionsWidth,
          height: itemForm.dimensionsHeight
        },
        weight: itemForm.weight ? parseFloat(itemForm.weight) : 0,
        manufacturingDate: itemForm.manufacturingDate ? new Date(itemForm.manufacturingDate) : new Date(),
        warrantyEndDate: itemForm.warrantyEndDate ? new Date(itemForm.warrantyEndDate) : null
      };
      
      delete payload.dimensionsLength;
      delete payload.dimensionsWidth;
      delete payload.dimensionsHeight;

      const response = await axios.post('/api/inventory', payload);
      
      if (response.data.success) {
        toast.success('Item added successfully');
        setShowAddModal(false);
        fetchInventory();
      } else {
        toast.error(response.data.message || 'Failed to add item');
      }
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error(error.response?.data?.message || 'Failed to add item');
    }
  };

  const handleEditClick = (item) => {
    setSelectedItem(item);
    setItemForm({
      qrCode: item.qrCode || '',
      serialNumber: item.serialNumber || '',
      itemType: item.itemType || 'elastic_rail_clip',
      itemSubType: item.itemSubType || '',
      batchNumber: item.batchNumber || '',
      lotNumber: item.lotNumber || '',
      vendorId: item.vendorId || '',
      vendorName: item.vendorName || '',
      manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate).toISOString().split('T')[0] : '',
      manufacturingLocation: item.manufacturingLocation || '',
      status: item.status || 'manufactured',
      currentLocation: item.currentLocation || '',
      material: item.material || '',
      grade: item.grade || '',
      standard: item.standard || '',
      weight: item.weight || '',
      dimensionsLength: item.dimensions?.length || '',
      dimensionsWidth: item.dimensions?.width || '',
      dimensionsHeight: item.dimensions?.height || '',
      warrantyEndDate: item.warrantyEndDate ? new Date(item.warrantyEndDate).toISOString().split('T')[0] : '',
      qualityGrade: item.qualityGrade || ''
    });
    setShowEditModal(true);
    setShowDetails(false);
  };

  const handleUpdateItem = async () => {
    try {
      const selectedVendor = vendors.find(v => v._id === itemForm.vendorId);
      const payload = {
        ...itemForm,
        vendorName: selectedVendor ? selectedVendor.companyName : itemForm.vendorName,
        vendorCode: selectedVendor ? selectedVendor.vendorCode : '',
        dimensions: {
          length: itemForm.dimensionsLength,
          width: itemForm.dimensionsWidth,
          height: itemForm.dimensionsHeight
        },
        weight: itemForm.weight ? parseFloat(itemForm.weight) : 0,
        manufacturingDate: itemForm.manufacturingDate ? new Date(itemForm.manufacturingDate) : new Date(),
        warrantyEndDate: itemForm.warrantyEndDate ? new Date(itemForm.warrantyEndDate) : null
      };
      
      delete payload.dimensionsLength;
      delete payload.dimensionsWidth;
      delete payload.dimensionsHeight;

      const response = await axios.put(`/api/inventory/${selectedItem._id || selectedItem.id}`, payload);
      
      if (response.data.success) {
        toast.success('Item updated successfully');
        setShowEditModal(false);
        fetchInventory();
      } else {
        toast.error(response.data.message || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error(error.response?.data?.message || 'Failed to update item');
    }
  };

  const handleDeleteItem = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete?._id && !itemToDelete?.id) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/inventory/${itemToDelete._id || itemToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Item deleted successfully');
      fetchInventory();
    } catch (error) {
      console.error('Delete item error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete item');
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
          <p className="mt-3">Loading inventory...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0">Inventory Management</h2>
          <p className="text-muted">Track and manage railway track fittings inventory</p>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-primary text-white">
            <Card.Body className="text-center">
              <h3>{stats.total}</h3>
              <p className="mb-0">Total Items</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-success text-white">
            <Card.Body className="text-center">
              <h3>{stats.byStatus.in_service || 0}</h3>
              <p className="mb-0">In Service</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-warning text-white">
          <Card.Body className="text-center">
              <h3>{stats.byStatus.maintenance || 0}</h3>
              <p className="mb-0">Maintenance</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-info text-white">
            <Card.Body className="text-center">
              <h3>{Object.keys(stats.byVendor).length}</h3>
              <p className="mb-0">Vendors</p>
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
                <Form.Label>Item Type</Form.Label>
                <Form.Select
                  value={filters.itemType}
                  onChange={(e) => setFilters({...filters, itemType: e.target.value})}
                >
                  <option value="">All Types</option>
                  <option value="elastic_rail_clip">Elastic Rail Clip</option>
                  <option value="rail_pad">Rail Pad</option>
                  <option value="liner">Liner</option>
                  <option value="sleeper">Sleeper</option>
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
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="missed">Missed</option>
                  <option value="manufactured">Manufactured</option>
                  <option value="inspected">Inspected</option>
                  <option value="supplied">Supplied</option>
                  <option value="installed">Installed</option>
                  <option value="in_service">In Service</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="replaced">Replaced</option>
                  <option value="scrapped">Scrapped</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Vendor</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Search vendor..."
                  value={filters.vendor}
                  onChange={(e) => setFilters({...filters, vendor: e.target.value})}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Search items..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Inventory Table */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-light d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Track Fittings ({filteredInventory.length})</h5>
          <Button variant="primary" size="sm" onClick={handleAddItem}>
            <i className="bi bi-plus me-1"></i>
            Add Item
          </Button>
        </Card.Header>
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Serial Number</th>
                <th>Item Type</th>
                <th>Status</th>
                <th>Vendor</th>
                <th>Location</th>
                <th>Quality</th>
                <th>Manufacturing Date</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.serialNumber}</strong>
                    <br />
                    <small className="text-muted">{item.itemSubType}</small>
                  </td>
                  <td>{formatItemType(item.itemType)}</td>
                  <td>
                    <Badge bg={getStatusColor(item.status || 'in_progress')}>
                      {(item.status || 'in_progress').replace('_', ' ').toUpperCase()}
                    </Badge>
                  </td>
                  <td>{item.vendorName || 'Unknown'}</td>
                  <td>{item.currentLocation || 'Unknown'}</td>
                  <td>
                    <Badge bg={getQualityColor(item.qualityGrade || item.quality?.qualityGrade)}>
                      {item.qualityGrade || item.quality?.qualityGrade || 'N/A'}
                    </Badge>
                  </td>
                  <td>{item.manufacturingDate ? new Date(item.manufacturingDate).toLocaleDateString() : 'N/A'}</td>
                  <td className="text-center">
                    <div className="d-flex gap-2 justify-content-center">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleViewDetails(item)}
                        title="View Details"
                      >
                        <i className="bi bi-eye"></i>
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteItem(item)}
                        title="Delete Item"
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          
          {filteredInventory.length === 0 && (
            <div className="text-center py-5">
              <i className="bi bi-box text-muted" style={{ fontSize: '3rem' }}></i>
              <p className="text-muted mt-3">No items found matching your criteria</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Item Details Modal */}
      <Modal show={showDetails} onHide={() => setShowDetails(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Item Details - {selectedItem?.serialNumber}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <h6>Basic Information</h6>
                  <p><strong>Serial Number:</strong> {selectedItem.serialNumber}</p>
                  <p><strong>Item Type:</strong> {formatItemType(selectedItem.itemType)}</p>
                  <p><strong>Item Sub Type:</strong> {selectedItem.itemSubType}</p>
                  <p><strong>Status:</strong> 
                    <Badge bg={getStatusColor(selectedItem.status)} className="ms-2">
                      {(selectedItem.status || 'manufactured').replace('_', ' ').toUpperCase()}
                    </Badge>
                  </p>
                </Col>
<Col md={6}>
                  <h6>Vendor & Location</h6>
                  <p><strong>Vendor:</strong> {selectedItem.vendorName || 'Unknown'}</p>
                  <p><strong>Location:</strong> {selectedItem.currentLocation || 'Unknown'}</p>
                  <p><strong>Quality Grade:</strong> 
                    <Badge bg={getQualityColor(selectedItem.qualityGrade || selectedItem.quality?.qualityGrade)} className="ms-2">
                      {selectedItem.qualityGrade || selectedItem.quality?.qualityGrade || 'N/A'}
                    </Badge>
                  </p>
                </Col>
              </Row>
              
              <Row>
                <Col>
                  <h6>Manufacturing Details</h6>
                  <p><strong>Manufacturing Date:</strong> {selectedItem.manufacturingDate ? new Date(selectedItem.manufacturingDate).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>Warranty End Date:</strong> {selectedItem.warrantyEndDate ? new Date(selectedItem.warrantyEndDate).toLocaleDateString() : 'N/A'}</p>
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetails(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={() => handleEditClick(selectedItem)}>
            Edit Item
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Item Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add New Item</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Serial Number *</Form.Label>
                  <Form.Control
                    type="text"
                    value={itemForm.serialNumber}
                    onChange={(e) => setItemForm({...itemForm, serialNumber: e.target.value})}
                    placeholder="Enter serial number"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>QR Code *</Form.Label>
                  <Form.Control
                    type="text"
                    value={itemForm.qrCode}
                    onChange={(e) => setItemForm({...itemForm, qrCode: e.target.value})}
                    placeholder="Enter QR code"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Item Type</Form.Label>
                  <Form.Select
                    value={itemForm.itemType}
                    onChange={(e) => setItemForm({...itemForm, itemType: e.target.value})}
                  >
                    <option value="elastic_rail_clip">Elastic Rail Clip</option>
                    <option value="rail_pad">Rail Pad</option>
                    <option value="liner">Liner</option>
                    <option value="sleeper">Sleeper</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Item Sub Type</Form.Label>
                  <Form.Control
                    type="text"
                    value={itemForm.itemSubType}
                    onChange={(e) => setItemForm({...itemForm, itemSubType: e.target.value})}
                    placeholder="Enter sub type"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Batch Number</Form.Label>
                  <Form.Control
                    type="text"
                    value={itemForm.batchNumber}
                    onChange={(e) => setItemForm({...itemForm, batchNumber: e.target.value})}
                    placeholder="Enter batch number"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Lot Number</Form.Label>
                  <Form.Control
                    type="text"
                    value={itemForm.lotNumber}
                    onChange={(e) => setItemForm({...itemForm, lotNumber: e.target.value})}
                    placeholder="Enter lot number"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Vendor</Form.Label>
                  <Form.Select
                    value={itemForm.vendorId}
                    onChange={(e) => setItemForm({...itemForm, vendorId: e.target.value})}
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map(vendor => (
                      <option key={vendor._id} value={vendor._id}>
                        {vendor.companyName} ({vendor.vendorCode})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Manufacturing Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={itemForm.manufacturingDate}
                    onChange={(e) => setItemForm({...itemForm, manufacturingDate: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Warranty End Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={itemForm.warrantyEndDate}
                    onChange={(e) => setItemForm({...itemForm, warrantyEndDate: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Quality Grade</Form.Label>
                  <Form.Control
                    type="text"
                    maxLength="2"
                    value={itemForm.qualityGrade}
                    onChange={(e) => setItemForm({...itemForm, qualityGrade: e.target.value.toUpperCase()})}
                    placeholder="Enter Grade (A-Z)"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={itemForm.status}
                    onChange={(e) => setItemForm({...itemForm, status: e.target.value})}
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="missed">Missed</option>
                    <option value="manufactured">Manufactured</option>
                    <option value="inspected">Inspected</option>
                    <option value="supplied">Supplied</option>
                    <option value="installed">Installed</option>
                    <option value="in_service">In Service</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="replaced">Replaced</option>
                    <option value="scrapped">Scrapped</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Current Location</Form.Label>
                  <Form.Control
                    type="text"
                    value={itemForm.currentLocation}
                    onChange={(e) => setItemForm({...itemForm, currentLocation: e.target.value})}
                    placeholder="Enter location"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Material</Form.Label>
                  <Form.Control
                    type="text"
                    value={itemForm.material}
                    onChange={(e) => setItemForm({...itemForm, material: e.target.value})}
                    placeholder="Enter material"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Grade</Form.Label>
                  <Form.Control
                    type="text"
                    value={itemForm.grade}
                    onChange={(e) => setItemForm({...itemForm, grade: e.target.value})}
                    placeholder="Enter grade"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveItem}>
            Add Item
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Item Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Item - {selectedItem?.serialNumber}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Serial Number *</Form.Label>
                  <Form.Control
                    type="text"
                    value={itemForm.serialNumber}
                    onChange={(e) => setItemForm({...itemForm, serialNumber: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>QR Code *</Form.Label>
                  <Form.Control
                    type="text"
                    value={itemForm.qrCode}
                    onChange={(e) => setItemForm({...itemForm, qrCode: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Item Type</Form.Label>
                  <Form.Select
                    value={itemForm.itemType}
                    onChange={(e) => setItemForm({...itemForm, itemType: e.target.value})}
                  >
                    <option value="elastic_rail_clip">Elastic Rail Clip</option>
                    <option value="rail_pad">Rail Pad</option>
                    <option value="liner">Liner</option>
                    <option value="sleeper">Sleeper</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Item Sub Type</Form.Label>
                  <Form.Control
                    type="text"
                    value={itemForm.itemSubType}
                    onChange={(e) => setItemForm({...itemForm, itemSubType: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Batch Number</Form.Label>
                  <Form.Control
                    type="text"
                    value={itemForm.batchNumber}
                    onChange={(e) => setItemForm({...itemForm, batchNumber: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Lot Number</Form.Label>
                  <Form.Control
                    type="text"
                    value={itemForm.lotNumber}
                    onChange={(e) => setItemForm({...itemForm, lotNumber: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Vendor</Form.Label>
                  <Form.Select
                    value={itemForm.vendorId}
                    onChange={(e) => setItemForm({...itemForm, vendorId: e.target.value})}
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map(vendor => (
                      <option key={vendor._id} value={vendor._id}>
                        {vendor.companyName} ({vendor.vendorCode})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Manufacturing Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={itemForm.manufacturingDate}
                    onChange={(e) => setItemForm({...itemForm, manufacturingDate: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Warranty End Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={itemForm.warrantyEndDate}
                    onChange={(e) => setItemForm({...itemForm, warrantyEndDate: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Quality Grade</Form.Label>
                  <Form.Control
                    type="text"
                    maxLength="2"
                    value={itemForm.qualityGrade}
                    onChange={(e) => setItemForm({...itemForm, qualityGrade: e.target.value.toUpperCase()})}
                    placeholder="Enter Grade (A-Z)"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={itemForm.status}
                    onChange={(e) => setItemForm({...itemForm, status: e.target.value})}
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="missed">Missed</option>
                    <option value="manufactured">Manufactured</option>
                    <option value="inspected">Inspected</option>
                    <option value="supplied">Supplied</option>
                    <option value="installed">Installed</option>
                    <option value="in_service">In Service</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="replaced">Replaced</option>
                    <option value="scrapped">Scrapped</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Current Location</Form.Label>
                  <Form.Control
                    type="text"
                    value={itemForm.currentLocation}
                    onChange={(e) => setItemForm({...itemForm, currentLocation: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Material</Form.Label>
                  <Form.Control
                    type="text"
                    value={itemForm.material}
                    onChange={(e) => setItemForm({...itemForm, material: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Grade</Form.Label>
                  <Form.Control
                    type="text"
                    value={itemForm.grade}
                    onChange={(e) => setItemForm({...itemForm, grade: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpdateItem}>
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
          <Button variant="danger" onClick={confirmDeleteItem}>
            <i className="bi bi-trash me-2"></i>Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Inventory;
