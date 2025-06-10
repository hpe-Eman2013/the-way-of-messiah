const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const mongoose = require("mongoose");
require("dotenv").config();

mongoose
    .connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch((err) => console.error("MongoDB connection error:", err));

const app = express();
app.use(cors());
app.use(express.json());

app.post("/create-checkout-session", async(req, res) => {
    const { amount, recurring } = req.body;

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: recurring ? "Recurring Donation" : "One-Time Donation",
                    },
                    unit_amount: amount * 100,
                    recurring: recurring ? { interval: "month" } : undefined,
                },
                quantity: 1,
            }, ],
            mode: recurring ? "subscription" : "payment",
            success_url: "https://thewayofmessiah.net/thank-you",
            cancel_url: "https://thewayofmessiah.net/donate?status=cancel",
        });

        res.json({ url: session.url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(4242, () => console.log("Stripe backend running on port 4242"));
app.post("/testimonies", async(req, res) => {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${process.env.ADMIN_TOKEN}`) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    // Replace this with your real database or file source
    const sampleTestimonies = [{
            name: "John Doe",
            email: "john@example.com",
            message: "Life changing experience.",
            imageUrl: "",
        },
        {
            name: "Jane Smith",
            email: "jane@example.com",
            message: "I felt Yahuah's presence.",
            imageUrl: "",
        },
    ];

    res.json(sampleTestimonies);
});
app.post("/testimonies/:id/approve", authenticateAdmin, async(req, res) => {
    const { id } = req.params;
    // update testimony in database or mark as approved
    res.json({ message: `Testimony ${id} approved.` });
});
app.delete("/testimonies/:id", authenticateAdmin, async(req, res) => {
    const { id } = req.params;
    // delete testimony from your database or file
    res.json({ message: `Testimony ${id} deleted.` });
});

function authenticateAdmin(req, res, next) {
    if (req.headers.authorization !== `Bearer ${process.env.ADMIN_TOKEN}`) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}