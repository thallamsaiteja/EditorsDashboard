import React from 'react';
import { Route, Routes, BrowserRouter } from 'react-router-dom';
import './App.css';
// Import all page components
import Homepage from './Component/Home/homepage.jsx';
import ManagerPage from './Component/Manager/ManagerPage.jsx';
import Login from './Component/Auth/Login/Login.jsx';
import Registration from './Component/Auth/Registration/Registration.jsx'; 
import EditorPage from './Component/Editor/Editor.jsx'; 

// 1. Import the new AdminDashboard component from its correct folder
import AdminDashboard from './Component/adminmanagerdashboard/AdminDashboard.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main route: Shows the Homepage */}
        <Route path='/' element={<Homepage />} />
        {/* Auth routes */}
        <Route path='/Login' element={<Login />} />
        <Route path='/Registration' element={<Registration />} />
        {/* Dashboard routes */}
        <Route path='/managerdashboard' element={<ManagerPage />} />

        <Route path='/editordashboard' element={<EditorPage />} />
        
        {/* 2. Add the route for the new admin dashboard */}
        <Route path='/admindashboard' element={<AdminDashboard />} />


        <Route path='/managerdashboard/EditorsList' element={<EditorsList />} />

      </Routes>
    </BrowserRouter>
  );
}
export default App;