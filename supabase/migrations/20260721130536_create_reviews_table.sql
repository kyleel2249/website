/*
# Create reviews table (single-tenant, no auth)

1. Purpose
- Stores visitor-submitted reviews of Cintexa that are displayed publicly on
  the homepage. This is a single-tenant, no-auth app: there is no sign-in
  screen, so the frontend operates entirely as the `anon` role.

2. New Tables
- `reviews`
  - `id` (uuid, primary key, defaults to gen_random_uuid())
  - `name` (text, not null) — reviewer display name
  - `company` (text, nullable) — optional company affiliation
  - `rating` (smallint, not null, CHECK 1..5) — star rating
  - `text` (text, not null) — review body
  - `approved` (boolean, default true) — moderation flag; defaults to true so
    reviews are visible immediately (matches existing UX where submitted
    reviews appear live). Can be flipped to false later if moderation is added.
  - `created_at` (timestamptz, default now()) — submission timestamp

3. Indexes
- `reviews_created_at_desc_index` on `created_at DESC` — the homepage lists
  reviews newest-first, so this index supports the common query path.

4. Security (RLS)
- Enable RLS on `reviews`.
- SELECT policy (`TO anon, authenticated`): anyone can read approved reviews.
  Unapproved reviews are hidden from anon/authenticated (only the service role
  can see them, e.g. for moderation).
- INSERT policy (`TO anon, authenticated`): anyone can submit a review. This is
  intentional for a public review form with no sign-in.
- No UPDATE or DELETE policies: visitors cannot edit or remove reviews once
  submitted. Only the service role can, which is appropriate for moderation.
- `USING (true)` / `WITH CHECK (true)` is acceptable here because the reviews
  table is intentionally public/shared (single-tenant, no auth) and the
  SELECT policy additionally filters on `approved = true`.

5. Notes
- No `user_id` column and no `auth.uid()` usage — this is a no-auth app.
- `approved` defaults to `true` so the existing frontend behavior (submitted
  reviews appear immediately) keeps working without a moderation step.
*/

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text text NOT NULL,
  approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_created_at_desc_index
  ON reviews (created_at DESC);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_approved_reviews" ON reviews;
CREATE POLICY "anon_select_approved_reviews" ON reviews
  FOR SELECT TO anon, authenticated
  USING (approved = true);

DROP POLICY IF EXISTS "anon_insert_reviews" ON reviews;
CREATE POLICY "anon_insert_reviews" ON reviews
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
