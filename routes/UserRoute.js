const express = require('express');
const userRouter = express.Router();
const { validateBody } = require('../utils/validateBody');
const { authMidleware } = require('../middlewares/Protected');
const { BanMiddleware } = require('../middlewares/Ban');
const CustomError = require('../utils/customError');
const User = require('../models/UserModel');
const Author = require('../models/AuthorModel');
const Publisher = require('../models/PublisherModel');
const Role = require('../models/RoleModel');
const Book = require('../models/BooksModel');
const BookUser = require('../models/BookUserModel');

userRouter.get("/", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.users.view) {
        throw new CustomError("غير مصرح لك بحذف المستخدمين", 403);
    }
    const users = await User.find();
    res.status(200).send({ success: true, users });
});

userRouter.get("/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new CustomError("المستخدم غير موجود", 404);
    res.status(200).send({ success: true, user });
});

userRouter.post("/", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions?.users?.create) {
        throw new CustomError("غير مصرح لك بإنشاء مستخدمين", 403);
    }
    validateBody(req.body, ["name", "email", "password"], true, []);

    const user = new User(req.body);
    await user.save();

    res.status(201).send({ success: true, user });
});

userRouter.put("/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.users.edit) {
        throw new CustomError("غير مصرح لك بتعديل المستخدمين", 403);
    }
    validateBody(req.body, [], true, ["name", "email", "password", "role"]);

    if (req.body.role !== undefined) {
        const role = await Role.findById(req.body.role);
        if (!role) throw new CustomError("الدور غير موجود", 404);
    }

    const user = await User.findById(req.params.id);
    if (!user) throw new CustomError("المستخدم غير موجود", 404);

    const updateInfo = Object.keys(req.body);
    updateInfo.forEach(update => (user[update] = req.body[update]));
    await user.save();

    res.status(200).send({ success: true, user });
});

userRouter.delete("/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.users.delete) {
        throw new CustomError("غير مصرح لك بحذف المستخدمين", 403);
    }

    const user = await User.findById(req.params.id);
    if (!user) throw new CustomError("المستخدم غير موجود", 404);
    await user.deleteOne();
    res.status(200).send({ success: true, message: "تم حذف المستخدم بنجاح" });
});

userRouter.get("/search/:search", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.users.view) {
        throw new CustomError("غير مصرح لك بمشاهدة المستخدمين", 403);
    }

    const search = req.params.search;
    const users = await User.find({
        $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ]
    });

    res.status(200).send({ success: true, users });
});

userRouter.post("/ban/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions?.users?.manage) {
        throw new CustomError("غير مصرح لك بحظر المستخدمين", 403);
    }
    validateBody(req.body, ["duration", "ban_reson"], true, []);

    const user = await User.findById(req.params.id);
    if (!user) throw new CustomError("المستخدم غير موجود", 404);

    const { duration } = req.body;
    req.body.banned_at = new Date();

    switch (duration) {
        case 'day':
            req.body.ban_expire_at = new Date(req.body.banned_at.getTime() + 24 * 60 * 60 * 1000);
            break;
        case 'week':
            req.body.ban_expire_at = new Date(req.body.banned_at.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            req.body.ban_expire_at = new Date(req.body.banned_at.getTime() + 30 * 24 * 60 * 60 * 1000);
            break;
        case 'permanent':
            req.body.ban_expire_at = null;
            break;
        default:
            throw new CustomError("مدة الحظر غير صالحة", 400);
    }
    req.body.is_active = false;

    const updateInfo = Object.keys(req.body);
    updateInfo.forEach(update => (user[update] = req.body[update]));
    await user.save();

    res.status(200).send({ success: true, message: `تم حظر المستخدم ${duration === 'permanent' ? 'بشكل دائم' : `لمدة ${duration}`}`, user });
});

