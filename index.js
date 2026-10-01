const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const login = require('fca-unofficial');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let botLogs = [];
let botStatus = "Stopped";
let activeApi = null;

// लॉग्स रिकॉर्ड करने का फंक्शन
function logMessage(msg) {
    const timestamp = new Date().toISOString();
    botLogs.push(`[BOT] [${timestamp}] ${msg}`);
    if (botLogs.length > 50) botLogs.shift(); // अधिकतम 50 लॉग्स रखेगा
}

logMessage("Dashboard client connected");

// API: लॉग्स और स्टेटस पाने के लिए
app.get('/api/status', (req, res) => {
    res.json({ status: botStatus, logs: botLogs });
});

// API: लॉग्स क्लियर करने के लिए
app.post('/api/clear-logs', (req, res) => {
    botLogs = [];
    logMessage("Logs cleared by admin");
    res.json({ success: true });
});

// API: बोट स्टार्ट करने का रूट
app.post('/api/start-bot', (req, res) => {
    const { appState, prefix, adminId } = req.body;

    if (!appState || !adminId) {
        return res.status(400).json({ success: false, message: "AppState और Admin ID डालना जरूरी है!" });
    }

    try {
        const parsedAppState = JSON.parse(appState);
        botStatus = "Started";
        logMessage("✅ Bot status: Started");

        login({ appState: parsedAppState }, (err, api) => {
            if (err) {
                botStatus = "Failed";
                logMessage(`🔒 Security Alert: Login failed -> ${err.message || err}`);
                return;
            }

            activeApi = api;
            const botPrefix = prefix || "/";
            
            api.setOptions({ 
                listenEvents: true, 
                selfListen: true, 
                forceLogin: true,
                listenTypes: ["message", "message_reply", "event"]
            });

            logMessage(`🔥 PETER Brand Engine: Bot activated. Prefix: ${botPrefix}`);
            api.sendMessage(`✨ [SYSTEM ACTIVE] Unbreakable Neon Engine Online, Boss!`, adminId);

            const LOCKED_NAME = "PETER RULEZ 👑"; 
            const antiSpamCooldown = new Map();

            function enforceGroupName(threadID, changerID) {
                api.setTitle(LOCKED_NAME, threadID, (titleErr) => {
                    if (titleErr) {
                        setTimeout(() => enforceGroupName(threadID, changerID), 2000);
                        return;
                    }
                    if (changerID && changerID !== api.getCurrentUserID()) {
                        api.sendMessage(`⚠️ ग्रुप का नाम UNLIMITED TIME के लिए लॉक है! चेंज न करें।`, threadID);
                    }
                });
            }

            // मैसेंजर लिसन लूप
            api.listenMqtt((listenErr, event) => {
                if (listenErr) return console.error(listenErr);

                // ग्रुप नाम लॉक डिटेक्शन
                if (event.type === "event" && event.logMessageType === "log:thread-name") {
                    if (event.logMessageData.name !== LOCKED_NAME) {
                        const now = Date.now();
                        const lastAction = antiSpamCooldown.get(event.threadID) || 0;
                        if (now - lastAction < 1000) {
                            setTimeout(() => enforceGroupName(event.threadID, event.author), 1000);
                        } else {
                            antiSpamCooldown.set(event.threadID, now);
                            enforceGroupName(event.threadID, event.author);
                        }
                    }
                }

                // कमांड्स हैंडलर
                if ((event.type === "message" || event.type === "message_reply") && event.body) {
                    const messageBody = event.body.trim();
                    if (messageBody.startsWith(botPrefix)) {
                        const args = messageBody.slice(botPrefix.length).trim().split(/ +/);
                        const command = args.shift().toLowerCase();
                        const randomDelay = Math.floor(Math.random() * (1200 - 500 + 1)) + 500;

                        if (command === "help") {
                            setTimeout(() => {
                                const helpText = `⚡ 𝐍𝐄𝐎𝐍 𝐁𝐎𝐓 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 ⚡\n━━━━━━━━━━━━━━━━━━\n/group on ➡️ Lock group name.\n/nickname on ➡️ Lock all nicknames.\n/fyt on ➡️ Start fight mode.\n/tid ➡️ Get group ID.\n/uid ➡️ Get user ID.\n━━━━━━━━━━━━━━━━━━\n🛡️ Powered by PETER`;
                                api.sendMessage(helpText, event.threadID, event.messageID);
                            }, randomDelay);
                        }
                        // अन्य कमांड्स (tid/uid) यहाँ जोड़ सकते हैं
                    }
                }
            });
        });

        res.json({ success: true, message: "बोट शुरू हो गया है!" });
    } catch (error) {
        res.status(400).json({ success: false, message: "Invalid AppState Format" });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
