require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = process.env.MONGO_URI;
const folderName = 'zoe';
const collectionName = 'zoe';

async function uploadData() {
  try {
    await mongoose.connect(mongoURI);
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح.');

    const db = mongoose.connection.db;
    const collection = db.collection(collectionName);
    const folderPath = path.join(__dirname, folderName);

    if (!fs.existsSync(folderPath)) {
      console.log('❌ لم يتم العثور على المجلد zoe!');
      process.exit(1);
    }

    const files = fs.readdirSync(folderPath);
    let allData = [];

    files.forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(folderPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        try {
          const fileData = JSON.parse(content);
          if (Array.isArray(fileData)) {
            allData.push(...fileData);
          } else {
            allData.push(fileData);
          }
        } catch (e) {
          console.error(`⚠️ خطأ في قراءة الملف ${file}:`, e.message);
        }
      }
    });

    if (allData.length === 0) {
      console.log('⚠️ لا توجد بيانات JSON صالحة داخل مجلد zoe.');
    } else {
      // تحويل $oid و $date لمُعرّفات وتواريخ Mongo حقيقية
      const parsedData = allData.map(item => {
        if (item._id && item._id.$oid) {
          item._id = new mongoose.Types.ObjectId(item._id.$oid);
        }
        if (item.createdAt && item.createdAt.$date) {
          item.createdAt = new Date(item.createdAt.$date);
        }
        if (item.updatedAt && item.updatedAt.$date) {
          item.updatedAt = new Date(item.updatedAt.$date);
        }
        return item;
      });

      const result = await collection.insertMany(parsedData);
      console.log(`🎉 تم رفع ${result.insertedCount} وثيقة إلى كولكشن '${collectionName}' بنجاح!`);
    }

  } catch (error) {
    if (error.code === 11000) {
      console.log('⚠️ هذه الوثيقة (_id) موجودة بالفعل في قاعدة البيانات.');
    } else {
      console.error('❌ حدث خطأ أثناء الرفع:', error.message);
    }
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

uploadData();
