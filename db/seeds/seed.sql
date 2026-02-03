-- ==============================================
-- Test Users (Better Auth format)
-- Password for all test users: Test123!
-- ==============================================

-- Super Admin user
INSERT OR IGNORE INTO "user" (id, name, email, emailVerified, phone, role, createdAt, updatedAt) VALUES
  ('user_superadmin_test', 'Super Admin', 'superadmin@netereka.test', 1, '+225 07 00 00 00 00', 'super_admin', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO "account" (id, accountId, providerId, userId, password, createdAt, updatedAt) VALUES
  ('acc_superadmin_test', 'user_superadmin_test', 'credential', 'user_superadmin_test', '1b36de10dce816b4372079c0fca95684:1ecdfbe2b0885c427ab4b6ce2c716da65b58dcae0a59b1e79cd100c754ebcb905f38168d5952f7b3cb53f8131e2d8ab8bccae7973a4cf108f0abbbd0667d986b', datetime('now'), datetime('now'));

-- Admin user
INSERT OR IGNORE INTO "user" (id, name, email, emailVerified, phone, role, createdAt, updatedAt) VALUES
  ('user_admin_test', 'Admin Test', 'admin@netereka.test', 1, '+225 07 00 00 00 01', 'admin', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO "account" (id, accountId, providerId, userId, password, createdAt, updatedAt) VALUES
  ('acc_admin_test', 'user_admin_test', 'credential', 'user_admin_test', '1b36de10dce816b4372079c0fca95684:1ecdfbe2b0885c427ab4b6ce2c716da65b58dcae0a59b1e79cd100c754ebcb905f38168d5952f7b3cb53f8131e2d8ab8bccae7973a4cf108f0abbbd0667d986b', datetime('now'), datetime('now'));

-- Customer user
INSERT OR IGNORE INTO "user" (id, name, email, emailVerified, phone, role, createdAt, updatedAt) VALUES
  ('user_client_test', 'Client Test', 'client@test.com', 1, '+225 07 00 00 00 02', 'customer', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO "account" (id, accountId, providerId, userId, password, createdAt, updatedAt) VALUES
  ('acc_client_test', 'user_client_test', 'credential', 'user_client_test', '1b36de10dce816b4372079c0fca95684:1ecdfbe2b0885c427ab4b6ce2c716da65b58dcae0a59b1e79cd100c754ebcb905f38168d5952f7b3cb53f8131e2d8ab8bccae7973a4cf108f0abbbd0667d986b', datetime('now'), datetime('now'));

-- ==============================================
-- Team Members (admins and super_admins profiles)
-- ==============================================

INSERT OR IGNORE INTO team_members (id, user_id, first_name, last_name, phone, job_title, is_active, created_at, updated_at) VALUES
  ('team_superadmin', 'user_superadmin_test', 'Super', 'Admin', '+225 07 00 00 00 00', 'Directeur', 1, datetime('now'), datetime('now')),
  ('team_admin', 'user_admin_test', 'Admin', 'Test', '+225 07 00 00 00 01', 'Gestionnaire de commandes', 1, datetime('now'), datetime('now'));

-- ==============================================
-- Customers (shop clients profiles)
-- ==============================================

INSERT OR IGNORE INTO customers (id, user_id, first_name, last_name, phone, loyalty_points, is_active, created_at, updated_at) VALUES
  ('cust_client_test', 'user_client_test', 'Client', 'Test', '+225 07 00 00 00 02', 0, 1, datetime('now'), datetime('now'));

-- ==============================================
-- Categories
-- ==============================================

INSERT OR IGNORE INTO categories (id, name, slug, description, sort_order) VALUES
  ('cat_smartphones', 'Smartphones', 'smartphones', 'Téléphones portables et smartphones', 1),
  ('cat_ordinateurs', 'Ordinateurs', 'ordinateurs', 'Ordinateurs portables et de bureau', 2),
  ('cat_gaming', 'Gaming', 'gaming', 'Consoles et accessoires gaming', 3),
  ('cat_televisions', 'Télévisions', 'televisions', 'Télévisions et écrans', 4),
  ('cat_tablettes', 'Tablettes', 'tablettes', 'Tablettes tactiles', 5),
  ('cat_accessoires', 'Accessoires', 'accessoires', 'Accessoires électroniques', 6);

-- ==============================================
-- Delivery zones (Abidjan)
-- ==============================================

INSERT OR IGNORE INTO delivery_zones (id, name, commune, fee, estimated_hours) VALUES
  ('zone_cocody', 'Cocody', 'Cocody', 1500, 24),
  ('zone_plateau', 'Plateau', 'Plateau', 1000, 24),
  ('zone_marcory', 'Marcory', 'Marcory', 1500, 24),
  ('zone_treichville', 'Treichville', 'Treichville', 1500, 24),
  ('zone_adjame', 'Adjamé', 'Adjamé', 2000, 48),
  ('zone_yopougon', 'Yopougon', 'Yopougon', 2500, 48),
  ('zone_abobo', 'Abobo', 'Abobo', 2500, 48),
  ('zone_koumassi', 'Koumassi', 'Koumassi', 2000, 48),
  ('zone_portbouet', 'Port-Bouët', 'Port-Bouët', 2000, 48),
  ('zone_bingerville', 'Bingerville', 'Bingerville', 3000, 72);

-- ==============================================
-- Products
-- ==============================================

INSERT OR IGNORE INTO products (id, category_id, name, slug, description, short_description, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES
  ('prod_iphone15pro', 'cat_smartphones', 'iPhone 15 Pro', 'iphone-15-pro', 'iPhone 15 Pro avec puce A17 Pro, système de caméra pro et design en titane.', 'Le smartphone le plus avancé d''Apple', 850000, 950000, 'APPL-IP15P', 'Apple', 1, 1, 25),
  ('prod_galaxys24', 'cat_smartphones', 'Samsung Galaxy S24 Ultra', 'samsung-galaxy-s24-ultra', 'Galaxy S24 Ultra avec Galaxy AI, S Pen intégré et caméra 200MP.', 'L''intelligence artificielle au bout des doigts', 750000, 820000, 'SAMS-GS24U', 'Samsung', 1, 1, 30),
  ('prod_macbookair', 'cat_ordinateurs', 'MacBook Air M3', 'macbook-air-m3', 'MacBook Air avec puce M3, écran Liquid Retina 13.6 pouces, 8Go RAM.', 'Puissance et légèreté', 950000, 1050000, 'APPL-MBA-M3', 'Apple', 1, 1, 15),
  ('prod_ps5', 'cat_gaming', 'PlayStation 5', 'playstation-5', 'Console PlayStation 5 avec manette DualSense et SSD ultra-rapide.', 'La nouvelle génération du gaming', 450000, 500000, 'SONY-PS5', 'Sony', 1, 1, 20),
  ('prod_ipadair', 'cat_tablettes', 'iPad Air M2', 'ipad-air-m2', 'iPad Air avec puce M2, écran Liquid Retina 10.9 pouces.', 'Puissance et polyvalence', 520000, 580000, 'APPL-IPAM2', 'Apple', 1, 0, 18),
  ('prod_airpodspro', 'cat_accessoires', 'AirPods Pro 2', 'airpods-pro-2', 'AirPods Pro avec puce H2, réduction active du bruit et audio adaptatif.', 'Un son immersif', 180000, 210000, 'APPL-APP2', 'Apple', 1, 1, 50);

-- ==============================================
-- Product variants
-- ==============================================

INSERT OR IGNORE INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES
  ('var_ip15p_256', 'prod_iphone15pro', '256 Go - Titane Naturel', 'APPL-IP15P-256-NAT', 850000, 10, '{"storage":"256 Go","color":"Titane Naturel"}'),
  ('var_ip15p_512', 'prod_iphone15pro', '512 Go - Titane Naturel', 'APPL-IP15P-512-NAT', 1050000, 8, '{"storage":"512 Go","color":"Titane Naturel"}'),
  ('var_ip15p_256b', 'prod_iphone15pro', '256 Go - Titane Bleu', 'APPL-IP15P-256-BLU', 850000, 7, '{"storage":"256 Go","color":"Titane Bleu"}'),
  ('var_gs24_256', 'prod_galaxys24', '256 Go - Gris Titane', 'SAMS-GS24U-256-GRY', 750000, 15, '{"storage":"256 Go","color":"Gris Titane"}'),
  ('var_gs24_512', 'prod_galaxys24', '512 Go - Violet Titane', 'SAMS-GS24U-512-VIO', 900000, 10, '{"storage":"512 Go","color":"Violet Titane"}'),
  ('var_mba_8gb', 'prod_macbookair', '8 Go / 256 Go - Minuit', 'APPL-MBA-M3-8-256', 950000, 8, '{"ram":"8 Go","storage":"256 Go","color":"Minuit"}'),
  ('var_mba_16gb', 'prod_macbookair', '16 Go / 512 Go - Lumière Stellaire', 'APPL-MBA-M3-16-512', 1250000, 5, '{"ram":"16 Go","storage":"512 Go","color":"Lumière Stellaire"}'),
  ('var_ps5_disc', 'prod_ps5', 'Édition Standard (Disque)', 'SONY-PS5-DISC', 450000, 12, '{"edition":"Standard"}'),
  ('var_ps5_digital', 'prod_ps5', 'Édition Numérique', 'SONY-PS5-DIGI', 380000, 8, '{"edition":"Numérique"}');

-- ==============================================
-- Product images (placeholder URLs)
-- ==============================================

INSERT OR IGNORE INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES
  ('img_ip15p_1', 'prod_iphone15pro', '/images/products/iphone-15-pro-1.webp', 'iPhone 15 Pro - Vue face', 0, 1),
  ('img_gs24_1', 'prod_galaxys24', '/images/products/galaxy-s24-ultra-1.webp', 'Galaxy S24 Ultra - Vue face', 0, 1),
  ('img_mba_1', 'prod_macbookair', '/images/products/macbook-air-m3-1.webp', 'MacBook Air M3 - Vue ouverte', 0, 1),
  ('img_ps5_1', 'prod_ps5', '/images/products/ps5-1.webp', 'PlayStation 5 - Vue face', 0, 1),
  ('img_ipam2_1', 'prod_ipadair', '/images/products/ipad-air-m2-1.webp', 'iPad Air M2 - Vue face', 0, 1),
  ('img_app2_1', 'prod_airpodspro', '/images/products/airpods-pro-2-1.webp', 'AirPods Pro 2 - Vue boîtier', 0, 1);

-- ==============================================
-- Sample Orders for testing
-- ==============================================

-- Pending order
INSERT OR IGNORE INTO orders (id, user_id, order_number, status, subtotal, delivery_fee, discount_amount, total, delivery_address, delivery_commune, delivery_phone, created_at, updated_at) VALUES
  ('order_test_1', 'user_client_test', 'ORD-TEST001', 'pending', 850000, 1500, 0, 851500, '123 Rue Test, Cocody', 'Cocody', '+225 07 00 00 00 02', datetime('now', '-2 hours'), datetime('now', '-2 hours'));

INSERT OR IGNORE INTO order_items (id, order_id, product_id, variant_id, product_name, variant_name, quantity, unit_price, total_price) VALUES
  ('item_test_1', 'order_test_1', 'prod_iphone15pro', 'var_ip15p_256', 'iPhone 15 Pro', '256 Go - Titane Naturel', 1, 850000, 850000);

-- Confirmed order
INSERT OR IGNORE INTO orders (id, user_id, order_number, status, subtotal, delivery_fee, discount_amount, total, delivery_address, delivery_commune, delivery_phone, confirmed_at, created_at, updated_at) VALUES
  ('order_test_2', 'user_client_test', 'ORD-TEST002', 'confirmed', 750000, 2000, 0, 752000, '456 Avenue Demo, Yopougon', 'Yopougon', '+225 07 00 00 00 02', datetime('now', '-1 hour'), datetime('now', '-1 day'), datetime('now', '-1 hour'));

INSERT OR IGNORE INTO order_items (id, order_id, product_id, variant_id, product_name, variant_name, quantity, unit_price, total_price) VALUES
  ('item_test_2', 'order_test_2', 'prod_galaxys24', 'var_gs24_256', 'Samsung Galaxy S24 Ultra', '256 Go - Gris Titane', 1, 750000, 750000);

-- Shipping order
INSERT OR IGNORE INTO orders (id, user_id, order_number, status, subtotal, delivery_fee, discount_amount, total, delivery_address, delivery_commune, delivery_phone, confirmed_at, preparing_at, shipping_at, created_at, updated_at) VALUES
  ('order_test_3', 'user_client_test', 'ORD-TEST003', 'shipping', 450000, 1500, 0, 451500, '789 Boulevard Sample, Marcory', 'Marcory', '+225 07 00 00 00 02', datetime('now', '-2 days'), datetime('now', '-1 day'), datetime('now', '-12 hours'), datetime('now', '-3 days'), datetime('now', '-12 hours'));

INSERT OR IGNORE INTO order_items (id, order_id, product_id, variant_id, product_name, variant_name, quantity, unit_price, total_price) VALUES
  ('item_test_3', 'order_test_3', 'prod_ps5', 'var_ps5_disc', 'PlayStation 5', 'Édition Standard (Disque)', 1, 450000, 450000);

-- Delivered order
INSERT OR IGNORE INTO orders (id, user_id, order_number, status, subtotal, delivery_fee, discount_amount, total, delivery_address, delivery_commune, delivery_phone, confirmed_at, preparing_at, shipping_at, delivered_at, created_at, updated_at) VALUES
  ('order_test_4', 'user_client_test', 'ORD-TEST004', 'delivered', 180000, 1000, 0, 181000, '321 Rue Exemple, Plateau', 'Plateau', '+225 07 00 00 00 02', datetime('now', '-7 days'), datetime('now', '-6 days'), datetime('now', '-5 days'), datetime('now', '-4 days'), datetime('now', '-8 days'), datetime('now', '-4 days'));

INSERT OR IGNORE INTO order_items (id, order_id, product_id, variant_id, product_name, variant_name, quantity, unit_price, total_price) VALUES
  ('item_test_4', 'order_test_4', 'prod_airpodspro', NULL, 'AirPods Pro 2', NULL, 1, 180000, 180000);

-- Cancelled order
INSERT OR IGNORE INTO orders (id, user_id, order_number, status, subtotal, delivery_fee, discount_amount, total, delivery_address, delivery_commune, delivery_phone, cancelled_at, cancellation_reason, created_at, updated_at) VALUES
  ('order_test_5', 'user_client_test', 'ORD-TEST005', 'cancelled', 520000, 2500, 0, 522500, '654 Allée Test, Abobo', 'Abobo', '+225 07 00 00 00 02', datetime('now', '-3 days'), 'Client a changé d''avis', datetime('now', '-4 days'), datetime('now', '-3 days'));

INSERT OR IGNORE INTO order_items (id, order_id, product_id, variant_id, product_name, variant_name, quantity, unit_price, total_price) VALUES
  ('item_test_5', 'order_test_5', 'prod_ipadair', NULL, 'iPad Air M2', NULL, 1, 520000, 520000);
