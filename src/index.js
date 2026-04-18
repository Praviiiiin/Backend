import dotenv from "dotenv";
import connectDB from "./db/index.js";
import express from "express";

const app = express();

dotenv.config({
    path: "./env"
});

connectDB()
.then(() => {

    console.log("DB connection resolved");

    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server running at port ${process.env.PORT || 8000}`);
    });

})
.catch((err) => {
    console.log("MongoDB connection failed", err);
});
