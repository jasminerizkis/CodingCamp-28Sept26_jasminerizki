# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a zero-dependency, single-page expense tracker as three static files (`index.html`, `styles.css`, `app.js`). The build order follows the data pipeline: persistence layer first, then state functions, then each UI component renderer, and finally event wiring. Property-based tests use plain JavaScript with a simple test runner (no external library).

---

## Tasks

- [x] 1. Create project files and HTML skeleton
  - [x] 1.1 Create `index.html` with full semantic markup skeleton
    - Add `<head>` with charset, viewport, title, and `<link>` to `styles.css`
    - Add `<header>` with `<h1>` and `<span id="balance">`
    - Add `<main>` with all five sections: form, budget, transactions, chart, and persistence-error banner
    - Add all ARIA attributes: `role="alert"` on error spans, `aria-live="polite"` on `#transaction-list`, `role="progressbar"` on `.progress-bar-track`, `aria-label` on canvas
    - Add `<script src="app.js">` at the bottom of `<body>`
    - _Requirements: 1.1, 2.1, 2.4, 2.5, 3.1, 4.1, 5.1, 6.1, 9.1, 9.4_

  - [x] 1.2 Create `styles.css` with base styles and CSS custom properties
    - Define all `:root` custom properties (`--color-safe`, `--color-warning`, `--color-exceeded`, `--color-neutral`, `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-border`, `--radius`, `--shadow`, `--font`)
    - Add CSS reset and base typography
    - Add progress bar state classes: `.state-safe`, `.state-warning`, `.state-exceeded`, `.state-neutral`
    - Add layout: CSS Grid two-column for `<main>`, stacking to single column at 640px breakpoint
    - Add responsive support for 320px–1920px viewport widths
    - Style form fields, buttons, error spans, list container (`overflow-y: auto`), and error banner
    - _Requirements: 5.4, 5.5, 5.6, 9.3, 10.3, 10.4_

  - [x] 1.3 Create `app.js` with the top-level state object and constants
    - Declare `const state = { expenses: [], budget: null }`
    - Declare `const PALETTE` array of 12 hex colors
    - Declare localStorage key constants (`'ebv_expenses'`, `'ebv_budget'`)
    - _Requirements: 9.1_

- [x] 2. Implement the persistence layer
  - [x] 2.1 Implement `saveState()` and `loadState()`
    - `saveState()`: write `state.expenses` as JSON to `ebv_expenses`; write `state.budget` as string to `ebv_budget` or remove the key when null; wrap in try/catch calling `showPersistenceError()` on failure
    - `loadState()`: read and JSON-parse `ebv_expenses`; parse `ebv_budget` as Number or null; wrap in try/catch, reset to empty state and call `showPersistenceError()` on failure
    - `showPersistenceError()`: make `#persistence-error` banner visible with a message; attach a dismiss button
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 2.2 Write property test for localStorage round-trip (Property 13)
    - **Property 13: LocalStorage round-trip preserves full app state**
    - **Validates: Requirements 7.1, 7.4**
    - Set `state.expenses` to an arbitrary array of valid entries and `state.budget` to an arbitrary positive number; call `saveState()` then reset state and call `loadState()`; assert restored state deeply equals original
    - Also test with `state.budget = null` to confirm key is removed and reloads as null

