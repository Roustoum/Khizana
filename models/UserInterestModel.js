const mongoose = require("mongoose");

const userInterestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    interest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
    }
}, { timestamps: true });

userInterestSchema.pre(/find/, function (next) {
    this.populate({ path: "interest", options: { skipPopulate: true } });
    if (this.getOptions().skipPopulate) {
        return next();
    }

    this.populate({ path: "user", options: { skipPopulate: true } });
    next();
});

const UserInterest = mongoose.model("UserInterest", userInterestSchema);
module.exports = UserInterest;