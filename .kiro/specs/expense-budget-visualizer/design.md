# Design Document

## Feature: Expense & Budget Visualizer



---

## Overview

A single-page, zero-dependency web application delivered as a small set of static files (or a single HTML file). All application state lives in browser `localStorage`. The architecture is a straightforward **data → render** pipeline: every mutation to state immediately persists to `localStorage` and then triggers a full UI re-render of every component in one synchronous pass.

No build tooling, no module bundler, no framework. Plain HTML, CSS, and Vanilla JavaScript.

---

## Architecture

### High-Level Structure

```
index.html          ← markup skeleton + link to styles and script
styles.css          ← all visual styling, CSS custom properties, responsive layout
app.js              ← entire application logic (< 600 lines)
```

Three logical layers inside `app.js`:

```
┌─────────────────────────────────────┐
│           UI Layer                  │  DOM manipulation, event listeners
│  renderAll()  renderChart()  etc.   │
├─────────────────────────────────────┤
│           State Layer               │  Pure functions: add, delete, validate
│  addExpense()  deleteExpense()      │
│  setBudget()   validateEntry()      │
├─────────────────────────────────────┤
│        Persistence Layer            │  localStorage read/write wrappers
│  loadState()   saveState()          │
└─────────────────────────────────────┘
```

Data flows in one direction:

```
User Action → State Mutation → Persist to localStorage → renderAll()
```

`renderAll()` is the single orchestration function that calls every component renderer in sequence, keeping all parts of the UI in sync.

---

## Data Model

### AppState (in-memory object)

```javascript
const state = {
  expenses: [
    // { id: string, name: string, amount: number, category: string }
  ],
  budget: null  // number | null
};
```

### LocalStorage Schema

| Key | Value | Description |
|-----|-------|-------------|
| `ebv_expenses` | JSON array of expense objects | All expense entries |
| `ebv_budget` | JSON number as string, or absent | Budget limit |

Each expense object:

```javascript
{
  id: string,       // crypto.randomUUID() or Date.now() fallback
  name: string,     // non-empty, trimmed
  amount: number,   // positive float
  category: string  // non-empty, trimmed
}
```

---

## Components

### 1. Expense Form

**Markup:** A `<form id="expense-form">` with three `<input>` elements and a submit `<button>`.

**Behavior:**
- Listens to `submit` event (prevents default).
- Calls `validateEntry(name, amount, category)` which returns an object `{ valid: boolean, errors: { name?, amount?, category? } }`.
- On validation failure: injects inline error `<span>` elements beneath each failing field.
- On success: calls `addExpense(name, amount, category)` → `saveState()` → `renderAll()` → resets the form.

**Validation rules:**
- `name`: `name.trim().length > 0`
- `amount`: `isFinite(value) && Number(value) > 0`
- `category`: `category.trim().length > 0`

### 2. Transaction List

**Markup:** `<ul id="transaction-list">` inside a `<div class="list-container">` with `overflow-y: auto; max-height: <vh-based value>`.

**Behavior:**
- `renderTransactionList(expenses)` clears and re-populates the `<ul>`.
- Each `<li>` shows name, formatted amount, category, and a `<button class="delete-btn">` with `data-id` attribute.
- The container listens for click events via delegation; identifies the entry by `data-id`, calls `deleteExpense(id)` → `saveState()` → `renderAll()`.

### 3. Balance Display

**Markup:** `<span id="balance">` inside a header section.

**Behavior:**
- `renderBalance(expenses)` computes `expenses.reduce((sum, e) => sum + e.amount, 0)` and formats it with `formatCurrency(value)`.
- `formatCurrency(value)` returns a string like `Rp 1.234` using `toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })` — no external library needed. IDR uses no decimal places by default.

### 4. Budget Limit Control

**Markup:** `<input id="budget-input" type="number">` with a `<button>Set Budget</button>` and a `<span class="error-msg">` for inline errors.

**Behavior:**
- On button click, reads the input value and calls `validateBudget(value)`.
- Valid: calls `setBudget(value)` → `saveState()` → `renderAll()`.
- Invalid: shows inline error; `state.budget` remains unchanged.

