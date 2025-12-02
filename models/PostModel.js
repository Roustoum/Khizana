const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const PostLike = require("./PostLikeModel");
const PostComment = require("./PostCommentModel");
const autoFileCleanup = require("../utils/autoFileCleanup");

const postSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "المستخدم مطلوب"],
    },
    body: {
        type: String,
        required: [true, "محتوى المنشور مطلوب"],
        trim: true,
    },
    title: {
        type: String,
        required: [true, "عنوان المنشور مطلوب"],
        trim: true,
    },
    image: {
        type: String,
        trim: true,
        autoCleanup: true,
        basePath: path.join(__dirname, "..", "public", "posts"),
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    rejection_note: {
        type: String,
        trim: true,
    },
    isQuote: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });
postSchema.set("toObject", { virtuals: true });
postSchema.set("toJSON", { virtuals: true });

postSchema.plugin(autoFileCleanup);

postSchema.virtual("likes", {
    ref: "PostLike",
    localField: "_id",
    foreignField: "post",
    count: true
});

postSchema.virtual("comments", {
    ref: "PostComment",
    localField: "_id",
    foreignField: "post",
});

postSchema.pre(/^find/, function (next) {
    if (this.getOptions().skipPopulate) {
        return next();
    }

    this.populate({ path: "user", options: { skipPopulate: true } });
    this.populate({ path: "comments", options: { skipPopulate: false } });
    this.populate({ path: "likes", options: { skipPopulate: true } });
    next();
});

postSchema.pre(/^findOneAndDelete$|^deleteOne$|^findByIdAndDelete$/, async function (next) {
    const doc = await this.model.findOne(this.getFilter());
    this._docToDelete = doc;
    next();
});

postSchema.post(/^findOneAndDelete$|^deleteOne$|^findByIdAndDelete$/, async function () {
    const doc = this._docToDelete;

    await PostLike.deleteMany({ post: doc._id });
    await PostComment.deleteMany({ post: doc._id });
});

const Post = mongoose.model("Post", postSchema);
module.exports = Post;