const express = require('express');
const authorRouter = express.Router();
const createUploader = require("../middlewares/Uploads");
const { authMidleware } = require('../middlewares/Protected');
const { BanMiddleware } = require('../middlewares/Ban');
const { validateBody } = require('../utils/validateBody');
const Author = require('../models/AuthorModel');
const CustomError = require('../utils/customError');
const Book = require('../models/BooksModel');
const mongoose = require('mongoose');

const authorProfile = createUploader("public/author", ["image"], ["image"], true, 10);

authorRouter.get("/analysis/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (req.user?.author?._id.toString() !== req.params.id) {
        if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
        if (!req.user.role.permissions.authors.view) throw new CustomError("ليس لديك صلاحية مشاهدة المؤلفين", 403);
    }
    const authorId = req.params.id;
    const analysis = await Book.aggregate([
        {
            $match: { author: new mongoose.Types.ObjectId(authorId) }
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
                publisher: 1,
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
        { path: 'publisher', options: { skipPopulate: true } }
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

authorRouter.get("/", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) {
        throw new CustomError("المستعمل غير مصرح به", 404);
    }
    if (!req.user.role.permissions.authors.view) {
        throw new CustomError("ليس لديك صلاحية مشاهدة المؤلفين", 403);
    }
    const authors = await Author.find();
    res.status(200).send({ success: true, authors });
});

authorRouter.get("/id/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    const author = await Author.findById(req.params.id);
    if (!author) throw new CustomError("المؤلف غير موجود", 404);

    res.status(200).send({ success: true, author });
});

authorRouter.post("/", authMidleware, BanMiddleware, authorProfile.any(), async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.authors.create) throw new CustomError("ليس لديك صلاحية إنشاء مؤلفين", 403);

    validateBody(req.body, ["name"], true, ["description", "facebook", "youtube", "telegram", "whatsapp", "instagram", "is_verified"]);

    if (req.files && req.files.length > 0) {
        req.body.image = req.files[0].filename;
    }

    const author = new Author(req.body);
    await author.save();
    res.status(201).send({ success: true, author });
});

authorRouter.put("/:id", authMidleware, BanMiddleware, authorProfile.any(), async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.authors.edit) throw new CustomError("ليس لديك صلاحية تعديل مؤلفين", 403);

    validateBody(req.body, [], false, ["name", "description", "facebook", "youtube", "telegram", "whatsapp", "instagram", "is_verified"]);

    if (req.files && req.files.length > 0) {
        req.body.image = req.files[0].filename;
    }

    const author = await Author.findById(req.params.id);
    if (!author) {
        throw new CustomError("المؤلف غير موجود", 404);
    }

    const updateinfo = Object.keys(req.body)
    updateinfo.forEach(update => author[update] = req.body[update])
    await author.save();

    res.status(200).send({ success: true, author });
});

authorRouter.delete("/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) {
        throw new CustomError("المستعمل غير مصرح به", 404);
    }
    if (!req.user.role.permissions.authors.delete) {
        throw new CustomError("ليس لديك صلاحية حذف مؤلفين", 403);
    }

    const author = await Author.findById(req.params.id);
    if (!author) {
        throw new CustomError("المؤلف غير موجود", 404);
    }

    await author.deleteOne();
    res.status(200).send({ success: true, message: "تم حذف المؤلف بنجاح" });
});

authorRouter.get("analysis/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.authors.view) throw new CustomError("ليس لديك صلاحية تحليل مؤلفين", 403);
    const author = await Author.findById(req.params.id);

    if (!author) throw new CustomError("المؤلف غير موجود", 404);
    res.status(200).send({ success: true, author });
});

module.exports = authorRouter;