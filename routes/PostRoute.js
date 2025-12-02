const express = require('express');
const postRouter = express.Router();
const mongoose = require("mongoose");
const PostComment = require("../models/PostCommentModel");
const PostLike = require("../models/PostLikeModel");
const Post = require("../models/PostModel");
const CustomError = require('../utils/customError');

const { validateBody } = require('../utils/validateBody');
const { authMidleware } = require('../middlewares/Protected');
const { BanMiddleware } = require('../middlewares/Ban');
const createUploader = require('../middlewares/Uploads');

const uploadPostFiles = createUploader(["public/posts"], ["image"], ["image"], true);

postRouter.get("/", authMidleware, BanMiddleware, async (req, res, next) => {
    const posts = await Post.aggregate([
        {
            $match: {
                status: "approved",
                isQuote: false
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
                likes: { $size: "$allLikes" } // likes devient directement le count
            }
        },
        {
            $project: {
                userLike: 0,
                allLikes: 0 // On supprime le champ temporaire
            }
        }
    ]);

    res.status(200).send({ success: true, posts });
});

postRouter.get("/user", authMidleware, BanMiddleware, async (req, res, next) => {
    const posts = await Post.find({ user: req.user._id, isQuote: false });
    res.status(200).send({ success: true, posts });
});

postRouter.get("/admin", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) {
        throw new CustomError("المستعمل غير مصرح به", 404);
    }
    if (!req.user.role.permissions.posts.view) {
        throw new CustomError("غير مصرح لك بمشاهدة الكتب العامة", 403);
    }
    const posts = await Post.find({ isQuote: false });
    res.status(200).send({ success: true, posts });
});

postRouter.get("/id/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    const post = await Post.findOne({ _id: req.params.id, status: "approved", isQuote: false });
    res.status(200).send({ success: true, post });
});

postRouter.post("/", uploadPostFiles.any(), authMidleware, BanMiddleware, async (req, res, next) => {
    validateBody(req.body, ["body", "title"], true, []);
    req.body.user = req.user._id;
    if (req.files) {
        req.files.forEach(file => {
            if (file.fieldname === "image") {
                req.body.image = file.filename;
            }
        });
    }
    const newPost = new Post(req.body);
    await newPost.save();
    res.status(201).send({ success: true, post: newPost });
});

postRouter.put("/:id", uploadPostFiles.any(), authMidleware, BanMiddleware, async (req, res, next) => {
    validateBody(req.body, [], true, ["body", "title", "image"]);

    const post = await Post.findOne({ _id: req.params.id, user: req.user._id });
    if (!post) throw new CustomError("المنشور المطلوب غير موجود", 404);

    if (req.files) {
        req.files.forEach(file => {
            if (file.fieldname === "image") {
                req.body.image = file.filename;
            }
        });
    }

    const updateInfo = Object.keys(req.body);
    updateInfo.forEach(update => (post[update] = req.body[update]));
    await post.save();

    res.status(200).send({ success: true, message: "تم تحديث المنشور بنجاح", post });
});

postRouter.delete("/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    const post = await Post.findById(req.params.id);
    if (!post) throw new CustomError("المنشور المطلوب غير موجود", 404);

    const isOwner = post.user?._id.toString() === req.user._id.toString();
    const hasDeletePermission = req.user.role?.permissions?.posts?.delete;

    if (!isOwner && !hasDeletePermission) throw new CustomError("غير مصرح لك بحذف هذا المنشور", 403);

    await post.deleteOne();

    res.status(200).send({ success: true, message: "تم حذف المنشور بنجاح" });
});

postRouter.post("/:id/like", authMidleware, BanMiddleware, async (req, res, next) => {
    const post = await Post.findOne({ _id: req.params.id, isQuote: false, status: "approved" });
    if (!post) throw new CustomError("المنشور المطلوب غير موجود", 404);

    const existingLike = await PostLike.findOne({ user: req.user._id, post: req.params.id });
    if (existingLike) {
        await PostLike.deleteOne({ _id: existingLike._id });
        res.status(200).send({ success: true, message: "تم إزالة الإعجاب من المنشور", liked: false });
    } else {
        const newLike = new PostLike({ user: req.user._id, post: req.params.id });
        await newLike.save();
        res.status(201).send({ success: true, message: "تم إضافة الإعجاب إلى المنشور", liked: true, like: newLike });
    }
});

postRouter.post("/:id/comment", authMidleware, BanMiddleware, async (req, res, next) => {
    validateBody(req.body, ["comment"], true, []);

    const post = await Post.findOne({ _id: req.params.id, isQuote: false, status: "approved" });
    if (!post) throw new CustomError("المنشور المطلوب غير موجود", 404);

    const newComment = new PostComment({ user: req.user._id, post: req.params.id, comment: req.body.comment });
    await newComment.save();

    res.status(201).send({ success: true, message: "تم إضافة التعليق بنجاح", comment: newComment });
});

