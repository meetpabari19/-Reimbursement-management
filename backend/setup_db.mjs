import postgres from 'postgres';

const sql = postgres('postgresql://postgres:Meet%408200788330@db.mahcfcuiovqcitmelmso.supabase.co:5432/postgres', {
  ssl: 'require'
});

async function main() {
  try {
    console.log('Running schema creation...');
    await sql.unsafe(`
-- 1. COMPANIES
CREATE TABLE IF NOT EXISTS companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  country         TEXT NOT NULL,
  currency_code   TEXT NOT NULL DEFAULT 'USD',
  currency_symbol TEXT NOT NULL DEFAULT '$',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  role            TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'employee')),
  manager_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  department      TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. APPROVAL RULE SETS
CREATE TABLE IF NOT EXISTS approval_rule_sets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  rule_type       TEXT CHECK (rule_type IN ('sequential', 'percentage', 'specific_approver', 'hybrid')),
  percentage_threshold  INTEGER,
  specific_approver_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. APPROVAL STEPS
CREATE TABLE IF NOT EXISTS approval_steps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id     UUID REFERENCES approval_rule_sets(id) ON DELETE CASCADE,
  step_order      INTEGER NOT NULL,
  approver_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  approver_role   TEXT,
  is_manager_step BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (rule_set_id, step_order)
);

-- 5. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID REFERENCES companies(id) ON DELETE CASCADE,
  employee_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  rule_set_id       UUID REFERENCES approval_rule_sets(id) ON DELETE SET NULL,
  category          TEXT NOT NULL,
  description       TEXT NOT NULL,
  amount            NUMERIC(12, 2) NOT NULL,
  currency_code     TEXT NOT NULL,
  amount_usd        NUMERIC(12, 2) NOT NULL,
  date              DATE NOT NULL,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('draft','pending','approved','rejected')),
  receipt_url       TEXT,
  ocr_raw           JSONB,
  current_step      INTEGER DEFAULT 1,
  submitted_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 6. EXPENSE APPROVAL ACTIONS
CREATE TABLE IF NOT EXISTS expense_approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id      UUID REFERENCES expenses(id) ON DELETE CASCADE,
  step_order      INTEGER NOT NULL,
  approver_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  action          TEXT CHECK (action IN ('approved', 'rejected', 'escalated')),
  comment         TEXT,
  acted_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CURRENCY RATES CACHE
CREATE TABLE IF NOT EXISTS currency_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency   TEXT NOT NULL,
  rates           JSONB NOT NULL,
  fetched_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 8. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT,
  expense_id      UUID REFERENCES expenses(id) ON DELETE CASCADE,
  message         TEXT,
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ENABLE RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_rule_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    `);

    console.log('Drop policies...');
    await sql.unsafe(`
DO $$
BEGIN
  DROP POLICY IF EXISTS "employee_select_own_expenses" ON expenses;
  DROP POLICY IF EXISTS "employee_insert_expense" ON expenses;
  DROP POLICY IF EXISTS "employee_resubmit_expense" ON expenses;
  DROP POLICY IF EXISTS "employee_read_own_approvals" ON expense_approvals;
  DROP POLICY IF EXISTS "employee_read_notifications" ON notifications;
  DROP POLICY IF EXISTS "employee_update_notifications" ON notifications;
  DROP POLICY IF EXISTS "employee_read_company" ON companies;
  DROP POLICY IF EXISTS "employee_read_own_profile" ON users;
EXCEPTION WHEN OTHERS THEN
  -- ignore
END $$;
    `);

    console.log('Creating policies...');
    await sql.unsafe(`
-- Employee sees only their own expenses
CREATE POLICY "employee_select_own_expenses"
  ON expenses FOR SELECT
  USING (employee_id = auth.uid());

-- Employee can insert their own expenses
CREATE POLICY "employee_insert_expense"
  ON expenses FOR INSERT
  WITH CHECK (employee_id = auth.uid());

-- Employee can update ONLY their own rejected expenses (for resubmit)
CREATE POLICY "employee_resubmit_expense"
  ON expenses FOR UPDATE
  USING (
    employee_id = auth.uid()
    AND status = 'rejected'
  );

-- Employee can read approval history on their own expenses
CREATE POLICY "employee_read_own_approvals"
  ON expense_approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM expenses e
      WHERE e.id = expense_id
        AND e.employee_id = auth.uid()
    )
  );

-- Employee reads their own notifications
CREATE POLICY "employee_read_notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Employee can mark their own notifications read
CREATE POLICY "employee_update_notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Employee reads company (to get currency info)
CREATE POLICY "employee_read_company"
  ON companies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.company_id = companies.id
    )
  );

-- Employee reads own user profile
CREATE POLICY "employee_read_own_profile"
  ON users FOR SELECT
  USING (id = auth.uid());
    `);

    console.log('Creating default demo company...');
    await sql.unsafe(`
      INSERT INTO companies (id, name, country, currency_code, currency_symbol)
      VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Company', 'India', 'INR', '₹')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('Creating auto user-row trigger...');
    await sql.unsafe(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.users (id, company_id, name, email, role)
        VALUES (
          NEW.id,
          '00000000-0000-0000-0000-000000000001',
          COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
        )
        ON CONFLICT (id) DO NOTHING;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    await sql.unsafe(`
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `);

    console.log('Creating storage bucket and policies...');
    await sql.unsafe(`
      INSERT INTO storage.buckets (id, name, public) 
      VALUES ('receipts', 'receipts', false)
      ON CONFLICT (id) DO NOTHING;
    `);

    await sql.unsafe(`
DO $$
BEGIN
  DROP POLICY IF EXISTS "employee_upload_receipt" ON storage.objects;
  DROP POLICY IF EXISTS "employee_read_receipt" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
END $$;
    `);

    await sql.unsafe(`
-- Employee can upload to their own folder only
CREATE POLICY "employee_upload_receipt"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Employee can read their own receipts
CREATE POLICY "employee_read_receipt"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
    `);

    console.log('Database successfully initialized!');
  } catch (err) {
    console.error('Error during setup:', err);
  } finally {
    process.exit(0);
  }
}

main();
