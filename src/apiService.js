// The base URL for your authentication and management endpoints
// const BASE_URL = 'http://localhost:8000/api/v1/auth'; 
// import// Adjust if your backend runs on a different port
import config from '../config.js';
const BASE_URL = config.AUTH_API;
const handleResponse = async (response) => {
    // Try to parse the JSON body of the response, even for errors
    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
        let errorMessage = "An unknown server error occurred.";

        // FastAPI provides detailed validation errors in a `detail` array for status 422
        if (response.status === 422 && Array.isArray(responseData.detail)) {
            // We'll take the user-friendly message from the first validation error
            errorMessage = responseData.detail[0].msg;
        } else if (responseData.detail) {
            // For other errors (like 401 Unauthorized, 404 Not Found), FastAPI sends a string in `detail`
            errorMessage = responseData.detail;
        }

        // Throw an error with the specific message from the backend
        throw new Error(errorMessage);
    }

    // If the response is successful, return the JSON data
    return responseData;
};

/**
 * A helper function to retrieve the saved JWT token from the browser's cookies.
 */
const getAuthToken = () => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; authToken=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
};

/**
 * Helper function to clear authentication token
 */
const clearAuthToken = () => {
    document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
};

// === AUTHENTICATION APIs ===

/**
 * Register a new editor account
 */
export const registerEditorApi = async (userData) => {
    const response = await fetch(`${BASE_URL}/register/editor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
    });
    return handleResponse(response);
};

/**
 * Register a new manager account
 */
export const registerManagerApi = async (userData) => {
    const response = await fetch(`${BASE_URL}/register/manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
    });
    return handleResponse(response);
};

/**
 * Secure login with server-determined navigation
 * Returns access_token and redirect_url from backend
 */
export const loginUserApi = async (credentials) => {
    const response = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    });
    return handleResponse(response);
};

/**
 * SECURE: Validate token and route access with backend
 * This replaces client-side JWT decoding for security
 */
export const validateTokenApi = async (token, requestedPath) => {
    try {
        const response = await fetch(`${BASE_URL}/validate-access`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                requested_path: requestedPath
            }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return { valid: false, hasPermission: false };
        }

        return {
            valid: true,
            hasPermission: data.has_permission,
            user: data.user
        };
    } catch (error) {
        console.error('Token validation error:', error);
        return { valid: false, hasPermission: false };
    }
};

/**
 * Secure logout - blacklists token on server
 */
export const logoutApi = async () => {
    try {
        const token = getAuthToken();

        if (token) {
            const response = await fetch(`${BASE_URL}/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            // Don't throw error if logout fails on server - still clear local token
            if (!response.ok) {
                console.warn('Server logout failed, but clearing local token');
            }
        }

        // Always clear token locally
        clearAuthToken();
        return true;

    } catch (error) {
        console.error('Logout error:', error);
        // Still clear token on error
        clearAuthToken();
        return false;
    }
};

// === USER PROFILE APIs ===

/**
 * Get current user's profile
 */
export const getCurrentUserApi = async () => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found. Please log in.');

    const response = await fetch(`${BASE_URL}/me`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    return handleResponse(response);
};

/**
 * Get current user's permissions
 */
export const getCurrentUserPermissionsApi = async () => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found. Please log in.');

    const response = await fetch(`${BASE_URL}/me/permissions`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    return handleResponse(response);
};

// === AVAILABILITY CHECK APIs ===

/**
 * Check if username is available
 */
export const checkUsernameAvailabilityApi = async (username) => {
    const response = await fetch(`${BASE_URL}/check-username/${encodeURIComponent(username)}`);
    return handleResponse(response);
};

/**
 * Check if email is available
 */
export const checkEmailAvailabilityApi = async (email) => {
    const response = await fetch(`${BASE_URL}/check-email/${encodeURIComponent(email)}`);
    return handleResponse(response);
};

// === MANAGER APIs ===

/**
 * Get team list for managers (pending and approved editors)
 */
export const getManagerTeamApi = async () => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found.');

    const response = await fetch(`${BASE_URL}/manager/team`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
};

/**
 * Update user details (role, active status, verification) - Manager level
 */
export const updateUserApi = async (userId, updateData) => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found.');

    const response = await fetch(`${BASE_URL}/manager/users/${userId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
    });
    return handleResponse(response);
};

/**
 * Approve/reject editor by updating status - Manager function
 */
export const updateUserStatusApi = async (userId, isActive, isVerified) => {
    const updateData = {
        is_active: isActive,
        is_verified: isVerified
    };

    return updateUserApi(userId, updateData);
};

/**
 * Assign role to user - Manager function
 */
export const assignUserRoleApi = async (userId, newRole) => {
    const updateData = {
        role: newRole
    };

    return updateUserApi(userId, updateData);
};

// === ADMIN APIs ===

/**
 * Get all users list - Admin only
 */
export const getAdminUserListApi = async () => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found.');

    const response = await fetch(`${BASE_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
};

/**
 * Change user role - Admin only
 */
export const changeUserRoleApi = async (userId, newRole) => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found.');

    const response = await fetch(`${BASE_URL}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newRole), // Send role directly as per your backend
    });
    return handleResponse(response);
};

/**
 * Legacy: Approve user API (keeping for backward compatibility)
 */
export const approveUserApi = async (userId, newRole) => {
    return changeUserRoleApi(userId, newRole);
};

/**
 * Legacy: Approve user role API (keeping for backward compatibility)
 */
export const approveUserRoleApi = async (userId, newRole) => {
    return changeUserRoleApi(userId, newRole);
};

// === ROLE VERIFICATION APIs ===

/**
 * Verify editor access
 */
export const verifyEditorAccessApi = async () => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found.');

    const response = await fetch(`${BASE_URL}/verify/editor`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
};

/**
 * Verify manager access
 */
export const verifyManagerAccessApi = async () => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found.');

    const response = await fetch(`${BASE_URL}/verify/manager`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
};

/**
 * Verify admin access
 */
export const verifyAdminAccessApi = async () => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found.');

    const response = await fetch(`${BASE_URL}/verify/admin`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
};

// === HEALTH CHECK APIs ===

/**
 * Check authentication service health
 */
export const checkAuthHealthApi = async () => {
    const response = await fetch(`${BASE_URL}/health`);
    return handleResponse(response);
};

// === ERROR HANDLING UTILITIES ===

/**
 * Handle authentication errors globally
 */
export const handleAuthError = (error) => {
    if (error.message.includes('token') || error.message.includes('401')) {
        clearAuthToken();
        window.location.href = '/login';
    }
    return error;
};

/**
 * Create authenticated fetch wrapper
 */
export const authenticatedFetch = async (url, options = {}) => {
    const token = getAuthToken();

    if (!token) {
        throw new Error('Authentication token not found. Please log in.');
    }

    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    const response = await fetch(url, { ...options, ...defaultOptions });

    if (response.status === 401) {
        clearAuthToken();
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
    }

    return handleResponse(response);
};

// === SECURITY UTILITIES ===

/**
 * Check if user is authenticated (has valid token)
 */
export const isAuthenticated = () => {
    const token = getAuthToken();
    return !!token;
};

/**
 * Get user info from current session (secure way via API call)
 */
export const getCurrentUserSecure = async () => {
    try {
        return await getCurrentUserApi();
    } catch (error) {
        clearAuthToken();
        return null;
    }
};

// === DEBUGGING UTILITIES (Remove in production) ===

/**
 * Test role access (development only)
 */
export const testRoleAccessApi = async () => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found.');

    const response = await fetch(`${BASE_URL}/test/roles`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
};
