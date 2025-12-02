const express = require('express');
const subscriptionRouter = express.Router();
const CustomError = require('../utils/customError');
const { validateBody } = require('../utils/validateBody');
const { authMidleware } = require('../middlewares/Protected');
const User = require('../models/UserModel');
const Subscription = require("../models/SubscriptionModel");

subscriptionRouter.get("/", authMidleware, async (req, res, next) => {
    if (!req.user.role) {
        throw new CustomError("المستعمل غير مصرح به", 404);
    }
    if (!req.user.role.permissions.subscriptions.view) {
        throw new CustomError("غير مصرح لك بمشاهدة الاشتراكات", 403);
    }

    const subscriptions = await Subscription.find();
    res.status(200).send({ success: true, subscriptions });
});

subscriptionRouter.get("/:id", authMidleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.subscriptions.view) throw new CustomError("غير مصرح لك بمشاهدة الاشتراكات", 403);

    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) throw new CustomError("الاشتراك المطلوب غير موجود", 404);
    res.status(200).send({ success: true, subscription });
});

subscriptionRouter.post("/", authMidleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.subscriptions.create) throw new CustomError("غير مصرح لك بإنشاء اشتراكات", 403);

    validateBody(req.body, ["name", "icon", "months"], true, ["price", "reduction", "isActive"]);

    const newSubscription = new Subscription(req.body);
    await newSubscription.save();
    res.status(201).send({ success: true, subscription: newSubscription });
});

subscriptionRouter.put("/:id", authMidleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.subscriptions.edit) throw new CustomError("غير مصرح لك بتعديل اشتراكات", 403);

    validateBody(req.body, [], true, ["name", "icon", "price", "months", "reduction", "isActive"]);

    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
        throw new CustomError("الاشتراك المطلوب غير موجود", 404);
    }

    const updateInfo = Object.keys(req.body);
    updateInfo.forEach(update => (subscription[update] = req.body[update]));
    await subscription.save();

    res.status(201).send({ success: true, subscription });
});

subscriptionRouter.delete("/:id", authMidleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.subscriptions.delete) throw new CustomError("غير مصرح لك بحذف اشتراكات", 403);

    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
        throw new CustomError("الاشتراك المطلوب غير موجود", 404);
    }
    await subscription.deleteOne();

    res.status(200).send({ success: true, message: "تم حذف الاشتراك بنجاح" });
});

subscriptionRouter.post("/:id/user", authMidleware, async (req, res, next) => {
    if (!req.user.role) {
        throw new CustomError("المستعمل غير مصرح به", 404);
    }
    if (!req.user.role.permissions.subscriptions.manage) {
        throw new CustomError("غير مصرح لك بإدارة اشتراكات المستخدمين", 403);
    }

    validateBody(req.body, ["userIds"], true, []);

    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new CustomError("قائمة المستخدمين مطلوبة ويجب أن تحتوي على عناصر", 400);
    }

    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) throw new CustomError("الاشتراك المطلوب غير موجود", 404);

    const users = await User.find({ _id: { $in: userIds } });
    if (users.length !== userIds.length) throw new CustomError("بعض المستخدمين غير موجودين", 404);

    const expireDate = new Date();
    expireDate.setMonth(expireDate.getMonth() + subscription.months);

    const result = await User.updateMany(
        { _id: { $in: userIds } },
        { $set: { subscription: subscription._id, subscriptionExipireDate: expireDate } }
    );

    res.status(200).send({ success: true, message: `تم إضافة الاشتراك إلى ${result.modifiedCount} مستخدم بنجاح`, modifiedCount: result.modifiedCount, expireDate: expireDate });
});

subscriptionRouter.delete("/:id/user", authMidleware, async (req, res, next) => {
    if (!req.user.role) {
        throw new CustomError("المستعمل غير مصرح به", 404);
    }
    if (!req.user.role.permissions.subscriptions.manage) {
        throw new CustomError("غير مصرح لك بإدارة اشتراكات المستخدمين", 403);
    }

    validateBody(req.body, ["userIds"], true, []);

    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new CustomError("قائمة المستخدمين مطلوبة ويجب أن تحتوي على عناصر", 400);
    }

    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) throw new CustomError("الاشتراك المطلوب غير موجود", 404);

    const result = await User.updateMany(
        { _id: { $in: userIds }, subscription: req.params.id },
        { $unset: { subscription: null, subscriptionExipireDate: null } }
    );

    res.status(200).send({ success: true, message: `تم إزالة الاشتراك من ${result.modifiedCount} مستخدم`, });
});

module.exports = subscriptionRouter;