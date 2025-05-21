import React, { useState, useEffect, useRef } from "react";
import "../styles/chatbot/chatbotsidepanel.css";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../Firebase";
import { Trash } from "react-feather";

const ChatBotSidePanel = ({
  isPanelOpen,
  togglePanel,
  chatHistory,
  onNewChat,
  onChatSelect,
  user,
  fetchChatHistory,
  activeChatTitle,
}) => {
  const [menuOpenIndex, setMenuOpenIndex] = useState(null);
  const menuRef = useRef(null); // Ref for the menu dropdown

  const handleDeleteChat = async (chatTitle) => {
    const confirmed = window.confirm(`Do you want to delete "${chatTitle}"?`);
    if (!confirmed || !user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "chats", chatTitle));
      await fetchChatHistory(user.uid);
      if (chatTitle === activeChatTitle) {
        onNewChat(); // ← RESET state if the active chat was deleted
      }
    } catch (err) {
      console.error("Error deleting chat:", err);
    }
  };

  useEffect(() => {
    // Close the menu when clicking outside
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpenIndex(null); // Close the menu if clicked outside
      }
    };

    if (menuOpenIndex !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpenIndex]);

  const groupChatsByDate = (chats) => {
    const now = new Date();
    const today = now.setHours(0, 0, 0, 0);
    const yesterday = new Date(today - 86400000);
    const sevenDaysAgo = new Date(today - 7 * 86400000);
    const thirtyDaysAgo = new Date(today - 30 * 86400000);

    const groups = {
      Today: [],
      Yesterday: [],
      "Last 7 Days": [],
      "Last 30 Days": [],
      Older: [],
    };

    chats.forEach(({ title, lastUpdated }) => {
      if (!lastUpdated) return; // skip if timestamp is missing
      const time = lastUpdated.getTime();

      if (time >= today) groups["Today"].push(title);
      else if (time >= yesterday.getTime()) groups["Yesterday"].push(title);
      else if (time >= sevenDaysAgo.getTime())
        groups["Last 7 Days"].push(title);
      else if (time >= thirtyDaysAgo.getTime())
        groups["Last 30 Days"].push(title);
      else groups["Older"].push(title);
    });

    return groups;
  };
  const grouped = groupChatsByDate(chatHistory);

  useEffect(() => {
  const titles = document.querySelectorAll('.chat-title-container');

  titles.forEach((container) => {
    const title = container.querySelector('.chat-title');
    if (!title) return;

    const containerWidth = container.offsetWidth;
    const titleWidth = title.scrollWidth;

    if (titleWidth > containerWidth) {
      const distance = titleWidth - containerWidth;
      const duration = Math.max(4, Math.min(15, distance / 20)); // duration in seconds

      title.style.setProperty('--scroll-distance', `-${distance}px`);
      title.style.setProperty('--scroll-duration', `${duration}s`);
    } else {
      title.style.removeProperty('--scroll-distance');
      title.style.removeProperty('--scroll-duration');
    }
  });
}, [chatHistory]);


  return (
    <>
      <button
        className={`toggle-button ${isPanelOpen ? "hidden" : ""}`}
        onClick={togglePanel}
      >
        <div className="burger">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      <div className={`sidepanel ${isPanelOpen ? "open" : "closed"}`}>
        {isPanelOpen && (
          <button className="close-button" onClick={togglePanel}>
            ✖
          </button>
        )}
        <div className="sidepanel-content">
          <div className="sidepanel-header">
            <h3>ASK ORION</h3>
            <button className="new-chat-button" onClick={onNewChat}>
              New Chat
            </button>
            <h4>Chat History</h4>
          </div>
          <div className="chat-history-scroll">
            <ul>
              {Object.entries(grouped).map(([label, titles]) =>
                titles.length > 0 ? (
                  <div key={label}>
                    <h5>{label}</h5>
                    <ul>
                      {titles.map((title, index) => (
                        <li key={label + index} className="chat-title-wrapper">
                          <div className="chat-title-container">
                            <div
                              className="chat-title"
                              onClick={() => onChatSelect(title)}
                            >
                              {title}
                            </div>
                          </div>

                          <div className="dots-menu">
                            <button
                              onClick={() =>
                                setMenuOpenIndex(
                                  menuOpenIndex === title ? null : title
                                )
                              }
                            >
                              ⋮
                            </button>
                            {menuOpenIndex === title && (
                              <div ref={menuRef} className="menu-dropdown">
                                <button onClick={() => handleDeleteChat(title)}>
                                  <Trash className="delete-icon" size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null
              )}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatBotSidePanel;