# Requirements Document

## Introduction

A standalone expense and budget visualizer website built with HTML, CSS, and Vanilla JavaScript — no backend, no framework. All data is stored in browser LocalStorage and persists across page reloads. Users can add and delete transaction entries, set a personal budget limit, and visualize spending distribution via a pie chart and progress indicator. All UI updates happen automatically without a manual refresh.

## Glossary

- **App**: The single-page expense and budget visualizer website.
- **Transaction**: A record consisting of an item name, a numeric amount, and a free-text category label.
- **Transaction List**: The scrollable, ordered list of all stored Transactions displayed in the App.
- **Balance**: The sum of the amounts of all current Transactions.
- **Budget Limit**: A user-defined numeric value representing the maximum intended spending amount.
- **Progress Indicator**: A visual bar that reflects the ratio of Balance to the Budget Limit.
- **Pie Chart**: A circular chart that segments spending proportionally by category.
- **LocalStorage**: The browser's Web Storage API used to persist all data client-side.
- **Category**: A free-text label assigned by the user to group related Transactions.

---

## Requirements

### Requirement 1 — Transaction Input

**User Story:** As a user, I want to add transactions with a name, amount, and category, so that I can record individual spending items.

#### Acceptance Criteria

1. THE App SHALL provide a form containing three input fields: item name (text), amount (numeric), and category (free-text).
2. WHEN the user submits the form with a non-empty item name, a positive numeric amount, and a non-empty category, THE App SHALL create a new Transaction and add it to the Transaction List.
3. IF the user submits the form with an empty item name, THEN THE App SHALL display an inline validation error and prevent the Transaction from being saved.
4. IF the user submits the form with a non-positive or non-numeric amount, THEN THE App SHALL display an inline validation error and prevent the Transaction from being saved.
5. IF the user submits the form with an empty category, THEN THE App SHALL display an inline validation error and prevent the Transaction from being saved.
6. WHEN a new Transaction is successfully added, THE App SHALL clear all form input fields so the form is ready for the next entry.

---

### Requirement 2 — Transaction List

**User Story:** As a user, I want to see a scrollable list of all my transactions and be able to delete any item, so that I can review and manage my spending records.

#### Acceptance Criteria

1. THE App SHALL display the Transaction List showing all stored Transactions in the order they were added.
2. WHILE the number of Transactions exceeds the visible list height, THE App SHALL make the Transaction List scrollable without affecting the rest of the page layout.
3. WHEN a Transaction is added or deleted, THE App SHALL update the Transaction List immediately without requiring a page reload.
4. THE App SHALL display each Transaction in the Transaction List with its item name, amount, and category visible.
5. THE App SHALL provide a delete control on each Transaction row in the Transaction List.
6. WHEN the user activates the delete control on a Transaction, THE App SHALL remove that Transaction from the Transaction List and from LocalStorage.

---

### Requirement 3 — Balance Display

**User Story:** As a user, I want to see my balance at the top of the page, so that I always have a quick overview of how much I have spent.

#### Acceptance Criteria

1. THE App SHALL display the Balance value prominently at the top of the page.
2. WHEN a Transaction is added or deleted, THE App SHALL recalculate and update the Balance display immediately.
3. THE App SHALL display the Balance as a whole numeric value formatted with the Rp currency prefix (IDR format, no decimal places).

---

### Requirement 4 — Budget Limit Configuration

**User Story:** As a user, I want to set a personal budget limit, so that I can track whether my spending is within my planned budget.

#### Acceptance Criteria

1. THE App SHALL provide an input control that allows the user to enter or update the Budget Limit.
2. WHEN the user sets a valid positive numeric Budget Limit, THE App SHALL persist the value in LocalStorage and update the Progress Indicator immediately.
3. IF the user enters a non-positive or non-numeric value as the Budget Limit, THEN THE App SHALL display an inline validation error and retain the previously saved Budget Limit.
4. WHERE no Budget Limit has been set, THE App SHALL display the Progress Indicator in a neutral state indicating no limit is configured.

---

### Requirement 5 — Progress Indicator

**User Story:** As a user, I want a visual progress bar showing how much of my budget I have used, so that I can quickly assess my remaining budget at a glance.

