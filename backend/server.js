const express = require("express");
const cors = require("cors");
require("dotenv").config();


const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const leadRoutes = require("./routes/leadRoutes");


const app = express();

app.use(cors());
app.use(express.json());


// Connect to MongoDB
connectDB();

app.get("/", (req, res) => {
  res.json({
    message: "CRM Backend API is running"
  });
});

app.get("/api/test", (req, res) => {
  res.json({
    message: "CRM API is working successfully"
  });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Lead routes
app.use("/api/leads", leadRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});