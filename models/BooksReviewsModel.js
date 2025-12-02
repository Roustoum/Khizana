const mongoose = require("mongoose");

const bookReviewSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "المستخدم مطلوب"]
    },
    book:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Book",
        required: [true, "الكتاب مطلوب"]
    },
    rating:{
        type: Number,
        required: [true, "التقييم مطلوب"],
        min: [0, "التقييم لا يمكن أن يكون أقل من 0"],
        max: [5, "التقييم لا يمكن أن يكون أكثر من 5"],
    },
    comment:{
        type: String,
    }
},{timestamps: true});
bookReviewSchema.index({user: 1, book: 1}, {unique: true});

bookReviewSchema.pre(/^find/, function (next) {
    if (this.getOptions().skipPopulate) {
        return next();
    }

    this.populate({ path: "user", options: { skipPopulate: true } });
    this.populate({ path: "book", options: { skipPopulate: true } });
    next();
});

const BookReview = mongoose.model("BookReview", bookReviewSchema);
module.exports = BookReview;