const express = require('express');
const bookRatingRouter = express.Router();
const createUploader = require("../middlewares/Uploads");
const { authMidleware } = require('../middlewares/Protected');
const Book = require('../models/BooksModel');
const CustomError = require('../utils/customError');
const { validateBody } = require('../utils/validateBody');
const BookReview = require('../models/BooksReviewsModel');

bookRatingRouter.get("/:bookId/ratings", authMidleware, async (req, res, next) => {
    const book = await Book.findById(req.params.bookId);
    if (!book) {
        throw new CustomError("الكتاب المطلوب غير موجود", 404);
    }
    const ratings = await BookReview.find({ book: req.params.bookId });
    res.status(200).send({ success: true, ratings });
});

bookRatingRouter.post("/:bookId/rate", authMidleware, async (req, res, next) => {
    validateBody(req.body, ["rating"], true, ["comment"]);
    const book = await Book.findById(req.params.bookId);
    if (!book) {
        throw new CustomError("الكتاب المطلوب غير موجود", 404);
    }
    const existingReview = await BookReview.findOne({ book: req.params.bookId, user: req.user._id });

    if (existingReview) {
        const updateInfo = Object.keys(req.body);
        updateInfo.forEach(update => (existingReview[update] = req.body[update]));
        await existingReview.save();
        return res.status(200).send({ success: true, review: existingReview });
    } else {
        req.body.user = req.user._id;
        req.body.book = req.params.bookId;
        const newReview = new BookReview(req.body);
        await newReview.save();
        return res.status(201).send({ success: true, review: newReview });
    }
});

bookRatingRouter.delete("/:bookId/rate", authMidleware, async (req, res, next) => {
    const book = await Book.findById(req.params.bookId);
    if (!book) {
        throw new CustomError("الكتاب المطلوب غير موجود", 404);
    }
    const existingReview = await BookReview.findOne({ book: req.params.bookId, user: req.user._id });
    if (!existingReview) {
        throw new CustomError("لم تقم بتقييم هذا الكتاب من قبل", 404);
    }
    await existingReview.deleteOne();
    res.status(200).send({ success: true, message: "تم حذف التقييم بنجاح" });
});

module.exports = bookRatingRouter;