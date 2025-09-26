import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';

// Import the necessary functions and schemas with the correct paths
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
            setIsLoading(false);
            return;
        }

        try {
            // Call the secure login API
            const data = await loginUserApi(result.data);

            if (data && data.access_token) {
                const { access_token, expires_in, redirect_url } = data;

                // Store the token securely
                document.cookie = `authToken=${access_token}; path=/; max-age=${expires_in}; SameSite=Lax;`;

                // SECURE: Navigate to the server-determined URL
                if (redirect_url) {
                    console.log('Redirecting to:', redirect_url);
                    navigate(redirect_url);
                } else {
                    // Fallback if no redirect_url provided
                    setApiError("Login successful but no dashboard assigned. Please contact administrator.");
                }

            } else {
                setApiError("Login failed: Invalid response from server.");
            }

        } catch (err) {
            // Handle specific error cases
            if (err.message.includes("pending approval")) {
                setApiError("Your account is pending approval from an administrator. Please wait.");
            } else if (err.message.includes("not been verified")) {
                setApiError("Your account has not been verified by an administrator yet.");
            } else if (err.message.includes("deactivated")) {
                setApiError("This account has been deactivated. Please contact support.");
            } else {
                setApiError(err.message || "An error occurred during login. Please try again.");
            }
        } finally {
            setIsLoading(false);
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
                <Link to="/Registration">Don't have an account? Register</Link>
            </div>
        </div>
    );
}
