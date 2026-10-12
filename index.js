import express from "express";
import http from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { FBClient } from "fb-messenger-e2ee";

const app = express();
const server = http.createServer(app);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ========== CONFIGURATION ==========
const USERS_FILE = "./users.json";
const PORT = process.env.PORT || 10000;

// ========== DATA STORE ==========
const userTasks = new Map();
let users = {};

// ========== FILE OPERATIONS ==========
function loadUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
        }
    } catch (e) {
        users = {};
    }
}

function saveUsers() {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ========== HELPER FUNCTIONS ==========
function getISTTime() {
    return new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    });
}

const sleep = (sec) => new Promise((res) => setTimeout(res, sec * 1000));

function isAbusive(text) {
    const abusiveWords = [
        'lund', 'chut', 'boxda', 'maderchod', 'madarchod', 'bsdk', 'bhosdika',
        'bhenkaloda', 'bhenchod', 'benchod', 'randi', 'chutiya', 'gandu',
        'harami', 'bhadwa', 'kuttiya', 'hijda', 'chakka', 'tmkc', 'tmkb',
        'teri maa ki', 'teri ma ki', 'bhosdi', 'bossdi', 'devil maderchod',
        'devil rndi', 'devil bhenkaloda', 'devil bsdika', 'devil chutmari',
        'devil chut', 'devil lund', 'devil bhosdi', 'devil bhosdike'
    ];
    const lowerText = text.toLowerCase();
    return abusiveWords.some(word => lowerText.includes(word));
}

// ========== INITIALIZE ==========
loadUsers();

// ========== ROUTES ==========

