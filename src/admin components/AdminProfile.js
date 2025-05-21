// src/admin/components/AdminProfile.js
import React, { useEffect, useState } from "react";
import { auth, db } from "../Firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Edit } from "react-feather";
import { CgProfile } from "react-icons/cg";
import "../styles/admin/AdminProfile.css";

const AdminProfile = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formState, setFormState] = useState({});

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userDocRef);

        if (userSnapshot.exists()) {
          const profileData = userSnapshot.data();
          const mergedProfile = {
            email: user.email,
            uid: user.uid,
            ...profileData,
          };
          setUserProfile(mergedProfile);
          setFormState(mergedProfile);
        } else {
          const fallback = { email: user.email, uid: user.uid };
          setUserProfile(fallback);
          setFormState(fallback);
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    setFormState((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSave = async () => {
    try {
      const { uid, email, ...updatableFields } = formState;
      const userDocRef = doc(db, "users", uid);
      await updateDoc(userDocRef, updatableFields);
      setUserProfile(formState);
      setEditMode(false);
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  if (!userProfile) {
    return (
      <div className="admin-profile-container">
        <h1>Admin Profile</h1>
        <p><strong>NO USER LOGGED IN</strong></p>
      </div>
    );
  }

  return (
    <div className="admin-profile-container">
      <div className="admin-profile-header">
        <h1>Admin Profile</h1>
        {editMode ? (
          <CgProfile size={24} className="edit-icon" onClick={() => setEditMode(false)} />
        ) : (
          <Edit size={24} className="edit-icon" onClick={() => setEditMode(true)} />
        )}
      </div>

      {editMode ? (
        <div className="admin-profile-form">
          <label><strong>Email: </strong><input type="email" name="email" value={formState.email} readOnly /></label>
          <label><strong>UID: </strong><input type="text" name="uid" value={formState.uid} readOnly /></label>
          <label><strong>Address: </strong><input type="text" name="address" value={formState.address || ""} onChange={handleChange} /></label>
          <label><strong>Contact Number: </strong><input type="text" name="contactNum" value={formState.contactNum || ""} onChange={handleChange} /></label>
          <label><strong>Emergency Contact Person: </strong><input type="text" name="emergencyContactPerson" value={formState.emergencyContactPerson || ""} onChange={handleChange} /></label>
          <label><strong>Emergency Contact Number: </strong><input type="text" name="emergencyContactNum" value={formState.emergencyContactNum || ""} onChange={handleChange} /></label>
          <button onClick={handleSave}>Save</button>
          <button onClick={() => { setFormState(userProfile); setEditMode(false); }}>Cancel</button>
        </div>
      ) : (
        <div className="admin-profile-view">
          <p><strong>Email:</strong> {userProfile.email}</p>
          <p><strong>UID:</strong> {userProfile.uid}</p>
          <p><strong>Address:</strong> {userProfile.address || "N/A"}</p>
          <p><strong>Contact Number:</strong> {userProfile.contactNum || "N/A"}</p>
          <p><strong>Emergency Contact Person:</strong> {userProfile.emergencyContactPerson || "N/A"}</p>
          <p><strong>Emergency Contact Number:</strong> {userProfile.emergencyContactNum || "N/A"}</p>
          <p>
            <strong>Roles:</strong>{" "}
            {Array.isArray(userProfile.roles)
              ? userProfile.roles.join(", ")
              : userProfile.roles || "No roles"}
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminProfile;
