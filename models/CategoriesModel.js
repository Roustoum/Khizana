const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Book = require("./BooksModel");
const autoFileCleanup = require("../utils/autoFileCleanup");

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "اسم التصنيف مطلوب"],
        trim: true,
    },
    image: {
        type: String,
        trim: true,
        autoCleanup: true,
        basePath: path.join(__dirname, "..", "public", "category"),
    },
    description: {
        type: String,
        trim: true,
    },
    order: {
        type: Number,
        default: 0,
        min: [0, "ترتيب التصنيف لا يمكن أن يكون سالباً"],
    }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

categorySchema.plugin(autoFileCleanup);

categorySchema.virtual("books", {
    ref: "Book",
    localField: "_id",
    foreignField: "category",
    match: { is_active: true }
});

categorySchema.virtual("booksCount", {
    ref: "Book",
    localField: "_id",
    foreignField: "category",
    count: true,
});

categorySchema.pre(/^find/, function (next) {
    if (this.getOptions().skipPopulate) {
        return next();
    }

    this.populate("books");
    this.populate("booksCount");
    next();
});

categorySchema.pre(/^findOneAndDelete$|^deleteOne$|^findByIdAndDelete$/, async function (next) {
    const doc = await this.model.findOne(this.getFilter());
    this._docToDelete = doc;
    next();
});

categorySchema.post(/^findOneAndDelete$|^deleteOne$|^findByIdAndDelete$/, async function () {
    const doc = this._docToDelete;
    await Book.updateMany({ category: doc._id }, { $set: { category: null } });
});

const Category = mongoose.model("Category", categorySchema);
module.exports = Category;