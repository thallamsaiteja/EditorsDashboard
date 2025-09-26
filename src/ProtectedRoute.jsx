import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { validateTokenApi } from './apiService.js';

const ProtectedRoute = ({ children, requiredRole = null }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const [hasPermission, setHasPermission] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const location = useLocation();

    // Prevent duplicate calls and race conditions
    const isChecking = useRef(false);
    const lastCheckedPath = useRef(null);
    const currentRequest = useRef(null);

    useEffect(() => {
        const checkAuth = async () => {
            // Prevent duplicate calls for same path
            if (isChecking.current || lastCheckedPath.current === location.pathname) {
                return;
            }

            // Cancel previous request if still pending
            if (currentRequest.current) {
                currentRequest.current.cancelled = true;
            }

            // Create request tracking object
            const requestTracker = { cancelled: false };
            currentRequest.current = requestTracker;

            isChecking.current = true;
            lastCheckedPath.current = location.pathname;

            try {
                setError(null);

                // Get token from cookie
                const token = getCookie('authToken');

                if (!token) {
                    if (!requestTracker.cancelled) {
                        setIsAuthenticated(false);
                        setHasPermission(false);
                        setIsLoading(false);
                    }
                    return;
                }

                // Add delay to ensure cookie is properly set after login
                await new Promise(resolve => setTimeout(resolve, 100));

                // Check if request was cancelled
                if (requestTracker.cancelled) {
                    return;
                }

                // Validate token with backend - SECURE SERVER-SIDE VALIDATION
                const response = await validateTokenApi(token, location.pathname);

                // Check if request was cancelled while waiting for response
                if (requestTracker.cancelled) {
                    return;
                }

                if (response && response.valid) {
                    setIsAuthenticated(true);
                    setHasPermission(response.hasPermission);

                    // Log successful validation for debugging (remove in production)
                    console.log('Auth validation success:', {
                        path: location.pathname,
                        hasPermission: response.hasPermission,
                        user: response.user
                    });
                } else {
                    console.log('Auth validation failed:', response);
                    setIsAuthenticated(false);
                    setHasPermission(false);
                    // Clear invalid token
                    clearAuthToken();
                }

            } catch (error) {
                if (!requestTracker.cancelled) {
                    console.error('Auth check failed:', error);
                    setError(error.message);
                    setIsAuthenticated(false);
                    setHasPermission(false);
                    // Clear token on error
                    clearAuthToken();
                }
            } finally {
                if (!requestTracker.cancelled) {
                    setIsLoading(false);
                }
                isChecking.current = false;
                if (currentRequest.current === requestTracker) {
                    currentRequest.current = null;
                }
            }
        };

        // Reset loading state when path changes
        setIsLoading(true);

        // Debounce the authentication check
        const timeoutId = setTimeout(checkAuth, 50);

        // Cleanup function
        return () => {
            clearTimeout(timeoutId);
        };

    }, [location.pathname]); // Removed requiredRole to prevent unnecessary re-runs

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (currentRequest.current) {
                currentRequest.current.cancelled = true;
            }
        };
    }, []);

    // Helper function to get cookie
    const getCookie = (name) => {
        try {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) {
                const cookieValue = parts.pop().split(';').shift();
                return cookieValue || null;
            }
            return null;
        } catch (error) {
            console.error('Error reading cookie:', error);
            return null;
        }
    };

    // Helper function to clear auth token
    const clearAuthToken = () => {
        try {
            document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
            console.log('Auth token cleared');
        } catch (error) {
            console.error('Error clearing auth token:', error);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="loading-container" style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column',
                backgroundColor: '#f8f9fa'
            }}>
                <div className="spinner" style={{
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #3498db',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    animation: 'spin 2s linear infinite'
                }}></div>
                <p style={{
                    marginTop: '20px',
                    color: '#666',
                    fontSize: '14px',
                    textAlign: 'center'
                }}>
                    Verifying access for {location.pathname}...
                </p>
                <style jsx>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    // Not authenticated - redirect to login
    if (isAuthenticated === false) {
        console.log('Redirecting to login - not authenticated');
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Authenticated but no permission for this route
    if (isAuthenticated === true && hasPermission === false) {
        console.log('Redirecting to unauthorized - no permission for:', location.pathname);
        return <Navigate to="/unauthorized" replace />;
    }

    // Error state
    if (error) {
        return (
            <div className="error-container" style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column',
                backgroundColor: '#fff5f5',
                padding: '20px',
                textAlign: 'center'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: '30px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    maxWidth: '400px'
                }}>
                    <h3 style={{
                        color: '#e53e3e',
                        marginBottom: '16px',
                        fontSize: '18px'
                    }}>
                        Authentication Error
                    </h3>
                    <p style={{
                        color: '#666',
                        marginBottom: '24px',
                        fontSize: '14px',
                        lineHeight: '1.5'
                    }}>
                        {error}
                    </p>
                    <button
                        onClick={() => {
                            clearAuthToken();
                            window.location.href = '/login';
                        }}
                        style={{
                            backgroundColor: '#3498db',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#2980b9'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#3498db'}
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    // All checks passed - render the protected component
    console.log('Rendering protected content for:', location.pathname);
    return children;
};

export default ProtectedRoute;