userRouter.post("/unban/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.users.manage) {
        throw new CustomError("غير مصرح لك بإلغاء حظر المستخدمين", 403);
    }

    const user = await User.findById(req.params.id);
    if (!user) throw new CustomError("المستخدم غير موجود", 404);

    user.banned_at = undefined;
    user.ban_expire_at = undefined;
    user.ban_reson = undefined;
    user.is_active = true;

    await user.save();
    res.status(200).send({ success: true, message: "تم إلغاء حظر المستخدم بنجاح", user });
});

userRouter.post("/author/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.users.manage) throw new CustomError("غير مصرح لك بإدارة روابط المستخدمين", 403);
    validateBody(req.body, ["authorId"], true, []);

    const user = await User.findById(req.params.id);
    if (!user) throw new CustomError("المستخدم غير موجود", 404);

    const author = await Author.findById(req.body.authorId);
    if (!author) throw new CustomError("المؤلف غير موجود", 404);

    user.author = req.body.authorId;
    await user.save();

    res.status(200).send({ success: true, message: "تم ربط المستخدم بالمؤلف بنجاح", user, author });
});

userRouter.post("/publisher/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.users.manage) throw new CustomError("غير مصرح لك بإدارة روابط المستخدمين", 403);

    validateBody(req.body, ["publisherId"], true, []);

    const user = await User.findById(req.params.id);
    if (!user) throw new CustomError("المستخدم غير موجود", 404);

    const publisher = await Publisher.findById(req.body.publisherId);
    if (!publisher) throw new CustomError("الناشر غير موجود", 404);

    user.publisher = req.body.publisherId;
    await user.save();

    res.status(200).send({
        success: true,
        message: "تم ربط المستخدم بالناشر بنجاح",
        user,
        publisher
    });
});

userRouter.post("/author/unlink/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.users.manage) throw new CustomError("غير مصرح لك بإدارة روابط المستخدمين", 403);

    const user = await User.findById(req.params.id);
    if (!user) throw new CustomError("المستخدم غير موجود", 404);

    user.author = undefined;
    await user.save();

    res.status(200).send({ success: true, message: "تم فك ربط المستخدم بالمؤلف بنجاح", user });
});

userRouter.post("/publisher/unlink/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.users.manage) throw new CustomError("غير مصرح لك بإدارة روابط المستخدمين", 403);

    const user = await User.findById(req.params.id);
    if (!user) throw new CustomError("المستخدم غير موجود", 404);

    user.publisher = undefined;
    await user.save();

    res.status(200).send({ success: true, message: "تم فك ربط المستخدم بالناشر بنجاح", user });
});

userRouter.post("/book/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.users.manage) throw new CustomError("غير مصرح لك بإدارة روابط المستخدمين", 403);
    validateBody(req.body, ["booksId"], true, []);

    const user = await User.findById(req.params.id);
    if (!user) throw new CustomError("المستخدم غير موجود", 404);

    if (!Array.isArray(req.body.booksId)) throw new CustomError("الكتب يجب أن تكون مصفوفة", 400);
    const booksCount = await Book.countDocuments({ _id: { $in: req.body.booksId } });
    if (booksCount !== req.body.booksId.length) throw new CustomError("بعض الكتب غير موجودة", 404);

    const bookUserRelations = req.body.booksId.map(bookId => ({ user: user._id, book: bookId }));
    const bookUser = await BookUser.insertMany(bookUserRelations);

    res.status(200).send({ success: true, message: `تم إضافة الكتب بنجاح`, bookUser });
});

userRouter.put("/removebook/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.users.manage) throw new CustomError("غير مصرح لك بإدارة روابط المستخدمين", 403);
    validateBody(req.body, ["booksId"], true, []);

    const user = await User.findById(req.params.id);
    if (!user) throw new CustomError("المستخدم غير موجود", 404);

    if (!Array.isArray(req.body.booksId)) throw new CustomError("الكتب يجب أن تكون مصفوفة", 400);
    const bookUser = await BookUser.deleteMany({ user: user._id, book: { $in: req.body.booksId } });

    res.status(200).send({ success: true, message: `تم إزالة ${bookUser.deletedCount} كتاب بنجاح`, deletedCount: bookUser.deletedCount });
});

module.exports = userRouter;