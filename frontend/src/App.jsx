import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AdminDashboard from "./components/AdminDashboard";
import BlogPage from "./components/BlogPage";

function App() {
  return (
    <Router basename="/">
      <Routes>
        <Route path="/" element={<BlogPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
