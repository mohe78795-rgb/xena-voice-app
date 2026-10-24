import os
import json
import sqlite3
import subprocess
import time
from llama_cpp import Llama

# ----------------------------------------------------
# 1. إعداد مسار النموذج مباشرة من مجلد التنزيلات في الهاتف
# ----------------------------------------------------
MODEL_PATH = "/sdcard/Download/qwen2.5-0.5b-instruct-q4_k_m.gguf"

print("⏳ جاري تحميل نموذج الذكاء الاصطناعي مباشرة من مجلد التنزيلات...")
llm = Llama(
    model_path=MODEL_PATH,
    n_ctx=512,        # حجم الذاكرة المؤقتة للنص
    n_threads=4,      # عدد أنوية المعالج المستخدمة لتسريع الأداء
    verbose=False
)
print("✅ تم تحميل النموذج بنجاح وبدون إنترنت!")

# ----------------------------------------------------
# 2. إعداد قاعدة البيانات المحلية SQLite لمنع تكرار الردود
# ----------------------------------------------------
def init_db():
    conn = sqlite3.connect('local_bot_history.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS processed (
            msg_id TEXT PRIMARY KEY,
            sender TEXT,
            body TEXT,
            reply TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def is_processed(msg_id):
    conn = sqlite3.connect('local_bot_history.db')
    cursor = conn.cursor()
    cursor.execute('SELECT 1 FROM processed WHERE msg_id = ?', (msg_id,))
    exists = cursor.fetchone()
    conn.close()
    return exists is not None

def mark_processed(msg_id, sender, body, reply):
    conn = sqlite3.connect('local_bot_history.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR IGNORE INTO processed (msg_id, sender, body, reply)
        VALUES (?, ?, ?, ?)
    ''', (msg_id, sender, body, reply))
    conn.commit()
    conn.close()

# ----------------------------------------------------
# 3. دوال Termux (قراءة الرسائل وإرسال الردود عبر SMS)
# ----------------------------------------------------
def get_incoming_sms():
    try:
        result = subprocess.run(
            ['termux-sms-inbox', '-l', '5'],
            capture_output=True,
            text=True,
            check=True
        )
        return json.loads(result.stdout)
    except Exception as e:
        print(f"⚠️ خطأ في قراءة الرسائل: {e}")
        return []

def send_sms(number, text):
    try:
        subprocess.run(['termux-sms-send', '-n', number, text], check=True)
        print(f"✉️ تم إرسال الرد بنجاح إلى: {number}")
    except Exception as e:
        print(f"⚠️ خطأ في إرسال الرسالة: {e}")

# ----------------------------------------------------
# 4. توليد الرد عبر النموذج المحلي (Qwen)
# ----------------------------------------------------
def generate_ai_response(user_msg):
    prompt = f"""<|im_start|>system
أنت مساعد لخدمة العملاء. رد باختصار شديد وبأسلوب مهني باللغة العربية، واختم دائماً بعبارة: "شاكرين تعاملك."<|im_end|>
<|im_start|>user
{user_msg}<|im_end|>
<|im_start|>assistant
"""
    response = llm(
        prompt,
        max_tokens=80,
        temperature=0.2,
        stop=["<|im_end|>", "\n\n"]
    )
    return response['choices'][0]['text'].strip()

# ----------------------------------------------------
# 5. حلقة التشغيل الرئيسية المستمرة
# ----------------------------------------------------
def main():
    init_db()
    print("\n🚀 البوت يعمل الآن في الخلفية ويراقب الرسائل الواردة أوفلاين...")
    
    while True:
        messages = get_incoming_sms()
        for msg in messages:
            msg_id = str(msg.get('_id'))
            number = msg.get('number')
            body = msg.get('body', '')
            
            # التأكد من أن الرسالة جديدة ولم يتم الرد عليها مسبقاً
            if msg_id and not is_processed(msg_id):
                print(f"\n📩 رسالة جديدة من {number}: {body}")
                
                # توليد الرد الذكي محلياً
                reply = generate_ai_response(body)
                print(f"🤖 الرد المولّد: {reply}")
                
                # إرسال الرسالة للعميل وتخزين الحالة محلياً
                send_sms(number, reply)
                mark_processed(msg_id, number, body, reply)
                
        # الفحص كل 10 ثوانٍ
        time.sleep(10)

if __name__ == '__main__':
    main()
