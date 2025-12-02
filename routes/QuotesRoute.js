const express = require('express');
const quotesRouter = express.Router();
const mongoose = require("mongoose")
const PostComment = require("../models/PostCommentModel")
const PostLike = require("../models/PostLikeModel")
const Post = require("../models/PostModel")
const CustomError = require('../utils/customError');

const { validateBody } = require('../utils/validateBody');
const { authMidleware } = require('../middlewares/Protected');

quotesRouter.get("/", authMidleware, async (req, res, next) => {
    const quotes = await Post.aggregate([
        {
            $match: {
                status: "approved",
                isQuote: true
            }
        },
        {
            $lookup: {
                from: "postlikes",
                let: { postId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$post", "$$postId"] },
                                    { $eq: ["$user", new mongoose.Types.ObjectId(req.user._id)] }
                                ]
                            }
                        }
                    }
                ],
                as: "userLike"
            }
        },
        {
            $lookup: {
                from: "postlikes",
                localField: "_id",
                foreignField: "post",
                as: "allLikes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $unwind: "$user"
        },
        {
            $lookup: {
                from: "postcomments",
                localField: "_id",
                foreignField: "post",
                as: "comments"
            }
        },
        {
            $addFields: {
                liked: { $gt: [{ $size: "$userLike" }, 0] },
                likes: { $size: "$allLikes" }
            }
        },
        {
            $project: {
                userLike: 0,
                allLikes: 0
            }
        }
    ]);

    res.status(200).send({ success: true, quotes });
});

quotesRouter.get("/user", authMidleware, async (req, res, next) => {
    const quotes = await Post.find({ user: req.user._id, isQuote: true });
    res.status(200).send({ success: true, quotes });
});

quotesRouter.get("/admin", authMidleware, async (req, res, next) => {
    if (!req.user.role) {
        throw new CustomError("المستعمل غير مصرح به", 404);
    }
    if (!req.user.role.permissions.quotes.view) {
        throw new CustomError("غير مصرح لك بمشاهدة الاقتباسات", 403);
    }
    const quotes = await Post.find({ isQuote: true });
    res.status(200).send({ success: true, quotes });
});

quotesRouter.get("/:id", authMidleware, async (req, res, next) => {
    const quote = await Post.findOne({ _id: req.params.id, status: "approved", isQuote: true });
    if (!quote) {
        throw new CustomError("الاقتباس المطلوب غير موجود", 404);
    }
    res.status(200).send({ success: true, quote });
});

quotesRouter.post("/", authMidleware, async (req, res, next) => {
    validateBody(req.body, ["body", "title"], true, []);
    req.body.user = req.user._id;
    req.body.isQuote = true;

    const newQuote = new Post(req.body);
    await newQuote.save();
    res.status(201).send({ success: true, quote: newQuote });
});

quotesRouter.put("/:id", authMidleware, async (req, res, next) => {
    validateBody(req.body, [], true, ["body", "title", "image"]);

    const quote = await Post.findOne({ _id: req.params.id, user: req.user._id, isQuote: true });
    if (!quote) throw new CustomError("الاقتباس المطلوب غير موجود", 404);

    const updateInfo = Object.keys(req.body);
    updateInfo.forEach(update => (quote[update] = req.body[update]));
    await quote.save();

    res.status(200).send({ success: true, message: "تم تحديث الاقتباس بنجاح", quote });
});

quotesRouter.delete("/:id", authMidleware, async (req, res, next) => {
    const quote = await Post.findOne({ _id: req.params.id, isQuote: true });
    if (!quote) throw new CustomError("الاقتباس المطلوب غير موجود", 404);

    const isOwner = quote.user?._id.toString() === req.user._id.toString();
    const hasDeletePermission = req.user.role?.permissions?.quotes?.delete;

    if (!isOwner && !hasDeletePermission) throw new CustomError("غير مصرح لك بحذف هذا الاقتباس", 403);

    await quote.deleteOne();

    res.status(200).send({ success: true, message: "تم حذف الاقتباس بنجاح" });
});

