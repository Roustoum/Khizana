const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "اسم الاشتراك مطلوب"],
        unique: [true, 'اسم الاشتراك موجود مسبقاً']
    },
    icon: {
        type: String,
        required: [true, "رمز الاشتراك مطلوب"],
        enum: {
            values: ['crown', 'star', 'gem', 'rocket', 'zap', 'shield', 'book-open', 'graduation-cap', 'award', 'trophy', 'key', 'lock', 'certificate', 'medal', 'sun', 'moon', 'heart', 'flame'],
            message: "الرمز المحدد غير صحيح"
        }
    },
    price: {
        type: Number,
        min: [0, 'السعر لا يمكن أن يكون أقل من 0'],
        default: 0,
    },
    months: {
        type: Number,
        min: [1, 'عدد الأشهر يجب أن يكون 1 على الأقل'],
        default: 1,
        required: [true, 'عدد الأشهر مطلوب']
    },
    reduction: {
        type: Number,
        min: [0, 'نسبة التخفيض لا يمكن أن تكون أقل من 0'],
        max: [100, 'نسبة التخفيض لا يمكن أن تتجاوز 100'],
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true,
    }
}, { timestamps: true });

const Subscription = mongoose.model("Subscription", subscriptionSchema);
module.exports = Subscription;