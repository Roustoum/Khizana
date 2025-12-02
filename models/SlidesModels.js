const mongoose = require("mongoose");
const path = require("path");
const autoFileCleanup = require("../utils/autoFileCleanup");

const slidesSchema = new mongoose.Schema({
    image: {
        type: String,
        required: [true, "صورة مطلوبة"],
        trim: true,
        autoCleanup: true,
        basePath: path.join(__dirname, "..", "public", "slides"),
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Author"
    },
    publisher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Publisher"
    },
    book: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Book"
    }
}, { timestamps: true });

slidesSchema.plugin(autoFileCleanup);

slidesSchema.pre(/^find/, function (next) {
    if (this.getOptions().skipPopulate) {
        return next();
    }

    this.populate({ path: "author", options: { skipPopulate: true } });
    this.populate({ path: "publisher", options: { skipPopulate: true } });
    this.populate({ path: "book", options: { skipPopulate: true } });
    next();
});

const Slides = mongoose.model("Slides", slidesSchema);
module.exports = Slides;