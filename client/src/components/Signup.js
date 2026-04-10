import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaTrain, FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaGoogle, FaApple, FaFacebook } from 'react-icons/fa';

const Signup = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match.');
      setMessageType('error');
      setLoading(false);
      toast.error('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters long.');
      setMessageType('error');
      setLoading(false);
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    if (!formData.agreeTerms) {
      setMessage('You must agree to the terms and conditions.');
      setMessageType('error');
      setLoading(false);
      toast.error('You must agree to the terms and conditions.');
      return;
    }

    try {
      // Simulate API call
      setTimeout(() => {
        setMessage('Account created successfully! Please login with your credentials.');
        setMessageType('success');
        toast.success('Account created successfully!');
        setLoading(false);
        
        // Reset form after successful signup
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }, 1500);
    } catch (error) {
      setMessage('An error occurred. Please try again.');
      setMessageType('error');
      setLoading(false);
      toast.error('Signup failed');
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #a08080 0%, #d4927d 50%, #9d7f8f 100%)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Card className="shadow-lg border-0" style={{
        borderRadius: '30px',
        overflow: 'hidden',
        maxWidth: '1000px',
        width: '100%'
      }}>
        <Row className="g-0">
          {/* Left Side - Form */}
          <Col lg={6} className="p-5 d-flex flex-column justify-content-center">
            <h2 className="fw-bold mb-2" style={{ fontSize: '2.5rem' }}>Create Account</h2>
            <p className="text-muted mb-4">Get started with your 30 days trial</p>

            {message && (
              <Alert variant={messageType === 'success' ? 'success' : 'danger'} className="mb-4 border-0" style={{ borderRadius: '10px' }}>
                {message}
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Control
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Full Name"
                  required
                  style={{
                    borderRadius: '12px',
                    border: '2px solid #e9ecef',
                    padding: '12px 16px',
                    fontSize: '0.95rem',
                    backgroundColor: '#f8f9fa'
                  }}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  required
                  style={{
                    borderRadius: '12px',
                    border: '2px solid #e9ecef',
                    padding: '12px 16px',
                    fontSize: '0.95rem',
                    backgroundColor: '#f8f9fa'
                  }}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Control
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Username"
                  required
                  style={{
                    borderRadius: '12px',
                    border: '2px solid #e9ecef',
                    padding: '12px 16px',
                    fontSize: '0.95rem',
                    backgroundColor: '#f8f9fa'
                  }}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    required
                    style={{
                      borderRadius: '12px',
                      border: '2px solid #e9ecef',
                      padding: '12px 16px',
                      fontSize: '0.95rem',
                      backgroundColor: '#f8f9fa',
                      paddingRight: '45px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '15px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#666'
                    }}
                  >
                    {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </Form.Group>

              <Form.Group className="mb-4">
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Form.Control
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm Password"
                    required
                    style={{
                      borderRadius: '12px',
                      border: '2px solid #e9ecef',
                      padding: '12px 16px',
                      fontSize: '0.95rem',
                      backgroundColor: '#f8f9fa',
                      paddingRight: '45px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '15px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#666'
                    }}
                  >
                    {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </Form.Group>

              <div className="mb-4">
                <div style={{ border: '2px solid #333', padding: '8px 12px', borderRadius: '8px', display: 'inline-block' }}>
                  <Form.Check
                    type="checkbox"
                    name="agreeTerms"
                    label="I agree to the terms and conditions"
                    checked={formData.agreeTerms}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-100 py-3 fw-bold mb-4"
                disabled={loading}
                style={{
                  borderRadius: '12px',
                  backgroundColor: '#9d7f8f',
                  borderColor: '#9d7f8f',
                  color: '#fff',
                  fontSize: '1.1rem'
                }}
              >
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Button>

              <div className="text-center mb-4">
                <p className="text-muted">Or continue with</p>
              </div>

              <div className="d-flex justify-content-center gap-3 mb-4">
                <button
                  type="button"
                  className="border rounded-circle p-3"
                  style={{
                    background: '#fff',
                    border: '2px solid #e9ecef',
                    width: '50px',
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <FaGoogle color="#1f2937" size={20} />
                </button>
                <button
                  type="button"
                  className="border rounded-circle p-3"
                  style={{
                    background: '#fff',
                    border: '2px solid #e9ecef',
                    width: '50px',
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <FaApple color="#1f2937" size={20} />
                </button>
                <button
                  type="button"
                  className="border rounded-circle p-3"
                  style={{
                    background: '#fff',
                    border: '2px solid #e9ecef',
                    width: '50px',
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <FaFacebook color="#1f2937" size={20} />
                </button>
              </div>

              <div className="text-center">
                <small className="text-muted">
                  Already have an account? <a href="/login" className="fw-bold" style={{ color: '#9d7f8f' }}>Sign In</a>
                </small>
              </div>
            </Form>
          </Col>

          {/* Right Side - Illustration */}
          <Col lg={6} className="d-none d-lg-flex align-items-center justify-content-center p-4" style={{
            background: 'linear-gradient(135deg, #d4927d 0%, #c97a6b 25%, #a77b95 50%, #9d7f8f 75%, #8b6f7f 100%)',
            position: 'relative'
          }}>
            <div className="text-center text-white" style={{ position: 'relative', zIndex: 2 }}>
              <div style={{
                fontSize: '4rem',
                marginBottom: '20px',
                opacity: 0.9
              }}>
                ☀️
              </div>
              <h3 className="fw-bold mb-3" style={{ fontSize: '2rem' }}>
                Welcome to
              </h3>
              <p className="fw-bold" style={{ fontSize: '1.5rem' }}>
                Indian Railways
              </p>
              <p className="mt-3" style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                Track Fitting Management System
              </p>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Signup;