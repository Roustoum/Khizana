const mongoose = require("mongoose");

const bookUserSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "المستخدم مطلوب"]
    },
    book: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Book",
        required: [true, "الكتاب مطلوب"]
    }
}, { timestamps: true });

bookUserSchema.index({ user: 1, book: 1 }, { unique: true });
const BookUser = mongoose.model("BookUser", bookUserSchema);
module.exports = BookUser;