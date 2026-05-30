import React, { useState, useContext } from 'react';
import axios from 'axios';
import { UserRole } from '../components/roles';
import { useNavigate, Link } from "react-router-dom";
import FlashMessages from '../components/flashMessages';
import { UserContext } from '../components/userContext';
import '../styles/styles.css';

function LoginForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState(null);
  const { login } = useContext(UserContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('/api/login', form, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { token, role, message } = response.data;
      localStorage.setItem('authToken', token);
      setMessages(message);
      setError(null);

      login(token);

      if (role === UserRole.OWNER) navigate('/admin_dashboard');
      else if (role === UserRole.ADMIN) navigate('/admin_dashboard');
      else if (role === UserRole.SALES) navigate('/sales_dashboard');
    } catch (err) {
      setMessages(null);
      setError(err.response?.data?.error || 'An error occurred during login.');
      console.error('Login Error:', err.response || err.message);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left panel */}
      <div style={{
        width: '40%',
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        flexShrink: 0,
      }} className="login-left-panel">
        <div style={{ textAlign: 'center', maxWidth: '320px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 700, margin: '0 0 12px' }}>
            Ark Foods
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '16px', fontWeight: 400, margin: '0 0 16px', lineHeight: 1.6 }}>
            Market intelligence for produce growers
          </p>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
            Track commodity prices, forecast trends, and make data-driven decisions for your produce business.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div style={{
        flex: 1,
        background: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 32px',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 8px' }}>
            Welcome back
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '0 0 32px' }}>
            Sign in to your account
          </p>

          <FlashMessages messages={messages} error={error} />

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-control"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                className="form-control"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '8px', padding: '12px 20px', fontSize: '15px' }}
            >
              Sign In
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--color-text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 500 }}>
              Create one
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .login-left-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default LoginForm;
