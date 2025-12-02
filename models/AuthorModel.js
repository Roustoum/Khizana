const mongoose = require("mongoose");
const validator = require("validator");
const fs = require("fs");
const path = require("path");
const { Book } = require("./BooksModel");
const autoFileCleanup = require("../utils/autoFileCleanup");

const authorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "اسم المؤلف مطلوب"],
        trim: true,
    },
    image: {
        type: String,
        trim: true,
        autoCleanup: true, 
        basePath: path.join(__dirname, "..", "public", "author"),
    },
    description: {
        type: String,
        trim: true,
    },
    facebook: {
        type: String,
        trim: true,
        validate: [validator.isURL, "يرجى إدخال رابط فايسبوك صالح"]
    },
    youtube: {
        type: String,
        trim: true,
        validate: [validator.isURL, "يرجى إدخال رابط يوتيوب صالح"]
    },
    telegram: {
        type: String,
        trim: true,
        validate: [validator.isURL, "يرجى إدخال رابط تيليجرام صالح"]
    },
    whatsapp: {
        type: String,
        trim: true,
        validate: [validator.isURL, "يرجى إدخال رابط واتساب صالح"]
    },
    instagram: {
        type: String,
        trim: true,
        validate: [validator.isURL, "يرجى إدخال رابط إنستغرام صالح"]
    },
    is_verified: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

authorSchema.plugin(autoFileCleanup);

authorSchema.virtual("books", {
    ref: "Book",
    localField: "_id",
    foreignField: "author",
});

authorSchema.virtual("booksCount", {
    ref: "Book",
    localField: "_id",
    foreignField: "author",
    count: true,
});

authorSchema.set("toObject", { virtuals: true });
authorSchema.set("toJSON", { virtuals: true });

authorSchema.pre(/^find/, function (next) {
    if (this.getOptions().skipPopulate) {
        return next();
    }

    this.populate("books");
    this.populate("booksCount");
    next();
});

authorSchema.pre(/^findOneAndDelete$|^deleteOne$|^findByIdAndDelete$/, async function (next) {
    const doc = await this.model.findOne(this.getFilter());
    this._docToDelete = doc;
    next();
});

authorSchema.post(/^findOneAndDelete$|^deleteOne$|^findByIdAndDelete$/, async function () {
    const doc = this._docToDelete;
    await Book.updateMany({ author: doc._id }, { $set: { author: null } });
});

const Author = mongoose.model("Author", authorSchema);
module.exports = Author;