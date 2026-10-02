// =============================================================================
// Expense & Budget Visualizer — app.js
// Zero-dependency, vanilla JavaScript. No frameworks, no build tools.
// =============================================================================

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const EBV_EXPENSES_KEY = 'ebv_expenses';
const EBV_BUDGET_KEY = 'ebv_budget';

/** 12-color palette for pie chart slices (cycles if more categories exist). */
const PALETTE = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2',
  '#59a14f', '#edc948', '#b07aa1', '#ff9da7',
  '#9c755f', '#bab0ac', '#d37295', '#a0cbe8'
];

// -----------------------------------------------------------------------------
// Application State
// -----------------------------------------------------------------------------

const state = {
  expenses: [], // Array of { id, name, amount, category }
  budget: null, // number | null
  sorting: "id", //id, name, amount, category
};

function myFunction() {
   var element = document.body;
   element.classList.toggle("dark-mode");
}
// -----------------------------------------------------------------------------
// Persistence Layer  (saveState, loadState, showPersistenceError)
// -----------------------------------------------------------------------------

/**
 * Renders a dismissible error banner when localStorage is unavailable.
 * The app continues operating with in-memory state only (session-only mode).
 */
function showPersistenceError() {
  const banner = document.getElementById('persistence-error');
  if (!banner) return;
  // Only show once — avoid duplicate banners on repeated failures
  if (!banner.classList.contains('hidden')) return;
  banner.innerHTML =
    '<span>⚠️ Storage is unavailable. Your data will not be saved between page reloads.</span>' +
    '<button class="dismiss-btn" aria-label="Dismiss storage warning">Dismiss</button>';
  banner.classList.remove('hidden');
  banner.querySelector('.dismiss-btn').addEventListener('click', () => {
    banner.classList.add('hidden');
  });
}

/**
 * Persists the current in-memory state to localStorage.
 * On failure (SecurityError, QuotaExceededError, etc.) shows the error banner
 * and continues — the app keeps working in session-only mode.
 */
function saveState() {
  try {
    localStorage.setItem(EBV_EXPENSES_KEY, JSON.stringify(state.expenses));
    if (state.budget !== null) {
      localStorage.setItem(EBV_BUDGET_KEY, String(state.budget));
    } else {
      localStorage.removeItem(EBV_BUDGET_KEY);
    }
  } catch (e) {
    showPersistenceError();
  }
}

/**
 * Reads persisted state from localStorage and populates the in-memory state.
 * On any failure (SecurityError, JSON parse error, etc.) resets to empty state
 * and shows the error banner.
 */
function loadState() {
  try {
    const rawExpenses = localStorage.getItem(EBV_EXPENSES_KEY);
    state.expenses = rawExpenses ? JSON.parse(rawExpenses) : [];
    const rawBudget = localStorage.getItem(EBV_BUDGET_KEY);
    state.budget = rawBudget !== null ? Number(rawBudget) : null;
  } catch (e) {
    state.expenses = [];
    state.budget = null;
    showPersistenceError();
  }
}

// -----------------------------------------------------------------------------
// State Mutations  (validateEntry, addExpense, deleteExpense,
//                   validateBudget, setBudget, computeBalance)
// -----------------------------------------------------------------------------

/**
 * Validates the three expense form fields.
 * @param {string} name
 * @param {string|number} amount
 * @param {string} category
 * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
 */
