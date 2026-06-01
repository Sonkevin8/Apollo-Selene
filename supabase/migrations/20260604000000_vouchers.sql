-- Vouchers: admin-generated single-use codes for free ticket entry
CREATE TABLE IF NOT EXISTS public.vouchers (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text        NOT NULL UNIQUE,
  note       text,                          -- optional label (e.g. "for Sarah")
  used       boolean     NOT NULL DEFAULT false,
  used_at    timestamptz,
  used_by    text,                          -- email or user id of redeemer
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Anyone can look up a code to validate it at checkout
CREATE POLICY "vouchers_select" ON public.vouchers FOR SELECT USING (true);

-- Admin creates vouchers (app-side admin check)
CREATE POLICY "vouchers_insert" ON public.vouchers FOR INSERT WITH CHECK (true);

-- Mark as used on redemption
CREATE POLICY "vouchers_update" ON public.vouchers
  FOR UPDATE USING (true) WITH CHECK (true);

-- Admin deletes unused vouchers
CREATE POLICY "vouchers_delete" ON public.vouchers FOR DELETE USING (true);
