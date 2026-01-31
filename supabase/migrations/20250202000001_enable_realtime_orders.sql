-- Enable Supabase Realtime for the orders table (postgres_changes).
-- If you see "already member of publication", realtime was already enabled.
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
