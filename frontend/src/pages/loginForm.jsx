import React, { useState, useContext } from 'react';
import axios from 'axios';
import { UserRole } from '../components/roles';
import { useNavigate, Link } from 'react-router-dom';
import { UserContext } from '../components/userContext';
import '../styles/styles.css';

function LoginForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useContext(UserContext);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/login', form, {
        headers: { 'Content-Type': 'application/json' },
      });
      const { token, role } = response.data;
      localStorage.setItem('authToken', token);
      login(token);
      if (role === UserRole.OWNER || role === UserRole.ADMIN) navigate('/admin_dashboard');
      else navigate('/sales_dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand-logo">AF</div>
        <h1 className="auth-brand-title">Ark Foods</h1>
        <p className="auth-brand-sub">Market intelligence for pepper growers and produce traders.</p>
        <div className="auth-brand-features">
          <div className="auth-brand-feature">Live USDA terminal & shipping prices</div>
          <div className="auth-brand-feature">6-week price forecasting engine</div>
          <div className="auth-brand-feature">Growing region weather analysis</div>
          <div className="auth-brand-feature">Smart alerts & export tools</div>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-box">
          <h2 className="auth-form-title">Welcome back</h2>
          <p className="auth-form-sub">Sign in to your workspace</p>

          {error && <div className="form-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input
                className="form-input"
                type="email"
                id="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                className="form-input"
                type="password"
                id="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn-auth" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="auth-link">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
