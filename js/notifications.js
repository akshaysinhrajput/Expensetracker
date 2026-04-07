// ===== NOTIFICATIONS JS =====

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
    await requireAuth();
    initTheme();
    await loadNotifications();
});

// ===== LOAD NOTIFICATIONS =====
async function loadNotifications() {
    const user = await getCurrentUser();
    if (!user) return;

    const { data: notifications, error } = await supabaseClient
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        showToast(error.message, 'error');
        return;
    }

    // Update sidebar badge
    const unreadCount = (notifications || []).filter(n => !n.is_read).length;
    const badge = document.getElementById('notifCount');
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'block' : 'none';
    }

    renderNotifications(notifications || []);
}

// ===== RENDER NOTIFICATIONS =====
function renderNotifications(notifications) {
    const container = document.getElementById('notificationsList');

    if (!notifications.length) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No notifications yet</p>
            </div>`;
        return;
    }

    container.innerHTML = notifications.map(n => {
        const isIncome = n.title.toLowerCase().includes('income');
        const iconType = isIncome ? 'income' : 'expense';
        const iconName = isIncome ? 'trending-up' : 'trending-down';

        return `
            <div class="notif-card ${n.is_read ? '' : 'unread'}"
                onclick="markRead('${n.id}')">
                <div class="notif-icon ${iconType}">
                    <i data-lucide="${iconName}"></i>
                </div>
                <div class="notif-content">
                    <div class="notif-title">${n.title}</div>
                    <div class="notif-message">${n.message}</div>
                    <div class="notif-meta">
                        <span class="notif-time">${formatTime(n.created_at)}</span>
                        ${n.amount ? `<span class="notif-amount">₹ ${formatAmount(n.amount)}</span>` : ''}
                    </div>
                </div>
                <div class="notif-actions">
                    ${!n.is_read ? '<div class="notif-unread-dot"></div>' : ''}
                    <button class="notif-delete-btn" onclick="deleteNotification(event, '${n.id}')">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

// ===== MARK READ =====
async function markRead(id) {
    await supabaseClient
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

    await loadNotifications();
}

// ===== MARK ALL READ =====
async function markAllRead() {
    const user = await getCurrentUser();
    if (!user) return;

    await supabaseClient
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

    showToast('All notifications marked as read!', 'success');
    await loadNotifications();
}

// ===== DELETE NOTIFICATION =====
async function deleteNotification(event, id) {
    event.stopPropagation();

    const { error } = await supabaseClient
        .from('notifications')
        .delete()
        .eq('id', id);

    if (error) {
        showToast(error.message, 'error');
        return;
    }

    showToast('Notification deleted!', 'success');
    await loadNotifications();
}

// ===== FORMAT TIME =====
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ===== FORMAT AMOUNT =====
function formatAmount(amount) {
    return new Intl.NumberFormat('en-IN').format(amount);
}