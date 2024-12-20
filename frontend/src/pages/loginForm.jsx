import React, { useState, useContext } from 'react';
import axios from 'axios';
import { UserRole } from '../components/roles'; // Import roles enum
import { useNavigate } from "react-router-dom";
import Footer from '../components/footer';
import Header from '../components/header';
import FlashMessages from '../components/flashMessages';
import { UserContext } from '../components/userContext'; // Import UserContext
import '../styles/styles.css';

function LoginForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState(null);
  const { login } = useContext(UserContext); // Access login function from UserContext
  const navigate = useNavigate(); // Add navigate to control redirection

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      const response = await axios.post('http://127.0.0.1:5500/login', form, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      const { token, role, message } = response.data;
      localStorage.setItem('authToken', token); // Save the token
      setMessages(message);
      setError(null);
  
      login(token); // Call login function to update context
  
      // Redirect based on role
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
    <>
      <Header />
      <div className="container">
        <h2 className="mt-5">Login</h2>

        {/* FlashMessages Component */}
        <FlashMessages messages={messages} error={error} />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <br />
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-control"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <br />
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-control"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          <br />
          <button type="submit" className="btn btn-primary">Login</button>
        </form>
      </div>
      <Footer />
    </>
  );
}

export default LoginForm;
