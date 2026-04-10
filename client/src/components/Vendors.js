import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Badge, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Vendors = () => {
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState(null);
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    specialization: ''
  });

  const [vendorForm, setVendorForm] = useState({
    vendorCode: '',
    companyName: '',
    contactPerson: { name: '', designation: '', email: '', phone: '' },
    address: { street: '', city: '', state: '', pincode: '', country: 'India' },
    contact: { email: '', phone: '', website: '', fax: '' },
    businessDetails: { gstNumber: '', panNumber: '', registrationNumber: '', businessType: 'manufacturer' },
    specializations: [],
    status: 'active',
    qualityRating: 0,
    performance: { totalSupplies: 0, onTimeDelivery: 0, qualityComplaints: 0 }
  });

  useEffect(() => {
    fetchVendors();
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = () => {
    fetchVendors();
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      specialization: ''
    });
  };

  const normalizeVendorFromApi = (vendor) => {
    if (!vendor) return null;

    return {
      id: vendor._id || vendor.id,
      vendorCode: vendor.vendorCode || '',
      companyName: vendor.companyName || '',
      contactPerson: {
        name: vendor.contactPerson?.name || vendor.contactPersonName || '',
        designation: vendor.contactPerson?.designation || vendor.contactPersonDesignation || '',
        email: vendor.contactPerson?.email || vendor.contactPersonEmail || '',
        phone: vendor.contactPerson?.phone || vendor.contactPersonPhone || ''
      },
      address: vendor.address || {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      },
      contact: vendor.contact || {
        email: vendor.contactEmail || '',
        phone: vendor.contactPhone || '',
        website: vendor.contactWebsite || '',
        fax: ''
      },
      businessDetails: vendor.businessDetails || {
        gstNumber: vendor.gstNumber || '',
        panNumber: vendor.panNumber || '',
        registrationNumber: vendor.registrationNumber || '',
        incorporationDate: vendor.incorporationDate || null,
        businessType: vendor.businessType || 'manufacturer'
      },
      specializations: Array.isArray(vendor.specializations)
        ? vendor.specializations
        : (vendor.specializations
          ? [vendor.specializations]
          : []),
      status: vendor.status || 'active',
      performance: vendor.performance || { totalSupplies: 0, onTimeDelivery: 0, qualityComplaints: 0, averageRating: 0 },
      qualityRating: vendor.qualityRating || 0,
      notes: vendor.notes || ''
    };
  };

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/vendors', {
        params: {
          ...filters
        }
      });

      if (response.data.success) {
        const normalized = (response.data.data || []).map(normalizeVendorFromApi);
        setVendors(normalized);
      } else {
        toast.error('Failed to fetch vendors data');
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to fetch vendors data');
      
      // Fallback to mock data for development
      const mockVendors = [
        {
          id: '1',
          vendorCode: 'V001',
          companyName: 'ABC Manufacturing Ltd.',
          contactPerson: { name: 'John Smith', designation: 'Sales Manager', email: 'john@abc.com', phone: '+91-9876543210' },
          address: { street: '123 Industrial Area', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', country: 'India' },
          contact: { email: 'info@abc.com', phone: '+91-22-12345678', website: 'www.abc.com' },
          businessDetails: { gstNumber: '27ABCDE1234F1Z5', panNumber: 'ABCDE1234F', businessType: 'manufacturer' },
          specializations: ['elastic_rail_clips', 'rail_pads'],
          qualityRating: 4.5,
          performance: { totalSupplies: 1500, onTimeDelivery: 95, qualityComplaints: 2, averageRating: 4.5 },
          status: 'active'
        },
        {
          id: '2',
          vendorCode: 'V002',
          companyName: 'XYZ Industries Pvt. Ltd.',
          contactPerson: { name: 'Jane Doe', designation: 'Operations Head', email: 'jane@xyz.com', phone: '+91-9876543211' },
          address: { street: '456 Tech Park', city: 'Bangalore', state: 'Karnataka', pincode: '560001', country: 'India' },
          contact: { email: 'info@xyz.com', phone: '+91-80-87654321', website: 'www.xyz.com' },
          businessDetails: { gstNumber: '29XYZAB5678G2H6', panNumber: 'XYZAB5678G', businessType: 'supplier' },
          specializations: ['liners', 'sleepers'],
          qualityRating: 4.2,
          performance: { totalSupplies: 800, onTimeDelivery: 88, qualityComplaints: 5, averageRating: 4.2 },
          status: 'active'
        },
        {
          id: '3',
          vendorCode: 'V003',
          companyName: 'DEF Corporation',
          contactPerson: { name: 'Mike Johnson', designation: 'Director', email: 'mike@def.com', phone: '+91-9876543212' },
          address: { street: '789 Business Center', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', country: 'India' },
          contact: { email: 'info@def.com', phone: '+91-44-76543210', website: 'www.def.com' },
          businessDetails: { gstNumber: '33DEFGH9012I3J7', panNumber: 'DEFGH9012I', businessType: 'contractor' },
          specializations: ['fasteners', 'other'],
          qualityRating: 3.8,
          performance: { totalSupplies: 300, onTimeDelivery: 75, qualityComplaints: 8, averageRating: 3.8 },
          status: 'inactive'
        }
      ];

      setVendors(mockVendors);
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    return (
      (!filters.search || 
        (vendor.companyName || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (vendor.vendorCode || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (vendor.contactPerson?.name || '').toLowerCase().includes(filters.search.toLowerCase())
      ) &&
      (!filters.status || vendor.status === filters.status) &&
      (!filters.specialization || (vendor.specializations || []).includes(filters.specialization))
    );
  });

  const getStatusColor = (status) => {
    const colors = {
      'active': 'success',
      'inactive': 'secondary',
      'suspended': 'warning',
      'blacklisted': 'danger'
    };
    return colors[status] || 'secondary';
  };

  const getBusinessTypeColor = (type) => {
    const colors = {
      manufacturer: 'primary',
      supplier: 'info',
      contractor: 'warning',
      service_provider: 'success',
      unknown: 'secondary'
    };
    return colors[type] || 'secondary';
  };

  const formatBusinessType = (type) => {
    if (!type) return 'N/A';
    const labels = {
      manufacturer: 'Manufacturer',
      supplier: 'Supplier',
      contractor: 'Contractor',
      service_provider: 'Service Provider',
      unknown: 'Unknown'
    };
    return labels[type] || (type.charAt(0).toUpperCase() + type.slice(1));
  };

  const toggleSpecialization = (value) => {
    setVendorForm(prev => {
      const current = prev.specializations || [];
      const exists = current.includes(value);
      return {
        ...prev,
        specializations: exists
          ? current.filter(s => s !== value)
          : [...current, value]
      };
    });
  };

  const getRatingStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<i key={i} className="bi bi-star-fill text-warning"></i>);
    }
    
    if (hasHalfStar) {
      stars.push(<i key="half" className="bi bi-star-half text-warning"></i>);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<i key={`empty-${i}`} className="bi bi-star text-muted"></i>);
    }
    
    return stars;
  };

  const handleAddVendor = async (e) => {
    e.preventDefault();
    try {
      if (editingVendorId) {
        const response = await axios.put(`/api/vendors/${editingVendorId}`, vendorForm);
        if (!response.data?.success) {
          toast.error(response.data?.message || 'Failed to update vendor');
          return;
        }

        let vendorForState = response.data.data;

        const hasPerfChanges =
          (vendorForm.performance?.totalSupplies || 0) ||
          (vendorForm.performance?.onTimeDelivery || 0) ||
          (vendorForm.performance?.qualityComplaints || 0) ||
          (vendorForm.qualityRating || 0);

        if (hasPerfChanges) {
          const perfRes = await axios.put(`/api/vendors/${editingVendorId}/performance`, {
            totalSupplies: vendorForm.performance?.totalSupplies || 0,
            onTimeDelivery: vendorForm.performance?.onTimeDelivery || 0,
            qualityComplaints: vendorForm.performance?.qualityComplaints || 0,
            averageRating: vendorForm.qualityRating || 0
          });
          if (perfRes.data?.success) {
            vendorForState = perfRes.data.data;
          }
        }

        const updatedVendor = normalizeVendorFromApi(vendorForState);
        setVendors(prev =>
          prev.map(v => (v.id === editingVendorId ? updatedVendor : v))
        );
        toast.success('Vendor updated successfully!');
      } else {
        const response = await axios.post('/api/vendors', vendorForm);
        if (!response.data?.success) {
          toast.error(response.data?.message || 'Failed to add vendor');
          return;
        }

        let createdVendor = response.data.data;

        const hasPerfChanges =
          (vendorForm.performance?.totalSupplies || 0) ||
          (vendorForm.performance?.onTimeDelivery || 0) ||
          (vendorForm.performance?.qualityComplaints || 0) ||
          (vendorForm.qualityRating || 0);

        if (hasPerfChanges && (createdVendor?._id || createdVendor?.id)) {
          const perfRes = await axios.put(`/api/vendors/${createdVendor._id || createdVendor.id}/performance`, {
            totalSupplies: vendorForm.performance?.totalSupplies || 0,
            onTimeDelivery: vendorForm.performance?.onTimeDelivery || 0,
            qualityComplaints: vendorForm.performance?.qualityComplaints || 0,
            averageRating: vendorForm.qualityRating || 0
          });
          if (perfRes.data?.success) {
            createdVendor = perfRes.data.data;
          }
        }

        const newVendor = normalizeVendorFromApi(createdVendor);
        setVendors(prev => [newVendor, ...prev]);
        toast.success('Vendor added successfully!');
      }

      setShowAddModal(false);
      setEditingVendorId(null);
      setVendorForm({
        vendorCode: '',
        companyName: '',
        contactPerson: { name: '', designation: '', email: '', phone: '' },
        address: { street: '', city: '', state: '', pincode: '', country: 'India' },
        contact: { email: '', phone: '', website: '', fax: '' },
        businessDetails: { gstNumber: '', panNumber: '', registrationNumber: '', businessType: 'manufacturer' },
        specializations: [],
        status: 'active',
        qualityRating: 0,
        performance: { totalSupplies: 0, onTimeDelivery: 0, qualityComplaints: 0 }
      });
    } catch (error) {
      console.error('Save vendor error:', error);
      toast.error(error.response?.data?.message || 'Failed to save vendor');
    }
  };

  const handleViewDetails = (vendor) => {
    // Ensure businessDetails object exists to avoid runtime errors
    const safeVendor = {
      businessDetails: { businessType: 'unknown', ...(vendor.businessDetails || {}) },
      ...vendor
    };
    setSelectedVendor(safeVendor);
    setShowDetails(true);
  };

  const handleDeleteVendor = (vendor) => {
    setVendorToDelete(vendor);
    setShowDeleteModal(true);
  };

  const confirmDeleteVendor = async () => {
    if (!vendorToDelete?.id) return;
    try {
      await axios.delete(`/api/vendors/${vendorToDelete.id}`);
      toast.success('Vendor deleted successfully');
      fetchVendors();
    } catch (error) {
      console.error('Delete vendor error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete vendor');
    } finally {
      setShowDeleteModal(false);
      setVendorToDelete(null);
    }
  };

  const handleEditVendorFromDetails = () => {
    if (!selectedVendor) return;

    const v = selectedVendor;
    setVendorForm({
      vendorCode: v.vendorCode || '',
      companyName: v.companyName || '',
      contactPerson: {
        name: v.contactPerson?.name || '',
        designation: v.contactPerson?.designation || '',
        email: v.contactPerson?.email || '',
        phone: v.contactPerson?.phone || ''
      },
      address: {
        street: v.address?.street || '',
        city: v.address?.city || '',
        state: v.address?.state || '',
        pincode: v.address?.pincode || '',
        country: v.address?.country || 'India'
      },
      contact: {
        email: v.contact?.email || '',
        phone: v.contact?.phone || '',
        website: v.contact?.website || '',
        fax: v.contact?.fax || ''
      },
      businessDetails: {
        gstNumber: v.businessDetails?.gstNumber || '',
        panNumber: v.businessDetails?.panNumber || '',
        registrationNumber: v.businessDetails?.registrationNumber || '',
        businessType: v.businessDetails?.businessType || 'manufacturer'
      },
      specializations: v.specializations || [],
      status: v.status || 'active',
      qualityRating: v.qualityRating || 0,
      performance: {
        totalSupplies: v.performance?.totalSupplies || 0,
        onTimeDelivery: v.performance?.onTimeDelivery || 0,
        qualityComplaints: v.performance?.qualityComplaints || 0
      }
    });

    setEditingVendorId(v.id);
    setShowDetails(false);
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading vendors...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0">Vendor Management</h2>
          <p className="text-muted">Manage track fitting vendors and suppliers</p>
        </Col>
        {user?.role === 'admin' && (
          <Col xs="auto">
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              <i className="bi bi-plus me-1"></i>
              Add Vendor
            </Button>
          </Col>
        )}
      </Row>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-primary text-white">
            <Card.Body className="text-center">
              <h3>{vendors.length}</h3>
              <p className="mb-0">Total Vendors</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-success text-white">
            <Card.Body className="text-center">
              <h3>{vendors.filter(v => v.status === 'active').length}</h3>
              <p className="mb-0">Active</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-warning text-white">
            <Card.Body className="text-center">
              <h3>{vendors.filter(v => v.status === 'suspended').length}</h3>
              <p className="mb-0">Suspended</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-info text-white">
            <Card.Body className="text-center">
              <h3>{vendors.reduce((sum, v) => sum + (v.performance?.totalSupplies || 0), 0)}</h3>
              <p className="mb-0">Total Supplies</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Search vendors..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="blacklisted">Blacklisted</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Specialization</Form.Label>
                <Form.Select
                  value={filters.specialization}
                  onChange={(e) => setFilters({...filters, specialization: e.target.value})}
                >
                  <option value="">All Specializations</option>
                  <option value="elastic_rail_clips">Elastic Rail Clips</option>
                  <option value="rail_pads">Rail Pads</option>
                  <option value="liners">Liners</option>
                  <option value="sleepers">Sleepers</option>
                  <option value="fasteners">Fasteners</option>
                  <option value="other">Other</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Vendors Table */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-light">
          <h5 className="mb-0">Vendors ({filteredVendors.length})</h5>
        </Card.Header>
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Vendor Code</th>
                <th>Company Name</th>
                <th>Contact Person</th>
                <th>Specializations</th>
                <th>Rating</th>
                <th>Performance</th>
                <th>Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.map((vendor) => (
                <tr key={vendor.id}>
                  <td>
                    <strong>{vendor.vendorCode || 'N/A'}</strong>
                  </td>
                  <td>
                    <div>
                      <strong>{vendor.companyName || 'N/A'}</strong>
                      <br />
                      <small className="text-muted">{formatBusinessType(vendor.businessDetails?.businessType)}</small>
                    </div>
                  </td>
                  <td>
                    <div>
                      <strong>{vendor.contactPerson?.name || 'N/A'}</strong>
                      <br />
                      <small className="text-muted">{vendor.contactPerson?.designation || 'N/A'}</small>
                      <br />
                      <small className="text-muted">{vendor.contactPerson?.email || 'N/A'}</small>
                      <br />
                      <small className="text-muted">{vendor.contactPerson?.phone || 'N/A'}</small>
                    </div>
                  </td>
                  <td>
                    <div>
                      {(vendor.specializations || []).map((spec, index) => (
                        <Badge key={index} bg="info" className="me-1 mb-1">
                          {spec.replace('_', ' ').toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div>
                      <div>{getRatingStars(vendor.qualityRating || 0)}</div>
                      <small className="text-muted">{vendor.qualityRating || 0}/5</small>
                    </div>
                  </td>
                  <td>
                    <div>
                      <small>Supplies: {vendor.performance?.totalSupplies || 0}</small>
                      <br />
                      <small>On-time: {vendor.performance?.onTimeDelivery || 0}%</small>
                      <br />
                      <small>Complaints: {vendor.performance?.qualityComplaints || 0}</small>
                    </div>
                  </td>
                  <td>
                    <Badge bg={getStatusColor(vendor.status || 'unknown')}>
                      {(vendor.status || 'unknown').toUpperCase()}
                    </Badge>
                  </td>
                  <td className="text-center">
                    <div className="d-flex gap-2 justify-content-center">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleViewDetails(vendor)}
                        title="View Details"
                      >
                        <i className="bi bi-eye"></i>
                      </Button>
                      {user?.role === 'admin' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteVendor(vendor)}
                          title="Delete Vendor"
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
          
          {filteredVendors.length === 0 && (
            <div className="text-center py-5">
              <i className="bi bi-building text-muted" style={{ fontSize: '3rem' }}></i>
              <p className="text-muted mt-3">No vendors found matching your criteria</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Add / Edit Vendor Modal */}
      <Modal
        show={showAddModal}
        onHide={() => {
          setShowAddModal(false);
          setEditingVendorId(null);
        }}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>{editingVendorId ? 'Edit Vendor' : 'Add New Vendor'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddVendor}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Vendor Code *</Form.Label>
                  <Form.Control
                    type="text"
                    value={vendorForm.vendorCode}
                    onChange={(e) => setVendorForm({...vendorForm, vendorCode: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Company Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={vendorForm.companyName}
                    onChange={(e) => setVendorForm({...vendorForm, companyName: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <h6>Contact Person</h6>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={vendorForm.contactPerson.name}
                    onChange={(e) => setVendorForm({
                      ...vendorForm,
                      contactPerson: {...vendorForm.contactPerson, name: e.target.value}
                    })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Designation</Form.Label>
                  <Form.Control
                    type="text"
                    value={vendorForm.contactPerson.designation}
                    onChange={(e) => setVendorForm({
                      ...vendorForm,
                      contactPerson: {...vendorForm.contactPerson, designation: e.target.value}
                    })}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={vendorForm.contactPerson.email}
                    onChange={(e) => setVendorForm({
                      ...vendorForm,
                      contactPerson: {...vendorForm.contactPerson, email: e.target.value}
                    })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone</Form.Label>
                  <Form.Control
                    type="tel"
                    value={vendorForm.contactPerson.phone}
                    onChange={(e) => setVendorForm({
                      ...vendorForm,
                      contactPerson: {...vendorForm.contactPerson, phone: e.target.value}
                    })}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <h6>Address</h6>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Street</Form.Label>
                  <Form.Control
                    type="text"
                    value={vendorForm.address.street}
                    onChange={(e) => setVendorForm({
                      ...vendorForm,
                      address: {...vendorForm.address, street: e.target.value}
                    })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>City</Form.Label>
                  <Form.Control
                    type="text"
                    value={vendorForm.address.city}
                    onChange={(e) => setVendorForm({
                      ...vendorForm,
                      address: {...vendorForm.address, city: e.target.value}
                    })}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>State</Form.Label>
                  <Form.Control
                    type="text"
                    value={vendorForm.address.state}
                    onChange={(e) => setVendorForm({
                      ...vendorForm,
                      address: {...vendorForm.address, state: e.target.value}
                    })}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Pincode</Form.Label>
                  <Form.Control
                    type="text"
                    value={vendorForm.address.pincode}
                    onChange={(e) => setVendorForm({
                      ...vendorForm,
                      address: {...vendorForm.address, pincode: e.target.value}
                    })}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Country</Form.Label>
                  <Form.Control
                    type="text"
                    value={vendorForm.address.country}
                    onChange={(e) => setVendorForm({
                      ...vendorForm,
                      address: {...vendorForm.address, country: e.target.value}
                    })}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <h6>Business Details</h6>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>GST Number</Form.Label>
                  <Form.Control
                    type="text"
                    value={vendorForm.businessDetails.gstNumber}
                    onChange={(e) => setVendorForm({
                      ...vendorForm,
                      businessDetails: {...vendorForm.businessDetails, gstNumber: e.target.value}
                    })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>PAN Number</Form.Label>
                  <Form.Control
                    type="text"
                    value={vendorForm.businessDetails.panNumber}
                    onChange={(e) => setVendorForm({
                      ...vendorForm,
                      businessDetails: {...vendorForm.businessDetails, panNumber: e.target.value}
                    })}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Business Type</Form.Label>
                  <Form.Select
                    value={vendorForm.businessDetails.businessType}
                    onChange={(e) => setVendorForm({
                      ...vendorForm,
                      businessDetails: {...vendorForm.businessDetails, businessType: e.target.value}
                    })}
                  >
                    <option value="manufacturer">Manufacturer</option>
                    <option value="supplier">Supplier</option>
                    <option value="contractor">Contractor</option>
                    <option value="service_provider">Service Provider</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={vendorForm.status}
                    onChange={(e) => setVendorForm({...vendorForm, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="blacklisted">Blacklisted</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <h6>Specializations</h6>
            <Row className="mb-3">
              <Col md={12}>
                <div className="d-flex flex-wrap gap-3">
                  <Form.Check
                    type="checkbox"
                    id="spec-elastic_rail_clips"
                    label="Elastic Rail Clips"
                    checked={vendorForm.specializations.includes('elastic_rail_clips')}
                    onChange={() => toggleSpecialization('elastic_rail_clips')}
                  />
                  <Form.Check
                    type="checkbox"
                    id="spec-rail_pads"
                    label="Rail Pads"
                    checked={vendorForm.specializations.includes('rail_pads')}
                    onChange={() => toggleSpecialization('rail_pads')}
                  />
                  <Form.Check
                    type="checkbox"
                    id="spec-liners"
                    label="Liners"
                    checked={vendorForm.specializations.includes('liners')}
                    onChange={() => toggleSpecialization('liners')}
                  />
                  <Form.Check
                    type="checkbox"
                    id="spec-sleepers"
                    label="Sleepers"
                    checked={vendorForm.specializations.includes('sleepers')}
                    onChange={() => toggleSpecialization('sleepers')}
                  />
                  <Form.Check
                    type="checkbox"
                    id="spec-fasteners"
                    label="Fasteners"
                    checked={vendorForm.specializations.includes('fasteners')}
                    onChange={() => toggleSpecialization('fasteners')}
                  />
                  <Form.Check
                    type="checkbox"
                    id="spec-other"
                    label="Other"
                    checked={vendorForm.specializations.includes('other')}
                    onChange={() => toggleSpecialization('other')}
                  />
                </div>
              </Col>
            </Row>

            <h6>Rating & Performance</h6>
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Quality Rating (0–5)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={vendorForm.qualityRating}
                    onChange={(e) => {
                      const value = Math.max(0, Math.min(5, parseFloat(e.target.value) || 0));
                      setVendorForm({...vendorForm, qualityRating: value});
                    }}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Total Supplies</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={vendorForm.performance.totalSupplies}
                    onChange={(e) => {
                      const value = Math.max(0, parseInt(e.target.value || '0', 10));
                      setVendorForm({
                        ...vendorForm,
                        performance: {...vendorForm.performance, totalSupplies: value}
                      });
                    }}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>On-time Delivery (%)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="100"
                    value={vendorForm.performance.onTimeDelivery}
                    onChange={(e) => {
                      const value = Math.max(0, Math.min(100, parseInt(e.target.value || '0', 10)));
                      setVendorForm({
                        ...vendorForm,
                        performance: {...vendorForm.performance, onTimeDelivery: value}
                      });
                    }}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-4">
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Quality Complaints</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={vendorForm.performance.qualityComplaints}
                    onChange={(e) => {
                      const value = Math.max(0, parseInt(e.target.value || '0', 10));
                      setVendorForm({
                        ...vendorForm,
                        performance: {...vendorForm.performance, qualityComplaints: value}
                      });
                    }}
                  />
                </Form.Group>
              </Col>
            </Row>

            <div className="d-grid">
              <Button type="submit" variant="primary">
                {editingVendorId ? 'Save Changes' : 'Add Vendor'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Vendor Details Modal */}
      <Modal show={showDetails} onHide={() => setShowDetails(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Vendor Details - {selectedVendor?.companyName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedVendor && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <h6>Basic Information</h6>
                  <p><strong>Vendor Code:</strong> {selectedVendor.vendorCode}</p>
                  <p><strong>Company Name:</strong> {selectedVendor.companyName}</p>
                  <p><strong>Business Type:</strong> 
                    <Badge bg={getBusinessTypeColor(selectedVendor.businessDetails?.businessType || 'unknown')} className="ms-2">
                      {formatBusinessType(selectedVendor.businessDetails?.businessType || 'unknown')}
                    </Badge>
                  </p>
                  <p><strong>Status:</strong> 
                    <Badge bg={getStatusColor(selectedVendor.status)} className="ms-2">
                      {selectedVendor.status.toUpperCase()}
                    </Badge>
                  </p>
                </Col>
                <Col md={6}>
                  <h6>Contact Information</h6>
                  <p><strong>Contact Person:</strong> {selectedVendor.contactPerson?.name || 'N/A'}</p>
                  <p><strong>Designation:</strong> {selectedVendor.contactPerson?.designation || 'N/A'}</p>
                  <p><strong>Email:</strong> {selectedVendor.contactPerson?.email || 'N/A'}</p>
                  <p><strong>Phone:</strong> {selectedVendor.contactPerson?.phone || 'N/A'}</p>
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col>
                  <h6>Address</h6>
                  <p>
                    {selectedVendor.address?.street || ''}
                    {selectedVendor.address?.city ? `, ${selectedVendor.address.city}` : ''}
                    {selectedVendor.address?.state ? `, ${selectedVendor.address.state}` : ''}
                    {selectedVendor.address?.pincode ? ` - ${selectedVendor.address.pincode}` : ''}
                    {selectedVendor.address?.country ? `, ${selectedVendor.address.country}` : ''}
                  </p>
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col>
                  <h6>Business Details</h6>
                  <p><strong>GST Number:</strong> {selectedVendor.businessDetails?.gstNumber || 'N/A'}</p>
                  <p><strong>PAN Number:</strong> {selectedVendor.businessDetails?.panNumber || 'N/A'}</p>
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col>
                  <h6>Specializations</h6>
                  {(selectedVendor.specializations || []).map((spec, index) => (
                    <Badge key={index} bg="info" className="me-1 mb-1">
                      {spec.replace('_', ' ').toUpperCase()}
                    </Badge>
                  ))}
                </Col>
              </Row>
              
              <Row>
                <Col>
                  <h6>Performance Metrics</h6>
                  <p><strong>Quality Rating:</strong> {getRatingStars(selectedVendor.qualityRating || 0)} ({selectedVendor.qualityRating || 0}/5)</p>
                  <p><strong>Total Supplies:</strong> {selectedVendor.performance?.totalSupplies || 0}</p>
                  <p><strong>On-time Delivery:</strong> {selectedVendor.performance?.onTimeDelivery || 0}%</p>
                  <p><strong>Quality Complaints:</strong> {selectedVendor.performance?.qualityComplaints || 0}</p>
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetails(false)}>
            Close
          </Button>
          {user?.role === 'admin' && (
            <Button variant="primary" onClick={handleEditVendorFromDetails}>
              Edit Vendor
            </Button>
          )}
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
            <h5>Delete Vendor</h5>
            <p className="text-muted">
              Are you sure you want to delete vendor <strong>{vendorToDelete?.companyName}</strong>?
              <br />
              <span className="text-danger">This action cannot be undone.</span>
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeleteVendor}>
            <i className="bi bi-trash me-2"></i>Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Vendors;
