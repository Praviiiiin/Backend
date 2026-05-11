import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.routes.js"

const app = express();

app.use(cors());
app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser()); 

app.get("/", (req, res, next) => {
  console.log("GET / route HIT"); 
  res.send("Server working");
});

app.use("/api/v1/users", userRouter);


app.use((req, res, next) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: "Not found" });
});


app.use((err, req, res, next) => {
  console.error("Full Error Object:", err);  
  console.error("Error Constructor:", err.constructor.name);
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});

console.log("Routes setup complete");

export default app;