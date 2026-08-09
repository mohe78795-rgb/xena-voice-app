const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// تقديم الملفات الثابتة (مثل index.html والواجهات)
app.use(express.static(__dirname));

const MONGO_URI = "mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/test?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI);

// ==========================================
// 1. Schemas & Models
// ==========================================

const UserSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    userName: String,
    profilePic: { type: String, default: "default.png" },
    balance: { type: Number, default: 0 }
});
const User = mongoose.model("User", UserSchema);

const RoomSchema = new mongoose.Schema({
    roomName: { type: String, unique: true },
    ownerId: String,
    category: { type: String, default: "عام" },
    listeners: { type: Number, default: 0 },
    seats: { type: Array, default: Array(8).fill(null) },
    messages: [{ userId: String, userName: String, text: String, time: { type: Date, default: Date.now } }]
});
const Room = mongoose.model("Room", RoomSchema);

const DirectMessageSchema = new mongoose.Schema({
    senderId: String,
    receiverId: String,
    text: String,
    time: { type: Date, default: Date.now }
});
const DirectMessage = mongoose.model("DirectMessage", DirectMessageSchema);

const FriendshipSchema = new mongoose.Schema({
    requesterId: String,
    targetId: String,
    status: { type: String, enum: ["pending", "accepted", "following"], default: "pending" }
});
const Friendship = mongoose.model("Friendship", FriendshipSchema);


// ==========================================
// 2. Routes
// ==========================================

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

// --- مسارات المستخدمين (تسجيل الدخول، البروفايل، الرصيد، وتحديث الاسم) ---

app.post("/api/user/login", async (req, res) => {
    const { userName } = req.body;
    if (!userName) return res.json({ success: false, message: "الاسم مطلوب" });

    let user = await User.findOne({ userName });
    if (!user) {
        const userId = "user_" + Math.random().toString(36).substring(2, 9);
        user = new User({ userId, userName, profilePic: "default.png", balance: 0 });
        await user.save();
    }
    res.json({ success: true, user });
});

app.get("/api/user/profile", async (req, res) => {
    try {
        const { userId } = req.query;
        const user = await User.findOne({ userId });
        if (!user) return res.json({ success: false, message: "المستخدم غير موجود" });
        res.json({ success: true, user });
    } catch (err) {
        res.json({ success: false, message: "حدث خطأ في النظام" });
    }
});

app.post("/api/user/update-name", async (req, res) => {
    try {
        const { userId, newUserName } = req.body;
        if (!newUserName) return res.json({ success: false, message: "الاسم الجديد مطلوب" });
        
        const updatedUser = await User.findOneAndUpdate(
            { userId }, 
            { userName: newUserName }, 
            { new: true }
        );
        
        if (!updatedUser) return res.json({ success: false, message: "المستخدم غير موجود" });
        res.json({ success: true, message: "تم تغيير الاسم بنجاح", user: updatedUser });
    } catch (err) {
        res.json({ success: false, message: "الاسم مستخدم من قبل أو حدث خطأ" });
    }
});

app.get("/api/user/balance", async (req, res) => {
    try {
        const { userId } = req.query;
        const user = await User.findOne({ userId });
        if (!user) return res.json({ success: false, message: "المستخدم غير موجود" });
        res.json({ success: true, balance: user.balance || 0 });
    } catch (err) {
        res.json({ success: false, message: "خطأ في جلب الرصيد" });
    }
});


// --- مسارات الغرف، المقاعد، والشات داخل الروم ---

app.get("/api/rooms", async (req, res) => {
    try {
        const rooms = await Room.find({});
        res.json({ success: true, rooms });
    } catch (err) {
        res.json({ success: false, message: "حدث خطأ أثناء جلب الغرف" });
    }
});

app.post("/api/room/create", async (req, res) => {
    const { roomName, ownerId, category } = req.body;
    let room = await Room.findOne({ roomName });
    if (!room) {
        room = new Room({ roomName, ownerId, category: category || "عام", seats: Array(8).fill(null) });
        await room.save();
    }
    res.json({ success: true, room });
});

