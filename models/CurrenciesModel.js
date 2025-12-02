const mongoose = require("mongoose");

const currencySchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, "كود العملة مطلوب"],
        unique: [true, "كود العملة موجود"],
        trim: true,
        uppercase: true,
    },
    name: {
        type: String,
        required: [true, "اسم العملة مطلوب"],
        trim: true,
    },
    rate_to_dz: {
        type: Number,
        required: [true, "معدل التحويل إلى الدينار الجزائري مطلوب"],
    },
}, { timestamps: true });


const Currency = mongoose.model("Currency", currencySchema);
module.exports = Currency;