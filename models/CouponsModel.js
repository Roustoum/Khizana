const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
    book: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Book"
    },
    subscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subscription"
    },
    discount: {
        type: Number,
        default: 0,
        min: [0, "الخصم يجب أن يكون أكبر من 0"],
        max: [100, "الخصم يجب أن يكون أقل من 100"],
        required: [true, "الخصم مطلوب"]
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    usedAt: {
        type: Date,
    }
}, { timestamps: true });

couponSchema.pre(/^find/, function (next) {
    if (this.getOptions().skipPopulate) {
        return next();
    }

    this.populate({ path: "user", options: { skipPopulate: true } });
    next();
});

const Coupons = mongoose.model("Coupons", couponSchema);
module.exports = Coupons;