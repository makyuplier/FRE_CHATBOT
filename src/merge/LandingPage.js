import React from "react";
import Orion from './icons/Orion.png';
import "./styles/LandingPage.css";

const LandingPage = ({ onNext }) => {
  return (
    <div className="landing-container">
      <div className="logo-container">
        <img src={Orion} alt="Orion" className="orion-logo" />
        <h1>Welcome to Orion!</h1>
      </div>
      <p>Sign up or log in to start chatting!</p>
      <button className="start-button" onClick={onNext}>
        Get Started
      </button>
    </div>
  );
};

export default LandingPage;