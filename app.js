require("dotenv").config({ quiet: true });
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const path = require("path");
const fs = require("fs");
const app = require("express")();
const errorHandler = require("./utils/errorHandler");
const CustomError = require("./utils/customError");
const { ConnectDB } = require("./services/db");
const authRouter = require("./routes/AuthRoute");
const oauthRouter = require("./routes/OAuthRoute");
const bookRouter = require("./routes/BooksRoute");
const authorRouter = require("./routes/AuthorRoute");
const publisherRouter = require("./routes/PublisherRoute");
const categoryRouter = require("./routes/CategoriesRoute");
const educationalBookRouter = require("./routes/EducationalBooksRoute");
const bookRatingRouter = require("./routes/BooksRatingRoute");
const roleRoute = require("./routes/RoleRoute");
const subscriptionRouter = require("./routes/SubscriptionRoute");
const postRouter = require("./routes/PostRoute");
const quotesRouter = require("./routes/QuotesRoute");
const userRouter = require("./routes/UserRoute");
const currencyRouter = require("./routes/CurrenciesRoute");
const slidesRouter = require("./routes/SlidesRoute");
const couponsRouter = require("./routes/CouponsRoute");
const notificationRouter = require("./routes/NotificationRoute");
const contactUsRouter = require("./routes/ContactUsRoute");
const chargilyRouter = require("./routes/ChargilyRoute");
const cartRouter = require("./routes/CartRoute");
const userInterestRouter = require("./routes/UserInterestRoute");
const homeRouter = require("./routes/HomeRoute");

ConnectDB();

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(compression());
app.use(cookieParser());
app.use(morgan("dev"));

app.use(cors({
    origin: (origin, callback) => {
        callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

app.get("/test", (req, res) => {
    // throw new CustomError("هذا خطأ تجريبي", 400);
    res.status(200).send("الباك اند شغال تمام");
})

// app.get('/auth/google/callback', (req, res) => {
//     res.sendFile(path.join(__dirname, "public", 'index.html'));
// });

app.use('/profiles', express.static(path.join(__dirname, 'public', 'profile')));
app.use('/books', express.static(path.join(__dirname, 'public', 'books','images')));

app.get("/auth/google/callback", (req, res) => {
    res.send("✅ Google OAuth callback OK");
});


app.use("/api/auth", authRouter);
app.use("/api/oauth", oauthRouter);
app.use("/api/books", bookRouter);
app.use("/api/authors", authorRouter);
app.use("/api/publishers", publisherRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/educational-books", educationalBookRouter);
app.use("/api/book-rating", bookRatingRouter);
app.use("/api/roles", roleRoute);
app.use("/api/subscription", subscriptionRouter);
app.use("/api/posts", postRouter);
app.use("/api/quotes", quotesRouter);
app.use("/api/user", userRouter);
app.use("/api/currencies", currencyRouter);
app.use("/api/slides", slidesRouter);
app.use("/api/coupons", couponsRouter);
app.use("/api/notification", notificationRouter);
app.use("/api/contact-us", contactUsRouter);
app.use("/api/cart", cartRouter);
app.use("/api/chargily", chargilyRouter);
app.use("/api/user-interest", userInterestRouter);
app.use("/api/home", homeRouter);

app.use(errorHandler);

const serveur = app.listen(process.env.PORT || 3000, () => {
    console.log(`app running in port ${process.env.PORT}`)
});