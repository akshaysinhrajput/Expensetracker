// ===== PROFILE JS =====

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
    await requireAuth();
    initTheme();
    await loadProfile();
    await loadStats();
});

// ===== LOAD PROFILE =====
async function loadProfile() {
    const user = await getCurrentUser();
    if (!user) return;

    const name = user.user_metadata?.full_name || user.email.split('@')[0];
    const email = user.email;
    const avatar = name.charAt(0).toUpperCase();

    document.getElementById('profileName').textContent = name;
    document.getElementById('profileEmail').textContent = email;
    document.getElementById('profileAvatar').textContent = avatar;
    document.getElementById('newName').value = name;
}

// ===== LOAD STATS =====
async function loadStats() {
    const user = await getCurrentUser();
    if (!user) return;

    const { data: incomeData } = await supabaseClient
        .from('income')
        .select('amount')
        .eq('user_id', user.id);

    const { data: expenseData } = await supabaseClient
        .from('expenses')
        .select('amount')
        .eq('user_id', user.id);

    const totalIncome = (incomeData || []).reduce((sum, r) => sum + Number(r.amount), 0);
    const totalExpense = (expenseData || []).reduce((sum, r) => sum + Number(r.amount), 0);
    const balance = totalIncome - totalExpense;

    document.getElementById('profileIncome').textContent = `₹ ${formatAmount(totalIncome)}`;
    document.getElementById('profileExpense').textContent = `₹ ${formatAmount(totalExpense)}`;
    document.getElementById('profileBalance').textContent = `₹ ${formatAmount(balance)}`;
    document.getElementById('profileBalance').className =
        `profile-stat-value ${balance >= 0 ? 'text-green' : 'text-red'}`;
}

// ===== UPDATE NAME =====
async function updateName() {
    const btn = document.getElementById('nameBtn');
    const loader = document.getElementById('nameLoader');
    const newName = document.getElementById('newName').value.trim();

    if (!newName) {
        showToast('Name is required', 'error');
        return;
    }

    btn.disabled = true;
    loader.style.display = 'inline-block';

    try {
        const { error } = await supabaseClient.auth.updateUser({
            data: { full_name: newName }
        });

        if (error) {
            showToast(error.message, 'error');
            return;
        }

        showToast('Name updated successfully!', 'success');
        await loadProfile();

    } catch (err) {
        console.error(err);
        showToast('Something went wrong', 'error');
    } finally {
        btn.disabled = false;
        loader.style.display = 'none';
    }
}

// ===== UPDATE PASSWORD =====
async function updatePassword() {
    const btn = document.getElementById('passBtn');
    const loader = document.getElementById('passLoader');
    const newPassword = document.getElementById('newPassword').value;

    if (!newPassword) {
        showToast('Password is required', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    btn.disabled = true;
    loader.style.display = 'inline-block';

    try {
        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (error) {
            showToast(error.message, 'error');
            return;
        }

        showToast('Password updated successfully!', 'success');
        document.getElementById('newPassword').value = '';

    } catch (err) {
        console.error(err);
        showToast('Something went wrong', 'error');
    } finally {
        btn.disabled = false;
        loader.style.display = 'none';
    }
}

// ===== PASSWORD TOGGLE =====
function togglePassword() {
    const input = document.getElementById('newPassword');
    const icon = document.getElementById('eyeIcon');

    if (input.type === 'password') {
        input.type = 'text';
        icon.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
        `;
    } else {
        input.type = 'password';
        icon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
        `;
    }
}

// ===== FORMAT AMOUNT =====
function formatAmount(amount) {
    return new Intl.NumberFormat('en-IN').format(amount);
}