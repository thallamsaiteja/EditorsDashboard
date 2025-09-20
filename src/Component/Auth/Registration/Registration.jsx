import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Registration.css';
import { registerEditorApi } from '../../../apiService.js';  
import { registrationSchema } from '../../../validateSchema.js';

export default function Registration() {
    const [formData, setFormData] = useState({
        firstname: "",
        lastname: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        mobileNumber: "",
    });

    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState("");
    const [apiError, setApiError] = useState("");
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

    const navigate = useNavigate();

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Check if the input being changed is the mobile number field
        if (name === "mobileNumber") {
            // Use a regular expression to remove any character that is NOT a digit (0-9)
            const numericValue = value.replace(/[^0-9]/g, '');
            // Update the state only with the numeric value
            setFormData({ ...formData, [name]: numericValue });
        } else {
            // For all other fields, update the state as normal
            setFormData({ ...formData, [name]: value });
        }
    };

    const togglePasswordVisibility = () => setIsPasswordVisible(!isPasswordVisible);
    const toggleConfirmPasswordVisibility = () => setIsConfirmPasswordVisible(!isConfirmPasswordVisible);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setApiError("");
        setSuccessMessage("");

        const result = registrationSchema.safeParse(formData);

        if (!result.success) {
            const fieldErrors = {};
            // --- THIS IS THE CORRECTED LINE ---
            // Zod's error array is called 'issues', not 'errors'.
            for (const error of result.error.issues) {
                fieldErrors[error.path[0]] = error.message;
            }
            setErrors(fieldErrors);
            return;
        }

        const { firstname, lastname, confirmPassword, mobileNumber, ...apiData } = result.data;
        const userData = {
            ...apiData,
            full_name: `${firstname} ${lastname}`,
            phone_number: mobileNumber,
        };

        try {
            await registerEditorApi(userData);
            setSuccessMessage("Registration successful! Redirecting to login...");
            setTimeout(() => navigate('/login'), 2000);
        } catch (error) {
            setApiError(error.message);
        }
    };

    return (
        <div className='registration_container'>
            <span className="material-symbols-outlined" style={{ fontSize: '50px' }}>person_add</span>
            <h1 className='registration_welcome_heading'>Create Editor Account</h1>

            <div className='registration_card'>
                <form onSubmit={handleSubmit} noValidate>
                    <input name="firstname" value={formData.firstname} onChange={handleInputChange} required type="text" className="registration_input" placeholder='First Name' />
                    {errors.firstname && <p className="error-message">{errors.firstname}</p>}

                    <input name="lastname" value={formData.lastname} onChange={handleInputChange} required type="text" className="registration_input" placeholder='Last Name' />
                    {errors.lastname && <p className="error-message">{errors.lastname}</p>}

                    <input name="username" value={formData.username} onChange={handleInputChange} required type="text" className="registration_input" placeholder='Username' />
                    {errors.username && <p className="error-message">{errors.username}</p>}

                    <input name="email" value={formData.email} onChange={handleInputChange} required type="email" className="registration_input" placeholder='Email Address' />
                    {errors.email && <p className="error-message">{errors.email}</p>}
                    
                    <input name="mobileNumber" value={formData.mobileNumber} onChange={handleInputChange} required type="numeric" maxLength="10" className="registration_input" placeholder='Mobile Number' />
                    {errors.mobileNumber && <p className="error-message">{errors.mobileNumber}</p>}
                    
                    <div className="password-input-wrapper">
                        <input name="password" value={formData.password} onChange={handleInputChange} required type={isPasswordVisible ? "text" : "password"} className="registration_input" placeholder='Password' />
                        <span onClick={togglePasswordVisibility} className="material-symbols-outlined password-toggle-icon">{isPasswordVisible ? "visibility_off" : "visibility"}</span>
                    </div>
                    {errors.password && <p className="error-message">{errors.password}</p>}

                    <div className="password-input-wrapper">
                        <input name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} required type={isConfirmPasswordVisible ? "text" : "password"} className="registration_input" placeholder='Confirm Password' />
                        <span onClick={toggleConfirmPasswordVisibility} className="material-symbols-outlined password-toggle-icon">{isConfirmPasswordVisible ? "visibility_off" : "visibility"}</span>
                    </div>
                    {errors.confirmPassword && <p className="error-message">{errors.confirmPassword}</p>}

                    <button type="submit" className='registration_button'>Register</button>

                    {apiError && <p className="error-message api-error">{apiError}</p>}
                    {successMessage && <p className="success-message">{successMessage}</p>}
                </form>
            </div>

            <div className='registration_links'>
                <Link to="/login">Already have an account? Sign In</Link>
            </div>
        </div>
    );
}

