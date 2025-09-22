import React from 'react';
import { Route, Routes, BrowserRouter } from 'react-router-dom';
import './App.css';

// Import all page components
import Homepage from './Component/Home/homepage.jsx';
import ManagerPage from './Component/Manager/ManagerPage.jsx';
import Login from './Component/Auth/Login/Login.jsx';
import Registration from './Component/Auth/Registration/Registration.jsx';
import EditorPage from './Component/Editor/Editor.jsx';
import EditorsList from './Component/Manager/EditorsList.jsx';
import AdminDashboard from './Component/adminmanagerdashboard/AdminDashboard.jsx';

// Import the updated ProtectedRoute component
import ProtectedRoute from './ProtectedRoute.jsx';

// Import error/unauthorized pages
import UnauthorizedPage from './Component/Error/UnauthorizedPage.jsx';
import NotFoundPage from './Component/Error/NotFoundPage.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes - No authentication required */}
        <Route path='/' element={<Homepage />} />
        <Route path='/login' element={<Login />} />
        <Route path='/registration' element={<Registration />} />

        {/* Error routes */}
        <Route path='/unauthorized' element={<UnauthorizedPage />} />
        <Route path='/404' element={<NotFoundPage />} />

        {/* Protected routes with role-based access control */}

        {/* Admin Dashboard - Requires ADMIN role */}
        <Route
          path='/admin/dashboard'
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Manager Dashboard - Requires MANAGER or ADMIN role */}
        <Route
          path='/managerdashboard'
          element={
            <ProtectedRoute requiredRole="MANAGER">
              <ManagerPage />
            </ProtectedRoute>
          }
        />

        {/* Editors List - Requires MANAGER or ADMIN role */}
        <Route
          path='/managerdashboard/EditorsList'
          element={
            <ProtectedRoute requiredRole="MANAGER">
              <EditorsList />
            </ProtectedRoute>
          }
        />

        {/* Editor Dashboard - Requires EDITOR, MANAGER, or ADMIN role */}
        <Route
          path='/editordashboard'
          element={
            <ProtectedRoute requiredRole="EDITOR">
              <EditorPage />
            </ProtectedRoute>
          }
        />

        {/* Legacy routes - redirect to new secure paths */}
        <Route path='/Login' element={<Login />} />
        <Route path='/Registration' element={<Registration />} />
        <Route path='/admindashboard' element={<AdminDashboard />} />

        {/* Catch-all route - 404 page */}
        <Route path='*' element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