### 5. Progress Indicator

**Markup:** `<div class="progress-bar-track"><div id="progress-bar-fill"></div></div>` and `<span id="progress-label">`.

**Behavior:**
- `renderProgressIndicator(balance, budget)`:
  - If `budget` is `null`: sets fill width to `0%`, label to `No budget set`, applies class `state-neutral`.
  - Otherwise: computes `ratio = balance / budget`. Sets fill width to `Math.min(ratio * 100, 100).toFixed(1) + '%'`.
  - Applies CSS class based on threshold: `state-safe` (≤ 80%), `state-warning` (> 80% and < 100%), `state-exceeded` (≥ 100%).
  - Label shows `ratio * 100` rounded to one decimal place followed by `%`.

### 6. Category Pie Chart

**Markup:** `<canvas id="pie-chart" width="300" height="300">` and `<ul id="pie-legend">`.

**Behavior:**
- `renderPieChart(expenses)`:
  - Groups expenses by category, sums amounts per category.
  - If no expenses: draws a placeholder circle with a centered "No data" text label.
  - Otherwise: computes arc angles, draws filled arcs on the 2D canvas context using `ctx.arc()`.
  - Assigns colors from a fixed palette array (cycles if more categories than palette entries).
  - Updates `<ul id="pie-legend">` with one `<li>` per category: colored swatch + category name.
- No third-party charting libraries. Pure Canvas 2D API only.

**Color Palette (12 distinct colors):**

```javascript
const PALETTE = [
  '#4e79a7','#f28e2b','#e15759','#76b7b2',
  '#59a14f','#edc948','#b07aa1','#ff9da7',
  '#9c755f','#bab0ac','#d37295','#a0cbe8'
];
```

**Arc calculation:**

```javascript
// For each category slice:
const startAngle = currentAngle;
const sliceAngle = (categoryTotal / grandTotal) * 2 * Math.PI;
const endAngle = startAngle + sliceAngle;
ctx.beginPath();
ctx.moveTo(cx, cy);
ctx.arc(cx, cy, radius, startAngle, endAngle);
ctx.closePath();
ctx.fillStyle = color;
ctx.fill();
currentAngle = endAngle;
```

### 7. Persistence Layer

```javascript
function saveState() {
  try {
    localStorage.setItem('ebv_expenses', JSON.stringify(state.expenses));
    if (state.budget !== null) {
      localStorage.setItem('ebv_budget', String(state.budget));
    } else {
      localStorage.removeItem('ebv_budget');
    }
  } catch (e) {
    showPersistenceError();
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem('ebv_expenses');
    state.expenses = raw ? JSON.parse(raw) : [];
    const budget = localStorage.getItem('ebv_budget');
    state.budget = budget !== null ? Number(budget) : null;
  } catch (e) {
    state.expenses = [];
    state.budget = null;
    showPersistenceError();
  }
}
```

If `localStorage` is unavailable (throws `SecurityError` or is undefined), `showPersistenceError()` renders a dismissible banner and the app operates in session-only mode with an in-memory state.

### 8. Render Orchestration

```javascript
function renderAll() {
  renderTransactionList(state.expenses);
  renderBalance(state.expenses);
  renderProgressIndicator(computeBalance(state.expenses), state.budget);
  renderPieChart(state.expenses);
}
```

Called once on page load (after `loadState()`) and after every state mutation. All four components are always updated in the same synchronous call, preventing stale data in any part of the UI.

---

## File Structure

```
expense-budget-visualizer/
├── index.html    ← semantic HTML skeleton
├── styles.css    ← all CSS: layout, components, states, responsive
└── app.js        ← all JavaScript: state, persistence, renderers, events
```

