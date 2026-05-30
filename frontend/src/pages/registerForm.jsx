import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/styles.css';

function RegisterForm() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', role: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/register', form, {
        headers: { 'Content-Type': 'application/json' },
      });
      setSuccess(response.data.message || 'Account created! Awaiting approval.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand-logo">AF</div>
        <h1 className="auth-brand-title">Join Ark Foods</h1>
        <p className="auth-brand-sub">Create your account and get access to the market intelligence platform.</p>
        <div className="auth-brand-features">
          <div className="auth-brand-feature">Live USDA terminal & shipping prices</div>
          <div className="auth-brand-feature">6-week price forecasting engine</div>
          <div className="auth-brand-feature">Growing region weather analysis</div>
          <div className="auth-brand-feature">Smart alerts & export tools</div>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-box">
          <h2 className="auth-form-title">Create an account</h2>
          <p className="auth-form-sub">Get started with Ark Foods</p>

          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                className="form-input"
                type="text"
                id="username"
                name="username"
                placeholder="johndoe"
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>
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
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirm password</label>
              <input
                className="form-input"
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="role">Role</label>
              <select
                className="form-select"
                id="role"
                name="role"
                value={form.role}
                onChange={handleChange}
                required
              >
                <option value="">Select a role</option>
                <option value="sales">Sales</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" className="btn-auth" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="auth-link">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterForm;
