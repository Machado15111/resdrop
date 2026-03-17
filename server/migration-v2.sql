-- ResDrop v2 Migration: Profile & Booking enhancements
-- Run in Supabase SQL Editor

-- Users: profile enhancements
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_room_type TEXT DEFAULT 'Standard Room';
ALTER TABLE users ADD COLUMN IF NOT EXISTS loyalty_programs JSONB DEFAULT '[]'::jsonb;

-- Bookings: custom room type for "Other" selection
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS room_type_custom TEXT;
