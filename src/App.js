import React, { useState, useEffect, Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import LandingPage from "./LandingPage";
import AuthPage from "./AuthPage";
import AdminPage from "./AdminPage";
import { auth } from "./Firebase";
import { onAuthStateChanged } from "firebase/auth";
import "./styles/ChatBot.css"; // Ensure styles are applied early

// Lazy load ChatBot
const ChatBot = lazy(() => import("./Chatbot"));

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPageWrapper />} />
        <Route path="/auth" element={<AuthPageWrapper />} />
        <Route
          path="/chat"
          element={
            <Suspense fallback={<LoadingScreen />}>
              <ChatBotWrapper />
            </Suspense>
          }
        />
        <Route path="/admin/*" element={<AdminPage />} />{" "}
        {/* Handle nested routes */}
      </Routes>
    </Router>
  );
};

// Wrapper to handle navigation in LandingPage
const LandingPageWrapper = () => {
  const navigate = useNavigate();
  return <LandingPage onNext={() => navigate("/auth")} />;
};

// Wrapper to handle login success in AuthPage
const AuthPageWrapper = () => {
  const navigate = useNavigate();
  return <AuthPage onLoginSuccess={() => navigate("/chat")} />;
};

// Wrapper to persist authentication in ChatBot
const ChatBotWrapper = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  if (loading) return <LoadingScreen />;

  return <ChatBot />;
};

// Styled Loading Screen Component
const LoadingScreen = () => (
  <div className="loading-screen">
    <h2>Loading...</h2>
  </div>
);

export default App;
