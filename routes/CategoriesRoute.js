const express = require('express');
const categoryRouter = express.Router();
const createUploader = require("../middlewares/Uploads");
const { authMidleware } = require('../middlewares/Protected');
const Category = require('../models/CategoriesModel');
const CustomError = require('../utils/customError');
const { validateBody } = require('../utils/validateBody');

const categoryUpload = createUploader("public/category", ["image"], ["image"], true, 10);

categoryRouter.get("/", authMidleware, async (req, res, next) => {
    const categories = await Category.find().sort({ order: 1 });
    res.status(200).send({ success: true, categories });
});

categoryRouter.get("/:id", authMidleware, async (req, res, next) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
        throw new CustomError("التصنيف غير موجود", 404);
    }
    res.status(200).send({ success: true, category });
});

categoryRouter.post("/", categoryUpload.any(), authMidleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role?.permissions?.categories?.create) throw new CustomError("ليس لديك صلاحية إنشاء تصنيفات", 403);

    validateBody(req.body, ["name"], true, ["description", "order"]);

    if (req.files && req.files.length > 0) {
        req.body.image = req.files[0].filename;
    }

    const category = new Category(req.body);
    await category.save();
    res.status(201).send({ success: true, category });
});

categoryRouter.put("/:id", categoryUpload.any(), authMidleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role?.permissions?.categories?.edit) throw new CustomError("ليس لديك صلاحية تعديل تصنيفات", 403);

    validateBody(req.body, [], false, ["name", "description", "order"]);

    if (req.files && req.files.length > 0) {
        req.body.image = req.files[0].filename;
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
        throw new CustomError("التصنيف غير موجود", 404);
    }

    const updateInfo = Object.keys(req.body);
    updateInfo.forEach(update => (category[update] = req.body[update]));
    await category.save();

    res.status(200).send({ success: true, category });
});

categoryRouter.delete("/:id", authMidleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role?.permissions?.categories?.delete) throw new CustomError("ليس لديك صلاحية حذف تصنيفات", 403);

    const category = await Category.findById(req.params.id);
    if (!category) throw new CustomError("التصنيف غير موجود", 404);

    await category.deleteOne();
    res.status(200).send({ success: true, message: "تم حذف التصنيف بنجاح" });
});

module.exports = categoryRouter;