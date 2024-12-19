import React, { useState } from "react";
import axios from "axios";
import Footer from "../components/footer";
import Header from "../components/header";
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

      // Log the form data to the console for debugging
  console.log("Form Data Submitted:", form);


    try {
      const response = await axios.post("/register", form, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Handle success
      setMessages(response.data.message);
      setError(null);

      // Redirect or clear form
      setForm({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "",
      });
      if (!form.username || !form.email || !form.password || !form.confirmPassword || !form.role) {
        setError("All fields are required.");
        return;
      }
    
    } catch (err) {
      // Handle errors
      setMessages(null);
      setError(err.response?.data?.error || "An error occurred during registration.");
      console.error("Registration Error:", err.response || err.message);
    }
  };

  return (
    <>
      <Header />
      <div className="container">
        <h2 className="mt-5">Register</h2>
        <FlashMessages messages={messages} error={error} />
        <form onSubmit={handleSubmit}>
          <div className="form-group mt-3">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              className="form-control"
              value={form.username}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group mt-3">
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
          <div className="form-group mt-3">
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
          <div className="form-group mt-3">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className="form-control"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group mt-3">
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
          <button type="submit" className="btn btn-primary mt-3">
              
            Register
            
          </button>
          
        </form>


      </div>
      <Footer />
    </>
  );
}

export default RegisterForm;
