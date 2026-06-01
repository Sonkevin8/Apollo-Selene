-- Reflections table: user submissions pending admin approval
CREATE TABLE IF NOT EXISTS public.reflections (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  author     text        NOT NULL,
  title      text        NOT NULL,
  content    text        NOT NULL,
  tags       text[]      NOT NULL DEFAULT '{}',
  likes      integer     NOT NULL DEFAULT 0,
  approved   boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

-- Anyone can read (app filters to approved=true for public; admin reads all)
CREATE POLICY "reflections_select" ON public.reflections
  FOR SELECT USING (true);

-- Anyone can submit a new reflection (goes in unapproved by default)
CREATE POLICY "reflections_insert" ON public.reflections
  FOR INSERT WITH CHECK (true);

-- Admin can approve and update likes
CREATE POLICY "reflections_update" ON public.reflections
  FOR UPDATE USING (true) WITH CHECK (true);

-- Admin can delete
CREATE POLICY "reflections_delete" ON public.reflections
  FOR DELETE USING (true);
