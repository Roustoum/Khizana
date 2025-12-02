const express = require('express');
const educationalBookRouter = express.Router();
const createUploader = require("../middlewares/Uploads");
const Book = require('../models/BooksModel');
const CustomError = require('../utils/customError');
const BookUser = require('../models/BookUserModel');
const BooksReads = require('../models/BooksReadsModel');
const { authMidleware } = require('../middlewares/Protected');
const { BanMiddleware } = require('../middlewares/Ban');
const { validateBody } = require('../utils/validateBody');
const { extractPDFText } = require('../controllers/BookController');
const path = require("path");

const uploadBookFiles = createUploader(["public/books/images", "public/books/pdfs"], ["cover", "pdf"], ["image", "pdf"], true);

educationalBookRouter.get('/search/:query', authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.educational_books.view) throw new CustomError("غير مصرح لك بمشاهدة الكتب العامة", 403);
    const books = await Book.find({ is_educational: true, $or: [{ title: { $regex: req.params.query, $options: 'i' } }, { description: { $regex: req.params.query, $options: 'i' } }], ...req.body }).setOptions({ skipPopulate: true });
    res.status(200).send({ success: true, books });
});

educationalBookRouter.get("/search", authMidleware, BanMiddleware, async (req, res, next) => {
    validateBody(req.body, [], true, ["level", "subject", "content_type", "year", "trimester"]);
    const books = await Book.find({ is_educational: true, ...req.body });
    res.status(200).send({ success: true, books });
});

educationalBookRouter.get("/", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.educational_books.view) throw new CustomError("غير مصرح لك بمشاهدة الكتب العامة", 403);

    const books = await Book.find({ is_educational: true });
    res.status(200).send({ success: true, books });
});

educationalBookRouter.get("/id/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    const book = await Book.findOne({ _id: req.params.id, is_active: true, is_educational: true });
    if (!book) throw new CustomError("الكتاب المطلوب غير موجود", 404);
    res.status(200).send({ success: true, book });
});

educationalBookRouter.post("/", uploadBookFiles.any(), authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.educational_books.create) throw new CustomError("غير مصرح لك بإنشاء كتب عامة", 403);

    validateBody(req.body, ["title", "description", "language", "level", "subject", "content_type", "year", "trimester", "free", "price"], true, ["contry"]);

    req.body.is_educational = true;
    if (req.files) {
        req.files.forEach(file => {
            if (file.fieldname === "cover") {
                req.body.image = file.filename;
            }
            if (file.fieldname === "pdf") {
                req.body.pdf = file.filename;
            }
        });
    }

    const newBook = new Book(req.body);
    await newBook.save();
    res.status(201).send({ success: true, book: newBook });
});

educationalBookRouter.put("/:id", uploadBookFiles.any(), authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.educational_books.edit) throw new CustomError("غير مصرح لك بإنشاء كتب عامة", 403);

    validateBody(req.body, [], true, ["title", "description", "language", "level", "subject", "content_type", "contry", "trimester", "year", "free", "price"]);

    if (req.files) {
        req.files.forEach(file => {
            if (file.fieldname === "cover") {
                req.body.image = file.filename;
            }
            if (file.fieldname === "pdf") {
                req.body.pdf = file.filename;
            }
        });
    }

    const book = await Book.findById(req.params.id);
    if (!book) {
        throw new CustomError("الكتاب المطلوب غير موجود", 404);
    }
    if (book.is_educational == false) {
        throw new CustomError("لا يمكن تعديل هذا الكتاب من خلال هذا المسار", 403);
    }

    const updateInfo = Object.keys(req.body);
    updateInfo.forEach(update => (book[update] = req.body[update]));
    await book.save();

    res.status(201).send({ success: true, book });
});

educationalBookRouter.delete("/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.educational_books.delete) throw new CustomError("غير مصرح لك بحذف كتب عامة", 403);

    const book = await Book.findOne({ _id: req.params.id, is_educational: true });
    if (!book) throw new CustomError("الكتاب المطلوب غير موجود", 404);
    await book.deleteOne();

    res.status(200).send({ success: true, message: "تم حذف الكتاب بنجاح" });
});

educationalBookRouter.get("/read/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    const book = await Book.findOne({ _id: req.params.id, is_educational: true });
    if (!book) throw new CustomError("الكتاب المطلوب غير موجود", 404);

    if (!req.user.role?.permissions?.public_books?.view && book.free === false) {
        const bookUser = await BookUser.findOne({ book: req.params.id, user: req.user._id });
        const isSubscribed = req.user.subscriptionExipireDate > new Date();
        if (!bookUser && !isSubscribed) throw new CustomError("هذا الكتاب ليس لك", 404);
    }

    const content = await extractPDFText(book);

    try { await BooksReads.create({ book: req.params.id, user: req.user._id }); } catch (e) { }

    res.status(200).send({ success: true, book, content, message: "تم قراءة الكتاب بنجاح" });
});

educationalBookRouter.get("/readTrial/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    const book = await Book.findOne({ _id: req.params.id, is_educational: true });
    if (!book) throw new CustomError("الكتاب المطلوب غير موجود", 404);

    let content = await extractPDFText(book);
    content = content.slice(0, 1000);

    res.status(200).send({ success: true, book, content, message: "تم قراءة الكتاب بنجاح" });
});

educationalBookRouter.get("/download/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    const book = await Book.findOne({ _id: req.params.id, is_educational: true });
    if (!book) throw new CustomError("الكتاب المطلوب غير موجود", 404);

    if (!req.user.role?.permissions?.public_books?.view && book.free === false) {
        const bookUser = await BookUser.findOne({ book: req.params.id, user: req.user._id });
        const isSubscribed = req.user.subscriptionExipireDate > new Date();
        if (!bookUser && !isSubscribed) throw new CustomError("هذا الكتاب ليس لك", 404);
    }

    const filePath = path.join(__dirname, '..', 'public', 'books', 'pdfs', book.pdf);

    res.download(filePath, `${book.name}.${path.extname(book.pdf)}`, (error) => {
        if (error) return next(new CustomError("ملف الكتاب غير موجود", 404));
    });
});

module.exports = educationalBookRouter;