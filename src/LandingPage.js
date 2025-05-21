"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Orion from "./icons/Orion.png"
import "./styles/LandingPage.css"

const LandingPage = ({ onNext }) => {
  const [startFade, setStartFade] = useState(false)
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

  const handleStart = () => {
    setStartFade(true)
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onNext()
    }, 1000) // Wait for animation to finish
  }

  return (
    <div className="landing-container">
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

      <motion.div
        className="logo-container"
        initial={{ opacity: 0, y: 50 }}
        animate={startFade ? { opacity: 0, y: -50 } : { opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <img src={Orion || "/placeholder.svg"} alt="Orion" className="orion-logo" />
        <h1 className="landing-title">Welcome to Orion!</h1>
      </motion.div>

      <motion.p
        className="manage-orion-p-isolated"
        initial={{ opacity: 0, y: 20 }}
        animate={startFade ? { opacity: 0, y: -30 } : { opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        Sign up or log in to start chatting!
      </motion.p>

      {!loading ? (
        <motion.div
          className="custom-start-button-wrapper"
          onClick={handleStart}
          initial={{ opacity: 0, y: 20 }}
          animate={startFade ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
        >
          <button type="button" className="btn">
            <strong>GET STARTED</strong>
            <div id="container-stars">
              <div id="stars"></div>
            </div>
            <div id="glow">
              <div className="circle"></div>
              <div className="circle"></div>
            </div>
          </button>
        </motion.div>
      ) : (
        <div className="custom-start-button-wrapper">
          <div className="loader">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LandingPage
