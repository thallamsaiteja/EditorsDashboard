// The base URL for your authentication and management endpoints
const BASE_URL = 'http://localhost:8000/api/v1/auth'; // Adjust if your backend runs on a different port

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
 * A helper function to retrieve the saved JWT token from the browser's local storage.
 */
const getAuthToken = () => {
    return localStorage.getItem('authToken');
};

// --- AUTHENTICATION API FUNCTIONS ---

/**
 * Registers a new user with the 'EDITOR' role.
 * @param {object} userData - The registration data from the form.
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
 * Logs in a user with the 'EDITOR' role.
 * @param {object} credentials - { username, password }.
 */
export const loginEditorApi = async (credentials) => {
    const response = await fetch(`${BASE_URL}/login/editor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    });
    return handleResponse(response);
};

/**
 * Logs in a user with the 'MANAGER' role.
 * @param {object} credentials - { username, password }.
 */
export const loginManagerApi = async (credentials) => {
    const response = await fetch(`${BASE_URL}/login/manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    });
    return handleResponse(response);
};

/**
 * Logs in a user with the 'ADMIN' role.
 * @param {object} credentials - { username, password }.
 */
export const loginAdminApi = async (credentials) => {
    const response = await fetch(`${BASE_URL}/login/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    });
    return handleResponse(response);
};


export const getUnverifiedEditorsApi = async () => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found. Please log in.');

    const response = await fetch(`${BASE_URL}/manager/unverified-editors`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    return handleResponse(response);
};

/**
 * Updates the verification status of an editor (Accept/Decline). Requires a manager's auth token.
 * @param {string} editorId - The UUID of the editor to update.
 * @param {boolean} isVerified - `true` to accept, `false` to decline.
 */
export const updateEditorVerificationApi = async (editorId, isVerified) => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found. Please log in.');

    const response = await fetch(`${BASE_URL}/manager/editors/${editorId}/verify`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ is_verified: isVerified }),
    });
    return handleResponse(response);
};

export const loginUserApi = async (credentials) => {
    const response = await fetch(`${BASE_URL}/login/form`, {
        method: 'POST',
        // FastAPI's OAuth2PasswordRequestForm expects this specific content type
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        // Convert the credentials object into a format the backend can understand
        body: new URLSearchParams(credentials),
    });
    return handleResponse(response);
};
