import { toast } from 'react-toastify';

// Global error handler for API calls
export const handleApiError = (error, customMessage = null) => {
  console.error('API Error:', error);
  
  let message = customMessage || 'An unexpected error occurred';
  
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        message = data.message || 'Bad request. Please check your input.';
        break;
      case 401:
        message = 'Unauthorized. Please log in again.';
        // Redirect to login if needed
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        break;
      case 403:
        message = 'Access denied. You do not have permission to perform this action.';
        break;
      case 404:
        message = 'Resource not found.';
        break;
      case 422:
        message = data.message || 'Validation error. Please check your input.';
        break;
      case 429:
        message = 'Too many requests. Please try again later.';
        break;
      case 500:
        message = 'Internal server error. Please try again later.';
        break;
      case 502:
      case 503:
      case 504:
        message = 'Service temporarily unavailable. Please try again later.';
        break;
      default:
        message = data.message || `Error ${status}: ${data.error || 'Unknown error'}`;
    }
  } else if (error.request) {
    // Network error
    message = 'Network error. Please check your internet connection.';
  } else {
    // Other error
    message = error.message || 'An unexpected error occurred';
  }
  
  toast.error(message);
  return message;
};

// Validation error handler
export const handleValidationError = (errors) => {
  if (Array.isArray(errors)) {
    errors.forEach(error => {
      toast.error(error.msg || error.message || 'Validation error');
    });
  } else if (typeof errors === 'object') {
    Object.values(errors).forEach(error => {
      toast.error(error);
    });
  } else {
    toast.error('Validation error');
  }
};

// Success message handler
export const handleSuccess = (message) => {
  toast.success(message);
};

// Warning message handler
export const handleWarning = (message) => {
  toast.warning(message);
};

// Info message handler
export const handleInfo = (message) => {
  toast.info(message);
};

// Network status handler
export const handleNetworkStatus = () => {
  const handleOnline = () => {
    toast.success('Connection restored');
  };
  
  const handleOffline = () => {
    toast.warning('You are offline. Some features may not work.');
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};
