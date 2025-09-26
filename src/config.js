// src/config.js
const config = {
  // Base API URL from environment variable
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  
  // Specific API endpoints
  AUTH_API: `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/auth`,
  MANAGER_API: `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/manager`,
  EDITOR_API: `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/editor`,
  ADMIN_API: `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/admin`,
  
  // Telegram webhook
  TELEGRAM_API: `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/telegram`
};

export default config;