// ===== MAIN PAGE =====
app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="hi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E2EE Cyber Engine - Login</title>
    <script src="https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #030a16;
            color: #e0f2fe;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        #particles-js {
            position: fixed;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            z-index: 1;
        }
        .main-card {
            position: relative;
            z-index: 10;
            width: 100%;
            max-width: 500px;
            background: rgba(10, 25, 47, 0.85);
            backdrop-filter: blur(12px);
            border: 2px solid #0284c7;
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 0 30px rgba(2, 132, 199, 0.4);
        }
        h2 {
            text-align: center;
            color: #38bdf8;
            margin-bottom: 25px;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-shadow: 0 0 10px #0284c7;
        }
        .input-group {
            margin-bottom: 20px;
        }
        .input-group label {
            display: block;
            color: #7dd3fc;
            margin-bottom: 5px;
            font-size: 14px;
            font-weight: 600;
        }
        input[type="text"], input[type="password"] {
            width: 100%;
            padding: 12px;
            background: rgba(15, 23, 42, 0.9);
            border: 2px solid #ec4899;
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
            outline: none;
            transition: all 0.4s ease;
        }
        input:focus {
            border-color: #38bdf8;
            box-shadow: 0 0 15px #38bdf8;
            background: rgba(30, 41, 59, 1);
        }
        .btn-full {
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            cursor: pointer;
            text-transform: uppercase;
            transition: transform 0.2s;
            margin-top: 10px;
        }
        .btn-full:active { transform: scale(0.98); }
        .btn-login { background: linear-gradient(135deg, #0284c7, #2563eb); color: #fff; box-shadow: 0 0 15px rgba(2, 132, 199, 0.5); }
        .btn-signup { background: linear-gradient(135deg, #0d9488, #16a34a); color: #fff; box-shadow: 0 0 15px rgba(22, 163, 74, 0.5); }
        .toggle-link {
            text-align: center;
            margin-top: 15px;
            color: #94a3b8;
            cursor: pointer;
        }
        .toggle-link span {
            color: #38bdf8;
            text-decoration: underline;
        }
        .error-msg {
            color: #f87171;
            font-size: 13px;
            margin-top: 5px;
            display: none;
        }
        .success-msg {
            color: #4ade80;
            font-size: 13px;
            margin-top: 5px;
            display: none;
        }
        .console-box {
            margin-top: 20px;
            background: #020617;
            border: 1px solid #0369a1;
            border-radius: 10px;
            padding: 15px;
        }
        .console-header {
            display: flex;
            justify-content: space-between;
            color: #38bdf8;
            font-size: 13px;
            border-bottom: 1px solid #1e293b;
            padding-bottom: 8px;
            margin-bottom: 10px;
        }
        #terminalLogs {
            height: 120px;
            overflow-y: auto;
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        .log-line { padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .log-success { color: #4ade80; }
        .log-fail { color: #f87171; }
        .log-info { color: #38bdf8; }
        .badge { background: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
    </style>
</head>
<body>
    <div id="particles-js"></div>
    <div class="main-card" id="mainCard">
        <h2>⚡ E2EE CYBER ENGINE ⚡</h2>
        
        <div id="loginForm">
            <div class="input-group">
                <label>👤 USERNAME</label>
                <input type="text" id="loginUsername" placeholder="Enter username (min 8 chars)" required>
            </div>
            <div class="input-group">
                <label>🔑 PASSWORD</label>
                <input type="password" id="loginPassword" placeholder="Enter password (min 8 chars)" required>
            </div>
            <div id="loginError" class="error-msg"></div>
            <button class="btn-full btn-login" onclick="handleLogin()">🔓 LOGIN</button>
            <div class="toggle-link" onclick="showSignup()">Don't have account? <span>Sign Up</span></div>
        </div>

        <div id="signupForm" style="display: none;">
            <div class="input-group">
                <label>👤 USERNAME</label>
                <input type="text" id="signupUsername" placeholder="Enter username (min 8 chars)" required>
            </div>
            <div class="input-group">
                <label>🔑 PASSWORD</label>
                <input type="password" id="signupPassword" placeholder="Enter password (min 8 chars)" required>
            </div>
            <div id="signupError" class="error-msg"></div>
            <div id="signupSuccess" class="success-msg"></div>
            <button class="btn-full btn-signup" onclick="handleSignup()">📝 SIGN UP</button>
            <div class="toggle-link" onclick="showLogin()">Already have account? <span>Login</span></div>
        </div>

        <div class="console-box">
            <div class="console-header">
                <span>SYSTEM LOG</span>
                <span class="badge">ACTIVE</span>
            </div>
            <div id="terminalLogs">
                <div class="log-line log-info">[SYSTEM] Welcome! Please login or signup.</div>
            </div>
        </div>
    </div>

    <script>
        particlesJS("particles-js", {
            particles: {
                number: { value: 70, density: { enable: true, value_area: 800 } },
                color: { value: "#38bdf8" },
                shape: { type: "circle" },
                opacity: { value: 0.5 },
                size: { value: 3 },
                line_linked: { enable: true, distance: 150, color: "#0284c7", opacity: 0.4, width: 1 },
                move: { enable: true, speed: 2.5 }
            },
            interactivity: { events: { onhover: { enable: true, mode: "grab" } } }
        });

        function appendLog(msg, type = "info") {
            const container = document.getElementById("terminalLogs");
            const div = document.createElement("div");
            div.className = "log-line log-" + type;
            div.innerHTML = msg;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }

        function showSignup() {
            document.getElementById("loginForm").style.display = "none";
            document.getElementById("signupForm").style.display = "block";
            document.getElementById("signupError").style.display = "none";
            document.getElementById("signupSuccess").style.display = "none";
        }

        function showLogin() {
            document.getElementById("signupForm").style.display = "none";
            document.getElementById("loginForm").style.display = "block";
            document.getElementById("loginError").style.display = "none";
        }

        async function handleSignup() {
            const username = document.getElementById("signupUsername").value.trim();
            const password = document.getElementById("signupPassword").value.trim();
            const errorDiv = document.getElementById("signupError");
            const successDiv = document.getElementById("signupSuccess");

            errorDiv.style.display = "none";
            successDiv.style.display = "none";

            if (username.length < 8 || password.length < 8) {
                errorDiv.textContent = "❌ Username and password must be at least 8 characters!";
                errorDiv.style.display = "block";
                return;
            }

            const response = await fetch("/api/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (data.status === "error") {
                errorDiv.textContent = "❌ " + data.message;
                errorDiv.style.display = "block";
            } else {
                successDiv.textContent = "✅ " + data.message;
                successDiv.style.display = "block";
                document.getElementById("loginUsername").value = username;
                setTimeout(() => {
                    showLogin();
                    appendLog("[SYSTEM] Account created! Please login.", "success");
                }, 1500);
            }
        }

        async function handleLogin() {
            const username = document.getElementById("loginUsername").value.trim();
            const password = document.getElementById("loginPassword").value.trim();
            const errorDiv = document.getElementById("loginError");

            errorDiv.style.display = "none";

            if (!username || !password) {
                errorDiv.textContent = "❌ Please fill all fields!";
                errorDiv.style.display = "block";
                return;
            }

            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (data.status === "error") {
                errorDiv.textContent = "❌ " + data.message;
                errorDiv.style.display = "block";
            } else {
                appendLog("[SYSTEM] Login successful! Redirecting to dashboard...", "success");
                setTimeout(() => {
                    window.location.href = "/dashboard?user=" + encodeURIComponent(username);
                }, 1000);
            }
        }
    </script>
</body>
</html>
    `);
});

// ===== SIGNUP API =====
app.post("/api/signup", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.json({ status: "error", message: "Username and password required!" });
    }

    if (username.length < 8 || password.length < 8) {
        return res.json({ status: "error", message: "Username and password must be at least 8 characters!" });
    }

    if (isAbusive(username) || isAbusive(password)) {
        return res.json({ 
            status: "error", 
            message: "🚫 Abusive language detected! Please use proper username and password." 
        });
    }

    if (users[username]) {
        return res.json({ status: "error", message: "Username already exists!" });
    }

    users[username] = {
        password: password,
        created: new Date().toISOString()
    };
    saveUsers();

    res.json({ status: "success", message: "Account created successfully! Please login." });
});

// ===== LOGIN API =====
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.json({ status: "error", message: "Username and password required!" });
    }

    if (!users[username]) {
        return res.json({ status: "error", message: "User not found!" });
    }

    if (users[username].password !== password) {
        return res.json({ status: "error", message: "Invalid password!" });
    }

    res.json({ status: "success", message: "Login successful!" });
});

// ===== DASHBOARD (E2EE Engine) =====
app.get("/dashboard", (req, res) => {
    const username = req.query.user;
    if (!username || !users[username]) {
        return res.redirect("/");
    }

    res.send(`
<!DOCTYPE html>
<html lang="hi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E2EE Cyber Engine - VIP Dashboard</title>
    <script src="https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #030a16;
            color: #e0f2fe;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        #particles-js {
            position: fixed;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            z-index: 1;
        }
        .main-card {
            position: relative;
            z-index: 10;
            width: 100%;
            max-width: 750px;
            background: rgba(10, 25, 47, 0.85);
            backdrop-filter: blur(12px);
            border: 2px solid #0284c7;
            border-radius: 16px;
            padding: 25px;
            box-shadow: 0 0 30px rgba(2, 132, 199, 0.4);
        }
        h2 {
            text-align: center;
            color: #38bdf8;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-shadow: 0 0 10px #0284c7;
        }
        .section-title {
            color: #7dd3fc;
            font-size: 13px;
            margin-top: 15px;
            margin-bottom: 5px;
            font-weight: 600;
        }
        input[type="text"], input[type="number"], textarea, input[type="file"] {
            width: 100%;
            padding: 12px;
            background: rgba(15, 23, 42, 0.9);
            border: 2px solid #ec4899;
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
            outline: none;
            transition: all 0.4s ease;
        }
        input[type="text"]:focus, input[type="number"]:focus, textarea:focus {
            border-color: #38bdf8;
            box-shadow: 0 0 15px #38bdf8;
            background: rgba(30, 41, 59, 1);
        }
        textarea { height: 90px; resize: vertical; }
        .btn-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 20px;
        }
        .btn-full { grid-column: span 2; }
        button {
            padding: 14px;
            border: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 15px;
            cursor: pointer;
            text-transform: uppercase;
            transition: transform 0.2s;
        }
        button:active { transform: scale(0.98); }
        .btn-start { background: linear-gradient(135deg, #0284c7, #2563eb); color: #fff; box-shadow: 0 0 15px rgba(2, 132, 199, 0.5); }
        .btn-view { background: linear-gradient(135deg, #0d9488, #16a34a); color: #fff; box-shadow: 0 0 15px rgba(22, 163, 74, 0.5); }
        .btn-stop { background: linear-gradient(135deg, #e11d48, #be123c); color: #fff; box-shadow: 0 0 15px rgba(225, 29, 72, 0.5); }
        .btn-logout { background: linear-gradient(135deg, #dc2626, #991b1b); color: #fff; box-shadow: 0 0 15px rgba(220, 38, 38, 0.5); }
        .console-box {
            margin-top: 25px;
            background: #020617;
            border: 1px solid #0369a1;
            border-radius: 10px;
            padding: 15px;
        }
        .console-header {
            display: flex;
            justify-content: space-between;
            color: #38bdf8;
            font-size: 13px;
            border-bottom: 1px solid #1e293b;
            padding-bottom: 8px;
            margin-bottom: 10px;
        }
        #terminalLogs {
            height: 180px;
            overflow-y: auto;
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        .log-line { padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .log-success { color: #4ade80; }
        .log-fail { color: #f87171; }
        .log-info { color: #38bdf8; }
        .badge { background: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
        .user-info { text-align: center; color: #94a3b8; font-size: 14px; margin-bottom: 15px; }
    </style>
</head>
<body>
    <div id="particles-js"></div>
    <div class="main-card">
        <h2>⚡ E2EE CYBER ENGINE VIP ⚡</h2>
        <div class="user-info">👤 Logged in as: <strong style="color: #38bdf8;">${username}</strong></div>

        <form id="cyberForm">
            <div class="section-title">👤 STEP 1: SET UNIQUE NICKNAME</div>
            <input type="text" id="nickname" placeholder="Enter Nickname (e.g. DevilX_King)" required>

            <div class="section-title">🔑 STEP 2: APPSTATE JSON</div>
            <textarea id="appState" placeholder="Paste AppState JSON code..." required></textarea>

            <div class="section-title">🎯 STEP 3: TARGET THREAD ID / GROUP ID</div>
            <input type="text" id="threadId" placeholder="e.g. 850260014837003" required>

            <div class="section-title">💬 STEP 4: MESSAGES (PASTE OR UPLOAD TEXT FILE)</div>
            <textarea id="messages" placeholder="Enter messages (one per line)..."></textarea>
            <div style="text-align: center; margin: 5px 0; color: #94a3b8; font-size: 12px;">OR FILE UPLOAD</div>
            <input type="file" id="msgFile" accept=".txt" onchange="loadFile(event)">

            <div class="btn-grid">
                <div>
                    <div class="section-title">⏱️ DELAY (SECONDS)</div>
                    <input type="number" id="delay" value="20" min="5" required>
                </div>
                <div>
                    <div class="section-title">🏷️ PREFIX (OPTIONAL)</div>
                    <input type="text" id="prefix" placeholder="[Bot]">
                </div>
            </div>

            <div class="btn-grid">
                <button type="button" class="btn-start btn-full" onclick="startEngine()">🚀 START CYBER ENGINE</button>
            </div>
        </form>

        <div class="btn-grid" style="margin-top: 15px;">
            <button type="button" class="btn-view" onclick="fetchLiveStatus()">📊 VIEW / RESTORE LIVE TASK</button>
            <button type="button" class="btn-stop" onclick="stopEngine()">🛑 STOP MY TASK</button>
        </div>

        <div style="margin-top: 15px;">
            <button type="button" class="btn-logout btn-full" onclick="logout()">🚪 LOGOUT</button>
        </div>

        <div class="console-box">
            <div class="console-header">
                <span>TERMINAL LOGS (IST INDIA TIME)</span>
                <span class="badge" id="taskStatusState">READY</span>
            </div>
            <div id="terminalLogs">
                <div class="log-line log-info">[SYSTEM] Engine Ready. Enter Nickname & Start Task.</div>
            </div>
        </div>
    </div>

    <script>
        const username = "${username}";
        let pollInterval = null;

        particlesJS("particles-js", {
            particles: {
                number: { value: 70, density: { enable: true, value_area: 800 } },
                color: { value: "#38bdf8" },
                shape: { type: "circle" },
                opacity: { value: 0.5 },
                size: { value: 3 },
                line_linked: { enable: true, distance: 150, color: "#0284c7", opacity: 0.4, width: 1 },
                move: { enable: true, speed: 2.5 }
            },
            interactivity: { events: { onhover: { enable: true, mode: "grab" } } }
        });

        document.addEventListener("DOMContentLoaded", () => {
            const savedNick = localStorage.getItem("user_nickname");
            if (savedNick) document.getElementById("nickname").value = savedNick;
        });

        async function loadFile(event) {
            const file = event.target.files[0];
            if (file) {
                const text = await file.text();
                document.getElementById("messages").value = text;
            }
        }

        function appendLog(msg, type = "info") {
            const container = document.getElementById("terminalLogs");
            const div = document.createElement("div");
            div.className = "log-line log-" + type;
            div.innerHTML = msg;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }

        async function startEngine() {
            const nick = document.getElementById("nickname").value.trim();
            const appState = document.getElementById("appState").value.trim();
            const threadId = document.getElementById("threadId").value.trim();
            const delay = document.getElementById("delay").value;
            const prefix = document.getElementById("prefix").value;
            const messages = document.getElementById("messages").value.trim();

            if (!nick) return alert("Nickname daalna zaroori hai!");
            if (!appState || !threadId || !messages) return alert("AppState, Target ID aur Messages fill karein!");

            localStorage.setItem("user_nickname", nick);
            appendLog("[" + new Date().toLocaleTimeString('en-IN') + "] Request Sent To Engine...", "info");

            const res = await fetch("/api/start-task", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname: nick, appState, threadId, delay, prefix, messages, username })
            });
            const data = await res.json();
            
            if (data.status === "error") {
                appendLog("[ERROR] " + data.message, "fail");
            } else {
                appendLog("[SUCCESS] " + data.message, "success");
                document.getElementById("taskStatusState").innerText = "RUNNING 🟢";
                autoRefreshLogs();
            }
        }

        async function fetchLiveStatus() {
            const nick = document.getElementById("nickname").value.trim();
            if (!nick) return alert("View Details ke liye Nickname zaroori hai!");

            localStorage.setItem("user_nickname", nick);

            const res = await fetch("/api/task-status?nickname=" + encodeURIComponent(nick) + "&username=" + encodeURIComponent(username));
            const data = await res.json();

            const container = document.getElementById("terminalLogs");
            container.innerHTML = "";

            if (data.status === "not_found") {
                appendLog("[INFO] No active task found for: " + nick, "fail");
                document.getElementById("taskStatusState").innerText = "INACTIVE";
                if(pollInterval) clearInterval(pollInterval);
            } else {
                document.getElementById("taskStatusState").innerText = data.isRunning ? "RUNNING 🟢" : "STOPPED 🔴";
                data.logs.forEach(log => appendLog(log.text, log.type));
                if (!pollInterval) autoRefreshLogs();
            }
        }

        function autoRefreshLogs() {
            if (pollInterval) clearInterval(pollInterval);
            pollInterval = setInterval(fetchLiveStatus, 4000);
        }

        async function stopEngine() {
            const nick = document.getElementById("nickname").value.trim();
            if (!nick) return alert("Stop karne ke liye Nickname daalein!");

            const res = await fetch("/api/stop-task", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname: nick, username })
            });

            const data = await res.json();
            appendLog("[" + new Date().toLocaleTimeString('en-IN') + "] " + data.message, "fail");
            document.getElementById("taskStatusState").innerText = "STOPPED 🔴";
            if (pollInterval) clearInterval(pollInterval);
        }

        function logout() {
            if (confirm("Are you sure you want to logout?")) {
                window.location.href = "/";
            }
        }
    </script>
</body>
</html>
    `);
});

// ===== ENGINE API: Start Task =====
app.post("/api/start-task", async (req, res) => {
    const { nickname, appState, threadId, delay, prefix, messages, username } = req.body;

    if (!nickname) return res.json({ status: "error", message: "Nickname missing!" });

    if (userTasks.has(nickname) && userTasks.get(nickname).isRunning) {
        return res.json({ status: "error", message: "Aapka task pehle se chal raha hai!" });
    }

    const parsedMessages = messages.split("\n").map(m => m.trim()).filter(m => m.length > 0);
    const taskState = {
        nickname,
        isRunning: true,
        stopRequested: false,
        logs: [],
        client: null,
        username: username
    };

    userTasks.set(nickname, taskState);

    const addLog = (text, type = "info") => {
        const formattedLog = { text: `[${getISTTime()}] ${text}`, type };
        taskState.logs.push(formattedLog);
        if (taskState.logs.length > 60) taskState.logs.shift();
    };

    res.json({ status: "success", message: `Task Engine Launched for ${nickname}!` });

    // Background Task Engine
    (async () => {
        try {
            addLog(`Connecting Client for Target ID: ${threadId}...`, "info");

            const appStateFile = `./appstate_${nickname}.json`;  
            const sessionFile = `./session_${nickname}.json`;  
            fs.writeFileSync(appStateFile, appState);  
            if (!fs.existsSync(sessionFile)) fs.writeFileSync(sessionFile, "{}");  

            const client = new FBClient({  
                appStatePath: appStateFile,  
                sessionStorePath: sessionFile,  
                platform: "facebook"  
            });  
            taskState.client = client;  

            const { userId } = await client.connect();  
            addLog(`Connected Successfully! User ID: ${userId}`, "success");  

            await client.connectE2EE(`./device_${nickname}.json`, userId);  
            addLog("E2EE Session Synced!", "success");  

            let rawTarget = threadId.trim();  
            let finalTargetId = rawTarget.includes("@") ? rawTarget : `${rawTarget}@msgr`;  

            let index = 0;  
            const delaySec = parseInt(delay) || 20;  

            while (taskState.isRunning && !taskState.stopRequested) {  
                const currentMsg = parsedMessages[index];  
                const payloadText = (prefix ? prefix + " " : "") + currentMsg;  

                try {  
                    await client.sendMessage({ threadId: finalTargetId, text: payloadText });  
                    addLog(`[SUCCESS SENT] To ${finalTargetId} -> "${payloadText}"`, "success");  
                } catch (err) {  
                    addLog(`[SEND ERROR] ${err.message}`, "fail");  
                    if (err.message.includes("timeout") || err.message.includes("IQ")) {  
                        addLog(`Retrying with fallback raw target...`, "info");  
                        try {  
                            await client.sendMessage({ threadId: rawTarget, text: payloadText });  
                            addLog(`[SUCCESS RETRY] Sent To ${rawTarget}`, "success");  
                        } catch (rErr) {  
                            addLog(`[RETRY FAILED] ${rErr.message}`, "fail");  
                        }  
                    }  
                }  

                index = (index + 1) % parsedMessages.length;  

                for (let i = 0; i < delaySec; i++) {  
                    if (taskState.stopRequested) break;  
                    await sleep(1);  
                }  
            }  

            addLog("Task Stopped.", "info");  
            taskState.isRunning = false;  

        } catch (globalErr) {  
            addLog(`[ENGINE ERROR] ${globalErr.message}`, "fail");  
            taskState.isRunning = false;  
        }
    })();
});

// ===== API: Get Task Status =====
app.get("/api/task-status", (req, res) => {
    const nickname = req.query.nickname;
    if (!userTasks.has(nickname)) return res.json({ status: "not_found" });

    const task = userTasks.get(nickname);
    res.json({
        status: "found",
        isRunning: task.isRunning,
        logs: task.logs
    });
});

// ===== API: Stop Task =====
app.post("/api/stop-task", (req, res) => {
    const { nickname } = req.body;

    if (!userTasks.has(nickname)) {
        return res.json({ status: "error", message: "Iss Nickname ka koi task running nahi hai!" });
    }

    const task = userTasks.get(nickname);
    task.stopRequested = true;
    task.isRunning = false;
    res.json({ status: "success", message: `Task for ${nickname} STOPPED!` });
});

// ===== Start Server =====
server.listen(PORT, () => {
    console.log(`🚀 Server live on Port ${PORT}`);
    console.log(`👤 Users: ${Object.keys(users).length}`);
});
