import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

// Components
import Navbar from './components/Navbar';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import QRGenerator from './components/QRGenerator';
import QRCodeDetails from './components/QRCodeDetails';
import QRScanner from './components/QRScanner';
import Inventory from './components/Inventory';
import Inspections from './components/Inspections';
import Vendors from './components/Vendors';
import MobileScanner from './components/MobileScanner';
import ErrorBoundary from './components/ErrorBoundary';
import ShortestPathFinder from './components/ShortestPathFinder';
import DecisionCopilot from './components/DecisionCopilot';
import Reports from './components/Reports';
import CarbonAnalytics from './components/CarbonAnalytics';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

// Main App Component
const AppContent = () => {
  const { user } = useAuth();

  return (
    <Router>
      <div className="App">
        {user && <Navbar />}
        
        <main className={user ? 'main-content' : ''}>
          <Routes>
            <Route 
              path="/login" 
              element={user ? <Navigate to="/dashboard" /> : <Login />} 
            />
            
            <Route 
              path="/signup" 
              element={user ? <Navigate to="/dashboard" /> : <Signup />} 
            />
            
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/qr-generator" 
              element={
                <ProtectedRoute>
                  <QRGenerator />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/qr-details" 
              element={
                <ProtectedRoute>
                  <QRCodeDetails />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/qr-scanner" 
              element={
                <ProtectedRoute>
                  <QRScanner />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/mobile-scanner" 
              element={
                <ProtectedRoute>
                  <MobileScanner />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/inventory" 
              element={
                <ProtectedRoute>
                  <Inventory />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/inspections" 
              element={
                <ProtectedRoute>
                  <Inspections />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/vendors" 
              element={
                <ProtectedRoute>
                  <Vendors />
                </ProtectedRoute>
              } 
            />
            
            {/* New Route for Shortest Path Finder */}
            <Route 
              path="/shortest-path" 
              element={
                <ProtectedRoute>
                  <ShortestPathFinder />
                </ProtectedRoute>
              } 
            />
            
            <Route
              path="/decision-copilot"
              element={
                <ProtectedRoute>
                  <DecisionCopilot />
                </ProtectedRoute>
              }
            />
            
            <Route 
              path="/reports" 
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/carbon-analytics" 
              element={
                <ProtectedRoute>
                  <CarbonAnalytics />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/" 
              element={<Navigate to="/dashboard" />} 
            />
          </Routes>
        </main>
        
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </Router>
  );
};

// Root App Component with Auth Provider and Socket Provider
const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <AppContent />
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
