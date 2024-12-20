import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [initialized, setInitialized] = useState(false);


  // Check the JWT token and user role on initial load

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.exp * 1000 > Date.now()) {
          setIsAuthenticated(true);
          setUserRole(payload.role);
        } else {
          logout();
        }
      } catch (error) {
        console.error("Error decoding token:", error);
        logout();
      }
    }
    setInitialized(true); // Mark initialization as complete
  }, []);

  // useEffect(() => {
  //   const token = localStorage.getItem("authToken");
  //   if (token) {
  //     try {
  //       // Decode JWT payload to extract user info
  //       const payload = JSON.parse(atob(token.split(".")[1])); // Decoding the payload part of the token
  //       if (payload.exp * 1000 > Date.now()) { // Check if token has expired
  //         setIsAuthenticated(true);
  //         setUserRole(payload.role); // Assuming 'role' is part of the JWT payload
  //       } else {
  //         logout(); // Token expired, clear state and storage
  //       }
  //     } catch (error) {
  //       console.error("Error decoding token:", error);
  //       logout(); // Invalid token, clear state and storage
  //     }
  //   }
  // }, []);

  // Login function to set auth state and save token

  const login = (token) => {
    try {
      console.log("Token before decoding:", token); // Debug the token
      const parts = token.split(".");
      if (parts.length !== 3) throw new Error("Invalid token format");
      const payload = JSON.parse(atob(parts[1]));
      console.log("Decoded payload:", payload); // Ensure `role` and `username` are present
      if (!payload.role) throw new Error("Missing role in token payload");
  
      setIsAuthenticated(true);
      setUserRole(payload.role); // Use `role` from additional claims
      localStorage.setItem("authToken", token);
    } catch (error) {
      console.error("Error decoding token:", error);
      logout();
    }
  };
  
  
  

  // Logout function to clear auth state and storage
  const logout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    localStorage.removeItem("authToken"); // Clear the token
  };

  return (
    <UserContext.Provider value={{ isAuthenticated, userRole, login, logout, initialized }}>
      {children}
    </UserContext.Provider>
  );
};

// import React, { createContext, useState, useEffect } from "react";

// export const UserContext = createContext();

// export const UserProvider = ({ children }) => {
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [userRole, setUserRole] = useState(null);
//   const [initialized, setInitialized] = useState(false);
//   const [flashMessage, setFlashMessage] = useState(null); // Flash message state
//   const [flashType, setFlashType] = useState(null); // Flash type (success, error)

//   // Check the JWT token and user role on initial load
//   useEffect(() => {
//     const token = localStorage.getItem("authToken");
//     if (token) {
//       try {
//         const payload = JSON.parse(atob(token.split(".")[1]));
//         if (payload.exp * 1000 > Date.now()) {
//           setIsAuthenticated(true);
//           setUserRole(payload.role);
//         } else {
//           logout("Session expired. Please log in again.");
//         }
//       } catch (error) {
//         console.error("Error decoding token:", error);
//         logout("Invalid token. Please log in again.");
//       }
//     }
//     setInitialized(true); // Mark initialization as complete
//   }, []);

//   const login = (token) => {
//     try {
//       const parts = token.split(".");
//       if (parts.length !== 3) throw new Error("Invalid token format");
//       const payload = JSON.parse(atob(parts[1]));
//       if (!payload.role) throw new Error("Missing role in token payload");

//       setIsAuthenticated(true);
//       setUserRole(payload.role);
//       localStorage.setItem("authToken", token);

//       // Set success flash message
//       setFlashMessage("Login successful!");
//       setFlashType("success");
//       clearFlashMessageAfterTimeout();
//     } catch (error) {
//       console.error("Error decoding token:", error);
//       logout("Failed to log in. Please try again.");
//     }
//   };

//   const logout = (message = "You have been logged out.") => {
//     setIsAuthenticated(false);
//     setUserRole(null);
//     localStorage.removeItem("authToken");

//     // Set flash message for logout
//     setFlashMessage(message);
//     setFlashType("info");
//     clearFlashMessageAfterTimeout();
//   };

//   const clearFlashMessageAfterTimeout = () => {
//     setTimeout(() => {
//       setFlashMessage(null);
//       setFlashType(null);
//     }, 5000); // 5 seconds
//   };

//   return (
//     <UserContext.Provider
//       value={{
//         isAuthenticated,
//         userRole,
//         login,
//         logout,
//         initialized,
//         flashMessage,
//         flashType,
//       }}
//     >
//       {children}
//     </UserContext.Provider>
//   );
// };
