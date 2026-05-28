-- =============================================================================
-- SEED DATA — 5 demo agents + 20 listings (Metro Manila / Calabarzon)
-- Run automatically by `supabase db reset` after the schema migration.
-- =============================================================================

-- ---- Agents ----------------------------------------------------------------
insert into agents (name, avatar_url, status) values
  ('Maria Santos',     'https://i.pravatar.cc/150?u=maria',   'available'),
  ('Juan Dela Cruz',   'https://i.pravatar.cc/150?u=juan',    'available'),
  ('Andrea Reyes',     'https://i.pravatar.cc/150?u=andrea',  'available'),
  ('Miguel Torres',    'https://i.pravatar.cc/150?u=miguel',  'available'),
  ('Bea Aquino',       'https://i.pravatar.cc/150?u=bea',     'away');

-- ---- Listings --------------------------------------------------------------
-- Helper for placeholder images: https://placehold.co/600x400?text=...
insert into listings (title, type, city, price, bedrooms, bathrooms, floor_area_sqm, status, image_urls, description) values
  ('1BR Condo at The Gentry Residences', 'condo', 'Makati', 8500000, 1, 1, 38, 'available',
    '["https://placehold.co/600x400?text=Gentry+1BR+a","https://placehold.co/600x400?text=Gentry+1BR+b"]',
    'Fully furnished 1-bedroom unit walking distance to Ayala Triangle. High floor, city view.'),

  ('Studio at Air Residences', 'condo', 'Makati', 6200000, 0, 1, 23, 'available',
    '["https://placehold.co/600x400?text=Air+Studio"]',
    'Compact studio in the heart of the CBD. Ideal for young professionals or rental investment.'),

  ('2BR Condo at Uptown Parksuites', 'condo', 'Taguig', 18500000, 2, 2, 75, 'available',
    '["https://placehold.co/600x400?text=Uptown+2BR+a","https://placehold.co/600x400?text=Uptown+2BR+b"]',
    'Premium 2-bedroom in BGC Uptown. Connected to Uptown Mall via covered walkway.'),

  ('3BR Penthouse at Grand Hyatt Residences', 'condo', 'Taguig', 45000000, 3, 4, 180, 'available',
    '["https://placehold.co/600x400?text=Hyatt+PH+a","https://placehold.co/600x400?text=Hyatt+PH+b"]',
    'Luxury penthouse with panoramic BGC skyline views. Two parking slots included.'),

  ('1BR Condo at Avida Towers Verte', 'condo', 'Taguig', 9800000, 1, 1, 42, 'reserved',
    '["https://placehold.co/600x400?text=Avida+Verte"]',
    'Modern 1BR in BGC, near schools and offices. Currently reserved.'),

  ('Studio at Vinia Residences', 'condo', 'Quezon City', 4500000, 0, 1, 28, 'available',
    '["https://placehold.co/600x400?text=Vinia+Studio"]',
    'Affordable studio along EDSA, walking distance to MRT North Avenue.'),

  ('2BR Condo at The Magnolia Residences', 'condo', 'Quezon City', 11500000, 2, 2, 68, 'available',
    '["https://placehold.co/600x400?text=Magnolia+2BR+a","https://placehold.co/600x400?text=Magnolia+2BR+b"]',
    'Spacious 2BR atop Robinsons Magnolia mall. Family-friendly amenities.'),

  ('1BR Condo at Pioneer Woodlands', 'condo', 'Mandaluyong', 7200000, 1, 1, 40, 'available',
    '["https://placehold.co/600x400?text=Pioneer+1BR"]',
    'Near Boni MRT and Robinsons Forum. Great rental yield in the Ortigas-Makati corridor.'),

  ('3BR Condo at The Florence', 'condo', 'Taguig', 22000000, 3, 3, 110, 'sold',
    '["https://placehold.co/600x400?text=Florence+3BR"]',
    'Large 3BR in McKinley Hill, Tuscan-inspired township. Recently sold.'),

  ('4BR House and Lot at Ayala Alabang', 'house', 'Muntinlupa', 65000000, 4, 5, 420, 'available',
    '["https://placehold.co/600x400?text=Alabang+House+a","https://placehold.co/600x400?text=Alabang+House+b"]',
    'Elegant family home in a prime gated village. Mature garden, pool, 3-car garage.'),

  ('3BR House at BF Homes', 'house', 'Parañaque', 18000000, 3, 3, 220, 'available',
    '["https://placehold.co/600x400?text=BF+Homes+a","https://placehold.co/600x400?text=BF+Homes+b"]',
    'Renovated 3-bedroom home in BF Homes. Near Aguirre restaurants and schools.'),

  ('2BR Townhouse at Vista Verde', 'townhouse', 'Bacoor', 4200000, 2, 2, 90, 'available',
    '["https://placehold.co/600x400?text=Vista+Verde"]',
    'Affordable townhouse near Molino Boulevard. Flood-free, gated community.'),

  ('3BR Townhouse at Lancaster New City', 'townhouse', 'Imus', 5600000, 3, 2, 110, 'available',
    '["https://placehold.co/600x400?text=Lancaster+a","https://placehold.co/600x400?text=Lancaster+b"]',
    'House in master-planned community along Daang Hari. Easy access to CAVITEX.'),

  ('4BR House at Nuvali', 'house', 'Santa Rosa', 14500000, 4, 3, 250, 'available',
    '["https://placehold.co/600x400?text=Nuvali+a","https://placehold.co/600x400?text=Nuvali+b"]',
    'Eco-friendly community home near Solenad and Xavier School Nuvali.'),

  ('3BR House at Sta. Rosa Estates', 'house', 'Santa Rosa', 9800000, 3, 2, 160, 'reserved',
    '["https://placehold.co/600x400?text=Sta+Rosa+Estates"]',
    'Modern home in Laguna near Eton City. Currently reserved by a buyer.'),

  ('Residential Lot at Tagaytay Highlands', 'lot', 'Tagaytay', 12000000, null, null, 350, 'available',
    '["https://placehold.co/600x400?text=Tagaytay+Lot"]',
    'Premium lot with Taal Lake view in an exclusive mountain resort community.'),

  ('Residential Lot at Silang', 'lot', 'Silang', 2800000, null, null, 300, 'available',
    '["https://placehold.co/600x400?text=Silang+Lot"]',
    'Cool-climate lot near Tagaytay, ideal for a vacation home or investment.'),

  ('Commercial Lot along Aguinaldo Highway', 'lot', 'Imus', 18500000, null, null, 500, 'available',
    '["https://placehold.co/600x400?text=Aguinaldo+Lot"]',
    'High-traffic corner lot perfect for retail or food business.'),

  ('2BR Condo at SMDC Light Residences', 'condo', 'Mandaluyong', 6800000, 2, 1, 50, 'available',
    '["https://placehold.co/600x400?text=Light+2BR"]',
    'Connected to Boni MRT station. Resort-style amenities, ideal starter home.'),

  ('5BR House at Greenmeadows', 'house', 'Quezon City', 48000000, 5, 5, 500, 'available',
    '["https://placehold.co/600x400?text=Greenmeadows+a","https://placehold.co/600x400?text=Greenmeadows+b"]',
    'Grand family residence in an exclusive QC village. Pool, garden, 4-car garage.');
