require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const crypto = require("crypto");
const path = require("path");

const app = express();

// Configuration from Environment Variables
const API_USERNAME = process.env.PAYHERO_USER || "Ya5HW6vHcXhmDuVWJY48"; 
const API_PASSWORD = process.env.PAYHERO_PASS || "ZDqqeRlkn4w6zk99jWP1TxvFC1iOmtLeTgHfFdjy";
const CHANNEL_ID = process.env.PAYHERO_CHANNEL || "7717";

app.use(cors());
app.use(express.json());

// Serve the frontend file (Assuming it's named index.html)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Memory Storage
const orders = {};

// ======================
// 1. INITIATE STK PUSH
// ======================
app.post("/pay", async (req, res) => {
    try {
        const { phone, amount = 2000 } = req.body;

        // Clean phone number (remove + or spaces)
        const cleanPhone = phone.replace(/\D/g, "");

        if (!cleanPhone.startsWith("254") || cleanPhone.length !== 12) {
            return res.status(400).json({ error: "Invalid format. Use 2547XXXXXXXX" });
        }

        const orderId = crypto.randomUUID();
        orders[orderId] = { phone: cleanPhone, paid: false, createdAt: Date.now() };

        // Construct the full callback URL dynamically for Render
        // If RENDER_EXTERNAL_URL isn't set, it falls back to a placeholder
        const callbackUrl = process.env.RENDER_EXTERNAL_URL 
            ? `${process.env.RENDER_EXTERNAL_URL}/callback` 
            : "https://your-actual-render-url.onrender.com/callback";

        const response = await axios.post(
            "https://backend.payhero.co.ke/api/v2/payments",
            {
                amount: amount,
                phone_number: cleanPhone,
                channel_id: CHANNEL_ID,
                external_reference: orderId,
                callback_url: callbackUrl
            },
            {
                auth: { username: API_USERNAME, password: API_PASSWORD },
                headers: { "Content-Type": "application/json" }
            }
        );

        return res.json({ success: true, orderId, message: "STK Push sent!" });

    } catch (err) {
        console.error("Payment Error:", err.response?.data || err.message);
        return res.status(500).json({ success: false, error: "Failed to initiate payment" });
    }
});

// ======================
// 2. PAYHERO CALLBACK
// ======================
app.post("/callback", (req, res) => {
    const { external_reference, status } = req.body;

    console.log(`📩 Callback for ${external_reference}: ${status}`);

    if (orders[external_reference] && status === "SUCCESS") {
        orders[external_reference].paid = true;
        orders[external_reference].paidAt = Date.now();
    }

    res.sendStatus(200);
});

// ======================
// 3. CHECK STATUS
// ======================
app.get("/access/:orderId", (req, res) => {
    const order = orders[req.params.orderId];

    if (order && order.paid) {
        return res.json({
            access: true,
            group: "https://chat.whatsapp.com/JaX2k66h2qB8vfKbCurxGx?mode=gi_t"
        });
    }

    res.json({ access: false });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
