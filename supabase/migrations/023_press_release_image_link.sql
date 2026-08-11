-- Optional external image URL on press releases (editor "Image link" field).
ALTER TABLE press_releases
  ADD COLUMN IF NOT EXISTS image_link text;

COMMENT ON COLUMN press_releases.image_link IS
  'Optional external image URL entered in the draft editor.';
