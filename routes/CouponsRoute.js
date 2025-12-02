const express = require('express');
const couponsRouter = express.Router();
const { authMidleware } = require('../middlewares/Protected');
const { BanMiddleware } = require('../middlewares/Ban');
const { validateBody } = require('../utils/validateBody');
const Coupons = require('../models/CouponsModel');
const CustomError = require('../utils/customError');
const Book = require('../models/BooksModel');
const Subscription = require('../models/SubscriptionModel');

couponsRouter.get("/", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.coupons.view) throw new CustomError("غير مصرح لك عرض الكوبونات", 403);

    const coupons = await Coupons.find();
    res.status(200).send({ success: true, coupons });
});

couponsRouter.get("/id/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.coupons.view) throw new CustomError("غير مصرح لك عرض الكوبونات", 403);

    const coupon = await Coupons.findById(req.params.id);
    if (!coupon) throw new CustomError("الكوبون المحدد غير موجود", 404);
    res.status(200).send({ success: true, coupon });
});

couponsRouter.get("/used", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.coupons.view) throw new CustomError("غير مصرح لك عرض الكوبونات", 403);

    const coupons = await Coupons.find({ usedAt: { $ne: null } });
    res.status(200).send({ success: true, coupons });
});

couponsRouter.get("/unused", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.coupons.view) throw new CustomError("غير مصرح لك عرض الكوبونات", 403);

    const coupons = await Coupons.find({ usedAt: null });
    res.status(200).send({ success: true, coupons });
});

couponsRouter.get("/search/:search", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.coupons.view) throw new CustomError("غير مصرح لك عرض الكوبونات", 403);

    const coupons = await Coupons.aggregate([
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $match: {
                $or: [
                    { $expr: { $regexMatch: { input: { $toString: "$_id" }, regex: req.params.search, options: "i" } } },
                    { "user.email": { $regex: req.params.search, $options: "i" } },
                    { "user.name": { $regex: req.params.search, $options: "i" } }
                ]
            }
        }
    ]);

    res.status(200).send({ success: true, coupons });
});

couponsRouter.post("/", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.coupons.create) throw new CustomError("غير مصرح لك إنشاء كوبون", 403);
    validateBody(req.body, ["number", "discount"], true, ["subscription", "book"]);

    const definedFields = ["subscription", "book"].filter(field => req.body[field]);
    if (definedFields.length !== 1) throw new CustomError("يجب تحديد إما كتاب أو اشتراك فقط", 400);
    if (definedFields.length === 0) throw new CustomError("يجب تحديد إما كتاب أو اشتراك", 400);

    if (req.body.book) {
        const book = await Book.findById(req.body.book);
        if (!book) throw new CustomError("الكتاب المحدد غير موجود", 404);
    }

    if (req.body.subscription) {
        const subscription = await Subscription.findById(req.body.subscription);
        if (!subscription) throw new CustomError("الاشتراك المحدد غير موجود", 404);
    }

    if (req.body.number < 0 || req.body.number > 1000) throw new CustomError("عدد الكوبونات يجب أن يكون بين 0 و 1000", 400);

    const couponNumber = req.body.number;
    delete req.body.number;
    const coupons = await Coupons.insertMany(Array.from({ length: couponNumber }, () => req.body));
    res.status(201).send({ success: true, coupons });
});

couponsRouter.delete("/", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.coupons.delete) throw new CustomError("غير مصرح لك حذف كوبون", 403);

    validateBody(req.body, ["ids"], true, []);
    if (!Array.isArray(req.body.ids) && req.body.ids.length === 0) throw new CustomError("يجب تحديد كوبونات", 400);

    const coupons = await Coupons.find({ _id: { $in: req.body.ids } });
    if (coupons.length !== req.body.ids.length) throw new CustomError("ليست جميع الكوبونات موجودة", 404);
    await Coupons.deleteMany({ _id: { $in: req.body.ids } });
    res.status(200).send({ success: true, message: "تم حذف الكوبونات بنجاح" });
});

couponsRouter.put("/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    const coupon = await Coupons.findById(req.params.id);
    if (!coupon) throw new CustomError("الكوبون المحدد غير موجود", 404);

    coupon.user = req.user._id;
    await coupon.save();
    res.status(200).send({ success: true, coupon });
});

module.exports = couponsRouter;