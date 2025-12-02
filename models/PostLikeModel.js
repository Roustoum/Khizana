const mongoose = require("mongoose");

const postLikeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "المستخدم مطلوب"],
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        required: [true, "المنشور مطلوب"],
    },
}, { timestamps: true });

postLikeSchema.index({ user: 1, post: 1 }, { unique: true });

const PostLike = mongoose.model("PostLike", postLikeSchema);
module.exports = PostLike;