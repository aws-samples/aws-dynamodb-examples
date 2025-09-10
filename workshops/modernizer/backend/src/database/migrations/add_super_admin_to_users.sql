-- Migration: Add super_admin field to users table
-- Date: 2025-08-16
-- Description: Add super_admin boolean field to users table for feature flag management

USE online_shopping_store;

-- Add super_admin column to users table
ALTER TABLE users 
ADD COLUMN super_admin BOOLEAN DEFAULT FALSE AFTER is_seller;

-- Add index for super_admin field for performance
CREATE INDEX idx_super_admin ON users(super_admin);

-- Update the schema to reflect the change
-- The super_admin field will be used to control access to migration and feature flag APIs
