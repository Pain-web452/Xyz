const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// JSON और फॉर्म डेटा रीड करने के लिए मिकैनिज़म
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTML और CSS फाइलों को पब्लिकली सर्व करने के लिए
app.use(express.static(__dirname));

// मुख्य पेज लोड होने पर index.html दिखाना
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// जब यूजर फॉर्म सबमिट करेगा, तो यह API ट्रिगर होगी
app.post('/api/start-bot', (req, res) => {
    const { adminId, botUid, loginMode, appStateData, prefix } = req.body;

    console.log("--- रिसीव हुआ बोट कॉन्फ़िगरेशन ---");
    console.log(`Admin ID: ${adminId}`);
    console.log(`Bot UID: ${botUid}`);
    console.log(`Prefix: ${prefix}`);
    
    // यहाँ आप Facebook chat API (जैसे fca-unofficial) का कोड जोड़कर 
    // बोट को सीधे लॉगिन करवा सकते हैं।
    
    res.json({ success: true, message: "Bot configuration received! Starting bot..." });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
