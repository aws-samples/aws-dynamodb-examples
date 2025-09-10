-- Migration: Add image_url column to products table
-- This migration adds the image_url field to support product images

ALTER TABLE products 
ADD COLUMN image_url VARCHAR(500) NULL 
AFTER inventory_quantity;

-- Add some sample image URLs to existing products if they exist
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&h=500&fit=crop' WHERE name LIKE '%Laptop%' AND image_url IS NULL;
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&h=500&fit=crop' WHERE name LIKE '%Novel%' AND image_url IS NULL;
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=500&fit=crop' WHERE name LIKE '%Mixer%' AND image_url IS NULL;
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&h=500&fit=crop' WHERE name LIKE '%Jeans%' AND image_url IS NULL;
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&h=500&fit=crop' WHERE name LIKE '%Dumbbell%' AND image_url IS NULL;
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500&h=500&fit=crop' WHERE name LIKE '%Drill%' AND image_url IS NULL;