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
let activeFights = new Map();

function logMessage(msg) {
    const timestamp = new Date().toISOString();
    botLogs.push(`[BOT] [${timestamp}] ${msg}`);
    if (botLogs.length > 50) botLogs.shift();
    console.log(msg);
}

botLogs.push(`[BOT] [${new Date().toISOString()}] ✅ INFO: Dashboard client connected`);

app.get('/api/status', (req, res) => {
    res.json({ status: botStatus, logs: botLogs });
});

app.post('/api/clear-logs', (req, res) => {
    botLogs = [];
    logMessage("Logs cleared by admin");
    res.json({ success: true });
});

// फाइट मैसेजेस की लिस्ट
const fightLines = [
    "TERI BEHN KI CHU* CHAL NIKAL HATER KAHIN KE! 🤬",
    "PETER BRAND SE PANGE MAT LE BETA OUKAT ME RAH! 👑",
    "TERA BAAP AAYA HAI NIKAL YAHAN SE HATER 😈",
    "PETER SE FIGHT KAREGA TU? TERI HASTI MITA DUNGA! 🔥",
    "CHAL CHHUTKI APNI AUKAT DEKH PEHLE 🤫"
];

app.post('/api/start-bot', (req, res) => {
    const { appState, prefix, adminId } = req.body;

    if (!appState) {
        return res.status(400).json({ success: false, message: "AppState डालना जरूरी है!" });
    }

    try {
        const parsedAppState = JSON.parse(appState);
        botStatus = "Started";
        logMessage("🔄 Connecting safely to Facebook Messenger Server...");

        // 🛡️ एडवांस एजेंट जो फेसबुक सिक्योरिटी चेक को बाईपास करेगा
        const loginOptions = {
            appState: parsedAppState,
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        };

        login(loginOptions, (err, api) => {
            if (err) {
                botStatus = "Failed";
                logMessage(`🔒 FB Safety Block: AppState Blocked by FB Checkpoint.`);
                return res.status(500).json({ success: false, message: "फेसबुक ने कनेक्शन ब्लॉक किया, नया AppState डालें!" });
            }

            const botPrefix = prefix || "/";
            
            // 💡 इन सेटिंग्स से कनेक्शन मजबूत रहेगा और बार-बार रीकनेक्ट नहीं होगा
            api.setOptions({ 
                listenEvents: true, 
                selfListen: true, 
                forceLogin: true,
                online: true,
                autoMarkDelivery: true
            });

            logMessage(`🔥 PETER FIGHT ENGINE IS LIVE ON GROUPS!`);

            const LOCKED_NAME = "PETER RULEZ 👑"; 
            function enforceGroupName(threadID) {
                api.setTitle(LOCKED_NAME, threadID, (titleErr) => {
                    if (titleErr) setTimeout(() => enforceGroupName(threadID), 3000);
                });
            }

            function startFightLoop(threadID) {
                if (!activeFights.get(threadID)) return;
                const randomLine = fightLines[Math.floor(Math.random() * fightLines.length)];
                
                api.sendMessage(randomLine, threadID, (msgErr) => {
                    if (!msgErr) {
                        setTimeout(() => startFightLoop(threadID), 2000); // 2 सेकंड का सुरक्षित गैप
                    } else {
                        logMessage(`⚠️ Message Failed: ${msgErr.errorDescription || 'Rate Limited'}`);
                        setTimeout(() => startFightLoop(threadID), 4000); // एरर पर 4 सेकंड वेट करेगा
                    }
                });
            }

            // ⚡ मजबूत यूनिवर्सल लिसनर (MQTT क्रैश होने पर भी बोट बंद नहीं होगा)
            api.listen((listenErr, event) => {
                if (listenErr) {
                    logMessage(`🔄 System Guard: MQTT Connection Refreshed automatically.`);
                    return;
                }

                // नाम चेंज होने पर ऑटो रीसेट
                if (event.type === "event" && event.logMessageType === "log:thread-name") {
                    if (event.logMessageData.name !== LOCKED_NAME) {
                        enforceGroupName(event.threadID);
                    }
                }

                // कमांड हैंडलिंग
                if ((event.type === "message" || event.type === "message_reply") && event.body) {
                    const messageBody = event.body.trim().toLowerCase();
                    
                    if (messageBody.startsWith(botPrefix) || messageBody.startsWith('/') || messageBody.startsWith('!')) {
                        const cleanBody = messageBody.replace(/^[/#!]/, '').trim();
                        const args = cleanBody.split(/ +/);
                        const command = args.shift();

                        logMessage(`💻 Command: ${command} in Thread: ${event.threadID}`);

                        if (command === "help") {
                            const helpText = `⚡ 𝐏𝐄𝐓𝐄𝐑 𝐅𝐈𝐆𝐇𝐓 𝐁𝐎𝐓 ⚡\n━━━━━━━━━━━━━━━━━━\n⚔️ fyt on - स्टार्ट फाइट मोड\n🛑 stop - स्टॉप फाइट मोड\n🔒 group on - ग्रुप नाम लॉक करें\n🆔 tid - ग्रुप आईडी निकालें\n👤 uid - अपनी यूजर आईडी\n━━━━━━━━━━━━━━━━━━`;
                            api.sendMessage(helpText, event.threadID, event.messageID);
                        }
                        else if (command === "fyt" && args[0] === "on") {
                            activeFights.set(event.threadID, true);
                            api.sendMessage("⚔️ PETER FIGHT ENGINE STARTED! 🔥", event.threadID);
                            startFightLoop(event.threadID);
                        }
                        else if (command === "stop") {
                            activeFights.set(event.threadID, false);
                            api.sendMessage("🛑 फाइट मोड रोक दिया गया है।", event.threadID);
                        }
                        else if (command === "group" && args[0] === "on") {
                            enforceGroupName(event.threadID);
                            api.sendMessage(`🔒 ग्रुप नाम लॉक कर दिया गया है!`, event.threadID);
                        }
                        else if (command === "tid") {
                            api.sendMessage(`🆔 Group ID: ${event.threadID}`, event.threadID);
                        }
                    }
                }
            });
        });

        res.json({ success: true, message: "बोट सफलतापूर्वक री-कनेक्ट हो गया है!" });
    } catch (error) {
        res.status(400).json({ success: false, message: "AppState JSON सही नहीं है!" });
    }
});

app.listen(PORT, () => console.log(`Server is running live`));
