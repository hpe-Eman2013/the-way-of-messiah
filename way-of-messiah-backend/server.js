const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);



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