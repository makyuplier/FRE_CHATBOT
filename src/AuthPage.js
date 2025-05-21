"use client"

import { useState, useEffect } from "react"
import { auth, provider, db } from "./Firebase"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  deleteUser,
  sendPasswordResetEmail,
} from "firebase/auth"
import { doc, getDoc, setDoc, increment } from "firebase/firestore"
import Orion from "./icons/Orion.png"
import Swal from "sweetalert2"
import { Eye, EyeOff } from "react-feather"
import "./styles/AuthPage.css"

const AuthPage = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false)
  const [isResetPassword, setIsResetPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const today = new Date().toISOString().split("T")[0]
  const [canResend, setCanResend] = useState(true)
  const [timer, setTimer] = useState(60)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stars, setStars] = useState([])

  // Generate random stars for the background
  useEffect(() => {
    const generateStars = () => {
      const newStars = []
      const starCount = window.innerWidth < 768 ? 100 : 200

      for (let i = 0; i < starCount; i++) {
        newStars.push({
          id: i,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          size: `${Math.random() * 2 + 1}px`,
          animationDuration: `${Math.random() * 3 + 2}s`,
        })
      }
      setStars(newStars)
    }

    generateStars()

    // Regenerate stars on window resize for responsiveness
    const handleResize = () => {
      generateStars()
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError("")

    if (!email) {
      setError("Please enter your email address.")
      return
    }

    try {
      await sendPasswordResetEmail(auth, email)

      Swal.fire({
        icon: "success",
        title: "Email Sent!",
        text: "Password reset email has been sent. Please check your inbox.",
        confirmButtonColor: "#3085d6",
      })

      setCanResend(false)
      setTimer(60)

      const countdown = setInterval(() => {
        setTimer((prev) => {
          if (prev === 1) {
            clearInterval(countdown)
            setCanResend(true)
            return 60
          }
          return prev - 1
        })
      }, 1000)
    } catch (error) {
      console.error("Password reset error:", error)
      setError(error.message)
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
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
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const user = userCredential.user

        console.log("User created:", user.email)

        // Generate username by trimming email before '@'
        const username = email.split("@")[0]

        // Save new user info in Firestore
        const userRef = doc(db, "users", user.uid)
        await setDoc(userRef, {
          email: user.email,
          username: username,
          createdAt: new Date(),
          roles: "User",
          address: "",
          contactNum: "",
          emergencyContactPerson: "",
          emergencyContactNum: "",
        })

        console.log("User added to Firestore:", user.email, "Username:", username)
      } else {
        // Log in existing user
        await signInWithEmailAndPassword(auth, email, password)
        console.log("User logged in:", email)
      }
      const dashboardRef = doc(db, "dashboard", "stats")
      const dashboardSnap = await getDoc(dashboardRef)
      if (dashboardSnap.exists()) {
        const data = dashboardSnap.data()
        const lastUpdatedDate = data.newUsersTodayDate

        // If it's a new day, reset newUsersToday
        if (lastUpdatedDate !== today) {
          await setDoc(
            dashboardRef,
            {
              Users: increment(1),
              newUsersToday: 1,
              newUsersTodayDate: today,
            },
            { merge: true },
          )
        } else {
          // Same day – just increment
          await setDoc(
            dashboardRef,
            {
              Users: increment(1),
              newUsersToday: increment(1),
            },
            { merge: true },
          )
        }
      } else {
        // Dashboard stats doc doesn't exist yet
        await setDoc(dashboardRef, {
          Users: 1,
          newUsersToday: 1,
          newUsersTodayDate: today,
        })
      }
      onLoginSuccess()
    } catch (error) {
      console.error("Authentication Error:", error)
      setError(error.message)
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (googleLoading) return
    setGoogleLoading(true)
    try {
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      if (!user.email.endsWith("@dyci.edu.ph")) {
        console.error("Unauthorized email domain. Only @dyci.edu.ph emails are allowed.")
        alert("Only @dyci.edu.ph emails are allowed.")
        await signOut(auth)

        try {
          await deleteUser(user)
          console.log("Unauthorized user deleted from Firebase Auth")
        } catch (error) {
          console.error("Error deleting user:", error)
        }

        return
      }

      const userRef = doc(db, "users", user.uid)
      const userSnap = await getDoc(userRef)

      const today = new Date().toISOString().split("T")[0] // e.g. '2025-04-11'

      if (!userSnap.exists()) {
        const username = user.email.split("@")[0]

        await setDoc(userRef, {
          email: user.email,
          username: username,
          createdAt: new Date(),
          roles: "User",
          address: "",
          contactNum: "",
          emergencyContactPerson: "",
          emergencyContactNum: "",
        })

        console.log("New Google user added to Firestore:", user.email, "Username:", username)

        const dashboardRef = doc(db, "dashboard", "stats")
        const dashboardSnap = await getDoc(dashboardRef)

        if (dashboardSnap.exists()) {
          const data = dashboardSnap.data()
          const lastUpdatedDate = data.newUsersTodayDate

          if (lastUpdatedDate !== today) {
            await setDoc(
              dashboardRef,
              {
                Users: increment(1),
                newUsersToday: 1,
                newUsersTodayDate: today,
              },
              { merge: true },
            )
          } else {
            await setDoc(
              dashboardRef,
              {
                Users: increment(1),
                newUsersToday: increment(1),
              },
              { merge: true },
            )
          }
        } else {
          await setDoc(dashboardRef, {
            Users: 1,
            newUsersToday: 1,
            newUsersTodayDate: today,
          })
        }

        // Add to 'signups' subcollection
        const signupsRef = doc(db, "dashboard", "stats", "signups", today)
        await setDoc(signupsRef, { count: increment(1) }, { merge: true })
      } else {
        console.log("User already exists:", user.email)
      }

      onLoginSuccess()
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="auth-container">
      {/* Space background elements */}
      <div className="space-background">
        {stars.map((star) => (
          <div
            key={star.id}
            className="star"
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              animationDuration: star.animationDuration,
            }}
          />
        ))}
        <div className="nebula nebula-1"></div>
        <div className="nebula nebula-2"></div>
        <div className="nebula nebula-3"></div>
      </div>

      <h2>{isResetPassword ? "Reset Password" : isSignUp ? "Sign Up" : "Log In"}</h2>

      <div className="auth-card">
        <div className="logo-container">
          <img src={Orion || "/placeholder.svg"} alt="Orion Logo" className="orion-logo" />
        </div>

        {error && <p className="error-message">{error}</p>}

        <form onSubmit={isResetPassword ? handleResetPassword : handleAuth}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          {!isResetPassword && (
            <>
              <div className="password-container">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span onClick={() => setShowPassword((prev) => !prev)} className="password-toggle">
                  {showPassword ? <EyeOff /> : <Eye />}
                </span>
              </div>
              {isSignUp && (
                <div className="password-container">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <span onClick={() => setShowConfirmPassword((prev) => !prev)} className="password-toggle">
                    {showConfirmPassword ? <EyeOff /> : <Eye />}
                  </span>
                </div>
              )}
            </>
          )}
          <button
            type="submit"
            disabled={(isResetPassword && !canResend) || loading}
            className={loading ? "button-loading" : ""}
          >
            {loading ? (
              <div className="cosmic-loader">
                <div className="cosmic-dot"></div>
                <div className="cosmic-dot"></div>
                <div className="cosmic-dot"></div>
              </div>
            ) : isResetPassword ? (
              !canResend ? (
                `Resend in ${timer}s`
              ) : (
                "Send Reset Email"
              )
            ) : isSignUp ? (
              "Sign Up"
            ) : (
              "Log In"
            )}
          </button>
        </form>

        {!isSignUp && !isResetPassword && (
          <p
            className="forgot-password"
            onClick={() => setIsResetPassword(true)}
            style={{ cursor: "pointer", marginTop: "10px" }}
          >
            Forgot Password?
          </p>
        )}

        {isResetPassword && (
          <p>
            <span className="toggle-text" onClick={() => setIsResetPassword(false)}>
              Back to Login
            </span>
          </p>
        )}

        {!isResetPassword && (
          <>
            <p1 className="divider">or</p1>
            <button className="google-signin" onClick={handleGoogleSignIn} disabled={googleLoading}>
              <span className="google-icon"></span>
              {googleLoading ? (
                <div className="cosmic-loader google-loader">
                  <div className="cosmic-dot"></div>
                  <div className="cosmic-dot"></div>
                  <div className="cosmic-dot"></div>
                </div>
              ) : (
                "Login with Google"
              )}
            </button>

            <p>
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <span className="toggle-text" onClick={() => setIsSignUp(false)}>
                    Log in
                  </span>
                </>
              ) : (
                <>
                  Don't have an account?{" "}
                  <span className="toggle-text" onClick={() => setIsSignUp(true)}>
                    Sign up
                  </span>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default AuthPage
