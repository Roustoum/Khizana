const mongoose = require("mongoose");

const postCommentSchema = new mongoose.Schema({
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
    comment: {
        type: String,
        required: [true, "التعليق مطلوب"],
        trim: true,
    },
}, { timestamps: true });

postCommentSchema.pre(/^find/, function (next) {
    if (this.getOptions().skipPopulate) {
        return next();
    }

    this.populate({ path: "user", options: { skipPopulate: true } });
    next();
});

const PostComment = mongoose.model("PostComment", postCommentSchema);
module.exports = PostComment;