import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './ErrorPages.css'; // Create this CSS file for styling

const UnauthorizedPage = () => {
    const navigate = useNavigate();

    const handleGoBack = () => {
        navigate(-1);
    };

    const handleLogout = () => {
        // Clear token
        document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        // Redirect to login
        window.location.href = '/login';
    };

    return (
        <div className="error-page-container">
            <div className="error-content">
                <div className="error-icon">
                    <span className="material-symbols-outlined" style={{ fontSize: '80px', color: '#f44336' }}>
                        block
                    </span>
                </div>
                <h1 className="error-title">Access Denied</h1>
                <p className="error-message">
                    You don't have permission to access this page.
                    <br />
                    Please contact your administrator if you believe this is an error.
                </p>
                <div className="error-actions">
                    <button onClick={handleGoBack} className="btn btn-secondary">
                        Go Back
                    </button>
                    <Link to="/login" className="btn btn-primary">
                        Go to Login
                    </Link>
                    <button onClick={handleLogout} className="btn btn-outline">
                        Logout & Login as Different User
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UnauthorizedPage;
