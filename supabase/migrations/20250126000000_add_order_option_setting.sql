-- Add order_option site setting
INSERT INTO site_settings (id, value, type, description, updated_at)
VALUES ('order_option', 'order_via_messenger', 'text', 'Order option: order_via_messenger or place_order', now())
ON CONFLICT (id) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = EXCLUDED.updated_at;