app.post("/api/room/update-name", async (req, res) => {
    try {
        const { roomName, newRoomName, ownerId } = req.body;
        const room = await Room.findOne({ roomName });
        
        if (!room) return res.json({ success: false, message: "الغرفة غير موجودة" });
        if (room.ownerId !== ownerId) return res.json({ success: false, message: "غير مخول بتغيير اسم الغرفة" });

        room.roomName = newRoomName;
        await room.save();
        res.json({ success: true, message: "تم تحديث اسم الغرفة بنجاح", roomName: newRoomName });
    } catch (err) {
        res.json({ success: false, message: "اسم الغرفة مستخدم مسبقاً أو حدث خطأ" });
    }
});

app.get("/api/room/status", async (req, res) => {
    const { roomName } = req.query;
    let room = await Room.findOne({ roomName });
    if (!room) return res.json({ success: false, message: "الغرفة غير موجودة" });
    res.json({ success: true, seats: room.seats, messages: room.messages });
});

app.post("/api/room/chat", async (req, res) => {
    const { roomName, userId, userName, text } = req.body;
    await Room.updateOne({ roomName }, { $push: { messages: { userId, userName, text } } });
    res.json({ success: true });
});

app.post("/api/seat/take", async (req, res) => {
    const { roomName, seatIndex, userId, userName } = req.body;
    let room = await Room.findOne({ roomName });
    if (!room) return res.json({ success: false, message: "الغرفة غير موجودة" });

    // تفريغ المقعد إذا كان المستخدم جالساً في مقعد آخر بنفس الغرفة
    room.seats = room.seats.map(seat => (seat && seat.userId === userId) ? null : seat);

    if (room.seats[seatIndex]) {
        return res.json({ success: false, message: "المقعد محجوز بالفعل" });
    }

    room.seats[seatIndex] = { userId, userName, isMuted: false, time: new Date() };
    await room.markModified("seats");
    await room.save();
    res.json({ success: true, seats: room.seats });
});


// --- مسارات الرسائل الخاصة، الهدايا، والعلاقات (صداقة ومتابعة) ---

app.post("/api/messages/send", async (req, res) => {
    try {
        const { senderId, receiverId, text } = req.body;
        const newMessage = new DirectMessage({ senderId, receiverId, text });
        await newMessage.save();
        res.json({ success: true, message: "تم إرسال الرسالة بنجاح", data: newMessage });
    } catch (err) {
        res.json({ success: false, message: "فشل إرسال الرسالة" });
    }
});

app.post("/api/gifts/send", async (req, res) => {
    try {
        const { senderId, receiverId, giftCost } = req.body;
        const sender = await User.findOne({ userId: senderId });
        const receiver = await User.findOne({ userId: receiverId });

        if (!sender || !receiver) return res.json({ success: false, message: "طرف المعاملة غير موجود" });
        if ((sender.balance || 0) < giftCost) return res.json({ success: false, message: "رصيدك غير كافٍ لإرسال الهدية" });

        sender.balance -= giftCost;
        receiver.balance = (receiver.balance || 0) + giftCost;

        await sender.save();
        await receiver.save();

        res.json({ success: true, message: "تم إرسال الهدية بنجاح", senderBalance: sender.balance });
    } catch (err) {
        res.json({ success: false, message: "حدث خطأ أثناء إرسال الهدية" });
    }
});

app.post("/api/social/interact", async (req, res) => {
    try {
        const { requesterId, targetId, action } = req.body; // action: 'follow' or 'friend_request'
        
        let relation = await Friendship.findOne({ requesterId, targetId });
        if (!relation) {
            relation = new Friendship({ requesterId, targetId, status: action === 'follow' ? 'following' : 'pending' });
        } else {
            relation.status = action === 'follow' ? 'following' : 'pending';
        }
        
        await relation.save();
        res.json({ success: true, message: "تم تنفيذ الطلب بنجاح" });
    } catch (err) {
        res.json({ success: false, message: "حدث خطأ أثناء تنفيذ الطلب" });
    }
});

// ==========================================
// تشغيل السيرفر
// ==========================================
app.listen(3000, () => console.log("Server running on port 3000"));

