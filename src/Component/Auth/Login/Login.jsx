import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';

// 1. Import the necessary functions and schemas
import { loginUserApi } from '../../../apiService.js';
import { loginSchema } from '../../../validateSchema.js';
import { jwtDecode } from 'jwt-decode';

export default function Login() {
    // State for the form inputs
    const [formData, setFormData] = useState({
        username: "", // This field will accept a username or an email
        password: "",
    });
    
    // State for handling errors and UI toggles
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState("");
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    
    const navigate = useNavigate();

    // A single handler to update the form state as the user types
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const togglePasswordVisibility = () => setIsPasswordVisible(!isPasswordVisible);

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Clear previous errors on a new submission
        setErrors({});
        setApiError("");

        // Perform frontend validation using our Zod schema
        const result = loginSchema.safeParse(formData);

        if (!result.success) {
            const fieldErrors = {};
            for (const error of result.error.issues) {
                fieldErrors[error.path[0]] = error.message;
            }
            setErrors(fieldErrors);
            return; // Stop the function if validation fails
        }

        try {
            // Call the single, generic login API from our service file
            const data = await loginUserApi(result.data);
            
            if (data && data.access_token) {
                const { access_token, expires_in } = data;

                // --- THIS IS THE CHANGE ---
                // We now store the access token in a cookie instead of localStorage.
                // The cookie will expire automatically based on the 'expires_in' value from your backend.
                document.cookie = `authToken=${access_token}; path=/; max-age=${expires_in}; SameSite=Lax;`;
                
                // Decode the token to check the user's role and status
                const decodedToken = jwtDecode(access_token);
                
                if (decodedToken.is_verified === false && decodedToken.role !== 'ADMIN') {
                    setApiError("Your account has not been approved by an administrator yet.");
                    // We should also clear the cookie if login is denied
                    document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    return;
                }
                
                // If verified, redirect to the correct dashboard
                const userRole = decodedToken.role.toLowerCase();
                navigate(`/${userRole}/dashboard`);

            } else {
                setApiError("Login failed: No token was received from the server.");
            }

        } catch (err) {
            // Display any error from the backend (e.g., "Invalid credentials")
            setApiError(err.message);
        }
    };

    return (
        <div className='login_container'>
            <span className="material-symbols-outlined" style={{fontSize:'50px'}}>login</span>
            <h1 className='login_welcome_heading'>Welcome Back!</h1>
            
            <div className='login_card'>
                <form onSubmit={handleSubmit} noValidate>
                    {/* The form is now universal, with no role selectors */}
                    <input 
                        name="username"
                        value={formData.username} 
                        onChange={handleInputChange} 
                        required 
                        type="text" 
                        className="login_input" 
                        placeholder='Username or Email'
                    />
                    {errors.username && <p className="error-message">{errors.username}</p>}
                    
                    <div className="password-input-wrapper">
                        <input 
                            name="password"
                            value={formData.password} 
                            onChange={handleInputChange} 
                            required 
                            type={isPasswordVisible ? "text" : "password"} 
                            className="login_input" 
                            placeholder='Password'
                        />
                        <span onClick={togglePasswordVisibility} className="material-symbols-outlined password-toggle-icon">
                            {isPasswordVisible ? "visibility_off" : "visibility"}
                        </span>
                    </div>
                    {errors.password && <p className="error-message">{errors.password}</p>}

                    <button type="submit" className='login_button'>Login</button>
                    
                    {apiError && <p className="error-message api-error">{apiError}</p>}
                </form>
            </div>
            
            <div className="login_links">
                <Link to="/forgot-password">Forgot your password?</Link>
                <Link to="/register">Don't have an account? Register</Link>
            </div>
        </div>
    );
}

