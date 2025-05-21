//Chatbot.js
import React, { useState, useEffect, useCallback } from "react";
import { auth, db } from "./Firebase"; // Import Firebase auth and db
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  increment,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom"; // For navigation
import ChatBotSidePanel from "./chatbot components/chatbotsidepanel";
import "./styles/ChatBot.css";

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [knowledge, setKnowledge] = useState("");
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [username, setUsername] = useState(""); // Store logged-in user's username
  const [user, setUser] = useState(null); // Store authenticated user
  const [loadingUser, setLoadingUser] = useState(true); // Track auth state loading
  const [isUsernameLoaded, setIsUsernameLoaded] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(null);
  const [activeChatTitle, setActiveChatTitle] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // Fetch user data from Firestore
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUsername(userSnap.data().username || "User");
        }
        // Fetch chat history once user logs in
        await fetchChatHistory(currentUser.uid);
        setIsUsernameLoaded(true); // Mark username as loaded
      } else {
        setUser(null);
        setLoadingUser(false);
        navigate("/auth");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // console.log("username", username)

  useEffect(() => {
    if (user && isUsernameLoaded) {
      setLoadingUser(false);
    }
  }, [user, isUsernameLoaded]);

  const fetchChatHistory = async (userId) => {
    const chatsRef = collection(db, "users", userId, "chats");
    const chatsQuery = query(chatsRef, orderBy("lastUpdated", "desc"));
    const querySnapshot = await getDocs(chatsQuery);
    const chatTitles = querySnapshot.docs.map((doc) => doc.id);
    setChatHistory(chatTitles);
  };

  const startNewChat = async () => {
    setMessages([]);
    setActiveChatTitle(null);
    if (user) {
      await fetchChatHistory(user.uid);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/auth"); // Redirect to login page after logout
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const generateSuggestions = useCallback((text) => {
    const lines = text.split("\n");
    const questions = lines.filter((line) => line.includes("?"));
    if (questions.length > 0) {
      setSuggestedQuestions(shuffleArray(questions).slice(0, 3));
    }
  }, []);

  useEffect(() => {
    const fetchKnowledge = async () => {
      try {
        const response = await fetch("/brain/knowledge.txt");
        const text = await response.text();
        setKnowledge(text);
        generateSuggestions(text);
      } catch (error) {
        console.error("Failed to load knowledge file:", error);
      }
    };
    fetchKnowledge();
  }, [generateSuggestions]);

  const shuffleArray = (array) => {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const sendMessage = async (message) => {
    if (!message.trim() || !user) return;
    setLoading(true);

    let chatTitle = activeChatTitle;
    if (!activeChatTitle) {
      chatTitle = message.slice(0, 20) || "Untitled Chat";
      setActiveChatTitle(chatTitle);
      setChatHistory((prevChats) => [chatTitle, ...prevChats]);
    }

    const userMessage = {
      role: "user",
      content: message,
      timestamp: serverTimestamp(),
    };

    try {
      const chatRef = doc(db, "users", user.uid, "chats", chatTitle);
      await setDoc(chatRef, { title: chatTitle, lastUpdated: serverTimestamp() }, { merge: true });

      const messagesRef = collection(chatRef, "messages");
      await addDoc(messagesRef, userMessage);

      // 👇 NEW: Update prompts stats
      const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd
      const promptRef = doc(db, "dashboard", "stats", "prompts", today);

      try {
        await updateDoc(promptRef, { count: increment(1) });
      } catch (e) {
        await setDoc(promptRef, { count: 1 }); // fallback if doc doesn't exist yet
      }

      // 👇 Increment overall Prompts counter
      const statsRef = doc(db, "dashboard", "stats");
      try {
        await updateDoc(statsRef, { Prompts: increment(1) });
      } catch (e) {
        await setDoc(statsRef, { Prompts: 1 }, { merge: true });
      }

      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.REACT_APP_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: `Context: ${knowledge}` },
                  {
                    text: `Answer concisely. Only return the direct answer and show a brief explanation.\nUser question: ${message}`,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      let botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error: No response";

      botResponse = botResponse
        .replace(/\*\*([\w\s]+):\*\*\s*/g, "")
        .replace(/^\*\s+/gm, "")
        .replace(/\s*\*\s*/g, " ");

      const botMessage = {
        role: "bot",
        content: botResponse,
        timestamp: serverTimestamp(),
      };

      setMessages((prev) => [...prev, botMessage]);
      await addDoc(messagesRef, botMessage);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [...prev, { role: "bot", content: "Error: Failed to fetch response" }]);
    }

    setLoading(false);
  };

  const handleChatSelection = async (chatTitle) => {
    if (!user) return;

    setActiveChatTitle(chatTitle);
    setMessages([]); // Clear current messages before loading new ones

    const messagesRef = collection(db, "users", user.uid, "chats", chatTitle, "messages");
    const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));
    const querySnapshot = await getDocs(messagesQuery);

    const loadedMessages = querySnapshot.docs.map((doc) => doc.data());
    setMessages(loadedMessages);
  };

  if (loadingUser) {
    return (
      <div className="loading-screen">
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <div
      className={`chatbot-container ${isPanelOpen ? "expanded" : "collapsed"}`}
    >
      {/* Side Panel */}
      <ChatBotSidePanel
        isPanelOpen={isPanelOpen}
        togglePanel={() => setIsPanelOpen(!isPanelOpen)}
        chatHistory={chatHistory}
        onNewChat={startNewChat}
        onChatSelect={handleChatSelection}
        user={user}
        fetchChatHistory={fetchChatHistory}
        activeChatTitle={activeChatTitle}
      />
      {/* Header */}
      <div className="chatbot-header">
        <h2>Welcome, {username}!</h2>
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
      {/* Messages */}
      <div className="messages-container">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>
      {/* Suggestions */}
      <div className="suggestions-container">
        {suggestedQuestions.length > 0 ? (
          suggestedQuestions.map((question, index) => (
            <button
              key={index}
              className="suggestion-button"
              onClick={() => sendMessage(question)}
            >
              {question}
            </button>
          ))
        ) : (
          <p>No suggestions available</p>
        )}
      </div>
      {/* Input */}
      <div className="input-container">
        <input
          className="input-field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
        />
        <button
          className="send-button"
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default ChatBot;
