const express = require('express');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static(__dirname));
app.use(express.json());

let botLoop = null;

app.post('/api/start', upload.fields([{ name: 'cookie' }, { name: 'abuse' }]), (req, res) => {
    const { target, delay } = req.body;
    const delayMs = parseInt(delay || 2) * 1000;

    if (!req.files || !req.files['cookie'] || !req.files['abuse']) {
        return res.json({ success: false });
    }

    const cookies = fs.readFileSync(req.files['cookie'][0].path, 'utf8').split('\n').filter(Boolean);
    const messages = fs.readFileSync(req.files['abuse'][0].path, 'utf8').split('\n').filter(Boolean);

    let msgIdx = 0, cookieIdx = 0;
    if (botLoop) clearInterval(botLoop);

    botLoop = setInterval(async () => {
        if (msgIdx >= messages.length) msgIdx = 0;
        
        try {
            // फेसबुक मैसेंजर या कमेंट एंडपॉइंट्स पर पोस्ट रिक्वेस्ट भेजने का मॉड्यूल
            await axios.post(`https://facebook.com{target}/comments`, {
                message: messages[msgIdx]
            }, {
                headers: { 'Authorization': `Bearer ${cookies[cookieIdx].trim()}` }
            });
            console.log(`Sent: ${messages[msgIdx]}`);
        } catch (e) {
            console.log("Token expired or rate limit. Automatically shifting index.");
        }

        msgIdx++;
        cookieIdx = (cookieIdx + 1) % cookies.length;
    }, delayMs);

    res.json({ success: true });
});

app.post('/api/stop', (req, res) => {
    if (botLoop) { clearInterval(botLoop); botLoop = null; }
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
