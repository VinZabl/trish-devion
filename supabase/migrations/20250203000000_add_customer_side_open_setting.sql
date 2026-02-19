-- Add customer_side_open site setting (admin can open/close customer side from header)
INSERT INTO site_settings (id, value, type, description, updated_at)
VALUES ('customer_side_open', 'true', 'text', 'Customer side open: true or false (admin toggle on homepage header)', now())
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = EXCLUDED.updated_at;
