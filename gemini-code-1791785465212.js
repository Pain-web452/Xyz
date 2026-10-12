import express from "express";
import http from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const app = express();
const server = http.createServer(app);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ========== CONFIGURATION ==========
const USERS_FILE = "./users.json";
const APPROVAL_FILE = "./approval.txt";
const PORT = process.env.PORT || 10000;

// ========== DATA STORE ==========
const userTasks = new Map();
let users = {};
let approvedKeys = new Set();
let pendingApprovals = new Map();

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

function loadApprovedKeys() {
    try {
        if (fs.existsSync(APPROVAL_FILE)) {
            const data = fs.readFileSync(APPROVAL_FILE, "utf8");
            approvedKeys = new Set(data.split("\n").filter(k => k.trim()));
            console.log(`✅ Loaded ${approvedKeys.size} approved keys from approval.txt`);
        }
    } catch (e) {
        approvedKeys = new Set();
        console.log("⚠️ No approval.txt found, creating new one");
        fs.writeFileSync(APPROVAL_FILE, "");
    }
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
        'harami', 'bhadwa', 'kuttiya', 'hijda', 'chakka', 'tmkc', 'tmkb'
    ];
    const lowerText = text.toLowerCase();
    return abusiveWords.some(word => lowerText.includes(word));
}

function generateApprovalKey(ip, device, username) {
    const hash = crypto.createHash('sha256');
    hash.update(`${ip}|${device}|${username}|${Date.now()}`);
    return hash.digest('hex').substring(0, 16);
}

function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           req.ip || 
           'unknown';
}

function getDeviceInfo(req) {
    return req.headers['user-agent'] || 'unknown';
}

