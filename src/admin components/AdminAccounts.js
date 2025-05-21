// src/admin components/AdminAccounts.js
import React, { useEffect, useState } from "react";
import { db, auth } from "../Firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { Button } from "../components/ui/button";
import { Edit, Trash2, RefreshCcw, Info, Search } from "react-feather";
import Swal from "sweetalert2";
import "../styles/admin/AdminAccounts.css";

const AdminAccounts = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deletePanelOpen, setDeletePanelOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const userData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(userData);
      setFilteredUsers(userData);
    } catch (error) {
      console.error("Error fetching users: ", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle real-time search filtering
  useEffect(() => {
    const lowerQuery = searchQuery.toLowerCase();
    setFilteredUsers(
      users.filter(
        (user) =>
          user.username.toLowerCase().includes(lowerQuery) ||
          user.email.toLowerCase().includes(lowerQuery)
      )
    );
  }, [searchQuery, users]);

  const handleDelete = async () => {
    if (usernameInput === selectedUser.username) {
      try {
        // 1. Delete user from Firestore
        await deleteDoc(doc(db, "users", selectedUser.id));

        // 3. Update local state
        setUsers(users.filter((user) => user.id !== selectedUser.id));
        setDeletePanelOpen(false);
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    } else {
      Swal.fire({
        title: "Username Mismatch",
        text: "The entered username does not match the selected user's username.",
        icon: "warning",
        confirmButtonText: "OK",
      });
    }
  };

  const handleEdit = async () => {
    setIsSavingEdit(true);
    try {
      await updateDoc(doc(db, "users", selectedUser.id), {
        username: selectedUser.username,
        email: selectedUser.email,
        roles: Array.isArray(selectedUser.roles)
          ? selectedUser.roles.join(", ")
          : selectedUser.roles,
        address: selectedUser.address || "",
        contactNum: selectedUser.contactNum || "",
        emergencyContactPerson: selectedUser.emergencyContactPerson || "",
        emergencyContactNum: selectedUser.emergencyContactNum || "",
      });

      await fetchUsers();
      setEditPanelOpen(false);

      Swal.fire({
        title: "User Updated",
        text: "The user details were saved successfully.",
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("Error updating user: ", error);
      Swal.fire({
        title: "Update Failed",
        text: "An error occurred while saving changes.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle password reset email
  const handleSendResetEmail = async () => {
    if (!selectedUser) return;
    try {
      await sendPasswordResetEmail(auth, selectedUser.email);
      Swal.fire({
        title: "Password Reset Sent",
        text: `Email sent to ${selectedUser.email}`,
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("Error sending password reset email:", error);
      Swal.fire({
        title: "Failed to Send Email",
        text: "Please try again later.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
    setResetModalOpen(false);
  };

  return (
    <div className="admin-accounts-container">
      <h1 className="title">Accounts</h1>
      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search by username or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <Button variant="outline" className="search-btn">
          <Search size={16} />
        </Button>
      </div>
      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>
                  {Array.isArray(user.roles)
                    ? user.roles.join(", ")
                    : user.roles || "No roles"}
                </td>
                <td>
                  {new Date(user.createdAt?.seconds * 1000).toLocaleString()}
                </td>
                <td className="actions">
                  <Button
                    variant="outline"
                    className="edit-btn"
                    onClick={() => {
                      setSelectedUser(user);
                      setEditPanelOpen(true);
                    }}
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    className="info-btn"
                    onClick={() => {
                      setSelectedUser(user);
                      setInfoModalOpen(true);
                    }}
                  >
                    <Info size={16} />
                  </Button>

                  <Button
                    variant="outline"
                    className="reload-btn"
                    onClick={() => {
                      setSelectedUser(user);
                      setResetModalOpen(true);
                    }}
                  >
                    <RefreshCcw size={16} />
                  </Button>
                  <Button
                    variant="destructive"
                    className="delete-btn"
                    onClick={() => {
                      setSelectedUser(user);
                      setDeletePanelOpen(true);
                    }}
                  >
                    <Trash2 size={16} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(editPanelOpen ||
        deletePanelOpen ||
        resetModalOpen ||
        infoModalOpen) && (
          <div className="modal-overlay show">
            <div className="modal">
              {editPanelOpen && selectedUser && (
                <>
                  <h2>Edit User</h2>
                  <div>
                    <strong>UID: </strong>
                    <span>{selectedUser.id}</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Username"
                    value={selectedUser.username || ""}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, username: e.target.value })
                    }
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={selectedUser.email || ""}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, email: e.target.value })
                    }
                  />
                  <label htmlFor="role-select">Role:</label>
                  <select
                    id="role-select"
                    value={selectedUser.roles || "User"}
                    onChange={(e) =>
                      setSelectedUser({
                        ...selectedUser,
                        roles: [e.target.value],
                      })
                    }
                  >
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Address"
                    value={selectedUser.address || ""}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, address: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Contact Number"
                    value={selectedUser.contactNum || ""}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, contactNum: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Emergency Contact Person"
                    value={selectedUser.emergencyContactPerson || ""}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, emergencyContactPerson: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Emergency Contact Number"
                    value={selectedUser.emergencyContactNum || ""}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, emergencyContactNum: e.target.value })
                    }
                  />

                  <Button onClick={handleEdit} disabled={isSavingEdit}>
                    {isSavingEdit ? "Saving..." : "Save"}
                  </Button>
                  <Button onClick={() => setEditPanelOpen(false)}>Cancel</Button>
                </>
              )}
              {deletePanelOpen && selectedUser && (
                <>
                  <h2>Confirm Deletion</h2>
                  <p>
                    Type the username to confirm deletion:<br></br>
                    <strong>{selectedUser.username}</strong>
                  </p>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                  />
                  <Button onClick={handleDelete}>Confirm Delete</Button>
                  <Button onClick={() => setDeletePanelOpen(false)}>
                    Cancel
                  </Button>
                </>
              )}
              {infoModalOpen && selectedUser && (
                <div className="modal-overlay show">
                  <div className="modal">
                    <h2>User Info</h2>
                    <p>
                      <strong>UID:</strong> {selectedUser.id}
                    </p>
                    <p>
                      <strong>Username:</strong> {selectedUser.username}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedUser.email}
                    </p>
                    <p>
                      <strong>Roles:</strong>{" "}
                      {Array.isArray(selectedUser.roles)
                        ? selectedUser.roles.join(", ")
                        : selectedUser.roles || "No roles"}
                    </p>
                    <p>
                      <strong>Address:</strong> {selectedUser.address}
                    </p>
                    <p>
                      <strong>Contact Number:</strong> {selectedUser.contactNum}
                    </p>
                    <p>
                      <strong>Emergency Contact Person:</strong> {selectedUser.emergencyContactPerson}
                    </p>
                    <p>
                      <strong>Emergencgy Contact Number:</strong> {selectedUser.emergencyContactNum}
                    </p>
                    <Button onClick={() => setInfoModalOpen(false)}>Close</Button>
                  </div>
                </div>
              )}

              {resetModalOpen && selectedUser && (
                <>
                  <h2>Reset Password</h2>
                  <p>
                    Are you sure you want to send a password reset email to{" "}
                    <strong>{selectedUser.email}</strong>?
                  </p>
                  <Button onClick={handleSendResetEmail}>Yes, Send Email</Button>
                  <Button onClick={() => setResetModalOpen(false)}>Cancel</Button>
                </>
              )}
            </div>
          </div>
        )}
    </div>
  );
};

export default AdminAccounts;
