// src/pages/AdminPage.js
import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminSidebar from "./admin components/AdminSidebar";
import AdminDashboard from "./admin components/AdminDashboard";
import AdminAccounts from "./admin components/AdminAccounts";
import ManageOrion from "./admin components/ManageOrion";
import AdminProfile from "./admin components/AdminProfile";
import "./styles/AdminPage.css";

const AdminPage = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <AdminSidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      {/* Main Content */}
      <main className="admin-main">
        <Routes>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="accounts" element={<AdminAccounts />} />
          <Route path="orion" element={<ManageOrion />} />
          <Route path="adminprofile" element={<AdminProfile />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminPage;
