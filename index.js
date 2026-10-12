import express from "express";
import http from "http";
import fs from "fs";
import path from "path";
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

// Cookie string ko Facebook AppState JSON format mein convert karne ka function
function cookieToAppState(cookieString) {
    try {
        const cookies = cookieString.split(';');
        const appState = [];
        
        for (let cookie of cookies) {
            const parts = cookie.trim().split('=');
            if (parts.length >= 2) {
                const name = parts[0].trim();
                const value = parts.slice(1).join('=').trim();
                appState.push({
                    key: name,
                    value: value,
                    domain: ".facebook.com",
                    path: "/",
                    hostOnly: false,
                    creation: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                });
            }
        }
        return appState;
    } catch (e) {
        return null;
    }
}

// ========== INITIALIZE ==========
loadUsers();

// ========== ROUTES ==========

// ===== MAIN PAGE (LOGIN / SIGNUP) =====
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
        #particles-js { position: fixed; width: 100%; height: 100%; top: 0; left: 0; z-index: 1; }
        .main-card {
            position: relative; z-index: 10; width: 100%; max-width: 500px;
            background: rgba(10, 25, 47, 0.85); backdrop-filter: blur(12px);
            border: 2px solid #0284c7; border-radius: 16px; padding: 30px;
            box-shadow: 0 0 30px rgba(2, 132, 199, 0.4);
        }
        h2 { text-align: center; color: #38bdf8; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 2px; }
        .input-group { margin-bottom: 20px; }
        .input-group label { display: block; color: #7dd3fc; margin-bottom: 5px; font-size: 14px; font-weight: 600; }
        input[type="text"], input[type="password"] {
            width: 100%; padding: 12px; background: rgba(15, 23, 42, 0.9);
            border: 2px solid #ec4899; border-radius: 8px; color: #fff; font-size: 14px; outline: none;
        }
        .btn-full {
            width: 100%; padding: 14px; border: none; border-radius: 8px;
            font-weight: bold; font-size: 16px; cursor: pointer; text-transform: uppercase; margin-top: 10px;
        }
        .btn-login { background: linear-gradient(135deg, #0284c7, #2563eb); color: #fff; }
        .btn-signup { background: linear-gradient(135deg, #0d9488, #16a34a); color: #fff; }
        .toggle-link { text-align: center; margin-top: 15px; color: #94a3b8; cursor: pointer; }
        .toggle-link span { color: #38bdf8; text-decoration: underline; }
        .error-msg, .success-msg { font-size: 13px; margin-top: 5px; display: none; }
        .error-msg { color: #f87171; } .success-msg { color: #4ade80; }
    </style>
</head>
<body>
    <div id="particles-js"></div>
    <div class="main-card">
        <h2>⚡ CYBER ENGINE ⚡</h2>
        <div id="loginForm">
            <div class="input-group">
                <label>👤 USERNAME</label>
                <input type="text" id="loginUsername" placeholder="Enter username (min 4 chars)">
            </div>
            <div class="input-group">
                <label>🔑 PASSWORD</label>
                <input type="password" id="loginPassword" placeholder="Enter password (min 4 chars)">
            </div>
            <div id="loginError" class="error-msg"></div>
            <button class="btn-full btn-login" onclick="handleLogin()">🔓 LOGIN</button>
            <div class="toggle-link" onclick="showSignup()">Don't have account? <span>Sign Up</span></div>
        </div>
        <div id="signupForm" style="display: none;">
            <div class="input-group">
                <label>👤 USERNAME</label>
                <input type="text" id="signupUsername" placeholder="Enter username (min 4 chars)">
            </div>
            <div class="input-group">
                <label>🔑 PASSWORD</label>
                <input type="password" id="signupPassword" placeholder="Enter password (min 4 chars)">
            </div>
            <div id="signupError" class="error-msg"></div>
            <div id="signupSuccess" class="success-msg"></div>
            <button class="btn-full btn-signup" onclick="handleSignup()">📝 SIGN UP</button>
            <div class="toggle-link" onclick="showLogin()">Already have account? <span>Login</span></div>
        </div>
    </div>
    <script>
        particlesJS("particles-js", {
            particles: { number: { value: 50 }, color: { value: "#38bdf8" }, size: { value: 3 }, move: { enable: true, speed: 2 } }
        });
        function showSignup() { document.getElementById("loginForm").style.display = "none"; document.getElementById("signupForm").style.display = "block"; }
        function showLogin() { document.getElementById("signupForm").style.display = "none"; document.getElementById("loginForm").style.display = "block"; }
        
        async function handleSignup() {
            const username = document.getElementById("signupUsername").value.trim();
            const password = document.getElementById("signupPassword").value.trim();
            const res = await fetch("/api/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
            const data = await res.json();
            if(data.status === "error") { alert(data.message); } else { alert(data.message); showLogin(); }
        }

        async function handleLogin() {
            const username = document.getElementById("loginUsername").value.trim();
            const password = document.getElementById("loginPassword").value.trim();
            const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
            const data = await res.json();
            if(data.status === "error") { alert(data.message); } else { window.location.href = "/dashboard?user=" + encodeURIComponent(username); }
        }
    </script>
</body>
</html>
    `);
});

app.post("/api/signup", (req, res) => {
    const { username, password } = req.body;
    if (!username || username.length < 4 || password.length < 4) {
        return res.json({ status: "error", message: "Min 8 characters required!" });
    }
    if (users[username]) return res.json({ status: "error", message: "User already exists!" });
    users[username] = { password };
    saveUsers();
    res.json({ status: "success", message: "Account created!" });
});

app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (!users[username] || users[username].password !== password) {
        return res.json({ status: "error", message: "Invalid credentials!" });
    }
    res.json({ status: "success" });
});

// ===== DASHBOARD =====
app.get("/dashboard", (req, res) => {
    const username = req.query.user;
    if (!username || !users[username]) return res.redirect("/");

    res.send(`
<!DOCTYPE html>
<html lang="hi">
<head>
    <meta charset="UTF-8">
    <title>Dashboard - Cookie Input</title>
    <style>
        body { font-family: Arial, sans-serif; background: #030a16; color: #fff; padding: 20px; display: flex; justify-content: center; }
        .card { width: 100%; max-width: 600px; background: rgba(10, 25, 47, 0.9); padding: 25px; border-radius: 12px; border: 2px solid #0284c7; }
        input, textarea { width: 100%; padding: 10px; margin: 8px 0; background: #0f172a; border: 1px solid #ec4899; color: #fff; border-radius: 6px; }
        button { padding: 12px; width: 100%; background: #0284c7; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 10px; }
        .logs { background: #020617; padding: 10px; height: 180px; overflow-y: auto; font-family: monospace; font-size: 12px; margin-top: 15px; border: 1px solid #0369a1; }
    </style>
</head>
<body>
    <div class="card">
        <h2>⚡ FB COOKIE ENGINE</h2>
        <p>Logged in as: <b>${username}</b></p>
        
        <label>NICKNAME</label>
        <input type="text" id="nickname" placeholder="Enter Nickname">

        <label>FACEBOOK COOKIE (c_user=...; xs=...;)</label>
        <textarea id="cookieInput" placeholder="Paste your Facebook cookie string here..."></textarea>

        <label>TARGET THREAD ID / GROUP ID</label>
        <input type="text" id="threadId" placeholder="Group / Thread ID">

        <label>MESSAGES (One per line)</label>
        <textarea id="messages" placeholder="Enter messages..."></textarea>

        <label>DELAY (SECONDS)</label>
        <input type="number" id="delay" value="20">

        <button onclick="startTask()">🚀 START ENGINE</button>
        <button onclick="stopTask()" style="background: #e11d48;">🛑 STOP TASK</button>

        <div class="logs" id="terminalLogs">[SYSTEM] Ready...</div>
    </div>

    <script>
        const username = "${username}";
        let timer = null;

        async function startTask() {
            const nickname = document.getElementById("nickname").value;
            const cookie = document.getElementById("cookieInput").value;
            const threadId = document.getElementById("threadId").value;
            const messages = document.getElementById("messages").value;
            const delay = document.getElementById("delay").value;

            if(!nickname || !cookie || !threadId || !messages) {
                alert("Sabhi fields bharna zaroori hai!");
                return;
            }

            const res = await fetch("/api/start-task", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname, cookie, threadId, messages, delay, username })
            });
            const data = await res.json();
            alert(data.message);
            if(data.status === "success") pollLogs();
        }

        async function pollLogs() {
            if(timer) clearInterval(timer);
            timer = setInterval(async () => {
                const nick = document.getElementById("nickname").value;
                if(!nick) return;
                const res = await fetch("/api/task-status?nickname=" + encodeURIComponent(nick) + "&username=" + encodeURIComponent(username));
                const data = await res.json();
                if(data.status === "found") {
                    document.getElementById("terminalLogs").innerHTML = data.logs.map(l => l.text).join("<br>");
                }
            }, 3000);
        }

        async function stopTask() {
            const nickname = document.getElementById("nickname").value;
            const res = await fetch("/api/stop-task", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname, username })
            });
            const data = await res.json();
            alert(data.message);
            if(timer) clearInterval(timer);
        }
    </script>
</body>
</html>
    `);
});

// ===== API: Start Task using Cookie =====
app.post("/api/start-task", async (req, res) => {
    const { nickname, cookie, threadId, messages, delay, username } = req.body;
    if (!nickname || !cookie) return res.json({ status: "error", message: "Missing fields!" });

    const appStateArray = cookieToAppState(cookie);
    if (!appStateArray || appStateArray.length === 0) {
        return res.json({ status: "error", message: "Invalid Cookie format!" });
    }

    if (userTasks.has(nickname) && userTasks.get(nickname).isRunning) {
        return res.json({ status: "error", message: "Task already running for this nickname!" });
    }

    const parsedMessages = messages.split("\n").map(m => m.trim()).filter(m => m.length > 0);
    const taskState = { isRunning: true, stopRequested: false, logs: [] };
    userTasks.set(nickname, taskState);

    const addLog = (text, type = "info") => {
        taskState.logs.push({ text: `[${getISTTime()}] ${text}`, type });
        if (taskState.logs.length > 50) taskState.logs.shift();
    };

    res.json({ status: "success", message: "Task started successfully!" });

    (async () => {
        try {
            addLog("Initializing client with Cookie...", "info");
            const appStateFile = `./appstate_${nickname}.json`;
            const sessionFile = `./session_${nickname}.json`;
            
            fs.writeFileSync(appStateFile, JSON.stringify(appStateArray, null, 2));
            if (!fs.existsSync(sessionFile)) fs.writeFileSync(sessionFile, "{}");

            const client = new FBClient({
                appStatePath: appStateFile,
                sessionStorePath: sessionFile,
                platform: "facebook"
            });

            const { userId } = await client.connect();
            addLog(`Connected! User ID: ${userId}`, "success");

            await client.connectE2EE(`./device_${nickname}.json`, userId);
            addLog("E2EE Synced!", "success");

            let finalTargetId = threadId.includes("@") ? threadId : `${threadId}@msgr`;
            let index = 0;
            const delaySec = parseInt(delay) || 20;

            while (taskState.isRunning && !taskState.stopRequested) {
                const msg = parsedMessages[index];
                try {
                    await client.sendMessage({ threadId: finalTargetId, text: msg });
                    addLog(`Sent to ${finalTargetId}: ${msg}`, "success");
                } catch (err) {
                    addLog(`[RETRY/WARN] ${err.message}`, "fail");
                }

                index = (index + 1) % parsedMessages.length;
                for (let i = 0; i < delaySec; i++) {
                    if (taskState.stopRequested) break;
                    await sleep(1);
                }
            }
            taskState.isRunning = false;
        } catch (e) {
            addLog(`Engine Error: ${e.message}`, "fail");
            taskState.isRunning = false;
        }
    })();
});

app.get("/api/task-status", (req, res) => {
    const { nickname, username } = req.query;
    if (!userTasks.has(nickname)) return res.json({ status: "not_found" });
    const task = userTasks.get(nickname);
    res.json({ status: "found", isRunning: task.isRunning, logs: task.logs });
});

app.post("/api/stop-task", (req, res) => {
    const { nickname } = req.body;
    if (!userTasks.has(nickname)) return res.json({ status: "error", message: "Task not found!" });
    const task = userTasks.get(nickname);
    task.stopRequested = true;
    task.isRunning = false;
    res.json({ status: "success", message: "Task stopped!" });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