### index.html Skeleton

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Expense & Budget Visualizer</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <h1>Expense Tracker</h1>
    <div id="balance-display">
      Balance: <span id="balance">Rp 0</span>
    </div>
  </header>

  <main>
    <!-- Persistence error banner (hidden by default) -->
    <div id="persistence-error" class="error-banner hidden" role="alert"></div>

    <section class="form-section" aria-label="Add Expense">
      <h2>Add Expense</h2>
      <form id="expense-form" novalidate>
        <div class="field-group">
          <label for="input-name">Item Name</label>
          <input id="input-name" type="text" autocomplete="off">
          <span class="field-error" id="error-name" role="alert"></span>
        </div>
        <div class="field-group">
          <label for="input-amount">Amount</label>
          <input id="input-amount" type="number" min="0.01" step="0.01">
          <span class="field-error" id="error-amount" role="alert"></span>
        </div>
        <div class="field-group">
          <label for="input-category">Category</label>
          <input id="input-category" type="text" autocomplete="off">
          <span class="field-error" id="error-category" role="alert"></span>
        </div>
        <button type="submit">Add Expense</button>
      </form>
    </section>

    <section class="budget-section" aria-label="Budget Configuration">
      <h2>Budget Limit</h2>
      <div class="budget-control">
        <input id="budget-input" type="number" min="0.01" step="0.01" placeholder="Enter budget">
        <button id="budget-btn">Set Budget</button>
      </div>
      <span class="field-error" id="error-budget" role="alert"></span>
      <div class="progress-bar-track" role="progressbar" aria-valuemin="0" aria-valuemax="100">
        <div id="progress-bar-fill" class="state-neutral"></div>
      </div>
      <span id="progress-label">No budget set</span>
    </section>

    <section class="transactions-section" aria-label="Transaction List">
      <h2>Transactions</h2>
      <div class="list-container">
        <ul id="transaction-list" aria-live="polite"></ul>
      </div>
    </section>

    <section class="chart-section" aria-label="Spending by Category">
      <h2>Spending by Category</h2>
      <canvas id="pie-chart" width="300" height="300" aria-label="Category pie chart"></canvas>
      <ul id="pie-legend" aria-label="Chart legend"></ul>
    </section>
  </main>

  <script src="app.js"></script>
