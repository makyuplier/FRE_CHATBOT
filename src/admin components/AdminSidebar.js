// src/admin components/AdminSidebar.js
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BsChatFill } from "react-icons/bs"; // Import chat icon from react-icons
import "../styles/admin/AdminSidebar.css";

const AdminSidebar = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const location = useLocation(); // Get current path

  const handleChatbotClick = () => {
    navigate("/chat");
  };

  return (
    <aside className={`admin-sidebar ${isOpen ? "open" : "closed"}`}>
      {/* Sidebar Header (Moved from AdminHeader) */}
      <div className="sidebar-header">
        {isOpen && <h2 className="admin-title">Orion</h2>}
        <button className="toggle-btn" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? "✖" : "☰"}
        </button>
        {isOpen && (
          <button className="launch-button-admin" onClick={handleChatbotClick}>
            <BsChatFill className="chat-icon" />
            <span>Chat</span>
          </button>
        )}
      </div>

      {isOpen && (
        <nav className="sidebar-nav">
          <ul>
            <li
              className={location.pathname === "/admin/dashboard" ? "active" : ""}
              onClick={() => navigate("/admin/dashboard")}
            >
              Dashboard
            </li>
            <li
              className={location.pathname === "/admin/accounts" ? "active" : ""}
              onClick={() => navigate("/admin/accounts")}
            >
              Accounts
            </li>
            <li
              className={location.pathname === "/admin/orion" ? "active" : ""}
              onClick={() => navigate("/admin/orion")}
            >
              Manage Orion
            </li>
            <li
              className={location.pathname === "/admin/adminprofile" ? "active" : ""}
              onClick={() => navigate("/admin/adminprofile")}
            >
              Admin Profile
            </li>
          </ul>
        </nav>
      )}
    </aside>
  );
};

export default AdminSidebar;