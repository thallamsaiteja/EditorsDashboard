import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { validateTokenApi } from './apiService.js'; // Updated import path

const ProtectedRoute = ({ children, requiredRole = null }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const [hasPermission, setHasPermission] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const location = useLocation();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                setError(null);

                // Get token from cookie
                const token = getCookie('authToken');

                if (!token) {
                    setIsAuthenticated(false);
                    setIsLoading(false);
                    return;
                }

                // Validate token with backend - SECURE SERVER-SIDE VALIDATION
                const response = await validateTokenApi(token, location.pathname);

                if (response.valid) {
                    setIsAuthenticated(true);

                    // Check if user has permission for this specific route
                    setHasPermission(response.hasPermission);

                    // Log successful validation for debugging (remove in production)
                    console.log('Auth validation:', {
                        path: location.pathname,
                        hasPermission: response.hasPermission,
                        user: response.user
                    });

                } else {
                    setIsAuthenticated(false);
                    setHasPermission(false);
                    // Clear invalid token
                    clearAuthToken();
                }

            } catch (error) {
                console.error('Auth check failed:', error);
                setError(error.message);
                setIsAuthenticated(false);
                setHasPermission(false);
                // Clear token on error
                clearAuthToken();
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [location.pathname, requiredRole]);

    // Helper function to get cookie
    const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    };

    // Helper function to clear auth token
    const clearAuthToken = () => {
        document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="loading-container" style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column'
            }}>
                <div className="spinner" style={{
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #3498db',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    animation: 'spin 2s linear infinite'
                }}></div>
                <p style={{ marginTop: '20px', color: '#666' }}>Verifying access...</p>
            </div>
        );
    }

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Authenticated but no permission for this route
    if (!hasPermission) {
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
                flexDirection: 'column'
            }}>
                <h3>Authentication Error</h3>
                <p>{error}</p>
                <button onClick={() => window.location.href = '/login'}>
                    Go to Login
                </button>
            </div>
        );
    }

    // All checks passed - render the protected component
    return children;
};

export default ProtectedRoute;
