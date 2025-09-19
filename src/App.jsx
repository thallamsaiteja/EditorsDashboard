import React from 'react';
import { Route, Routes, BrowserRouter } from 'react-router-dom';

// Import all your page components
import Homepage from './Component/Home/homepage.jsx';
import LoginPage from './Component/Auth/Login/Login.jsx';
import RegistrationPage from './Component/Auth/Registration/Registration.jsx';
import ForgotPasswordPage from './Component/Auth/ForgotPassword/ForgotPassword.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main route: Shows the Homepage */}
        <Route path='/' element={<Homepage />} />

        {/* Auth routes for your teammate's pages */}
        <Route path='/login' element={<LoginPage />} />
        <Route path='/register' element={<RegistrationPage />} />
        <Route path='/forgot-password' element={<ForgotPasswordPage />} />
        
        {/* You can add your manager dashboard route here later */}
        {/* <Route path='/managerdashboard' element={<ManagerPage />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;