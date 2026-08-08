const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('مستخدم متصل:', socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`المستخدم ${socket.id} انضم إلى الغرفة: ${roomId}`);
        socket.to(roomId).emit('user-connected', socket.id);
    });

    socket.on('offer', (data) => {
        socket.to(data.target).emit('offer', { offer: data.offer, sender: socket.id });
    });

    socket.on('answer', (data) => {
        socket.to(data.target).emit('answer', { answer: data.answer, sender: socket.id });
    });

    socket.on('ice-candidate', (data) => {
        socket.to(data.target).emit('ice-candidate', { candidate: data.candidate, sender: socket.id });
    });

    socket.on('disconnect', () => {
        console.log('انقطع اتصال المستخدم:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`السيرفر يعمل بنجاح على المنفذ ${PORT}`);
});