</body>
</html>
```

---

## CSS Architecture

**Layout:** CSS Grid for the main two-column layout (form + budget left, list + chart right). Single-column below 640px.

**CSS Custom Properties (`:root`):**

```css
:root {
  --color-safe: #4caf50;
  --color-warning: #ff9800;
  --color-exceeded: #f44336;
  --color-neutral: #9e9e9e;
  --color-bg: #f9fafb;
  --color-surface: #ffffff;
  --color-text: #1a1a1a;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;
  --radius: 8px;
  --shadow: 0 1px 3px rgba(0,0,0,0.1);
  --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

**Progress Indicator States:**

```css
#progress-bar-fill.state-safe     { background: var(--color-safe); }
#progress-bar-fill.state-warning  { background: var(--color-warning); }
#progress-bar-fill.state-exceeded { background: var(--color-exceeded); }
#progress-bar-fill.state-neutral  { background: var(--color-neutral); }
```

**Responsive breakpoints:** 320px (minimum supported), 640px (stack to single column), 1024px (side-by-side two-column), 1920px (max-width container, centered).

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Empty / whitespace-only name | Inline error under name field; form not submitted |
| Non-positive or non-numeric amount | Inline error under amount field; form not submitted |
| Empty / whitespace-only category | Inline error under category field; form not submitted |
| Invalid budget input | Inline error under budget input; previous budget retained |
| `localStorage` write failure | Dismissible error banner; session-only mode |
| `localStorage` read failure on load | Same banner; fresh empty state used |
| `JSON.parse` failure on corrupted data | Treated as empty state; banner shown |

Inline errors are cleared on the next successful form submission or on any input event for the relevant field.

---

## Initialization Sequence

```javascript
document.addEventListener('DOMContentLoaded', () => {
  loadState();     // 1. Read from localStorage (or empty state on error)
  bindEvents();    // 2. Attach all event listeners
  renderAll();     // 3. Render full UI from current state
});
```

---

## Accessibility

- All form inputs have associated `<label>` elements.
- Error messages use `role="alert"` so screen readers announce them.
- Transaction list uses `aria-live="polite"` so additions/deletions are announced.
- Progress bar uses `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.
- Canvas has a descriptive `aria-label`; the legend list serves as the accessible text alternative.
- All interactive controls are keyboard-reachable and focusable.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid entries are always added

*For any* non-empty item name, positive numeric amount, and non-empty category, calling `addExpense` should increase the expense list length by exactly 1 and the new entry should appear in the list with the submitted values intact.

**Validates: Requirements 1.2**

---

### Property 2: Invalid entries are always rejected

*For any* submission where the item name is whitespace-only, the amount is non-positive or non-numeric, or the category is whitespace-only, the expense list should remain unchanged (same length and same contents as before the attempted submission).

**Validates: Requirements 1.3, 1.4, 1.5**

---

### Property 3: Insertion order is preserved

*For any* sequence of valid expense entries added in order, the transaction list should display them in the exact same insertion order.

**Validates: Requirements 2.1**

---

### Property 4: Each rendered entry contains all required fields

*For any* expense entry in the transaction list, its rendered representation should contain the item name, the formatted amount, and the category as visible text, along with a delete control.

**Validates: Requirements 2.4, 2.5**

---

### Property 5: Delete removes entry from list and storage

*For any* expense entry that exists in the transaction list, activating its delete control should result in the entry no longer appearing in the transaction list, and `localStorage` should no longer contain that entry in the persisted array.

**Validates: Requirements 2.6, 7.2**

---

### Property 6: Balance equals sum of all amounts

*For any* collection of expense entries, the Balance value displayed should equal the arithmetic sum of the `amount` field of every entry, formatted as a whole number with the Rp currency prefix (IDR formatting).

**Validates: Requirements 3.2, 3.3**

---

### Property 7: Progress bar ratio is correct

*For any* valid positive budget and balance value, the progress bar fill width should equal `Math.min((balance / budget) * 100, 100)` percent, and the percentage label should reflect this ratio.

**Validates: Requirements 5.1, 5.3**

---

### Property 8: Progress bar state reflects spending band

*For any* (balance, budget) pair, the CSS state class applied to the progress bar fill should be exactly `state-safe` when `balance/budget ≤ 0.8`, `state-warning` when `0.8 < balance/budget < 1.0`, and `state-exceeded` when `balance/budget ≥ 1.0`.

**Validates: Requirements 5.4, 5.5, 5.6**

---

### Property 9: Valid budget values are persisted

*For any* positive numeric budget value entered by the user, after setting it the value stored in `localStorage` under `ebv_budget` should equal that value, and the progress indicator should reflect the new budget immediately.

**Validates: Requirements 4.2, 7.3**

---

### Property 10: Invalid budget inputs do not overwrite existing budget

*For any* invalid budget input (non-positive, non-numeric, or empty), the value stored in `localStorage` under `ebv_budget` should remain unchanged from its value before the invalid input was submitted.

**Validates: Requirements 4.3**

---

### Property 11: Pie chart slice proportions match category spending

*For any* list of expense entries with at least one entry, the computed arc angle for each category should equal `(categoryTotal / grandTotal) * 2π` radians, and no two distinct categories should share the same color.

**Validates: Requirements 6.1, 6.3**

---

### Property 12: Legend contains one entry per distinct category

*For any* list of expense entries with N distinct category labels, the pie chart legend should contain exactly N items, each uniquely identifying a category.

**Validates: Requirements 6.4**

---

### Property 13: LocalStorage round-trip preserves full app state

*For any* valid app state (any combination of expense entries and an optional budget), saving to `localStorage` and then loading from `localStorage` should produce an in-memory state with identical expense entries (same IDs, names, amounts, categories, and order) and the same budget value.

**Validates: Requirements 7.1, 7.4**

---

### Property 14: All UI components are consistent after any mutation

*For any* add or delete operation, after the operation completes, the Transaction List, Balance display, Progress Indicator, and Pie Chart should all simultaneously reflect a state that is consistent with the current expense array and budget value — no component should lag behind or show stale data.

**Validates: Requirements 8.1**
