// utils/frequencyMap.js
exports.mapFrequencyToStripeInterval = (freq) => {
  switch (freq) {
    case "monthly": return { interval: "month", interval_count: 1 };
    case "quarterly": return { interval: "month", interval_count: 3 };
    case "semi-annual": return { interval: "month", interval_count: 6 };
    case "annual": return { interval: "year", interval_count: 1 };
    default: return null; // one-time
  }
};
