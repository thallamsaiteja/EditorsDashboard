// src/Component/logout/logout.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './logout.css';
// Clear the auth cookie set via document.cookie in login (path=/), and wipe storage
export function clearAuthSideEffects() {
  // Delete the JWT cookie; path must match how it was set (path=/ was used at login)
  // If a domain attribute was used when setting, include the same domain here.
  document.cookie = 'authToken=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT'; // cookie removal requires matching path [web:86][web:87]

  // Clear all storage for this origin
  localStorage.clear(); // clears all localStorage keys [web:94]
  sessionStorage.clear(); // clears all sessionStorage keys [web:91]
}

export default function LogoutButton({ className = '', onBeforeLogout }) {
  const navigate = useNavigate(); // programmatic navigation [web:89]

  const handleLogout = () => {
    try {
      if (typeof onBeforeLogout === 'function') onBeforeLogout(); // e.g., close SSE [web:3]
      clearAuthSideEffects(); // remove cookie + storage [web:86]
    } finally {
      navigate('/', { replace: true }); // go to home, prevent back to protected page [web:98][web:89]
    }
  };

  return (
    <button className={className} onClick={handleLogout}>
      Logout
    </button>
  );
}
