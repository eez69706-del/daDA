// الاتصال بـ Socket.IO
const socket = io();

// متغيرات عامة
let currentUser = null;

// ===== دوال تسجيل الدخول والحسابات =====

// تسجيل حساب جديد
async function registerUser(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    if (password !== confirmPassword) {
        showAlert('كلمات المرور غير متطابقة', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            closeModal('registerModal');
            document.getElementById('registerForm').reset();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        showAlert('حدث خطأ في الاتصال', 'error');
    }
}

// تسجيل الدخول
async function loginUser(event) {
    event.preventDefault();
    
    const phone = document.getElementById('loginPhone').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            showAlert('تم تسجيل الدخول بنجاح', 'success');
            
            // إظهار اللوحة المناسبة
            if (currentUser.role === 'مدير') {
                showPage('adminPage');
                loadAdminData();
            } else {
                showPage('userPage');
                loadUserData();
            }
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        showAlert('حدث خطأ في الاتصال', 'error');
    }
}

// ===== دوال الحضور والانصراف =====

// تسجيل حضور
async function attendanceLogin() {
    if (!currentUser) return;
    
    try {
        const response = await fetch('/api/attendance/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                userName: currentUser.name,
                userRank: currentUser.rank
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            currentUser.status = 'مسجل حضور';
            updateUserStatus();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        showAlert('حدث خطأ في الاتصال', 'error');
    }
}

// تسجيل انصراف
async function attendanceLogout(event) {
    event.preventDefault();
    
    const report = document.getElementById('logoutReport').value;
    
    try {
        const response = await fetch('/api/attendance/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                userName: currentUser.name,
                report
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            closeModal('logoutModal');
            currentUser.status = 'غير مسجل';
            updateUserStatus();
            loadUserData();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        showAlert('حدث خطأ في الاتصال', 'error');
    }
}

// ===== دوال الطلبات =====

// إرسال طلب إجازة
async function submitLeaveRequest(event) {
    event.preventDefault();
    
    const reason = document.getElementById('leaveReason').value;
    const duration = document.getElementById('leaveDuration').value;
    const startDate = document.getElementById('leaveStartDate').value;
    
    try {
        const response = await fetch('/api/requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                userName: currentUser.name,
                userRank: currentUser.rank,
                type: 'إجازة',
                reason,
                duration,
                startDate: new Date(startDate)
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            closeModal('leaveModal');
            document.getElementById('leaveForm').reset();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        showAlert('حدث خطأ في الاتصال', 'error');
    }
}

// إرسال طلب استقالة
async function submitResignRequest(event) {
    event.preventDefault();
    
    const reason = document.getElementById('resignReason').value;
    const endDate = document.getElementById('resignEndDate').value;
    
    try {
        const response = await fetch('/api/requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                userName: currentUser.name,
                userRank: currentUser.rank,
                type: 'استقالة',
                reason,
                endDate: new Date(endDate)
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            closeModal('resignModal');
            document.getElementById('resignForm').reset();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        showAlert('حدث خطأ في الاتصال', 'error');
    }
}

// ===== دوال المدير =====

// تحميل بيانات المدير
async function loadAdminData() {
    try {
        // تحميل المستخدمين
        const usersRes = await fetch('/api/users');
        const usersData = await usersRes.json();
        displayAdminUsers(usersData.users);
        
        // تحميل سجلات الحضور
        const attendanceRes = await fetch('/api/attendance');
        const attendanceData = await attendanceRes.json();
        displayAttendanceRecords(attendanceData.attendance);
        
        // تحميل الطلبات
        const requestsRes = await fetch('/api/requests');
        const requestsData = await requestsRes.json();
        displayRequests(requestsData.requests);
        
    } catch (error) {
        showAlert('خطأ في تحميل البيانات', 'error');
    }
}

// عرض المستخدمين في لوحة المدير
function displayAdminUsers(users) {
    const table = document.getElementById('adminUsersTable');
    table.innerHTML = '';
    
    users.forEach(user => {
        const row = `
            <tr>
                <td>${user.name}</td>
                <td><span class="role-badge">${user.role}</span></td>
                <td>${user.rank}</td>
                <td>${user.phone}</td>
                <td><span class="badge ${user.status === 'مسجل حضور' ? 'badge-success' : 'badge-secondary'}">${user.status}</span></td>
                <td>${user.permissions ? user.permissions.length : 0} صلاحية</td>
                <td>
                    <button onclick="editUserPermissions('${user._id}')" class="btn btn-primary btn-sm">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteUser('${user._id}')" class="btn btn-danger btn-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        table.innerHTML += row;
    });
}

// حذف مستخدم
async function deleteUser(userId) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            loadAdminData();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        showAlert('حدث خطأ في الحذف', 'error');
    }
}

// ===== Socket.IO Event Listeners =====

// عند تسجيل مستخدم جديد
socket.on('userRegistered', (data) => {
    showNotification('تم تسجيل مستخدم جديد', `${data.name} انضم للنظام`);
    if (currentUser && currentUser.role === 'مدير') {
        loadAdminData();
    }
});

// عند تحديث الحضور
socket.on('attendanceUpdate', (data) => {
    if (data.type === 'login') {
        showNotification('تسجيل حضور', `${data.userName} سجل حضوره`);
    } else {
        showNotification('تسجيل انصراف', `${data.userName} سجل انصرافه`);
    }
    if (currentUser && currentUser.role === 'مدير') {
        loadAdminData();
    }
});

// عند طلب جديد
socket.on('newRequest', (data) => {
    showNotification('طلب جديد', `${data.userName} قدم طلب ${data.type}`);
    if (currentUser && currentUser.role === 'مدير') {
        loadAdminData();
    }
});

// ===== دوال مساعدة =====

function showAlert(message, type) {
    // يمكنك استخدام مكتبة SweetAlert أو إظهار رسالة بسيطة
    alert(message);
}

function showNotification(title, message) {
    // إظهار إشعار في أعلى الصفحة
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `<strong>${title}</strong><br>${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 5000);
}

function showPage(page) {
    // إخفاء جميع الصفحات
    document.getElementById('mainPage').classList.add('hidden');
    document.getElementById('userPanel').classList.add('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
    
    // إظهار الصفحة المطلوبة
    if (page === 'userPage') {
        document.getElementById('userPanel').classList.remove('hidden');
    } else if (page === 'adminPage') {
        document.getElementById('adminPanel').classList.remove('hidden');
    } else {
        document.getElementById('mainPage').classList.remove('hidden');
    }
}

// ===== Event Listeners =====
document.getElementById('loginForm').addEventListener('submit', loginUser);
document.getElementById('registerForm').addEventListener('submit', registerUser);
document.getElementById('logoutForm').addEventListener('submit', attendanceLogout);
document.getElementById('leaveForm').addEventListener('submit', submitLeaveRequest);
document.getElementById('resignForm').addEventListener('submit', submitResignRequest);