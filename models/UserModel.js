require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const CustomError = require("../utils/customError");
const fs = require("fs");
const path = require("path");
const autoFileCleanup = require("../utils/autoFileCleanup");
const UserInterest = require("./UserInterestModel");

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, "البريد الإلكتروني مطلوب"],
        unique: [true, "هذا البريد الإلكتروني مستخدم مسبقاً"],
        trim: true,
        lowercase: true,
        validate: [validator.isEmail, "يرجى إدخال بريد إلكتروني صالح"],
    },
    provider: {
        type: String,
        enum: ["local", "google", "facebook"],
        default: "local",
    },
    name: {
        type: String,
        required: [true, "اسم المستخدم مطلوب"],
        trim: true,
    },
    image: {
        type: String,
        trim: true,
        autoCleanup: true,
        basePath: path.join(__dirname, "..", "public", "profile"),
    },
    country: {
        type: String,
        trim: true,
    },
    gender: {
        type: String,
        enum: ["ذكر", "أنثى"],
    },
    bio: {
        type: String,
        trim: true,
    },
    password: {
        type: String,
        minlength: [6, "يجب أن تكون كلمة المرور 6 أحرف على الأقل"],
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Author"
    },
    publisher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Publisher"
    },
    role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role"
    },
    subscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subscription"
    },
    subscriptionExipireDate: {
        type: Date,
    },
    buyed_books_number: {
        type: Number,
        default: 0,
    },
    offred_books_number: {
        type: Number,
        default: 0,
    },
    is_login: {
        type: Boolean,
        default: false,
    },
    is_active: {
        type: Boolean,
        default: true,
    },
    banned_at: {
        type: Date,
    },
    ban_expire_at: {
        type: Date,
    },
    ban_reson: {
        type: String,
        trim: true,
    },
    passwordResetToken: {
        type: String,
    },
    passwordResetExpires: {
        type: Date,
    }
}, { timestamps: true });

userSchema.virtual("interests", {
    ref: "UserInterest",
    localField: "_id",
    foreignField: "user"
});

userSchema.virtual("bookReadedNumber", {
    ref: "BooksReads",
    localField: "_id",
    foreignField: "user",
    count: true
})

userSchema.plugin(autoFileCleanup);
userSchema.set("toObject", { virtuals: true });
userSchema.set("toJSON", { virtuals: true });

userSchema.statics.findUser = async function (email, password) {
    const user = await User.findOne({ email: email });
    const test = await User.find();
    console.log(test)
    console.log("found user:", user);
    if (!user) throw new CustomError("المستخدم غير مصرح له !", 401)

    const compaire = await bcrypt.compare(password, user.password)
    if (!compaire) throw new CustomError("المستخدم غير مصرح له !", 401)
    return user
}

userSchema.methods.toJSON = function () {
    const user = this.toObject()
    delete user.password
    delete user.passwordResetExpires
    delete user.passwordResetToken
    return user
}

userSchema.methods.generateJWToken = function () {
    const token = jwt.sign({ _id: this._id }, process.env.JWT_SECRET_STRING, { expiresIn: process.env.LOGIN_EXPIRES })
    return token
}

userSchema.methods.comparePassword = async function (newPassword) {
    return (!await bcrypt.compare(newPassword, this.password))
}

userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString("hex")
    this.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    console.log(new Date(this.passwordResetExpires).toLocaleString());
    console.log("reset token", resetToken)
    console.log("hashed reset token", this.passwordResetToken)
    return resetToken
}

userSchema.pre(/^find/, function (next) {
    this.populate({ path: "role" });
    if (this.getOptions().skipPopulate) {
        return next();
    }

    this.populate({ path: "subscription", options: { skipPopulate: true } });
    this.populate({ path: "author", options: { skipPopulate: true } });
    this.populate({ path: "publisher", options: { skipPopulate: true } });
    this.populate({ path: "interests", options: { skipPopulate: true } });
    this.populate({ path: "bookReadedNumber", options: { skipPopulate: true } });
    next();
});

userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }

    next();
})

userSchema.pre(/^findOneAndDelete$|^deleteOne$|^findByIdAndDelete$/, async function (next) {
    const doc = await this.model.findOne(this.getFilter());
    this._docToDelete = doc;
    next();
});

userSchema.post(/^findOneAndDelete$|^deleteOne$|^findByIdAndDelete$/, async function () {
    const doc = this._docToDelete;
});

const User = mongoose.model("User", userSchema);
module.exports = User;