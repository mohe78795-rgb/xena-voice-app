import dns.resolver
import pymongo

# ضبط DNS يدوي لبيئة Termux
resolver = dns.resolver.Resolver(configure=False)
resolver.nameservers = ['8.8.8.8', '1.1.1.1']
dns.resolver.default_resolver = resolver

MONGO_URI = "mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/aptomix_card?retryWrites=true&w=majority"
FILE_PATH = "/storage/emulated/0/Download/قاعدة بيانات الباقات.txt"

client = pymongo.MongoClient(MONGO_URI)
db = client["aptomix_card"]
collection = db["packages"]

try:
    with open(FILE_PATH, 'r', encoding='utf-8') as file:
        lines = [line.strip() for line in file if line.strip()]

    if lines:
        docs = [{"raw_data": line} for line in lines]
        result = collection.insert_many(docs)
        print(f"تم رفع {len(result.inserted_ids)} عنصر بنجاح.")
    else:
        print("الملف فارغ.")
except Exception as e:
    print(f"خطأ: {e}")
