import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';

// 1. Import the necessary functions and schemas with the correct paths
import { loginUserApi } from '../../../apiService.js';
import { loginSchema } from '../../../validateSchema.js';

export default function Login() {
    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });
    
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState("");
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const togglePasswordVisibility = () => setIsPasswordVisible(!isPasswordVisible);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setApiError("");
        setIsLoading(true);

        const result = loginSchema.safeParse(formData);

        if (!result.success) {
            const fieldErrors = {};
            for (const error of result.error.issues) {
                fieldErrors[error.path[0]] = error.message;
            }
            setErrors(fieldErrors);
            return;
        }

        try {
            const data = await loginUserApi(result.data);

            if (data && data.access_token) {
                const { access_token, expires_in } = data;
                
                const decodedToken = jwtDecode(access_token);
                const { role, is_verified } = decodedToken;

                if (role === 'NOT_SELECTED') {
                    setApiError("Your account is pending approval from an administrator.");
                    return;
                }
                
                if (is_verified === false && role !== 'ADMIN') {
                    setApiError("Your account has not been verified by an administrator yet.");
                    return;
                }
                
                // If all checks pass, store the token
                document.cookie = `authToken=${access_token}; path=/; max-age=${expires_in}; SameSite=Lax;`;
                
                // --- THIS IS THE NEW, CORRECT NAVIGATION LOGIC ---
                if (role === 'MANAGER') {
                    // If the user is a Manager, send them directly to the Editors List page
                    navigate('/manager/editorslist');
                } else if (role === 'EDITOR') {
                    // If the user is an Editor, send them to their dashboard
                    navigate('/editor/dashboard');
                } else if (role === 'ADMIN') {
                    // We will handle the admin case later
                    navigate('/admin/dashboard');
                } else {
                    // Fallback for any other case (like the 'USER' role)
                    setApiError("Your role does not have an assigned dashboard. Please contact an administrator.");
                    // Clear the token since they can't go anywhere
                    document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                }

            } else {
                setApiError("Login failed: Invalid response from server.");
            }

        } catch (err) {
            setApiError(err.message);
        }
    };

    return (
        <div className='login_container'>
            <span className="material-symbols-outlined" style={{ fontSize: '50px' }}>login</span>
            <h1 className='login_welcome_heading'>Welcome Back!</h1>

            <div className='login_card'>
                <form onSubmit={handleSubmit} noValidate>
                    <input 
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        required
                        type="text"
                        className="login_input"
                        placeholder='Username or Email'
                        disabled={isLoading}
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
                            disabled={isLoading}
                        />
                        <span
                            onClick={togglePasswordVisibility}
                            className="material-symbols-outlined password-toggle-icon"
                            style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
                        >
                            {isPasswordVisible ? "visibility_off" : "visibility"}
                        </span>
                    </div>
                    {errors.password && <p className="error-message">{errors.password}</p>}

                    <button
                        type="submit"
                        className='login_button'
                        disabled={isLoading}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>

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
