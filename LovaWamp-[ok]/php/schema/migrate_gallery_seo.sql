-- ================================================================
-- Migration: Add SEO fields to media_gallery
-- Run this if you're upgrading from an older version
-- ================================================================

-- Add SEO columns to media_gallery if they don't exist
ALTER TABLE `media_gallery` 
ADD COLUMN `alt_text` VARCHAR(255) NULL AFTER `name`,
ADD COLUMN `description` TEXT NULL AFTER `alt_text`;
