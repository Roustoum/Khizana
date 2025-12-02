const mongoose = require("mongoose");
const path = require("path");
const BooksReads = require("./BooksReadsModel");
const BookReview = require("./BooksReviewsModel");
const autoFileCleanup = require("../utils/autoFileCleanup");
const Cart = require("./CartModel");
const Coupons = require("./CouponsModel");
const Slides = require("./SlidesModels");

const bookSchema = new mongoose.Schema({
    isbn: {
        type: String,
        trim: true,
    },
    title: {
        type: String,
        required: [true, "عنوان الكتاب مطلوب"],
        trim: true,
    },
    description: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        default: 0,
        min: [0, "سعر الكتاب لا يمكن أن يكون سالباً"],
    },
    language: {
        type: String,
        enum: ["Arabic", "English", "French"],
        required: [true, "لغة الكتاب مطلوبة"],
        trim: true,
    },
    pages: {
        type: Number,
        default: 0,
    },
    views: {
        type: Number,
        default: 0,
    },
    order: {
        type: Number,
        required: [true, "ترتيب الكتاب مطلوب"],
        default: 0,
    },
    is_active: {
        type: Boolean,
        default: true,
    },
    is_educational: {
        type: Boolean,
        default: false,
    },
    discount: {
        type: Number,
        default: 0,
        min: [0, "الخصم لا يمكن أن يكون سالباً"],
        max: [100, "الخصم لا يمكن أن يكون أكثر من 100%"],
    },
    free: {
        type: Boolean,
        default: false,
    },
    contry: {
        type: String,
        trim: true,
    },
    level: {
        type: String,
        enum: ["universty", "highschool", "middle", "primary"],
        trim: true,
    },
    subject: {
        type: String,
        trim: true,
    },
    year: {
        type: Number,
        enum: {
            values: [1, 2, 3, 4, 5, 6],
            message: "السنة يجب أن تكون بين 1 و 6"
        }
    },
    content_type: {
        type: String,
        enum: {
            values: ["approach", "Extaminations", "papers"],
            message: "النوع يجب أن يكون بين approach, Extaminations, papers"
        },
        trim: true,
    },
    trimester: {
        type: String,
        enum: {
            values: ["first", "second", "third"],
            message: "الترم يجب أن يكون بين first, second, third"
        },
    },
    publication_date: {
        type: Date,
    },
    pdf: {
        type: String,
        required: [true, "ملف PDF الكتاب مطلوب"],
        trim: true,
        autoCleanup: true,
        basePath: path.join(__dirname, "..", "public", "books", "pdfs"),
    },
    image: {
        type: String,
        required: [true, "صورة غلاف الكتاب مطلوبة"],
        trim: true,
        autoCleanup: true,
        basePath: path.join(__dirname, "..", "public", "books", "images"),
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Author"
    },
    publisher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Publisher"
    }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

bookSchema.plugin(autoFileCleanup);
bookSchema.index({ isbn: 1 }, { unique: true, sparse: true });

bookSchema.virtual("read_count", {
    ref: "BooksReads",
    localField: "_id",
    foreignField: "book",
    count: true
})

bookSchema.virtual("ratings", {
    ref: "BookReview",
    localField: "_id",
    foreignField: "book",
});

bookSchema.pre(/^find/, function (next) {
    if (this.getOptions().skipPopulate) {
        return next();
    }

    this.populate("read_count")
    this.populate({ path: "author", options: { skipPopulate: true } });
    this.populate({ path: "publisher", options: { skipPopulate: true } });
    this.populate({ path: "category", options: { skipPopulate: true } });
    this.populate({ path: "ratings", options: { skipPopulate: true } });
    next();
});


bookSchema.pre(/^findOneAndDelete$|^deleteOne$|^findByIdAndDelete$/, async function (next) {
    const doc = await this.model.findOne(this.getFilter());
    this._docToDelete = doc;
    next();
});

bookSchema.post(/^findOneAndDelete$|^deleteOne$|^findByIdAndDelete$/, async function () {
    const book = this._docToDelete;

    await BookReview.deleteMany({ book: book._id });
    await BooksReads.deleteMany({ book: book._id });
    await Cart.deleteMany({ book: book._id });
    await Coupons.deleteMany({ book: book._id });
    await Slides.deleteMany({ book: book._id });
})

const Book = mongoose.model("Book", bookSchema);

module.exports = Book;