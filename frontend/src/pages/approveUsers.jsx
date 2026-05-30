import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { UserContext } from '../components/userContext';

function ApproveUsers() {
  const { isAuthenticated, userRole } = useContext(UserContext);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (isAuthenticated === true && userRole === 'owner') {
      const fetchUsers = async () => {
        try {
          const token = localStorage.getItem('authToken');
          const response = await axios.get('/api/users', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          setUsers(response.data.users);
        } catch (error) {
          console.error('Error fetching users:', error);
        }
      };

      fetchUsers();
    }
  }, [isAuthenticated, userRole]);

  const handleApprove = async (userId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `/api/approve_user/${userId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setUsers(users.filter((user) => user.id !== userId));
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  if (!isAuthenticated || (userRole !== 'owner' && userRole !== 'admin')) {
    return <div>Access Denied. You do not have permission to view this page.</div>;
  }

  return (
    <div>
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
                  <button type="button" className="btn btn-success" onClick={() => handleApprove(user.id)}>
                    Approve
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ApproveUsers;
