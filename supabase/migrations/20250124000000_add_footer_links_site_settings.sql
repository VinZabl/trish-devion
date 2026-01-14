/*
  # Add Footer Links to Site Settings

  Adds configurable footer links for the customer site:
  - footer_social_1 (Facebook)
  - footer_social_2 (Instagram)
  - footer_social_3 (Twitter/X)
  - footer_social_4 (YouTube)
  - footer_support_url (Customer Support)
*/

INSERT INTO site_settings (id, value, type, description)
VALUES
  ('footer_social_1', '', 'text', 'Footer social media link 1 (Facebook URL)'),
  ('footer_social_2', '', 'text', 'Footer social media link 2 (Instagram URL)'),
  ('footer_social_3', '', 'text', 'Footer social media link 3 (Twitter/X URL)'),
  ('footer_social_4', '', 'text', 'Footer social media link 4 (YouTube URL)'),
  ('footer_support_url', '', 'text', 'Footer customer support link (URL or tel:)')
ON CONFLICT (id) DO NOTHING;
