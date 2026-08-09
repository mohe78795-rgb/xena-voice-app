const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ربط مجلد public بشكل صحيح ليعمل على Render
app.use(express.static(path.join(__dirname, 'public')));

let onlineUsers = 0;

io.on('connection', (socket) => {
    console.log('مستخدم جديد متصل:', socket.id);

    socket.on('join_room', (data) => {
        onlineUsers++;
        io.emit('update_users_count', onlineUsers);
        io.emit('receive_message', { sender: 'النظام', message: `${data.username} انضم إلى الغرفة.`, type: 'system' });
    });

    socket.on('send_message', (data) => {
        // إعادة إرسال الرسالة لكل المتواجدين في الروم
        io.emit('receive_message', data);
    });

    socket.on('change_settings', (data) => {
        io.emit('update_room_settings', data);
    });

    socket.on('disconnect', () => {
        onlineUsers = Math.max(0, onlineUsers - 1); // تم التصحيح هنا لاستخدام Math.max
        io.emit('update_users_count', onlineUsers);
        console.log('مستخدم غادر الغرفة');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`السيرفر يعمل الآن على البورت: ${PORT}`);
});
