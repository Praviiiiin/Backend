import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./app.js";

dotenv.config({
    path: "./env"
});


console.log("Starting server...");   
console.log("App imported:", app); 

connectDB()
.then(() => {

    console.log("DB connection resolved");

    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server running at port ${process.env.PORT || 8000}`);
    });

})
.catch((err) => {
    console.log("MongoDB connection failed", err);
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server running at port ${process.env.PORT || 8000} (DB connection failed)`);
    });
});
