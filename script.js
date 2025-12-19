        // ===== المتغيرات العامة =====
        let currentUser = null;
        let currentSession = null;
        let users = [];
        let sessions = [];
        let requests = [];
        let logs = [];
        let promotions = [];
        let userToDelete = null;
        let requestToProcess = null;
        let userToEditPermissions = null;
        let editingPermissions = {};
        let customRoles = {}; 
        let currentEditingRole = null;
        
        // ===== نظام الإشعارات الفوري =====
        let notificationSocket = null;
        let notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        let notificationHistory = JSON.parse(localStorage.getItem('notificationHistory') || '[]');

        // ===== تعريف الرتب الأساسية =====
        const rolePermissions = {
            employee: {
                name: "موظف عادي",
                badgeClass: "role-badge-employee",
                permissions: {
                    attendance: true,
                    leave: true,
                    resign: true,
                    viewHistory: true,
                    viewStats: true,
                    viewTeamAttendance: false,
                    viewTeamRequests: false,
                    addUsers: false,
                    editPermissions: false,
                    viewAllAttendance: false,
                    processRequests: false,
                    viewReports: false,
                    deleteUsers: false,
                    requestPromotion: true
                }
            },
            supervisor: {
                name: "مشرف",
                badgeClass: "role-badge-manager",
                permissions: {
                    attendance: true,
                    leave: true,
                    resign: true,
                    viewHistory: true,
                    viewStats: true,
                    viewTeamAttendance: true,
                    viewTeamRequests: true,
                    addUsers: false,
                    editPermissions: false,
                    viewAllAttendance: false,
                    processRequests: false,
                    viewReports: false,
                    deleteUsers: false,
                    requestPromotion: true
                }
            },
            manager: {
                name: "مدير قسم",
                badgeClass: "role-badge-manager",
                permissions: {
                    attendance: true,
                    leave: true,
                    resign: true,
                    viewHistory: true,
                    viewStats: true,
                    viewTeamAttendance: true,
                    viewTeamRequests: true,
                    addUsers: true,
                    editPermissions: true,
                    viewAllAttendance: true,
                    processRequests: true,
                    viewReports: true,
                    deleteUsers: false,
                    requestPromotion: true
                }
            },
            admin: {
                name: "مدير نظام",
                badgeClass: "role-badge-admin",
                permissions: {
                    attendance: true,
                    leave: true,
                    resign: true,
                    viewHistory: true,
                    viewStats: true,
                    viewTeamAttendance: true,
                    viewTeamRequests: true,
                    addUsers: true,
                    editPermissions: true,
                    viewAllAttendance: true,
                    processRequests: true,
                    viewReports: true,
                    deleteUsers: true,
                    requestPromotion: false
                }
            }
        };

        // ===== أسماء الصلاحيات =====
        const permissionNames = {
            attendance: "تسجيل الحضور والانصراف",
            leave: "تقديم طلبات إجازة",
            resign: "تقديم طلبات استقالة",
            viewHistory: "عرض سجل الحضور الشخصي",
            viewStats: "عرض الإحصائيات الشخصية",
            viewTeamAttendance: "عرض حضور فريق العمل",
            viewTeamRequests: "عرض طلبات فريق العمل",
            addUsers: "إضافة موظفين جدد",
            editPermissions: "تعديل صلاحيات الموظفين",
            viewAllAttendance: "عرض جميع سجلات الحضور",
            processRequests: "معالجة طلبات الموظفين",
            viewReports: "عرض التقارير والإحصائيات",
            deleteUsers: "حذف الموظفين من النظام",
        };

        // ===== دوال إدارة التخزين =====
        function saveData() {
            localStorage.setItem('attendance_users', JSON.stringify(users));
            localStorage.setItem('attendance_sessions', JSON.stringify(sessions));
            localStorage.setItem('attendance_requests', JSON.stringify(requests));
            localStorage.setItem('attendance_logs', JSON.stringify(logs));
            localStorage.setItem('attendance_promotions', JSON.stringify(promotions));
            localStorage.setItem('attendance_custom_roles', JSON.stringify(customRoles));
        }
        
        function loadData() {
            try {
                users = JSON.parse(localStorage.getItem('attendance_users') || '[]');
                sessions = JSON.parse(localStorage.getItem('attendance_sessions') || '[]');
                requests = JSON.parse(localStorage.getItem('attendance_requests') || '[]');
                logs = JSON.parse(localStorage.getItem('attendance_logs') || '[]');
                promotions = JSON.parse(localStorage.getItem('attendance_promotions') || '[]');
                customRoles = JSON.parse(localStorage.getItem('attendance_custom_roles') || '{}');
                
                if (users.length === 0) {
                    createAdminOnly();
                }
            } catch (error) {
                console.error('خطأ في تحميل البيانات:', error);
                createAdminOnly();
            }
        }
        
        function createAdminOnly() {
            const adminUser = {
                id: 1,
                name: "المدير العام",
                phone: "0500000000",
                department: "الإدارة",
                password: "admin123",
                role: "admin",
                rank: "مدير نظام",
                rankHistory: [{
                    rank: "مدير نظام",
                    date: new Date().toISOString(),
                    reason: "تعيين أولي"
                }],
                permissions: rolePermissions.admin.permissions,
                createdAt: new Date().toISOString()
            };
            
            users = [adminUser];
            sessions = [];
            requests = [];
            logs = [];
            promotions = [];
            
            saveData();
        }

        // ===== دوال نظام الإشعارات =====
        function initNotifications() {
            // محاكاة نظام WebSocket (في حالة حقيقية، سيتم الاتصال بخادم Socket.io)
            updateNotificationsCount();
            updateNotificationsDropdown();
        }
        
        function showNotification(title, message, type = 'info', isBroadcast = false) {
            const notification = {
                id: Date.now(),
                title: title,
                message: message,
                type: type,
                timestamp: new Date().toISOString(),
                read: false
            };
            
            // إضافة للإشعارات الفورية
            notifications.unshift(notification);
            if (notifications.length > 50) notifications = notifications.slice(0, 50);
            
            // إضافة للسجل
            notificationHistory.unshift(notification);
            if (notificationHistory.length > 1000) notificationHistory = notificationHistory.slice(0, 1000);
            
            // حفظ في localStorage
            localStorage.setItem('notifications', JSON.stringify(notifications));
            localStorage.setItem('notificationHistory', JSON.stringify(notificationHistory));
            
            // عرض الإشعار
            displayNotification(notification);
            
            // تحديث العدادات والقوائم
            updateNotificationsCount();
            updateNotificationsDropdown();
            
            // إذا كان المدير متصل، تحديث قائمة الإشعارات لديه
            if (currentUser && currentUser.role === 'admin') {
                updateAdminNotifications();
            }
            
            // إذا كان إشعار بث عام، عرضه لجميع المستخدمين
            if (isBroadcast) {
                // في نظام حقيقي، هذا سيتم إرساله عبر WebSocket لجميع المستخدمين المتصلين
                console.log('إشعار بث عام:', notification);
            }
            
            // في نظام حقيقي، سيتم إرسال الإشعار عبر WebSocket
            // broadcastNotification(notification);
        }
        
        function displayNotification(notification) {
            const container = document.getElementById('notificationsContainer');
            if (!container) return;
            
            const notificationElement = document.createElement('div');
            notificationElement.className = `notification-item notification-${notification.type}`;
            notificationElement.innerHTML = `
                <div class="notification-header">
                    <div class="notification-title">
                        ${getNotificationIcon(notification.type)} ${notification.title}
                    </div>
                    <div class="notification-time">
                        ${formatTime(notification.timestamp)}
                    </div>
                </div>
                <div class="notification-message">
                    ${notification.message}
                </div>
            `;
            
            notificationElement.onclick = () => markNotificationAsRead(notification.id);
            
            container.appendChild(notificationElement);
            
            // إزالة الإشعار بعد 5 ثواني
            setTimeout(() => {
                if (notificationElement.parentNode) {
                    notificationElement.style.animation = 'fadeOut 0.4s ease forwards';
                    setTimeout(() => notificationElement.remove(), 400);
                }
            }, 5000);
        }
        
        function getNotificationIcon(type) {
            switch(type) {
                case 'login': return '<i class="fas fa-sign-in-alt"></i>';
                case 'logout': return '<i class="fas fa-sign-out-alt"></i>';
                case 'request': return '<i class="fas fa-file-alt"></i>';
                case 'user': return '<i class="fas fa-user"></i>';
                case 'admin': return '<i class="fas fa-crown"></i>';
                default: return '<i class="fas fa-bell"></i>';
            }
        }
        
        function formatTime(timestamp) {
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            
            if (diff < 60000) return 'الآن';
            if (diff < 3600000) return `${Math.floor(diff / 60000)} دقيقة`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)} ساعة`;
            return date.toLocaleDateString('ar-SA');
        }
        
        function updateNotificationsCount() {
            const unreadCount = notifications.filter(n => !n.read).length;
            
            const userBadge = document.getElementById('notificationCount');
            const adminBadge = document.getElementById('adminNotificationCount');
            
            if (userBadge) {
                if (unreadCount > 0) {
                    userBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                    userBadge.classList.remove('hidden');
                } else {
                    userBadge.classList.add('hidden');
                }
            }
            
            if (adminBadge) {
                if (unreadCount > 0) {
                    adminBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                    adminBadge.classList.remove('hidden');
                } else {
                    adminBadge.classList.add('hidden');
                }
            }
        }
        
        function updateNotificationsDropdown() {
            const dropdown = document.getElementById('notificationsDropdownList');
            if (!dropdown) return;
            
            const recentNotifications = notifications.slice(0, 10);
            let html = '';
            
            if (recentNotifications.length === 0) {
                html = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">لا توجد إشعارات جديدة</p>';
            } else {
                recentNotifications.forEach(notification => {
                    const readClass = notification.read ? 'opacity-75' : '';
                    html += `
                        <div class="notification-dropdown-item ${readClass}" onclick="markNotificationAsRead(${notification.id})">
                            <div class="flex justify-between">
                                <div class="font-bold text-gray-800 dark:text-white text-sm">${notification.title}</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">${formatTime(notification.timestamp)}</div>
                            </div>
                            <div class="text-gray-600 dark:text-gray-300 text-xs mt-1">${notification.message}</div>
                        </div>
                    `;
                });
            }
            
            dropdown.innerHTML = html;
            
            // تحديث قائمة المدير أيضًا
            updateAdminNotifications();
        }
        
        function updateAdminNotifications() {
            const dropdown = document.getElementById('adminNotificationsDropdownList');
            if (!dropdown) return;
            
            const recentNotifications = notifications.slice(0, 10);
            let html = '';
            
            if (recentNotifications.length === 0) {
                html = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">لا توجد إشعارات جديدة</p>';
            } else {
                recentNotifications.forEach(notification => {
                    const readClass = notification.read ? 'opacity-75' : '';
                    html += `
                        <div class="notification-dropdown-item ${readClass}" onclick="markNotificationAsRead(${notification.id})">
                            <div class="flex justify-between">
                                <div class="font-bold text-gray-800 dark:text-white text-sm">${notification.title}</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">${formatTime(notification.timestamp)}</div>
                            </div>
                            <div class="text-gray-600 dark:text-gray-300 text-xs mt-1">${notification.message}</div>
                        </div>
                    `;
                });
            }
            
            dropdown.innerHTML = html;
        }
        
        function markNotificationAsRead(id) {
            const notification = notifications.find(n => n.id === id);
            if (notification && !notification.read) {
                notification.read = true;
                localStorage.setItem('notifications', JSON.stringify(notifications));
                updateNotificationsCount();
                updateNotificationsDropdown();
            }
        }
        
        function markAllNotificationsAsRead() {
            notifications.forEach(notification => notification.read = true);
            localStorage.setItem('notifications', JSON.stringify(notifications));
            updateNotificationsCount();
            updateNotificationsDropdown();
        }
        
        function clearAllNotifications() {
            if (confirm('هل تريد مسح جميع الإشعارات؟')) {
                notifications = [];
                localStorage.setItem('notifications', JSON.stringify(notifications));
                updateNotificationsCount();
                updateNotificationsDropdown();
            }
        }
        
        function clearAllAdminNotifications() {
            clearAllNotifications();
        }
        
        function toggleNotificationsDropdown() {
            const dropdown = document.getElementById('notificationsDropdown');
            if (dropdown) {
                dropdown.classList.toggle('active');
                if (dropdown.classList.contains('active')) {
                    markAllNotificationsAsRead();
                }
            }
        }
        
        function toggleAdminNotificationsDropdown() {
            const dropdown = document.getElementById('adminNotificationsDropdown');
            if (dropdown) {
                dropdown.classList.toggle('active');
                if (dropdown.classList.contains('active')) {
                    markAllNotificationsAsRead();
                }
            }
        }
        
        function loadNotificationsHistory() {
            const table = document.getElementById('notificationsHistoryTable');
            if (!table) return;
            
            let html = '';
            
            if (notificationHistory.length === 0) {
                html = `
                    <tr>
                        <td colspan="4" class="text-center py-4 text-gray-500 dark:text-gray-400">
                            <i class="fas fa-history text-xl mb-2"></i>
                            <p>لا توجد إشعارات مسجلة</p>
                        </td>
                    </tr>
                `;
            } else {
                notificationHistory.slice(0, 50).forEach(notification => {
                    const date = new Date(notification.timestamp);
                    const dateStr = date.toLocaleDateString('ar-SA');
                    const timeStr = date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                    
                    html += `
                        <tr>
                            <td class="text-gray-800 dark:text-white">
                                ${dateStr}<br>
                                <span class="text-xs text-gray-500 dark:text-gray-400">${timeStr}</span>
                            </td>
                            <td class="text-gray-800 dark:text-white">
                                <span class="inline-flex items-center gap-1">
                                    ${getNotificationIcon(notification.type)}
                                    ${getNotificationTypeText(notification.type)}
                                </span>
                            </td>
                            <td class="text-gray-800 dark:text-white">${notification.title}</td>
                            <td class="text-gray-800 dark:text-white">${notification.message}</td>
                        </tr>
                    `;
                });
            }
            
            table.innerHTML = html;
        }
        
        function getNotificationTypeText(type) {
            switch(type) {
                case 'login': return 'تسجيل دخول';
                case 'logout': return 'تسجيل خروج';
                case 'request': return 'طلب';
                case 'user': return 'مستخدم';
                case 'admin': return 'مدير';
                default: return 'عام';
            }
        }
        
        function filterNotifications() {
            const typeFilter = document.getElementById('filterNotificationType').value;
            const dateFilter = document.getElementById('filterNotificationDate').value;
            
            const rows = document.querySelectorAll('#notificationsHistoryTable tr');
            
            rows.forEach(row => {
                if (row.cells.length < 4) return;
                
                const type = row.cells[1].textContent;
                const date = row.cells[0].textContent.split('\n')[0];
                
                const typeMatch = !typeFilter || type.includes(typeFilter);
                const dateMatch = !dateFilter || date === dateFilter;
                
                row.style.display = (typeMatch && dateMatch) ? '' : 'none';
            });
        }
        
        function clearAllNotificationsHistory() {
            if (confirm('هل تريد مسح سجل الإشعارات بالكامل؟ هذا الإجراء لا يمكن التراجع عنه.')) {
                notificationHistory = [];
                localStorage.setItem('notificationHistory', JSON.stringify(notificationHistory));
                loadNotificationsHistory();
            }
        }
        
        function exportNotifications() {
            const data = JSON.stringify(notificationHistory, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `سجل_الإشعارات_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('تم تصدير سجل الإشعارات بنجاح', 'success');
        }

        // ===== دوال إدارة النوافذ =====
        function openModal(modalId) {
            document.getElementById(modalId).classList.add('active');
        }
        
        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('active');
        }
        
        function showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.remove();
            }, 3000);
        }
        
        function showAlert(message, type = 'error') {
            const alertElement = document.getElementById('mainAlert');
            alertElement.textContent = message;
            alertElement.className = 'alert';
            
            if (type === 'success') {
                alertElement.classList.add('alert-success');
            } else if (type === 'info') {
                alertElement.classList.add('alert-info');
            } else {
                alertElement.classList.add('alert-error');
            }
            
            alertElement.classList.remove('hidden');
            
            setTimeout(() => {
                alertElement.classList.add('hidden');
            }, 5000);
        }
        
        function showLoading(show = true) {
            const loadingElement = document.getElementById('loading');
            if (show) {
                loadingElement.classList.add('active');
            } else {
                loadingElement.classList.remove('active');
            }
        }

        // ===== دوال إدارة الصفحات =====
        function showPage(pageId) {
            document.getElementById('userPanel').classList.add('hidden');
            document.getElementById('adminPanel').classList.add('hidden');
            
            if (pageId === 'userPage') {
                document.getElementById('userPanel').classList.remove('hidden');
                updateUserPanel();
            } else if (pageId === 'adminPage') {
                document.getElementById('adminPanel').classList.remove('hidden');
                updateAdminPanel();
            }
        }

        // ===== دوال تسجيل الدخول =====
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            login();
        });
        
        document.getElementById('registerForm').addEventListener('submit', function(e) {
            e.preventDefault();
            register();
        });
        
        document.getElementById('forgotForm').addEventListener('submit', function(e) {
            e.preventDefault();
            forgotPassword();
        });
        
        function login() {
            showLoading(true);
            
            const phone = document.getElementById('loginPhone').value.trim();
            const password = document.getElementById('loginPassword').value.trim();
            
            setTimeout(() => {
                try {
                    const user = users.find(u => u.phone === phone && u.password === password);
                    
                    if (user) {
                        currentUser = user;
                        localStorage.setItem('currentUser', JSON.stringify(user));
                        
                        // تسجيل الدخول في السجلات
                        logs.push({
                            id: logs.length + 1,
                            userId: user.id,
                            username: user.name,
                            action: 'login',
                            timestamp: new Date().toISOString()
                        });
                        saveData();
                        
                        // إشعار بتسجيل الدخول
                        showNotification(
                            'تسجيل دخول',
                            `قام ${user.name} بتسجيل الدخول إلى النظام`,
                            'login',
                            true
                        );
                        
                        currentSession = sessions.find(s => s.userId === user.id && !s.logoutTime);
                        
                        document.getElementById('mainPage').classList.add('hidden');
                        
                        if (user.role === 'admin') {
                            document.getElementById('adminPanel').classList.remove('hidden');
                            updateAdminPanel();
                        } else {
                            document.getElementById('userPanel').classList.remove('hidden');
                            updateUserPanel();
                        }
                        
                        document.getElementById('loginPhone').value = '';
                        document.getElementById('loginPassword').value = '';
                        showToast('تم تسجيل الدخول بنجاح!', 'success');
                    } else {
                        showAlert('رقم الجوال أو كلمة المرور غير صحيحة', 'error');
                    }
                } catch (error) {
                    console.error('خطأ في تسجيل الدخول:', error);
                    showAlert('حدث خطأ في تسجيل الدخول', 'error');
                } finally {
                    showLoading(false);
                }
            }, 500);
        }
        
        function register() {
            showLoading(true);
            
            const name = document.getElementById('registerName').value.trim();
            const phone = document.getElementById('registerPhone').value.trim();
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            
            setTimeout(() => {
                try {
                    if (!name || !phone || !password || !confirmPassword) {
                        showAlert('جميع الحقول مطلوبة', 'error');
                        return;
                    }
                    
                    if (phone.length !== 10 || !phone.startsWith('05')) {
                        showAlert('رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام', 'error');
                        return;
                    }
                    
                    if (password.length < 6) {
                        showAlert('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
                        return;
                    }
                    
                    if (password !== confirmPassword) {
                        showAlert('كلمة المرور غير متطابقة', 'error');
                        return;
                    }
                    
                    const existingUser = users.find(u => u.phone === phone);
                    if (existingUser) {
                        showAlert('رقم الجوال مسجل مسبقاً', 'error');
                        return;
                    }
                    
                    const newUser = {
                        id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 2,
                        name: name,
                        phone: phone,
                        department: "غير محدد",
                        password: password,
                        role: "employee",
                        rank: "موظف عادي",
                        rankHistory: [{
                            rank: "موظف عادي",
                            date: new Date().toISOString(),
                            reason: "تعيين أولي"
                        }],
                        permissions: rolePermissions.employee.permissions,
                        createdAt: new Date().toISOString()
                    };
                    
                    users.push(newUser);
                    saveData();
                    
                    // إشعار بإضافة مستخدم جديد
                    if (currentUser) {
                        showNotification(
                            'إضافة موظف جديد',
                            `قام ${currentUser.name} بإضافة الموظف الجديد ${name}`,
                            'user',
                            true
                        );
                    }
                    
                    document.getElementById('registerName').value = '';
                    document.getElementById('registerPhone').value = '';
                    document.getElementById('registerPassword').value = '';
                    document.getElementById('registerConfirmPassword').value = '';
                    
                    closeModal('registerModal');
                    showToast('تم إنشاء الحساب بنجاح!', 'success');
                    
                    if (currentUser && currentUser.role === 'admin') {
                        loadAdminUsersTable();
                        updateAdminStats();
                    }
                } catch (error) {
                    console.error('خطأ في إنشاء الحساب:', error);
                    showAlert('حدث خطأ في إنشاء الحساب', 'error');
                } finally {
                    showLoading(false);
                }
            }, 500);
        }
        
        function forgotPassword() {
            showLoading(true);
            
            const phone = document.getElementById('forgotPhone').value.trim();
            
            setTimeout(() => {
                try {
                    const user = users.find(u => u.phone === phone);
                    
                    if (user) {
                        closeModal('forgotModal');
                        document.getElementById('forgotPhone').value = '';
                        showAlert(`كلمة المرور لحساب ${user.name}: ${user.password}`, 'info');
                    } else {
                        showAlert('رقم الجوال غير مسجل في النظام', 'error');
                    }
                } catch (error) {
                    console.error('خطأ في استعادة كلمة المرور:', error);
                    showAlert('حدث خطأ في استعادة كلمة المرور', 'error');
                } finally {
                    showLoading(false);
                }
            }, 500);
        }
        
        function logout() {
            if (confirm('هل تريد تسجيل الخروج من النظام؟')) {
                // إشعار بتسجيل الخروج
                if (currentUser) {
                    showNotification(
                        'تسجيل خروج',
                        `قام ${currentUser.name} بتسجيل الخروج من النظام`,
                        'logout',
                        true
                    );
                }
                
                currentUser = null;
                currentSession = null;
                localStorage.removeItem('currentUser');
                document.getElementById('userPanel').classList.add('hidden');
                document.getElementById('adminPanel').classList.add('hidden');
                document.getElementById('mainPage').classList.remove('hidden');
                showToast('تم تسجيل الخروج بنجاح', 'success');
            }
        }

        // ===== دوال إدارة الصلاحيات =====
        function checkPermission(permissionKey) {
            if (!currentUser || !currentUser.permissions) return false;
            return currentUser.permissions[permissionKey] === true;
        }
        
        function updateUserInterface() {
            if (!currentUser) return;
            
            const roleInfo = getRoleInfo(currentUser.role);
            document.getElementById('userRoleBadge').textContent = roleInfo.name;
            document.getElementById('userRoleBadge').className = `role-badge ${roleInfo.badgeClass}`;
            document.getElementById('userRoleDisplay').textContent = roleInfo.name;
            document.getElementById('userRoleDisplay').className = `role-badge ${roleInfo.badgeClass}`;
            
            document.getElementById('userRankName').textContent = currentUser.rank || roleInfo.name;
            
            document.getElementById('attendanceSection').classList.toggle('hidden', !checkPermission('attendance'));
            document.getElementById('leaveRequestSection').classList.toggle('hidden', !checkPermission('leave'));
            document.getElementById('resignRequestSection').classList.toggle('hidden', !checkPermission('resign'));
            document.getElementById('attendanceHistorySection').classList.toggle('hidden', !checkPermission('viewHistory'));
            document.getElementById('userStatsSection').classList.toggle('hidden', !checkPermission('viewStats'));
        }
        
        function updateMyRequestsCount() {
            if (!currentUser) return;
            
            const myLeaves = requests.filter(r => r.userId === currentUser.id && r.type === 'إجازة').length;
            const myResigns = requests.filter(r => r.userId === currentUser.id && r.type === 'استقالة').length;
            
            document.getElementById('myLeaveCount').textContent = `${myLeaves} طلب`;
            document.getElementById('myResignCount').textContent = `${myResigns} طلب`;
        }
        
        function showMyRequests(type) {
            const content = document.getElementById('myRequestsContent');
            let html = '';
            
            if (type === 'الاجازات') {
                const myLeaves = requests.filter(r => r.userId === currentUser.id && r.type === 'إجازة')
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                html = `<h4 class="font-bold mb-3 text-gray-800 dark:text-white">طلبات الإجازة:</h4>`;
                if (myLeaves.length === 0) {
                    html += '<p class="text-gray-500 dark:text-gray-400 text-center py-4">لا توجد طلبات إجازة</p>';
                } else {
                    myLeaves.forEach(request => {
                        const date = new Date(request.timestamp);
                        const statusBadge = request.status === 'معلق' ? 
                            '<span class="badge badge-warning">معلق</span>' : 
                            request.status === 'مقبول' ? 
                            '<span class="badge badge-success">مقبول</span>' : 
                            '<span class="badge badge-danger">مرفوض</span>';
                        
                        html += `
                        <div class="border-b py-3 border-gray-200 dark:border-gray-700">
                            <div class="flex justify-between items-center">
                                <div class="text-gray-800 dark:text-white">
                                    <p><strong>التاريخ:</strong> ${date.toLocaleDateString('ar-SA')}</p>
                                    <p><strong>المدة:</strong> ${request.duration}</p>
                                    <p><strong>السبب:</strong> ${request.reason}</p>
                                </div>
                                <div>
                                    ${statusBadge}
                                </div>
                            </div>
                        </div>
                        `;
                    });
                }
            }
            else if (type === 'الاستقالات') {
                const myResigns = requests.filter(r => r.userId === currentUser.id && r.type === 'استقالة')
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                html = `<h4 class="font-bold mb-3 text-gray-800 dark:text-white">طلبات الاستقالة:</h4>`;
                if (myResigns.length === 0) {
                    html += '<p class="text-gray-500 dark:text-gray-400 text-center py-4">لا توجد طلبات استقالة</p>';
                } else {
                    myResigns.forEach(request => {
                        const date = new Date(request.timestamp);
                        const statusBadge = request.status === 'معلق' ? 
                            '<span class="badge badge-warning">معلق</span>' : 
                            request.status === 'مقبول' ? 
                            '<span class="badge badge-success">مقبول</span>' : 
                            '<span class="badge badge-danger">مرفوض</span>';
                        
                        html += `
                        <div class="border-b py-3 border-gray-200 dark:border-gray-700">
                            <div class="flex justify-between items-center">
                                <div class="text-gray-800 dark:text-white">
                                    <p><strong>التاريخ:</strong> ${date.toLocaleDateString('ar-SA')}</p>
                                    <p><strong>تاريخ إنهاء العمل:</strong> ${request.endDate}</p>
                                    <p><strong>السبب:</strong> ${request.reason}</p>
                                </div>
                                <div>
                                    ${statusBadge}
                                </div>
                            </div>
                        </div>
                        `;
                    });
                }
            }
            
            content.innerHTML = html;
        }

        // ===== دوال إدارة الحضور =====
        function attendanceLogin() {
            if (currentSession) {
                alert('أنت مسجل دخول بالفعل!');
                return;
            }
            
            if (!checkPermission('attendance')) {
                alert('ليس لديك صلاحية لتسجيل الحضور');
                return;
            }
            
            openModal('confirmLoginModal');
        }
        
        function confirmAttendanceLogin() {
            showLoading(true);
            
            setTimeout(() => {
                try {
                    const newSession = {
                        id: sessions.length > 0 ? Math.max(...sessions.map(s => s.id)) + 1 : 1,
                        userId: currentUser.id,
                        loginTime: new Date().toISOString(),
                        logoutTime: null,
                        totalMinutes: 0,
                        report: ''
                    };
                    
                    sessions.push(newSession);
                    currentSession = newSession;
                    saveData();
                    
                    // إشعار بتسجيل الحضور
                    showNotification(
                        'تسجيل دخول للحضور',
                        `قام ${currentUser.name} بتسجيل الدخول (الحضور)`,
                        'login',
                        true
                    );
                    
                    updateUserPanel();
                    
                    closeModal('confirmLoginModal');
                    showToast('تم تسجيل الدخول بنجاح!', 'success');
                } catch (error) {
                    console.error('خطأ في تسجيل الدخول للحضور:', error);
                    showAlert('حدث خطأ في تسجيل الدخول', 'error');
                } finally {
                    showLoading(false);
                }
            }, 500);
        }
        
        document.getElementById('logoutForm').addEventListener('submit', function(e) {
            e.preventDefault();
            attendanceLogout();
        });
        
        function attendanceLogout() {
            showLoading(true);
            
            const report = document.getElementById('logoutReport').value.trim();
            
            setTimeout(() => {
                try {
                    if (!report) {
                        alert('يرجى كتابة تقرير العمل اليومي');
                        return;
                    }
                    
                    const loginTime = new Date(currentSession.loginTime);
                    const logoutTime = new Date();
                    const duration = Math.floor((logoutTime - loginTime) / 60000);
                    
                    const sessionIndex = sessions.findIndex(s => s.id === currentSession.id);
                    if (sessionIndex !== -1) {
                        sessions[sessionIndex].logoutTime = logoutTime.toISOString();
                        sessions[sessionIndex].totalMinutes = duration;
                        sessions[sessionIndex].report = report;
                    }
                    
                    logs.push({
                        id: logs.length + 1,
                        userId: currentUser.id,
                        username: currentUser.name,
                        action: 'logout',
                        timestamp: new Date().toISOString(),
                        report: report,
                        duration: duration
                    });
                    
                    saveData();
                    
                    // إشعار بتسجيل الخروج
                    showNotification(
                        'تسجيل خروج من الحضور',
                        `قام ${currentUser.name} بتسجيل الخروج (الحضور) - المدة: ${Math.floor(duration/60)}:${(duration%60).toString().padStart(2,'0')}`,
                        'logout',
                        true
                    );
                    
                    currentSession = null;
                    updateUserPanel();
                    
                    closeModal('logoutModal');
                    document.getElementById('logoutReport').value = '';
                    showToast('تم تسجيل الخروج بنجاح!', 'success');
                } catch (error) {
                    console.error('خطأ في تسجيل الخروج:', error);
                    showAlert('حدث خطأ في تسجيل الخروج', 'error');
                } finally {
                    showLoading(false);
                }
            }, 500);
        }

        // ===== دوال إدارة الطلبات =====
        document.getElementById('leaveForm').addEventListener('submit', function(e) {
            e.preventDefault();
            submitLeaveRequest();
        });
        
        function submitLeaveRequest() {
            if (!checkPermission('leave')) {
                alert('ليس لديك صلاحية لتقديم طلبات إجازة');
                return;
            }
            
            showLoading(true);
            
            const reason = document.getElementById('leaveReason').value.trim();
            const duration = document.getElementById('leaveDuration').value.trim();
            const startDate = document.getElementById('leaveStartDate').value;
            
            setTimeout(() => {
                try {
                    if (!reason || !duration || !startDate) {
                        alert('يرجى ملء جميع الحقول');
                        return;
                    }
                    
                    const newRequest = {
                        id: requests.length > 0 ? Math.max(...requests.map(r => r.id)) + 1 : 1,
                        userId: currentUser.id,
                        username: currentUser.name,
                        department: currentUser.department,
                        type: 'إجازة',
                        reason: reason,
                        duration: duration,
                        startDate: startDate,
                        status: 'معلق',
                        timestamp: new Date().toISOString()
                    };
                    
                    requests.push(newRequest);
                    saveData();
                    
                    // إشعار بطلب إجازة
                    showNotification(
                        'طلب إجازة جديد',
                        `قدم ${currentUser.name} طلب إجازة: ${reason}`,
                        'request',
                        true
                    );
                    
                    closeModal('leaveModal');
                    
                    document.getElementById('leaveReason').value = '';
                    document.getElementById('leaveDuration').value = '';
                    
                    showToast('تم تقديم طلب الإجازة بنجاح!', 'success');
                    
                    updateMyRequestsCount();
                    
                    if (currentUser && currentUser.role === 'admin') {
                        updateAdminStats();
                        loadAdminRequestsTable();
                    }
                } catch (error) {
                    console.error('خطأ في تقديم طلب الإجازة:', error);
                    showAlert('حدث خطأ في تقديم طلب الإجازة', 'error');
                } finally {
                    showLoading(false);
                }
            }, 500);
        }
        
        document.getElementById('resignForm').addEventListener('submit', function(e) {
            e.preventDefault();
            submitResignRequest();
        });
        
        function submitResignRequest() {
            if (!checkPermission('resign')) {
                alert('ليس لديك صلاحية لتقديم طلبات استقالة');
                return;
            }
            
            showLoading(true);
            
            const reason = document.getElementById('resignReason').value.trim();
            const endDate = document.getElementById('resignEndDate').value;
            
            setTimeout(() => {
                try {
                    if (!reason || !endDate) {
                        alert('يرجى ملء جميع الحقول');
                        return;
                    }
                    
                    const newRequest = {
                        id: requests.length > 0 ? Math.max(...requests.map(r => r.id)) + 1 : 1,
                        userId: currentUser.id,
                        username: currentUser.name,
                        department: currentUser.department,
                        type: 'استقالة',
                        reason: reason,
                        endDate: endDate,
                        status: 'معلق',
                        timestamp: new Date().toISOString()
                    };
                    
                    requests.push(newRequest);
                    saveData();
                    
                    // إشعار بطلب استقالة
                    showNotification(
                        'طلب استقالة جديد',
                        `قدم ${currentUser.name} طلب استقالة`,
                        'request',
                        true
                    );
                    
                    closeModal('resignModal');
                    
                    document.getElementById('resignReason').value = '';
                    
                    showToast('تم تقديم طلب الاستقالة بنجاح!', 'success');
                    
                    updateMyRequestsCount();
                    
                    if (currentUser && currentUser.role === 'admin') {
                        updateAdminStats();
                        loadAdminRequestsTable();
                    }
                } catch (error) {
                    console.error('خطأ في تقديم طلب الاستقالة:', error);
                    showAlert('حدث خطأ في تقديم طلب الاستقالة', 'error');
                } finally {
                    showLoading(false);
                }
            }, 500);
        }

        // ===== دوال تحديث واجهة المستخدم =====
        function updateUserPanel() {
            if (!currentUser) return;
            
            document.getElementById('userGreeting').textContent = `مرحباً ${currentUser.name}`;
            document.getElementById('userDisplayName').textContent = currentUser.name;
            document.getElementById('userDisplayDepartment').textContent = currentUser.department;
            document.getElementById('userDisplayPhone').textContent = currentUser.phone;
            
            const statusIcon = document.getElementById('userStatusIcon');
            const statusText = document.getElementById('userStatusText');
            const loginBtn = document.getElementById('attendanceLoginBtn');
            const logoutBtn = document.getElementById('attendanceLogoutBtn');
            
            if (currentSession) {
                statusIcon.innerHTML = '<i class="fas fa-check-circle text-green-500"></i>';
                statusText.textContent = 'مسجل دخول';
                statusText.className = 'badge badge-success';
                loginBtn.disabled = true;
                logoutBtn.disabled = false;
            } else {
                statusIcon.innerHTML = '<i class="fas fa-times-circle text-red-500"></i>';
                statusText.textContent = 'غير مسجل';
                statusText.className = 'badge badge-danger';
                loginBtn.disabled = false;
                logoutBtn.disabled = true;
            }
            
            updateUserInterface();
            updateUserStats();
            updateUserAttendanceTable();
            updateCurrentTime();
            updateMyRequestsCount();
        }
        
        function updateUserStats() {
            try {
                const userSessions = sessions.filter(s => s.userId === currentUser.id && s.logoutTime);
                
                const uniqueDays = new Set(userSessions.map(s => s.loginTime.split('T')[0])).size;
                const totalMinutes = userSessions.reduce((sum, session) => sum + (session.totalMinutes || 0), 0);
                const totalHours = (totalMinutes / 60).toFixed(1);
                const avgHours = uniqueDays > 0 ? (totalMinutes / uniqueDays / 60).toFixed(1) : 0;
                
                document.getElementById('userDays').textContent = uniqueDays;
                document.getElementById('userHours').textContent = totalHours;
                document.getElementById('userAvg').textContent = avgHours;
            } catch (error) {
                console.error('خطأ في تحديث إحصائيات المستخدم:', error);
            }
        }
        
        function updateUserAttendanceTable() {
            try {
                const table = document.getElementById('userAttendanceTable');
                const userSessions = sessions
                    .filter(s => s.userId === currentUser.id && s.logoutTime)
                    .sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime))
                    .slice(0, 10);
                
                let html = '';
                
                if (userSessions.length === 0) {
                    html = `
                    <tr>
                        <td colspan="4" class="empty-state">
                            <i class="fas fa-history"></i>
                            <p>لا توجد سجلات حضور سابقة</p>
                        </td>
                    </tr>
                    `;
                } else {
                    userSessions.forEach(session => {
                        const loginDate = new Date(session.loginTime);
                        const logoutDate = new Date(session.logoutTime);
                        
                        const dateStr = loginDate.toLocaleDateString('ar-SA');
                        const loginTimeStr = loginDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                        const logoutTimeStr = logoutDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                        const durationStr = session.totalMinutes ? `${Math.floor(session.totalMinutes / 60)}:${(session.totalMinutes % 60).toString().padStart(2, '0')}` : '-';
                        
                        html += `
                        <tr>
                            <td class="text-gray-800 dark:text-white">${dateStr}</td>
                            <td class="text-gray-800 dark:text-white">${loginTimeStr}</td>
                            <td class="text-gray-800 dark:text-white">${logoutTimeStr}</td>
                            <td class="text-gray-800 dark:text-white">${durationStr}</td>
                        </tr>
                        `;
                    });
                }
                
                table.innerHTML = html;
            } catch (error) {
                console.error('خطأ في تحديث جدول الحضور:', error);
                document.getElementById('userAttendanceTable').innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center text-red-500 py-4">
                            خطأ في تحميل سجلات الحضور
                        </td>
                    </tr>
                `;
            }
        }
        
        function updateCurrentTime() {
            try {
                const now = new Date();
                const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const dateStr = now.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                
                if (document.getElementById('currentTime')) {
                    document.getElementById('currentTime').textContent = `${dateStr} - ${timeStr}`;
                }
                if (document.getElementById('adminCurrentTime')) {
                    document.getElementById('adminCurrentTime').textContent = `${dateStr} - ${timeStr}`;
                }
            } catch (error) {
                console.error('خطأ في تحديث الوقت:', error);
            }
        }

        // ===== دوال لوحة المدير =====
        function updateAdminPanel() {
            if (!currentUser || currentUser.role !== 'admin') return;
            
            document.getElementById('adminGreeting').textContent = `مرحباً ${currentUser.name}`;
            
            updateAdminStats();
            loadAdminUsersTable();
            loadAdminAttendanceTable();
            loadAdminRequestsTable();
            loadReports();
            loadRolesList();
            loadNotificationsHistory();
        }
        
        function updateAdminStats() {
            try {
                const totalUsers = users.filter(u => u.id !== currentUser?.id).length;
                const activeUsers = sessions.filter(s => !s.logoutTime).length;
                const pendingRequests = requests.filter(r => r.status === 'معلق').length;
                
                document.getElementById('adminTotalUsers').textContent = totalUsers;
                document.getElementById('adminActiveUsers').textContent = activeUsers;
                document.getElementById('adminPendingRequests').textContent = pendingRequests;
                document.getElementById('adminRankChanges').textContent = 0;
            } catch (error) {
                console.error('خطأ في تحديث إحصائيات المدير:', error);
            }
        }
        
        function showAdminTab(tabId) {
            try {
                document.querySelectorAll('.tab-content').forEach(tab => {
                    tab.classList.remove('active');
                });
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                document.getElementById(tabId + 'Tab').classList.add('active');
                event.target.classList.add('active');
                
                if (tabId === 'users') {
                    loadAdminUsersTable();
                } else if (tabId === 'roles') {
                    loadRolesList();
                } else if (tabId === 'attendance') {
                    loadAdminAttendanceTable();
                } else if (tabId === 'requests') {
                    loadAdminRequestsTable();
                } else if (tabId === 'reports') {
                    loadReports();
                } else if (tabId === 'notifications') {
                    loadNotificationsHistory();
                }
            } catch (error) {
                console.error('خطأ في تبديل تبويبات المدير:', error);
            }
        }
        
        function loadAdminUsersTable() {
            try {
                const table = document.getElementById('adminUsersTable');
                const searchTerm = document.getElementById('searchUsers')?.value.toLowerCase() || '';
                
                let filteredUsers = users;
                
                if (searchTerm) {
                    filteredUsers = filteredUsers.filter(user => 
                        user.name.toLowerCase().includes(searchTerm) ||
                        user.phone.includes(searchTerm) ||
                        (user.department && user.department.toLowerCase().includes(searchTerm)) ||
                        (user.role && user.role.toLowerCase().includes(searchTerm))
                    );
                }
                
                let html = '';
                
                if (filteredUsers.length === 0) {
                    html = `
                    <tr>
                        <td colspan="7" class="empty-state">
                            <i class="fas fa-users"></i>
                            <p>لا يوجد موظفين مسجلين</p>
                            <p class="text-sm text-gray-500">${searchTerm ? 'لم يتم العثور على نتائج للبحث' : 'قم بإضافة أول موظف'}</p>
                            ${!searchTerm ? `
                            <button onclick="openModal('registerModal')" class="btn btn-success mt-2">
                                <i class="fas fa-user-plus ml-2"></i> إضافة أول موظف
                            </button>
                            ` : ''}
                        </td>
                    </tr>
                    `;
                } else {
                    filteredUsers.forEach(user => {
                        const roleInfo = getRoleInfo(user.role);
                        const isActive = sessions.some(s => s.userId === user.id && !s.logoutTime);
                        const statusBadge = isActive ? 
                            '<span class="badge badge-success">نشط</span>' : 
                            '<span class="badge badge-secondary">غير نشط</span>';
                        
                        const userPermissions = user.permissions || roleInfo.permissions;
                        const grantedPermissions = Object.values(userPermissions).filter(p => p === true).length;
                        const totalPermissions = Object.keys(userPermissions).length;
                        
                        html += `
                        <tr>
                            <td class="text-gray-800 dark:text-white">${user.name}</td>
                            <td><span class="role-badge ${roleInfo.badgeClass}">${roleInfo.name}</span></td>
                            <td class="text-gray-800 dark:text-white">${user.rank || roleInfo.name}</td>
                            <td class="text-gray-800 dark:text-white">${user.phone}</td>
                            <td>${statusBadge}</td>
                            <td class="text-gray-800 dark:text-white">
                                <span class="text-sm">${grantedPermissions}/${totalPermissions}</span>
                                <button onclick="viewUserPermissions(${user.id})" class="btn btn-info btn-sm mr-2">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                            <td>
                                <button onclick="openEditPermissions(${user.id})" class="btn btn-primary btn-sm mr-2">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deleteUser(${user.id}, '${user.name.replace(/'/g, "\\'")}')" class="btn btn-danger btn-sm" ${!checkPermission('deleteUsers') || (currentUser && currentUser.id === user.id) ? 'disabled style="opacity:0.5;"' : ''}>
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                        `;
                    });
                }
                
                table.innerHTML = html;
            } catch (error) {
                console.error('خطأ في تحميل جدول المستخدمين:', error);
                document.getElementById('adminUsersTable').innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-red-500 py-4">
                            خطأ في تحميل بيانات المستخدمين
                        </td>
                    </tr>
                `;
            }
        }
        
        function viewUserPermissions(userId) {
            try {
                const user = users.find(u => u.id === userId);
                if (!user) return;
                
                const roleInfo = getRoleInfo(user.role);
                const permissions = user.permissions || roleInfo.permissions;
                
                let html = `
                    <h4 class="font-bold mb-2">${user.name}</h4>
                    <p><strong>الدور:</strong> ${roleInfo.name}</p>
                    <p><strong>الرتبة:</strong> ${user.rank || roleInfo.name}</p>
                    <p><strong>القسم:</strong> ${user.department || 'غير محدد'}</p>
                    <hr class="my-3">
                    <p><strong>الصلاحيات الممنوحة:</strong></p>
                    <ul class="list-disc pr-5 mt-2">
                `;
                
                for (const key in permissionNames) {
                    if (permissions[key]) {
                        html += `<li class="text-green-600">✓ ${permissionNames[key]}</li>`;
                    } else {
                        html += `<li class="text-gray-400">✗ ${permissionNames[key]}</li>`;
                    }
                }
                
                html += `</ul>`;
                
                document.getElementById('requestDetailsTitle').textContent = `صلاحيات الموظف: ${user.name}`;
                document.getElementById('requestDetailsContent').innerHTML = html;
                openModal('requestDetailsModal');
            } catch (error) {
                console.error('خطأ في عرض صلاحيات المستخدم:', error);
                alert('حدث خطأ في عرض الصلاحيات');
            }
        }
        
        function openEditPermissions(userId) {
            try {
                userId = parseInt(userId);
                
                const user = users.find(u => u.id === userId);
                
                if (!user) {
                    alert('المستخدم غير موجود');
                    return;
                }
                
                userToEditPermissions = userId;
                document.getElementById('editUserName').textContent = user.name;
                
                const roleInfo = getRoleInfo(user.role);
                document.getElementById('editUserRole').textContent = roleInfo.name;
                document.getElementById('editUserRole').className = `badge badge-info`;
                
                editingPermissions = {...user.permissions};
                
                let html = '';
                
                for (const key in permissionNames) {
                    const hasPermission = editingPermissions[key] === true;
                    const permissionName = permissionNames[key];
                    
                    html += `
                    <div class="permission-item">
                        <div class="permission-label text-gray-800 dark:text-white">
                            ${permissionName}
                        </div>
                        <div class="permission-buttons">
                            <button onclick="togglePermission('${key}')" 
                                    class="btn btn-success btn-sm ${hasPermission ? 'hidden' : ''}" id="addBtn_${key}">
                                <i class="fas fa-plus"></i> إضافة
                            </button>
                            <button onclick="togglePermission('${key}')" 
                                    class="btn btn-danger btn-sm ${!hasPermission ? 'hidden' : ''}" id="removeBtn_${key}">
                                <i class="fas fa-minus"></i> إزالة
                            </button>
                        </div>
                    </div>
                    `;
                }
                
                document.getElementById('permissionsList').innerHTML = html;
                openModal('editPermissionsModal');
            } catch (error) {
                console.error('خطأ في فتح تعديل الصلاحيات:', error);
                alert('حدث خطأ في فتح صفحة تعديل الصلاحيات');
            }
        }
        
        function togglePermission(permissionKey) {
            try {
                editingPermissions[permissionKey] = !editingPermissions[permissionKey];
                
                const addBtn = document.getElementById(`addBtn_${permissionKey}`);
                const removeBtn = document.getElementById(`removeBtn_${permissionKey}`);
                
                if (editingPermissions[permissionKey]) {
                    addBtn.classList.add('hidden');
                    removeBtn.classList.remove('hidden');
                } else {
                    removeBtn.classList.add('hidden');
                    addBtn.classList.remove('hidden');
                }
            } catch (error) {
                console.error('خطأ في تبديل الصلاحية:', error);
            }
        }
        
        function savePermissions() {
            if (!userToEditPermissions) return;
            
            showLoading(true);
            
            setTimeout(() => {
                try {
                    const userIndex = users.findIndex(u => u.id === userToEditPermissions);
                    if (userIndex !== -1) {
                        users[userIndex].permissions = editingPermissions;
                        
                        let newRole = 'employee';
                        
                        if (editingPermissions.addUsers && editingPermissions.editPermissions && 
                            editingPermissions.processRequests && editingPermissions.viewReports) {
                            newRole = 'admin';
                        } else if (editingPermissions.processRequests && editingPermissions.viewReports) {
                            newRole = 'manager';
                        } else if (editingPermissions.viewTeamAttendance && editingPermissions.viewTeamRequests) {
                            newRole = 'supervisor';
                        }
                        
                        users[userIndex].role = newRole;
                        
                        saveData();
                        
                        // إشعار بتعديل الصلاحيات
                        if (currentUser) {
                            showNotification(
                                'تعديل صلاحيات',
                                `قام ${currentUser.name} بتعديل صلاحيات الموظف ${users[userIndex].name}`,
                                'admin',
                                true
                            );
                        }
                        
                        if (currentUser && currentUser.id === userToEditPermissions) {
                            currentUser = users[userIndex];
                            localStorage.setItem('currentUser', JSON.stringify(currentUser));
                            updateUserInterface();
                        }
                        
                        loadAdminUsersTable();
                        
                        closeModal('editPermissionsModal');
                        showToast('تم تحديث صلاحيات الموظف بنجاح!', 'success');
                    }
                } catch (error) {
                    console.error('خطأ في حفظ الصلاحيات:', error);
                    showAlert('حدث خطأ في حفظ الصلاحيات', 'error');
                } finally {
                    showLoading(false);
                }
            }, 500);
        }
        
        function loadAdminAttendanceTable() {
            try {
                const table = document.getElementById('adminAttendanceTable');
                const allSessions = sessions
                    .sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime));
                
                let html = '';
                
                if (allSessions.length === 0) {
                    html = `
                    <tr>
                        <td colspan="8" class="empty-state">
                            <i class="fas fa-history"></i>
                            <p>لا توجد سجلات حضور</p>
                            <p class="text-sm text-gray-500">سيظهر هنا سجلات الدخول والخروج للموظفين</p>
                        </td>
                    </tr>
                    `;
                } else {
                    allSessions.forEach(session => {
                        const user = users.find(u => u.id === session.userId);
                        if (!user) return;
                        
                        const roleInfo = getRoleInfo(user.role);
                        const loginDate = new Date(session.loginTime);
                        const logoutDate = session.logoutTime ? new Date(session.logoutTime) : null;
                        
                        const dateStr = loginDate.toLocaleDateString('ar-SA');
                        const loginTimeStr = loginDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                        const logoutTimeStr = logoutDate ? logoutDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-';
                        const durationStr = session.totalMinutes ? `${Math.floor(session.totalMinutes / 60)}:${(session.totalMinutes % 60).toString().padStart(2, '0')}` : '-';
                        const reportShort = session.report ? (session.report.length > 30 ? session.report.substring(0, 30) + '...' : session.report) : '-';
                        
                        let statusBadge = session.logoutTime ? 
                            '<span class="badge badge-success">مكتمل</span>' : 
                            '<span class="badge badge-warning">قيد العمل</span>';
                        
                        html += `
                        <tr>
                            <td class="text-gray-800 dark:text-white">${user.name}</td>
                            <td class="text-gray-800 dark:text-white">${user.rank || roleInfo.name}</td>
                            <td class="text-gray-800 dark:text-white">${dateStr}</td>
                            <td class="text-gray-800 dark:text-white">${loginTimeStr}</td>
                            <td class="text-gray-800 dark:text-white">${logoutTimeStr}</td>
                            <td class="text-gray-800 dark:text-white">${durationStr}</td>
                            <td class="text-gray-800 dark:text-white">
                                ${reportShort && reportShort !== '-' ? `
                                <button onclick="viewReportDetails(${session.id})" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                                    ${reportShort}
                                </button>
                                ` : '-'}
                            </td>
                            <td>${statusBadge}</td>
                        </tr>
                        `;
                    });
                }
                
                table.innerHTML = html;
            } catch (error) {
                console.error('خطأ في تحميل جدول الحضور:', error);
                document.getElementById('adminAttendanceTable').innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center text-red-500 py-4">
                            خطأ في تحميل سجلات الحضور
                        </td>
                    </tr>
                `;
            }
        }
        
        function viewReportDetails(sessionId) {
            try {
                const session = sessions.find(s => s.id === sessionId);
                if (!session) return;
                
                const user = users.find(u => u.id === session.userId);
                const loginDate = new Date(session.loginTime);
                const logoutDate = session.logoutTime ? new Date(session.logoutTime) : null;
                
                let html = `
                    <p><strong>الموظف:</strong> ${user?.name || 'غير معروف'}</p>
                    <p><strong>الرتبة:</strong> ${user?.rank || 'غير محدد'}</p>
                    <p><strong>تاريخ:</strong> ${loginDate.toLocaleDateString('ar-SA')}</p>
                    <p><strong>وقت الدخول:</strong> ${loginDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</p>
                    <p><strong>وقت الخروج:</strong> ${logoutDate ? logoutDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : 'لم يسجل خروج'}</p>
                    <p><strong>المدة:</strong> ${session.totalMinutes ? `${Math.floor(session.totalMinutes / 60)} ساعة و ${session.totalMinutes % 60} دقيقة` : '-'}</p>
                    <hr class="my-3">
                    <p><strong>تقرير العمل:</strong></p>
                    <p class="mt-2">${session.report || 'لا يوجد تقرير'}</p>
                `;
                
                document.getElementById('reportDetailsContent').innerHTML = html;
                openModal('reportDetailsModal');
            } catch (error) {
                console.error('خطأ في عرض تفاصيل التقرير:', error);
                alert('حدث خطأ في عرض التقرير');
            }
        }
        
        function loadAdminRequestsTable() {
            try {
                const table = document.getElementById('adminRequestsTable');
                const allRequests = requests
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                let html = '';
                
                if (allRequests.length === 0) {
                    html = `
                    <tr>
                        <td colspan="7" class="empty-state">
                            <i class="fas fa-file-alt"></i>
                            <p>لا توجد طلبات</p>
                            <p class="text-sm text-gray-500">ستظهر هنا طلبات الإجازة والاستقالة من الموظفين</p>
                        </td>
                    </tr>
                    `;
                } else {
                    allRequests.forEach(request => {
                        const user = users.find(u => u.id === request.userId);
                        const roleInfo = user ? getRoleInfo(user.role) : getRoleInfo('employee');
                        
                        const date = new Date(request.timestamp);
                        const dateStr = date.toLocaleDateString('ar-SA');
                        
                        let statusBadge = '';
                        if (request.status === 'معلق') {
                            statusBadge = '<span class="badge badge-warning">معلق</span>';
                        } else if (request.status === 'مقبول') {
                            statusBadge = '<span class="badge badge-success">مقبول</span>';
                        } else {
                            statusBadge = '<span class="badge badge-danger">مرفوض</span>';
                        }
                        
                        const reasonShort = request.reason.length > 30 ? request.reason.substring(0, 30) + '...' : request.reason;
                        
                        let actionBtn = '';
                        if (request.status === 'معلق') {
                            actionBtn = `
                                <button onclick="viewRequestDetails(${request.id})" class="btn btn-primary btn-sm mr-2">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button onclick="processUserRequest(${request.id})" class="btn btn-warning btn-sm">
                                    معالجة
                                </button>
                            `;
                        } else {
                            actionBtn = `
                                <button onclick="viewRequestDetails(${request.id})" class="btn btn-primary btn-sm">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <span class="text-gray-500 dark:text-gray-400 text-sm">تمت المعالجة</span>
                            `;
                        }
                        
                        html += `
                        <tr>
                            <td class="text-gray-800 dark:text-white">${request.username}</td>
                            <td class="text-gray-800 dark:text-white">${user?.rank || roleInfo.name}</td>
                            <td class="text-gray-800 dark:text-white">${request.type}</td>
                            <td class="text-gray-800 dark:text-white" title="${request.reason}">${reasonShort}</td>
                            <td class="text-gray-800 dark:text-white">${dateStr}</td>
                            <td>${statusBadge}</td>
                            <td>${actionBtn}</td>
                        </tr>
                        `;
                    });
                }
                
                table.innerHTML = html;
            } catch (error) {
                console.error('خطأ في تحميل جدول الطلبات:', error);
                document.getElementById('adminRequestsTable').innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-red-500 py-4">
                            خطأ في تحميل طلبات الموظفين
                        </td>
                    </tr>
                `;
            }
        }
        
        function viewRequestDetails(requestId) {
            try {
                const request = requests.find(r => r.id === requestId);
                if (!request) return;
                
                const date = new Date(request.timestamp);
                const dateStr = date.toLocaleDateString('ar-SA') + ' ' + 
                               date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                
                let details = '';
                if (request.type === 'إجازة') {
                    details = `
                        <p><strong>نوع الطلب:</strong> ${request.type}</p>
                        <p><strong>الموظف:</strong> ${request.username}</p>
                        <p><strong>القسم:</strong> ${request.department}</p>
                        <p><strong>سبب الإجازة:</strong> ${request.reason}</p>
                        <p><strong>المدة:</strong> ${request.duration}</p>
                        <p><strong>تاريخ البدء:</strong> ${request.startDate}</p>
                        <p><strong>تاريخ الطلب:</strong> ${dateStr}</p>
                        <p><strong>الحالة:</strong> ${request.status}</p>
                    `;
                } else if (request.type === 'استقالة') {
                    details = `
                        <p><strong>نوع الطلب:</strong> ${request.type}</p>
                        <p><strong>الموظف:</strong> ${request.username}</p>
                        <p><strong>القسم:</strong> ${request.department}</p>
                        <p><strong>سبب الاستقالة:</strong> ${request.reason}</p>
                        <p><strong>تاريخ إنهاء العمل:</strong> ${request.endDate}</p>
                        <p><strong>تاريخ الطلب:</strong> ${dateStr}</p>
                        <p><strong>الحالة:</strong> ${request.status}</p>
                    `;
                }
                
                document.getElementById('requestDetailsTitle').textContent = `تفاصيل الطلب`;
                document.getElementById('requestDetailsContent').innerHTML = details;
                openModal('requestDetailsModal');
            } catch (error) {
                console.error('خطأ في عرض تفاصيل الطلب:', error);
                alert('حدث خطأ في عرض تفاصيل الطلب');
            }
        }
        
        function filterRequests() {
            try {
                const typeFilter = document.getElementById('filterRequestType').value;
                const statusFilter = document.getElementById('filterRequestStatus').value;
                const rows = document.querySelectorAll('#adminRequestsTable tr');
                
                rows.forEach(row => {
                    if (row.cells.length < 7) return;
                    
                    const type = row.cells[2].textContent;
                    const status = row.cells[5].querySelector('span')?.textContent || '';
                    
                    const typeMatch = !typeFilter || type === typeFilter;
                    const statusMatch = !statusFilter || status === statusFilter;
                    
                    row.style.display = (typeMatch && statusMatch) ? '' : 'none';
                });
            } catch (error) {
                console.error('خطأ في تصفية الطلبات:', error);
            }
        }
        
        function processUserRequest(requestId) {
            try {
                requestToProcess = requestId;
                const request = requests.find(r => r.id === requestId);
                if (!request) return;
                
                document.getElementById('processMessage').textContent = `معالجة طلب ${request.type} للموظف "${request.username}"`;
                openModal('processModal');
            } catch (error) {
                console.error('خطأ في معالجة الطلب:', error);
                alert('حدث خطأ في معالجة الطلب');
            }
        }
        
        function showRejectReason() {
            try {
                document.getElementById('processReasonField').style.display = 'block';
            } catch (error) {
                console.error('خطأ في عرض سبب الرفض:', error);
            }
        }
        
        function processRequest(status) {
            if (!requestToProcess) return;
            
            showLoading(true);
            
            setTimeout(() => {
                try {
                    const requestIndex = requests.findIndex(r => r.id === requestToProcess);
                    if (requestIndex !== -1) {
                        requests[requestIndex].status = status;
                        
                        if (status === 'مرفوض') {
                            const rejectReason = document.getElementById('rejectReason').value.trim();
                            if (rejectReason) {
                                requests[requestIndex].rejectReason = rejectReason;
                            }
                        }
                        
                        saveData();
                        
                        // إشعار بمعالجة الطلب
                        const request = requests[requestIndex];
                        showNotification(
                            'معالجة طلب',
                            `تم ${status === 'مقبول' ? 'قبول' : 'رفض'} طلب ${request.type} للموظف ${request.username}`,
                            'admin',
                            true
                        );
                        
                        loadAdminRequestsTable();
                        updateAdminStats();
                        
                        closeModal('processModal');
                        showToast(`تم ${status === 'مقبول' ? 'قبول' : 'رفض'} الطلب بنجاح!`, 'success');
                    }
                } catch (error) {
                    console.error('خطأ في معالجة الطلب:', error);
                    showAlert('حدث خطأ في معالجة الطلب', 'error');
                } finally {
                    showLoading(false);
                }
            }, 500);
        }

        // ===== دوال إدارة الرتب =====
        function getAllRoles() {
            return { ...rolePermissions, ...customRoles };
        }
        
        function getRoleInfo(roleKey) {
            const allRoles = getAllRoles();
            return allRoles[roleKey] || rolePermissions.employee;
        }
        
        function loadRolesList() {
            try {
                const rolesList = document.getElementById('rolesList');
                if (!rolesList) return;
                
                let html = '';
                
                const allRoles = getAllRoles();
                
                Object.entries(allRoles).forEach(([roleKey, role]) => {
                    const isSelected = currentEditingRole === roleKey;
                    const isCustom = customRoles[roleKey];
                    
                    html += `
                        <div class="role-item ${isSelected ? 'selected' : ''}" 
                             onclick="editRole('${roleKey}')">
                            <div class="flex justify-between items-center">
                                <div>
                                    <h4 class="font-bold text-lg">${role.name}</h4>
                                    <div class="flex gap-2 items-center">
                                        <p class="text-sm text-gray-500">${roleKey}</p>
                                        ${isCustom ? 
                                            '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">مخصصة</span>' : 
                                            '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">أساسية</span>'}
                                    </div>
                                </div>
                                <span class="${isSelected ? 'text-white' : 'text-blue-500'}">
                                    <i class="fas fa-chevron-left"></i>
                                </span>
                            </div>
                        </div>
                    `;
                });
                
                rolesList.innerHTML = html;
                
                if (!currentEditingRole && Object.keys(allRoles).length > 0) {
                    const firstRole = Object.keys(allRoles)[0];
                    editRole(firstRole);
                }
            } catch (error) {
                console.error('خطأ في تحميل قائمة الرتب:', error);
            }
        }
        
        function editRole(roleKey) {
            try {
                roleKey = roleKey.replace(/['"]/g, '');
                currentEditingRole = roleKey;
                const allRoles = getAllRoles();
                const role = allRoles[roleKey];
                
                if (!role) {
                    alert(`الرتبة ${roleKey} غير موجودة`);
                    return;
                }
                
                document.getElementById('editRoleName').value = role.name;
                document.getElementById('editingRoleTitle').textContent = `تعديل صلاحيات: ${role.name}`;
                
                let permissionsHtml = '';
                for (const key in permissionNames) {
                    const hasPermission = role.permissions ? (role.permissions[key] === true) : false;
                    permissionsHtml += `
                        <div class="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700">
                            <span class="text-gray-800 dark:text-white">${permissionNames[key]}</span>
                            <input type="checkbox" 
                                   id="perm_${key}" 
                                   ${hasPermission ? 'checked' : ''}
                                   class="w-5 h-5 rounded text-blue-600 dark:text-blue-400">
                        </div>
                    `;
                }
                
                document.getElementById('rolePermissionsList').innerHTML = permissionsHtml;
                
                const deleteBtn = document.getElementById('deleteRoleBtn');
                if (deleteBtn) {
                    const isCustomRole = customRoles[roleKey];
                    deleteBtn.disabled = !isCustomRole;
                    deleteBtn.title = isCustomRole ? "حذف الرتبة المخصصة" : "لا يمكن حذف الرتبة الأساسية";
                }
                
                document.querySelectorAll('#rolesList .role-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                const selectedItem = document.querySelector(`[onclick*="${roleKey}"]`);
                if (selectedItem) {
                    selectedItem.classList.add('selected');
                }
            } catch (error) {
                console.error('خطأ في editRole:', error);
                alert('حدث خطأ في تحميل الرتبة');
            }
        }
        
        function saveRolePermissions() {
            if (!currentEditingRole) return;
            
            const roleKey = currentEditingRole;
            const allRoles = getAllRoles();
            const role = allRoles[roleKey];
            
            if (!role) {
                alert('الرتبة غير موجودة');
                return;
            }
            
            for (const key in permissionNames) {
                const checkbox = document.getElementById(`perm_${key}`);
                role.permissions[key] = checkbox.checked;
            }
            
            if (rolePermissions[roleKey]) {
                rolePermissions[roleKey].permissions = { ...role.permissions };
            } else if (customRoles[roleKey]) {
                customRoles[roleKey].permissions = { ...role.permissions };
            }
            
            users.forEach(user => {
                if (user.role === roleKey) {
                    user.permissions = { ...role.permissions };
                }
            });
            
            saveData();
            
            // إشعار بتعديل الرتبة
            if (currentUser) {
                showNotification(
                    'تعديل رتبة',
                    `قام ${currentUser.name} بتعديل صلاحيات رتبة ${role.name}`,
                    'admin',
                    true
                );
            }
            
            if (currentUser && currentUser.role === roleKey) {
                currentUser.permissions = { ...role.permissions };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                updateUserInterface();
            }
            
            showToast('تم تحديث صلاحيات الرتبة بنجاح!', 'success');
        }
        
        function deleteRole() {
            if (!currentEditingRole) return;
            
            const roleKey = currentEditingRole;
            
            if (rolePermissions[roleKey]) {
                alert('لا يمكن حذف الرتب الأساسية. يمكنك فقط تعديل صلاحياتها.');
                return;
            }
            
            if (customRoles[roleKey]) {
                if (confirm(`هل أنت متأكد من حذف الرتبة "${customRoles[roleKey].name}"؟`)) {
                    const usersWithThisRole = users.filter(u => u.role === roleKey);
                    
                    if (usersWithThisRole.length > 0) {
                        alert(`لا يمكن حذف الرتبة لأن ${usersWithThisRole.length} موظف يستخدمونها. قم بتغيير رتبتهم أولاً.`);
                        return;
                    }
                    
                    delete customRoles[roleKey];
                    currentEditingRole = null;
                    saveData();
                    
                    // إشعار بحذف الرتبة
                    if (currentUser) {
                        showNotification(
                            'حذف رتبة',
                            `قام ${currentUser.name} بحذف رتبة ${customRoles[roleKey]?.name || roleKey}`,
                            'admin',
                            true
                        );
                    }
                    
                    document.getElementById('editRoleName').value = '';
                    document.getElementById('editingRoleTitle').textContent = 'تعديل صلاحيات الرتبة';
                    document.getElementById('rolePermissionsList').innerHTML = '';
                    document.getElementById('deleteRoleBtn').disabled = true;
                    
                    loadRolesList();
                    
                    showToast('تم حذف الرتبة بنجاح!', 'success');
                }
            }
        }
        
        document.getElementById('addRoleForm').addEventListener('submit', function(e) {
            e.preventDefault();
            addNewRole();
        });
        
        function addNewRole() {
            try {
                const name = document.getElementById('newRoleName').value.trim();
                const key = document.getElementById('newRoleKey').value.trim();
                
                if (!name || !key) {
                    showAlert('يرجى ملء جميع الحقول', 'error');
                    return;
                }
                
                const allRoles = getAllRoles();
                if (allRoles[key]) {
                    showAlert('مفتاح الرتبة موجود مسبقاً', 'error');
                    return;
                }
                
                const newRole = {
                    name: name,
                    badgeClass: "role-badge-custom",
                    permissions: {
                        attendance: true,
                        leave: true,
                        resign: true,
                        viewHistory: true,
                        viewStats: true,
                        viewTeamAttendance: false,
                        viewTeamRequests: false,
                        addUsers: false,
                        editPermissions: false,
                        viewAllAttendance: false,
                        processRequests: false,
                        viewReports: false,
                        deleteUsers: false,
                        requestPromotion: false
                    }
                };
                
                customRoles[key] = newRole;
                saveData();
                
                // إشعار بإضافة رتبة جديدة
                if (currentUser) {
                    showNotification(
                        'إضافة رتبة جديدة',
                        `قام ${currentUser.name} بإضافة رتبة جديدة: ${name}`,
                        'admin',
                        true
                    );
                }
                
                document.getElementById('newRoleName').value = '';
                document.getElementById('newRoleKey').value = '';
                closeModal('addRoleModal');
                
                loadRolesList();
                
                showToast('تم إضافة الرتبة الجديدة بنجاح!', 'success');
            } catch (error) {
                console.error('خطأ في إضافة رتبة جديدة:', error);
                showAlert('حدث خطأ في إضافة الرتبة الجديدة', 'error');
            }
        }

        // ===== دوال التقارير =====
        function loadReports() {
            try {
                const userStats = users
                    .filter(u => u.role !== 'admin')
                    .map(user => {
                        const userSessions = sessions.filter(s => s.userId === user.id && s.logoutTime);
                        const totalMinutes = userSessions.reduce((sum, session) => sum + (session.totalMinutes || 0), 0);
                        return { user, totalMinutes };
                    })
                    .sort((a, b) => b.totalMinutes - a.totalMinutes)
                    .slice(0, 5);
                
                let topUsersHtml = '';
                if (userStats.length === 0) {
                    topUsersHtml = '<p class="text-gray-500 dark:text-gray-400 text-center">لا توجد بيانات عن الموظفين</p>';
                } else {
                    userStats.forEach((stat, index) => {
                        const hours = (stat.totalMinutes / 60).toFixed(1);
                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤';
                        topUsersHtml += `
                        <div class="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                            <div class="text-gray-800 dark:text-white">
                                <span class="ml-2">${medal}</span>
                                <span>${stat.user.name}</span>
                                <span class="text-gray-500 dark:text-gray-400 text-sm">(${stat.user.rank})</span>
                            </div>
                            <span class="font-bold text-gray-800 dark:text-white">${hours} ساعة</span>
                        </div>
                        `;
                    });
                }
                
                document.getElementById('topEmployeesList').innerHTML = topUsersHtml;
                
                const ranks = {};
                users.forEach(user => {
                    if (user.role !== 'admin') {
                        const rank = user.rank || 'موظف عادي';
                        if (!ranks[rank]) ranks[rank] = { count: 0, hours: 0 };
                        ranks[rank].count++;
                        
                        const userSessions = sessions.filter(s => s.userId === user.id && s.logoutTime);
                        const totalMinutes = userSessions.reduce((sum, session) => sum + (session.totalMinutes || 0), 0);
                        ranks[rank].hours += totalMinutes / 60;
                    }
                });
                
                let rankStatsHtml = '';
                for (const [rank, data] of Object.entries(ranks)) {
                    rankStatsHtml += `
                    <div class="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                        <span class="text-gray-800 dark:text-white">${rank}</span>
                        <div class="flex items-center gap-2">
                            <span class="text-sm text-gray-500 dark:text-gray-400">${data.count} موظف</span>
                            <span class="font-bold text-gray-800 dark:text-white">${data.hours.toFixed(1)} ساعة</span>
                        </div>
                    </div>
                    `;
                }
                
                if (Object.keys(ranks).length === 0) {
                    rankStatsHtml = '<p class="text-gray-500 dark:text-gray-400 text-center">لا توجد بيانات عن الرتب</p>';
                }
                
                document.getElementById('rankStats').innerHTML = rankStatsHtml;
                
                const today = new Date();
                const lastWeek = new Date();
                lastWeek.setDate(lastWeek.getDate() - 7);
                
                document.getElementById('reportFromDate').value = lastWeek.toISOString().split('T')[0];
                document.getElementById('reportToDate').value = today.toISOString().split('T')[0];
                
                document.getElementById('attendanceReportResult').innerHTML = '';
            } catch (error) {
                console.error('خطأ في تحميل التقارير:', error);
            }
        }
        
        function generateAttendanceReport() {
            try {
                const fromDate = document.getElementById('reportFromDate').value;
                const toDate = document.getElementById('reportToDate').value;
                
                if (!fromDate || !toDate) {
                    alert('يرجى تحديد تاريخ البداية والنهاية');
                    return;
                }
                
                const filteredSessions = sessions.filter(s => {
                    const sessionDate = s.loginTime.split('T')[0];
                    return sessionDate >= fromDate && sessionDate <= toDate && s.logoutTime;
                });
                
                if (filteredSessions.length === 0) {
                    document.getElementById('attendanceReportResult').innerHTML = `
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle ml-1"></i>
                            لا توجد سجلات حضور في الفترة المحددة
                        </div>
                    `;
                    return;
                }
                
                let html = `
                    <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h4 class="font-bold mb-3 text-gray-800 dark:text-white">تقرير الحضور من ${fromDate} إلى ${toDate}</h4>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div class="text-center">
                                <div class="text-2xl font-bold text-gray-800 dark:text-white">${filteredSessions.length}</div>
                                <div class="text-gray-600 dark:text-gray-400">سجلات حضور</div>
                            </div>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-gray-800 dark:text-white">${new Set(filteredSessions.map(s => s.userId)).size}</div>
                                <div class="text-gray-600 dark:text-gray-400">موظف</div>
                            </div>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-gray-800 dark:text-white">${(filteredSessions.reduce((sum, s) => sum + s.totalMinutes, 0) / 60).toFixed(1)}</div>
                                <div class="text-gray-600 dark:text-gray-400">إجمالي الساعات</div>
                            </div>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-gray-800 dark:text-white">${(filteredSessions.reduce((sum, s) => sum + s.totalMinutes, 0) / filteredSessions.length / 60).toFixed(1)}</div>
                                <div class="text-gray-600 dark:text-gray-400">متوسط اليوم</div>
                            </div>
                        </div>
                        <button onclick="downloadReport(${JSON.stringify(filteredSessions).replace(/"/g, '&quot;')}, '${fromDate}', '${toDate}')" 
                                class="btn btn-success mt-2">
                            <i class="fas fa-download ml-2"></i> تحميل التقرير
                        </button>
                    </div>
                `;
                
                document.getElementById('attendanceReportResult').innerHTML = html;
            } catch (error) {
                console.error('خطأ في إنشاء التقرير:', error);
                document.getElementById('attendanceReportResult').innerHTML = `
                    <div class="alert alert-error">
                        <i class="fas fa-exclamation-circle ml-1"></i>
                        حدث خطأ في إنشاء التقرير
                    </div>
                `;
            }
        }
        
        function downloadReport(sessionsData, fromDate, toDate) {
            try {
                let reportText = `تقرير الحضور والانصراف\n`;
                reportText += `من: ${fromDate} إلى: ${toDate}\n`;
                reportText += `========================\n\n`;
                
                sessionsData.forEach(session => {
                    const user = users.find(u => u.id === session.userId);
                    const loginDate = new Date(session.loginTime);
                    const logoutDate = new Date(session.logoutTime);
                    
                    reportText += `الموظف: ${user?.name || 'غير معروف'}\n`;
                    reportText += `الرتبة: ${user?.rank || 'غير محدد'}\n`;
                    reportText += `التاريخ: ${loginDate.toLocaleDateString('ar-SA')}\n`;
                    reportText += `الدخول: ${loginDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}\n`;
                    reportText += `الخروج: ${logoutDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}\n`;
                    reportText += `المدة: ${Math.floor(session.totalMinutes / 60)}:${(session.totalMinutes % 60).toString().padStart(2, '0')}\n`;
                    reportText += `تقرير العمل: ${session.report || 'لا يوجد'}\n`;
                    reportText += `------------------------\n`;
                });
                
                const blob = new Blob([reportText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `تقرير_الحضور_${fromDate}_إلى_${toDate}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                showToast('تم تحميل التقرير بنجاح', 'success');
            } catch (error) {
                console.error('خطأ في تحميل التقرير:', error);
                showAlert('حدث خطأ في تحميل التقرير', 'error');
            }
        }

        // ===== دوال إدارة الموظفين =====
        function deleteUser(userId, userName) {
            if (!checkPermission('deleteUsers')) {
                alert('ليس لديك صلاحية لحذف الموظفين');
                return;
            }
            
            if (currentUser && currentUser.id === userId) {
                alert('لا يمكنك حذف حسابك الخاص!');
                return;
            }
            
            userToDelete = userId;
            document.getElementById('deleteMessage').textContent = `هل أنت متأكد من حذف الموظف "${userName}"؟ سيتم حذف جميع بياناته أيضًا.`;
            openModal('deleteModal');
        }
        
        function confirmDelete() {
            if (!userToDelete) return;
            
            showLoading(true);
            
            setTimeout(() => {
                try {
                    const userToDeleteObj = users.find(u => u.id === userToDelete);
                    
                    users = users.filter(u => u.id !== userToDelete);
                    sessions = sessions.filter(s => s.userId !== userToDelete);
                    requests = requests.filter(r => r.userId !== userToDelete);
                    logs = logs.filter(l => l.userId !== userToDelete);
                    promotions = promotions.filter(p => p.userId !== userToDelete);
                    
                    saveData();
                    
                    // إشعار بحذف موظف
                    if (currentUser && userToDeleteObj) {
                        showNotification(
                            'حذف موظف',
                            `قام ${currentUser.name} بحذف الموظف ${userToDeleteObj.name}`,
                            'user',
                            true
                        );
                    }
                    
                    updateAdminStats();
                    loadAdminUsersTable();
                    loadAdminAttendanceTable();
                    loadAdminRequestsTable();
                    loadReports();
                    
                    closeModal('deleteModal');
                    showToast('تم حذف الموظف بنجاح!', 'success');
                } catch (error) {
                    console.error('خطأ في تأكيد الحذف:', error);
                    showAlert('حدث خطأ في حذف الموظف', 'error');
                } finally {
                    showLoading(false);
                }
            }, 500);
        }

        // ===== دوال خاصة =====
        function showMainPage() {
            // التحقق من الصلاحيات أولاً
            if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager')) {
                // إذا كان لديه صلاحيات المدير، عرض لوحة المدير
                document.getElementById('userPanel').classList.add('hidden');
                document.getElementById('adminPanel').classList.remove('hidden');
                document.getElementById('mainPage').classList.add('hidden');
                updateAdminPanel();
                showToast('مرحباً بك في لوحة المدير', 'success');
            } else {
                // إذا لم يكن لديه صلاحيات، عرض رسالة
                alert('ليس لديك صلاحية للوصول إلى لوحة المدير');
                // البقاء في صفحة المستخدم العادي
                document.getElementById('userPanel').classList.remove('hidden');
                document.getElementById('adminPanel').classList.add('hidden');
                document.getElementById('mainPage').classList.add('hidden');
                updateUserPanel();
            }
        }

        // ===== البحث في الجداول =====
        document.getElementById('searchUsers')?.addEventListener('input', function(e) {
            loadAdminUsersTable();
        });
        
        document.getElementById('searchAttendance')?.addEventListener('input', function(e) {
            try {
                const searchTerm = e.target.value.toLowerCase();
                const rows = document.querySelectorAll('#adminAttendanceTable tr');
                
                rows.forEach(row => {
                    if (row.cells.length < 8) return;
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(searchTerm) ? '' : 'none';
                });
            } catch (error) {
                console.error('خطأ في البحث:', error);
            }
        });
 

        // ===== تهيئة النظام =====
        document.addEventListener('DOMContentLoaded', function() {
            try {
                loadData();
                initNotifications();
                
                const savedUser = localStorage.getItem('currentUser');
                if (savedUser) {
                    currentUser = JSON.parse(savedUser);
                    currentSession = sessions.find(s => s.userId === currentUser.id && !s.logoutTime);
                    
                    document.getElementById('mainPage').classList.add('hidden');
                    
                    if (currentUser.role === 'admin') {
                        document.getElementById('adminPanel').classList.remove('hidden');
                        updateAdminPanel();
                    } else {
                        document.getElementById('userPanel').classList.remove('hidden');
                        updateUserPanel();
                    }
                }
                
                // إعداد تواريخ الإجازة والاستقالة
                const today = new Date();
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                
                if (document.getElementById('leaveStartDate')) {
                    document.getElementById('leaveStartDate').valueAsDate = tomorrow;
                    document.getElementById('leaveStartDate').min = tomorrow.toISOString().split('T')[0];
                }
                
                if (document.getElementById('resignEndDate')) {
                    document.getElementById('resignEndDate').valueAsDate = tomorrow;
                    document.getElementById('resignEndDate').min = tomorrow.toISOString().split('T')[0];
                }
                
                // تحديث الوقت الحالي كل ثانية
                setInterval(updateCurrentTime, 1000);
                updateCurrentTime();
                
                // الوضع الليلي

            } catch (error) {
                console.error('خطأ في تهيئة النظام:', error);
            }
        });




        