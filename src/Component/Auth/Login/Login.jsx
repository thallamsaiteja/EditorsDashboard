import React, { useState } from 'react';
import './Login.css';
import { Link } from 'react-router-dom';

<<<<<<< HEAD
export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    // Function to toggle password visibility
    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log({ email, password });
    };

    return (
        <div className='login_container'>
            <span class="material-symbols-outlined" style={{fontSize:'50px'}}>login</span>
            <h1 className='login_welcome_heading'>Welcome back!</h1>

            <div className='login_card'>
                <form onSubmit={handleSubmit}>
                    <input 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        type="email" 
                        className="login_input" 
                        placeholder='Email address'
                    />
                    <div className="password-input-wrapper">
                        <input value={password} onChange={(e) => setPassword(e.target.value)} required type={isPasswordVisible ? "text" : "password"} className="registration_input" placeholder='Password' />
                        <span onClick={togglePasswordVisibility} className="material-symbols-outlined password-toggle-icon">
                            {isPasswordVisible ? "visibility" : "visibility_off"}
                        </span>
                    </div>
                    <button type="submit" className='login_button'>Login</button>
                </form>
            </div>

            {/* Container for the bottom links */}
            <div className="login_links">
                <Link to='/ForgotPassword' class="login_links_text">Forgot your password?</Link>
                <Link to="/Registration" class="login_links_text">Don't have an account? Get Started</Link>
            </div>
        </div>

        
    );
}
=======
function Login() {


    return (
        <>
            <h1>hello123</h1>
        </>
    )
}

export default Login
>>>>>>> 2a4afe80106fe5887f15522f84ec45b6cc6d9f65
