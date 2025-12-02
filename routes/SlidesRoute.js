const express = require('express');
const slidesRouter = express.Router();
const createUploader = require("../middlewares/Uploads");
const { authMidleware } = require('../middlewares/Protected');
const { BanMiddleware } = require('../middlewares/Ban');
const { validateBody } = require('../utils/validateBody');
const Slides = require('../models/SlidesModels');
const Author = require('../models/AuthorModel');
const CustomError = require('../utils/customError');
const Publisher = require('../models/PublisherModel');
const Book = require('../models/BooksModel');

const uploadSlidesFiles = createUploader(["public/slides"], ["image"], ["image"], true);

slidesRouter.get("/", authMidleware, BanMiddleware, async (req, res, next) => {
    const slides = await Slides.find();
    res.status(200).send({ success: true, slides });
});

slidesRouter.get("/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    const slide = await Slides.findById(req.params.id);
    if (!slide) throw new CustomError("العرض المحدد غير موجود", 404);
    res.status(200).send({ success: true, slide });
});

slidesRouter.post("/", uploadSlidesFiles.fields([{ name: "image", maxCount: 1 }]), authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.slides.create) throw new CustomError("غير مصرح لك بإنشاء عرض", 403);

    if (req.files) {
        if (req.files.image) req.body.image = req.files.image[0].filename;
    }
    validateBody(req.body, ["image"], true, ["author", "book", "publisher"]);

    const definedFields = ["author", "publisher", "book"].filter(field => req.body[field]);
    if (definedFields.length !== 1) throw new CustomError("يجب تحديد إما كتاب أو مؤلف أو ناشر فقط", 400);

    if (req.body.author) {
        const author = await Author.findById(req.body.author);
        if (!author) throw new CustomError("المؤلف المحدد غير موجود", 404);
    }
    if (req.body.publisher) {
        const publisher = await Publisher.findById(req.body.publisher);
        if (!publisher) throw new CustomError("الناشر المحدد غير موجود", 404);
    }
    if (req.body.book) {
        const book = await Book.findById(req.body.book);
        if (!book) throw new CustomError("الكتاب المحدد غير موجود", 404);
    }
    const slide = new Slides(req.body);
    await slide.save();
    res.status(201).send({ success: true, slide });
});

slidesRouter.put("/:id", uploadSlidesFiles.fields([{ name: "image", maxCount: 1 }]), authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.slides.edit) throw new CustomError("غير مصرح لك تعديل عرض", 403);

    validateBody(req.body, [], true, ["author", "book", "publisher"]);
    if (req.files) {
        if (req.files.image) req.body.image = req.files.image[0].filename;
    }
    const definedFields = ["author", "publisher", "book"].filter(field => req.body[field]);
    if (definedFields.length !== 1) throw new CustomError("يجب تحديد إما كتاب أو مؤلف أو ناشر فقط", 400);
    if (req.body.author) {
        const author = await Author.findById(req.body.author);
        if (!author) throw new CustomError("المؤلف المحدد غير موجود", 404);
    }
    if (req.body.publisher) {
        const publisher = await Publisher.findById(req.body.publisher);
        if (!publisher) throw new CustomError("الناشر المحدد غير موجود", 404);
    }
    if (req.body.book) {
        const book = await Book.findById(req.body.book);
        if (!book) throw new CustomError("الكتاب المحدد غير موجود", 404);
    }
    const slide = await Slides.findById(req.params.id);
    if (!slide) throw new CustomError("العرض المحدد غير موجود", 404);

    slide.author = undefined;
    slide.publisher = undefined;
    slide.book = undefined;

    const updateInfo = Object.keys(req.body);
    updateInfo.forEach(update => (slide[update] = req.body[update]));
    await slide.save();
    res.status(201).send({ success: true, slide });
});

slidesRouter.delete("/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.slides.delete) throw new CustomError("غير مصرح لك حذف عرض", 403);

    const slide = await Slides.findById(req.params.id);
    if (!slide) throw new CustomError("العرض المحدد غير موجود", 404);
    await slide.deleteOne();
    res.status(200).send({ success: true, message: "تم حذف العرض بنجاح" });
});

module.exports = slidesRouter;