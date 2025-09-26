import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './ErrorPages.css';

const NotFoundPage = () => {
    const navigate = useNavigate();

    const handleGoHome = () => {
        navigate('/');
    };

    return (
        <div className="error-page-container">
            <div className="error-content">
                <div className="error-icon">
                    <span className="material-symbols-outlined" style={{ fontSize: '80px', color: '#ff9800' }}>
                        search_off
                    </span>
                </div>
                <h1 className="error-title">Page Not Found</h1>
                <p className="error-message">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <div className="error-actions">
                    <button onClick={handleGoHome} className="btn btn-primary">
                        Go Home
                    </button>
                    <Link to="/login" className="btn btn-secondary">
                        Go to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;
