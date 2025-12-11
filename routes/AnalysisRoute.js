const express = require('express');
const analysisRoute = express.Router();
const { authMidleware } = require('../middlewares/Protected');
const { BanMiddleware } = require('../middlewares/Ban');
const CustomError = require('../utils/customError');
const User = require('../models/UserModel');
const Book = require('../models/BooksModel');
const Category = require('../models/CategoriesModel');

analysisRoute.get('/', authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.dashboard.view) throw new CustomError("غير مصرح لك بمشاهدة التحليلات", 403);
    const users = await User.countDocuments();
    const books = await Book.countDocuments();
    const activeUsers = await User.countDocuments({ is_active: true, $or: [{ banned_at: null }, { ban_expire_at: { $lte: new Date() } }] });
    const categories = await Category.countDocuments();

    const subscribedUsers = await User.countDocuments({ subscription: { $ne: null }, subscriptionExipireDate: { $gt: new Date() } });
    const nonSubscribedUsers = await User.countDocuments({ $or: [{ subscription: null }, { subscriptionExipireDate: { $lte: new Date() } }] });

    const top5Categories = await Category.aggregate([
        { $lookup: { from: "books", localField: "_id", foreignField: "category", as: "books" } },
        { $addFields: { activeBooks: { $filter: { input: "$books", as: "book", cond: { $eq: ["$$book.is_active", true] } } } } },
        { $addFields: { booksCount: { $size: "$activeBooks" } } },
        { $sort: { booksCount: -1 } },
        { $limit: 5 }
    ]);

    const last5Books = await Book.find().sort({ createdAt: -1 }).limit(5);
    const last5Users = await User.find().sort({ createdAt: -1 }).limit(5);

    res.status(200).send({ success: true, users, books, activeUsers, categories, subscribedUsers, nonSubscribedUsers, top5Categories, last5Books, last5Users });
});
module.exports = analysisRoute;