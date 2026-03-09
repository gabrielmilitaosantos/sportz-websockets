import express from "express";
import { matchRouter } from "./routes/matches.js";

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to the server!");
});

app.use("/matches", matchRouter);

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});
