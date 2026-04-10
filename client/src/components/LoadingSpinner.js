import React from 'react';
import { Spinner, Container } from 'react-bootstrap';

const LoadingSpinner = ({ 
  size = 'md', 
  message = 'Loading...', 
  centered = true, 
  variant = 'primary',
  className = ''
}) => {
  const spinner = (
    <div className={`d-flex flex-column align-items-center ${className}`}>
      <Spinner 
        animation="border" 
        variant={variant} 
        size={size}
        className="mb-3"
      />
      {message && (
        <p className="text-muted mb-0">{message}</p>
      )}
    </div>
  );

  if (centered) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        {spinner}
      </Container>
    );
  }

  return spinner;
};

export default LoadingSpinner;