// ========== INITIALIZE ==========
loadUsers();
loadApprovedKeys();

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
        .error-msg { color: #f87171; }
        .success-msg { color: #4ade80; }
        .console-box { margin-top: 20px; background: #020617; border: 1px solid #0369a1; border-radius: 10px; padding: 15px; }
        #terminalLogs { height: 120px; overflow-y: auto; font-family: monospace; font-size: 12px; color: #38bdf8; }
    </style>
</head>
<body>
    <div id="particles-js"></div>
    <div class="main-card">
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
            <div id="terminalLogs">[SYSTEM] Welcome! Please login or signup.</div>
        </div>
    </div>
    <script>
        function showSignup() {
            document.getElementById("loginForm").style.display = "none";
            document.getElementById("signupForm").style.display = "block";
        }
        function showLogin() {
            document.getElementById("signupForm").style.display = "none";
            document.getElementById("loginForm").style.display = "block";
        }
        async function handleSignup() {
            const username = document.getElementById("signupUsername").value.trim();
            const password = document.getElementById("signupPassword").value.trim();
            const res = await fetch("/api/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.status === "error") {
                alert(data.message);
            } else {
                alert(data.message);
                showLogin();
            }
        }
        async function handleLogin() {
            const username = document.getElementById("loginUsername").value.trim();
            const password = document.getElementById("loginPassword").value.trim();
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.status === "error") {
                alert(data.message);
            } else {
                window.location.href = "/approval?user=" + encodeURIComponent(username);
            }
        }
    </script>
</body>
</html>
    `);
});

// ===== SIGNUP & LOGIN APIs =====
app.post("/api/signup", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password || username.length < 8 || password.length < 8) {
        return res.json({ status: "error", message: "Username & password must be at least 8 chars!" });
    }
    if (users[username]) return res.json({ status: "error", message: "User already exists!" });
    users[username] = { password, created: new Date().toISOString() };
    saveUsers();
    res.json({ status: "success", message: "Account created!" });
});

app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (!users[username] || users[username].password !== password) {
        return res.json({ status: "error", message: "Invalid credentials!" });
    }
    res.json({ status: "success", message: "Login successful!" });
});

// ===== APPROVAL PAGE =====
app.get("/approval", (req, res) => {
    const username = req.query.user;
    if (!username || !users[username]) return res.redirect("/");
    res.send(`
<!DOCTYPE html>
<html lang="hi">
<head>
    <meta charset="UTF-8">
    <title>Approval System</title>
    <style>
        body { background: #030a16; color: #e0f2fe; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; }
        .card { background: rgba(10, 25, 47, 0.85); padding: 30px; border-radius: 12px; border: 2px solid #0284c7; width: 400px; text-align: center; }
        .key-box { background: #020617; padding: 10px; color: #38bdf8; margin: 15px 0; word-break: break-all; font-family: monospace; }
        button { padding: 10px 20px; background: #16a34a; color: white; border: none; border-radius: 6px; cursor: pointer; width: 100%; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="card">
        <h2>🔐 Approval System</h2>
        <p id="status">Checking status...</p>
        <div class="key-box" id="keyDisplay">Loading key...</div>
        <button onclick="copyKey()">Copy Key</button>
        <button onclick="checkGo()" style="background: #0284c7;">Go to Dashboard</button>
    </div>
    <script>
        const username = "${username}";
        let currentKey = "";
        async function fetchKey() {
            const res = await fetch("/api/get-key?username=" + encodeURIComponent(username));
            const data = await res.json();
            if(data.status === "success") {
                currentKey = data.key;
                document.getElementById("keyDisplay").innerText = currentKey;
            }
        }
        async function checkStatus() {
            const res = await fetch("/api/check-approval?username=" + encodeURIComponent(username));
            const data = await res.json();
            if(data.status === "approved") {
                document.getElementById("status").innerHTML = "✅ APPROVED";
            } else {
                document.getElementById("status").innerHTML = "⏳ PENDING APPROVAL";
            }
        }
        function copyKey() { navigator.clipboard.writeText(currentKey); alert("Copied!"); }
        function checkGo() { window.location.href = "/dashboard?user=" + encodeURIComponent(username); }
        fetchKey();
        checkStatus();
    </script>
</body>
</html>
    `);
});

// ===== APIs for Key & Approval =====
app.get("/api/get-key", (req, res) => {
    const username = req.query.username;
    if (!users[username]) return res.json({ status: "error" });
    const ip = getClientIP(req);
    const device = getDeviceInfo(req);
    const key = generateApprovalKey(ip, device, username);
    if (!pendingApprovals.has(username)) {
        pendingApprovals.set(username, { key, ip, device, realName: "" });
    }
    res.json({ status: "success", key: pendingApprovals.get(username).key });
});

app.get("/api/check-approval", (req, res) => {
    const username = req.query.username;
    const pending = pendingApprovals.get(username);
    const key = pending ? pending.key : "";
    if (approvedKeys.has(key)) {
        return res.json({ status: "approved" });
    }
    res.json({ status: "pending" });
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
    <title>VIP Dashboard</title>
    <style>
        body { background: #030a16; color: #e0f2fe; font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
        .card { background: rgba(10, 25, 47, 0.85); padding: 30px; border-radius: 12px; border: 2px solid #0284c7; width: 500px; }
        input, textarea { width: 100%; padding: 10px; margin: 10px 0; background: #0f172a; border: 1px solid #38bdf8; color: white; border-radius: 6px; }
        button { padding: 12px; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer; width: 100%; font-weight: bold; margin-top: 10px; }
        .console { background: #020617; padding: 10px; height: 150px; overflow-y: auto; font-family: monospace; font-size: 12px; color: #4ade80; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="card">
        <h2>⚡ VIP Dashboard</h2>
        <p>Logged in: <b>${username}</b></p>
        <input type="text" id="nickname" placeholder="Enter Nickname" required>
        <input type="text" id="threadId" placeholder="Target Thread ID" required>
        <textarea id="messages" placeholder="Enter messages (one per line)"></textarea>
        <input type="number" id="delay" value="20" placeholder="Delay in seconds">
        <button onclick="startEngine()">🚀 Start Task</button>
        <button onclick="stopEngine()" style="background: #dc2626;">🛑 Stop Task</button>
        <div class="console" id="logs">[SYSTEM] Ready...</div>
    </div>
    <script>
        const username = "${username}";
        let poll = null;
        async function startEngine() {
            const nickname = document.getElementById("nickname").value;
            const threadId = document.getElementById("threadId").value;
            const messages = document.getElementById("messages").value;
            const delay = document.getElementById("delay").value;
            const res = await fetch("/api/start-task", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname, threadId, messages, delay, username })
            });
            const data = await res.json();
            alert(data.message);
            if(data.status === "success") startPolling(nickname);
        }
        async function stopEngine() {
            const nickname = document.getElementById("nickname").value;
            const res = await fetch("/api/stop-task", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname, username })
            });
            const data = await res.json();
            alert(data.message);
            if(poll) clearInterval(poll);
        }
        function startPolling(nickname) {
            if(poll) clearInterval(poll);
            poll = setInterval(async () => {
                const res = await fetch("/api/task-status?nickname=" + encodeURIComponent(nickname) + "&username=" + encodeURIComponent(username));
                const data = await res.json();
                if(data.status === "found") {
                    document.getElementById("logs").innerHTML = data.logs.map(l => l.text).join("<br>");
                }
            }, 3000);
        }
    </script>
</body>
</html>
    `);
});

// ===== TASK APIs =====
app.post("/api/start-task", async (req, res) => {
    const { nickname, threadId, delay, messages, username } = req.body;
    if (!nickname) return res.json({ status: "error", message: "Nickname missing!" });

    const taskState = {
        nickname,
        isRunning: true,
        stopRequested: false,
        logs: []
    };
    userTasks.set(nickname, taskState);

    const addLog = (text, type = "info") => {
        taskState.logs.push({ text: `[${getISTTime()}] ${text}`, type });
        if (taskState.logs.length > 50) taskState.logs.shift();
    };

    addLog(`Task started for target: ${threadId}`, "success");
    res.json({ status: "success", message: "Task started successfully!" });

    // Background loop simulation
    const parsedMsgs = messages ? messages.split("\n").filter(m => m.trim()) : ["Hello"];
    let idx = 0;
    
    (async () => {
        while (taskState.isRunning && !taskState.stopRequested) {
            const msg = parsedMsgs[idx % parsedMsgs.length];
            addLog(`Sent message to ${threadId}: "${msg}"`, "success");
            idx++;
            for (let i = 0; i < (parseInt(delay) || 20); i++) {
                if (taskState.stopRequested) break;
                await sleep(1);
            }
        }
        addLog("Task stopped.", "info");
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
    if (userTasks.has(nickname)) {
        userTasks.get(nickname).stopRequested = true;
        userTasks.get(nickname).isRunning = false;
    }
    res.json({ status: "success", message: "Task stopped!" });
});

// ===== START SERVER =====
server.listen(PORT, () => {
    console.log(`🚀 Server live on Port ${PORT}`);
});