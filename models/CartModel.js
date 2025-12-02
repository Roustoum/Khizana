const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    book: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Book",
        required: [true, "يجب تحديد الكتاب"]
    },
    chargilyId: {
        type: String,
    },
    ispayed: {
        type: Boolean,
        default: false
    },
    price: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

cartSchema.pre(/^find/, function (next) {
    if (this.getOptions().skipPopulate) {
        return next();
    }

    this.populate({ path: "user", options: { skipPopulate: true } });
    this.populate({ path: "book", options: { skipPopulate: true } });
    next();
});

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;