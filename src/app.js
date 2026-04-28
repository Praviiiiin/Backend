import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.routes.js"

const app = express();

app.use(cors());
app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser()); 

app.get("/", (req, res) => {
  console.log("GET / route HIT"); 
  res.send("Server working");
});

app.use("/api/v1/users", userRouter);

<<<<<<< HEAD

=======
>>>>>>> 6813c51b9b875a54ef2a893aa05b031a3f9dfcdb
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: "Not found" });
});

console.log("Routes setup complete");

export default app;
