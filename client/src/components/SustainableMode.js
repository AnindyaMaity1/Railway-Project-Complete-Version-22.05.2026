import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Badge, ListGroup, Table, Navbar as BSNavbar, Nav, Dropdown } from 'react-bootstrap';
import { 
  FaLeaf, FaFireAlt, FaChartLine, FaRecycle, FaLightbulb, 
  FaThermometerHalf, FaGraduationCap, FaTruck, FaCheckCircle,
  FaCalendarAlt, FaCog, FaChartBar, FaCertificate, FaHeartbeat,
  FaArrowLeft, FaSignOutAlt, FaRobot, FaHandshake, FaCloudSun, FaBullseye, FaFlask, FaGlobe
} from 'react-icons/fa';
import CarbonAnalytics from './CarbonAnalytics';
import AISustainabilityBrain from './AISustainabilityBrain';
import SustainabilityDigitalTwin from './SustainabilityDigitalTwin';
import GreenGuardCopilot from './GreenGuardCopilot';
import EcoRouteOptimization from './EcoRouteOptimization';
import PredictiveSustainabilityAnalytics from './PredictiveSustainabilityAnalytics';
import SustainabilityRiskHeatmap from './SustainabilityRiskHeatmap';
import GreenMaterialRecommendations from './GreenMaterialRecommendations';
import VendorSustainabilityIntelligence from './VendorSustainabilityIntelligence';
import ClimateResilienceIntelligence from './ClimateResilienceIntelligence';
import NetZeroMissionDashboard from './NetZeroMissionDashboard';
import AutonomousSustainabilityRecommendations from './AutonomousSustainabilityRecommendations';
import RailwayGreenScore from './RailwayGreenScore';
import SustainabilityScenarioSimulator from './SustainabilityScenarioSimulator';
import GlobalSDGAlignmentEngine from './GlobalSDGAlignmentEngine';
import { useAuth } from '../context/AuthContext';

