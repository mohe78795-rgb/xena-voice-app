const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/aptomix_card?retryWrites=true&w=majority";

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ متصل بقاعدة بيانات MongoDB (aptomix_card) بنجاح");
    } catch (err) {
        console.error("❌ خطأ في الاتصال بقاعدة البيانات:", err);
    }
};

module.exports = connectDB;
