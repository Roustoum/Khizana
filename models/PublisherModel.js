const mongoose = require("mongoose");
const validator = require("validator");
const fs = require("fs");
const path = require("path");
const { Book } = require("./BooksModel");

const publisherSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "اسم الناشر مطلوب"],
        trim: true,
    },
    image: {
        type: String,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    facebook: {
        type: String,
        trim: true,
        validate: [validator.isURL, "يرجى إدخال رابط فايسبوك صالح"],
    },
    youtube: {
        type: String,
        trim: true,
        validate: [validator.isURL, "يرجى إدخال رابط يوتيوب صالح"],
    },
    telegram: {
        type: String,
        trim: true,
        validate: [validator.isURL, "يرجى إدخال رابط تيليجرام صالح"],
    },
    whatsapp: {
        type: String,
        trim: true,
        validate: [validator.isURL, "يرجى إدخال رابط واتساب صالح"],
    },
    instagram: {
        type: String,
        trim: true,
        validate: [validator.isURL, "يرجى إدخال رابط إنستغرام صالح"],
    },
    is_verified: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

publisherSchema.virtual("books", {
    ref: "Book",
    localField: "_id",
    foreignField: "publisher",
});

publisherSchema.virtual("booksCount", {
    ref: "Book",
    localField: "_id",
    foreignField: "publisher",
    count: true,
});

publisherSchema.set("toObject", { virtuals: true });
publisherSchema.set("toJSON", { virtuals: true });

publisherSchema.pre(/^find/, function (next) {
    if (this.getOptions().skipPopulate) {
        return next();
    }

    this.populate("books");
    this.populate("booksCount");
    next();
});

publisherSchema.pre("save", async function (next) {
    if (this.isModified("image")) {
        const oldPublisher = await this.constructor.findById(this._id).select("image");
        if (oldPublisher && oldPublisher.image) {
            this._oldImage = oldPublisher.image;
        }
    }
    next();
});

publisherSchema.post("save", async function (doc, next) {
    if (this._oldImage) {
        fs.unlink(path.join(__dirname, "..", "public", "publisher", this._oldImage), () => { });
    }
    next();
});

publisherSchema.pre(/^findOneAndDelete$|^deleteOne$|^findByIdAndDelete$/, async function (next) {
    const doc = await this.model.findOne(this.getFilter());
    this._docToDelete = doc;
    next();
});

publisherSchema.post(/^findOneAndDelete$|^deleteOne$|^findByIdAndDelete$/, async function () {
    const doc = this._docToDelete;
    if (doc && doc.image) {
        fs.unlink(path.join(__dirname, "..", "public", "publisher", doc.image), () => { });
    }

    await Book.updateMany({ publisher: doc._id }, { $set: { publisher: null } });
});

const Publisher = mongoose.model("Publisher", publisherSchema);
module.exports = Publisher;