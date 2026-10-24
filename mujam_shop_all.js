import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

async function exportShopDatabase() {
  // رابط الاتصال بقاعدة بيانات mujam_shop
  const uri = 'mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/mujam_shop?retryWrites=true&w=majority';
  
  const client = new MongoClient(uri);

  try {
    console.log("جاري الاتصال بقاعدة البيانات السحابية (mujam_shop)...");
    await client.connect();
    
    const dbName = 'mujam_shop';
    const db = client.db(dbName);
    
    // جلب قائمة كل المجموعات (Collections) الموجودة في قاعدة البيانات
    const collections = await db.listCollections().toArray();
    console.log(`تم العثور على ${collections.length} مجموعة (Collection) داخل قاعدة بيانات المتجر/الأنظمة.`);

    // إنشاء مجلد خاص بالنسخ الاحتياطي في التنزيلات
    const downloadDir = '/sdcard/Download/Mujam_Shop_Backup';
    if (!fs.existsSync(downloadDir)){
        fs.mkdirSync(downloadDir, { recursive: true });
    }

    // المرور على كل مجموعة وسحب جميع بياناتها وحفظها بملف منفصل
    for (let colInfo of collections) {
      const colName = colInfo.name;
      console.log(`جاري سحب وتصدير المجموعة: [ ${colName} ] ...`);
      
      const data = await db.collection(colName).find({}).toArray();
      
      const filePath = path.join(downloadDir, `${colName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      
      console.log(`✓ تم حفظ ${data.length} عنصر في الملف: ${colName}.json`);
    }

    console.log(`\n🎉 تم الانتهاء من سحب كل محتويات قاعدة البيانات بنجاح!`);
    console.log(`📁 تجد جميع الملفات مجتمعة في مجلد هاتفك: ${downloadDir}`);

  } catch (error) {
    console.error("حدث خطأ أثناء الاتصال أو التصدير:", error);
  } finally {
    await client.close();
  }
}

exportShopDatabase();
