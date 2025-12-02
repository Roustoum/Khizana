const express = require('express');
const notificationRouter = express.Router();
const createUploader = require("../middlewares/Uploads");
const { authMidleware } = require('../middlewares/Protected');
const { BanMiddleware } = require('../middlewares/Ban');
const { validateBody } = require('../utils/validateBody');
const CustomError = require('../utils/customError');
const Notification = require('../models/NotificationModel');
const User = require('../models/UserModel');

const uploadNotificationImage = createUploader(["public/notification"], ["image"], ["image"], true);

notificationRouter.get("/", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.notifications.view) throw new CustomError("غير مصرح لك بمشاهدة الإشعارات", 403);

    const notifications = await Notification.find();
    res.status(200).send({ success: true, notifications });
});

notificationRouter.get("/id/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.notifications.view) throw new CustomError("غير مصرح لك بمشاهدة الإشعارات", 403);

    const notification = await Notification.findById(req.params.id);
    if (!notification) throw new CustomError("الإشعار المطلوب غير موجود", 404);

    res.status(200).send({ success: true, notification });
});

notificationRouter.get("/me", authMidleware, BanMiddleware, async (req, res, next) => {
    const notifications = await Notification.find({ isActive: true, $or: [{ to_all: true }, { to_one: req.user._id }], beginAt: { $lte: new Date() }, endAt: { $gte: new Date() } });
    res.status(200).send({ success: true, notifications });
});

notificationRouter.post("/", uploadNotificationImage.fields([{ name: "image", maxCount: 1 }]), authMidleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.notifications.create) throw new CustomError("غير مصرح لك بإنشاء إشعارات", 403);

    validateBody(req.body, ["title", "description", "to_all", "beginAt", "endAt", "isActive"], true, ["to_one"]);
    if (req.body.to_all === 'false' && !req.body.to_one) throw new CustomError("يجب تحديد المستخدم", 400);
    if (req.body.to_one) {
        const userExists = await User.findById(req.body.to_one);
        if (!userExists) throw new CustomError("المستخدم المحدد غير موجود", 404);
    }

    if (req.files) {
        if (req.files.image) req.body.image = req.files.image[0].filename;
    }

    if (req.body.to_all === 'true') req.body.to_one = undefined;

    const notification = new Notification(req.body);
    await notification.save();
    res.status(201).send({ success: true, notification });
});

notificationRouter.put("/:id", uploadNotificationImage.fields([{ name: "image", maxCount: 1 }]), authMidleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.notifications.edit) throw new CustomError("غير مصرح لك تعديل إشعارات", 403);

    validateBody(req.body, ["title", "description", "to_all", "beginAt", "endAt", "isActive"], true, ["to_one"]);
    if (req.body.to_all === 'false' && !req.body.to_one) throw new CustomError("يجب تحديد المستخدم", 400);
    if (req.body.to_one) {
        const userExists = await User.findById(req.body.to_one);
        if (!userExists) throw new CustomError("المستخدم المحدد غير موجود", 404);
    }


    if (req.files) {
        if (req.files.image) req.body.image = req.files.image[0].filename;
    }

    const notification = await Notification.findById(req.params.id);
    if (!notification) throw new CustomError("الإشعار المطلوب غير موجود", 404);

    if (req.body.to_all === 'true') {
        req.body.to_one = undefined;
        notification.to_one = undefined;
    }

    const updateInfo = Object.keys(req.body);
    updateInfo.forEach(update => (notification[update] = req.body[update]));
    await notification.save();
    res.status(201).send({ success: true, notification });
});

notificationRouter.delete("/:id", authMidleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.notifications.delete) throw new CustomError("غير مصرح لك حذف إشعارات", 403);

    const notification = await Notification.findById(req.params.id);
    if (!notification) throw new CustomError("الإشعار المطلوب غير موجود", 404);
    await notification.deleteOne();
    res.status(200).send({ success: true, message: "تم حذف الإشعار بنجاح" });
});

module.exports = notificationRouter;