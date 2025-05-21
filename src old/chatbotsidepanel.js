//chatbotsidepanel.js
import React from "react";
import "../styles/chatbot/chatbotsidepanel.css";

const ChatBotSidePanel = ({ isPanelOpen, togglePanel, chatHistory, onNewChat, onChatSelect }) => {
  return (
    <>
      <button className={`toggle-button ${isPanelOpen ? "hidden" : ""}`} onClick={togglePanel}>
        <div className="burger">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      <div className={`sidepanel ${isPanelOpen ? "open" : "closed"}`}>
        {isPanelOpen && <button className="close-button" onClick={togglePanel}>✖</button>}
        <div className="sidepanel-content">
          <h3>ASK ORION</h3>
          <button className="new-chat-button" onClick={onNewChat}>New Chat</button>
          <h4>Chat History</h4>
          <ul>
          {chatHistory.length > 0 ? (
              chatHistory.map((title, index) => (
                <li key={index} onClick={() => onChatSelect(title)} className="chat-title">
                  {title}
                </li>
              ))
            ) : (
              <p>No previous chats</p>
            )}
          </ul>
        </div>
      </div>
    </>
  );
};

export default ChatBotSidePanel;
