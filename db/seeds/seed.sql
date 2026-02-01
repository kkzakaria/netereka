-- Categories
INSERT INTO categories (id, name, slug, description, sort_order) VALUES
  ('cat_smartphones', 'Smartphones', 'smartphones', 'Téléphones portables et smartphones', 1),
  ('cat_ordinateurs', 'Ordinateurs', 'ordinateurs', 'Ordinateurs portables et de bureau', 2),
  ('cat_gaming', 'Gaming', 'gaming', 'Consoles et accessoires gaming', 3),
  ('cat_televisions', 'Télévisions', 'televisions', 'Télévisions et écrans', 4),
  ('cat_tablettes', 'Tablettes', 'tablettes', 'Tablettes tactiles', 5),
  ('cat_accessoires', 'Accessoires', 'accessoires', 'Accessoires électroniques', 6);

-- Delivery zones (Abidjan)
INSERT INTO delivery_zones (id, name, commune, fee, estimated_hours) VALUES
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

-- Products
INSERT INTO products (id, category_id, name, slug, description, short_description, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES
  ('prod_iphone15pro', 'cat_smartphones', 'iPhone 15 Pro', 'iphone-15-pro', 'iPhone 15 Pro avec puce A17 Pro, système de caméra pro et design en titane.', 'Le smartphone le plus avancé d''Apple', 850000, 950000, 'APPL-IP15P', 'Apple', 1, 1, 25),
  ('prod_galaxys24', 'cat_smartphones', 'Samsung Galaxy S24 Ultra', 'samsung-galaxy-s24-ultra', 'Galaxy S24 Ultra avec Galaxy AI, S Pen intégré et caméra 200MP.', 'L''intelligence artificielle au bout des doigts', 750000, 820000, 'SAMS-GS24U', 'Samsung', 1, 1, 30),
  ('prod_macbookair', 'cat_ordinateurs', 'MacBook Air M3', 'macbook-air-m3', 'MacBook Air avec puce M3, écran Liquid Retina 13.6 pouces, 8Go RAM.', 'Puissance et légèreté', 950000, 1050000, 'APPL-MBA-M3', 'Apple', 1, 1, 15),
  ('prod_ps5', 'cat_gaming', 'PlayStation 5', 'playstation-5', 'Console PlayStation 5 avec manette DualSense et SSD ultra-rapide.', 'La nouvelle génération du gaming', 450000, 500000, 'SONY-PS5', 'Sony', 1, 1, 20),
  ('prod_ipadair', 'cat_tablettes', 'iPad Air M2', 'ipad-air-m2', 'iPad Air avec puce M2, écran Liquid Retina 10.9 pouces.', 'Puissance et polyvalence', 520000, 580000, 'APPL-IPAM2', 'Apple', 1, 0, 18),
  ('prod_airpodspro', 'cat_accessoires', 'AirPods Pro 2', 'airpods-pro-2', 'AirPods Pro avec puce H2, réduction active du bruit et audio adaptatif.', 'Un son immersif', 180000, 210000, 'APPL-APP2', 'Apple', 1, 1, 50);

-- Product variants
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES
  ('var_ip15p_256', 'prod_iphone15pro', '256 Go - Titane Naturel', 'APPL-IP15P-256-NAT', 850000, 10, '{"storage":"256 Go","color":"Titane Naturel"}'),
  ('var_ip15p_512', 'prod_iphone15pro', '512 Go - Titane Naturel', 'APPL-IP15P-512-NAT', 1050000, 8, '{"storage":"512 Go","color":"Titane Naturel"}'),
  ('var_ip15p_256b', 'prod_iphone15pro', '256 Go - Titane Bleu', 'APPL-IP15P-256-BLU', 850000, 7, '{"storage":"256 Go","color":"Titane Bleu"}'),
  ('var_gs24_256', 'prod_galaxys24', '256 Go - Gris Titane', 'SAMS-GS24U-256-GRY', 750000, 15, '{"storage":"256 Go","color":"Gris Titane"}'),
  ('var_gs24_512', 'prod_galaxys24', '512 Go - Violet Titane', 'SAMS-GS24U-512-VIO', 900000, 10, '{"storage":"512 Go","color":"Violet Titane"}'),
  ('var_mba_8gb', 'prod_macbookair', '8 Go / 256 Go - Minuit', 'APPL-MBA-M3-8-256', 950000, 8, '{"ram":"8 Go","storage":"256 Go","color":"Minuit"}'),
  ('var_mba_16gb', 'prod_macbookair', '16 Go / 512 Go - Lumière Stellaire', 'APPL-MBA-M3-16-512', 1250000, 5, '{"ram":"16 Go","storage":"512 Go","color":"Lumière Stellaire"}'),
  ('var_ps5_disc', 'prod_ps5', 'Édition Standard (Disque)', 'SONY-PS5-DISC', 450000, 12, '{"edition":"Standard"}'),
  ('var_ps5_digital', 'prod_ps5', 'Édition Numérique', 'SONY-PS5-DIGI', 380000, 8, '{"edition":"Numérique"}');

-- Product images (placeholder URLs)
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES
  ('img_ip15p_1', 'prod_iphone15pro', '/images/products/iphone-15-pro-1.webp', 'iPhone 15 Pro - Vue face', 0, 1),
  ('img_gs24_1', 'prod_galaxys24', '/images/products/galaxy-s24-ultra-1.webp', 'Galaxy S24 Ultra - Vue face', 0, 1),
  ('img_mba_1', 'prod_macbookair', '/images/products/macbook-air-m3-1.webp', 'MacBook Air M3 - Vue ouverte', 0, 1),
  ('img_ps5_1', 'prod_ps5', '/images/products/ps5-1.webp', 'PlayStation 5 - Vue face', 0, 1),
  ('img_ipam2_1', 'prod_ipadair', '/images/products/ipad-air-m2-1.webp', 'iPad Air M2 - Vue face', 0, 1),
  ('img_app2_1', 'prod_airpodspro', '/images/products/airpods-pro-2-1.webp', 'AirPods Pro 2 - Vue boîtier', 0, 1);
