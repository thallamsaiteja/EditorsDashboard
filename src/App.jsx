import React from 'react';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import './App.css';

// --- 1. Import all your page components ---
import Login from './Component/Auth/Login/Login.jsx';
import Registration from './Component/Auth/Registration/Registration.jsx';

// --- 2. The ProtectedRoute import is no longer needed ---
// import ProtectedRoute from './Component/Auth/ProtectedRoute.jsx'; 

// --- 3. Import your Dashboard pages ---
import ManagerPage from './Component/Manager/ManagerPage.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- Public Routes (Anyone can see these) --- */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Registration />} />
        <Route 
          path="/manager/editorslist" 
          element={<EditorsList />} 
        />

        {/* Catch-all route - 404 page */}
        <Route path='*' element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

