const mongoose = require("mongoose");

const contactUsSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "العنوان مطلوب"],
        trim: true,
    },
    description: {
        type: String,
        required: [true, "الوصف مطلوب"],
        trim: true,
    },
    type: {
        type: String,
        enum: {
            values: ["report", "thanks", "other"],
            message: "النوع غير صحيح"
        },
        default: "other"
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });

const ContactUs = mongoose.model("ContactUs", contactUsSchema);
module.exports = ContactUs;
