const mongoose = require("mongoose");

const booksReadsSchema = new mongoose.Schema({
    book: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Books",
        required: [true, "معرف الكتاب مطلوب"],
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "معرف المستخدم مطلوب"],
    }
}, { timestamps: true });
booksReadsSchema.index({ book: 1, user: 1 }, { unique: true });


const BooksReads = mongoose.model("BooksReads", booksReadsSchema);

module.exports = BooksReads;