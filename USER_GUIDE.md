# COTENANTY App – User Guide

A web app for tracking shared expenses, splitting costs, and managing payments in COTENANTY spaces.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Home & Units](#home--units)
3. [Unit Dashboard](#unit-dashboard)
4. [Expenses](#expenses)
5. [Balances & Payments](#balances--payments)
6. [Members](#members)
7. [Contributions](#contributions)
8. [My Spends](#my-spends)
9. [Profile](#profile)
10. [Tips & FAQs](#tips--faqs)

---

## Getting Started

### Sign Up / Log In

1. Open the COTENANTY app in your browser.
2. Click **Sign up** to create an account (email + password).
3. Or use **Log in** if you already have an account.

### First-Time Setup

- If you’re the first person in your unit, **create a unit** from the home page.
- If you’ve been invited, the unit will appear on your home page after you accept the invite.

---

## Home & Units

**Path:** `/home`

The home page lists all units you belong to.

### Create a Unit

1. Click **Create unit**.
2. Enter:
   - Unit name (e.g. “08-05, 6 Flora Rd”)
   - Address
   - Country
   - Monthly rent
   - Payment due day (e.g. 5 = due by the 5th of each month)
   - Optional: contract dates, agent details, unit image
3. Click **Create unit**.

### Open a Unit

Click a unit card to open its dashboard.

---

## Unit Dashboard

**Path:** `/units/:id`

The dashboard shows an overview for the selected unit.

### Sections

- **Payment reminder** – Shown to co-tenants until they record their payment for the month.
- **My wallet** – Your paid amount, amount received (for master tenants), and balance.
- **Balances** – Table of expected amount, paid amount, and balance per member.
- **Expenses** – Chart and list of this month’s expenses.
- **Recent expenses** – Latest expenses with quick links.

### Actions

- **Record payment** – For co-tenants to record that they’ve paid their share.
- **Export report** – Download a PDF or CSV report for the unit.
- **Members** – Manage unit members.
- **Add expense** – Add a new expense.

---

## Expenses

**Path:** `/units/:id/expenses`

### View Expenses

- Filter by month.
- See category, amount, date, payer, and payment mode.
- Export to Excel/CSV.

### Add Expense

**Path:** `/units/:id/expenses/new`

1. Select **category** (Rent, PUB, Cleaning, Provisions, Other).
2. Enter **amount** and **date**.
3. Select **paid by** (who paid).
4. Choose **payment mode** (Bank transfer, PayNow, Cash, Credit card, etc.).
5. Add optional **notes** and **receipt image**.
6. Click **Add expense**.

### Delete Expenses

- Master tenants can delete individual expenses or all expenses for a month.

---

## Balances & Payments

### Understanding Balances

- **Expected** – Your share based on your contribution type (share % or fixed amount).
- **Paid** – Amount you’ve paid (expenses + recorded payments).
- **Balance** – Paid − Expected (positive = overpaid, negative = owes).

### Recording a Payment

1. When the payment reminder appears, click **Record payment**.
2. Enter:
   - Amount
   - Payment mode
   - Optional notes
3. Click **Record**.

### My Wallet (Master Tenants)

- **Amount received in master account** – Balance payments received + your own contribution.
- **Expenses paid** – Actual expenses you’ve paid.
- **Total amount paid (Myself)** – Payments you’ve recorded for yourself.
- **Balance** – Amount received − Expenses paid.

---

## Members

**Path:** `/units/:id/members`

### View Members

- See all members with their role (Master tenant / Co-tenant).
- See contribution type (share % or fixed amount) and end date if set.

### Add Co-Tenants (Master Tenants Only)

1. Enter the co-tenant’s **email**.
2. Choose **contribution type**:
   - **Share** – Percentage of total (e.g. 50%).
   - **Fixed** – Fixed amount per month or year.
3. Set **contribution end date** if applicable.
4. Click **Invite**.

### Edit Member (Master Tenants Only)

Click the **pencil icon** next to a member to change their contribution type, share %, or fixed amount.

---

## Contributions

**Path:** `/units/:id/contributions`

Contributions are one-off requests (e.g. for shared items or repairs).

### Request a Contribution

1. Go to **Contributions** and click **Request contribution**.
2. Enter **reason** and **amount**.
3. Submit the request.

### View & Pay Contributions

- See all contribution requests and their status.
- Mark contributions as paid when settled.
- Export to Excel.

---

## My Spends

**Path:** `/spends`

Overview of your spending across all units.

### Sections

- **Total you’ve paid (all time)** – Sum of all expenses you’ve paid.
- **Share** – Your expected share across units.
- **Balance** – Overpaid (you’re owed) or underpaid (you owe).

- **This month** – Paid, share, and balance for the current month.

- **By unit** – Breakdown per unit. Click a unit to open its dashboard.

---

## Profile

**Path:** `/profile`

### Update Profile

1. Change your **name** and **phone**.
2. Upload an **avatar** (JPEG, PNG, WebP, or GIF, max 2MB).
3. Click **Save**.

---

## Tips & FAQs

### Roles

- **Master tenant** – Manages the unit: adds members, records payments, adds expenses, edits contributions.
- **Co-tenant** – Records own payments, views balances and expenses.

### Contribution Types

- **Share** – Your share is a percentage of total expenses (e.g. 50%).
- **Fixed** – Your share is a fixed amount per month or year.

### Payment Modes

Supported modes: Bank transfer, PayNow, Cash, Credit card, GrabPay, PayLah!, Other.

### Export Reports

- **PDF** – Full unit report with expenses and member contributions.
- **CSV/Excel** – Spreadsheet format for expenses or contributions.

### Dark Mode

Use the sun/moon icon in the header to switch between light and dark themes.

### Mobile

The app is responsive. On mobile, some labels are shortened and layouts stack vertically for easier reading.

---

## Support

For issues or questions, contact your unit’s master tenant or the app administrator.
