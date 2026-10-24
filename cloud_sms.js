const axios = require('axios');

async function sendSmsViaCloud() {
    // التوكن السحابي الخاص بهاتفك (من قسم Cloud Service في التطبيق)
    const cloudToken = 'F4TbusfLQ8CqmOdzsK9Iyv:APA91bHGBwDI0c_w3VRp8lsKVhRyRscnXN9wnxFf-6JVB0qSMFrd5BOiM_tzUkPgO2diV9PuG1blEOGtf-yybXtEc77-D9dj_jaFmkeNQMNV9zLEohLiX7k';
    
    const phone = '735429057';
    const message = 'مرحباً، هذه رسالة تجريبية تم إرسالها عبر السحابة والتطبيق.';

    // بناء طلب إشعار FCM الموجه لتطبيق Gateway على هاتفك
    const fcmPayload = {
        to: cloudToken,
        data: {
            to: phone,
            message: message
        }
    };

    try {
        // إرسال الطلب إلى خوادم فايربيس الرسمية لتوجيهه لهاتفك
        const response = await axios.post('https://fcm.googleapis.com/fcm/send', fcmPayload, {
            headers: {
                'Content-Type': 'application/json',
                // ملاحظة: يمكنك وضع مفتاح الخادم العام (Server Key) الخاص بفايربيس هنا إن تطلب الأمر، 
                // أو استخدام واجهة التطبيق المباشرة للربط السحابي.
                'Authorization': 'key=YOUR_FCM_SERVER_KEY' 
            }
        });

        console.log('تم إرسال أمر السحابة بنجاح:', response.data);
    } catch (error) {
        console.error('حدث خطأ أثناء الإرسال السحابي:', error.response ? error.response.data : error.message);
    }
}

sendSmsViaCloud();