- [x] 3. Implement state mutation functions
  - [x] 3.1 Implement `validateEntry(name, amount, category)` and `addExpense(name, amount, category)`
    - `validateEntry`: return `{ valid, errors: { name?, amount?, category? } }` using the three validation rules
    - `addExpense`: generate a unique `id` via `crypto.randomUUID()` with `Date.now()` fallback; push new expense object onto `state.expenses`
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [ ]* 3.2 Write property test for valid entries always added (Property 1)
    - **Property 1: Valid entries are always added**
    - **Validates: Requirements 1.2**
    - For arbitrary valid (name, amount, category) inputs, assert `state.expenses.length` increases by exactly 1 and the last entry contains the submitted values

  - [ ]* 3.3 Write property test for invalid entries always rejected (Property 2)
    - **Property 2: Invalid entries are always rejected**
    - **Validates: Requirements 1.3, 1.4, 1.5**
    - For all invalid combinations (empty name, zero/negative amount, empty category), assert `state.expenses` remains unchanged after calling `addExpense` when `validateEntry` returns invalid

  - [x] 3.4 Implement `deleteExpense(id)` and `validateBudget(value)` / `setBudget(value)`
    - `deleteExpense(id)`: filter `state.expenses` to remove the entry with matching id
    - `validateBudget(value)`: return `{ valid: boolean }` — valid when `isFinite(value) && Number(value) > 0`
    - `setBudget(value)`: set `state.budget = Number(value)`
    - _Requirements: 2.6, 4.2, 4.3_

  - [ ]* 3.5 Write property test for valid budget persisted (Property 9)
    - **Property 9: Valid budget values are persisted**
    - **Validates: Requirements 4.2, 7.3**
    - For arbitrary positive numeric budget, call `setBudget` then `saveState`; assert `localStorage.getItem('ebv_budget')` equals the string form of the value

  - [ ]* 3.6 Write property test for invalid budget does not overwrite (Property 10)
    - **Property 10: Invalid budget inputs do not overwrite existing budget**
    - **Validates: Requirements 4.3**
    - Set a valid budget, save state, then attempt `setBudget` with invalid values; assert `localStorage.getItem('ebv_budget')` is unchanged

- [x] 4. Checkpoint — persistence and state layer
  - Ensure all tests pass. Ask the user if questions arise.

- [ ] 5. Implement UI renderers
  - [x] 5.1 Implement `formatCurrency(value)` and `renderBalance(expenses)`
    - `formatCurrency`: use `toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })` — produces `Rp 1.234` format (whole numbers, no decimal places)
    - `renderBalance`: compute `expenses.reduce((sum, e) => sum + e.amount, 0)` and set `#balance` text content
    - _Requirements: 3.2, 3.3_

  - [ ]* 5.2 Write property test for balance equals sum (Property 6)
    - **Property 6: Balance equals sum of all amounts**
    - **Validates: Requirements 3.2, 3.3**
    - For arbitrary arrays of expense entries, assert the value written into `#balance` matches the arithmetic sum formatted by `formatCurrency` using IDR formatting (`Rp` prefix, whole numbers, `id-ID` locale)

  - [x] 5.3 Implement `renderTransactionList(expenses)`
    - Clear `#transaction-list` and repopulate with one `<li>` per expense
    - Each `<li>` shows item name, `formatCurrency(amount)`, category, and a `<button class="delete-btn" data-id="...">` delete control
    - _Requirements: 2.1, 2.3, 2.4, 2.5_

  - [ ]* 5.4 Write property test for insertion order preserved (Property 3)
    - **Property 3: Insertion order is preserved**
    - **Validates: Requirements 2.1**
    - For arbitrary sequences of valid entries, assert the rendered `<li>` order matches the order entries were added

  - [ ]* 5.5 Write property test for each rendered entry contains required fields (Property 4)
    - **Property 4: Each rendered entry contains all required fields**
    - **Validates: Requirements 2.4, 2.5**
    - For arbitrary expense entries, assert each `<li>` contains the name text, formatted amount text, category text, and a `.delete-btn` element

  - [x] 5.6 Implement `renderProgressIndicator(balance, budget)`
    - When `budget` is null: set fill width to `0%`, label to `No budget set`, class to `state-neutral`
    - Otherwise: compute `ratio = balance / budget`; set fill width to `Math.min(ratio * 100, 100).toFixed(1) + '%'`; set `aria-valuenow` on the track
    - Apply `state-safe` (≤ 80%), `state-warning` (> 80% and < 100%), `state-exceeded` (≥ 100%) CSS class to `#progress-bar-fill`
    - Set `#progress-label` text to `(ratio * 100).toFixed(1) + '%'`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 5.7 Write property test for progress bar ratio (Property 7)
    - **Property 7: Progress bar ratio is correct**
    - **Validates: Requirements 5.1, 5.3**
    - For arbitrary positive (balance, budget) pairs, assert the fill width equals `Math.min((balance / budget) * 100, 100).toFixed(1) + '%'`

  - [ ]* 5.8 Write property test for progress bar state class (Property 8)
    - **Property 8: Progress bar state reflects spending band**
    - **Validates: Requirements 5.4, 5.5, 5.6**
    - For values in each of the three bands (≤ 80%, > 80% < 100%, ≥ 100%), assert the correct CSS class is applied and the others are absent

  - [x] 5.9 Implement `renderPieChart(expenses)`
    - Group expenses by category, sum amounts per category
    - If no expenses: draw a placeholder circle with centered "No data" text on the canvas; clear `#pie-legend`
    - Otherwise: compute arc angles from the formula in the design; draw each slice with `ctx.arc()` using PALETTE colors (cycling if needed); populate `#pie-legend` with one colored-swatch `<li>` per category
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 5.10 Write property test for pie chart slice proportions (Property 11)
    - **Property 11: Pie chart slice proportions match category spending**
    - **Validates: Requirements 6.1, 6.3**
    - For arbitrary expense arrays, verify the computed arc angle for each category equals `(categoryTotal / grandTotal) * 2 * Math.PI` and no two categories share the same color

  - [ ]* 5.11 Write property test for legend entry count (Property 12)
    - **Property 12: Legend contains one entry per distinct category**
    - **Validates: Requirements 6.4**
    - For arbitrary expense arrays with N distinct categories, assert `#pie-legend` contains exactly N `<li>` elements