function validateEntry(name, amount, category) {
  const errors = {};

  if (!name || name.trim().length === 0) {
    errors.name = 'Item name is required.';
  }
  if (!isFinite(amount) || Number(amount) <= 0) {
    errors.amount = 'Amount must be a positive number.';
  }
  if (!category || category.trim().length === 0) {
    errors.category = 'Category is required.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Pushes a new expense entry onto `state.expenses`.
 * Assumes the caller has already validated the inputs via `validateEntry`.
 * @param {string} name
 * @param {string|number} amount
 * @param {string} category
 */
function addExpense(name, amount, category) {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Date.now().toString();

  state.expenses.push({
    id,
    name: name.trim(),
    amount: Number(amount),
    category: category.trim()
  });
}

/**
 * Removes the expense with the given id from state.expenses.
 * @param {string} id - The id of the expense to remove.
 */
function deleteExpense(id) {
  state.expenses = state.expenses.filter(e => e.id !== id);
}

/**
 * Validates a budget input value.
 * @param {*} value - The raw input value to validate.
 * @returns {{ valid: boolean }}
 */
function validateBudget(value) {
  const num = Number(value);
  return { valid: isFinite(num) && num > 0 };
}

/**
 * Sets the budget to the given numeric value.
 * Assumes the caller has already validated the input via `validateBudget`.
 * @param {*} value - A valid positive numeric value.
 */
function setBudget(value) {
  state.budget = Number(value);
}

function setSorting(value) {
  state.sorting = String(value);
}

// -----------------------------------------------------------------------------
// UI Renderers  (formatCurrency, renderBalance, renderTransactionList,
//                renderProgressIndicator, renderPieChart)
// -----------------------------------------------------------------------------

/**
 * Formats a numeric value as Indonesian Rupiah currency.
 * Example: 1234 → "Rp 1.234"
 * @param {number} value
 * @returns {string}
 */
function formatCurrency(value) {
  return value.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
}

/**
 * Computes the total balance from all expenses and updates the #balance element.
 * @param {Array} expenses
 */
function renderBalance(expenses) {
  const el = document.getElementById('balance');
  let balance = state.budget;
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  balance = balance - total;
  if (balance < 0) {
    el.style = "color:red;";
  } else {
    el.style = "color:black";
  }
  if (el) el.textContent = formatCurrency(balance);
}

/**
 * Clears and repopulates the #transaction-list with one <li> per expense.
 * Shows a placeholder message when the list is empty.
 * @param {Array} expenses
 */
function renderTransactionList(expenses) {
  const list = document.getElementById('transaction-list');
  if (!list) return;

  list.innerHTML = '';

  if (expenses.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-list-msg';
    empty.textContent = 'No transactions yet.';
    list.appendChild(empty);
    return;
  }

  let sorted = expenses

  if (state.sorting == 'amount') {
    sorted = sorted.sort((a, b) => a.amount - b.amount)
  } else if (state.sorting == 'category') {
    sorted = sorted.sort((a, b) => {
      const nameA = a.name.toUpperCase(); // ignore upper and lowercase
      const nameB = b.name.toUpperCase(); // ignore upper and lowercase
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      // names must be equal
      return 0;
    })
  }

  sorted.forEach(expense => {
    const li = document.createElement('li');
    li.innerHTML =
      '<div class="transaction-info">' +
      '<span class="transaction-name">' + escapeHTML(expense.name) + '</span>' +
      '<span class="transaction-category">' + escapeHTML(expense.category) + '</span>' +
      '</div>' +
      '<span class="transaction-amount">' + formatCurrency(expense.amount) + '</span>' +
      '<button class="delete-btn" data-id="' + expense.id + '" aria-label="Delete ' + escapeHTML(expense.name) + '">\u2715</button>';
    list.appendChild(li);
  });
}

/**
 * Escapes special HTML characters to prevent XSS when injecting user data via innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Updates the progress bar fill, state class, label, and ARIA attributes.
 * @param {number} balance - Current total spending.
 * @param {number|null} budget - The budget limit, or null if not set.
 */
function renderProgressIndicator(balance, budget) {
  const fill = document.getElementById('progress-bar-fill');
  const label = document.getElementById('progress-label');
  const track = document.querySelector('.progress-bar-track');

  if (!fill || !label) return;

  const stateClasses = ['state-safe', 'state-warning', 'state-exceeded', 'state-neutral'];

  if (budget === null) {
    fill.style.width = '0%';
    label.textContent = 'No budget set';
    stateClasses.forEach(c => fill.classList.remove(c));
    fill.classList.add('state-neutral');
    if (track) track.setAttribute('aria-valuenow', '0');
    return;
  }

  const ratio = balance / budget;
  const pct = Math.min(ratio * 100, 100);

  fill.style.width = pct.toFixed(1) + '%';
  label.textContent = (ratio * 100).toFixed(1) + '%';

  stateClasses.forEach(c => fill.classList.remove(c));
  if (ratio >= 1.0) {
    fill.classList.add('state-exceeded');
  } else if (ratio > 0.8) {
    fill.classList.add('state-warning');
  } else {
    fill.classList.add('state-safe');
  }

  if (track) track.setAttribute('aria-valuenow', pct.toFixed(1));
}

/**
 * Draws a pie chart on #pie-chart using the Canvas 2D API and updates #pie-legend.
 * Uses PALETTE colors, cycling if there are more categories than palette entries.
 * @param {Array} expenses
 */
function renderPieChart(expenses) {
  const canvas = document.getElementById('pie-chart');
  const legend = document.getElementById('pie-legend');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) * 0.85;

  ctx.clearRect(0, 0, width, height);

  if (legend) legend.innerHTML = '';

  if (expenses.length === 0) {
    // Placeholder circle with "No data" label
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#e5e7eb';
    ctx.fill();

    ctx.fillStyle = '#6b7280';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No data', cx, cy);
    return;
  }

  // Group expenses by category
  const categoryMap = {};
  expenses.forEach(e => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
  });

  const categories = Object.keys(categoryMap);
  const grandTotal = categories.reduce((sum, cat) => sum + categoryMap[cat], 0);

  let currentAngle = -Math.PI / 2; // start at top

  categories.forEach((cat, i) => {
    const color = PALETTE[i % PALETTE.length];
    const sliceAngle = (categoryMap[cat] / grandTotal) * 2 * Math.PI;
    const endAngle = currentAngle + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, currentAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    currentAngle = endAngle;

    // Legend entry
    if (legend) {
      const li = document.createElement('li');
      li.innerHTML =
        '<span class="legend-swatch" style="background-color:' + color + '"></span>' +
        '<span class="legend-label">' + escapeHTML(cat) + '</span>';
      legend.appendChild(li);
    }
  });
}

