import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaTrain, FaUser, FaLock, FaEye, FaEyeSlash, FaGoogle, FaApple, FaFacebook } from 'react-icons/fa';

const Login = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(formData);
      if (result.success) {
        toast.success('Login successful!');
      } else {
        setError(result.message);
        toast.error(result.message);
      }
    } catch (error) {
      setError('An unexpected error occurred');
      toast.error('Login failed');
    } finally {
      setLoading(false);
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
            <h2 className="fw-bold mb-2" style={{ fontSize: '2.5rem' }}>Hello Again!</h2>
            <p className="text-muted mb-4">Let's get started with RailVaani.</p>

            {error && (
              <Alert variant="danger" className="mb-4 border-0" style={{ borderRadius: '10px' }}>
                {error}
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-4">
                <Form.Control
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Username (e.g. admin)"
                  required
                  style={{
                    borderRadius: '12px',
                    border: '2px solid #e9ecef',
                    padding: '14px 16px',
                    fontSize: '1rem',
                    backgroundColor: '#f8f9fa'
                  }}
                />
              </Form.Group>

              <Form.Group className="mb-4">
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
                      padding: '14px 16px',
                      fontSize: '1rem',
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
                    {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                  </button>
                </div>
              </Form.Group>

              <div className="text-end mb-4">
                <a href="#" className="text-decoration-none fw-semibold" style={{ color: '#8b6f7f' }}>
                  Recovery Password
                </a>
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
                {loading ? 'Signing In...' : 'Sign In'}
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

              <div className="text-center mt-4">
                <small className="text-muted d-block mb-2">
                  Don't have an account? Contact administrator for access.
                </small>
                <div className="p-3 bg-light rounded shadow-sm text-start" style={{ fontSize: '0.85rem', border: '1px solid #dee2e6' }}>
                  <p className="fw-bold mb-1 text-primary">Inspector Credentials:</p>
                  <div className="d-flex justify-content-between mb-1">
                    <span><strong>Abhay Pal:</strong> Abhay123#</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span><strong>Aman Yadav:</strong> Aman123</span>
                  </div>
                </div>
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
                Finally, a service
              </h3>
              <p className="fw-bold" style={{ fontSize: '1.5rem' }}>
                Peace.
              </p>
              <div className="mt-4 d-flex justify-content-center gap-3">
                <button
                  type="button"
                  className="rounded-circle p-2"
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: '2px solid rgba(255,255,255,0.3)',
                    width: '45px',
                    height: '45px',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  ← 
                </button>
                <button
                  type="button"
                  className="rounded-circle p-2"
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: '2px solid rgba(255,255,255,0.3)',
                    width: '45px',
                    height: '45px',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  →
                </button>
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Login;