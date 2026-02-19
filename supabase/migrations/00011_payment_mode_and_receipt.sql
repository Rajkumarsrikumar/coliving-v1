-- Payment mode and receipt for expenses and contribution payments

-- Expenses: add payment_mode
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS payment_mode TEXT
  CHECK (payment_mode IS NULL OR payment_mode IN ('bank_transfer', 'paynow', 'cash', 'grabpay', 'paylah', 'other'));

COMMENT ON COLUMN expenses.payment_mode IS 'How the expense was paid: bank_transfer, paynow, cash, grabpay, paylah, other';

-- Contribution payments: add payment_mode and receipt_url
ALTER TABLE contribution_payments
  ADD COLUMN IF NOT EXISTS payment_mode TEXT
  CHECK (payment_mode IS NULL OR payment_mode IN ('bank_transfer', 'paynow', 'cash', 'grabpay', 'paylah', 'other'));

ALTER TABLE contribution_payments
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

COMMENT ON COLUMN contribution_payments.payment_mode IS 'How the contribution was paid';
COMMENT ON COLUMN contribution_payments.receipt_url IS 'Optional receipt/proof of payment image URL';