postRouter.put("/comment/:commentId", authMidleware, BanMiddleware, async (req, res, next) => {
    validateBody(req.body, ["comment"], true, []);

    const comment = await PostComment.findOne({ _id: req.params.commentId, user: req.user._id });

    if (!comment) throw new CustomError("التعليق المطلوب غير موجود", 404);

    comment.comment = req.body.comment;
    await comment.save();

    res.status(200).send({ success: true, message: "تم تحديث التعليق بنجاح", comment });
});

postRouter.delete("/comment/:commentId", authMidleware, BanMiddleware, async (req, res, next) => {
    const comment = await PostComment.findById(req.params.commentId);

    if (!comment) throw new CustomError("التعليق المطلوب غير موجود", 404);

    const isOwner = comment.user?._id.toString() === req.user._id.toString();
    const hasDeletePermission = req.user.role?.permissions?.posts?.delete;

    if (!isOwner && !hasDeletePermission) throw new CustomError("غير مصرح لك بحذف هذا التعليق", 403);

    await PostComment.deleteOne({ _id: req.params.commentId });

    res.status(200).send({ success: true, message: "تم حذف التعليق بنجاح" });
});

postRouter.post("/approved/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) {
        throw new CustomError("المستعمل غير مصرح به", 404);
    }
    if (!req.user.role.permissions.posts.edit) {
        throw new CustomError("غير مصرح لك بتعديل المنشورات", 403);
    }

    const post = await Post.findById(req.params.id);
    if (!post) throw new CustomError("المنشور المطلوب غير موجود", 404);

    if (post.status === "approved") {
        throw new CustomError("المنشور موافق عليه مسبقاً", 400);
    }

    post.status = "approved";

    await post.save();

    res.status(200).send({ success: true, message: "تمت الموافقة على المنشور بنجاح", post });
});

postRouter.post("/reject/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) {
        throw new CustomError("المستعمل غير مصرح به", 404);
    }
    if (!req.user.role.permissions.posts.edit) {
        throw new CustomError("غير مصرح لك بتعديل المنشورات", 403);
    }

    const post = await Post.findById(req.params.id);
    if (!post) throw new CustomError("المنشور المطلوب غير موجود", 404);

    if (post.status === "rejected") {
        throw new CustomError("المنشور مرفوض مسبقاً", 400);
    }

    post.status = "rejected";

    await post.save();

    res.status(200).send({
        success: true,
        message: "تم رفض المنشور بنجاح",
        post
    });
});

postRouter.get("/analysis", authMidleware, BanMiddleware, async (req, res, next) => {
    const postsCount = await Post.countDocuments({ status: "approved" });
    const likesCount = await PostLike.countDocuments();
    const commentsCount = await PostComment.countDocuments();

    const usersCommentsCountQuest = await PostComment.aggregate([{ $group: { _id: "$user" } }, { $count: "totalUsers" }]);
    const usersCommentsCount = usersCommentsCountQuest[0]?.totalUsers || 0;

    const usersLikesCountQuest = await PostLike.aggregate([{ $group: { _id: "$user" } }, { $count: "totalUsers" }]);
    const usersLikesCount = usersLikesCountQuest[0]?.totalUsers || 0;

    const activeUsersCountQuest = await PostComment.aggregate([{ $group: { _id: "$user" } }, { $project: { _id: 1 } },
    { $unionWith: { coll: "postlikes", pipeline: [{ $group: { _id: "$user" } }] } },
    { $group: { _id: "$_id" } },
    { $count: "totalUsers" }
    ]);

    const activeUsersCount = activeUsersCountQuest[0]?.totalUsers || 0;

    const postsCountLastMonth = await Post.countDocuments({ status: "approved", createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) } });

    const mostLikedPosts = await Post.aggregate([
        {
            $lookup: {
                from: "postlikes",
                localField: "_id",
                foreignField: "post",
                as: "likesData"
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likesData" }
            }
        },
        {
            $sort: { likesCount: -1 }
        },
        {
            $limit: 10
        },
        {
            $project: {
                title: 1,
                body: 1,
                image: 1,
                status: 1,
                user: 1,
                likesCount: 1,
                createdAt: 1,
                updatedAt: 1
            }
        }
    ]);

    await Post.populate(mostLikedPosts, { path: "user" });

    res.status(200).send({ success: true, message: "تم الحصول على التحليل بنجاح", postsCount, likesCount, commentsCount, postsCountLastMonth, usersCommentsCount, usersLikesCount, activeUsersCount, mostLikedPosts });
});

module.exports = postRouter;