const config = {
  // Specific API endpoints using Vite's import.meta.env
  AUTH_API: `${import.meta.env.VITE_REACT_APP_API_URL}/api/v1/auth`,
  MANAGER_API: `${import.meta.env.VITE_REACT_APP_API_URL}/api/v1/manager`,
  EDITOR_API: `${import.meta.env.VITE_REACT_APP_API_URL}/api/v1/editor`,
  ADMIN_API: `${import.meta.env.VITE_REACT_APP_API_URL}/api/v1/admin`,

  // Telegram webhook
  TELEGRAM_API: `${import.meta.env.VITE_REACT_APP_API_URL}/telegram`
};

export default config;
