const express = require('express');
const publisherRouter = express.Router();
const createUploader = require("../middlewares/Uploads");
const { authMidleware } = require('../middlewares/Protected');
const { BanMiddleware } = require('../middlewares/Ban');
const { validateBody } = require('../utils/validateBody');
const Publisher = require('../models/PublisherModel');
const CustomError = require('../utils/customError');
const mongoose = require("mongoose");
const Book = require('../models/BooksModel');

const publisherProfile = createUploader("public/publisher", ["image"], ["image"], true, 10);

publisherRouter.get("/analysis/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (req.user?.publisher?._id.toString() !== req.params.id) {
        if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
        if (!req.user.role.permissions.publishers.view) throw new CustomError("ليس لديك صلاحية مشاهدة الناشرين", 403);
    }
    const publisherId = req.params.id;
    const analysis = await Book.aggregate([
        {
            $match: { publisher: new mongoose.Types.ObjectId(publisherId) }
        },
        {
            $lookup: {
                from: "carts",
                localField: "_id",
                foreignField: "book",
                as: "salesData"
            }
        },
        {
            $addFields: {
                paidSales: {
                    $filter: {
                        input: "$salesData",
                        as: "sale",
                        cond: { $eq: ["$$sale.ispayed", true] }
                    }
                }
            }
        },
        {
            $project: {
                title: 1,
                price: 1,
                language: 1,
                pages: 1,
                views: 1,
                free: 1,
                discount: 1,
                publication_date: 1,
                image: 1,
                category: 1,
                author: 1,
                totalSales: { $size: "$paidSales" },
                totalRevenue: {
                    $sum: "$paidSales.price"
                },
                averagePrice: {
                    $cond: {
                        if: { $gt: [{ $size: "$paidSales" }, 0] },
                        then: {
                            $divide: [
                                { $sum: "$paidSales.price" },
                                { $size: "$paidSales" }
                            ]
                        },
                        else: 0
                    }
                },
                salesData: 1
            }
        },
        {
            $sort: { totalSales: -1 }
        }
    ]);

    await Book.populate(analysis, [
        { path: 'category', options: { skipPopulate: true } },
        { path: 'author', options: { skipPopulate: true } }
    ]);

    const totals = analysis.reduce((acc, book) => {
        return {
            totalBooks: acc.totalBooks + 1,
            totalSales: acc.totalSales + book.totalSales,
            totalRevenue: acc.totalRevenue + book.totalRevenue
        };
    }, { totalBooks: 0, totalSales: 0, totalRevenue: 0 });

    const booksWithoutSales = analysis.filter(book => book.totalSales === 0).length;
    const topSellingBooks = analysis.slice(0, 5);
    const topRevenueBooks = [...analysis].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);

    res.status(200).json({
        success: true,
        data: {
            summary: totals,
            books: analysis,
            analytics: {
                topSellingBooks,
                topRevenueBooks,
                booksWithoutSales,
            }
        }
    });
});

publisherRouter.get("/", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role?.permissions?.publishers?.view) throw new CustomError("ليس لديك صلاحية مشاهدة الناشرين", 403);

    const publishers = await Publisher.find();
    res.status(200).send({ success: true, publishers });
});

publisherRouter.get("/id/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    const publisher = await Publisher.findById(req.params.id);
    if (!publisher) throw new CustomError("الناشر غير موجود", 404);

    res.status(200).send({ success: true, publisher });
});

publisherRouter.post("/", publisherProfile.any(), authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role?.permissions?.publishers?.create) throw new CustomError("ليس لديك صلاحية إنشاء ناشرين", 403);

    validateBody(req.body, ["name"], true, ["description", "facebook", "youtube", "telegram", "whatsapp", "instagram", "is_verified"]);

    if (req.files && req.files.length > 0) {
        req.body.image = req.files[0].filename;
    }

    const publisher = new Publisher(req.body);
    await publisher.save();
    res.status(201).send({ success: true, publisher });
});

publisherRouter.put("/:id", publisherProfile.any(), authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role?.permissions?.publishers?.edit) throw new CustomError("ليس لديك صلاحية تعديل ناشرين", 403);

    validateBody(req.body, [], false, ["name", "description", "facebook", "youtube", "telegram", "whatsapp", "instagram", "is_verified"]);

    if (req.files && req.files.length > 0) {
        req.body.image = req.files[0].filename;
    }

    const publisher = await Publisher.findById(req.params.id);
    if (!publisher) throw new CustomError("الناشر غير موجود", 404);

    const updateInfo = Object.keys(req.body);
    updateInfo.forEach(update => (publisher[update] = req.body[update]));
    await publisher.save();

    res.status(200).send({ success: true, publisher });
});

publisherRouter.delete("/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role?.permissions?.publishers?.delete) throw new CustomError("ليس لديك صلاحية حذف ناشرين", 403);

    const publisher = await Publisher.findById(req.params.id);
    if (!publisher) throw new CustomError("الناشر غير موجود", 404);

    await publisher.deleteOne();
    res.status(200).send({ success: true, message: "تم حذف الناشر بنجاح" });
});

module.exports = publisherRouter;