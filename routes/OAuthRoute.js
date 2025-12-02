require("dotenv").config({ quiet: true });
const express = require('express');
const oauthRouter = express.Router();
const { OAuth2Client } = require("google-auth-library");
const { google } = require('googleapis');
const { validateBody } = require("../utils/validateBody");
const User = require("../models/UserModel");
const CustomError = require("../utils/customError");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET,
    `http://localhost:${process.env.PORT}/api/oauth/google/callback`
);

oauthRouter.get("/google", (req, res) => {
    const scopes = [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "openid",
    ];
    const url = oauth2Client.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: scopes });
    res.redirect(url);
});

oauthRouter.get("/google/callback", async (req, res, next) => {
    const { code } = req.query;
    if (!code) {
        const err = new Error("Missing authorization code");
        err.statusCode = 400;
        throw err;
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const data = await oauth2.userinfo.get();

    res.send(data);
});


oauthRouter.post("/google", async (req, res, next) => {
    validateBody(req.body, ["idToken", "accessToken"], true, []);

    const ticket = await client.verifyIdToken({ idToken: req.body.idToken, audience: process.env.GOOGLE_CLIENT_ID });

    client.setCredentials({ access_token: req.body.accessToken });

    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const userInfo = await oauth2.userinfo.get();
    const data = userInfo.data;

    const user = await User.findOne({ email: data.email });
    if (!user) {
        const newUser = new User({
            name: data.name,
            email: data.email,
            provider: 'google',
            image: data.picture,
        });
        await newUser.save();
        const token = newUser.generateJWToken();

        res.cookie("token", token, {
            maxAge: 1000 * 60 * 60 * 24 * 7,
            httpOnly: true,
            sameSite: "strict",
            secure: true || process.env.NODE_ENV === "production",
        });
        res.status(201).send({ success: true, user: newUser, token, data });
    }

    if (req.user?.is_active === false) throw new CustomError("حسابك غير نشط حالياً", 403);
    if (user.banned_at && !user.ban_expire_at) throw new CustomError(`أنت ممنوع بشكل دائم من استخدام النظام. السبب: ${user.ban_reson || "غير محدد"}`, 403);
    if (user.banned_at && user.ban_expire_at && user.ban_expire_at > now) throw new CustomError(`أنت ممنوع حالياً من استخدام النظام. السبب: ${user.ban_reson || "غير محدد"}. ينتهي الحظر في: ${user.ban_expire_at.toLocaleDateString('fr-FR')}`, 403);

    if (user.banned_at && user.ban_expire_at && user.ban_expire_at <= now) {
        user.banned_at = null;
        user.ban_expire_at = null;
        user.ban_reson = null;
        user.is_active = true;
        await user.save();
    }
    
    const token = user.generateJWToken();
    res.cookie("token", token, {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
        sameSite: "strict",
        secure: true || process.env.NODE_ENV === "production",
    });
    res.status(200).send({ success: true, user, token: token, data });
});

module.exports = oauthRouter;