quotesRouter.post("/:id/like", authMidleware, async (req, res, next) => {
    const quote = await Post.findOne({ _id: req.params.id, isQuote: true, status: "approved" });
    if (!quote) throw new CustomError("الاقتباس المطلوب غير موجود", 404);

    const existingLike = await PostLike.findOne({ user: req.user._id, post: req.params.id });
    if (existingLike) {
        await PostLike.deleteOne({ _id: existingLike._id });
        res.status(200).send({ success: true, message: "تم إزالة الإعجاب من الاقتباس", liked: false });
    } else {
        const newLike = new PostLike({ user: req.user._id, post: req.params.id });
        await newLike.save();
        res.status(201).send({ success: true, message: "تم إضافة الإعجاب إلى الاقتباس", liked: true, like: newLike });
    }
});

quotesRouter.post("/:id/comment", authMidleware, async (req, res, next) => {
    validateBody(req.body, ["comment"], true, []);

    const quote = await Post.findOne({ _id: req.params.id, isQuote: true, status: "approved" });
    if (!quote) throw new CustomError("الاقتباس المطلوب غير موجود", 404);

    const newComment = new PostComment({ user: req.user._id, post: req.params.id, comment: req.body.comment });
    await newComment.save();

    res.status(201).send({ success: true, message: "تم إضافة التعليق بنجاح", comment: newComment });
});

quotesRouter.put("/comment/:commentId", authMidleware, async (req, res, next) => {
    validateBody(req.body, ["comment"], true, []);

    const comment = await PostComment.findOne({ _id: req.params.commentId, user: req.user._id });
    if (!comment) throw new CustomError("التعليق المطلوب غير موجود", 404);

    comment.comment = req.body.comment;
    await comment.save();

    res.status(200).send({ success: true, message: "تم تحديث التعليق بنجاح", comment });
});

quotesRouter.delete("/comment/:commentId", authMidleware, async (req, res, next) => {
    const comment = await PostComment.findById(req.params.commentId);
    if (!comment) throw new CustomError("التعليق المطلوب غير موجود", 404);

    const isOwner = comment.user?._id.toString() === req.user._id.toString();
    const hasDeletePermission = req.user.role?.permissions?.quotes?.delete;

    if (!isOwner && !hasDeletePermission) throw new CustomError("غير مصرح لك بحذف هذا التعليق", 403);

    await PostComment.deleteOne({ _id: req.params.commentId });

    res.status(200).send({ success: true, message: "تم حذف التعليق بنجاح" });
});

quotesRouter.post("/approved/:id", authMidleware, async (req, res, next) => {
    if (!req.user.role) {
        throw new CustomError("المستعمل غير مصرح به", 404);
    }
    if (!req.user.role.permissions.quotes.edit) {
        throw new CustomError("غير مصرح لك بتعديل الاقتباسات", 403);
    }

    const quote = await Post.findOne({ _id: req.params.id, isQuote: true });
    if (!quote) throw new CustomError("الاقتباس المطلوب غير موجود", 404);

    if (quote.status === "approved") throw new CustomError("الاقتباس موافق عليه مسبقاً", 400);

    quote.status = "approved";
    await quote.save();

    res.status(200).send({ success: true, message: "تمت الموافقة على الاقتباس بنجاح", quote });
});

quotesRouter.post("/reject/:id", authMidleware, async (req, res, next) => {
    if (!req.user.role) {
        throw new CustomError("المستعمل غير مصرح به", 404);
    }
    if (!req.user.role.permissions.quotes.edit) {
        throw new CustomError("غير مصرح لك بتعديل الاقتباسات", 403);
    }

    const quote = await Post.findOne({ _id: req.params.id, isQuote: true });
    if (!quote) throw new CustomError("الاقتباس المطلوب غير موجود", 404);

    if (quote.status === "rejected") throw new CustomError("الاقتباس مرفوض مسبقاً", 400);

    quote.status = "rejected";
    await quote.save();

    res.status(200).send({ success: true, message: "تم رفض الاقتباس بنجاح", quote });
});

module.exports = quotesRouter;