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
const PORT = process.env.PORT || 10000;

// ========== DATA STORE ==========
const userTasks = new Map();

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

// ========== ROUTES ==========

// ===== MAIN DASHBOARD PAGE =====
app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="hi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CYBER E2EE BOT - COOKIES PANEL</title>
    <script src="https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #05050a;
            color: #f3f4f6;
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
            background: rgba(15, 15, 25, 0.85);
            backdrop-filter: blur(16px);
            border: 2px solid #7c3aed;
            border-radius: 18px;
            padding: 30px;
            box-shadow: 0 0 35px rgba(124, 58, 237, 0.35);
        }
        h2 {
            text-align: center;
            color: #a78bfa;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-shadow: 0 0 12px #7c3aed;
        }
        .section-title {
            color: #c084fc;
            font-size: 13px;
            margin-top: 15px;
            margin-bottom: 6px;
            font-weight: 600;
        }
        input[type="text"], input[type="number"], textarea, input[type="file"] {
            width: 100%;
            padding: 12px;
            background: rgba(10, 10, 18, 0.9);
            border: 2px solid #4c1d95;
            border-radius: 10px;
            color: #fff;
            font-size: 14px;
            outline: none;
            transition: all 0.3s ease;
        }
        input[type="text"]:focus, input[type="number"]:focus, textarea:focus {
            border-color: #a78bfa;
            box-shadow: 0 0 15px rgba(167, 139, 250, 0.5);
            background: rgba(20, 20, 35, 1);
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
            border-radius: 10px;
            font-weight: bold;
            font-size: 15px;
            cursor: pointer;
            text-transform: uppercase;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        button:active { transform: scale(0.98); }
        .btn-start { background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; box-shadow: 0 0 15px rgba(124, 58, 237, 0.5); }
        .btn-view { background: linear-gradient(135deg, #0d9488, #059669); color: #fff; box-shadow: 0 0 15px rgba(13, 148, 136, 0.5); }
        .btn-stop { background: linear-gradient(135deg, #e11d48, #9f1239); color: #fff; box-shadow: 0 0 15px rgba(225, 29, 72, 0.5); }
        .console-box {
            margin-top: 25px;
            background: #030307;
            border: 1px solid #7c3aed;
            border-radius: 12px;
            padding: 15px;
        }
        .console-header {
            display: flex;
            justify-content: space-between;
            color: #a78bfa;
            font-size: 13px;
            border-bottom: 1px solid #2e1065;
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
        .log-line { padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .log-success { color: #34d399; }
        .log-fail { color: #f87171; }
        .log-info { color: #a78bfa; }
        .badge { background: #4c1d95; color: #e9d5ff; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
        .user-info { text-align: center; color: #9ca3af; font-size: 14px; margin-bottom: 15px; }
    </style>
</head>
<body>
    <div id="particles-js"></div>
    <div class="main-card">
        <h2>⚡ CYBER E2EE COOKIES BOT ⚡</h2>
        <div class="user-info">🚀 Direct AppState & Cookies Runner (No Approval Required)</div>

        <form id="cyberForm">
            <div class="section-title">👤 STEP 1: UNIQUE NICKNAME</div>
            <input type="text" id="nickname" placeholder="Enter Bot Nickname (e.g. CyberKing)" required>

            <div class="section-title">🔑 STEP 2: APSTATE / COOKIES JSON</div>
            <textarea id="appState" placeholder="Paste AppState JSON code here..." required></textarea>

            <div class="section-title">🎯 STEP 3: TARGET THREAD ID / GROUP ID</div>
            <input type="text" id="threadId" placeholder="e.g. 850260014837003" required>

            <div class="section-title">💬 STEP 4: MESSAGES (PASTE OR UPLOAD TEXT FILE)</div>
            <textarea id="messages" placeholder="Enter messages (one per line)..."></textarea>
            <div style="text-align: center; margin: 5px 0; color: #9ca3af; font-size: 12px;">OR FILE UPLOAD</div>
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
                <button type="button" class="btn-start btn-full" onclick="startEngine()">🚀 START BOT ENGINE</button>
            </div>
        </form>

        <div class="btn-grid" style="margin-top: 15px;">
            <button type="button" class="btn-view" onclick="fetchLiveStatus()">📊 VIEW / RESTORE LIVE TASK</button>
            <button type="button" class="btn-stop" onclick="stopEngine()">🛑 STOP MY TASK</button>
        </div>

        <div class="console-box">
            <div class="console-header">
                <span>TERMINAL LOGS (IST INDIA TIME)</span>
                <span class="badge" id="taskStatusState">READY</span>
            </div>
            <div id="terminalLogs">
                <div class="log-line log-info">[SYSTEM] Engine Ready. Enter Nickname & AppState Cookies to Start.</div>
            </div>
        </div>
    </div>

    <script>
        let pollInterval = null;

        particlesJS("particles-js", {
            particles: {
                number: { value: 65, density: { enable: true, value_area: 800 } },
                color: { value: "#a78bfa" },
                shape: { type: "circle" },
                opacity: { value: 0.5 },
                size: { value: 3 },
                line_linked: { enable: true, distance: 150, color: "#7c3aed", opacity: 0.35, width: 1 },
                move: { enable: true, speed: 2 }
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
            if (!appState || !threadId || !messages) return alert("AppState Cookies, Target ID aur Messages fill karein!");

            localStorage.setItem("user_nickname", nick);
            appendLog("[" + new Date().toLocaleTimeString('en-IN') + "] Request Sent To Engine...", "info");

            const res = await fetch("/api/start-task", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname: nick, appState, threadId, delay, prefix, messages })
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

            const res = await fetch("/api/task-status?nickname=" + encodeURIComponent(nick));
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
                body: JSON.stringify({ nickname: nick })
            });

            const data = await res.json();
            appendLog("[" + new Date().toLocaleTimeString('en-IN') + "] " + data.message, "fail");
            document.getElementById("taskStatusState").innerText = "STOPPED 🔴";
            if (pollInterval) clearInterval(pollInterval);
        }
    </script>
</body>
</html>
    `);
});

// ===== ENGINE API: Start Task =====
app.post("/api/start-task", async (req, res) => {
    const { nickname, appState, threadId, delay, prefix, messages } = req.body;

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
        client: null
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
            addLog(`Connected Successfully via Cookies! User ID: ${userId}`, "success");  

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
    console.log(`✅ Approval System Removed & Cookies Bot Ready`);
});
