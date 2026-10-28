import express from "express";
import cors from "cors";
import db from "./db.js";

const app = express();

app.use(cors({
  origin: "http://localhost:5173"
}));

app.get("/", (req, res) => {
  res.send("My backend is working!");
});

app.get("/api/animals", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM animals"
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Database connection failed"
    });
  }
});

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});