// logout.jsx
import { useNavigate } from 'react-router-dom';

function deleteCookieEverywhere(name) {
  const paths = [
    '/',                     // cookie set with path=/
    '/editordashboard',
    '/managerdashboard',
    '/admindashboard',
    window.location.pathname, // current path, just in case
  ];
  // Deleting requires matching name and path; domain is not needed for host-only cookies [web:87][web:86]
  paths.forEach(p => {
    document.cookie = `${name}=; path=${p}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${name}=; path=${p}; max-age=0`; // some browsers prefer max-age=0 [web:143]
  });
  // If CookieStore API is available, also request a delete with an explicit path [web:84]
  if ('cookieStore' in window) {
    try { window.cookieStore.delete(name, { path: '/' }); } catch (_) {}
  }
}

export function clearAuthSideEffects() {
  deleteCookieEverywhere('authToken'); // remove all variants of the JWT cookie [web:86][web:87]
  localStorage.clear();                // wipe origin data [web:94]
  sessionStorage.clear();              // wipe session-scoped data [web:94]
}

export default function LogoutButton({ className = 'sidebar-link', onBeforeLogout }) {
  const navigate = useNavigate();      // redirect programmatically [web:98]
  const handleLogout = () => {
    if (typeof onBeforeLogout === 'function') onBeforeLogout(); // e.g., close SSE [web:3]
    clearAuthSideEffects();                                      // remove cookies + storage [web:86]
    navigate('/', { replace: true });                            // go to Home and prevent Back [web:98]
  };
  return <button type="button" className={className} onClick={handleLogout}>Logout</button>;
}
