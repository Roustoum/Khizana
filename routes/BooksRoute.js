const express = require('express');
const bookRouter = express.Router();
const createUploader = require("../middlewares/Uploads");
const { authMidleware } = require('../middlewares/Protected');
const { BanMiddleware } = require('../middlewares/Ban');
const { validateBody } = require('../utils/validateBody');
const { extractPDFText, getTopUsersByPeriod } = require('../controllers/BookController');
const CustomError = require('../utils/customError');
const Book = require('../models/BooksModel');
const Author = require('../models/AuthorModel');
const Publisher = require('../models/PublisherModel');
const Category = require('../models/CategoriesModel');
const BookUser = require('../models/BookUserModel');
const BooksReads = require('../models/BooksReadsModel');
const path = require("path");
const User = require('../models/UserModel');

const uploadBookFiles = createUploader(["public/books/images", "public/books/pdfs"], ["cover", "pdf"], ["image", "pdf"], true);

bookRouter.get('/search/:query', authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.public_books.view) throw new CustomError("غير مصرح لك بمشاهدة الكتب العامة", 403);
    const books = await Book.find({ is_educational: false, $or: [{ title: { $regex: req.params.query, $options: 'i' } }, { description: { $regex: req.params.query, $options: 'i' } }] }).setOptions({ skipPopulate: true });
    res.status(200).send({ success: true, books });
});

bookRouter.get("/me", authMidleware, BanMiddleware, async (req, res, next) => {
    let books = await BookUser.find({ user: req.user._id }).populate({ path: "book", match: { is_active: true } });
    books = books.filter(bookUser => bookUser.book !== null).map(bookUser => bookUser.book);
    res.status(200).send({ success: true, books });
});

bookRouter.get("/gift/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    validateBody(req.body, ["bookId"], true, []);
    const otherUser = await User.findById(req.params.id);
    if (!otherUser) throw new CustomError("المستخدم المطلوب غير موجود", 404);

    const book = await Book.findById(req.body.bookId);
    if (!book) throw new CustomError("الكتاب المطلوب غير موجود", 404);

    const bookUser = await BookUser.findOne({ user: req.user._id, book: book._id });
    if (!bookUser) throw new CustomError("الكتاب ليس لك", 400);

    bookUser.user = req.params.id;
    await bookUser.save();

    req.user.offred_books_number++;
    await req.user.save();
    res.status(200).send({ success: true, message: "تم اهداء الكتاب بنجاح", bookUser });
});

bookRouter.get("/", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.public_books.view) throw new CustomError("غير مصرح لك بمشاهدة الكتب العامة", 403);

    const books = await Book.find({ is_educational: false });
    res.status(200).send({ success: true, books });
});

bookRouter.get("/id/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    const book = await Book.findOne({ _id: req.params.id, is_active: true, is_educational: false });
    if (!book) {
        throw new CustomError("الكتاب المطلوب غير موجود", 404);
    }
    res.status(200).send({ success: true, book });
});

bookRouter.post("/", uploadBookFiles.any(), authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.public_books.create) throw new CustomError("غير مصرح لك بإنشاء كتب عامة", 403);

    validateBody(req.body, ["isbn", "title", "description", "price", "language", "pages", "discount", "publication_date"], true, ["order", "free", "category", "author", "publisher", "is_active"]);

    if (req.body.author) {
        const author = await Author.findById(req.body.author);
        if (!author) throw new CustomError("المؤلف المحدد غير موجود", 404);
    }
    if (req.body.publisher) {
        const publisher = await Publisher.findById(req.body.publisher);
        if (!publisher) throw new CustomError("الناشر المحدد غير موجود", 404);
    }
    if (req.body.category) {
        const category = await Category.findById(req.body.category);
        if (!category) throw new CustomError("التصنيف المحدد غير موجود", 404);
    }

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

bookRouter.put("/:id", uploadBookFiles.any(), authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) {
        throw new CustomError("المستعمل غير مصرح به", 404);
    }
    if (!req.user.role.permissions.public_books.edit) {
        throw new CustomError("غير مصرح لك بإنشاء كتب عامة", 403);
    }

    validateBody(req.body, [], true, ["order", "free", "category", "author", "publisher", "isbn", "title", "description", "price", "language", "pages", "discount", "publication_date", "is_active"]);

    const book = await Book.findById(req.params.id);
    if (!book) {
        throw new CustomError("الكتاب المطلوب غير موجود", 404);
    }
    if (book.is_educational) {
        throw new CustomError("لا يمكن تعديل كتاب تعليمي من خلال هذا المسار", 403);
    }

    if (req.body.author) {
        const author = await Author.findById(req.body.author);
        if (!author) throw new CustomError("المؤلف المحدد غير موجود", 404);
    }
    if (req.body.publisher) {
        const publisher = await Publisher.findById(req.body.publisher);
        if (!publisher) throw new CustomError("الناشر المحدد غير موجود", 404);
    }
    if (req.body.category) {
        const category = await Category.findById(req.body.category);
        if (!category) throw new CustomError("التصنيف المحدد غير موجود", 404);
    }

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

    const updateInfo = Object.keys(req.body);
    updateInfo.forEach(update => (book[update] = req.body[update]));
    await book.save();

    res.status(201).send({ success: true, book });
});

bookRouter.delete("/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role?.permissions?.public_books?.delete) throw new CustomError("غير مصرح لك بحذف كتب عامة", 403);

    const book = await Book.findOne({ _id: req.params.id, is_educational: false });
    if (!book) throw new CustomError("الكتاب المطلوب غير موجود", 404);

    await book.deleteOne();

    res.status(200).send({ success: true, message: "تم حذف الكتاب بنجاح" });
});

bookRouter.get("/read/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    const book = await Book.findOne({ _id: req.params.id, is_educational: false });
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

bookRouter.get("/readTrial/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    const book = await Book.findOne({ _id: req.params.id, is_educational: false });
    if (!book) throw new CustomError("الكتاب المطلوب غير موجود", 404);

    let content = await extractPDFText(book);
    content = content.slice(0, 1000);

    res.status(200).send({ success: true, book, content, message: "تم قراءة الكتاب بنجاح" });
});

bookRouter.get("/download/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    const book = await Book.findOne({ _id: req.params.id, is_educational: false });
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

bookRouter.get("/analysis", authMidleware, BanMiddleware, async (req, res, next) => {
    const readUserNumberQuest = await BooksReads.aggregate([{ $group: { _id: "$user" } }, { $count: "totalUsers" }]);
    const readUserNumber = readUserNumberQuest[0]?.totalUsers || 0;

    const readBookNumberQuest = await BooksReads.aggregate([{ $group: { _id: "$book" } }, { $count: "uniqueBooksCount" }]);
    const readBookNumber = readBookNumberQuest[0]?.uniqueBooksCount || 0;

    const userCount = await User.countDocuments();
    const bookCount = await Book.countDocuments();

    const topUser7Days = await getTopUsersByPeriod(7);
    const topUser30Days = await getTopUsersByPeriod(30);
    const topUser365Days = await getTopUsersByPeriod(365);

    res.status(200).send({ success: true, message: "تم تحليل البيانات بنجاح", readUserNumber, readBookNumber, userCount, bookCount, topUser7Days, topUser30Days, topUser365Days });
});

module.exports = bookRouter;