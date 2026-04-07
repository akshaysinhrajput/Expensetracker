// ===== BUDGET JS =====

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
    await requireAuth();
    initTheme();
    setupYears();
    setCurrentMonth();
    await loadBudget();
});

// ===== SETUP YEARS =====
function setupYears() {
    const select = document.getElementById('budgetYear');
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 3; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        select.appendChild(opt);
    }
}

// ===== SET CURRENT MONTH =====
function setCurrentMonth() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = months[new Date().getMonth()];
    document.getElementById('budgetMonth').value = currentMonth;
}

// ===== ADD BUDGET =====
async function addBudget() {
    const btn = document.getElementById('budgetBtn');
    const loader = document.getElementById('budgetLoader');

    const category = document.getElementById('budgetCategory').value;
    const amount = document.getElementById('budgetAmount').value.replace(/,/g, "");;
    const month = document.getElementById('budgetMonth').value;
    const year = document.getElementById('budgetYear').value;

    if (!category) {
        showToast('Please select a category', 'error');
        return;
    }

    if (!amount || Number(amount) <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    btn.disabled = true;
    loader.style.display = 'inline-block';

    try {
        const user = await getCurrentUser();
        if (!user) return;

        // Check if budget already exists for this category + month + year
        const { data: existing } = await supabaseClient
            .from('budget')
            .select('id')
            .eq('user_id', user.id)
            .eq('category', category)
            .eq('month', month)
            .eq('year', Number(year));

        if (existing && existing.length > 0) {
            // Update existing
            const { error } = await supabaseClient
                .from('budget')
                .update({ limit_amount: Number(amount) })
                .eq('id', existing[0].id);

            if (error) {
                showToast(error.message, 'error');
                return;
            }

            showToast('Budget updated!', 'success');
        } else {
            // Insert new
            const { error } = await supabaseClient
                .from('budget')
                .insert([{
                    user_id: user.id,
                    category,
                    month,
                    year: Number(year),
                    limit_amount: Number(amount)
                }]);

            if (error) {
                showToast(error.message, 'error');
                return;
            }

            showToast('Budget added!', 'success');
        }

        // Reset form
        document.getElementById('budgetCategory').value = '';
        document.getElementById('budgetAmount').value = '';

        await loadBudget();

    } catch (err) {
        console.error(err);
        showToast('Something went wrong', 'error');
    } finally {
        btn.disabled = false;
        loader.style.display = 'none';
    }
}

// ===== LOAD BUDGET =====
async function loadBudget() {
    const user = await getCurrentUser();
    if (!user) return;

    const month = document.getElementById('budgetMonth').value;
    const year = document.getElementById('budgetYear').value;

    // Fetch budgets
    const { data: budgets } = await supabaseClient
        .from('budget')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', month)
        .eq('year', Number(year));

    if (!budgets || !budgets.length) {
        document.getElementById('budgetList').innerHTML = `
            <div class="empty-state">
                <p>No budgets set for ${month} ${year}</p>
            </div>`;
        return;
    }

    // Fetch expenses for this month
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthIdx = months.indexOf(month);
    const monthNum = String(monthIdx + 1).padStart(2, '0');
    const dateFrom = `${year}-${monthNum}-01`;
    const lastDay = new Date(year, monthIdx + 1, 0).getDate();
    const dateTo = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;

    const { data: expenses } = await supabaseClient
        .from('expenses')
        .select('amount, category')
        .eq('user_id', user.id)
        .gte('date', dateFrom)
        .lte('date', dateTo);

    // Group expenses by category
    const expenseByCategory = {};
    (expenses || []).forEach(e => {
        expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + Number(e.amount);
    });

    // Render
    const container = document.getElementById('budgetList');
    container.innerHTML = budgets.map(b => {
        const spent = expenseByCategory[b.category] || 0;
        const limit = Number(b.limit_amount);
        const percent = Math.min((spent / limit) * 100, 100);
        const remaining = limit - spent;
        const exceeded = spent > limit;

        let fillClass = 'safe';
        if (percent >= 100) fillClass = 'danger';
        else if (percent >= 75) fillClass = 'warning';

        const categoryIcons = {
            Food: '🍔', Transport: '🚗', Shopping: '🛍️',
            Bills: '📄', Rent: '🏠', Health: '💊',
            Education: '📚', Entertainment: '🎮',
            Groceries: '🛒', Other: '📦'
        };

        return `
            <div class="budget-card">
                <div class="budget-card-header">
                    <div class="budget-card-left">
                        <div class="budget-category-icon">
                            ${categoryIcons[b.category] || '📦'}
                        </div>
                        <span class="budget-category-name">${b.category}</span>
                    </div>
                    <div class="budget-card-right">
                        <div class="budget-amounts">
                            <div class="budget-spent">₹ ${formatAmount(spent)}</div>
                            <div class="budget-limit">of ₹ ${formatAmount(limit)}</div>
                        </div>
                        <button class="budget-delete-btn" onclick="deleteBudget('${b.id}')">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </div>

                <div class="budget-progress-bar">
                    <div class="budget-progress-fill ${fillClass}"
                        style="width: ${percent}%">
                    </div>
                </div>

                <div class="budget-progress-info">
                    <span class="budget-percent ${fillClass === 'danger' ? 'text-red' : fillClass === 'warning' ? 'text-warning' : 'text-green'}">
                        ${Math.round(percent)}% used
                    </span>
                    <span class="budget-remaining">
                        ${exceeded ? 'Exceeded by ₹ ' + formatAmount(Math.abs(remaining)) : '₹ ' + formatAmount(remaining) + ' remaining'}
                    </span>
                </div>

                ${exceeded ? `
                <div class="budget-exceeded">
                    <i data-lucide="alert-triangle"></i>
                    Budget exceeded! You spent ₹ ${formatAmount(spent - limit)} more than planned.
                </div>` : ''}
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

// ===== DELETE BUDGET =====
async function deleteBudget(id) {
    const { error } = await supabaseClient
        .from('budget')
        .delete()
        .eq('id', id);

    if (error) {
        showToast(error.message, 'error');
        return;
    }

    showToast('Budget deleted!', 'success');
    await loadBudget();
}

// ===== FORMAT AMOUNT =====
function formatAmount(amount) {
    return new Intl.NumberFormat('en-IN').format(amount);
}