// src/admin/components/AdminDashboard.js
import React, { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Cell, PieChart, Pie,
} from "recharts";
import { getFirestore, doc, getDoc, collection, getDocs } from "firebase/firestore";
import "../styles/admin/AdminDashboard.css";

const AdminDashboard = () => {
  const [totalUsers, setTotalUsers] = useState(0);
  const [newUsersToday, setNewUsersToday] = useState(0);
  const [weeklySignups, setWeeklySignups] = useState([]);
  const [monthlySignups, setMonthlySignups] = useState([]);
  const [totalPrompts, setTotalPrompts] = useState(0);
  const [todayPrompts, setTodayPrompts] = useState(0);
  const [weeklyPrompts, setWeeklyPrompts] = useState([]);
  const [monthlyPrompts, setMonthlyPrompts] = useState([]);
  const [promptedCount, setPromptedCount] = useState(0);
  const [suggestedCount, setSuggestedCount] = useState(0);
  const [questionGroups, setQuestionGroups] = useState([]);
  const [hoveredGroup, setHoveredGroup] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);


  useEffect(() => {
    const fetchStats = async () => {
      const db = getFirestore();
      const statsRef = doc(db, "dashboard", "stats");
      const statsSnap = await getDoc(statsRef);

      let total = 0;
      let todayCount = 0;
      let weekData = [];
      let monthMap = {};

      try {
        const pieChartRef = doc(db, "dashboard", "pie chart");
        const pieChartSnap = await getDoc(pieChartRef);
        if (pieChartSnap.exists()) {
          const data = pieChartSnap.data();
          setPromptedCount(data["Prompted Questions"] || 0);
          setSuggestedCount(data["Suggested Questions"] || 0);
        }
      } catch (err) {
        console.error("Failed to fetch pie chart counts:", err);
      }

      try {
        const questionsCol = collection(getFirestore(), "dashboard", "pie chart", "questions");
        const questionSnaps = await getDocs(questionsCol);

        const groupData = [];

        for (const snap of questionSnaps.docs) {
          const title = snap.id;
          const data = snap.data();
          const questions = Object.entries(data).map(([label, count]) => ({
            label,
            count: typeof count === "number" ? count : 0
          }));
          groupData.push({ title, questions });
        }

        setQuestionGroups(groupData);
      } catch (err) {
        console.error("Failed to fetch pie chart question groups:", err);
      }

      if (statsSnap.exists()) {
        const data = statsSnap.data();
        total = data.Users || 0;

        setTotalPrompts(data.Prompts || 0);
        const todayStr = new Date().toISOString().slice(0, 10); // ✅ Renamed to todayStr
        try {
          const todayPromptRef = doc(db, "dashboard", "stats", "prompts", todayStr);
          const todayPromptSnap = await getDoc(todayPromptRef);
          const todayPromptCount = todayPromptSnap.exists() ? (todayPromptSnap.data().count || 0) : 0;
          setTodayPrompts(todayPromptCount);
        } catch (e) {
          console.error("Failed to fetch today's prompts:", e);
        }


        const today = new Date();
        const dateList = [...Array(7)].map((_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          return d.toISOString().slice(0, 10);
        }).reverse();

        const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

        for (const dateStr of dateList) {
          const docRef = doc(db, "dashboard", "stats", "signups", dateStr);
          const snap = await getDoc(docRef);
          const count = snap.exists() ? (snap.data().count || 0) : 0;

          const dayLetter = weekDays[new Date(dateStr).getDay()];
          weekData.push({ date: dayLetter, count });

          if (dateStr === today.toISOString().slice(0, 10)) {
            todayCount = count;
          }
        }

        const signupsCol = collection(db, "dashboard", "stats", "signups");
        const allSignupsSnap = await getDocs(signupsCol);

        const seenDates = new Set();

        allSignupsSnap.forEach(docSnap => {
          const dateStr = docSnap.id;
          if (seenDates.has(dateStr)) return;
          seenDates.add(dateStr);

          const rawCount = docSnap.data().count;
          const count = typeof rawCount === 'number' ? rawCount : parseInt(rawCount, 10) || 0;

          const monthKey = dateStr.slice(0, 7);
          monthMap[monthKey] = (monthMap[monthKey] || 0) + count;
        });

        const currentYear = new Date().getFullYear();
        for (let i = 0; i < 12; i++) {
          const month = String(i + 1).padStart(2, '0');
          const key = `${currentYear}-${month}`;
          monthMap[key] = monthMap[key] || 0;
        }

        const monthLetters = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

        const monthData = Object.entries(monthMap).map(([month, count]) => {
          const monthIndex = parseInt(month.slice(5, 7), 10) - 1;
          return {
            key: month, // e.g., "2025-04" for correct sorting
            month: monthLetters[monthIndex],
            count
          };
        }).sort((a, b) => a.key.localeCompare(b.key));
        console.log("monthMap", monthMap);

        // Weekly Prompts
        let weekPrompts = [];
        for (const dateStr of dateList) {
          const docRef = doc(db, "dashboard", "stats", "prompts", dateStr);
          const snap = await getDoc(docRef);
          const count = snap.exists() ? (snap.data().count || 0) : 0;

          const dayLetter = weekDays[new Date(dateStr).getDay()];
          weekPrompts.push({ date: dayLetter, count });
        }
        setWeeklyPrompts(weekPrompts);

        // Monthly Prompts
        const promptsCol = collection(db, "dashboard", "stats", "prompts");
        const allPromptDocs = await getDocs(promptsCol);
        const promptMonthMap = {};

        allPromptDocs.forEach(docSnap => {
          const dateStr = docSnap.id;
          const count = docSnap.data().count || 0;
          const monthKey = dateStr.slice(0, 7);
          promptMonthMap[monthKey] = (promptMonthMap[monthKey] || 0) + count;
        });

        for (let i = 0; i < 12; i++) {
          const month = String(i + 1).padStart(2, '0');
          const key = `${currentYear}-${month}`;
          promptMonthMap[key] = promptMonthMap[key] || 0;
        }

        const promptMonthData = Object.entries(promptMonthMap).map(([month, count]) => {
          const monthIndex = parseInt(month.slice(5, 7), 10) - 1;
          return {
            key: month,
            month: monthLetters[monthIndex],
            count,
          };
        }).sort((a, b) => a.key.localeCompare(b.key));
        setMonthlyPrompts(promptMonthData);

        setMonthlySignups(monthData);
      }

      setTotalUsers(total);
      setNewUsersToday(todayCount);
      setWeeklySignups(weekData);
    };

    fetchStats();
  }, []);

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Admin Dashboard</h1>

      <div className="stats-cards">
        <div className="card">
          <h3>Total Users</h3>
          <p>{totalUsers}</p>
        </div>
        <div className="card">
          <h3>New Users Today</h3>
          <p>{newUsersToday}</p>
        </div>
        <div className="card">
          <h3>Total Amount of Prompts</h3>
          <p>{totalPrompts}</p>
        </div>
        <div className="card">
          <h3>Amount of Prompts Today</h3>
          <p>{todayPrompts}</p>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-block">
          <h2 className="chart-title">Weekly Signups</h2>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklySignups}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#82ca9d" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-block">
          <h2 className="chart-title">Monthly Signups</h2>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlySignups}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-block">
          <h2 className="chart-title">Weekly Prompts</h2>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyPrompts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#ff7f50" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-block">
          <h2 className="chart-title">Monthly Prompts</h2>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyPrompts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#ffb347" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="chart-block" style={{ display: "flex", gap: "2rem" }}>
        {/* Left: Bar Chart */}
        <div style={{ flex: 1 }}>
          <h2 className="chart-title">Prompted vs Suggested Questions</h2>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={[
                  { name: "Suggested", value: suggestedCount },
                  { name: "Prompted", value: promptedCount },
                ]}
                layout="vertical"
                margin={{ left: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip />
                <Bar dataKey="value" name="Questions">
                  <Cell fill="#8884d8" name="Suggested" />
                  <Cell fill="#82ca9d" name="Prompted" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Question Groups + Pie */}
        <div style={{ flex: 2 }}>
          <h2 className="chart-title">Question Groups (Click to View Breakdown)</h2>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <ul style={{ flex: 1, margin: 0, padding: 0, listStyle: "none" }}>
              {questionGroups.map(group => (
                <li
                  key={group.title}
                  onClick={() => {
                    setSelectedGroup(group);
                    setModalOpen(true);
                  }}
                  style={{
                    padding: "8px",
                    cursor: "pointer",
                    background: selectedGroup?.title === group.title ? "#f0f0f0" : "transparent",
                    borderRadius: "4px"
                  }}
                >
                  {group.title}
                </li>
              ))}
            </ul>

            <div style={{ flex: 2 }}>
            {modalOpen && selectedGroup && (
  <div style={{
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    overflow: "auto",
    padding: "2rem"
  }}>
    <div style={{
      backgroundColor: "#fff",
      padding: "20px",
      borderRadius: "8px",
      width: "100%",
      maxWidth: "700px",
      maxHeight: "90vh",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 0 20px rgba(0,0,0,0.3)",
    }}>
      <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>{selectedGroup.title}</h3>

      <div style={{ height: "300px", width: "100%" }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={selectedGroup.questions}
              dataKey="count"
              nameKey="label"
              outerRadius={100}
              label
            >
              {selectedGroup.questions.map((entry, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  name={entry.label}
                  fill={["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#a4de6c", "#d0ed57"][idx % 6]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Scrollable Legend */}
      <div style={{
        maxHeight: "200px",
        overflowY: "auto",
        marginTop: "1rem",
        paddingRight: "0.5rem",
      }}>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {selectedGroup.questions.map((entry, idx) => (
            <li key={idx} style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
              <div style={{
                width: 12,
                height: 12,
                backgroundColor: ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#a4de6c", "#d0ed57"][idx % 6],
                marginRight: 8,
                borderRadius: "2px"
              }} />
              <span>{entry.label} ({entry.count})</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => setModalOpen(false)}
        style={{
          marginTop: "1.5rem",
          padding: "8px 16px",
          backgroundColor: "#8884d8",
          color: "white",
          backgroundColor: "#f44336",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          alignSelf: "flex-end"
        }}
      >
        Close
      </button>
    </div>
  </div>
)}
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default AdminDashboard;