const SustainableFeatures = {
  CARBON_ACCOUNTING: {
    id: 'carbon-accounting',
    title: 'Carbon Accounting',
    icon: <FaLeaf />,
    description: 'Real-time CO₂ emissions tracking and lifecycle carbon footprint calculation',
    color: 'success'
  },
  EMISSION_HOTSPOTS: {
    id: 'emission-hotspots',
    title: 'AI Sustainability Brain',
    icon: <FaFireAlt />,
    description: 'Central AI engine: scores, risk alerts, optimizations, and environmental forecasts',
    color: 'danger'
  },
  VENDOR_CARBON: {
    id: 'vendor-carbon',
    title: 'Sustainability Digital Twin',
    icon: <FaChartLine />,
    description: 'Live infrastructure twin: impact, degradation, energy, intensity, and health forecasts',
    color: 'info'
  },
  LIFECYCLE_IMPACT: {
    id: 'lifecycle-impact',
    title: 'GreenGuard Bot',
    icon: <FaRobot />,
    description: 'AI copilot: live Q&A, What-If Lab, net-zero pathways, eco twins, and green procurement',
    color: 'primary'
  },
  SUSTAINABILITY_RATING: {
    id: 'sustainability-rating',
    title: 'Eco-Route Optimization Engine',
    icon: <FaChartBar />,
    description: 'Lowest-emission routes, fuel-minimized inspections, and smart technician deployment',
    color: 'warning'
  },
  ENERGY_EFFICIENCY: {
    id: 'energy-efficiency',
    title: 'Predictive Sustainability Analytics',
    icon: <FaLightbulb />,
    description: 'AI lifecycle prediction: expensive assets, problem components, carbon-heavy zones',
    color: 'info'
  },
  WASTE_MANAGEMENT: {
    id: 'waste-management',
    title: 'Sustainability Risk Heatmap',
    icon: <FaThermometerHalf />,
    description: 'Visual corridor heatmap: emissions, wastage, over-maintenance, and climate risk',
    color: 'secondary'
  },
  RECYCLABILITY: {
    id: 'recyclability',
    title: 'Smart Green Material AI',
    icon: <FaGraduationCap />,
    description: 'AI material swaps: recyclable, low-emission, sustainable & long-life options',
    color: 'success'
  },
  MAINTENANCE_OPT: {
    id: 'maintenance-opt',
    title: 'Vendor Sustainability Intelligence',
    icon: <FaHandshake />,
    description: 'AI green ranking, ethical sourcing, emission efficiency, and sustainable procurement',
    color: 'primary'
  },
  REPLACEMENT_CYCLE: {
    id: 'replacement-cycle',
    title: 'Climate Resilience Intelligence',
    icon: <FaCloudSun />,
    description: 'Flood prediction, heat impact, climate stress, and weather sustainability risk',
    color: 'info'
  },
  MATERIAL_SUSTAINABILITY: {
    id: 'material-sustainability',
    title: 'AI Net-Zero Mission Dashboard',
    icon: <FaBullseye />,
    description: 'Net-zero progress, targets, efficiency trends, KPIs, and AI carbon savings',
    color: 'warning'
  },
  TRANSPORT_EMISSIONS: {
    id: 'transport-emissions',
    title: 'Autonomous Sustainability',
    icon: <FaRobot />,
    description: 'Agentic AI: replace timing, maintenance, routes, materials, and vendor switches',
    color: 'danger'
  },
  GREEN_CERTIFICATIONS: {
    id: 'green-certifications',
    title: 'Railway Green Score',
    icon: <FaCertificate />,
    description: 'Universal zone score: carbon, longevity, waste, energy, vendors, maintenance',
    color: 'success'
  },
  EMISSION_FORECASTING: {
    id: 'emission-forecasting',
    title: 'Sustainability Scenario Simulator',
    icon: <FaFlask />,
    description: 'What-if: recycled materials, fewer inspections, optimized routes — AI predictions',
    color: 'info'
  },
  ASSET_HEALTH: {
    id: 'asset-health',
    title: 'Global SDG Alignment Engine',
    icon: <FaGlobe />,
    description: 'UN SDGs, green transport, and smart infrastructure alignment mapping',
    color: 'primary'
  }
};

const FeatureCard = ({ feature, isActive, onClick }) => (
  <div 
    onClick={onClick}
    className="p-2 mb-1 rounded-2 cursor-pointer"
    style={{
      backgroundColor: isActive ? `var(--bs-${feature.color})` : '#ffffff',
      color: isActive ? 'white' : '#2d3748',
      border: isActive ? 'none' : '1px solid #e2e8f0',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      textDecoration: 'none',
      fontSize: '0.875rem'
    }}
    onMouseEnter={(e) => {
      if (!isActive) {
        e.currentTarget.style.backgroundColor = '#e2e8f0';
        e.currentTarget.style.transform = 'translateX(2px)';
      }
    }}
    onMouseLeave={(e) => {
      if (!isActive) {
        e.currentTarget.style.backgroundColor = '#ffffff';
        e.currentTarget.style.transform = 'translateX(0)';
      }
    }}
  >
    <div className="d-flex align-items-center gap-2" style={{ minHeight: '32px' }}>
      <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>{feature.icon}</span>
      <span className="fw-semibold" style={{ fontSize: '0.8rem', lineHeight: '1.2' }}>{feature.title}</span>
    </div>
  </div>
);

