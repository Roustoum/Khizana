const express = require('express');
const userInterestRouter = express.Router();
const { authMidleware } = require('../middlewares/Protected');
const { BanMiddleware } = require('../middlewares/Ban');
const { validateBody } = require('../utils/validateBody');
const UserInterest = require('../models/UserInterestModel');
const CustomError = require('../utils/customError');
const Category = require('../models/CategoriesModel');

userInterestRouter.get("/", authMidleware, BanMiddleware, async (req, res, next) => {
    const userInterests = await UserInterest.find({ user: req.user.id });
    res.status(200).send({ success: true, userInterests });
});

userInterestRouter.post("/", authMidleware, BanMiddleware, async (req, res, next) => {
    validateBody(req.body, ["interest"], true, []);
    const category = await Category.findById(req.body.interest);
    if (!category) throw new CustomError("الاهتمام غير موجود", 404);

    req.body.user = req.user._id
    const userInterest = new UserInterest(req.body);
    await userInterest.save();
    res.status(201).send({ success: true, userInterest });
});

userInterestRouter.delete("/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    const userInterest = await UserInterest.findById(req.params.id);
    if (!userInterest) throw new CustomError("الاهتمام غير موجود", 404);

    await userInterest.deleteOne();
    res.status(200).send({ success: true, message: "تم حذف الاهتمام بنجاح" });
});

module.exports = userInterestRouter;