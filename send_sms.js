const axios = require('axios');

async function sendSms() {
    const phone = '735429057';
    const message = 'مرحباً، تم تنفيذ الأمر بنجاح.';
    const token = 'b3f04a80-f979-4589-891a-82da39296bb'; // الرمز المحلي الظاهر في التطبيق[span_0](start_span)[span_0](end_span)
    
    try {
        const response = await axios.post(`http://127.0.0.1:8082/?token=${token}`, {
            to: phone,
            message: message
        }, {
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            }
        });
        
        console.log('تم إرسال الرسالة بنجاح إلى الرقم 735429057:', response.data);
    } catch (error) {
        console.error('حدث خطأ أثناء الإرسال:', error.response ? error.response.data : error.message);
    }
}

sendSms();
