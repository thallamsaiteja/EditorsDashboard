import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Registration.css';

const mobileNumberPattern = /^\d{10}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Registration() {
    // State for input fields
    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [mobileNumber, setMobileNumber] = useState("");

    // State for error and success messages
    const [firstnameError, setFirstnameError] = useState("");
    const [lastnameError, setLastnameError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [mobileError, setMobileError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // --- 1. CREATE TWO SEPARATE STATES ---
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

    // --- 2. CREATE TWO SEPARATE TOGGLE FUNCTIONS ---
    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    };
    const toggleConfirmPasswordVisibility = () => {
        setIsConfirmPasswordVisible(!isConfirmPasswordVisible);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setFirstnameError("");
        setLastnameError("");
        setEmailError("");
        setPasswordError("");
        setMobileError("");
        setSuccessMessage("");
        
        let isValid = true;

        if (!firstname) {
            setFirstnameError("First name is required.");
            isValid = false;
        }
        if (!lastname) {
            setLastnameError("Last name is required.");
            isValid = false;
        }
        if (!emailPattern.test(email)) {
            setEmailError("Please enter a valid email address.");
            isValid = false;
        }
        if (password.length < 8) {
            setPasswordError("Password must be at least 8 characters long.");
            isValid = false;
        } else if (password !== confirmPassword) {
            setPasswordError("Passwords do not match.");
            isValid = false;
        }
        if (!mobileNumberPattern.test(mobileNumber)) {
            setMobileError("Please enter a valid 10-digit mobile number.");
            isValid = false;
        }
        
        if (isValid) {
            setSuccessMessage("Registration successful! Welcome aboard.");
            console.log("Submitting data:", { firstname, lastname, email, password, mobileNumber });
        }
    };

    return (
        <div className='registration_container'>
            <span className="material-symbols-outlined" style={{ fontSize: '50px' }}>person_add</span>
            <h1 className='registration_welcome_heading'>Create your account</h1>

            <div className='registration_card'>
                <form onSubmit={handleSubmit} noValidate>     
                    <input value={firstname} onChange={(e) => setFirstname(e.target.value)} required type="text" className="registration_input" placeholder='First Name' />
                    {firstnameError && <p className="error-message">{firstnameError}</p>}

                    <input value={lastname} onChange={(e) => setLastname(e.target.value)} required type="text" className="registration_input" placeholder='Last Name' />
                    {lastnameError && <p className="error-message">{lastnameError}</p>}

                    <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" className="registration_input" placeholder='Email Address' />
                    {emailError && <p className="error-message">{emailError}</p>}
                    
                    <input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} required type="tel" maxLength="10" className="registration_input" placeholder='Mobile Number' />
                    {mobileError && <p className="error-message">{mobileError}</p>}
                    {/* --- 3. CONNECT THE FIRST PASSWORD INPUT TO ITS OWN STATE/FUNCTION --- */}
                    <div className="password-input-wrapper">
                        <input value={password} onChange={(e) => setPassword(e.target.value)} required type={isPasswordVisible ? "text" : "password"} className="registration_input" placeholder='Password' />
                        <span onClick={togglePasswordVisibility} className="material-symbols-outlined password-toggle-icon">
                            {isPasswordVisible ? "visibility_off" : "visibility"}
                        </span>
                    </div>

                    {/* --- 4. CONNECT THE SECOND PASSWORD INPUT TO ITS OWN STATE/FUNCTION --- */}
                    <div className="password-input-wrapper">
                        <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required type={isConfirmPasswordVisible ? "text" : "password"} className="registration_input" placeholder='Confirm Password' />
                        <span onClick={toggleConfirmPasswordVisibility} className="material-symbols-outlined password-toggle-icon">
                            {isConfirmPasswordVisible ? "visibility_off" : "visibility"}
                        </span>
                    </div>
                    {passwordError && <p className="error-message">{passwordError}</p>}
                    

                    
                    <button type="submit" className='registration_button'>Register</button>

                    {successMessage && <p className="success-message">{successMessage}</p>}
                </form>
            </div>

            <div className='registration_links'>
                <Link to="/login">Already have an account? Sign In</Link>
            </div>
        </div>
    );
}

