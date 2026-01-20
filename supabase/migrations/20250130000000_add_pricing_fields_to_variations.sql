-- Add member_price, reseller_price, and credits_amount columns to variations table
DO $$
BEGIN
  -- Add member_price column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'variations' AND column_name = 'member_price'
  ) THEN
    ALTER TABLE variations ADD COLUMN member_price decimal(10,2) NULL;
  END IF;

  -- Add reseller_price column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'variations' AND column_name = 'reseller_price'
  ) THEN
    ALTER TABLE variations ADD COLUMN reseller_price decimal(10,2) NULL;
  END IF;

  -- Add credits_amount column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'variations' AND column_name = 'credits_amount'
  ) THEN
    ALTER TABLE variations ADD COLUMN credits_amount integer NULL;
  END IF;
END $$;
