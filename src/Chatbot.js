"use client";

//Chatbot.js
import { useState, useEffect } from "react";
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
  const [allQuestions, setAllQuestions] = useState([]);
  const [username, setUsername] = useState(""); // Store logged-in user's username
  const [userRole, setUserRole] = useState(""); // Store logged-in user's role
  const [user, setUser] = useState(null); // Store authenticated user
  const [loadingUser, setLoadingUser] = useState(true); // Track auth state loading
  const [isUsernameLoaded, setIsUsernameLoaded] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(null);
  const [activeChatTitle, setActiveChatTitle] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState("MOA_new");
  const [stars, setStars] = useState([]);
  const navigate = useNavigate();

  // Generate random stars for the loading screen background
  useEffect(() => {
    if (loadingUser) {
      const generateStars = () => {
        const newStars = [];
        const starCount = window.innerWidth < 768 ? 100 : 200;

        for (let i = 0; i < starCount; i++) {
          newStars.push({
            id: i,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            size: `${Math.random() * 2 + 1}px`,
            animationDuration: `${Math.random() * 3 + 2}s`,
          });
        }
        setStars(newStars);
      };

      generateStars();

      // Regenerate stars on window resize for responsiveness
      const handleResize = () => {
        generateStars();
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [loadingUser]);

  const handleAdminClick = () => {
    navigate("/admin");
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // Fetch user data from Firestore
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setUsername(data.username || "User");
          setUserRole(data.roles || ""); // 👈 Get role here
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

  useEffect(() => {
    fetchKnowledgeFromFirestore(selectedTopic);
  }, []);

  const fetchChatHistory = async (userId) => {
    const chatsRef = collection(db, "users", userId, "chats");
    const chatsQuery = query(chatsRef, orderBy("lastUpdated", "desc"));
    const querySnapshot = await getDocs(chatsQuery);
    const chats = querySnapshot.docs.map((doc) => ({
      title: doc.id,
      lastUpdated: doc.data().lastUpdated?.toDate() || new Date(0),
    }));
    setChatHistory(chats);
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

  const handleQuestionClick = async (question) => {
    sendMessage(question, true); // ✅ pass true to mark as suggestion
    generateSuggestions(allQuestions);

    const topic = selectedTopic?.trim();
    const documentTitle = "Endorsement-Letter-Final-Bayani";
    if (!topic || !question || !documentTitle) return;

    try {
      const questionRef = doc(db, "dashboard", "pie chart", "questions", topic);
      await setDoc(questionRef, { [question]: increment(1) }, { merge: true });

      const pieChartRef = doc(db, "dashboard", "pie chart");
      await updateDoc(pieChartRef, { "Suggested Questions": increment(1) });
    } catch (err) {
      console.error(
        "Failed to increment question or suggested questions:",
        err
      );
    }
  };

  const generateSuggestions = (questionsList) => {
    const shuffled = shuffleArray(questionsList);
    const nextSuggestions = shuffled.slice(0, 3);

    // Avoid updating with the same array
    if (
      JSON.stringify(nextSuggestions) !== JSON.stringify(suggestedQuestions)
    ) {
      setSuggestedQuestions(nextSuggestions);
    } else {
      // Try again to get a different order
      generateSuggestions(shuffled);
    }
  };

  const fetchKnowledgeFromFirestore = async (selectedTopic = "MOA_new") => {
    try {
      const knowledgeCollection = collection(db, "knowledge");
      const querySnapshot = await getDocs(knowledgeCollection);

      const topics = [];
      for (const docSnap of querySnapshot.docs) {
        const topicId = docSnap.id;
        topics.push(topicId);
        if (topicId === selectedTopic) {
          setSelectedTopic(topicId); // ✅ update selected topic for dropdown
          const data = docSnap.data();
          const content = data.content || "";
          const questions = (data.questions || "")
            .split("\n")
            .filter((q) => q.includes("?"));
          setKnowledge(content);
          setAllQuestions(questions);
          generateSuggestions(questions);
        }
      }
      setAvailableTopics(topics);
    } catch (err) {
      console.error("Error fetching knowledge topics:", err);
    }
  };

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const sendMessage = async (message, isFromSuggestion = false) => {
    if (!message.trim() || !user) return;
    setLoading(true);

    const topic = selectedTopic?.trim();

    if (!isFromSuggestion && topic) {
      try {
        const questionRef = doc(
          db,
          "dashboard",
          "pie chart",
          "questions",
          topic
        );
        await setDoc(
          questionRef,
          { "other questions": increment(1) },
          { merge: true }
        );
      } catch (err) {
        console.error("Failed to increment 'Other questions':", err);
      }
    }

    if (!isFromSuggestion) {
      try {
        const pieChartRef = doc(db, "dashboard", "pie chart");
        await updateDoc(pieChartRef, {
          "Prompted Questions": increment(1),
        });
      } catch (err) {
        console.error(
          "Failed to increment Prompted Questions in pie chart:",
          err
        );
      }
    }

    let chatTitle = activeChatTitle;
    if (!activeChatTitle) {
      chatTitle = message.slice(0, 100) || "Untitled Chat";
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
      await setDoc(
        chatRef,
        { title: chatTitle, lastUpdated: serverTimestamp() },
        { merge: true }
      );

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
      let botResponse =
        data.candidates?.[0]?.content?.parts?.[0]?.text || "Error: No response";

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

      // ✅ Add this line to re-shuffle suggestions
      generateSuggestions(allQuestions);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: "Error: Failed to fetch response" },
      ]);
    }

    setLoading(false);
  };

  const handleChatSelection = async (chatTitle) => {
    if (!user) return;

    setActiveChatTitle(chatTitle);
    setMessages([]); // Clear current messages before loading new ones

    const messagesRef = collection(
      db,
      "users",
      user.uid,
      "chats",
      chatTitle,
      "messages"
    );
    const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));
    const querySnapshot = await getDocs(messagesQuery);

    const loadedMessages = querySnapshot.docs.map((doc) => doc.data());
    setMessages(loadedMessages);
  };

  if (loadingUser) {
    return (
      <div className="loading-screen">
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

        <div className="orbital-loader">
          <div className="orbit">
            <div className="satellite"></div>
          </div>
          <div className="orbit">
            <div className="satellite"></div>
          </div>
          <div className="orbit">
            <div className="satellite"></div>
          </div>
          <div className="center"></div>
        </div>

        <h2>Orion</h2>
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
        <div className="header-buttons">
          {["Admin", "Super Admin"].includes(userRole) && (
            <button className="launch-button" onClick={handleAdminClick}>
              <svg
                height="24"
                width="24"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path fill="none" d="M0 0h24v24H0z" />
                <path
                  d="M12 14v2a6 6 0 0 0-6 6H4a8 8 0 0 1 8-8zm0-1c-3.315 0-6-2.685-6-6s2.685-6 6-6 6 2.685 6 6-2.685 6-6 6zm0-2c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm9 6h1v5h-8v-5h1v-1a3 3 0 0 1 6 0v1zm-2 0v-1a1 1 0 0 0-2 0v1h2z"
                  fill="currentColor"
                />
              </svg>
              <span>Admin</span>
            </button>
          )}
          <button className="logout-button-alt" onClick={handleLogout}>
            <div className="logout-icon">
              <svg viewBox="0 0 512 512" fill="white">
                <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"></path>
              </svg>
            </div>
            <div className="logout-label">Logout</div>
          </button>
        </div>
      </div>

      {/* Dropdown */}
      <div className="knowledge-selector">
        <label htmlFor="knowledge-dropdown">Select A Topic: </label>
        <select
          id="knowledge-dropdown"
          value={selectedTopic}
          onChange={(e) => {
            setSelectedTopic(e.target.value);
            fetchKnowledgeFromFirestore(e.target.value);
          }}
        >
          {availableTopics.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
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
              onClick={() => handleQuestionClick(question)}
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
