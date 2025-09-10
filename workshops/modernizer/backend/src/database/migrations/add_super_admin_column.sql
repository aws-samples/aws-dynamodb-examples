-- Migration: Add super admin column to users table
-- Date: 2025-08-16

ALTER TABLE users 
ADD COLUMN super_admin BOOLEAN DEFAULT FALSE AFTER is_seller;

-- Add index for super admin column
CREATE INDEX idx_super_admin ON users(is_super_admin);

-- Update any existing admin users if needed
-- UPDATE users SET is_super_admin = TRUE WHERE username = 'admin';
