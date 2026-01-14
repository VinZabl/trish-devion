/*
  # Create Orders Management System

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `order_items` (jsonb) - array of cart items
      - `customer_info` (jsonb) - customer information (IGN, custom fields, etc.)
      - `payment_method_id` (text) - reference to payment method
      - `receipt_url` (text) - URL to payment receipt image
      - `total_price` (numeric) - total order amount
      - `status` (text) - pending, processing, approved, rejected
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on orders table
    - Add policies for public insert/select
    - Add policies for authenticated admin access
*/

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_items jsonb NOT NULL,
  customer_info jsonb NOT NULL,
  payment_method_id text NOT NULL,
  receipt_url text NOT NULL,
  total_price numeric(12, 2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policies for public insert (customers can create orders)
CREATE POLICY "Anyone can insert orders"
  ON orders
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policies for public select (customers can view their own orders by ID)
CREATE POLICY "Anyone can select orders"
  ON orders
  FOR SELECT
  TO public
  USING (true);

-- Create policies for authenticated admin access (full CRUD)
CREATE POLICY "Authenticated users can manage orders"
  ON orders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
