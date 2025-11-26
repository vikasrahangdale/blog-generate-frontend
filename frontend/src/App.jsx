import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';
import BlogPage from './components/BlogPage';
import Navbar from './components/Navbar';

function AppWrapper() {
  const location = useLocation();

  // Hide Navbar on admin route
  const hideNavbar = location.pathname === "/admin";

  return (
    <div className="min-h-screen bg-gray-50">
   
      
      <Routes>
        <Route path="/" element={<BlogPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppWrapper />
    </Router>
  );
}

export default App;