- [x] 6. Checkpoint — renderers
  - Ensure all tests pass. Ask the user if questions arise.

- [x] 7. Implement `renderAll()`, event binding, and initialization
  - [x] 7.1 Implement `computeBalance(expenses)` and `renderAll()`
    - `computeBalance`: return `expenses.reduce((sum, e) => sum + e.amount, 0)`
    - `renderAll`: call `renderTransactionList`, `renderBalance`, `renderProgressIndicator(computeBalance(state.expenses), state.budget)`, `renderPieChart` in sequence
    - _Requirements: 8.1, 8.2_

  - [ ]* 7.2 Write property test for UI consistency after mutation (Property 14)
    - **Property 14: All UI components are consistent after any mutation**
    - **Validates: Requirements 8.1**
    - After any add or delete operation, assert that all four components simultaneously reflect the current `state.expenses` and `state.budget`

  - [x] 7.3 Implement `bindEvents()` — expense form submission
    - Listen for `submit` on `#expense-form`; prevent default
    - Call `validateEntry`; on failure inject inline errors into `#error-name`, `#error-amount`, `#error-category`; on success call `addExpense` → `saveState` → `renderAll` → reset form
    - Clear field-level error on `input` event for each field
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 7.4 Implement `bindEvents()` — delete via event delegation and budget control
    - Listen for `click` on `#transaction-list` container; identify `data-id` on `.delete-btn`; call `deleteExpense(id)` → `saveState` → `renderAll`
    - Listen for `click` on `#budget-btn`; call `validateBudget`; on failure show `#error-budget`; on success call `setBudget` → `saveState` → `renderAll`
    - _Requirements: 2.6, 4.2, 4.3_

  - [ ]* 7.5 Write property test for delete removes entry from list and storage (Property 5)
    - **Property 5: Delete removes entry from list and storage**
    - **Validates: Requirements 2.6, 7.2**
    - For arbitrary expense arrays, simulate activating the delete control on any entry; assert the entry no longer appears in `state.expenses` and is absent from the JSON stored in `localStorage`

  - [x] 7.6 Wire the initialization sequence
    - Inside `DOMContentLoaded`: call `loadState()` → `bindEvents()` → `renderAll()`
    - _Requirements: 7.4, 8.1_

- [x] 8. Final checkpoint — full integration
  - Ensure all tests pass. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests can be written as self-contained functions in a `tests.js` file that runs inline assertions; no external test library is required
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key boundaries
- Property tests validate universal correctness properties; they complement rather than replace targeted unit assertions

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "3.4"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.5", "3.6", "5.1", "5.3", "5.6", "5.9"] },
    { "id": 4, "tasks": ["5.2", "5.4", "5.5", "5.7", "5.8", "5.10", "5.11", "7.1"] },
    { "id": 5, "tasks": ["7.2", "7.3", "7.4"] },
    { "id": 6, "tasks": ["7.5", "7.6"] }
  ]
}
```