const SustainableMode = ({ onClose }) => {
  const { user, logout } = useAuth();
  const [activeFeature, setActiveFeature] = useState('carbon-accounting');

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow || '';
    };
  }, []);

  const features = Object.values(SustainableFeatures);
  const selectedFeature = Object.values(SustainableFeatures).find(f => f.id === activeFeature);

  const handleLogout = () => {
    if (onClose) onClose();
    logout();
  };

  const renderFeatureContent = () => {
    switch (activeFeature) {
      case 'carbon-accounting':
        return <CarbonAnalytics showBackButton={false} />;
      
      case 'emission-hotspots':
        return <AISustainabilityBrain />;
      
      case 'vendor-carbon':
        return <SustainabilityDigitalTwin />;
      
      case 'lifecycle-impact':
        return <GreenGuardCopilot />;
      
      case 'sustainability-rating':
        return <EcoRouteOptimization />;
      
      case 'energy-efficiency':
        return <PredictiveSustainabilityAnalytics />;
      
      case 'waste-management':
        return <SustainabilityRiskHeatmap />;
      
      case 'recyclability':
        return <GreenMaterialRecommendations />;
      
      case 'maintenance-opt':
        return <VendorSustainabilityIntelligence />;
      
      case 'replacement-cycle':
        return <ClimateResilienceIntelligence />;
      
      case 'material-sustainability':
        return <NetZeroMissionDashboard />;
      
      case 'transport-emissions':
        return <AutonomousSustainabilityRecommendations />;
      
      case 'green-certifications':
        return <RailwayGreenScore />;
      
      case 'emission-forecasting':
        return <SustainabilityScenarioSimulator />;
      
      case 'asset-health':
        return <GlobalSDGAlignmentEngine />;
      
      default:
        return null;
    }
  };

  return (
    <div className="sustainable-mode-wrapper" style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', zIndex: 1050, backgroundColor: '#ffffff', overflow: 'hidden' }}>
      {/* Custom Navbar */}
      <BSNavbar bg="primary" variant="dark" className="mb-0" style={{ flexShrink: 0, minHeight: '60px' }}>
        <Container fluid className="px-3 px-lg-4">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minHeight: '60px' }}>
            <div className="d-flex flex-column align-items-start" style={{ color: '#ffffff' }}>
              <span className="fw-semibold" style={{ fontSize: '1rem' }}>Railway QR System</span>
              <span style={{ fontSize: '0.75rem', color: '#ffffff', backgroundColor: '#dc3545', borderRadius: '999px', padding: '0.2rem 0.65rem', marginTop: '0.25rem', fontWeight: 600 }}>AI Powered</span>
            </div>
            <Nav className="ms-auto d-flex align-items-center gap-3">
              <Button 
                variant="outline-danger" 
                size="sm"
                onClick={onClose}
                className="d-flex align-items-center gap-2"
                style={{ minHeight: '34px', borderWidth: '1.5px', borderColor: '#dc3545', backgroundColor: '#ffe5e5', color: '#dc3545' }}
              >
                <FaArrowLeft />
                Exit Sustainable
              </Button>
              
              <Dropdown align="end">
                <Dropdown.Toggle variant="outline-light" size="sm" id="user-dropdown" className="text-dark" style={{ minHeight: '34px', padding: '0 0.9rem' }}>
                  {user?.username}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={handleLogout}>
                    <FaSignOutAlt className="me-2" />
                    Logout
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Nav>
          </div>
        </Container>
      </BSNavbar>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', width: '100%' }}>
        {/* Sidebar */}
        <div style={{
          width: '280px',
          backgroundColor: '#f8fafc',
          borderRight: '1px solid #e2e8f0',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '1rem 0.75rem',
          flexShrink: 0,
          minHeight: 0,
          height: '100%'
        }}>
          <div>
            {features.map((feature) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                isActive={activeFeature === feature.id}
                onClick={() => setActiveFeature(feature.id)}
              />
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '2rem',
          backgroundColor: '#f9fafb',
          height: '100%'
        }}>
          <div className="feature-content" style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', boxSizing: 'border-box', overflowX: 'hidden', minHeight: '100%' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', minHeight: '100%', padding: '1.5rem', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.06)', overflow: 'hidden' }}>
              {renderFeatureContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SustainableMode;