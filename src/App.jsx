import React from 'react';
import { Route, Routes, BrowserRouter } from 'react-router-dom';


// Import all your page components
import Homepage from './Component/Home/homepage.jsx';

import { Navigate, Route, Routes, BrowserRouter } from 'react-router-dom'
import ManagerPage from './Component/Manager/ManagerPage'
import Login from './Component/Auth/Login/Login'
import Registration from './Component/Auth/Registration/Registration' 
import './App.css'


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main route: Shows the Homepage */}
        <Route path='/' element={<Homepage />} />

        {/* Auth routes for your teammate's pages */}
        <Route path='/login' element={<LoginPage />} />        
        {/* 2. Add the route for the manager dashboard */}
        <Route path='/managerdashboard' element={<ManagerPage />} />

        <Route path='/Login' element={<Login />} />
        <Route path='/Registration' element={<Registration />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;