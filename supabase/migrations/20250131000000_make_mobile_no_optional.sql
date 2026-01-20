-- Make mobile_no optional in members table
ALTER TABLE members 
ALTER COLUMN mobile_no DROP NOT NULL;
