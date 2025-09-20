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


export const loginUserApi = async (credentials) => {
    const response = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    });
    return handleResponse(response);
};

export const getPendingUsersApi = async () => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found. Please log in.');

    const response = await fetch(`${BASE_URL}/admin/pending-users`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    return handleResponse(response);
};

/**
 * Approves a user by updating their role and verification status. Requires an admin token.
 * @param {string} userId - The UUID of the user to approve.
 * @param {string} newRole - The new role to assign (e.g., 'EDITOR' or 'MANAGER').
 */
export const approveUserApi = async (userId, newRole) => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found. Please log in.');

    const response = await fetch(`${BASE_URL}/admin/approve-user/${userId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ new_role: newRole }),
    });
    return handleResponse(response);
};