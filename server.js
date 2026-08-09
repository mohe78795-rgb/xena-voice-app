const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let seats = {
    host: { user: "الملك (المذيع)", socketId: null },
    1: { user: null, socketId: null, isLocked: false },
    2: { user: null, socketId: null, isLocked: false },
    3: { user: null, socketId: null, isLocked: false },
    4: { user: null, socketId: null, isLocked: false },
    5: { user: null, socketId: null, isLocked: false },
    6: { user: null, socketId: null, isLocked: true }
};

let onlineUsers = 0;
let roomHostSocketId = null;

io.on('connection', (socket) => {
    onlineUsers++;
    if (!roomHostSocketId) {
        roomHostSocketId = socket.id;
        seats.host.socketId = socket.id;
    }

    socket.emit('init_seats', { seats, hostId: roomHostSocketId });
    io.emit('update_users_count', onlineUsers);

    // صعود المايك
    socket.on('take_seat', (seatId) => {
        if (seats[seatId] && !seats[seatId].isLocked && !seats[seatId].user) {
            Object.keys(seats).forEach(s => {
                if (seats[s].socketId === socket.id && s !== 'host') {
                    seats[s].user = null;
                    seats[s].socketId = null;
                }
            });

            seats[seatId].user = socket.username || "مستخدم";
            seats[seatId].socketId = socket.id;
            io.emit('update_seats', seats);
            // إعلام باقي المتواجدين ببدء اتصال الصوت
            socket.broadcast.emit('user_joined_mic', { socketId: socket.id, seatId });
        }
    });

    // النزول من المايك
    socket.on('leave_seat', () => {
        Object.keys(seats).forEach(s => {
            if (seats[s].socketId === socket.id && s !== 'host') {
                seats[s].user = null;
                seats[s].socketId = null;
            }
        });
        io.emit('update_seats', seats);
        io.broadcast.emit('user_left_mic', { socketId: socket.id });
    });

    // إدارة المقاعد من قِبل المالك
    socket.on('admin_control_seat', (data) => {
        if (socket.id === roomHostSocketId && seats[data.seatId]) {
            if (data.action === 'toggle_lock') {
                seats[data.seatId].isLocked = !seats[data.seatId].isLocked;
            } else if (data.action === 'kick') {
                const targetSocketId = seats[data.seatId].socketId;
                seats[data.seatId].user = null;
                seats[data.seatId].socketId = null;
                if (targetSocketId) {
                    io.to(targetSocketId).emit('kicked_from_mic');
                }
            }
            io.emit('update_seats', seats);
        }
    });

    // WebRTC Signaling (تبادل إشارات الصوت بين المتصفحات)
    socket.on('offer', (data) => {
        io.to(data.target).emit('offer', { offer: data.offer, sender: socket.id });
    });

    socket.on('answer', (data) => {
        io.to(data.target).emit('answer', { answer: data.answer, sender: socket.id });
    });

    socket.on('ice-candidate', (data) => {
        io.to(data.target).emit('ice-candidate', { candidate: data.candidate, sender: socket.id });
    });

    socket.on('join_room', (data) => {
        socket.username = data.username;
        io.emit('receive_message', { sender: 'النظام', message: `${data.username} انضم إلى الغرفة.`, type: 'system' });
    });

    socket.on('send_message', (data) => {
        io.emit('receive_message', data);
    });

    socket.on('change_settings', (data) => {
        io.emit('update_room_settings', data);
    });

    socket.on('disconnect', () => {
        onlineUsers = Math.max(0, onlineUsers - 1);
        if (socket.id === roomHostSocketId) roomHostSocketId = null;
        
        Object.keys(seats).forEach(s => {
            if (seats[s].socketId === socket.id) {
                seats[s].user = null;
                seats[s].socketId = null;
            }
        });
        io.emit('update_seats', seats);
        io.emit('update_users_count', onlineUsers);
        io.broadcast.emit('user_left_mic', { socketId: socket.id });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