// -----------------------------------------------------------------------------
// Render Orchestration  (renderAll)
// -----------------------------------------------------------------------------

function computeBalance(expenses) {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

function renderAll() {
  renderTransactionList(state.expenses);
  renderBalance(state.expenses);
  renderProgressIndicator(computeBalance(state.expenses), state.budget);
  renderPieChart(state.expenses);
}

// -----------------------------------------------------------------------------
// Event Binding  (bindEvents)
// -----------------------------------------------------------------------------

function bindEvents() {
  // ── 7.3: Expense form submission ───────────────────────────────────────────
  const form = document.getElementById('expense-form');
  const inputName = document.getElementById('input-name');
  const inputAmount = document.getElementById('input-amount');
  const inputCategory = document.getElementById('input-category');
  const errorName = document.getElementById('error-name');
  const errorAmount = document.getElementById('error-amount');
  const errorCategory = document.getElementById('error-category');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const name = inputName ? inputName.value : '';
      const amount = inputAmount ? inputAmount.value : '';
      const category = inputCategory ? inputCategory.value : '';

      const { valid, errors } = validateEntry(name, amount, category);

      // Show or clear inline errors
      if (errorName) errorName.textContent = errors.name || '';
      if (errorAmount) errorAmount.textContent = errors.amount || '';
      if (errorCategory) errorCategory.textContent = errors.category || '';

      if (!valid) return;

      addExpense(name, amount, category);
      saveState();
      renderAll();

      // Reset form fields
      if (inputName) inputName.value = '';
      if (inputAmount) inputAmount.value = '';
      if (inputCategory) inputCategory.value = '';
    });
  }

  // Clear each field's error as the user types
  if (inputName && errorName) {
    inputName.addEventListener('input', function () { errorName.textContent = ''; });
  }
  if (inputAmount && errorAmount) {
    inputAmount.addEventListener('input', function () { errorAmount.textContent = ''; });
  }
  if (inputCategory && errorCategory) {
    inputCategory.addEventListener('input', function () { errorCategory.textContent = ''; });
  }

  // ── 7.4: Delete via event delegation ───────────────────────────────────────
  const transactionList = document.getElementById('transaction-list');
  if (transactionList) {
    transactionList.addEventListener('click', function (e) {
      const btn = e.target.closest('.delete-btn');
      if (!btn) return;
      const id = btn.dataset.id;
      if (!id) return;
      deleteExpense(id);
      saveState();
      renderAll();
    });
  }


  // ── 7.4: Budget control ────────────────────────────────────────────────────
  const budgetBtn = document.getElementById('budget-btn');
  const budgetInput = document.getElementById('budget-input');
  const errorBudget = document.getElementById('error-budget');

  if (budgetBtn) {
    budgetBtn.addEventListener('click', function () {
      const value = budgetInput ? budgetInput.value : '';
      const { valid } = validateBudget(value);

      if (!valid) {
        if (errorBudget) errorBudget.textContent = 'Budget must be a positive number.';
        return;
      }

      if (errorBudget) errorBudget.textContent = '';
      setBudget(value);
      saveState();
      renderAll();
      if (budgetInput) budgetInput.value = '';
    });
  }
}

const sortCategoryBtn = document.getElementById('sort-by-category');
const sortAmountBtn = document.getElementById('sort-by-amount');

if (sortAmountBtn) {
  sortAmountBtn.addEventListener('click', function () {
    setSorting('amount')
    saveState();
    renderAll();
  })
}

if (sortCategoryBtn) {
  sortCategoryBtn.addEventListener('click', function () {
    setSorting('category')
    saveState();
    renderAll();
  })
}



// -----------------------------------------------------------------------------
// Initialization
// -----------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', function () {
  loadState();
  bindEvents();
  renderAll();
});
