
import express from "express"
import cors from "cors"
// import mongoSanitize from "express-mongo-sanitize"

const app = express()

app.use(cors({
    origin: "*" ,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));


app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(express.static("public"))
app.use(cookieParser())

// app.use(mongoSanitize({
//     allowDots: true,
//     replaceWith: '_'
// }))

import cookieParser from "cookie-parser"

//importing routes
import userRouter from './routes/user.routes.js'
import { errorHandler } from './middlewares/error.middleware.js'

//routes declaration
app.get("/", (req, res) => {
    res.status(200).json({
        message: "Welcome to the Arthlete Logger API"
    });
});

app.use("/api/v1/users", userRouter)

// Error handling middleware (must be last)
app.use(errorHandler);

export { app }
