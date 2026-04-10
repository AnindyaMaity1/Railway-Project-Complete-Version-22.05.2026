import React from 'react';
import { Overlay, Spinner } from 'react-bootstrap';

const LoadingOverlay = ({ 
  show, 
  message = 'Loading...', 
  variant = 'primary',
  backdrop = true
}) => {
  if (!show) return null;

  return (
    <Overlay
      show={show}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: backdrop ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div className="d-flex flex-column align-items-center text-white">
        <Spinner 
          animation="border" 
          variant={variant}
          size="lg"
          className="mb-3"
        />
        <p className="mb-0">{message}</p>
      </div>
    </Overlay>
  );
};

export default LoadingOverlay;
