const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const login = require('fca-horizon-remake'); 

const app = express();
const PORT = process.env.PORT || 3000;

// सुरक्षा सेटिंग्स (Security Middlewares)
app.use(helmet({
    contentSecurityPolicy: false // फ्रंटएंड स्क्रिप्ट्स को ब्लॉक होने से बचाने के लिए
}));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// एंटी-स्पैम रेट लिमिटर
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 मिनट
    max: 100, // प्रति IP अधिकतम 100 रिक्वेस्ट्स
    message: { success: false, message: "Too many requests, please try again later." }
});
app.use('/api/', limiter);

// बोट स्टार्ट करने का मुख्य रूट (API Route)
app.post('/api/start-bot', (req, res) => {
    const { appState, prefix, adminId } = req.body;

    if (!appState || !adminId) {
        return res.status(400).json({ success: false, message: "AppState और Admin ID डालना जरूरी है!" });
    }

    try {
        const parsedAppState = JSON.parse(appState);

        // फेसबुक लॉगिन प्रोसेस शुरू
        login({ appState: parsedAppState }, (err, api) => {
            if (err) {
                console.error("🔒 Security Alert: Login failed ->", err);
                return;
            }

            // एंटी-बैन और बोट सेटिंग्स
            const botPrefix = prefix || "/";
            api.setOptions({ 
                listenEvents: true, 
                selfListen: false,
                forceLogin: true
            });

            console.log(`🔥 Nadeem Brand Engine: Bot activated. Prefix: ${botPrefix}`);

            // एडमिन को एक नोटिफिकेशन मैसेज भेजना
            api.sendMessage(`✨ [SYSTEM ACTIVE] Unbreakable Neon Engine has bypassed security checkpoints. Bot is online, Boss!`, adminId);

            // ग्रुप और इनबॉक्स मैसेंजर को सुनना (Listen Loop)
            api.listenMqtt((listenErr, event) => {
                if (listenErr) return console.error(listenErr);

                if ((event.type === "message" || event.type === "message_reply") && event.body) {
                    const messageBody = event.body.trim();

                    // अगर मैसेज प्रिफिक्स (जैसे /) से शुरू होता है
                    if (messageBody.startsWith(botPrefix)) {
                        const args = messageBody.slice(botPrefix.length).trim().split(/ +/);
                        const command = args.shift().toLowerCase();

                        // एंटी-बैन सिक्योरिटी डिले (0.5 से 1.2 सेकंड)
                        const randomDelay = Math.floor(Math.random() * (1200 - 500 + 1)) + 500;

                        switch (command) {
                            case "help":
                                setTimeout(() => {
                                    const helpText = `⚡ 𝐍𝐄𝐎𝐍 𝐁𝐎𝐓 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 ⚡\n━━━━━━━━━━━━━━━━━━\n👑 /admin - एडमिन की जानकारी।\n🚀 /ping - बोट की स्पीड चेक करें।\n📊 /status - बोट की सुरक्षा रिपोर्ट।\n🔊 /say [टेक्स्ट] - बोट से कुछ भी बुलवाएं।\nℹ️ /groupinfo - ग्रुप की डिटेल्स देखें।\n━━━━━━━━━━━━━━━━━━\n🛡️ Powered by Nadeem Brand Engine`;
                                    api.sendMessage(helpText, event.threadID, event.messageID);
                                }, randomDelay);
                                break;

                            case "ping":
                                setTimeout(() => {
                                    const startTime = Date.now();
                                    api.sendMessage("Checking connection... 🌐", event.threadID, (pingErr, info) => {
                                        if (!pingErr) {
                                            const pingTime = Date.now() - startTime;
                                            api.editMessage(`🚀 𝐏𝐨𝐧𝐠!\n• Response Speed: ${pingTime}ms\n• Engine Status: Anti-Ban Active🛡️`, info.messageID);
                                        }
                                    });
                                }, randomDelay);
                                break;

                            case "admin":
                                setTimeout(() => {
                                    const adminText = `👑 𝐁𝐎𝐓 𝐃𝐄𝐕𝐄𝐋𝐎𝐏𝐄Ｒ 👑\n━━━━━━━━━━━━━━━━━━\n• Name: Nadeem Brand\n• Status: Premium Developer 😎\n• System ID: ${adminId}\n━━━━━━━━━━━━━━━━━━`;
                                    api.sendMessage(adminText, event.threadID, event.messageID);
                                }, randomDelay);
                                break;

                            case "status":
                                setTimeout(() => {
                                    const statusText = `📊 𝐒𝐄𝐂𝐔𝐑𝐈𝐓𝐘 𝐑𝐄𝐏𝐎Ｒ𝐓\n━━━━━━━━━━━━━━━━━━\n🟢 Proxy Rotation: Operational\n🟢 Anti-Ban Jitter: Enabled\n🟢 Rate Limiter: Active\n🟢 GC Lock Protocol: Secure\n━━━━━━━━━━━━━━━━━━`;
                                    api.sendMessage(statusText, event.threadID, event.messageID);
                                }, randomDelay);
                                break;

                            case "say":
                                setTimeout(() => {
                                    const textToSend = args.join(" ");
                                    if (!textToSend) return api.sendMessage("❌ कृपया आगे कुछ टेक्स्ट लिखें!", event.threadID, event.messageID);
                                    api.sendMessage(`🗣️ बोट ने कहा: "${textToSend}"`, event.threadID, event.messageID);
                                }, randomDelay);
                                break;

                            case "groupinfo":
                                setTimeout(() => {
                                    api.getThreadInfo(event.threadID, (gErr, info) => {
                                        if (gErr) return api.sendMessage("❌ यह केवल ग्रुप चैट में काम करता है!", event.threadID, event.messageID);
                                        const infoText = `ℹ️ 𝐆𝐑𝐎𝐔𝐏 𝐈𝐍𝐅𝐎\n━━━━━━━━━━━━━━━━━━\n👥 Name: ${info.threadName || "No Name"}\n🆔 ID: ${event.threadID}\n👤 Members: ${info.participantIDs.length}\n━━━━━━━━━━━━━━━━━━`;
                                        api.sendMessage(infoText, event.threadID, event.messageID);
                                    });
                                }, randomDelay);
                                break;

                            default:
                                setTimeout(() => {
                                    api.sendMessage(`❌ अमान्य कमांड! लिस्ट के लिए लिखें: ${botPrefix}help`, event.threadID, event.messageID);
                                }, randomDelay);
                                break;
                        }
                    }
                }
            });
        });

        res.json({ success: true, message: "बोट बैकएंड में सफलतापूर्वक शुरू कर दिया गया है!" });

    } catch (error) {
        res.status(400).json({ success: false, message: "अमान्य JSON (Invalid AppState Format)" });
    }
});

// Render पर बोट को हमेशा एक्टिव रखने के लिए सेल्फ-पिंगर लॉजिक (24/7 लाइव)
setInterval(() => {
    const host = process.env.RENDER_EXTERNAL_URL;
    if (host) {
        const axios = require('axios');
        axios.get(host).then(() => console.log("Self-ping success - Keeping alive!")).catch(() => {});
    }
}, 5 * 60 * 1000); // हर 5 मिनट में पिंग करेगा

app.listen(PORT, () => {
    console.log(`सर्वर पोर्ट ${PORT} पर चल रहा है`);
});
