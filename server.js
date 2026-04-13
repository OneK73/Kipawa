require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const crypto = require("crypto");

const app = express();

// Configuration
const API_USERNAME = process.env.PAYHERO_USER || "Ya5HW6vHcXhmDuVWJY48"; 
const API_PASSWORD = process.env.PAYHERO_PASS || "ZDqqeRlkn4w6zk99jWP1TxvFC1iOmtLeTgHfFdjy";
const CHANNEL_ID = process.env.PAYHERO_CHANNEL || "7717";

app.use(cors());
app.use(express.json());

const orders = {};

// 1. INITIATE PAYMENT
app.post("/pay", async (req, res) => {
    try {
        const { phone, amount = 2000 } = req.body;
        const cleanPhone = phone.replace(/\D/g, "");

        if (!cleanPhone.startsWith("254") || cleanPhone.length !== 12) {
            return res.status(400).json({ error: "Invalid format. Use 2547XXXXXXXX" });
        }

        const orderId = crypto.randomUUID();
        orders[orderId] = { phone: cleanPhone, paid: false };

        // Using your provided Render URL for the callback
        const callbackUrl = "https://kipawa.onrender.com/callback";

        await axios.post(
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

        return res.json({ success: true, orderId });
    } catch (err) {
        console.error("PayHero Error:", err.response?.data || err.message);
        return res.status(500).json({ success: false, error: "STK Push failed" });
    }
});

// 2. CALLBACK
app.post("/callback", (req, res) => {
    const { external_reference, status } = req.body;
    if (orders[external_reference] && status === "SUCCESS") {
        orders[external_reference].paid = true;
        console.log(`✅ Order ${external_reference} marked as PAID`);
    }
    res.sendStatus(200);
});

// 3. STATUS CHECK
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
app.listen(PORT, () => console.log(`🚀 Backend live at https://kipawa.onrender.com`));
