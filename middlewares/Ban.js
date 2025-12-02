const User = require("../models/UserModel");
const CustomError = require("../utils/customError");
const asyncHandler = require("../utils/asyncErrorHandler");

exports.BanMiddleware = asyncHandler(async (req, res, next) => {
    if (!req.user) throw new CustomError("يجب تسجيل الدخول أولاً", 401);
    if (req.user?.is_active === false) throw new CustomError("حسابك غير نشط حالياً", 403);

    const user = req.user;
    const now = new Date();

    if (user.banned_at && !user.ban_expire_at) throw new CustomError(`أنت ممنوع بشكل دائم من استخدام النظام. السبب: ${user.ban_reson || "غير محدد"}`, 403);
    if (user.banned_at && user.ban_expire_at && user.ban_expire_at > now) throw new CustomError(`أنت ممنوع حالياً من استخدام النظام. السبب: ${user.ban_reson || "غير محدد"}. ينتهي الحظر في: ${user.ban_expire_at.toLocaleDateString('fr-FR')}`, 403);

    if (user.banned_at && user.ban_expire_at && user.ban_expire_at <= now) {
        user.banned_at = null;
        user.ban_expire_at = null;
        user.ban_reson = null;
        user.is_active = true;
        await user.save();
    }

    next();
});