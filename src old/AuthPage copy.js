import React, { useState } from "react";
import { auth, provider, db } from "./Firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  deleteUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, increment } from "firebase/firestore";
import Orion from './icons/Orion.png';
import "./styles/AuthPage.css";

const AuthPage = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
const today = new Date().toISOString().split("T")[0];
const [googleLoading, setGoogleLoading] = useState(false);


const handleAuth = async (e) => {
  e.preventDefault();
  setError("");

  if (isSignUp && password !== confirmPassword) {
    setError("Passwords do not match");
    return;
  }

    try {
      if (isSignUp) {
        // Restrict email sign-up to @dyci.edu.ph domain
        // if (!email.endsWith("@dyci.edu.ph")) {
        //   console.error(
        //     "Unauthorized email domain. Only @dyci.edu.ph emails are allowed."
        //   );
        //   alert("Only @dyci.edu.ph emails are allowed.");
        //   return;
        // }

        // Sign up new user
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        console.log("User created:", user.email);

        // Generate username by trimming email before '@'
        const username = email.split("@")[0];

        // Save new user info in Firestore
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
          email: user.email,
          username: username,
          createdAt: new Date(),
          roles: "User",
        });

        console.log(
          "User added to Firestore:",
          user.email,
          "Username:",
          username
        );
      } else {
        // Log in existing user
        await signInWithEmailAndPassword(auth, email, password);
        console.log("User logged in:", email);
      }
      const dashboardRef = doc(db, "dashboard", "stats");
      const dashboardSnap = await getDoc(dashboardRef);
      if (dashboardSnap.exists()) {
        const data = dashboardSnap.data();
        const lastUpdatedDate = data.newUsersTodayDate;
      
        // If it's a new day, reset newUsersToday
        if (lastUpdatedDate !== today) {
          await setDoc(dashboardRef, {
            Users: increment(1),
            newUsersToday: 1,
            newUsersTodayDate: today
          }, { merge: true });
        } else {
          // Same day – just increment
          await setDoc(dashboardRef, {
            Users: increment(1),
            newUsersToday: increment(1)
          }, { merge: true });
        }
      } else {
        // Dashboard stats doc doesn't exist yet
        await setDoc(dashboardRef, {
          Users: 1,
          newUsersToday: 1,
          newUsersTodayDate: today
        });
      }
      onLoginSuccess();
    } catch (error) {
      console.error("Authentication Error:", error);
      setError(error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
  
      if (!user.email.endsWith("@dyci.edu.ph")) {
        console.error("Unauthorized email domain. Only @dyci.edu.ph emails are allowed.");
        alert("Only @dyci.edu.ph emails are allowed.");
        await signOut(auth);
  
        try {
          await deleteUser(user);
          console.log("Unauthorized user deleted from Firebase Auth");
        } catch (error) {
          console.error("Error deleting user:", error);
        }
  
        return;
      }
  
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
  
      const today = new Date().toISOString().split("T")[0]; // e.g. '2025-04-11'
  
      if (!userSnap.exists()) {
        const username = user.email.split("@")[0];
  
        await setDoc(userRef, {
          email: user.email,
          username: username,
          createdAt: new Date(),
          roles: "User",
        });
  
        console.log("New Google user added to Firestore:", user.email, "Username:", username);
  
        const dashboardRef = doc(db, "dashboard", "stats");
        const dashboardSnap = await getDoc(dashboardRef);
  
        if (dashboardSnap.exists()) {
          const data = dashboardSnap.data();
          const lastUpdatedDate = data.newUsersTodayDate;
  
          if (lastUpdatedDate !== today) {
            await setDoc(
              dashboardRef,
              {
                Users: increment(1),
                newUsersToday: 1,
                newUsersTodayDate: today,
              },
              { merge: true }
            );
          } else {
            await setDoc(
              dashboardRef,
              {
                Users: increment(1),
                newUsersToday: increment(1),
              },
              { merge: true }
            );
          }
        } else {
          await setDoc(dashboardRef, {
            Users: 1,
            newUsersToday: 1,
            newUsersTodayDate: today,
          });
        }
  
        // Add to 'signups' subcollection
        const signupsRef = doc(db, "dashboard", "stats", "signups", today);
        await setDoc(signupsRef, { count: increment(1) }, { merge: true });
      } else {
        console.log("User already exists:", user.email);
      }
  
      onLoginSuccess();
    } finally {
      setGoogleLoading(false);
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