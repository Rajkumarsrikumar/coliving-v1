-- Add credit_card to payment_mode options

-- Expenses
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_payment_mode_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_payment_mode_check
  CHECK (payment_mode IS NULL OR payment_mode IN ('bank_transfer', 'paynow', 'cash', 'grabpay', 'paylah', 'credit_card', 'other'));

-- Contribution payments
ALTER TABLE contribution_payments DROP CONSTRAINT IF EXISTS contribution_payments_payment_mode_check;
ALTER TABLE contribution_payments ADD CONSTRAINT contribution_payments_payment_mode_check
  CHECK (payment_mode IS NULL OR payment_mode IN ('bank_transfer', 'paynow', 'cash', 'grabpay', 'paylah', 'credit_card', 'other'));

-- Balance payments
ALTER TABLE balance_payments DROP CONSTRAINT IF EXISTS balance_payments_payment_mode_check;
ALTER TABLE balance_payments ADD CONSTRAINT balance_payments_payment_mode_check
  CHECK (payment_mode IN ('bank_transfer', 'paynow', 'cash', 'grabpay', 'paylah', 'credit_card', 'other'));
