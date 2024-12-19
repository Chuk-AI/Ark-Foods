import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Footer from '../components/footer';
import Header from '../components/header';

function ApproveUsers() {
//   const [users, setUsers] = useState([]);

    const [users, setUsers] = useState([
    { id: 1, username: 'Asad', email: 'qqqqq@example.com', role: 'User' },
    { id: 2, username: 'Asad 2', email: 'aaaaa@example.com', role: 'Admin' },
    { id: 3, username: 'Asad 3', email: 'sssss@example.com', role: 'Moderator' },
  ]);

  // Fetch users data from the backend
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('/api/users'); // Replace with your API endpoint
        setUsers(response.data.users); // Adjust according to your API's response structure
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, []);

  // Approve user action
  const handleApprove = async (userId) => {
    try {
      const response = await axios.post(`/approve_user/${userId}`); // Replace with your API endpoint
      console.log(response.data.message);
      // Remove approved user from the list
      setUsers(users.filter((user) => user.id !== userId));
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  return (
      <div>
          <Header/>
    <div className="container">
      <h2>Approve Users</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.username}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
          
              <td>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => handleApprove(user.id)}
                >
                  Approve
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <Footer/>
    </div>
  );
}

export default ApproveUsers;
