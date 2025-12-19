const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// الاتصال بقاعدة البيانات MongoDB
mongoose.connect('mongodb+srv://eez69706_db_user:rawadezo@cluster0.1kbiveq.mongodb.net/?appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ تم الاتصال بقاعدة البيانات');
}).catch(err => {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err);
});

// نماذج قاعدة البيانات (Schemas)
const userSchema = new mongoose.Schema({
    name: String,
    phone: { type: String, unique: true },
    password: String,
    role: { type: String, default: 'موظف' },
    rank: { type: String, default: 'موظف' },
    permissions: [String],
    status: { type: String, default: 'غير مسجل' },
    currentLoginTime: Date,
    stats: {
        days: { type: Number, default: 0 },
        hours: { type: Number, default: 0 }
    },
    createdAt: { type: Date, default: Date.now }
});

const attendanceSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    userName: String,
    userRank: String,
    loginTime: Date,
    logoutTime: Date,
    duration: Number,
    report: String,
    date: { type: Date, default: Date.now }
});

const requestSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    userName: String,
    userRank: String,
    type: String, // 'إجازة' أو 'استقالة'
    reason: String,
    duration: String,
    startDate: Date,
    endDate: Date,
    status: { type: String, default: 'معلق' },
    rejectReason: String,
    createdAt: { type: Date, default: Date.now }
});

const rankSchema = new mongoose.Schema({
    name: String,
    key: { type: String, unique: true },
    permissions: [String]
});

const notificationSchema = new mongoose.Schema({
    type: String,
    user: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
});

// إنشاء النماذج
const User = mongoose.model('User', userSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const Request = mongoose.model('Request', requestSchema);
const Rank = mongoose.model('Rank', rankSchema);
const Notification = mongoose.model('Notification', notificationSchema);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ===== API Routes =====

// تسجيل حساب جديد
app.post('/api/register', async (req, res) => {
    try {
        const { name, phone, password, role } = req.body;
        
        // التحقق من وجود المستخدم
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'رقم الجوال مسجل مسبقاً' });
        }
        
        // تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // إنشاء مستخدم جديد
        const user = new User({
            name,
            phone,
            password: hashedPassword,
            role: role || 'موظف',
            rank: 'موظف'
        });
        
        await user.save();
        
        // إرسال إشعار للجميع
        io.emit('userRegistered', { name, phone });
        
        res.json({ success: true, message: 'تم إنشاء الحساب بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// تسجيل الدخول
app.post('/api/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        
        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(400).json({ success: false, message: 'رقم الجوال غير صحيح' });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ success: false, message: 'كلمة المرور غير صحيحة' });
        }
        
        res.json({ 
            success: true, 
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                role: user.role,
                rank: user.rank,
                permissions: user.permissions,
                status: user.status,
                stats: user.stats
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// تسجيل حضور
app.post('/api/attendance/login', async (req, res) => {
    try {
        const { userId, userName, userRank } = req.body;
        
        // تحديث حالة المستخدم
        await User.findByIdAndUpdate(userId, {
            status: 'مسجل حضور',
            currentLoginTime: new Date()
        });
        
        // حفظ سجل الحضور
        const attendance = new Attendance({
            userId,
            userName,
            userRank,
            loginTime: new Date()
        });
        await attendance.save();
        
        // إرسال إشعار للجميع
        io.emit('attendanceUpdate', { type: 'login', userName });
        
        res.json({ success: true, message: 'تم تسجيل الحضور بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// تسجيل انصراف
app.post('/api/attendance/logout', async (req, res) => {
    try {
        const { userId, userName, report } = req.body;
        
        const user = await User.findById(userId);
        const attendance = await Attendance.findOne({ 
            userId, 
            logoutTime: null 
        }).sort({ loginTime: -1 });
        
        if (!attendance) {
            return res.status(400).json({ success: false, message: 'لم يتم العثور على سجل حضور' });
        }
        
        const logoutTime = new Date();
        const duration = (logoutTime - attendance.loginTime) / (1000 * 60 * 60); // بالساعات
        
        // تحديث سجل الحضور
        attendance.logoutTime = logoutTime;
        attendance.duration = duration;
        attendance.report = report;
        await attendance.save();
        
        // تحديث إحصائيات المستخدم
        user.status = 'غير مسجل';
        user.stats.hours += duration;
        user.stats.days += 1;
        await user.save();
        
        // إرسال إشعار
        io.emit('attendanceUpdate', { type: 'logout', userName });
        
        res.json({ success: true, message: 'تم تسجيل الانصراف بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// الحصول على جميع المستخدمين
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// تحديث صلاحيات مستخدم
app.put('/api/users/:id/permissions', async (req, res) => {
    try {
        const { permissions } = req.body;
        await User.findByIdAndUpdate(req.params.id, { permissions });
        
        io.emit('permissionsUpdated', { userId: req.params.id });
        
        res.json({ success: true, message: 'تم تحديث الصلاحيات' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// حذف مستخدم
app.delete('/api/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        await Attendance.deleteMany({ userId: req.params.id });
        await Request.deleteMany({ userId: req.params.id });
        
        io.emit('userDeleted', { userId: req.params.id });
        
        res.json({ success: true, message: 'تم حذف المستخدم' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// إنشاء طلب (إجازة أو استقالة)
app.post('/api/requests', async (req, res) => {
    try {
        const request = new Request(req.body);
        await request.save();
        
        io.emit('newRequest', { type: req.body.type, userName: req.body.userName });
        
        res.json({ success: true, message: 'تم إرسال الطلب بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// الحصول على جميع الطلبات
app.get('/api/requests', async (req, res) => {
    try {
        const requests = await Request.find().sort({ createdAt: -1 });
        res.json({ success: true, requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// معالجة طلب
app.put('/api/requests/:id', async (req, res) => {
    try {
        const { status, rejectReason } = req.body;
        await Request.findByIdAndUpdate(req.params.id, { status, rejectReason });
        
        io.emit('requestProcessed', { requestId: req.params.id, status });
        
        res.json({ success: true, message: 'تم معالجة الطلب' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// الحصول على سجلات الحضور
app.get('/api/attendance', async (req, res) => {
    try {
        const attendance = await Attendance.find().sort({ loginTime: -1 });
        res.json({ success: true, attendance });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// الحصول على الرتب
app.get('/api/ranks', async (req, res) => {
    try {
        const ranks = await Rank.find();
        res.json({ success: true, ranks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// إضافة رتبة جديدة
app.post('/api/ranks', async (req, res) => {
    try {
        const rank = new Rank(req.body);
        await rank.save();
        
        io.emit('rankAdded', rank);
        
        res.json({ success: true, message: 'تم إضافة الرتبة' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Socket.IO للتحديثات الفورية
io.on('connection', (socket) => {
    console.log('✅ مستخدم متصل:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('❌ مستخدم انقطع:', socket.id);
    });
});

// بدء السيرفر
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ السيرفر يعمل على المنفذ ${PORT}`);
    console.log(`🌐 افتح المتصفح على: http://localhost:${PORT}`);
});