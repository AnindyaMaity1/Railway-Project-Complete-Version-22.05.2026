import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Navbar as BSNavbar, Nav, Container, Dropdown, Badge, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { 
  FaQrcode, FaMobileAlt, FaBoxes, 
  FaClipboardList, FaUserFriends, FaSignOutAlt,
  FaBrain, FaListAlt, FaTrain, FaLeaf
} from 'react-icons/fa';
import SustainableMode from './SustainableMode';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showSustainableMode, setShowSustainableMode] = useState(false);

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: <FaQrcode /> },
    { path: '/qr-generator', label: 'QR Gen', icon: <FaQrcode />, roles: ['admin'] },
    { path: '/qr-details', label: 'QR Details', icon: <FaListAlt /> },
    { path: '/mobile-scanner', label: 'Scanner', icon: <FaMobileAlt /> },
    { path: '/shortest-path', label: 'Shortest Path', icon: <FaQrcode /> },
    { path: '/inventory', label: 'Inventory', icon: <FaBoxes />, roles: ['admin'] },
    { path: '/inspections', label: 'Inspections', icon: <FaClipboardList /> },
    { path: '/vendors', label: 'Vendors', icon: <FaUserFriends /> },
    { path: '/reports', label: 'Reports', icon: <FaListAlt />, roles: ['admin'] }
  ];

  if (!user) {
    return null;
  }

  // Filter links based on user role
  const filteredLinks = navLinks.filter(link => 
    !link.roles || link.roles.includes(user.role)
  );

  if (showSustainableMode) {
    return <SustainableMode onClose={() => setShowSustainableMode(false)} />;
  }

  return (
    <BSNavbar bg="primary" variant="dark" expand="lg" sticky="top">
      <Container fluid className="px-3 px-lg-4">
        <BSNavbar.Brand as={Link} to="/dashboard" className="d-flex align-items-center">
          <div className="d-flex flex-column lh-1">
            <span className="fw-semibold">Railway QR System</span>
            <Badge bg="danger" className="brand-ai-tag mx-auto mt-1">
              AI Powered
            </Badge>
          </div>
        </BSNavbar.Brand>
        <BSNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BSNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {filteredLinks.map((link) => (
              <Nav.Link 
                key={link.path}
                as={Link} 
                to={link.path} 
                active={location.pathname === link.path}
              >
                <span className="me-2">{link.icon}</span>
                {link.label}
              </Nav.Link>
            ))}
            <Nav.Link 
              as={Link} 
              to="/decision-copilot"
              active={location.pathname === '/decision-copilot'}
            >
              <span className="me-2"><FaBrain /></span>
              Drishti Copilot
            </Nav.Link>
          </Nav>
          <Nav>
            <Button 
              variant="success" 
              size="sm" 
              className="me-3 d-flex align-items-center gap-2"
              onClick={() => setShowSustainableMode(true)}
            >
              <FaLeaf />
              Sustainable Mode
            </Button>
            <Dropdown align="end">
              <Dropdown.Toggle variant="outline-light" id="dropdown-basic">
                {user.username}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={logout}>
                  <FaSignOutAlt className="me-2" />
                  Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
};

export default Navbar;
