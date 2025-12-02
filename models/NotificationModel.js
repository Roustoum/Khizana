const mongoose = require("mongoose");
const path = require("path");
const autoFileCleanup = require("../utils/autoFileCleanup");

const notificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "عنوان الإشعار مطلوب"],
        trim: true,
    },
    description: {
        type: String,
        required: [true, "وصف الإشعار مطلوب"],
        trim: true,
    },
    image: {
        type: String,
        trim: true,
        autoCleanup: true,
        basePath: path.join(__dirname, "..", "public", "notification"),
    },
    to_all: {
        type: Boolean,
        default: true,
    },
    to_one: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    beginAt: {
        type: Date,
        default: Date.now()
    },
    endAt: {
        type: Date,
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

notificationSchema.plugin(autoFileCleanup);

notificationSchema.pre(/^find/, function (next) {
    if (this.getOptions().skipPopulate) {
        return next();
    }

    this.populate({ path: "to_one", options: { skipPopulate: true } });
    next();
});

notificationSchema.pre(/^findOneAndDelete$|^deleteOne$|^findByIdAndDelete$/, async function (next) {
    const doc = await this.model.findOne(this.getFilter());
    this._docToDelete = doc;
    next();
});

notificationSchema.post(/^findOneAndDelete$|^deleteOne$|^findByIdAndDelete$/, async function () {
    const doc = this._docToDelete
});


const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;