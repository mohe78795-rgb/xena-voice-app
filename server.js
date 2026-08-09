const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// حالة المقاعد في الغرفة (8 مقاعد كمثال)
// كل مقعد له: id, user (اسم المستخدم أو null)، isLocked (هل مقفل أم متاح)
let seats = {
    host: { user: "الملك (المذيع)", socketId: null },
    1: { user: null, socketId: null, isLocked: false },
    2: { user: null, socketId: null, isLocked: false },
    3: { user: null, socketId: null, isLocked: false },
    4: { user: null, socketId: null, isLocked: false },
    5: { user: null, socketId: null, isLocked: false },
    6: { user: null, socketId: null, isLocked: true }   // مثال مقعد مقفل
};

let onlineUsers = 0;
let roomHostSocketId = null; // أول شخص يدخل يعتبر صاحب الغرفة

io.on('connection', (socket) => {
    onlineUsers++;
    
    // إذا كان أول شخص يدخل يعتبر هو المالك (Host)
    if (!roomHostSocketId) {
        roomHostSocketId = socket.id;
        seats.host.socketId = socket.id;
    }

    // إرسال حالة المقاعد الحالية للمستخدم الجديد
    socket.emit('init_seats', { seats, hostId: roomHostSocketId });
    io.emit('update_users_count', onlineUsers);

    // طلب الصعود على مايك
    socket.on('take_seat', (seatId) => {
        if (seats[seatId] && !seats[seatId].isLocked && !seats[seatId].user) {
            // إزالة المستخدم من أي مقعد قديم إن وجد
            Object.keys(seats).forEach(s => {
                if (seats[s].socketId === socket.id && s !== 'host') {
                    seats[s].user = null;
                    seats[s].socketId = null;
                }
            });

            seats[seatId].user = socket.username || "مستخدم";
            seats[seatId].socketId = socket.id;
            io.emit('update_seats', seats);
        }
    });

    // النزول من المايك (حرية النزول متى شاء)
    socket.on('leave_seat', () => {
        Object.keys(seats).forEach(s => {
            if (seats[s].socketId === socket.id && s !== 'host') {
                seats[s].user = null;
                seats[s].socketId = null;
            }
        });
        io.emit('update_seats', seats);
    });

    // تحكم صاحب الغرفة: قفل أو فتح مقعد / أو إنزال شخص
    socket.on('admin_control_seat', (data) => {
        // التحقق أن المرسل هو صاحب الغرفة
        if (socket.id === roomHostSocketId && seats[data.seatId]) {
            if (data.action === 'toggle_lock') {
                seats[data.seatId].isLocked = !seats[data.seatId].isLocked;
            } else if (data.action === 'kick') {
                seats[data.seatId].user = null;
                seats[data.seatId].socketId = null;
            }
            io.emit('update_seats', seats);
        }
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
        // إذا غادر صاحب الغرفة، نعين شخص آخر إن وجد
        if (socket.id === roomHostSocketId) {
            roomHostSocketId = null;
            seats.host.user = "المذيع (غادر)";
            seats.host.socketId = null;
        }
        // إخلاء مقاعده إن كان على مايك
        Object.keys(seats).forEach(s => {
            if (seats[s].socketId === socket.id) {
                seats[s].user = null;
                seats[s].socketId = null;
            }
        });
        io.emit('update_seats', seats);
        io.emit('update_users_count', onlineUsers);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
