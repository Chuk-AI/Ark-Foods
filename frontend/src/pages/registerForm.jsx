import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import FlashMessages from "../components/flashMessages";
import "../styles/styles.css";

function RegisterForm() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("Form Data Submitted:", form);

    if (!form.username || !form.email || !form.password || !form.confirmPassword || !form.role) {
      setError("All fields are required.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await axios.post("/api/register", form, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      setMessages(response.data.message);
      setError(null);

      setForm({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "",
      });

      navigate("/login");
    } catch (err) {
      setMessages(null);
      setError(err.response?.data?.error || "An error occurred during registration.");
      console.error("Registration Error:", err.response || err.message);
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
            Create an account
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '0 0 32px' }}>
            Get started with Ark Foods
          </p>

          <FlashMessages messages={messages} error={error} />

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                className="form-control"
                placeholder="johndoe"
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>
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
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                className="form-control"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                className="form-control"
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
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '8px', padding: '12px 20px', fontSize: '15px' }}
            >
              Create Account
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--color-text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 500 }}>
              Sign in
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

export default RegisterForm;
