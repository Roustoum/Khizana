const express = require('express');
const authRouter = express.Router();
const User = require("../models/UserModel");
const crypto = require("crypto");
const CustomError = require('../utils/customError');
const asyncErrorHandler = require("../utils/asyncErrorHandler");
const { validateBody } = require('../utils/validateBody');
const { authMidleware } = require('../middlewares/Protected');
const { BanMiddleware } = require('../middlewares/Ban');
const { sendEmail } = require('../utils/mail');
const createUploader = require('../middlewares/Uploads');

const uploadProfile = createUploader("public/profile", ["image"], ["image"], true, 10);

authRouter.get("/me", authMidleware, BanMiddleware, async (req, res, next) => {
    res.status(200).send({ success: true, user: req.user });
});

authRouter.post("/signup", uploadProfile.any(), async (req, res, next) => {
    validateBody(req.body, ["email", "name", "password"], true, ["country", "gender", "bio"]);
    if (req.files && req.files.length > 0) {
        const imageFile = req.files.find(f => f.fieldname === "image") || req.files[0];
        req.body.image = imageFile.filename;
    }
    const user = new User(req.body);
    await user.save();
    token = user.generateJWToken()
    res.cookie("token", token, {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
        sameSite: "strict",
        secure: true || process.env.NODE_ENV === "production",
    });

    res.status(201).send({ success: true, user, token })
});

authRouter.put("/update", uploadProfile.any(), authMidleware, BanMiddleware, async (req, res, next) => {
    validateBody(req.body, [], true, ["country", "gender", "bio", "email", "name"]);
    if (req.user.provider !== 'local') {
        delete req.body.email;
    }

    if (req.files && req.files.length > 0) {
        const imageFile = req.files.find(f => f.fieldname === "image") || req.files[0];
        req.body.image = imageFile.filename;
    }
    const user = req.user;
    const updateinfo = Object.keys(req.body)
    updateinfo.forEach(update => user[update] = req.body[update])
    await user.save()

    res.status(200).send({ success: true, user });
})

authRouter.put("/updatePassword", authMidleware, BanMiddleware, async (req, res, next) => {
    validateBody(req.body, ["password", "currentPassword"], true, [])
    if (req.user.password !== undefined) {
        if (req.body.password === req.body.currentPassword) throw new CustomError("كلمة المرور الجديدة لا يمكن أن تكون نفس كلمة المرور الحالية !", 400);
        if (await req.user.comparePassword(req.body.currentPassword)) throw new CustomError("كلمة المرور الحالية غير صحيحة !", 400);
    }
    req.user.password = req.body.password;
    await req.user.save()
    res.status(200).send({ success: true, user: req.user })
});

authRouter.post("/login", asyncErrorHandler(async (req, res, next) => {
    validateBody(req.body, ["email", "password"]);

    const { email, password } = req.body;
    const user = await User.findUser(email, password);
    const now = new Date();

    if (user.banned_at && !user.ban_expire_at) throw new CustomError(`أنت ممنوع بشكل دائم من استخدام النظام. السبب: ${user.ban_reson || "غير محدد"}`,403);
    if (user.banned_at && user.ban_expire_at && user.ban_expire_at > now) throw new CustomError(`أنت ممنوع حالياً من استخدام النظام. السبب: ${user.ban_reson || "غير محدد"}. ينتهي الحظر في: ${user.ban_expire_at.toLocaleDateString('fr-FR')}`,403);
    if (!req.user?.is_active === false) throw new CustomError("حسابك غير نشط حالياً", 403);
    
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

    res.status(200).send({ success: true, user, token });
}));

authRouter.get("/logout", authMidleware, BanMiddleware, async (req, res, next) => {
    res.clearCookie("token");
    res.status(200).send({ success: true, message: "تم تسجيل الخروج بنجاح !" });
});

authRouter.delete("/delete", authMidleware, BanMiddleware, async (req, res, next) => {
    await req.user.deleteOne();
    res.status(200).send({ success: true, message: "تم حذف المستخدم بنجاح !" });
});

authRouter.post("/forgotpassword", async (req, res, next) => {

    const user = await User.findOne({ email: req.body.email })
    if (!user) throw new CustomError("لا يوجد مستخدم بهذا البريد الإلكتروني !", 404)

    const resetToken = user.createPasswordResetToken()
    await user.save()

    const resetUrl = `${req.protocol}://${req.get('host')}/resetPassword/${resetToken}`
    const message = `Forgot your password? to rest your password go to:\n ${resetUrl} \nthis reset password link will be valid only for 10 min.\nIf you didn't forget your password, please ignore this email!`
    try {
        sendEmail({
            email: user.email,
            subject: "Password Reset",
            message: message
        })
    } catch (error) {
        user.passwordResetToken = undefined
        user.passwordResetExpires = undefined
        console.log(error)
        await user.save()
        throw new CustomError("هناك خطأ في إرسال البريد الإلكتروني. حاول مرة أخرى لاحقًا !", 500)
    }
    res.status(200).send({
        success: true,
        message: "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني !"
    })
});

authRouter.put("/resetPassword/:token", async (req, res, next) => {
    validateBody(req.body, ["password", "confirmPassword"], true)

    if (req.body.password !== req.body.confirmPassword) throw new CustomError("كلمتا المرور غير متطابقتان !", 400)

    const token = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const user = await User.findOne({ passwordResetToken: token, passwordResetExpires: { $gt: new Date() } });
    if (!user) throw new CustomError("رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية !", 400);

    user.password = req.body.password
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined

    await user.save()
    req.user = user

    const jwttoken = req.user.generateJWToken()

    res.cookie("token", jwttoken, {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
        sameSite: "strict",
        secure: true || process.env.NODE_ENV === "production",
    })
    res.status(200).send({
        status: "success",
        user: req.user,
        token: jwttoken,
    })
});

module.exports = authRouter;