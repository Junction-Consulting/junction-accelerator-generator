-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Experience launch start dates
-- Version: 015
-- Description: Records the start date an operator (or staff) confirms for an
--              Experience Design launch roadmap.
--
-- Why: user_plans.cohort_start_date cannot be empty, so every new project is
-- given the day it was created. For an experience dashboard that date means
-- nothing: the roadmap starts on the date the operator picks on their
-- dashboard. This table holds that confirmed date. Until a row exists for an
-- operator, their dashboard shows "Choose your start date".
--
-- This migration replaces the function from migration 007 and can be run
-- whether or not 007 was applied. It is safe to run more than once.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Table: one confirmed start date per experience project
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS experience_launch (
  client_slug TEXT PRIMARY KEY,
  start_date  DATE NOT NULL,
  set_by      TEXT NOT NULL,
  set_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE experience_launch IS
  'Confirmed launch roadmap start date for each Experience Design project. Written only by set_launch_start_date().';

-- No direct access from the browser: reads and writes go through the two
-- functions below, which check who is asking.
ALTER TABLE experience_launch ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Helper: may the caller see or change this project?
--    Returns 'staff' (admin or PSM), 'member' (client or coach on this
--    project) or NULL.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION experience_launch_access(p_client_slug TEXT)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT := auth.jwt() ->> 'email';
BEGIN
  IF v_email IS NULL THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM user_plans up
    WHERE up.email = v_email AND up.role IN ('admin', 'psm') AND up.active = true
  ) THEN
    RETURN 'staff';
  END IF;

  IF EXISTS (
    SELECT 1 FROM user_plans up
    WHERE up.active = true
      AND up.client_slug = p_client_slug
      AND (up.email = v_email OR up.coach_email = v_email)
  ) THEN
    RETURN 'member';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Function: get_launch_start_date
--    Tells the dashboard whether a start date has been confirmed.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_launch_start_date(p_client_slug TEXT)
RETURNS JSONB AS $$
DECLARE
  v_start DATE;
BEGIN
  IF experience_launch_access(p_client_slug) IS NULL THEN
    RETURN jsonb_build_object('confirmed', false);
  END IF;

  SELECT start_date INTO v_start FROM experience_launch WHERE client_slug = p_client_slug;

  IF v_start IS NULL THEN
    RETURN jsonb_build_object('confirmed', false);
  END IF;

  RETURN jsonb_build_object('confirmed', true, 'start_date', v_start::TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Function: set_launch_start_date
--    - The operator or their coach can set the date once.
--    - Admins and PSMs can set or change it at any time.
--    The date is also copied to user_plans.cohort_start_date so the weekly
--    emails follow the same calendar.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_launch_start_date(
  p_client_slug TEXT,
  p_start_date DATE
)
RETURNS JSONB AS $$
DECLARE
  v_email  TEXT := auth.jwt() ->> 'email';
  v_access TEXT := experience_launch_access(p_client_slug);
  v_existing DATE;
BEGIN
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please sign in again, then choose your start date.');
  END IF;

  IF v_access IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your account does not have access to this dashboard. Please ask your coach to check your invitation.');
  END IF;

  IF p_start_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please choose a date.');
  END IF;

  SELECT start_date INTO v_existing FROM experience_launch WHERE client_slug = p_client_slug;

  IF v_existing IS NOT NULL AND v_access <> 'staff' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Your start date is already set. Ask your coach if it needs to change.',
      'current_date', v_existing::TEXT
    );
  END IF;

  IF v_access <> 'staff' AND p_start_date < CURRENT_DATE - 7 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please choose a start date that is not more than a week in the past.');
  END IF;

  INSERT INTO experience_launch (client_slug, start_date, set_by, set_at)
  VALUES (p_client_slug, p_start_date, v_email, now())
  ON CONFLICT (client_slug) DO UPDATE
    SET start_date = EXCLUDED.start_date, set_by = EXCLUDED.set_by, set_at = EXCLUDED.set_at;

  UPDATE user_plans
  SET cohort_start_date = p_start_date
  WHERE client_slug = p_client_slug
    AND active = true;

  RETURN jsonb_build_object('success', true, 'client_slug', p_client_slug, 'launch_date', p_start_date::TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION set_launch_start_date(TEXT, DATE) IS
  'Confirms the launch roadmap start date for an experience project. The operator or coach can set it once; staff can change it.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Permissions
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION experience_launch_access(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_launch_start_date(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION set_launch_start_date(TEXT, DATE) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_launch_start_date(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION set_launch_start_date(TEXT, DATE) TO authenticated, service_role;

-- Tell the API about the new functions straight away
NOTIFY pgrst, 'reload schema';
