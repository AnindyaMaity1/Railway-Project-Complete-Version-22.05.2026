import React, { useState } from 'react';
import { Alert } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
  FaTrain,
  FaUser,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaLeaf,
  FaShieldAlt,
} from 'react-icons/fa';
import '../styles/LoginSustainability.css';

const loginImageUrl = `${process.env.PUBLIC_URL || ''}/login.jpeg`;

const Login = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
    } catch {
      setError('An unexpected error occurred');
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sustain-login login-page">
      <div className="sustain-login__split">
        <div className="sustain-login__card">
          <div className="sustain-login__card-inner">
            <span className="sustain-login__leaf-badge">
              <FaLeaf /> Environmental intelligence platform
            </span>

            <h2>Welcome back</h2>
            <p className="lead-text">
              Sign in to access carbon analytics and smart railway sustainability tools.
            </p>

            <div className="sustain-login__stats">
              <div className="sustain-login__stat sustain-login__stat--green">
                <div className="sustain-login__stat-value">
                  <FaLeaf className="me-1" style={{ fontSize: '0.85rem' }} />
                  Eco
                </div>
                <div className="sustain-login__stat-label">Carbon track</div>
              </div>
              <div className="sustain-login__stat sustain-login__stat--blue">
                <div className="sustain-login__stat-value">AI</div>
                <div className="sustain-login__stat-label">Brain live</div>
              </div>
              <div className="sustain-login__stat sustain-login__stat--slate">
                <div className="sustain-login__stat-value">
                  <FaTrain style={{ fontSize: '1rem' }} />
                </div>
                <div className="sustain-login__stat-label">Rail network</div>
              </div>
            </div>

            {error && (
              <Alert variant="danger" className="mb-3 border-0" style={{ borderRadius: 12 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <div className="sustain-login__field">
                <label className="sustain-login__label" htmlFor="username">
                  Username
                </label>
                <div className="sustain-login__input-wrap">
                  <FaUser className="sustain-login__input-icon" aria-hidden="true" />
                  <input
                    id="username"
                    className="sustain-login__input"
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="e.g. admin"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="sustain-login__field">
                <label className="sustain-login__label" htmlFor="password">
                  Password
                </label>
                <div className="sustain-login__input-wrap">
                  <FaLock className="sustain-login__input-icon" aria-hidden="true" />
                  <input
                    id="password"
                    className="sustain-login__input"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    className="sustain-login__toggle-pw"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                  </button>
                </div>
              </div>

              <div className="sustain-login__forgot">
                <a href="#recovery">Recovery password</a>
              </div>

              <button type="submit" className="sustain-login__submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in to dashboard'}
              </button>

              <div className="sustain-login__hint">
                <div className="sustain-login__hint-title">
                  <FaShieldAlt className="me-2" />
                  Inspector credentials
                </div>
                <div className="sustain-login__hint-row">
                  <span>
                    <strong>Abhay Pal</strong>
                  </span>
                  <span>Abhay123#</span>
                </div>
                <div className="sustain-login__hint-row">
                  <span>
                    <strong>Aman Yadav</strong>
                  </span>
                  <span>Aman123</span>
                </div>
              </div>

              <p className="sustain-login__footer-note">
                Don&apos;t have an account? Contact your administrator for access.
              </p>
            </form>
          </div>
        </div>

        <div className="sustain-login__image-card">
          <img
            src={loginImageUrl}
            alt="Sustainable railway infrastructure"
            className="sustain-login__image"
          />
        </div>
      </div>
    </div>
  );
};

export default Login;
