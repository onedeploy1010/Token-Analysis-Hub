-- Member tagging — admin-side annotation system. Lets admins group wallets
-- (e.g. "一线领导", "VIP", "嫌疑账户") and filter every list page by tag.
--
-- Tags are admin-private metadata: they have NO on-chain meaning and are
-- never surfaced to end-users. The chain_id is denormalized onto each
-- assignment so the same address bound to both mainnet and testnet stays
-- separately tagged, matching the pattern used by every other rune_* table.
--
-- Schema is split in two:
--   admin_member_tags             — the catalogue (id, name, color, desc)
--   admin_member_tag_assignments  — many-to-many (which addresses carry which tag,
--                                   plus a free-form note per assignment)
--
-- Cascade: deleting a tag removes all its assignments. There is no equivalent
-- FK to rune_members because member rows are added by the indexer and the
-- admin may want to pre-tag an address that hasn't bound a referrer yet.

DROP TABLE IF EXISTS admin_member_tag_assignments CASCADE;
DROP TABLE IF EXISTS admin_member_tags CASCADE;

CREATE TABLE admin_member_tags (
  id          serial PRIMARY KEY,
  name        text   NOT NULL,
  color       text   NOT NULL DEFAULT '#fbbf24',
  description text,
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX admin_member_tags_name_uq ON admin_member_tags(name);

CREATE TABLE admin_member_tag_assignments (
  id            serial PRIMARY KEY,
  tag_id        integer NOT NULL REFERENCES admin_member_tags(id) ON DELETE CASCADE,
  chain_id      integer NOT NULL,
  user_address  text    NOT NULL,
  note          text,
  created_by    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX admin_member_tag_assignments_uq
  ON admin_member_tag_assignments(tag_id, chain_id, user_address);
CREATE INDEX admin_member_tag_assignments_user_idx
  ON admin_member_tag_assignments(chain_id, user_address);
CREATE INDEX admin_member_tag_assignments_tag_idx
  ON admin_member_tag_assignments(tag_id);

-- Optional starter tags so the page isn't empty on first load. Admins can
-- delete or rename any of these.
INSERT INTO admin_member_tags(name, color, description) VALUES
  ('一线领导', '#fbbf24', '直接对接组织线的核心推广者'),
  ('VIP',       '#c084fc', '重点维护的大额会员'),
  ('观察',       '#60a5fa', '需要持续跟踪的账户'),
  ('风险',       '#f87171', '存在异常行为或链上证据，需复核')
ON CONFLICT (name) DO NOTHING;
