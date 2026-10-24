import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

async function exportAllCollections() {
  const uri = 'mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/mojam_poultry?retryWrites=true&w=majority';
  
  const client = new MongoClient(uri);

  try {
    console.log("جاري الاتصال بقاعدة البيانات السحابية...");
    await client.connect();
    
    const dbName = 'mujam_shop';
    const db = client.db(dbName);
    
    // جلب قائمة كل المجموعات الموجودة في قاعدة البيانات
    const collections = await db.listCollections().toArray();
    console.log(`تم العثور على ${collections.length} مجموعة (Collection) في قاعدة البيانات.`);

    // مجلد التنزيلات في الهاتف
    const downloadDir = '/sdcard/Download/Mojam_Backup';
    if (!fs.existsSync(downloadDir)){
        fs.mkdirSync(downloadDir, { recursive: true });
    }

    // المرور على كل مجموعة وسحب بياناتها
    for (let colInfo of collections) {
      const colName = colInfo.name;
      console.log(`جاري تصدير المجموعة: ${colName} ...`);
      
      const data = await db.collection(colName).find({}).toArray();
      
      const filePath = path.join(downloadDir, `${colName}_backup.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      
      console.log(`-> تم حفظ ${data.length} مستند في الملف: ${colName}_backup.json`);
    }

    console.log(`\n🎉 تم الانتهاء من تصدير كافة المجموعات بنجاح! تجدها في المجلد: ${downloadDir}`);

  } catch (error) {
    console.error("حدث خطأ أثناء الاتصال أو التصدير:", error);
  } finally {
    await client.close();
  }
}

exportAllCollections();
