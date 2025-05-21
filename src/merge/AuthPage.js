import React, { useState } from "react";
import { auth, provider, db } from "./Firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  deleteUser
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Orion from './icons/Orion.png';
import "./styles/AuthPage.css";

const AuthPage = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
  
    try {
      if (isSignUp) {
        // Sign up new user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
  
        console.log("User created:", user.email);
  
        // Generate username by trimming email before '@'
        const username = email.split("@")[0];
  
        // Save new user info in Firestore
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
          email: user.email,
          username: username,  // Add the trimmed username
          createdAt: new Date(),
          roles:("User"),
        })
        .then(() => console.log("User added to Firestore:", user.email, "Username:", username))
        .catch((err) => console.error("Firestore Write Error:", err));
      } else {
        // Log in existing user
        await signInWithEmailAndPassword(auth, email, password);
        console.log("User logged in:", email);
      }
  
      onLoginSuccess();
    } catch (error) {
      console.error("Authentication Error:", error);
      setError(error.message);
    }
  };
    
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
  
      // // Check if the email ends with "@dyci.edu.ph"
      // if (!user.email.endsWith("@dyci.edu.ph")) {
      //   console.error("Unauthorized email domain. Only @dyci.edu.ph emails are allowed.");
      //   alert("Only @dyci.edu.ph emails are allowed.");
  
      //   // Sign out the user
      //   await signOut(auth);
  
      //   // Delete the user from Firebase Authentication
      //   await deleteUser(user)
      //     .then(() => console.log("Unauthorized user deleted from Firebase Auth"))
      //     .catch((error) => console.error("Error deleting user:", error));
  
      //   return; // Stop execution
      // }
  
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
  
      if (!userSnap.exists()) {
        // Generate username by trimming email before '@'
        const username = user.email.split("@")[0];
  
        // Save new Google user to Firestore
        await setDoc(userRef, {
          email: user.email,
          username: username,
          createdAt: new Date(),
          roles: "User",
        });
  
        console.log("New Google user added to Firestore:", user.email, "Username:", username);
      } else {
        console.log("User already exists:", user.email);
      }
  
      onLoginSuccess();
    } catch (error) {
      console.error("Google Sign-In Error:", error);
    }
  };

  
  return (
    <div className="auth-container">
      <h2>{isSignUp ? "Sign Up" : "Log In"}</h2>
      
      {/* login and signup container */}
      <div className="auth-card">
        {/* Orion logo */}
        <div className="logo-container">
          <img src={Orion} alt="Orion Logo" className="orion-logo" />
        </div>
        
        {error && <p className="error-message">{error}</p>}
        
        <form onSubmit={handleAuth}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">{isSignUp ? "Sign Up" : "Log In"}</button>
        </form>
        
        <p1 className="divider">or</p1>
        
        <button className="google-signin" onClick={handleGoogleSignIn}>
          <span className="google-icon"></span>
          Login with Google
        </button>

        <p>
          {isSignUp 
            ? <>Already have an account? <span className="toggle-text" onClick={() => setIsSignUp(false)}>Log in</span></>
            : <>Don't have an account? <span className="toggle-text" onClick={() => setIsSignUp(true)}>Sign up</span></>
          }
        </p>
      </div>
    </div>
  );
};

export default AuthPage;