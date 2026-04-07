// ===== SETTINGS JS =====

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
    await requireAuth();
    initTheme();
    loadThemeSwitch();
    loadCurrency();
});

// ===== LOAD THEME SWITCH =====
function loadThemeSwitch() {
    const theme = localStorage.getItem('theme') || 'dark';
    const switchEl = document.getElementById('themeSwitch');
    const label = document.getElementById('themeLabel');

    if (theme === 'light') {
        switchEl.classList.add('active');
        label.textContent = 'Light';
    } else {
        switchEl.classList.remove('active');
        label.textContent = 'Dark';
    }
}

// ===== TOGGLE THEME SWITCH =====
function toggleThemeSwitch() {
    const switchEl = document.getElementById('themeSwitch');
    const label = document.getElementById('themeLabel');
    const current = localStorage.getItem('theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';

    applyTheme(next);
    updateThemeIcon(next);

    if (next === 'light') {
        switchEl.classList.add('active');
        label.textContent = 'Light';
    } else {
        switchEl.classList.remove('active');
        label.textContent = 'Dark';
    }
}

// ===== LOAD CURRENCY =====
function loadCurrency() {
    const currency = localStorage.getItem('currency') || 'INR';
    document.getElementById('currencySelect').value = currency;
}

// ===== SAVE CURRENCY =====
function saveCurrency() {
    const currency = document.getElementById('currencySelect').value;
    localStorage.setItem('currency', currency);
    showToast(`Currency set to ${currency}!`, 'success');
}

// ===== EXPORT ALL DATA =====
async function exportAllData() {
    const user = await getCurrentUser();
    if (!user) return;

    try {
        // Fetch income
        const { data: incomeData } = await supabaseClient
            .from('income')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });

        // Fetch expenses
        const { data: expenseData } = await supabaseClient
            .from('expenses')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });

        const income = (incomeData || []).map(r => ({
            Date: r.date,
            Type: 'Income',
            Category: r.category,
            Account: r.account,
            Amount: r.amount,
            Month: r.income_month,
            Note: r.note || '',
            Recurring: r.is_recurring ? 'Yes' : 'No'
        }));

        const expenses = (expenseData || []).map(r => ({
            Date: r.date,
            Type: 'Expense',
            Category: r.category,
            Account: r.account,
            Amount: r.amount,
            Month: '',
            Note: r.note || '',
            Recurring: r.is_recurring ? 'Yes' : 'No'
        }));

        const all = [...income, ...expenses]
            .sort((a, b) => new Date(b.Date) - new Date(a.Date));

        if (!all.length) {
            showToast('No data to export', 'error');
            return;
        }

        const headers = Object.keys(all[0]);
        const rows = all.map(r => Object.values(r));

        const csvContent = [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expensetrack-data-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        showToast('Data exported successfully!', 'success');

    } catch (err) {
        console.error(err);
        showToast('Export failed', 'error');
    }
}