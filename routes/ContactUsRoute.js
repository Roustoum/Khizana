const express = require('express');
const contactUsRouter = express.Router();
const { authMidleware } = require('../middlewares/Protected');
const { BanMiddleware } = require('../middlewares/Ban');
const { validateBody } = require('../utils/validateBody');
const ContactUs = require('../models/ContactUsModel');
const CustomError = require('../utils/customError');

contactUsRouter.get("/", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.contactUs.view) throw new CustomError("غير مصرح لك قراءة الرسائل", 403);
    const contactUs = await ContactUs.find();
    res.status(200).send({ success: true, contactUs });
});

contactUsRouter.get("/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.contactUs.view) throw new CustomError("غير مصرح لك قراءة الرسائل", 403);
    const contactUs = await ContactUs.findById(req.params.id);
    if (!contactUs) throw new CustomError("الرسالة المحددة غير موجودة", 404);
    res.status(200).send({ success: true, contactUs });
});

contactUsRouter.post("/", authMidleware, BanMiddleware, async (req, res, next) => {
    validateBody(req.body, ["title", "description", "type"]);
    const contactUs = new ContactUs(req.body);
    await contactUs.save();
    res.status(201).send({ success: true, contactUs });
});

contactUsRouter.delete("/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.contactUs.delete) throw new CustomError("غير مصرح لك حذف الرسالة", 403);
    const contactUs = await ContactUs.findById(req.params.id);
    if (!contactUs) throw new CustomError("الرسالة المحددة غير موجودة", 404);
    await contactUs.deleteOne();
    res.status(200).send({ success: true, message: "تم حذف الرسالة بنجاح" });
});

module.exports = contactUsRouter;