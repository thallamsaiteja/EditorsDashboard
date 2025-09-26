// The base URL for your authentication and management endpoints
import config from '../src/config';

const BASE_URL = config.AUTH_API;

// Request cache to prevent duplicate simultaneous requests
class RequestCache {
    constructor() {
        this.cache = new Map();
        this.abortControllers = new Map();
    }

    async get(key, requestFn, timeout = 10000) {
        // If request is already in progress, return the same promise
        if (this.cache.has(key)) {
            console.log(`Returning cached request for: ${key}`);
            return this.cache.get(key);
        }

        // Create AbortController for this request
        const controller = new AbortController();
        this.abortControllers.set(key, controller);

        // Create timeout for the request
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeout);

        // Create new request promise
        const promise = requestFn(controller.signal)
            .finally(() => {
                // Remove from cache and cleanup when done
                clearTimeout(timeoutId);
                this.cache.delete(key);
                this.abortControllers.delete(key);
            });

        // Cache the promise
        this.cache.set(key, promise);

        return promise;
    }

    // Cancel specific request
    cancel(key) {
        if (this.abortControllers.has(key)) {
            this.abortControllers.get(key).abort();
            this.cache.delete(key);
            this.abortControllers.delete(key);
        }
    }

    // Clear all pending requests
    clearAll() {
        this.abortControllers.forEach(controller => controller.abort());
        this.cache.clear();
        this.abortControllers.clear();
    }
}

// Global request cache instance
const requestCache = new RequestCache();

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

        // Add status code to error for better debugging
        const error = new Error(errorMessage);
        error.status = response.status;
        error.response = response;

        // Throw an error with the specific message from the backend
        throw error;
    }

    // If the response is successful, return the JSON data
    return responseData;
};

/**
 * Enhanced fetch with retry logic and better error handling
 */
const enhancedFetch = async (url, options = {}, signal = null) => {
    const fetchOptions = {
        ...options,
        signal: signal || options.signal,
    };

    try {
        const response = await fetch(url, fetchOptions);
        return handleResponse(response);
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Request cancelled:', url);
            throw new Error('Request cancelled');
        }
        throw error;
    }
};

/**
 * A helper function to retrieve the saved JWT token from the browser's cookies.
 */
const getAuthToken = () => {
    try {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; authToken=`);
        if (parts.length === 2) {
            const token = parts.pop().split(';').shift();
            return token && token !== 'undefined' ? token : null;
        }
        return null;
    } catch (error) {
        console.error('Error getting auth token:', error);
        return null;
    }
};

/**
 * Helper function to clear authentication token
 */
const clearAuthToken = () => {
    try {
        document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        console.log('Auth token cleared');
    } catch (error) {
        console.error('Error clearing auth token:', error);
    }
};

// === AUTHENTICATION APIs ===

/**
 * Register a new editor account
 */
export const registerEditorApi = async (userData) => {
    const cacheKey = `register_editor_${userData.email}`;
    return requestCache.get(cacheKey, async (signal) => {
        return enhancedFetch(`${BASE_URL}/register/editor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        }, signal);
    });
};

/**
 * Register a new manager account
 */
export const registerManagerApi = async (userData) => {
    const cacheKey = `register_manager_${userData.email}`;
    return requestCache.get(cacheKey, async (signal) => {
        return enhancedFetch(`${BASE_URL}/register/manager`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        }, signal);
    });
};

/**
 * Secure login with server-determined navigation
 * Returns access_token and redirect_url from backend
 */
export const loginUserApi = async (credentials) => {
    const cacheKey = `login_${credentials.username}`;

    // Cancel any existing login attempts
    requestCache.cancel(cacheKey);

    return requestCache.get(cacheKey, async (signal) => {
        return enhancedFetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        }, signal);
    });
};

/**
 * SECURE: Validate token and route access with backend
 * This replaces client-side JWT decoding for security
 */
export const validateTokenApi = async (token, requestedPath) => {
    const cacheKey = `validate_${token.substring(0, 10)}_${requestedPath}`;

    return requestCache.get(cacheKey, async (signal) => {
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
                signal
            });

            if (signal?.aborted) {
                throw new Error('Request cancelled');
            }

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                console.log('Validation failed:', response.status, data);
                return { valid: false, hasPermission: false, status: response.status };
            }

            return {
                valid: true,
                hasPermission: data.has_permission,
                user: data.user
            };
        } catch (error) {
            if (error.name === 'AbortError' || error.message === 'Request cancelled') {
                throw error;
            }
            console.error('Token validation error:', error);
            return { valid: false, hasPermission: false, error: error.message };
        }
    }, 5000); // 5 second timeout for validation
};

/**
 * Secure logout - blacklists token on server
 */
