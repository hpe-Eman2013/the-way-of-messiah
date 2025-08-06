const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Define the Explanation schema
const explanationSchema = new mongoose.Schema({
  name: String,
  purpose: String,
  length: String,
  restrictions: [String],
  whenObserved: String,
  whoItWasBindingOn: String,
  customs: String
}, { collection: "Yahuah's-Holy-Days" });

const Explanation = mongoose.model("Explanation", explanationSchema);

// GET all explanations
router.get("/", async (req, res) => {
  try {
    const explanations = await Explanation.find();
    res.json(explanations);
  } catch (err) {
    console.error("Error fetching explanations:", err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
