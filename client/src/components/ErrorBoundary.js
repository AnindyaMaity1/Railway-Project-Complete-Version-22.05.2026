import React from 'react';
import { Container, Alert, Button } from 'react-bootstrap';
import { FaExclamationTriangle, FaRedo } from 'react-icons/fa';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container className="d-flex align-items-center justify-content-center vh-100">
          <div className="text-center">
            <FaExclamationTriangle 
              size={64} 
              className="text-danger mb-4" 
            />
            <h2 className="text-danger mb-3">Something went wrong</h2>
            <p className="text-muted mb-4">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Alert variant="danger" className="text-start mb-4">
                <Alert.Heading>Error Details (Development Mode)</Alert.Heading>
                <p><strong>Error:</strong> {this.state.error.toString()}</p>
                <details className="mt-3">
                  <summary>Stack Trace</summary>
                  <pre className="mt-2 small">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              </Alert>
            )}
            
            <Button 
              variant="primary" 
              onClick={this.handleReload}
              className="me-2"
            >
              <FaRedo className="me-2" />
              Reload Page
            </Button>
            
            <Button 
              variant="outline-secondary" 
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
          </div>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