export const logoutApi = async () => {
    try {
        const token = getAuthToken();

        if (token) {
            const cacheKey = `logout_${token.substring(0, 10)}`;

            // Cancel any pending requests
            requestCache.clearAll();

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

    const cacheKey = `profile_${token.substring(0, 10)}`;

    return requestCache.get(cacheKey, async (signal) => {
        return enhancedFetch(`${BASE_URL}/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        }, signal);
    });
};

/**
 * Get current user's permissions
 */
export const getCurrentUserPermissionsApi = async () => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found. Please log in.');

    const cacheKey = `permissions_${token.substring(0, 10)}`;

    return requestCache.get(cacheKey, async (signal) => {
        return enhancedFetch(`${BASE_URL}/me/permissions`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        }, signal);
    });
};

// === AVAILABILITY CHECK APIs ===

/**
 * Check if username is available
 */
export const checkUsernameAvailabilityApi = async (username) => {
    const cacheKey = `check_username_${username}`;

    return requestCache.get(cacheKey, async (signal) => {
        return enhancedFetch(`${BASE_URL}/check-username/${encodeURIComponent(username)}`, {}, signal);
    });
};

/**
 * Check if email is available
 */
export const checkEmailAvailabilityApi = async (email) => {
    const cacheKey = `check_email_${email}`;

    return requestCache.get(cacheKey, async (signal) => {
        return enhancedFetch(`${BASE_URL}/check-email/${encodeURIComponent(email)}`, {}, signal);
    });
};

// === MANAGER APIs ===

/**
 * Get team list for managers (pending and approved editors)
 */
export const getManagerTeamApi = async () => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found.');

    const cacheKey = `manager_team_${token.substring(0, 10)}`;

    return requestCache.get(cacheKey, async (signal) => {
        return enhancedFetch(`${BASE_URL}/manager/team`, {
            headers: { 'Authorization': `Bearer ${token}` },
        }, signal);
    });
};

/**
 * Update user details (role, active status, verification) - Manager level
 */
export const updateUserApi = async (userId, updateData) => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found.');

    const cacheKey = `update_user_${userId}_${Date.now()}`;

    return requestCache.get(cacheKey, async (signal) => {
        return enhancedFetch(`${BASE_URL}/manager/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(updateData),
        }, signal);
    });
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

    const cacheKey = `admin_users_${token.substring(0, 10)}`;

    return requestCache.get(cacheKey, async (signal) => {
        return enhancedFetch(`${BASE_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` },
        }, signal);
    });
};

/**
 * Change user role - Admin only
 */
export const changeUserRoleApi = async (userId, newRole) => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found.');

    const cacheKey = `change_role_${userId}_${Date.now()}`;

    return requestCache.get(cacheKey, async (signal) => {
        return enhancedFetch(`${BASE_URL}/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(newRole),
        }, signal);
    });
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

    const cacheKey = `verify_editor_${token.substring(0, 10)}`;

    return requestCache.get(cacheKey, async (signal) => {
        return enhancedFetch(`${BASE_URL}/verify/editor`, {
            headers: { 'Authorization': `Bearer ${token}` },
        }, signal);
    });
};

/**
 * Verify manager access
 */
export const verifyManagerAccessApi = async () => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found.');

    const cacheKey = `verify_manager_${token.substring(0, 10)}`;

    return requestCache.get(cacheKey, async (signal) => {
        return enhancedFetch(`${BASE_URL}/verify/manager`, {
            headers: { 'Authorization': `Bearer ${token}` },
        }, signal);
    });
};

/**
 * Verify admin access
 */
export const verifyAdminAccessApi = async () => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found.');

    const cacheKey = `verify_admin_${token.substring(0, 10)}`;

    return requestCache.get(cacheKey, async (signal) => {
        return enhancedFetch(`${BASE_URL}/verify/admin`, {
            headers: { 'Authorization': `Bearer ${token}` },
        }, signal);
    });
};

// === HEALTH CHECK APIs ===

/**
 * Check authentication service health
 */
export const checkAuthHealthApi = async () => {
    const cacheKey = `health_check_${Date.now()}`;

    return requestCache.get(cacheKey, async (signal) => {
        return enhancedFetch(`${BASE_URL}/health`, {}, signal);
    });
};

// === ERROR HANDLING UTILITIES ===

/**
 * Handle authentication errors globally
 */
export const handleAuthError = (error) => {
    if (error.message.includes('token') || error.message.includes('401') || error.status === 401) {
        clearAuthToken();
        requestCache.clearAll(); // Clear all pending requests
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
        requestCache.clearAll();
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

    const cacheKey = `test_roles_${token.substring(0, 10)}`;

    return requestCache.get(cacheKey, async (signal) => {
        return enhancedFetch(`${BASE_URL}/test/roles`, {
            headers: { 'Authorization': `Bearer ${token}` },
        }, signal);
    });
};

// === UTILITY FUNCTIONS FOR EXTERNAL USE ===

/**
 * Clear all pending requests (useful for logout or component cleanup)
 */
export const clearAllPendingRequests = () => {
    requestCache.clearAll();
};

/**
 * Cancel specific request by key pattern
 */
export const cancelRequest = (keyPattern) => {
    requestCache.cancel(keyPattern);
};

// Export request cache for advanced usage if needed
export { requestCache };
