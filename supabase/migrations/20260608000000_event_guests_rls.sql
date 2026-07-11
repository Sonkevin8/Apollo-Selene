-- Ensure RLS is enabled and fully permissive on event_guests
-- so all guests are visible regardless of who added them.

ALTER TABLE public.event_guests ENABLE ROW LEVEL SECURITY;

-- Anyone can read the full guest list
DROP POLICY IF EXISTS "event_guests_select" ON public.event_guests;
CREATE POLICY "event_guests_select"
  ON public.event_guests FOR SELECT USING (true);

-- Anyone can add a guest (admin check handled app-side)
DROP POLICY IF EXISTS "event_guests_insert" ON public.event_guests;
CREATE POLICY "event_guests_insert"
  ON public.event_guests FOR INSERT WITH CHECK (true);

-- Anyone can remove a guest (admin check handled app-side)
DROP POLICY IF EXISTS "event_guests_delete" ON public.event_guests;
CREATE POLICY "event_guests_delete"
  ON public.event_guests FOR DELETE USING (true);

-- Ensure event_attendance is also fully readable
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_attendance_select" ON public.event_attendance;
CREATE POLICY "event_attendance_select"
  ON public.event_attendance FOR SELECT USING (true);

DROP POLICY IF EXISTS "event_attendance_insert" ON public.event_attendance;
CREATE POLICY "event_attendance_insert"
  ON public.event_attendance FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "event_attendance_update" ON public.event_attendance;
CREATE POLICY "event_attendance_update"
  ON public.event_attendance FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "event_attendance_delete" ON public.event_attendance;
CREATE POLICY "event_attendance_delete"
  ON public.event_attendance FOR DELETE USING (true);
