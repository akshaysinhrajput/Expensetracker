// ===== ADD EXPENSE JS =====

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
    await requireAuth();
    initTheme();
    setTodayDate();
});

// ===== SET TODAY DATE =====
function setTodayDate() {
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
}

// ===== SHOW FILE NAME =====
function showFileName() {
    const file = document.getElementById('file').files[0];
    const el = document.getElementById('fileName');
    if (file && el) {
        el.textContent = `📎 ${file.name}`;
    }
}

// ===== ADD EXPENSE =====
async function addExpense() {
    const btn = document.getElementById('submitBtn');
    const loader = document.getElementById('loader');

    // Get values
    const amount = document.getElementById('amount').value.replace(/,/g, "");
    const date = document.getElementById('date').value;
    const category = document.getElementById('category').value;
    const account = document.getElementById('account').value;
    const note = document.getElementById('note').value;
    const description = document.getElementById('description').value;
    const file = document.getElementById('file').files[0];
    const is_recurring = document.getElementById('recurring').checked;

    // ===== VALIDATION =====
    if (!amount || Number(amount) <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    if (!date) {
        showToast('Date is required', 'error');
        return;
    }

    if (!category) {
        showToast('Category is required', 'error');
        return;
    }

    if (!account) {
        showToast('Account is required', 'error');
        return;
    }

    btn.disabled = true;
    loader.style.display = 'inline-block';

    try {
        const user = await getCurrentUser();
        if (!user) return;

        let attachment_url = null;

        // ===== FILE UPLOAD =====
        if (file) {
            const cleanName = file.name.replace(/\s+/g, '-');
            const fileName = `${user.id}/${Date.now()}-${cleanName}`;

            const { error: uploadError } = await supabaseClient.storage
                .from('expense-files')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                showToast('File upload failed', 'error');
                return;
            }

            const { data: urlData } = supabaseClient.storage
                .from('expense-files')
                .getPublicUrl(fileName);

            attachment_url = urlData.publicUrl;
        }

        // ===== INSERT =====
        const { error } = await supabaseClient
            .from('expenses')
            .insert([{
                user_id: user.id,
                amount: Number(amount),
                date,
                category,
                account,
                note,
                description,
                attachment_url,
                is_recurring
            }]);

        if (error) {
            showToast(error.message, 'error');
            return;
        }

        // ===== RECURRING NOTIFICATION =====
        if (is_recurring) {
            await createRecurringNotification(user.id, category, Number(amount), date);
        }

        showToast('Expense added successfully!', 'success');

        // Reset form
        document.getElementById('amount').value = '';
        document.getElementById('category').value = '';
        document.getElementById('account').value = '';
        document.getElementById('note').value = '';
        document.getElementById('description').value = '';
        document.getElementById('file').value = '';
        document.getElementById('fileName').textContent = '📎 Click to upload file';
        document.getElementById('recurring').checked = false;
        setTodayDate();

        // Redirect
        setTimeout(() => {
            window.location.href = '/pages/dashboard.html';
        }, 1500);

    } catch (err) {
        console.error(err);
        showToast('Something went wrong', 'error');
    } finally {
        btn.disabled = false;
        loader.style.display = 'none';
    }
}

// ===== CREATE RECURRING NOTIFICATION =====
async function createRecurringNotification(user_id, category, amount, date) {
    try {
        const expenseDate = new Date(date);
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        const currentMonth = months[expenseDate.getMonth()];
        const nextMonth = months[(expenseDate.getMonth() + 1) % 12];

        await supabaseClient
            .from('notifications')
            .insert([{
                user_id,
                title: 'Recurring Expense Reminder',
                message: `You paid ₹${amount} for ${category} in ${currentMonth}. Don't forget to pay for ${nextMonth}!`,
                amount,
                category,
                month: nextMonth,
                is_read: false
            }]);

    } catch (err) {
        console.error('Notification error:', err);
    }
}