#### Acceptance Criteria

1. THE App SHALL display the Progress Indicator as a horizontal bar showing the ratio of Balance to the Budget Limit.
2. WHEN the Balance or the Budget Limit changes, THE App SHALL update the Progress Indicator width and label immediately.
3. THE App SHALL display the percentage of Budget Limit consumed as a numeric label alongside or within the Progress Indicator.
4. WHILE the Balance is less than or equal to 80% of the Budget Limit, THE App SHALL render the Progress Indicator in a visually safe state (e.g., green).
5. WHILE the Balance is greater than 80% and less than 100% of the Budget Limit, THE App SHALL render the Progress Indicator in a visually warning state (e.g., yellow/orange).
6. WHILE the Balance is equal to or greater than 100% of the Budget Limit, THE App SHALL render the Progress Indicator in a visually exceeded state (e.g., red).

---

### Requirement 6 — Category Pie Chart

**User Story:** As a user, I want a pie chart that shows my spending distribution by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE App SHALL render a Pie Chart that divides the Balance proportionally among all distinct categories present in the Transaction List.
2. WHEN a Transaction is added or deleted, THE App SHALL update the Pie Chart immediately to reflect the new category distribution.
3. THE App SHALL assign a distinct color to each unique category in the Pie Chart.
4. THE App SHALL display a legend identifying each category and its corresponding color.
5. WHERE the Transaction List contains no Transactions, THE App SHALL display a placeholder state in the Pie Chart area indicating there is no data to visualize.
6. THE App SHALL render the Pie Chart using only the Canvas API or inline SVG — no third-party charting libraries.

---

### Requirement 7 — Data Persistence

**User Story:** As a user, I want my data to be saved automatically so that my transactions and budget limit are still present after a page reload.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE App SHALL save the updated Transaction List to LocalStorage before the UI update is visible.
2. WHEN a Transaction is deleted, THE App SHALL save the updated Transaction List to LocalStorage before the UI update is visible.
3. WHEN the Budget Limit is updated, THE App SHALL save the new Budget Limit to LocalStorage immediately.
4. WHEN the App is loaded, THE App SHALL read all Transactions and the Budget Limit from LocalStorage and restore the full UI state.
5. IF LocalStorage is unavailable or read fails, THEN THE App SHALL display an error message informing the user that persistence is unavailable and operate in a session-only mode.

---

### Requirement 8 — Automatic UI Synchronization

**User Story:** As a user, I want all parts of the interface to update automatically when I add or delete transactions, so that I never see stale data.

#### Acceptance Criteria

1. WHEN any Transaction is added or deleted, THE App SHALL update the Transaction List, Balance display, Progress Indicator, and Pie Chart simultaneously in the same event cycle.
2. THE App SHALL not require the user to press a refresh or reload button to see current data in any part of the interface.

---

### Requirement 9 — Technical Constraints

**User Story:** As a developer, I want the App to be built with standard web technologies only, so that it requires no build tools, no servers, and no external dependencies.

#### Acceptance Criteria

1. THE App SHALL be implemented using HTML, CSS, and Vanilla JavaScript exclusively, with no JavaScript frameworks or libraries.
2. THE App SHALL use the browser LocalStorage API as the sole data persistence mechanism with no server-side component.
3. THE App SHALL function correctly in the latest stable releases of Chrome, Firefox, Edge, and Safari without polyfills or build steps.
4. THE App SHALL be deliverable as a single HTML file or as a small set of static files openable directly in a browser without a local server.

---

### Requirement 10 — Non-Functional: Performance and Usability

**User Story:** As a user, I want the App to feel fast and easy to use, so that recording expenses is effortless and enjoyable.

#### Acceptance Criteria

1. THE App SHALL render the initial page and restore persisted data within 1 second on a modern desktop browser with no network requests.
2. WHEN a Transaction is added or deleted, THE App SHALL complete all UI updates within 100 milliseconds of the user action.
3. THE App SHALL present a clean, minimal interface with clear visual hierarchy and readable typography, requiring no onboarding or instructions.
4. THE App SHALL be usable on viewport widths from 320px to 1920px without horizontal scrolling or layout breakage.
