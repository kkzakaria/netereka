-- NETEREKA Product Catalogue (auto-generated)
-- DO NOT EDIT MANUALLY - regenerate with: npx tsx scripts/import-catalogue.ts

DELETE FROM product_images;
DELETE FROM product_variants;
DELETE FROM product_attributes;
DELETE FROM products;
DELETE FROM categories;

-- Categories
INSERT INTO categories (id, name, slug, description, sort_order) VALUES ('cat_smartphones', 'Smartphones', 'smartphones', 'Téléphones portables et smartphones', 1);
INSERT INTO categories (id, name, slug, description, sort_order) VALUES ('cat_ordinateurs', 'Ordinateurs', 'ordinateurs', 'Ordinateurs portables et de bureau', 2);
INSERT INTO categories (id, name, slug, description, sort_order) VALUES ('cat_tablettes', 'Tablettes', 'tablettes', 'Tablettes tactiles', 3);
INSERT INTO categories (id, name, slug, description, sort_order) VALUES ('cat_montres', 'Montres connectées', 'montres-connectees', 'Montres intelligentes et bracelets connectés', 4);
INSERT INTO categories (id, name, slug, description, sort_order) VALUES ('cat_ecouteurs', 'Écouteurs', 'ecouteurs', 'Écouteurs, casques et audio', 5);
INSERT INTO categories (id, name, slug, description, sort_order) VALUES ('cat_accessoires', 'Accessoires', 'accessoires', 'Accessoires électroniques', 6);
INSERT INTO categories (id, name, slug, description, sort_order) VALUES ('cat_jeux', 'Jeux', 'jeux', 'Consoles et jeux vidéo', 7);
INSERT INTO categories (id, name, slug, description, sort_order) VALUES ('cat_televiseurs', 'Téléviseurs', 'televiseurs', 'Télévisions et écrans', 8);
INSERT INTO categories (id, name, slug, description, sort_order) VALUES ('cat_projecteurs', 'Projecteurs', 'projecteurs', 'Vidéoprojecteurs', 9);

-- Products
INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_jAVzB87N2y', 'cat_smartphones', 'Google Pixel 10 Pro xl', 'google-pixel-10-pro-xl-C-u8Fi', 650000, 880000, 'GOOG-GR-TRE', 'Google', 1, 1, 90);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_QoUnAptbsg', 'prod_jAVzB87N2y', 'products/smartphones/google-pixel-10-pro-xl.webp', 'Google Pixel 10 Pro xl', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_h1az8DS3KQ', 'prod_jAVzB87N2y', 'Black - 256GB', 'GOOG-GR-TRE-ASSO', 650000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_nmxW6BC3bN', 'prod_jAVzB87N2y', 'Black - 512GB', 'GOOG-GR-TRE-SB1S', 765000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_tg-2_iWM7t', 'prod_jAVzB87N2y', 'Black - 1TB', 'GOOG-GR-TRE-MIDY', 880000, 10, '{"color":"Black","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_8BT8SCZ-X-', 'prod_jAVzB87N2y', 'White - 256GB', 'GOOG-GR-TRE-GY5B', 650000, 10, '{"color":"White","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_4p4Ldmfs9M', 'prod_jAVzB87N2y', 'White - 512GB', 'GOOG-GR-TRE-VUBM', 765000, 10, '{"color":"White","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_VUkUdpsEWc', 'prod_jAVzB87N2y', 'White - 1TB', 'GOOG-GR-TRE-XPW4', 880000, 10, '{"color":"White","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_2MYGPmIFjC', 'prod_jAVzB87N2y', 'Blue - 256GB', 'GOOG-GR-TRE-DYOV', 650000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_SphvinnXjs', 'prod_jAVzB87N2y', 'Blue - 512GB', 'GOOG-GR-TRE-WALE', 765000, 10, '{"color":"Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_NmFeMWyhpP', 'prod_jAVzB87N2y', 'Blue - 1TB', 'GOOG-GR-TRE-I0J4', 880000, 10, '{"color":"Blue","storage":"1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Pys5lHnZF3', 'cat_smartphones', 'Google Pixel 10 Pro 512Go', 'google-pixel-10-pro-512go-8rMfh4', 720000, NULL, 'GOOG-FEGEZX', 'Google', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_-70tz55E65', 'prod_Pys5lHnZF3', 'products/smartphones/google-pixel-10-pro-512go.webp', 'Google Pixel 10 Pro 512Go', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_spg29uG6JG', 'prod_Pys5lHnZF3', 'N/A - 512GB', 'GOOG-FEGEZX-BPBS', 720000, 10, '{"color":"N/A","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_wKRwyyj_ZV', 'cat_smartphones', 'Samsung Z TRIFOLD', 'samsung-z-trifold-W28cC_', 2900000, NULL, 'SAMS-SPJQRW', 'Samsung', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_5QD24iNx8U', 'prod_wKRwyyj_ZV', 'products/smartphones/samsung-z-trifold.webp', 'Samsung Z TRIFOLD', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_LEWrmcUfCf', 'prod_wKRwyyj_ZV', 'Black - 512GB', 'SAMS-SPJQRW-WDOR', 2900000, 10, '{"color":"Black","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_xpHJJ-6NXt', 'cat_smartphones', 'iPhone 17 Air', 'iphone-17-air-gfH9VC', 590000, NULL, 'APPL-CZOIZZ', 'Apple', 1, 1, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_tOT2R18RdC', 'prod_xpHJJ-6NXt', 'products/smartphones/iphone-17-air.webp', 'iPhone 17 Air', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_GYvUUdMwP2', 'prod_xpHJJ-6NXt', 'Black - 128GB', 'APPL-CZOIZZ-U53N', 590000, 10, '{"color":"Black","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_h_LQ86lBBd', 'prod_xpHJJ-6NXt', 'Black - 256GB', 'APPL-CZOIZZ-CAAN', 590000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_u9XYDcyJbk', 'prod_xpHJJ-6NXt', 'White - 128GB', 'APPL-CZOIZZ-AXE0', 590000, 10, '{"color":"White","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_sFYokAsvPw', 'prod_xpHJJ-6NXt', 'White - 256GB', 'APPL-CZOIZZ-13-H', 590000, 10, '{"color":"White","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Y3YMHWG0GA', 'prod_xpHJJ-6NXt', 'Blue - 128GB', 'APPL-CZOIZZ-HFIH', 590000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_gbM9buyKFC', 'prod_xpHJJ-6NXt', 'Blue - 256GB', 'APPL-CZOIZZ-SAB_', 590000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_FtVTl6DQVX', 'prod_xpHJJ-6NXt', 'Pink - 128GB', 'APPL-CZOIZZ-YDK1', 590000, 10, '{"color":"Pink","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_p6mA3WW-Zi', 'prod_xpHJJ-6NXt', 'Pink - 256GB', 'APPL-CZOIZZ-7ITC', 590000, 10, '{"color":"Pink","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_1h1b_5feVw', 'cat_smartphones', 'iPhone 17 Pro Max', 'iphone-17-pro-max-v7OqfC', 950000, 1260000, 'APPL-ARGGIH', 'Apple', 1, 1, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_1j7v8cVEM0', 'prod_1h1b_5feVw', 'products/smartphones/iphone-17-pro-max.webp', 'iPhone 17 Pro Max', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_8rmLW3Qj1x', 'prod_1h1b_5feVw', 'Black Titanium - 256GB', 'APPL-ARGGIH-A-_3', 950000, 10, '{"color":"Black Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_jTyRWCjgeH', 'prod_1h1b_5feVw', 'Black Titanium - 512GB', 'APPL-ARGGIH-Q3IW', 1105000, 10, '{"color":"Black Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_wSzWc8_SxB', 'prod_1h1b_5feVw', 'Black Titanium - 1TB', 'APPL-ARGGIH-UVFI', 1260000, 10, '{"color":"Black Titanium","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_e7P1Sf2MLN', 'prod_1h1b_5feVw', 'White Titanium - 256GB', 'APPL-ARGGIH-X8RU', 950000, 10, '{"color":"White Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_aRvdL-hgbE', 'prod_1h1b_5feVw', 'White Titanium - 512GB', 'APPL-ARGGIH-48KF', 1105000, 10, '{"color":"White Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_X-7KPVR5Ye', 'prod_1h1b_5feVw', 'White Titanium - 1TB', 'APPL-ARGGIH-QGRX', 1260000, 10, '{"color":"White Titanium","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_zM-JtF5eYx', 'prod_1h1b_5feVw', 'Desert Titanium - 256GB', 'APPL-ARGGIH-1VY4', 950000, 10, '{"color":"Desert Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_5CKgI5ZrGT', 'prod_1h1b_5feVw', 'Desert Titanium - 512GB', 'APPL-ARGGIH-ZIAW', 1105000, 10, '{"color":"Desert Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ayTqDwA_jE', 'prod_1h1b_5feVw', 'Desert Titanium - 1TB', 'APPL-ARGGIH-CCDD', 1260000, 10, '{"color":"Desert Titanium","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_bqRhzWcZPD', 'prod_1h1b_5feVw', 'Titanium Blue - 256GB', 'APPL-ARGGIH-UAAF', 950000, 10, '{"color":"Titanium Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_g-dxGWZscw', 'prod_1h1b_5feVw', 'Titanium Blue - 512GB', 'APPL-ARGGIH-OYTA', 1105000, 10, '{"color":"Titanium Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_IYUJcADIPA', 'prod_1h1b_5feVw', 'Titanium Blue - 1TB', 'APPL-ARGGIH-QTEX', 1260000, 10, '{"color":"Titanium Blue","storage":"1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_qS2qljmGU5', 'cat_smartphones', 'iPhone 17 Pro', 'iphone-17-pro-flo_Ir', 880000, 900000, 'APPL-NGVE0U', 'Apple', 1, 1, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_9fMmWorSpT', 'prod_qS2qljmGU5', 'products/smartphones/iphone-17-pro.webp', 'iPhone 17 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_rlHnUMG4F5', 'prod_qS2qljmGU5', 'Black Titanium - 256GB', 'APPL-NGVE0U-XKLX', 880000, 10, '{"color":"Black Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_-71KNjCpHr', 'prod_qS2qljmGU5', 'Black Titanium - 512GB', 'APPL-NGVE0U-0TTA', 900000, 10, '{"color":"Black Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_EJYnWYXn1R', 'prod_qS2qljmGU5', 'White Titanium - 256GB', 'APPL-NGVE0U-ATIH', 880000, 10, '{"color":"White Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Vn6EUcRikI', 'prod_qS2qljmGU5', 'White Titanium - 512GB', 'APPL-NGVE0U-OKNR', 900000, 10, '{"color":"White Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_M5H_qflOpv', 'prod_qS2qljmGU5', 'Desert Titanium - 256GB', 'APPL-NGVE0U-3500', 880000, 10, '{"color":"Desert Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_11gYvCpPtu', 'prod_qS2qljmGU5', 'Desert Titanium - 512GB', 'APPL-NGVE0U-8QDM', 900000, 10, '{"color":"Desert Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_IatxuM_T7o', 'prod_qS2qljmGU5', 'Titanium Blue - 256GB', 'APPL-NGVE0U-CDSU', 880000, 10, '{"color":"Titanium Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_SpSOSid18o', 'prod_qS2qljmGU5', 'Titanium Blue - 512GB', 'APPL-NGVE0U-K5DH', 900000, 10, '{"color":"Titanium Blue","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_74FPp8E8uj', 'cat_smartphones', 'Apple iPhone 17 5G', 'apple-iphone-17-5g--nqtQa', 580000, NULL, 'APPL-81XWRQ', 'Apple', 1, 1, 100);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_6F_ONgVbrS', 'prod_74FPp8E8uj', 'products/smartphones/apple-iphone-17-5g.webp', 'Apple iPhone 17 5G', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_4C3RyLcAIi', 'prod_74FPp8E8uj', 'Black - 128GB', 'APPL-81XWRQ-G4EZ', 580000, 10, '{"color":"Black","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_JOQJy7Kch3', 'prod_74FPp8E8uj', 'Black - 256GB', 'APPL-81XWRQ-TMRP', 580000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_RTnBPSheQx', 'prod_74FPp8E8uj', 'White - 128GB', 'APPL-81XWRQ-RMAI', 580000, 10, '{"color":"White","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_XSp6f2rYxe', 'prod_74FPp8E8uj', 'White - 256GB', 'APPL-81XWRQ-SJLL', 580000, 10, '{"color":"White","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_2xy_yY0zM6', 'prod_74FPp8E8uj', 'Blue - 128GB', 'APPL-81XWRQ-M3CG', 580000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_xAY8lfq_ZH', 'prod_74FPp8E8uj', 'Blue - 256GB', 'APPL-81XWRQ-15RS', 580000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_mCv3jQWfdH', 'prod_74FPp8E8uj', 'Green - 128GB', 'APPL-81XWRQ-238P', 580000, 10, '{"color":"Green","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_s8LXaVmqpW', 'prod_74FPp8E8uj', 'Green - 256GB', 'APPL-81XWRQ-CSPW', 580000, 10, '{"color":"Green","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_WfT4t0n3n-', 'prod_74FPp8E8uj', 'Pink - 128GB', 'APPL-81XWRQ-SLPU', 580000, 10, '{"color":"Pink","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_LUB1caXq08', 'prod_74FPp8E8uj', 'Pink - 256GB', 'APPL-81XWRQ-CTH7', 580000, 10, '{"color":"Pink","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_RPigsEICoO', 'cat_smartphones', 'Galaxy Z Fold 7', 'galaxy-z-fold-7-j2OZUk', 950000, 1270000, 'SAMS-4SGBGO', 'Samsung', 1, 1, 90);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_cq3C8q2Cgs', 'prod_RPigsEICoO', 'products/smartphones/galaxy-z-fold-7.webp', 'Galaxy Z Fold 7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_liYV-Qhp9D', 'prod_RPigsEICoO', 'Black - 256GB', 'SAMS-4SGBGO-JAOS', 950000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_lDjErmQmHc', 'prod_RPigsEICoO', 'Black - 512GB', 'SAMS-4SGBGO-S2O7', 1110000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_4mYowfBVOJ', 'prod_RPigsEICoO', 'Black - 1TB', 'SAMS-4SGBGO-BNEJ', 1270000, 10, '{"color":"Black","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Ps54F_SHm2', 'prod_RPigsEICoO', 'Silver - 256GB', 'SAMS-4SGBGO-UOXG', 950000, 10, '{"color":"Silver","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_yNMYBcew_c', 'prod_RPigsEICoO', 'Silver - 512GB', 'SAMS-4SGBGO-MLI-', 1110000, 10, '{"color":"Silver","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_vv2dgY7hh3', 'prod_RPigsEICoO', 'Silver - 1TB', 'SAMS-4SGBGO-DHR-', 1270000, 10, '{"color":"Silver","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_HKufXOodm1', 'prod_RPigsEICoO', 'Blue - 256GB', 'SAMS-4SGBGO-LSBV', 950000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_p1FgyRXnqO', 'prod_RPigsEICoO', 'Blue - 512GB', 'SAMS-4SGBGO-W7_M', 1110000, 10, '{"color":"Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_sd0PMI87NX', 'prod_RPigsEICoO', 'Blue - 1TB', 'SAMS-4SGBGO-9PTD', 1270000, 10, '{"color":"Blue","storage":"1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_KOZK5uf8Ns', 'cat_smartphones', 'iPhone 16 Pro Max', 'iphone-16-pro-max-bZhS90', 770000, 1100000, 'APPL--I6QYK', 'Apple', 1, 1, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_DDFsbv1nJO', 'prod_KOZK5uf8Ns', 'products/smartphones/iphone-16-pro-max.webp', 'iPhone 16 Pro Max', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_6EhuwGkk0x', 'prod_KOZK5uf8Ns', 'Black Titanium - 256GB', 'APPL--I6QYK-TK6Z', 770000, 10, '{"color":"Black Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ii3rw_-kqf', 'prod_KOZK5uf8Ns', 'Black Titanium - 512GB', 'APPL--I6QYK-RZYB', 935000, 10, '{"color":"Black Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_LqRCTOqRRn', 'prod_KOZK5uf8Ns', 'Black Titanium - 1TB', 'APPL--I6QYK-NIUZ', 1100000, 10, '{"color":"Black Titanium","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_XyhRlKlZKJ', 'prod_KOZK5uf8Ns', 'White Titanium - 256GB', 'APPL--I6QYK-VIXW', 770000, 10, '{"color":"White Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_6_hCNH0Mzt', 'prod_KOZK5uf8Ns', 'White Titanium - 512GB', 'APPL--I6QYK-B-DV', 935000, 10, '{"color":"White Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_byfdC6_R-R', 'prod_KOZK5uf8Ns', 'White Titanium - 1TB', 'APPL--I6QYK-YF3A', 1100000, 10, '{"color":"White Titanium","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_RitTfaw2Co', 'prod_KOZK5uf8Ns', 'Desert Titanium - 256GB', 'APPL--I6QYK-UUPQ', 770000, 10, '{"color":"Desert Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_HqWH54bV8R', 'prod_KOZK5uf8Ns', 'Desert Titanium - 512GB', 'APPL--I6QYK-R2FN', 935000, 10, '{"color":"Desert Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_3rz1bbKEFb', 'prod_KOZK5uf8Ns', 'Desert Titanium - 1TB', 'APPL--I6QYK-INH4', 1100000, 10, '{"color":"Desert Titanium","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_iv2daJHgqj', 'prod_KOZK5uf8Ns', 'Titanium Blue - 256GB', 'APPL--I6QYK-HZT7', 770000, 10, '{"color":"Titanium Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_hfWPquNExh', 'prod_KOZK5uf8Ns', 'Titanium Blue - 512GB', 'APPL--I6QYK-_M88', 935000, 10, '{"color":"Titanium Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_YMh5IvkIR0', 'prod_KOZK5uf8Ns', 'Titanium Blue - 1TB', 'APPL--I6QYK-JBC1', 1100000, 10, '{"color":"Titanium Blue","storage":"1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_tXDCc7ilwm', 'cat_smartphones', 'iPhone 16 Pro', 'iphone-16-pro-TGbWKu', 650000, 710000, 'APPL-M1HXRL', 'Apple', 1, 1, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_cJcBvKZCF_', 'prod_tXDCc7ilwm', 'products/smartphones/iphone-16-pro.webp', 'iPhone 16 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_PUk8mgEE_5', 'prod_tXDCc7ilwm', 'Black Titanium - 128GB', 'APPL-M1HXRL-DCB2', 650000, 10, '{"color":"Black Titanium","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_eesfYSjB18', 'prod_tXDCc7ilwm', 'Black Titanium - 256GB', 'APPL-M1HXRL-I0K_', 680000, 10, '{"color":"Black Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_IEzxPoGtcs', 'prod_tXDCc7ilwm', 'Black Titanium - 512GB', 'APPL-M1HXRL-F5VY', 710000, 10, '{"color":"Black Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_9KF3LB7iR5', 'prod_tXDCc7ilwm', 'White Titanium - 128GB', 'APPL-M1HXRL-OT2T', 650000, 10, '{"color":"White Titanium","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_muUInZiFdA', 'prod_tXDCc7ilwm', 'White Titanium - 256GB', 'APPL-M1HXRL-NJCS', 680000, 10, '{"color":"White Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_hEe0-foIyf', 'prod_tXDCc7ilwm', 'White Titanium - 512GB', 'APPL-M1HXRL-UZPY', 710000, 10, '{"color":"White Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_2dga-ouWQe', 'prod_tXDCc7ilwm', 'Desert Titanium - 128GB', 'APPL-M1HXRL-LHR3', 650000, 10, '{"color":"Desert Titanium","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_DO2UwYlNA5', 'prod_tXDCc7ilwm', 'Desert Titanium - 256GB', 'APPL-M1HXRL-8V-B', 680000, 10, '{"color":"Desert Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_unxSnuevOP', 'prod_tXDCc7ilwm', 'Desert Titanium - 512GB', 'APPL-M1HXRL-3KQ0', 710000, 10, '{"color":"Desert Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_XZPxMVcKUm', 'prod_tXDCc7ilwm', 'Titanium Blue - 128GB', 'APPL-M1HXRL-GMMK', 650000, 10, '{"color":"Titanium Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_O6BEQN7FbY', 'prod_tXDCc7ilwm', 'Titanium Blue - 256GB', 'APPL-M1HXRL-JV8L', 680000, 10, '{"color":"Titanium Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_X9-Sfuy6Cg', 'prod_tXDCc7ilwm', 'Titanium Blue - 512GB', 'APPL-M1HXRL-UO73', 710000, 10, '{"color":"Titanium Blue","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_d0bGm7kCS5', 'cat_smartphones', 'iPhone 16 Plus', 'iphone-16-plus-PDh8WV', 545000, 620000, 'APPL-2GOH_V', 'Apple', 1, 1, 150);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_nhoYoCUxuL', 'prod_d0bGm7kCS5', 'products/smartphones/iphone-16-plus.webp', 'iPhone 16 Plus', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_JTVvXIfF59', 'prod_d0bGm7kCS5', 'Black - 128GB', 'APPL-2GOH_V-GLHK', 545000, 10, '{"color":"Black","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_xtMUT5dOfy', 'prod_d0bGm7kCS5', 'Black - 256GB', 'APPL-2GOH_V-HXAQ', 582500, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Lcwwbp-CXh', 'prod_d0bGm7kCS5', 'Black - 512GB', 'APPL-2GOH_V-U4NY', 620000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_svNLqrGK27', 'prod_d0bGm7kCS5', 'White - 128GB', 'APPL-2GOH_V-NHBY', 545000, 10, '{"color":"White","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ybWQKCrZ3N', 'prod_d0bGm7kCS5', 'White - 256GB', 'APPL-2GOH_V-CNPW', 582500, 10, '{"color":"White","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_pG1AflOE7w', 'prod_d0bGm7kCS5', 'White - 512GB', 'APPL-2GOH_V-QTDR', 620000, 10, '{"color":"White","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_3tEJK4K0hZ', 'prod_d0bGm7kCS5', 'Blue - 128GB', 'APPL-2GOH_V-OWMZ', 545000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_IAzBP-v5YX', 'prod_d0bGm7kCS5', 'Blue - 256GB', 'APPL-2GOH_V-9AHA', 582500, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_DHEAPv9NlN', 'prod_d0bGm7kCS5', 'Blue - 512GB', 'APPL-2GOH_V-2LMX', 620000, 10, '{"color":"Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_5Yjn81Hu07', 'prod_d0bGm7kCS5', 'Pink - 128GB', 'APPL-2GOH_V-SXU6', 545000, 10, '{"color":"Pink","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_uRjToAFzqI', 'prod_d0bGm7kCS5', 'Pink - 256GB', 'APPL-2GOH_V-UKDX', 582500, 10, '{"color":"Pink","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ox84p1mUgR', 'prod_d0bGm7kCS5', 'Pink - 512GB', 'APPL-2GOH_V-AIXJ', 620000, 10, '{"color":"Pink","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_bABdfEh50N', 'prod_d0bGm7kCS5', 'Green - 128GB', 'APPL-2GOH_V-SFIY', 545000, 10, '{"color":"Green","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_oBYTGMVz7n', 'prod_d0bGm7kCS5', 'Green - 256GB', 'APPL-2GOH_V-A5NU', 582500, 10, '{"color":"Green","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_GQa1I67hw-', 'prod_d0bGm7kCS5', 'Green - 512GB', 'APPL-2GOH_V-WLK0', 620000, 10, '{"color":"Green","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_5jwlwvUBGP', 'cat_smartphones', 'iPhone 16', 'iphone-16-Tzx45y', 480000, 550000, 'APPL-3-CWAS', 'Apple', 1, 1, 150);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ULDtLDiiP_', 'prod_5jwlwvUBGP', 'products/smartphones/iphone-16.webp', 'iPhone 16', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_8k9tL00wlx', 'prod_5jwlwvUBGP', 'Black - 128GB', 'APPL-3-CWAS-DMG8', 480000, 10, '{"color":"Black","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Rp5U4ZCI7N', 'prod_5jwlwvUBGP', 'Black - 256GB', 'APPL-3-CWAS-ZTIX', 515000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_OpfNgFIkqV', 'prod_5jwlwvUBGP', 'Black - 512GB', 'APPL-3-CWAS-QMOA', 550000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_MAcglz5EHw', 'prod_5jwlwvUBGP', 'White - 128GB', 'APPL-3-CWAS-IVBW', 480000, 10, '{"color":"White","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_J-SIDan-IY', 'prod_5jwlwvUBGP', 'White - 256GB', 'APPL-3-CWAS-P6BA', 515000, 10, '{"color":"White","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_-gPpTwr4UX', 'prod_5jwlwvUBGP', 'White - 512GB', 'APPL-3-CWAS-3U00', 550000, 10, '{"color":"White","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_KymQe86MZd', 'prod_5jwlwvUBGP', 'Blue - 128GB', 'APPL-3-CWAS-SX4R', 480000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_R1bOwc_0ts', 'prod_5jwlwvUBGP', 'Blue - 256GB', 'APPL-3-CWAS-RF_O', 515000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_uSLvI8cCww', 'prod_5jwlwvUBGP', 'Blue - 512GB', 'APPL-3-CWAS-JUK0', 550000, 10, '{"color":"Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_tp35kQ37ai', 'prod_5jwlwvUBGP', 'Pink - 128GB', 'APPL-3-CWAS-CTL1', 480000, 10, '{"color":"Pink","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_5rBgJgVYy5', 'prod_5jwlwvUBGP', 'Pink - 256GB', 'APPL-3-CWAS-LQSX', 515000, 10, '{"color":"Pink","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_rFk6XyxyJy', 'prod_5jwlwvUBGP', 'Pink - 512GB', 'APPL-3-CWAS-EMRH', 550000, 10, '{"color":"Pink","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_K9CMaL5tpT', 'prod_5jwlwvUBGP', 'Green - 128GB', 'APPL-3-CWAS-LWLD', 480000, 10, '{"color":"Green","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_zUGP6XafjD', 'prod_5jwlwvUBGP', 'Green - 256GB', 'APPL-3-CWAS-DRTN', 515000, 10, '{"color":"Green","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_keeZ_hus7r', 'prod_5jwlwvUBGP', 'Green - 512GB', 'APPL-3-CWAS-9YZM', 550000, 10, '{"color":"Green","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_QJsUUiwD8J', 'cat_smartphones', 'Samsung Z Fold 6', 'samsung-z-fold-6-JoB4Jz', 590000, 980000, 'SAMS-DKPNOC', 'Samsung', 1, 1, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_l3_AzBcWzM', 'prod_QJsUUiwD8J', 'products/smartphones/samsung-z-fold-6.webp', 'Samsung Z Fold 6', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_-M3MUIccIN', 'prod_QJsUUiwD8J', 'Black - 256GB', 'SAMS-DKPNOC-YZJ1', 590000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_dtibMMuGMR', 'prod_QJsUUiwD8J', 'Black - 512GB', 'SAMS-DKPNOC-JYBT', 785000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_MXUbVCPC7l', 'prod_QJsUUiwD8J', 'Black - 1TB', 'SAMS-DKPNOC-YWZU', 980000, 10, '{"color":"Black","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_zNeU7Gt4Te', 'prod_QJsUUiwD8J', 'Silver - 256GB', 'SAMS-DKPNOC-XVSD', 590000, 10, '{"color":"Silver","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Ue3xOWjboL', 'prod_QJsUUiwD8J', 'Silver - 512GB', 'SAMS-DKPNOC-JRNX', 785000, 10, '{"color":"Silver","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ss9x97gdvk', 'prod_QJsUUiwD8J', 'Silver - 1TB', 'SAMS-DKPNOC-EHPR', 980000, 10, '{"color":"Silver","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_qDjn-L5Tol', 'prod_QJsUUiwD8J', 'Blue - 256GB', 'SAMS-DKPNOC-MFPE', 590000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_MjeVtvper1', 'prod_QJsUUiwD8J', 'Blue - 512GB', 'SAMS-DKPNOC-ENT6', 785000, 10, '{"color":"Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_xy5dkWhY0v', 'prod_QJsUUiwD8J', 'Blue - 1TB', 'SAMS-DKPNOC-M0JU', 980000, 10, '{"color":"Blue","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_sFupbUZOM0', 'prod_QJsUUiwD8J', 'Pink - 256GB', 'SAMS-DKPNOC-JSIV', 590000, 10, '{"color":"Pink","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_r7xZx-1zVW', 'prod_QJsUUiwD8J', 'Pink - 512GB', 'SAMS-DKPNOC-_DMK', 785000, 10, '{"color":"Pink","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_4J-E8rGAlt', 'prod_QJsUUiwD8J', 'Pink - 1TB', 'SAMS-DKPNOC-4M8J', 980000, 10, '{"color":"Pink","storage":"1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_fi0SXRhjeE', 'cat_smartphones', 'Samsung Z Fold 5', 'samsung-z-fold-5-MHus-b', 630000, 670000, 'SAMS-CA3NLO', 'Samsung', 1, 1, 60);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_WQ5j-sSDoJ', 'prod_fi0SXRhjeE', 'products/smartphones/samsung-z-fold-5.webp', 'Samsung Z Fold 5', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_25OK1K2rlm', 'prod_fi0SXRhjeE', 'Black - 256GB', 'SAMS-CA3NLO-ZM3V', 630000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_UA0H2j6w_J', 'prod_fi0SXRhjeE', 'Black - 512GB', 'SAMS-CA3NLO-FI7M', 670000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_8LhJDPF0_p', 'prod_fi0SXRhjeE', 'Cream - 256GB', 'SAMS-CA3NLO-6R3T', 630000, 10, '{"color":"Cream","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_kKvnQrcxWQ', 'prod_fi0SXRhjeE', 'Cream - 512GB', 'SAMS-CA3NLO-ABGP', 670000, 10, '{"color":"Cream","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_7fKbNtH5tI', 'prod_fi0SXRhjeE', 'Blue - 256GB', 'SAMS-CA3NLO-WQ1U', 630000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_dJHlQFJyEQ', 'prod_fi0SXRhjeE', 'Blue - 512GB', 'SAMS-CA3NLO-WUW9', 670000, 10, '{"color":"Blue","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_WDOtkkk7Oc', 'cat_smartphones', 'Samsung Z Fold 4', 'samsung-z-fold-4-HRLk_B', 485000, 570000, 'SAMS-BUQIQK', 'Samsung', 1, 1, 60);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_G7_8XzDYLX', 'prod_WDOtkkk7Oc', 'products/smartphones/samsung-z-fold-4.webp', 'Samsung Z Fold 4', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_1pYLNf-893', 'prod_WDOtkkk7Oc', 'Black - 256GB', 'SAMS-BUQIQK-MTOM', 485000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_U7kJFMqof-', 'prod_WDOtkkk7Oc', 'Black - 512GB', 'SAMS-BUQIQK-U3IY', 570000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_vYtIbNp-Vy', 'prod_WDOtkkk7Oc', 'Grey - 256GB', 'SAMS-BUQIQK-LRQY', 485000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_uQeUyAbkT8', 'prod_WDOtkkk7Oc', 'Grey - 512GB', 'SAMS-BUQIQK-E7VK', 570000, 10, '{"color":"Grey","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_EzAX2Vj9GB', 'prod_WDOtkkk7Oc', 'Beige - 256GB', 'SAMS-BUQIQK-YN0B', 485000, 10, '{"color":"Beige","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_5MlQqFATEe', 'prod_WDOtkkk7Oc', 'Beige - 512GB', 'SAMS-BUQIQK-5MXH', 570000, 10, '{"color":"Beige","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_J_oPa6p3VZ', 'cat_smartphones', 'Samsung Z Fold 3', 'samsung-z-fold-3-GuyyQe', 475000, 630000, 'SAMS-DA8TF6', 'Samsung', 1, 1, 60);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_gEYGXCi2gs', 'prod_J_oPa6p3VZ', 'products/smartphones/samsung-z-fold-3.webp', 'Samsung Z Fold 3', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ElVH_5bYDz', 'prod_J_oPa6p3VZ', 'Black - 256GB', 'SAMS-DA8TF6-WF_J', 475000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_3T-JOJbHko', 'prod_J_oPa6p3VZ', 'Black - 512GB', 'SAMS-DA8TF6-EHWA', 630000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_9H6x8un2rs', 'prod_J_oPa6p3VZ', 'Silver - 256GB', 'SAMS-DA8TF6-IIZU', 475000, 10, '{"color":"Silver","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_XDTRJu2dWW', 'prod_J_oPa6p3VZ', 'Silver - 512GB', 'SAMS-DA8TF6-GQ41', 630000, 10, '{"color":"Silver","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_hBg-CoVG-1', 'prod_J_oPa6p3VZ', 'Green - 256GB', 'SAMS-DA8TF6-47CK', 475000, 10, '{"color":"Green","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_HwcG7YiieU', 'prod_J_oPa6p3VZ', 'Green - 512GB', 'SAMS-DA8TF6-7BQX', 630000, 10, '{"color":"Green","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_oIzytvgiOB', 'cat_smartphones', 'Samsung Z Flip 6', 'samsung-z-flip-6--V1HdB', 455000, 550000, 'SAMS-E9--NM', 'Samsung', 1, 1, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_gzAzGokrfg', 'prod_oIzytvgiOB', 'products/smartphones/samsung-z-flip-6.webp', 'Samsung Z Flip 6', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_xwWPCJlJYV', 'prod_oIzytvgiOB', 'Black - 256GB', 'SAMS-E9--NM-KHRD', 455000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_I10I1rPgUP', 'prod_oIzytvgiOB', 'Black - 512GB', 'SAMS-E9--NM-ASJC', 550000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_7R494QaFmQ', 'prod_oIzytvgiOB', 'Blue - 256GB', 'SAMS-E9--NM-YZ_H', 455000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_MT676Khz39', 'prod_oIzytvgiOB', 'Blue - 512GB', 'SAMS-E9--NM-9FON', 550000, 10, '{"color":"Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_AWOhCGyGrk', 'prod_oIzytvgiOB', 'Mint - 256GB', 'SAMS-E9--NM-1KTF', 455000, 10, '{"color":"Mint","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_c77aQvgt0C', 'prod_oIzytvgiOB', 'Mint - 512GB', 'SAMS-E9--NM-EEBV', 550000, 10, '{"color":"Mint","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ByGWaNQ-MS', 'prod_oIzytvgiOB', 'Yellow - 256GB', 'SAMS-E9--NM-FWLG', 455000, 10, '{"color":"Yellow","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_T84UzL2_Ef', 'prod_oIzytvgiOB', 'Yellow - 512GB', 'SAMS-E9--NM-VXBT', 550000, 10, '{"color":"Yellow","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_udEDfJvSb2', 'cat_smartphones', 'Samsung S25 Ultra', 'samsung-s25-ultra-yFRKYh', 550000, 830000, 'SAMS-T1EIDR', 'Samsung', 1, 1, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_d0440Imsh0', 'prod_udEDfJvSb2', 'products/smartphones/samsung-s25-ultra.webp', 'Samsung S25 Ultra', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_5_OgtGO7C7', 'prod_udEDfJvSb2', 'Black - 12GB/256GB', 'SAMS-T1EIDR-593H', 550000, 10, '{"color":"Black","storage":"12GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_iihVuw1RI7', 'prod_udEDfJvSb2', 'Black - 12GB/512GB', 'SAMS-T1EIDR-YASF', 690000, 10, '{"color":"Black","storage":"12GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_jFAeeWS9nV', 'prod_udEDfJvSb2', 'Black - 12GB/1TB', 'SAMS-T1EIDR-0-GD', 830000, 10, '{"color":"Black","storage":"12GB/1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_70eDkmCpg2', 'prod_udEDfJvSb2', 'White - 12GB/256GB', 'SAMS-T1EIDR-HP5N', 550000, 10, '{"color":"White","storage":"12GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ryohYlilGy', 'prod_udEDfJvSb2', 'White - 12GB/512GB', 'SAMS-T1EIDR-Q8BV', 690000, 10, '{"color":"White","storage":"12GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_OXXGXLY8f9', 'prod_udEDfJvSb2', 'White - 12GB/1TB', 'SAMS-T1EIDR-SN44', 830000, 10, '{"color":"White","storage":"12GB/1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_M8AYcw8TB0', 'prod_udEDfJvSb2', 'Blue - 12GB/256GB', 'SAMS-T1EIDR-0A7-', 550000, 10, '{"color":"Blue","storage":"12GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_JjkRHbG73n', 'prod_udEDfJvSb2', 'Blue - 12GB/512GB', 'SAMS-T1EIDR-NTK6', 690000, 10, '{"color":"Blue","storage":"12GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_1WgGtZ6yoY', 'prod_udEDfJvSb2', 'Blue - 12GB/1TB', 'SAMS-T1EIDR-YMU-', 830000, 10, '{"color":"Blue","storage":"12GB/1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Kypu4WkheD', 'prod_udEDfJvSb2', 'Silver - 12GB/256GB', 'SAMS-T1EIDR-VW5W', 550000, 10, '{"color":"Silver","storage":"12GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_SFDLFBEGWb', 'prod_udEDfJvSb2', 'Silver - 12GB/512GB', 'SAMS-T1EIDR-ITLY', 690000, 10, '{"color":"Silver","storage":"12GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_oXCP6PrZ-S', 'prod_udEDfJvSb2', 'Silver - 12GB/1TB', 'SAMS-T1EIDR-KW1D', 830000, 10, '{"color":"Silver","storage":"12GB/1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod__wUH_KIYpW', 'cat_smartphones', 'Samsung S25+', 'samsung-s25-3SDaRb', 505000, 580000, 'SAMS-LHORVH', 'Samsung', 1, 1, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_3N4UJTwi1_', 'prod__wUH_KIYpW', 'products/smartphones/samsung-s25.webp', 'Samsung S25+', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_kKj8DOd07S', 'prod__wUH_KIYpW', 'Black - 12GB/256GB', 'SAMS-LHORVH-QI-E', 505000, 10, '{"color":"Black","storage":"12GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_fIn20iWj2M', 'prod__wUH_KIYpW', 'Black - 12GB/512GB', 'SAMS-LHORVH-D_CK', 580000, 10, '{"color":"Black","storage":"12GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_bj3kGGA934', 'prod__wUH_KIYpW', 'Blue - 12GB/256GB', 'SAMS-LHORVH-ILEP', 505000, 10, '{"color":"Blue","storage":"12GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_OlMkbClSZo', 'prod__wUH_KIYpW', 'Blue - 12GB/512GB', 'SAMS-LHORVH-F_SE', 580000, 10, '{"color":"Blue","storage":"12GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Ic2guunlSH', 'prod__wUH_KIYpW', 'Silver - 12GB/256GB', 'SAMS-LHORVH-HKPI', 505000, 10, '{"color":"Silver","storage":"12GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_DIfD5JZqFc', 'prod__wUH_KIYpW', 'Silver - 12GB/512GB', 'SAMS-LHORVH--JTO', 580000, 10, '{"color":"Silver","storage":"12GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_x5tEW9OElT', 'prod__wUH_KIYpW', 'Mint - 12GB/256GB', 'SAMS-LHORVH-QDMF', 505000, 10, '{"color":"Mint","storage":"12GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_AjRRiPAW1u', 'prod__wUH_KIYpW', 'Mint - 12GB/512GB', 'SAMS-LHORVH-CJCZ', 580000, 10, '{"color":"Mint","storage":"12GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_rKE_5CPE57', 'cat_smartphones', 'Samsung S25', 'samsung-s25-LWcBvX', 400000, 455000, 'SAMS-D1V0G6', 'Samsung', 1, 1, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_5D1Yi5po9P', 'prod_rKE_5CPE57', 'products/smartphones/samsung-s25.webp', 'Samsung S25', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_M7kKC49_ZA', 'prod_rKE_5CPE57', 'Black - 8GB/128GB', 'SAMS-D1V0G6-P8FI', 400000, 10, '{"color":"Black","storage":"8GB/128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_kX4Bcsn03q', 'prod_rKE_5CPE57', 'Black - 8GB/256GB', 'SAMS-D1V0G6-EPQJ', 455000, 10, '{"color":"Black","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_p8wEZ5jjci', 'prod_rKE_5CPE57', 'Blue - 8GB/128GB', 'SAMS-D1V0G6-DR0Q', 400000, 10, '{"color":"Blue","storage":"8GB/128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_qXbu0O5xCe', 'prod_rKE_5CPE57', 'Blue - 8GB/256GB', 'SAMS-D1V0G6-AGKS', 455000, 10, '{"color":"Blue","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ebCQ5SEgLg', 'prod_rKE_5CPE57', 'Silver - 8GB/128GB', 'SAMS-D1V0G6-J1JI', 400000, 10, '{"color":"Silver","storage":"8GB/128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_d9ov3497bn', 'prod_rKE_5CPE57', 'Silver - 8GB/256GB', 'SAMS-D1V0G6-BXKW', 455000, 10, '{"color":"Silver","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_svOT5bTsAX', 'prod_rKE_5CPE57', 'Mint - 8GB/128GB', 'SAMS-D1V0G6-TMQ-', 400000, 10, '{"color":"Mint","storage":"8GB/128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_oGnBvcMNNB', 'prod_rKE_5CPE57', 'Mint - 8GB/256GB', 'SAMS-D1V0G6-3YK8', 455000, 10, '{"color":"Mint","storage":"8GB/256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_gBfhwJgxyO', 'cat_smartphones', 'Samsung S24 Ultra', 'samsung-s24-ultra-wBj40n', 495000, 780000, 'SAMS--HO7V2', 'Samsung', 1, 0, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_smwRnpP21s', 'prod_gBfhwJgxyO', 'products/smartphones/samsung-s24-ultra.webp', 'Samsung S24 Ultra', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_1HXMJv3fmC', 'prod_gBfhwJgxyO', 'Titanium Black - 256GB', 'SAMS--HO7V2-KVS-', 495000, 10, '{"color":"Titanium Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_KkwdFdJsSf', 'prod_gBfhwJgxyO', 'Titanium Black - 512GB', 'SAMS--HO7V2-SNTY', 637500, 10, '{"color":"Titanium Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_7SFn48Ltr3', 'prod_gBfhwJgxyO', 'Titanium Black - 1TB', 'SAMS--HO7V2-Q_TM', 780000, 10, '{"color":"Titanium Black","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_a0gVqf_Q8I', 'prod_gBfhwJgxyO', 'Titanium Gray - 256GB', 'SAMS--HO7V2-D_TW', 495000, 10, '{"color":"Titanium Gray","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_97gNMEVpXf', 'prod_gBfhwJgxyO', 'Titanium Gray - 512GB', 'SAMS--HO7V2-DNCN', 637500, 10, '{"color":"Titanium Gray","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_0u7fcRmSU8', 'prod_gBfhwJgxyO', 'Titanium Gray - 1TB', 'SAMS--HO7V2-69WM', 780000, 10, '{"color":"Titanium Gray","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_BAxFJkt-53', 'prod_gBfhwJgxyO', 'Titanium Violet - 256GB', 'SAMS--HO7V2-YFCC', 495000, 10, '{"color":"Titanium Violet","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_TauGXH_klQ', 'prod_gBfhwJgxyO', 'Titanium Violet - 512GB', 'SAMS--HO7V2-SNIS', 637500, 10, '{"color":"Titanium Violet","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__yLhiXMO4I', 'prod_gBfhwJgxyO', 'Titanium Violet - 1TB', 'SAMS--HO7V2-8RVX', 780000, 10, '{"color":"Titanium Violet","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_PMcaswwGem', 'prod_gBfhwJgxyO', 'Titanium Yellow - 256GB', 'SAMS--HO7V2-XVFT', 495000, 10, '{"color":"Titanium Yellow","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ndK8TVfUyV', 'prod_gBfhwJgxyO', 'Titanium Yellow - 512GB', 'SAMS--HO7V2-2FWT', 637500, 10, '{"color":"Titanium Yellow","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_xaprN1lXQ-', 'prod_gBfhwJgxyO', 'Titanium Yellow - 1TB', 'SAMS--HO7V2-SXOC', 780000, 10, '{"color":"Titanium Yellow","storage":"1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_uXpniMu0jj', 'cat_smartphones', 'Samsung S24', 'samsung-s24-RMBMmu', 340000, 550000, 'SAMS-XBFXT-', 'Samsung', 1, 0, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_hy_Ii-8U-q', 'prod_uXpniMu0jj', 'products/smartphones/samsung-s24.webp', 'Samsung S24', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_K2sWP4oFeg', 'prod_uXpniMu0jj', 'Black - 128GB', 'SAMS-XBFXT--PNXT', 340000, 10, '{"color":"Black","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Jd1TP23CuI', 'prod_uXpniMu0jj', 'Black - 256GB', 'SAMS-XBFXT--I6ML', 445000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Dysw4Wbava', 'prod_uXpniMu0jj', 'Black - 512GB', 'SAMS-XBFXT--Q1CT', 550000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_QaUiH_i6jK', 'prod_uXpniMu0jj', 'Grey - 128GB', 'SAMS-XBFXT--IG_F', 340000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Fk52u8cAQc', 'prod_uXpniMu0jj', 'Grey - 256GB', 'SAMS-XBFXT--VPU9', 445000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Lv4emegTjx', 'prod_uXpniMu0jj', 'Grey - 512GB', 'SAMS-XBFXT--PWPI', 550000, 10, '{"color":"Grey","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_sY0AiWlESe', 'prod_uXpniMu0jj', 'Violet - 128GB', 'SAMS-XBFXT--VYLY', 340000, 10, '{"color":"Violet","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ojtkeWok3X', 'prod_uXpniMu0jj', 'Violet - 256GB', 'SAMS-XBFXT--0JQX', 445000, 10, '{"color":"Violet","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_tdYfB-TGnx', 'prod_uXpniMu0jj', 'Violet - 512GB', 'SAMS-XBFXT--6DBB', 550000, 10, '{"color":"Violet","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__9iJ0ad61s', 'prod_uXpniMu0jj', 'Yellow - 128GB', 'SAMS-XBFXT--OC9J', 340000, 10, '{"color":"Yellow","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_4TqRk5Y7Ka', 'prod_uXpniMu0jj', 'Yellow - 256GB', 'SAMS-XBFXT--WAPN', 445000, 10, '{"color":"Yellow","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_34Pe40Imde', 'prod_uXpniMu0jj', 'Yellow - 512GB', 'SAMS-XBFXT--APYO', 550000, 10, '{"color":"Yellow","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_9o7domIKJt', 'cat_smartphones', 'Samsung S23 FE 5G', 'samsung-s23-fe-5g-46J1ZU', 270000, 295000, 'SAMS-O-K_FN', 'Samsung', 1, 0, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_syDBo4e7aE', 'prod_9o7domIKJt', 'products/smartphones/samsung-s23-fe-5g.webp', 'Samsung S23 FE 5G', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_EBrv5E6EUG', 'prod_9o7domIKJt', 'Black - 128GB', 'SAMS-O-K_FN-TMMG', 270000, 10, '{"color":"Black","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_pzoAPBS4yM', 'prod_9o7domIKJt', 'Black - 256GB', 'SAMS-O-K_FN-TPTZ', 295000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_cLFiK66V6K', 'prod_9o7domIKJt', 'Cream - 128GB', 'SAMS-O-K_FN-OHCX', 270000, 10, '{"color":"Cream","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_O8WczSySsa', 'prod_9o7domIKJt', 'Cream - 256GB', 'SAMS-O-K_FN-NWJ8', 295000, 10, '{"color":"Cream","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_7eXahHzZ2n', 'prod_9o7domIKJt', 'Mint - 128GB', 'SAMS-O-K_FN-AND6', 270000, 10, '{"color":"Mint","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_4CnsKh-V7C', 'prod_9o7domIKJt', 'Mint - 256GB', 'SAMS-O-K_FN-P--M', 295000, 10, '{"color":"Mint","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_IWHxSa2aKu', 'prod_9o7domIKJt', 'Purple - 128GB', 'SAMS-O-K_FN-WUIL', 270000, 10, '{"color":"Purple","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_s1p78xeOKn', 'prod_9o7domIKJt', 'Purple - 256GB', 'SAMS-O-K_FN-1FRI', 295000, 10, '{"color":"Purple","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_pV3PNf2FlJ', 'cat_smartphones', 'Honor 200', 'honor-200-prlNB8', 280000, NULL, 'HONO-WEOAYC', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_JRIFxjiBcO', 'prod_pV3PNf2FlJ', 'products/smartphones/honor-200.webp', 'Honor 200', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ZSQ99oiCt0', 'prod_pV3PNf2FlJ', 'Black - 256GB', 'HONO-WEOAYC-4ZEZ', 280000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_iVS6wOlp4O', 'prod_pV3PNf2FlJ', 'Green - 256GB', 'HONO-WEOAYC-6WBR', 280000, 10, '{"color":"Green","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_3N5mOTUX3a', 'cat_smartphones', 'Honor 400 Lite', 'honor-400-lite-u0B5Wr', 190000, NULL, 'HONO-IIMQPF', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_mMgEzxpUjQ', 'prod_3N5mOTUX3a', 'products/smartphones/honor-400-lite.webp', 'Honor 400 Lite', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ZQ_wdUrlJD', 'prod_3N5mOTUX3a', 'Silver - 256GB', 'HONO-IIMQPF-JC6O', 190000, 10, '{"color":"Silver","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_YbiEtOSYBp', 'prod_3N5mOTUX3a', 'Black - 256GB', 'HONO-IIMQPF-TML0', 190000, 10, '{"color":"Black","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_kguORqJykz', 'cat_smartphones', 'Honor 400 Pro', 'honor-400-pro-zmdGwY', 450000, NULL, 'HONO-EMZPLV', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_OEVcUrP2qj', 'prod_kguORqJykz', 'products/smartphones/honor-400-pro.webp', 'Honor 400 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_vkXZkeVCDO', 'prod_kguORqJykz', 'Sky Blue - 512GB', 'HONO-EMZPLV-CJIT', 450000, 10, '{"color":"Sky Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_HyVeybvEWw', 'prod_kguORqJykz', 'Black - 512GB', 'HONO-EMZPLV-TBCJ', 450000, 10, '{"color":"Black","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_i6D-C-Mdf_', 'cat_smartphones', 'Honor Magic 6 Pro', 'honor-magic-6-pro--7_0Zy', 500000, NULL, 'HONO-EPXUMN', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_f3-MK4KUMn', 'prod_i6D-C-Mdf_', 'products/smartphones/honor-magic-6-pro.webp', 'Honor Magic 6 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_DT5tZzkg6V', 'prod_i6D-C-Mdf_', 'Green - 512GB', 'HONO-EPXUMN-TMOQ', 500000, 10, '{"color":"Green","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_lE1wdYSNpM', 'prod_i6D-C-Mdf_', 'Black - 512GB', 'HONO-EPXUMN-WL3R', 500000, 10, '{"color":"Black","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_igHWPwMJSI', 'cat_smartphones', 'Honor Magic 7 Pro', 'honor-magic-7-pro-L5x7g3', 600000, NULL, 'HONO-FDAJM4', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_LwafD8L13t', 'prod_igHWPwMJSI', 'products/smartphones/honor-magic-7-pro.webp', 'Honor Magic 7 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_6lE7ediAkH', 'prod_igHWPwMJSI', 'Silver - 512GB', 'HONO-FDAJM4-00Q7', 600000, 10, '{"color":"Silver","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_4X_9SAPceC', 'prod_igHWPwMJSI', 'Black - 512GB', 'HONO-FDAJM4-E0CS', 600000, 10, '{"color":"Black","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_iSZazNLt56', 'cat_smartphones', 'Honor Magic V2', 'honor-magic-v2-u0xPWV', 630000, NULL, 'HONO-06DRI4', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_MNsIt8cVp-', 'prod_iSZazNLt56', 'products/smartphones/honor-magic-v2.webp', 'Honor Magic V2', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_NzWVRnff4T', 'prod_iSZazNLt56', 'Black - 512GB', 'HONO-06DRI4-MEW4', 630000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_FLE2gxdB-6', 'prod_iSZazNLt56', 'Purple - 512GB', 'HONO-06DRI4-NBM7', 630000, 10, '{"color":"Purple","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_4-Vlt3GrRb', 'cat_smartphones', 'Honor Magic V3', 'honor-magic-v3-Amtx-T', 830000, NULL, 'HONO-NT65CG', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_8Xpj6z37H6', 'prod_4-Vlt3GrRb', 'products/smartphones/honor-magic-v3.webp', 'Honor Magic V3', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_9jXUCzU5vB', 'prod_4-Vlt3GrRb', 'Brown - 512GB', 'HONO-NT65CG-FVUM', 830000, 10, '{"color":"Brown","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_0d3YWm9dLJ', 'prod_4-Vlt3GrRb', 'Black - 512GB', 'HONO-NT65CG-6TMH', 830000, 10, '{"color":"Black","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_CGP3cLsY2D', 'cat_smartphones', 'Honor Magic V5 16Go Ram 512Go', 'honor-magic-v5-16go-ram-512go-4qJzEg', 930000, NULL, 'HONO-QICS-I', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_UleWpTkGgp', 'prod_CGP3cLsY2D', 'products/smartphones/honor-magic-v5-16go-ram-512go.webp', 'Honor Magic V5 16Go Ram 512Go', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_T8jKrO9wfd', 'prod_CGP3cLsY2D', 'Black - 512GB', 'HONO-QICS-I-OXR6', 930000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_HJsUcV0LWJ', 'prod_CGP3cLsY2D', 'White - 512GB', 'HONO-QICS-I-KNV2', 930000, 10, '{"color":"White","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_yo79Q5u1_0', 'cat_smartphones', 'Honor X7B', 'honor-x7b-hQKkW3', 100000, NULL, 'HONO-9SLKYW', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img__SGvss9BB5', 'prod_yo79Q5u1_0', 'products/smartphones/honor-x7b.webp', 'Honor X7B', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_XWByQE3rdd', 'prod_yo79Q5u1_0', 'Green - 128GB', 'HONO-9SLKYW-RW6Z', 100000, 10, '{"color":"Green","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_FthAGB8yIz', 'prod_yo79Q5u1_0', 'Black - 128GB', 'HONO-9SLKYW-D5XC', 100000, 10, '{"color":"Black","storage":"128GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_MCrIgoA-ux', 'cat_smartphones', 'Honor X7C', 'honor-x7c-aTmIOS', 120000, NULL, 'HONO-TT4F_Y', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_-v2GVz0R3y', 'prod_MCrIgoA-ux', 'products/smartphones/honor-x7c.webp', 'Honor X7C', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Sh52Q-eB3V', 'prod_MCrIgoA-ux', 'Black - 128GB', 'HONO-TT4F_Y-KNCM', 120000, 10, '{"color":"Black","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_h1nPjPgMfL', 'prod_MCrIgoA-ux', 'Blue - 128GB', 'HONO-TT4F_Y-KAKC', 120000, 10, '{"color":"Blue","storage":"128GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_irjBj7tDfF', 'cat_smartphones', 'Honor X9C', 'honor-x9c-JYOJS9', 190000, NULL, 'HONO-GMZ-VT', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_0WC5VNhaC4', 'prod_irjBj7tDfF', 'products/smartphones/honor-x9c.webp', 'Honor X9C', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Tvgmm8g9v9', 'prod_irjBj7tDfF', 'Orange - 256GB', 'HONO-GMZ-VT-89KT', 190000, 10, '{"color":"Orange","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_b9E-ufzZDC', 'prod_irjBj7tDfF', 'Black - 256GB', 'HONO-GMZ-VT-DVH3', 190000, 10, '{"color":"Black","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_DzkAlO0oHA', 'cat_smartphones', 'Huawei Mate X3', 'huawei-mate-x3-VW06WP', 680000, NULL, 'HUAW-LTEZPI', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_nZY5CSnXaQ', 'prod_DzkAlO0oHA', 'products/smartphones/huawei-mate-x3.webp', 'Huawei Mate X3', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_dd5WIWS_1M', 'prod_DzkAlO0oHA', 'Black - 512GB', 'HUAW-LTEZPI-I2XY', 680000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_gimNCKFhmU', 'prod_DzkAlO0oHA', 'Gold - 512GB', 'HUAW-LTEZPI-7TEQ', 680000, 10, '{"color":"Gold","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Vo3RjbUGmu', 'cat_smartphones', 'Huawei Mate X6', 'huawei-mate-x6-ulXXGT', 850000, NULL, 'HUAW-AE4UJC', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_GXoIoGA0L5', 'prod_Vo3RjbUGmu', 'products/smartphones/huawei-mate-x6.webp', 'Huawei Mate X6', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_JfHwiYUMWo', 'prod_Vo3RjbUGmu', 'Black - 512GB', 'HUAW-AE4UJC-S4W1', 850000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_rIJe4On94T', 'prod_Vo3RjbUGmu', 'Red - 512GB', 'HUAW-AE4UJC-0BGM', 850000, 10, '{"color":"Red","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_kT39SDc8ol', 'cat_smartphones', 'Huawei Mate XT', 'huawei-mate-xt-eOrxWX', 1550000, 1800000, 'HUAW-BDMHTU', 'Huawei', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_gPJGHNXorA', 'prod_kT39SDc8ol', 'products/smartphones/huawei-mate-xt.webp', 'Huawei Mate XT', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_wpCy67P5p1', 'prod_kT39SDc8ol', 'Black - 1TB', 'HUAW-BDMHTU-LFRW', 1800000, 10, '{"color":"Black","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_jiUAp1q7AH', 'prod_kT39SDc8ol', 'Gold - 1TB', 'HUAW-BDMHTU-PBWP', 1800000, 10, '{"color":"Gold","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_bFXlVpXKBS', 'prod_kT39SDc8ol', 'Black - 512GB', 'HUAW-BDMHTU-TFWR', 1550000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Dhbe_oIWOW', 'prod_kT39SDc8ol', 'Gold - 512GB', 'HUAW-BDMHTU-QDEJ', 1550000, 10, '{"color":"Gold","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_M29wMh6mjU', 'cat_smartphones', 'Huawei Nova 11 Pro', 'huawei-nova-11-pro-4AgrUO', 450000, NULL, 'HUAW-Y9FUBO', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_wzxMsBoQ4U', 'prod_M29wMh6mjU', 'products/smartphones/huawei-nova-11-pro.webp', 'Huawei Nova 11 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_bdNKKS440v', 'prod_M29wMh6mjU', 'Black - 256GB', 'HUAW-Y9FUBO-HBJL', 450000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_M4hg8HKPWO', 'prod_M29wMh6mjU', 'Gold - 256GB', 'HUAW-Y9FUBO-OQR9', 450000, 10, '{"color":"Gold","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_NbITJtbT4m', 'cat_smartphones', 'Huawei Nova 12i', 'huawei-nova-12i-sZ3pAs', 138000, NULL, 'HUAW-I02QBB', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ddWjKKH02i', 'prod_NbITJtbT4m', 'products/smartphones/huawei-nova-12i.webp', 'Huawei Nova 12i', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_eKlOesuDBA', 'prod_NbITJtbT4m', 'Blue - 256GB', 'HUAW-I02QBB-VOND', 138000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_KOMBd62fAT', 'prod_NbITJtbT4m', 'Black - 256GB', 'HUAW-I02QBB-W_DM', 138000, 10, '{"color":"Black","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_XLMp5FQBjc', 'cat_smartphones', 'Huawei Nova 12s', 'huawei-nova-12s-93IMHH', 165000, NULL, 'HUAW-IE5FY7', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_eSJsSrvuMs', 'prod_XLMp5FQBjc', 'products/smartphones/huawei-nova-12s.webp', 'Huawei Nova 12s', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_60YtpYk8t-', 'prod_XLMp5FQBjc', 'Black - 256GB', 'HUAW-IE5FY7-YZIY', 165000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_bWQD4tgtOL', 'prod_XLMp5FQBjc', 'Green - 256GB', 'HUAW-IE5FY7-EYO6', 165000, 10, '{"color":"Green","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_t90ZOmD7FX', 'cat_smartphones', 'Huawei Pura 70', 'huawei-pura-70-GVSCfC', 290000, NULL, 'HUAW-HBAZPY', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_C6rmHjnmOJ', 'prod_t90ZOmD7FX', 'products/smartphones/huawei-pura-70.webp', 'Huawei Pura 70', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_iwCK9DbYVD', 'prod_t90ZOmD7FX', 'Black - 256GB', 'HUAW-HBAZPY-K7O8', 290000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_BnIJ81pXAu', 'prod_t90ZOmD7FX', 'Green - 256GB', 'HUAW-HBAZPY-_OOI', 290000, 10, '{"color":"Green","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_U9aLPjUI6f', 'cat_smartphones', 'Huawei Pura 70 Pro', 'huawei-pura-70-pro-2sxo1i', 450000, NULL, 'HUAW-H73T6O', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_xbjXZT-lvo', 'prod_U9aLPjUI6f', 'products/smartphones/huawei-pura-70-pro.webp', 'Huawei Pura 70 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_QWOBOgWQeF', 'prod_U9aLPjUI6f', 'White - 512GB', 'HUAW-H73T6O-2Z98', 450000, 10, '{"color":"White","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_n37-iOTCZn', 'prod_U9aLPjUI6f', 'Black - 512GB', 'HUAW-H73T6O-8ZJJ', 450000, 10, '{"color":"Black","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_FXkIDLwaX9', 'cat_smartphones', 'Huawei Pura 70 Ultra', 'huawei-pura-70-ultra-rBoxp_', 580000, NULL, 'HUAW-Y-X3HS', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_kFC8zIunYW', 'prod_FXkIDLwaX9', 'products/smartphones/huawei-pura-70-ultra.webp', 'Huawei Pura 70 Ultra', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Ux2pQ7R_y9', 'prod_FXkIDLwaX9', 'Brown - 512GB', 'HUAW-Y-X3HS-1V4D', 580000, 10, '{"color":"Brown","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ZhJl7fiGBz', 'prod_FXkIDLwaX9', 'Black - 512GB', 'HUAW-Y-X3HS-JI5W', 580000, 10, '{"color":"Black","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_k-B9tD0zQB', 'cat_smartphones', 'Xiaomi 15 Ultra', 'xiaomi-15-ultra-_dYYmH', 700000, 850000, 'XIAO-V6TCV9', 'Xiaomi', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_imj9Y70eXE', 'prod_k-B9tD0zQB', 'products/smartphones/xiaomi-15-ultra.webp', 'Xiaomi 15 Ultra', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_DSxODTsZBA', 'prod_k-B9tD0zQB', 'Black - 512GB', 'XIAO-V6TCV9-PVM_', 700000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_AdMosbl7uP', 'prod_k-B9tD0zQB', 'Black - 1TB', 'XIAO-V6TCV9-1-1V', 850000, 10, '{"color":"Black","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_cBZmq-FLkV', 'prod_k-B9tD0zQB', 'White - 512GB', 'XIAO-V6TCV9-ZALI', 700000, 10, '{"color":"White","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__zWDIDqiIW', 'prod_k-B9tD0zQB', 'White - 1TB', 'XIAO-V6TCV9-_JIZ', 850000, 10, '{"color":"White","storage":"1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_-E2jEhgO26', 'cat_smartphones', 'Pixel 7', 'pixel-7-Veewqn', 325000, NULL, 'GOOG-XLR3HN', 'Google', 1, 0, 60);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_UNGhiySW_K', 'prod_-E2jEhgO26', 'products/smartphones/pixel-7.webp', 'Pixel 7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_T0vxyevakD', 'prod_-E2jEhgO26', 'Black - 128GB', 'GOOG-XLR3HN-0CKK', 325000, 10, '{"color":"Black","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_LQN4h432XX', 'prod_-E2jEhgO26', 'Black - 256GB', 'GOOG-XLR3HN-V4FX', 325000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_aQgps-naoW', 'prod_-E2jEhgO26', 'White - 128GB', 'GOOG-XLR3HN-GM9L', 325000, 10, '{"color":"White","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_6YQFXahAv9', 'prod_-E2jEhgO26', 'White - 256GB', 'GOOG-XLR3HN-VXKE', 325000, 10, '{"color":"White","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_O-Lw1w7rrm', 'prod_-E2jEhgO26', 'Lemongrass - 128GB', 'GOOG-XLR3HN-4S0H', 325000, 10, '{"color":"Lemongrass","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_W5qBhObHmm', 'prod_-E2jEhgO26', 'Lemongrass - 256GB', 'GOOG-XLR3HN-SW5F', 325000, 10, '{"color":"Lemongrass","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_i-41cklGAI', 'cat_tablettes', 'iPad 10th Gen (2022)', 'ipad-10th-gen-2022--W_6Wt', 260000, 430000, 'APPL-QMP9TK', 'Apple', 1, 0, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_rEE2IarViZ', 'prod_i-41cklGAI', 'products/tablettes/ipad-10th-gen-2022.webp', 'iPad 10th Gen (2022)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_xU5XXaHzpS', 'prod_i-41cklGAI', 'Blue - 64GB', 'APPL-QMP9TK-OBWG', 260000, 10, '{"color":"Blue","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_RV8NVe0AAe', 'prod_i-41cklGAI', 'Blue - 256GB', 'APPL-QMP9TK-HCD1', 430000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_mbjsZwa1su', 'prod_i-41cklGAI', 'Pink - 64GB', 'APPL-QMP9TK--BMN', 260000, 10, '{"color":"Pink","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_8CTgIQ8F5B', 'prod_i-41cklGAI', 'Pink - 256GB', 'APPL-QMP9TK-VHYR', 430000, 10, '{"color":"Pink","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_BmwD2gibbg', 'prod_i-41cklGAI', 'Yellow - 64GB', 'APPL-QMP9TK-IREV', 260000, 10, '{"color":"Yellow","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_8d5oqT31ia', 'prod_i-41cklGAI', 'Yellow - 256GB', 'APPL-QMP9TK-LVMA', 430000, 10, '{"color":"Yellow","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_v0jfpB0JFJ', 'prod_i-41cklGAI', 'Silver - 64GB', 'APPL-QMP9TK-I7-K', 260000, 10, '{"color":"Silver","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_l1dFcOPV3X', 'prod_i-41cklGAI', 'Silver - 256GB', 'APPL-QMP9TK-OJTW', 430000, 10, '{"color":"Silver","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_ECFtLfMQOx', 'cat_tablettes', 'iPad 11th Gen (2025)', 'ipad-11th-gen-2025-aZKprO', 310000, 410000, 'APPL-BZRSOK', 'Apple', 1, 0, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_sziIBkbg_i', 'prod_ECFtLfMQOx', 'products/tablettes/ipad-11th-gen-2025.webp', 'iPad 11th Gen (2025)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_e62LcEdbGg', 'prod_ECFtLfMQOx', 'Blue - 128GB', 'APPL-BZRSOK-R7RC', 310000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_NRveVSrYPy', 'prod_ECFtLfMQOx', 'Blue - 256GB', 'APPL-BZRSOK-SKOL', 410000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_vXrD74Mg6r', 'prod_ECFtLfMQOx', 'Yellow - 128GB', 'APPL-BZRSOK-LGHP', 310000, 10, '{"color":"Yellow","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_eYyZBoYO7f', 'prod_ECFtLfMQOx', 'Yellow - 256GB', 'APPL-BZRSOK-TJEP', 410000, 10, '{"color":"Yellow","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_CpZWAO-wOR', 'prod_ECFtLfMQOx', 'Silver - 128GB', 'APPL-BZRSOK-TVL4', 310000, 10, '{"color":"Silver","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_VUaXIlqRtP', 'prod_ECFtLfMQOx', 'Silver - 256GB', 'APPL-BZRSOK--CIK', 410000, 10, '{"color":"Silver","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_iCMJLTg_zQ', 'prod_ECFtLfMQOx', 'Pink - 128GB', 'APPL-BZRSOK-4UCS', 310000, 10, '{"color":"Pink","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_L4ArpEb9h1', 'prod_ECFtLfMQOx', 'Pink - 256GB', 'APPL-BZRSOK-WS2A', 410000, 10, '{"color":"Pink","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_meifwgrYpD', 'cat_tablettes', 'iPad mini 6 (2022)', 'ipad-mini-6-2022-MC_nfC', 300000, 400000, 'APPL-66WG3V', 'Apple', 1, 0, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_RwZeD0bFY7', 'prod_meifwgrYpD', 'products/tablettes/ipad-mini-6-2022.webp', 'iPad mini 6 (2022)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_9DnfR-spOu', 'prod_meifwgrYpD', 'Space Gray - 64GB', 'APPL-66WG3V-KNTG', 300000, 10, '{"color":"Space Gray","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ypDLUyQr-z', 'prod_meifwgrYpD', 'Space Gray - 256GB', 'APPL-66WG3V-LTZR', 400000, 10, '{"color":"Space Gray","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_nRkzYGi-0i', 'prod_meifwgrYpD', 'Pink - 64GB', 'APPL-66WG3V-ARUG', 300000, 10, '{"color":"Pink","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_HgwVxquS4C', 'prod_meifwgrYpD', 'Pink - 256GB', 'APPL-66WG3V-IWZC', 400000, 10, '{"color":"Pink","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_0wI3OpdYAx', 'prod_meifwgrYpD', 'Purple - 64GB', 'APPL-66WG3V-FULL', 300000, 10, '{"color":"Purple","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_vgUtu2TIA4', 'prod_meifwgrYpD', 'Purple - 256GB', 'APPL-66WG3V-CNJH', 400000, 10, '{"color":"Purple","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_KGgVGluZuJ', 'prod_meifwgrYpD', 'Starlight - 64GB', 'APPL-66WG3V-3HL-', 300000, 10, '{"color":"Starlight","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_b2lfXuRTly', 'prod_meifwgrYpD', 'Starlight - 256GB', 'APPL-66WG3V-OTFD', 400000, 10, '{"color":"Starlight","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_p7MFmvEgtS', 'cat_tablettes', 'iPad mini 7 (2024)', 'ipad-mini-7-2024-xL2KAv', 310000, 600000, 'APPL-3CQKHY', 'Apple', 1, 0, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ETZzcadPTt', 'prod_p7MFmvEgtS', 'products/tablettes/ipad-mini-7-2024.webp', 'iPad mini 7 (2024)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__xmAxhc51u', 'prod_p7MFmvEgtS', 'Space Gray - 128GB', 'APPL-3CQKHY-0PUX', 310000, 10, '{"color":"Space Gray","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_uDlMwvXFGh', 'prod_p7MFmvEgtS', 'Space Gray - 256GB', 'APPL-3CQKHY-FZO_', 455000, 10, '{"color":"Space Gray","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Mn24W2UlAR', 'prod_p7MFmvEgtS', 'Space Gray - 512GB', 'APPL-3CQKHY-VBQO', 600000, 10, '{"color":"Space Gray","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_VEKXx7_cJC', 'prod_p7MFmvEgtS', 'Blue - 128GB', 'APPL-3CQKHY-E16U', 310000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_J45cLnYlxY', 'prod_p7MFmvEgtS', 'Blue - 256GB', 'APPL-3CQKHY-9FJS', 455000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_z-fyzVxkPb', 'prod_p7MFmvEgtS', 'Blue - 512GB', 'APPL-3CQKHY-BFFF', 600000, 10, '{"color":"Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_0x_Bz_VMzP', 'prod_p7MFmvEgtS', 'Purple - 128GB', 'APPL-3CQKHY-UX_9', 310000, 10, '{"color":"Purple","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_k7Gl5Xdcqq', 'prod_p7MFmvEgtS', 'Purple - 256GB', 'APPL-3CQKHY-NTAA', 455000, 10, '{"color":"Purple","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_VVRh1su36y', 'prod_p7MFmvEgtS', 'Purple - 512GB', 'APPL-3CQKHY-YRAK', 600000, 10, '{"color":"Purple","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_xsXCk8RS8c', 'prod_p7MFmvEgtS', 'Starlight - 128GB', 'APPL-3CQKHY-PARS', 310000, 10, '{"color":"Starlight","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_a9Fl-PGc6d', 'prod_p7MFmvEgtS', 'Starlight - 256GB', 'APPL-3CQKHY-ZD7D', 455000, 10, '{"color":"Starlight","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_c7bXXpQ5ok', 'prod_p7MFmvEgtS', 'Starlight - 512GB', 'APPL-3CQKHY-ASL2', 600000, 10, '{"color":"Starlight","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Ws3vHxpQd4', 'cat_tablettes', 'iPad Air 6th (M2, 2024)', 'ipad-air-6th-m2-2024-WJaPEm', 390000, 490000, 'APPL-L1CFEF', 'Apple', 1, 0, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_t-qKrRd8ne', 'prod_Ws3vHxpQd4', 'products/tablettes/ipad-air-6th-m2-2024.webp', 'iPad Air 6th (M2, 2024)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_NcKv02ipWq', 'prod_Ws3vHxpQd4', 'Space Gray - 128GB', 'APPL-L1CFEF-3QA9', 390000, 10, '{"color":"Space Gray","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_eibaWJPoOi', 'prod_Ws3vHxpQd4', 'Space Gray - 256GB', 'APPL-L1CFEF-ZR2M', 490000, 10, '{"color":"Space Gray","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_DQHm4DpuQN', 'prod_Ws3vHxpQd4', 'Blue - 128GB', 'APPL-L1CFEF-0LIL', 390000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_NwqZdh46R_', 'prod_Ws3vHxpQd4', 'Blue - 256GB', 'APPL-L1CFEF-O7M6', 490000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_EQow_fIe80', 'prod_Ws3vHxpQd4', 'Purple - 128GB', 'APPL-L1CFEF-YVLD', 390000, 10, '{"color":"Purple","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_eL3MfbsAIo', 'prod_Ws3vHxpQd4', 'Purple - 256GB', 'APPL-L1CFEF-UUMH', 490000, 10, '{"color":"Purple","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_bk6Qlcdxx0', 'prod_Ws3vHxpQd4', 'Starlight - 128GB', 'APPL-L1CFEF-K7QS', 390000, 10, '{"color":"Starlight","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_8Ptn7lX-um', 'prod_Ws3vHxpQd4', 'Starlight - 256GB', 'APPL-L1CFEF-HJJL', 490000, 10, '{"color":"Starlight","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_q3rZ2c4dUt', 'cat_tablettes', 'iPad Air 7th M3 - 2025', 'ipad-air-7th-m3-2025-VH-rvN', 490000, 800000, 'APPL-BPWNHT', 'Apple', 1, 0, 160);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_LpwXGKjNBY', 'prod_q3rZ2c4dUt', 'products/tablettes/ipad-air-7th-m3-2025.webp', 'iPad Air 7th M3 - 2025', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Zb5iSmoHDM', 'prod_q3rZ2c4dUt', 'Space Gray - 128GB', 'APPL-BPWNHT-_-NG', 490000, 10, '{"color":"Space Gray","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_E34dXNYcjR', 'prod_q3rZ2c4dUt', 'Space Gray - 256GB', 'APPL-BPWNHT-XGNS', 593333, 10, '{"color":"Space Gray","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_hEdYAJkxnf', 'prod_q3rZ2c4dUt', 'Space Gray - 512GB', 'APPL-BPWNHT-ZXX6', 696666, 10, '{"color":"Space Gray","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_yIFZA-14G5', 'prod_q3rZ2c4dUt', 'Space Gray - 1TB', 'APPL-BPWNHT-KOTO', 800000, 10, '{"color":"Space Gray","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ESE1tiO8bm', 'prod_q3rZ2c4dUt', 'Blue - 128GB', 'APPL-BPWNHT-LZL9', 490000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_hxHYw7afDr', 'prod_q3rZ2c4dUt', 'Blue - 256GB', 'APPL-BPWNHT-B7OL', 593333, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ahi-gkrzWB', 'prod_q3rZ2c4dUt', 'Blue - 512GB', 'APPL-BPWNHT-HTW_', 696666, 10, '{"color":"Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_0ap91lqhZi', 'prod_q3rZ2c4dUt', 'Blue - 1TB', 'APPL-BPWNHT-ZME_', 800000, 10, '{"color":"Blue","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_H7z8FIau80', 'prod_q3rZ2c4dUt', 'Purple - 128GB', 'APPL-BPWNHT-ISYQ', 490000, 10, '{"color":"Purple","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_mo43_IP3Ly', 'prod_q3rZ2c4dUt', 'Purple - 256GB', 'APPL-BPWNHT-3SLB', 593333, 10, '{"color":"Purple","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ynVdwpAYPL', 'prod_q3rZ2c4dUt', 'Purple - 512GB', 'APPL-BPWNHT-TFVG', 696666, 10, '{"color":"Purple","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_9HOjLL90B9', 'prod_q3rZ2c4dUt', 'Purple - 1TB', 'APPL-BPWNHT-1OJW', 800000, 10, '{"color":"Purple","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_FQ9-tdw8LH', 'prod_q3rZ2c4dUt', 'Starlight - 128GB', 'APPL-BPWNHT-GYJ9', 490000, 10, '{"color":"Starlight","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_wTHdDB8j5r', 'prod_q3rZ2c4dUt', 'Starlight - 256GB', 'APPL-BPWNHT-7-CQ', 593333, 10, '{"color":"Starlight","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_oGowjswZ7S', 'prod_q3rZ2c4dUt', 'Starlight - 512GB', 'APPL-BPWNHT-Y85A', 696666, 10, '{"color":"Starlight","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Uvg9tidLno', 'prod_q3rZ2c4dUt', 'Starlight - 1TB', 'APPL-BPWNHT-75UV', 800000, 10, '{"color":"Starlight","storage":"1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_3_jdimpbLU', 'cat_tablettes', 'iPad Pro M4 - 2024', 'ipad-pro-m4-2024-Mabno7', 100000, 1070000, 'APPL-KTJFDO', 'Apple', 1, 0, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_g4F662XRvi', 'prod_3_jdimpbLU', 'products/tablettes/ipad-pro-m4-2024.webp', 'iPad Pro M4 - 2024', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_fgydwxUDtx', 'prod_3_jdimpbLU', 'Space Gray - 256GB', 'APPL-KTJFDO-K9ZS', 100000, 10, '{"color":"Space Gray","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_V_pZT58sO2', 'prod_3_jdimpbLU', 'Space Gray - 512GB', 'APPL-KTJFDO-_0KF', 423333, 10, '{"color":"Space Gray","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ky9yL-w57B', 'prod_3_jdimpbLU', 'Space Gray - 1TB', 'APPL-KTJFDO-BCOS', 746666, 10, '{"color":"Space Gray","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_zK8sGaQEqg', 'prod_3_jdimpbLU', 'Space Gray - 2TB', 'APPL-KTJFDO-CSSK', 1070000, 10, '{"color":"Space Gray","storage":"2TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_UiivhEFeFA', 'prod_3_jdimpbLU', 'Silver - 256GB', 'APPL-KTJFDO-XWGH', 100000, 10, '{"color":"Silver","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ZRO0jAWaXP', 'prod_3_jdimpbLU', 'Silver - 512GB', 'APPL-KTJFDO-RPRL', 423333, 10, '{"color":"Silver","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_01KxhUMO7f', 'prod_3_jdimpbLU', 'Silver - 1TB', 'APPL-KTJFDO-DCA4', 746666, 10, '{"color":"Silver","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_P7guSwZy3j', 'prod_3_jdimpbLU', 'Silver - 2TB', 'APPL-KTJFDO-7M0F', 1070000, 10, '{"color":"Silver","storage":"2TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_e28XabXFbk', 'cat_tablettes', 'Samsung Tab A9+', 'samsung-tab-a9-orJwNK', 145000, 220000, 'SAMS-7HG1LK', 'Samsung', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_UU6IY5GbC1', 'prod_e28XabXFbk', 'products/tablettes/samsung-tab-a9.webp', 'Samsung Tab A9+', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_nHD-THkger', 'prod_e28XabXFbk', 'Grey - 64GB', 'SAMS-7HG1LK-LTVL', 145000, 10, '{"color":"Grey","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_yJByqYLoIt', 'prod_e28XabXFbk', 'Grey - 128GB', 'SAMS-7HG1LK-LKR1', 220000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_1praddr5ck', 'prod_e28XabXFbk', 'Blue - 64GB', 'SAMS-7HG1LK-8QOX', 145000, 10, '{"color":"Blue","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_tsJu3Jzeaj', 'prod_e28XabXFbk', 'Blue - 128GB', 'SAMS-7HG1LK-QZ6Q', 220000, 10, '{"color":"Blue","storage":"128GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_ALmaciikbX', 'cat_tablettes', 'Samsung Tab S9', 'samsung-tab-s9-gTm4Ag', 400000, 550000, 'SAMS-NWM3LF', 'Samsung', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_HKywf82lh1', 'prod_ALmaciikbX', 'products/tablettes/samsung-tab-s9.webp', 'Samsung Tab S9', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_m8Ur0525PU', 'prod_ALmaciikbX', 'Grey - 128GB', 'SAMS-NWM3LF--VQM', 400000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_DUXev68whx', 'prod_ALmaciikbX', 'Grey - 256GB', 'SAMS-NWM3LF-DI9U', 550000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_JXz9upBqYn', 'prod_ALmaciikbX', 'Beige - 128GB', 'SAMS-NWM3LF-HUI_', 400000, 10, '{"color":"Beige","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_NiW_1KPuY3', 'prod_ALmaciikbX', 'Beige - 256GB', 'SAMS-NWM3LF-XUZM', 550000, 10, '{"color":"Beige","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_ncOdYwGZhd', 'cat_tablettes', 'Samsung Tab S9 FE', 'samsung-tab-s9-fe-3KjrpI', 270000, NULL, 'SAMS-7QQORW', 'Samsung', 1, 0, 60);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_y52ZBBYo4l', 'prod_ncOdYwGZhd', 'products/tablettes/samsung-tab-s9-fe.webp', 'Samsung Tab S9 FE', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_B3lWAX3ryk', 'prod_ncOdYwGZhd', 'Grey - 128GB', 'SAMS-7QQORW-I1T3', 270000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_bbp8I9Lo8N', 'prod_ncOdYwGZhd', 'Grey - 256GB', 'SAMS-7QQORW-NRAC', 270000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_6k6oJmwk0c', 'prod_ncOdYwGZhd', 'Mint - 128GB', 'SAMS-7QQORW-QGHR', 270000, 10, '{"color":"Mint","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_pERo9GJ63-', 'prod_ncOdYwGZhd', 'Mint - 256GB', 'SAMS-7QQORW-PAHM', 270000, 10, '{"color":"Mint","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_tnYMQxcLmy', 'prod_ncOdYwGZhd', 'Pink - 128GB', 'SAMS-7QQORW-B4CU', 270000, 10, '{"color":"Pink","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_WtDYOyh_qp', 'prod_ncOdYwGZhd', 'Pink - 256GB', 'SAMS-7QQORW-ZIVG', 270000, 10, '{"color":"Pink","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_7k0yKsuLMj', 'cat_tablettes', 'Samsung Tab S9 FE+', 'samsung-tab-s9-fe-mnRbyU', 340000, NULL, 'SAMS-L7ZTR6', 'Samsung', 1, 0, 60);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_j8mDhNJonN', 'prod_7k0yKsuLMj', 'products/tablettes/samsung-tab-s9-fe.webp', 'Samsung Tab S9 FE+', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_7R1F_1Jvtd', 'prod_7k0yKsuLMj', 'Grey - 128GB', 'SAMS-L7ZTR6-8DRA', 340000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_wfQ-W43YPW', 'prod_7k0yKsuLMj', 'Grey - 256GB', 'SAMS-L7ZTR6-85O_', 340000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_WOPXgqlrgX', 'prod_7k0yKsuLMj', 'Mint - 128GB', 'SAMS-L7ZTR6-KRMN', 340000, 10, '{"color":"Mint","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_muSbDZ_nCa', 'prod_7k0yKsuLMj', 'Mint - 256GB', 'SAMS-L7ZTR6-MJI0', 340000, 10, '{"color":"Mint","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ZAyaJbSk81', 'prod_7k0yKsuLMj', 'Pink - 128GB', 'SAMS-L7ZTR6-DO9F', 340000, 10, '{"color":"Pink","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_4ujM9gyj77', 'prod_7k0yKsuLMj', 'Pink - 256GB', 'SAMS-L7ZTR6-BRXZ', 340000, 10, '{"color":"Pink","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_yH_QdlWMCL', 'cat_tablettes', 'Samsung Tab S9+', 'samsung-tab-s9-VhRdy4', 680000, 780000, 'SAMS-3AAIVF', 'Samsung', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ixgRGjm9is', 'prod_yH_QdlWMCL', 'products/tablettes/samsung-tab-s9.webp', 'Samsung Tab S9+', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Ny9bh_oj6w', 'prod_yH_QdlWMCL', 'Grey - 256GB', 'SAMS-3AAIVF-FMA4', 680000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_tN2HYQetdl', 'prod_yH_QdlWMCL', 'Grey - 512GB', 'SAMS-3AAIVF-OHAL', 780000, 10, '{"color":"Grey","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_3JHFnnTJwj', 'prod_yH_QdlWMCL', 'Beige - 256GB', 'SAMS-3AAIVF-XU2J', 680000, 10, '{"color":"Beige","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_XeDQ2WIg3T', 'prod_yH_QdlWMCL', 'Beige - 512GB', 'SAMS-3AAIVF-HRNV', 780000, 10, '{"color":"Beige","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_TB2jjKmBBv', 'cat_tablettes', 'Samsung Tab S9 Ultra', 'samsung-tab-s9-ultra-5-mkhw', 980000, NULL, 'SAMS-RV4MCM', 'Samsung', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_tByRjL7PV4', 'prod_TB2jjKmBBv', 'products/tablettes/samsung-tab-s9-ultra.webp', 'Samsung Tab S9 Ultra', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_kRH6MDBTD3', 'prod_TB2jjKmBBv', 'Graphite - 256GB', 'SAMS-RV4MCM-WKVZ', 980000, 10, '{"color":"Graphite","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_4UKFH-K8HE', 'prod_TB2jjKmBBv', 'Graphite - 512GB', 'SAMS-RV4MCM-EEX5', 980000, 10, '{"color":"Graphite","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_vg2-TsBtUD', 'prod_TB2jjKmBBv', 'Beige - 256GB', 'SAMS-RV4MCM-S7S9', 980000, 10, '{"color":"Beige","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_1EaUhL0g7Y', 'prod_TB2jjKmBBv', 'Beige - 512GB', 'SAMS-RV4MCM-N1LZ', 980000, 10, '{"color":"Beige","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_sUJej7QKru', 'cat_tablettes', 'Samsung Tab S10 Ultra', 'samsung-tab-s10-ultra-niEBLA', 700000, 780000, 'SAMS-FWZMWG', 'Samsung', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_G1nS2rDkMO', 'prod_sUJej7QKru', 'products/tablettes/samsung-tab-s10-ultra.webp', 'Samsung Tab S10 Ultra', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_F1bE2sAU3B', 'prod_sUJej7QKru', 'Grey - 256GB', 'SAMS-FWZMWG-AINF', 700000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_bqFmV7lIGS', 'prod_sUJej7QKru', 'Grey - 512GB', 'SAMS-FWZMWG-GZUT', 780000, 10, '{"color":"Grey","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_rjiFyuWZNa', 'prod_sUJej7QKru', 'Silver - 256GB', 'SAMS-FWZMWG-YZD8', 700000, 10, '{"color":"Silver","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_H43XMP_c-9', 'prod_sUJej7QKru', 'Silver - 512GB', 'SAMS-FWZMWG-R6IP', 780000, 10, '{"color":"Silver","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_nXNgxZV3Sy', 'cat_tablettes', 'Redmi Pad 2 4G', 'redmi-pad-2-4g-nvLFW6', 180000, NULL, 'XIAO-3DT5CI', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_LWwYOKHII6', 'prod_nXNgxZV3Sy', 'products/tablettes/redmi-pad-2-4g.webp', 'Redmi Pad 2 4G', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_TVhMn5b-Ve', 'prod_nXNgxZV3Sy', 'Grey - 128GB', 'XIAO-3DT5CI-YGFI', 180000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_jvpEjw3D-E', 'prod_nXNgxZV3Sy', 'Mint Green - 128GB', 'XIAO-3DT5CI-UY68', 180000, 10, '{"color":"Mint Green","storage":"128GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_z_b6q_fleY', 'cat_tablettes', 'Redmi Pad 6S Pro', 'redmi-pad-6s-pro-v6fBA4', 440000, NULL, 'XIAO-7QR3ID', 'Xiaomi', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_NVvS1nccjP', 'prod_z_b6q_fleY', 'products/tablettes/redmi-pad-6s-pro.webp', 'Redmi Pad 6S Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_kx1-rOlsW-', 'prod_z_b6q_fleY', 'Grey - 256GB', 'XIAO-7QR3ID-AIIO', 440000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_z8TENJ72ej', 'prod_z_b6q_fleY', 'Grey - 512GB', 'XIAO-7QR3ID-I0P4', 440000, 10, '{"color":"Grey","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_3OMS8Oi0Je', 'prod_z_b6q_fleY', 'Black - 256GB', 'XIAO-7QR3ID-ZWCC', 440000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_w7vnEMWpum', 'prod_z_b6q_fleY', 'Black - 512GB', 'XIAO-7QR3ID-S2HL', 440000, 10, '{"color":"Black","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Dls0Y6rJyk', 'cat_tablettes', 'Redmi Pad 2', 'redmi-pad-2-MiwCuP', 170000, NULL, 'XIAO-XS0HOK', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_yVaJn6U99W', 'prod_Dls0Y6rJyk', 'products/tablettes/redmi-pad-2.webp', 'Redmi Pad 2', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_vzCtVdN-ME', 'prod_Dls0Y6rJyk', 'Grey - 128GB', 'XIAO-XS0HOK-GKPV', 170000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_UdQnGwAYUT', 'prod_Dls0Y6rJyk', 'Graphite Grey - 128GB', 'XIAO-XS0HOK-OBOB', 170000, 10, '{"color":"Graphite Grey","storage":"128GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_WqO8WS57ot', 'cat_tablettes', 'Xiaomi Pad 7', 'xiaomi-pad-7-M8V1CV', 255000, NULL, 'XIAO-IQZWHM', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_KKn4j4WDQi', 'prod_WqO8WS57ot', 'products/tablettes/xiaomi-pad-7.webp', 'Xiaomi Pad 7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_fbQb12tQyc', 'prod_WqO8WS57ot', 'Black - 256GB', 'XIAO-IQZWHM-XQXB', 255000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_YBMr-DmX5h', 'prod_WqO8WS57ot', 'Green - 256GB', 'XIAO-IQZWHM-9MPJ', 255000, 10, '{"color":"Green","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_wbWt-N0378', 'cat_tablettes', 'Xiaomi Pad 7 Pro', 'xiaomi-pad-7-pro-AVCd4q', 335000, NULL, 'XIAO-PVMNZT', 'Xiaomi', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_tPVA9_O3wJ', 'prod_wbWt-N0378', 'products/tablettes/xiaomi-pad-7-pro.webp', 'Xiaomi Pad 7 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_9knSuMmWr3', 'prod_wbWt-N0378', 'Black - 256GB', 'XIAO-PVMNZT-4JQV', 335000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_7MWZJm7FeC', 'prod_wbWt-N0378', 'Black - 512GB', 'XIAO-PVMNZT-P0CD', 335000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_JElVkCytD0', 'prod_wbWt-N0378', 'Green - 256GB', 'XIAO-PVMNZT-XSGK', 335000, 10, '{"color":"Green","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_vzrBpbdRww', 'prod_wbWt-N0378', 'Green - 512GB', 'XIAO-PVMNZT-CVCD', 335000, 10, '{"color":"Green","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Rj8XurYyrq', 'cat_tablettes', 'Redmi Pad SE 8.7', 'redmi-pad-se-8-7-dIz1eH', 125000, NULL, 'XIAO-E_UAXC', 'Xiaomi', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ZxNLIzklYt', 'prod_Rj8XurYyrq', 'products/tablettes/redmi-pad-se-8-7.webp', 'Redmi Pad SE 8.7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_oal3asFfwv', 'prod_Rj8XurYyrq', 'Grey - 64GB', 'XIAO-E_UAXC-DKQU', 125000, 10, '{"color":"Grey","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_XwKV6IrFdR', 'prod_Rj8XurYyrq', 'Grey - 128GB', 'XIAO-E_UAXC-WW1G', 125000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ydwbwlOvJ4', 'prod_Rj8XurYyrq', 'Blue - 64GB', 'XIAO-E_UAXC-SBXC', 125000, 10, '{"color":"Blue","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_5IoGCBM7VH', 'prod_Rj8XurYyrq', 'Blue - 128GB', 'XIAO-E_UAXC-HWMR', 125000, 10, '{"color":"Blue","storage":"128GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_LVmm3gNsYC', 'cat_tablettes', 'HONOR PAD 10', 'honor-pad-10-5vrcN1', 280000, NULL, 'HONO-ELXQVU', 'HONOR', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_2U0NRLmbXe', 'prod_LVmm3gNsYC', 'products/tablettes/honor-pad-10.webp', 'HONOR PAD 10', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_NNtNrUR8by', 'prod_LVmm3gNsYC', 'Grey - 128GB', 'HONO-ELXQVU-MU4J', 280000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_MKrSTvURIk', 'prod_LVmm3gNsYC', 'Grey - 256GB', 'HONO-ELXQVU-J12V', 280000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ev8TXiNGG4', 'prod_LVmm3gNsYC', 'Blue - 128GB', 'HONO-ELXQVU-7Y1I', 280000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_qiUGy1u__3', 'prod_LVmm3gNsYC', 'Blue - 256GB', 'HONO-ELXQVU--9M5', 280000, 10, '{"color":"Blue","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Lor-yjN2pn', 'cat_tablettes', 'OnePlus Pad 3', 'oneplus-pad-3-owdQ_E', 580000, 600000, 'ONEP-JFBYJO', 'OnePlus', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_WmIvVkRqVt', 'prod_Lor-yjN2pn', 'products/tablettes/oneplus-pad-3.webp', 'OnePlus Pad 3', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_fLNhJUAx-g', 'prod_Lor-yjN2pn', 'Black - 256GB', 'ONEP-JFBYJO-1KUA', 580000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_V4Lj2rptbt', 'prod_Lor-yjN2pn', 'Black - 512GB', 'ONEP-JFBYJO-MJV3', 600000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_yMm6TZ4DM-', 'prod_Lor-yjN2pn', 'Grey - 256GB', 'ONEP-JFBYJO-6O-X', 580000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_BjO63e_Rpa', 'prod_Lor-yjN2pn', 'Grey - 512GB', 'ONEP-JFBYJO-EFXS', 600000, 10, '{"color":"Grey","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_mUZF18DmYi', 'cat_tablettes', 'REDMAGIC Nova Gaming', 'redmagic-nova-gaming-CdIK8h', 500000, 600000, 'REDM-5PVVZN', 'REDMAGIC', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_8RBu8aQIsE', 'prod_mUZF18DmYi', 'products/tablettes/redmagic-nova-gaming.webp', 'REDMAGIC Nova Gaming', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Uzp8Rpdqye', 'prod_mUZF18DmYi', 'Black Infinity - 256GB', 'REDM-5PVVZN-KWJI', 500000, 10, '{"color":"Black Infinity","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_x7-MAIIOQg', 'prod_mUZF18DmYi', 'Black Infinity - 512GB', 'REDM-5PVVZN-CAUX', 600000, 10, '{"color":"Black Infinity","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_IhhH3u4JvW', 'cat_tablettes', 'Redmi Pad Pro 5G', 'redmi-pad-pro-5g-JXguxu', 220000, NULL, 'XIAO-VBXEIZ', 'Xiaomi', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img__ai2Jidrho', 'prod_IhhH3u4JvW', 'products/tablettes/redmi-pad-pro-5g.webp', 'Redmi Pad Pro 5G', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_mDfkGvtwYy', 'prod_IhhH3u4JvW', 'Grey - 128GB', 'XIAO-VBXEIZ-PFLF', 220000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_dFWiy4R1XY', 'prod_IhhH3u4JvW', 'Grey - 256GB', 'XIAO-VBXEIZ-DUUY', 220000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_27SaEGDfqk', 'prod_IhhH3u4JvW', 'Blue - 128GB', 'XIAO-VBXEIZ-ALY4', 220000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_qQglFrEGjb', 'prod_IhhH3u4JvW', 'Blue - 256GB', 'XIAO-VBXEIZ-ZWF9', 220000, 10, '{"color":"Blue","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_XPUTp0Ou-T', 'cat_tablettes', 'Redmi Pad Pro WIFI', 'redmi-pad-pro-wifi-pXHjzo', 195000, NULL, 'XIAO-XAXJUU', 'Xiaomi', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_0luVDf7KMY', 'prod_XPUTp0Ou-T', 'products/tablettes/redmi-pad-pro-wifi.webp', 'Redmi Pad Pro WIFI', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_QGqLsH4LDg', 'prod_XPUTp0Ou-T', 'Grey - 128GB', 'XIAO-XAXJUU-39I4', 195000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_dhCEL7lgqk', 'prod_XPUTp0Ou-T', 'Grey - 256GB', 'XIAO-XAXJUU-HDPD', 195000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_vKcAFTYAn6', 'prod_XPUTp0Ou-T', 'Blue - 128GB', 'XIAO-XAXJUU-D8GK', 195000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_F33xOIDf4S', 'prod_XPUTp0Ou-T', 'Blue - 256GB', 'XIAO-XAXJUU-LTOK', 195000, 10, '{"color":"Blue","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_HoIKaNzDBt', 'cat_tablettes', 'Redmi Pad SE', 'redmi-pad-se-2dkPl1', 195000, NULL, 'XIAO-PFCCHZ', 'Xiaomi', 1, 0, 60);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_V5sBAVML4w', 'prod_HoIKaNzDBt', 'products/tablettes/redmi-pad-se.webp', 'Redmi Pad SE', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ljdqmXS3cN', 'prod_HoIKaNzDBt', 'Grey - 128GB', 'XIAO-PFCCHZ-KBPP', 195000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_dJE5VyPg2v', 'prod_HoIKaNzDBt', 'Grey - 256GB', 'XIAO-PFCCHZ-EUPP', 195000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_MA6PTV5Kg8', 'prod_HoIKaNzDBt', 'Blue - 128GB', 'XIAO-PFCCHZ-K9VJ', 195000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_JqXhmd_M06', 'prod_HoIKaNzDBt', 'Blue - 256GB', 'XIAO-PFCCHZ-TVYF', 195000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_q5ogDxvooz', 'prod_HoIKaNzDBt', 'Purple - 128GB', 'XIAO-PFCCHZ-MME9', 195000, 10, '{"color":"Purple","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_g2LRS-tBE-', 'prod_HoIKaNzDBt', 'Purple - 256GB', 'XIAO-PFCCHZ-RGIT', 195000, 10, '{"color":"Purple","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_PA1CjUOcc2', 'cat_montres', 'Apple Watch Series 10', 'apple-watch-series-10-PiAGdO', 250000, 680000, 'APPL-IOG8MH', 'Apple', 1, 0, 100);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_FHsLulXzTp', 'prod_PA1CjUOcc2', 'products/montres-connectees/apple-watch-series-10.webp', 'Apple Watch Series 10', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_26EsWrLn8X', 'prod_PA1CjUOcc2', 'Black - 42mm', 'APPL-IOG8MH-TFKB', 250000, 10, '{"color":"Black","storage":"42mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_7AygISx4T9', 'prod_PA1CjUOcc2', 'Black - 46mm', 'APPL-IOG8MH-W3QO', 280000, 10, '{"color":"Black","storage":"46mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_gvtTKgbr2p', 'prod_PA1CjUOcc2', 'Silver - 42mm', 'APPL-IOG8MH-808C', 250000, 10, '{"color":"Silver","storage":"42mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_qk4KoqUCtW', 'prod_PA1CjUOcc2', 'Silver - 46mm', 'APPL-IOG8MH-RPUW', 280000, 10, '{"color":"Silver","storage":"46mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_l-beKwUcEl', 'prod_PA1CjUOcc2', 'Gold - 42mm', 'APPL-IOG8MH-JTUB', 250000, 10, '{"color":"Gold","storage":"42mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__7I3MUPG_b', 'prod_PA1CjUOcc2', 'Gold - 46mm', 'APPL-IOG8MH-IY7G', 280000, 10, '{"color":"Gold","storage":"46mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_m7XbgLxlsT', 'prod_PA1CjUOcc2', 'Rose - 42mm', 'APPL-IOG8MH-BPPM', 250000, 10, '{"color":"Rose","storage":"42mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_8vBTQNOBnv', 'prod_PA1CjUOcc2', 'Rose - 46mm', 'APPL-IOG8MH-W44F', 280000, 10, '{"color":"Rose","storage":"46mm"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_YJGgoNDaJ5', 'cat_montres', 'Apple Watch Ultra 2', 'apple-watch-ultra-2-3sbm-0', 500000, 680000, 'APPL-7F4BWH', 'Apple', 1, 0, 60);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_YWPHRFXETc', 'prod_YJGgoNDaJ5', 'products/montres-connectees/apple-watch-ultra-2.webp', 'Apple Watch Ultra 2', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_r--SnF0m-E', 'prod_YJGgoNDaJ5', 'Black - 49mm', 'APPL-7F4BWH-DG8X', 530000, 10, '{"color":"Black","storage":"49mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ge-oT0EjbE', 'prod_YJGgoNDaJ5', 'Orange - 49mm', 'APPL-7F4BWH-ZZ2F', 530000, 10, '{"color":"Orange","storage":"49mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_PVa6U2A9J4', 'prod_YJGgoNDaJ5', 'Natural - 49mm', 'APPL-7F4BWH-35ZR', 500000, 10, '{"color":"Natural","storage":"49mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_2KrTusruni', 'prod_YJGgoNDaJ5', 'Silver - 49mm', 'APPL-7F4BWH-LV42', 680000, 10, '{"color":"Silver","storage":"49mm"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_SVIKOPJCtS', 'cat_montres', 'Huawei Watch Ultimate', 'huawei-watch-ultimate-utt_wI', 255000, NULL, 'HUAW-K3AJVQ', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_bn6TB6aM1a', 'prod_SVIKOPJCtS', 'products/montres-connectees/huawei-watch-ultimate.webp', 'Huawei Watch Ultimate', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_gUUztFxOP5', 'prod_SVIKOPJCtS', 'Black - 48mm', 'HUAW-K3AJVQ-USUL', 255000, 10, '{"color":"Black","storage":"48mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_8eXdTpbJkn', 'prod_SVIKOPJCtS', 'Brown - 48mm', 'HUAW-K3AJVQ-NBVT', 255000, 10, '{"color":"Brown","storage":"48mm"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_aZHbXcas1Z', 'cat_montres', 'Huawei Watch 5', 'huawei-watch-5-c_Rx5_', 300000, 350000, 'HUAW-QOU99N', 'Huawei', 1, 0, 50);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_f6Tw8smIPd', 'prod_aZHbXcas1Z', 'products/montres-connectees/huawei-watch-5.webp', 'Huawei Watch 5', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__xIcNPawbL', 'prod_aZHbXcas1Z', 'Silver - 46mm', 'HUAW-QOU99N-PIDQ', 350000, 10, '{"color":"Silver","storage":"46mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_HhMaPtWIOp', 'prod_aZHbXcas1Z', 'Brown - 46mm', 'HUAW-QOU99N-FBWP', 330000, 10, '{"color":"Brown","storage":"46mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_EFTNrP8SO8', 'prod_aZHbXcas1Z', 'Titanium - 46mm', 'HUAW-QOU99N-YJEY', 350000, 10, '{"color":"Titanium","storage":"46mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_p4qKILllrS', 'prod_aZHbXcas1Z', 'Violet - 46mm', 'HUAW-QOU99N-KEAD', 300000, 10, '{"color":"Violet","storage":"46mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_K8aD1UIywW', 'prod_aZHbXcas1Z', 'Black - 46mm', 'HUAW-QOU99N-HDHL', 300000, 10, '{"color":"Black","storage":"46mm"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_m1OhsCrF1x', 'cat_montres', 'Huawei Watch 4 Pro Space Edition', 'huawei-watch-4-pro-space-edition-E70u_j', 225000, NULL, 'HUAW-TT_1A2', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_8LXKBKhNzW', 'prod_m1OhsCrF1x', 'products/montres-connectees/huawei-watch-4-pro-space-edition.webp', 'Huawei Watch 4 Pro Space Edition', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_pauOGBfTjc', 'prod_m1OhsCrF1x', 'Black - 48mm', 'HUAW-TT_1A2-TJCN', 225000, 10, '{"color":"Black","storage":"48mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_L4uuYz7TyH', 'prod_m1OhsCrF1x', 'Silver - 48mm', 'HUAW-TT_1A2-UFPN', 225000, 10, '{"color":"Silver","storage":"48mm"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_OyEa88L5gD', 'cat_montres', 'Huawei Watch GT 5 Pro 46mm Multicolore', 'huawei-watch-gt-5-pro-46mm-multicolore-dPZrBz', 195000, NULL, 'HUAW-4NY5ZD', 'Huawei', 1, 0, 30);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Q21zYaUfvj', 'prod_OyEa88L5gD', 'products/montres-connectees/huawei-watch-gt-5-pro-46mm-multicolore.webp', 'Huawei Watch GT 5 Pro 46mm Multicolore', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_yyxxkgy-Nl', 'prod_OyEa88L5gD', 'Black - 46mm', 'HUAW-4NY5ZD-FHQZ', 195000, 10, '{"color":"Black","storage":"46mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__G0eQl2CQo', 'prod_OyEa88L5gD', 'Brown - 46mm', 'HUAW-4NY5ZD-N_35', 195000, 10, '{"color":"Brown","storage":"46mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_4R3KrdlsDZ', 'prod_OyEa88L5gD', 'Green - 46mm', 'HUAW-4NY5ZD-YCZW', 195000, 10, '{"color":"Green","storage":"46mm"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_rXhgvFdlui', 'cat_montres', 'Huawei Watch Fit 4 Pro', 'huawei-watch-fit-4-pro-28U7Kn', 150000, NULL, 'HUAW-W9AJR0', 'Huawei', 1, 0, 30);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_P7cm5kwsSA', 'prod_rXhgvFdlui', 'products/montres-connectees/huawei-watch-fit-4-pro.webp', 'Huawei Watch Fit 4 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_3dPa9chJch', 'prod_rXhgvFdlui', 'Black - Standard', 'HUAW-W9AJR0-JYRX', 150000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_NDIF7tqcGz', 'prod_rXhgvFdlui', 'Pink - Standard', 'HUAW-W9AJR0-Y-JI', 150000, 10, '{"color":"Pink","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_PuslP2-URG', 'prod_rXhgvFdlui', 'White - Standard', 'HUAW-W9AJR0-XP3S', 150000, 10, '{"color":"White","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_KP_bXV146L', 'cat_montres', 'Huawei Watch D2', 'huawei-watch-d2-AbNaxq', 250000, NULL, 'HUAW-B74MW5', 'Huawei', 1, 0, 30);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_5uK2TWgMPd', 'prod_KP_bXV146L', 'products/montres-connectees/huawei-watch-d2.webp', 'Huawei Watch D2', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_0FlNnH5UfC', 'prod_KP_bXV146L', 'Black - Standard', 'HUAW-B74MW5-KRPU', 250000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_hAk8vNjMex', 'prod_KP_bXV146L', 'Brown - Standard', 'HUAW-B74MW5-UDRF', 250000, 10, '{"color":"Brown","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_RTz4rybGfh', 'cat_montres', 'Samsung Watch 8', 'samsung-watch-8-izf46i', 195000, 375000, 'SAMS-HRLHG9', 'Samsung', 1, 0, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_cdNyxLVR-Q', 'prod_RTz4rybGfh', 'products/montres-connectees/samsung-watch-8.webp', 'Samsung Watch 8', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__JQXUPoVK6', 'prod_RTz4rybGfh', 'Black - 40mm', 'SAMS-HRLHG9-CDHC', 195000, 10, '{"color":"Black","storage":"40mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_IskX5N1G5j', 'prod_RTz4rybGfh', 'Black - 44mm', 'SAMS-HRLHG9-ZKI-', 195000, 10, '{"color":"Black","storage":"44mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_V1nj3tOCn5', 'prod_RTz4rybGfh', 'Silver - 40mm', 'SAMS-HRLHG9-8JRZ', 195000, 10, '{"color":"Silver","storage":"40mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_O8YZBfzP4R', 'prod_RTz4rybGfh', 'Silver - 44mm', 'SAMS-HRLHG9-407X', 195000, 10, '{"color":"Silver","storage":"44mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_KXTZpYIE4Z', 'prod_RTz4rybGfh', 'Pink - 40mm', 'SAMS-HRLHG9-FFWO', 195000, 10, '{"color":"Pink","storage":"40mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ySleQco3A3', 'prod_RTz4rybGfh', 'Pink - 44mm', 'SAMS-HRLHG9-RXOG', 195000, 10, '{"color":"Pink","storage":"44mm"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_-rc3yEGvuw', 'cat_montres', 'Samsung Fit 3 R390', 'samsung-fit-3-r390-Nf0Wa6', 105000, NULL, 'SAMS-UUWHZH', 'Samsung', 1, 0, 30);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_sZb5tb19nw', 'prod_-rc3yEGvuw', 'products/montres-connectees/samsung-fit-3-r390.webp', 'Samsung Fit 3 R390', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_T4rxgDJFFR', 'prod_-rc3yEGvuw', 'Black - Standard', 'SAMS-UUWHZH-6ZSW', 105000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_JuoSTksHCZ', 'prod_-rc3yEGvuw', 'Silver - Standard', 'SAMS-UUWHZH-BTG7', 105000, 10, '{"color":"Silver","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_eeVOzu_2yh', 'prod_-rc3yEGvuw', 'Pink - Standard', 'SAMS-UUWHZH-X9ZH', 105000, 10, '{"color":"Pink","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_IpU8zyeC3J', 'cat_montres', 'Apple Watch SE', 'apple-watch-se-_qN6GJ', 170000, 200000, 'APPL-QALZSE', 'Apple', 1, 0, 60);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_FT63vVI_DT', 'prod_IpU8zyeC3J', 'products/montres-connectees/apple-watch-se.webp', 'Apple Watch SE', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_bKqXe67Ccg', 'prod_IpU8zyeC3J', 'Silver - 40mm', 'APPL-QALZSE-TPCY', 170000, 10, '{"color":"Silver","storage":"40mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_pV_WZc0LRj', 'prod_IpU8zyeC3J', 'Silver - 44mm', 'APPL-QALZSE-BDMB', 200000, 10, '{"color":"Silver","storage":"44mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_vYUiOYeFmr', 'prod_IpU8zyeC3J', 'Starlight - 40mm', 'APPL-QALZSE-E0TL', 170000, 10, '{"color":"Starlight","storage":"40mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_b1sKi9HvqC', 'prod_IpU8zyeC3J', 'Starlight - 44mm', 'APPL-QALZSE-ATX4', 200000, 10, '{"color":"Starlight","storage":"44mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_jrkr9kUO68', 'prod_IpU8zyeC3J', 'Black - 40mm', 'APPL-QALZSE-QFDU', 170000, 10, '{"color":"Black","storage":"40mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_lWYH5hm0cV', 'prod_IpU8zyeC3J', 'Black - 44mm', 'APPL-QALZSE-OCBU', 200000, 10, '{"color":"Black","storage":"44mm"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_zOvq_qp21a', 'cat_montres', 'Apple Watch Series 9', 'apple-watch-series-9-78sqm_', 250000, NULL, 'APPL-2S5HOF', 'Apple', 1, 0, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_TgVksOunxI', 'prod_zOvq_qp21a', 'products/montres-connectees/apple-watch-series-9.webp', 'Apple Watch Series 9', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_V_OHQUcJWb', 'prod_zOvq_qp21a', 'Silver - 41mm', 'APPL-2S5HOF-9POH', 250000, 10, '{"color":"Silver","storage":"41mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_TwYjSyN-cN', 'prod_zOvq_qp21a', 'Silver - 45mm', 'APPL-2S5HOF-KFOO', 250000, 10, '{"color":"Silver","storage":"45mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_8SVmFSsOYv', 'prod_zOvq_qp21a', 'Black - 41mm', 'APPL-2S5HOF-U83K', 250000, 10, '{"color":"Black","storage":"41mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ToV1_dHvGO', 'prod_zOvq_qp21a', 'Black - 45mm', 'APPL-2S5HOF-GKIE', 250000, 10, '{"color":"Black","storage":"45mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_nM8r5ck_27', 'prod_zOvq_qp21a', 'Pink - 41mm', 'APPL-2S5HOF-KEI5', 250000, 10, '{"color":"Pink","storage":"41mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_5TGGdxFU05', 'prod_zOvq_qp21a', 'Pink - 45mm', 'APPL-2S5HOF-TWPC', 250000, 10, '{"color":"Pink","storage":"45mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_lk8V8Rhnz_', 'prod_zOvq_qp21a', 'Starlight - 41mm', 'APPL-2S5HOF-VH_1', 250000, 10, '{"color":"Starlight","storage":"41mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_0QDV5L-byV', 'prod_zOvq_qp21a', 'Starlight - 45mm', 'APPL-2S5HOF-BDBG', 250000, 10, '{"color":"Starlight","storage":"45mm"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_zbxgjG6Ny0', 'cat_montres', 'Redmi Watch 3 Active', 'redmi-watch-3-active-KNHakZ', 28000, NULL, 'XIAO-M39P5F', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_wPJ6kjenw4', 'prod_zbxgjG6Ny0', 'products/montres-connectees/redmi-watch-3-active.webp', 'Redmi Watch 3 Active', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Uxc95zrfpo', 'prod_zbxgjG6Ny0', 'Black - Standard', 'XIAO-M39P5F-M_ZC', 28000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_xmAuDRt_RH', 'prod_zbxgjG6Ny0', 'Grey - Standard', 'XIAO-M39P5F-2P67', 28000, 10, '{"color":"Grey","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_t2W-yqfAno', 'cat_montres', 'Redmi Watch 5', 'redmi-watch-5--J8Xja', 65000, NULL, 'XIAO-M0JR6E', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_a9XETbIhXL', 'prod_t2W-yqfAno', 'products/montres-connectees/redmi-watch-5.webp', 'Redmi Watch 5', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_hGfhyC_3XQ', 'prod_t2W-yqfAno', 'Black - Standard', 'XIAO-M0JR6E-UVPV', 65000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_0aqJsLdTkZ', 'prod_t2W-yqfAno', 'Silver - Standard', 'XIAO-M0JR6E-BX3H', 65000, 10, '{"color":"Silver","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_fwLvOVWW49', 'cat_montres', 'Redmi Watch 5 Active', 'redmi-watch-5-active-jpM035', 28000, NULL, 'XIAO-BKK847', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_xuGkGvyCQT', 'prod_fwLvOVWW49', 'products/montres-connectees/redmi-watch-5-active.webp', 'Redmi Watch 5 Active', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_KQb0k1IrrJ', 'prod_fwLvOVWW49', 'Black - Standard', 'XIAO-BKK847-GC8-', 28000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Suvsfrb2V7', 'prod_fwLvOVWW49', 'White - Standard', 'XIAO-BKK847-DWD8', 28000, 10, '{"color":"White","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_NLZzOdA7pE', 'cat_montres', 'Redmi Watch 5 Lite', 'redmi-watch-5-lite-5JpXZk', 38000, NULL, 'XIAO-3NTA4S', 'Xiaomi', 1, 0, 30);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_8eRC1XfZh4', 'prod_NLZzOdA7pE', 'products/montres-connectees/redmi-watch-5-lite.webp', 'Redmi Watch 5 Lite', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_smJbAh1mah', 'prod_NLZzOdA7pE', 'Black - Standard', 'XIAO-3NTA4S-EQVY', 38000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ODp4m-stui', 'prod_NLZzOdA7pE', 'White - Standard', 'XIAO-3NTA4S-6NHF', 38000, 10, '{"color":"White","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_pXxmcvjZv7', 'prod_NLZzOdA7pE', 'Pink - Standard', 'XIAO-3NTA4S-6GZJ', 38000, 10, '{"color":"Pink","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_1uOADto5rP', 'cat_montres', 'Xiaomi Smart Band 8 Pro', 'xiaomi-smart-band-8-pro-7cPSWF', 60000, NULL, 'XIAO-BJNXI2', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_HcubNKiD89', 'prod_1uOADto5rP', 'products/montres-connectees/xiaomi-smart-band-8-pro.webp', 'Xiaomi Smart Band 8 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_yCuLixhsgA', 'prod_1uOADto5rP', 'Black - Standard', 'XIAO-BJNXI2-UODT', 60000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_DN-EznbYaV', 'prod_1uOADto5rP', 'White - Standard', 'XIAO-BJNXI2-3D0Q', 60000, 10, '{"color":"White","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_lU_bGxnK8o', 'cat_montres', 'Xiaomi Smart Band 9', 'xiaomi-smart-band-9-VWrRXW', 30000, NULL, 'XIAO-YGNRSS', 'Xiaomi', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Dv6lJsCWLn', 'prod_lU_bGxnK8o', 'products/montres-connectees/xiaomi-smart-band-9.webp', 'Xiaomi Smart Band 9', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_WyPYselYE8', 'prod_lU_bGxnK8o', 'Black - Standard', 'XIAO-YGNRSS-UU_D', 30000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_qhtYSz6jJH', 'prod_lU_bGxnK8o', 'Blue - Standard', 'XIAO-YGNRSS-HG3D', 30000, 10, '{"color":"Blue","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_HD-iEfmcaR', 'prod_lU_bGxnK8o', 'Pink - Standard', 'XIAO-YGNRSS-G-Y6', 30000, 10, '{"color":"Pink","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_aRucVwmxdQ', 'prod_lU_bGxnK8o', 'White - Standard', 'XIAO-YGNRSS-A9NU', 30000, 10, '{"color":"White","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_TLm4u81CWN', 'cat_montres', 'Xiaomi Smart Band 9 Active', 'xiaomi-smart-band-9-active-UmwK1M', 35000, NULL, 'XIAO-7V5SBS', 'Xiaomi', 1, 0, 30);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ENIGH4YNLc', 'prod_TLm4u81CWN', 'products/montres-connectees/xiaomi-smart-band-9-active.webp', 'Xiaomi Smart Band 9 Active', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_0bRMaBC3pC', 'prod_TLm4u81CWN', 'Black - Standard', 'XIAO-7V5SBS-IRJN', 35000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_sIe5n0LZ_3', 'prod_TLm4u81CWN', 'White - Standard', 'XIAO-7V5SBS-R8PD', 35000, 10, '{"color":"White","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_A4Ie12Cj7V', 'prod_TLm4u81CWN', 'Pink - Standard', 'XIAO-7V5SBS-JA_U', 35000, 10, '{"color":"Pink","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_cPWDKGhCQ8', 'cat_montres', 'Xiaomi Smart Band 9 Pro', 'xiaomi-smart-band-9-pro-avhKsO', 50000, NULL, 'XIAO-DIPSYL', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_N27Tpjoz6R', 'prod_cPWDKGhCQ8', 'products/montres-connectees/xiaomi-smart-band-9-pro.webp', 'Xiaomi Smart Band 9 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_wHrns7iVuO', 'prod_cPWDKGhCQ8', 'Black - Standard', 'XIAO-DIPSYL-NE_5', 50000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_JYAuppoOzT', 'prod_cPWDKGhCQ8', 'Silver - Standard', 'XIAO-DIPSYL-QNNG', 50000, 10, '{"color":"Silver","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_SWDbgknGL4', 'cat_ordinateurs', 'MacBook Pro M3 Max (2023)', 'macbook-pro-m3-max-2023-q8JoIK', 2200000, NULL, 'APPL-ZCATMO', 'Apple', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_6RoETZ5c23', 'prod_SWDbgknGL4', 'products/ordinateurs/macbook-pro-m3-max-2023.webp', 'MacBook Pro M3 Max (2023)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_NUX510GIKe', 'prod_SWDbgknGL4', 'Silver - 36GB/1TB', 'APPL-ZCATMO-27DO', 2200000, 10, '{"color":"Silver","storage":"36GB/1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Hr1YVkaVG0', 'prod_SWDbgknGL4', 'Space Gray - 36GB/1TB', 'APPL-ZCATMO-3B8A', 2200000, 10, '{"color":"Space Gray","storage":"36GB/1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_zVhD26eAn8', 'cat_ordinateurs', 'MacBook Pro M3 (2023)', 'macbook-pro-m3-2023-mTowKC', 1100000, NULL, 'APPL-YRWI7K', 'Apple', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_JR-HeSN93s', 'prod_zVhD26eAn8', 'products/ordinateurs/macbook-pro-m3-2023.webp', 'MacBook Pro M3 (2023)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_GUseM6LRYj', 'prod_zVhD26eAn8', 'Silver - 18GB/512GB', 'APPL-YRWI7K-HE1F', 1100000, 10, '{"color":"Silver","storage":"18GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_iTKAkSButG', 'prod_zVhD26eAn8', 'Space Gray - 18GB/512GB', 'APPL-YRWI7K-BPXJ', 1100000, 10, '{"color":"Space Gray","storage":"18GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_3IY6ilcgyX', 'cat_ordinateurs', 'MacBook Pro (2023)', 'macbook-pro-2023-msOpS0', 950000, NULL, 'APPL-00SLIE', 'Apple', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_pr_596xDWF', 'prod_3IY6ilcgyX', 'products/ordinateurs/macbook-pro-2023.webp', 'MacBook Pro (2023)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_MW_CE9r2ZE', 'prod_3IY6ilcgyX', 'Silver - 8GB/256GB', 'APPL-00SLIE-3U7T', 950000, 10, '{"color":"Silver","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_jCTyj1LiYn', 'prod_3IY6ilcgyX', 'Silver - 8GB/512GB', 'APPL-00SLIE-AKYZ', 950000, 10, '{"color":"Silver","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_gcvak_4AXn', 'prod_3IY6ilcgyX', 'Space Gray - 8GB/256GB', 'APPL-00SLIE-JCAH', 950000, 10, '{"color":"Space Gray","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_IKLYNvi0Gz', 'prod_3IY6ilcgyX', 'Space Gray - 8GB/512GB', 'APPL-00SLIE-JQWQ', 950000, 10, '{"color":"Space Gray","storage":"8GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_d6KtJeK7Vr', 'cat_ordinateurs', 'MacBook Pro M2 (2022)', 'macbook-pro-m2-2022-nz_uIT', 780000, NULL, 'APPL-H_K7D1', 'Apple', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_iQ6Wwm-ZQY', 'prod_d6KtJeK7Vr', 'products/ordinateurs/macbook-pro-m2-2022.webp', 'MacBook Pro M2 (2022)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Zngo6uKtaH', 'prod_d6KtJeK7Vr', 'Silver - 8GB/256GB', 'APPL-H_K7D1-X1BS', 780000, 10, '{"color":"Silver","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_0hn7GaNGRu', 'prod_d6KtJeK7Vr', 'Silver - 16GB/512GB', 'APPL-H_K7D1-VEUP', 780000, 10, '{"color":"Silver","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_lh9v61PU8B', 'prod_d6KtJeK7Vr', 'Space Gray - 8GB/256GB', 'APPL-H_K7D1-H0LF', 780000, 10, '{"color":"Space Gray","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_yPu2564Bcr', 'prod_d6KtJeK7Vr', 'Space Gray - 16GB/512GB', 'APPL-H_K7D1-M3IW', 780000, 10, '{"color":"Space Gray","storage":"16GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_QSylfmMKMo', 'cat_ordinateurs', 'MacBook Air M4 (2025)', 'macbook-air-m4-2025-a7k0Os', 770000, 880000, 'APPL-3URPAW', 'Apple', 1, 0, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_3WkKq39xT8', 'prod_QSylfmMKMo', 'products/ordinateurs/macbook-air-m4-2025.webp', 'MacBook Air M4 (2025)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_KqMRqDMBh0', 'prod_QSylfmMKMo', 'Silver - 16GB/256GB', 'APPL-3URPAW-YVBN', 770000, 10, '{"color":"Silver","storage":"16GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ZqDYFu3Fdf', 'prod_QSylfmMKMo', 'Silver - 16GB/512GB', 'APPL-3URPAW-QENL', 825000, 10, '{"color":"Silver","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_PDT-_omv8p', 'prod_QSylfmMKMo', 'Silver - 24GB/512GB', 'APPL-3URPAW-_ZP2', 880000, 10, '{"color":"Silver","storage":"24GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_VBz75V4bFP', 'prod_QSylfmMKMo', 'Space Gray - 16GB/256GB', 'APPL-3URPAW-4ZSP', 770000, 10, '{"color":"Space Gray","storage":"16GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_zPxdwr2bQ0', 'prod_QSylfmMKMo', 'Space Gray - 16GB/512GB', 'APPL-3URPAW-LUVH', 825000, 10, '{"color":"Space Gray","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_TfqDSc3f10', 'prod_QSylfmMKMo', 'Space Gray - 24GB/512GB', 'APPL-3URPAW--6BP', 880000, 10, '{"color":"Space Gray","storage":"24GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_zj7h2ekV1I', 'prod_QSylfmMKMo', 'Starlight - 16GB/256GB', 'APPL-3URPAW-FBQF', 770000, 10, '{"color":"Starlight","storage":"16GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__z7uvNmri4', 'prod_QSylfmMKMo', 'Starlight - 16GB/512GB', 'APPL-3URPAW-JOBV', 825000, 10, '{"color":"Starlight","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_2T8pBJDv-T', 'prod_QSylfmMKMo', 'Starlight - 24GB/512GB', 'APPL-3URPAW--MQ8', 880000, 10, '{"color":"Starlight","storage":"24GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_9yRKNpJebR', 'prod_QSylfmMKMo', 'Sky Blue - 16GB/256GB', 'APPL-3URPAW-JQND', 770000, 10, '{"color":"Sky Blue","storage":"16GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_rq8QxTG_ri', 'prod_QSylfmMKMo', 'Sky Blue - 16GB/512GB', 'APPL-3URPAW-O4PZ', 825000, 10, '{"color":"Sky Blue","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_vY04HZUnX6', 'prod_QSylfmMKMo', 'Sky Blue - 24GB/512GB', 'APPL-3URPAW-LMF9', 880000, 10, '{"color":"Sky Blue","storage":"24GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_QmNE1voNUw', 'cat_ordinateurs', 'MacBook Air M3 (2023)', 'macbook-air-m3-2023-jimSO4', 850000, NULL, 'APPL-B7QXEV', 'Apple', 1, 0, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_h-NKhfNW4U', 'prod_QmNE1voNUw', 'products/ordinateurs/macbook-air-m3-2023.webp', 'MacBook Air M3 (2023)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_AemxzS_RG2', 'prod_QmNE1voNUw', 'Silver - 8GB/256GB', 'APPL-B7QXEV-MTKZ', 850000, 10, '{"color":"Silver","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_wXoZdY_op3', 'prod_QmNE1voNUw', 'Silver - 8GB/512GB', 'APPL-B7QXEV-J_P_', 850000, 10, '{"color":"Silver","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_3uWk6qw6So', 'prod_QmNE1voNUw', 'Space Gray - 8GB/256GB', 'APPL-B7QXEV--UXT', 850000, 10, '{"color":"Space Gray","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_8Mu8F8egdm', 'prod_QmNE1voNUw', 'Space Gray - 8GB/512GB', 'APPL-B7QXEV-8F91', 850000, 10, '{"color":"Space Gray","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_8tgk3TT7rj', 'prod_QmNE1voNUw', 'Starlight - 8GB/256GB', 'APPL-B7QXEV-H4F2', 850000, 10, '{"color":"Starlight","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ew3CerHC5d', 'prod_QmNE1voNUw', 'Starlight - 8GB/512GB', 'APPL-B7QXEV-YAZV', 850000, 10, '{"color":"Starlight","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_5l5IZlk28i', 'prod_QmNE1voNUw', 'Sky Blue - 8GB/256GB', 'APPL-B7QXEV-T2KB', 850000, 10, '{"color":"Sky Blue","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_kccMV1o-2p', 'prod_QmNE1voNUw', 'Sky Blue - 8GB/512GB', 'APPL-B7QXEV-P_DJ', 850000, 10, '{"color":"Sky Blue","storage":"8GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_egKreBiL0v', 'cat_ordinateurs', 'MacBook Air M2 (2024)', 'macbook-air-m2-2024-4FlXP-', 630000, 700000, 'APPL-VVYZKD', 'Apple', 1, 0, 60);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_U_P305uhy_', 'prod_egKreBiL0v', 'products/ordinateurs/macbook-air-m2-2024.webp', 'MacBook Air M2 (2024)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_9guJGVO7dM', 'prod_egKreBiL0v', 'Silver - 8GB/256GB', 'APPL-VVYZKD-RNJ2', 630000, 10, '{"color":"Silver","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_f7Lrh0GKFS', 'prod_egKreBiL0v', 'Silver - 8GB/512GB', 'APPL-VVYZKD-2ZZA', 700000, 10, '{"color":"Silver","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_LtN6ANY7UD', 'prod_egKreBiL0v', 'Space Gray - 8GB/256GB', 'APPL-VVYZKD-7F1-', 630000, 10, '{"color":"Space Gray","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_6QYgLqTrhm', 'prod_egKreBiL0v', 'Space Gray - 8GB/512GB', 'APPL-VVYZKD-YR9J', 700000, 10, '{"color":"Space Gray","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_chI7Omyim5', 'prod_egKreBiL0v', 'Starlight - 8GB/256GB', 'APPL-VVYZKD-P8KS', 630000, 10, '{"color":"Starlight","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_l3THzvnJzD', 'prod_egKreBiL0v', 'Starlight - 8GB/512GB', 'APPL-VVYZKD-AWWY', 700000, 10, '{"color":"Starlight","storage":"8GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_9oqljsWFHM', 'cat_ordinateurs', 'MacBook Air M1 (2021)', 'macbook-air-m1-2021-P-AKR4', 530000, NULL, 'APPL-_QZ4QW', 'Apple', 1, 0, 30);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_BTZmr91QPL', 'prod_9oqljsWFHM', 'products/ordinateurs/macbook-air-m1-2021.webp', 'MacBook Air M1 (2021)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_nB_1mKC2_Y', 'prod_9oqljsWFHM', 'Silver - 8GB/256GB', 'APPL-_QZ4QW--OMW', 530000, 10, '{"color":"Silver","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_78Fm53YkfD', 'prod_9oqljsWFHM', 'Space Gray - 8GB/256GB', 'APPL-_QZ4QW-W1T3', 530000, 10, '{"color":"Space Gray","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_TVQXyb23-o', 'prod_9oqljsWFHM', 'Gold - 8GB/256GB', 'APPL-_QZ4QW-04AB', 530000, 10, '{"color":"Gold","storage":"8GB/256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_iD-MblqW0i', 'cat_ordinateurs', 'MacBook Pro M4 (2024)', 'macbook-pro-m4-2024-knCOLu', 1180000, 1280000, 'APPL-DYQGXP', 'Apple', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_E-LwVA8nPs', 'prod_iD-MblqW0i', 'products/ordinateurs/macbook-pro-m4-2024.webp', 'MacBook Pro M4 (2024)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_JP9Otc4qF6', 'prod_iD-MblqW0i', 'Silver - 16GB/512GB', 'APPL-DYQGXP-AM4Q', 1180000, 10, '{"color":"Silver","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_qgbZVQzp6b', 'prod_iD-MblqW0i', 'Silver - 24GB/512GB', 'APPL-DYQGXP-H8SD', 1280000, 10, '{"color":"Silver","storage":"24GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_p9fhPyve5j', 'prod_iD-MblqW0i', 'Space Gray - 16GB/512GB', 'APPL-DYQGXP-CML7', 1180000, 10, '{"color":"Space Gray","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_xFWH3f5NJU', 'prod_iD-MblqW0i', 'Space Gray - 24GB/512GB', 'APPL-DYQGXP-JGBP', 1280000, 10, '{"color":"Space Gray","storage":"24GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_n8WwndN8To', 'cat_ordinateurs', 'MacBook Pro M4 Max (2024)', 'macbook-pro-m4-max-2024-a8nipD', 2200000, 2360000, 'APPL-2RTEWN', 'Apple', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img__UGvh9JE33', 'prod_n8WwndN8To', 'products/ordinateurs/macbook-pro-m4-max-2024.webp', 'MacBook Pro M4 Max (2024)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_V3RCcabYxT', 'prod_n8WwndN8To', 'Silver - 36GB/1TB', 'APPL-2RTEWN-ZN6M', 2200000, 10, '{"color":"Silver","storage":"36GB/1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_dbGVI7panR', 'prod_n8WwndN8To', 'Silver - 48GB/1TB', 'APPL-2RTEWN-OF67', 2360000, 10, '{"color":"Silver","storage":"48GB/1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_pnWnvRKx9W', 'prod_n8WwndN8To', 'Space Gray - 36GB/1TB', 'APPL-2RTEWN-5EOH', 2200000, 10, '{"color":"Space Gray","storage":"36GB/1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ZcrBe0jJmu', 'prod_n8WwndN8To', 'Space Gray - 48GB/1TB', 'APPL-2RTEWN-UJHE', 2360000, 10, '{"color":"Space Gray","storage":"48GB/1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_GlE9bhzEWY', 'cat_ordinateurs', 'MacBook Pro M4 Pro (2024)', 'macbook-pro-m4-pro-2024-Z0TQju', 1350000, 2000000, 'APPL-AASLES', 'Apple', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Fu1R6sufkU', 'prod_GlE9bhzEWY', 'products/ordinateurs/macbook-pro-m4-pro-2024.webp', 'MacBook Pro M4 Pro (2024)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_kdN5NRcOZN', 'prod_GlE9bhzEWY', 'Silver - 24GB/512GB', 'APPL-AASLES-Y1FH', 1350000, 10, '{"color":"Silver","storage":"24GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_azfNhBzzIY', 'prod_GlE9bhzEWY', 'Silver - 48GB/512GB', 'APPL-AASLES-LUPS', 2000000, 10, '{"color":"Silver","storage":"48GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_SMUFO1yfU8', 'prod_GlE9bhzEWY', 'Space Gray - 24GB/512GB', 'APPL-AASLES-LAP0', 1350000, 10, '{"color":"Space Gray","storage":"24GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_yZqxRuuwYl', 'prod_GlE9bhzEWY', 'Space Gray - 48GB/512GB', 'APPL-AASLES-R9XD', 2000000, 10, '{"color":"Space Gray","storage":"48GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_RR0pU79A1K', 'cat_ordinateurs', 'iMac M3 (2024)', 'imac-m3-2024-a6yBdc', 980000, NULL, 'IMAC-2XRURQ', 'iMac', 1, 0, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_PwQJX3ZB3i', 'prod_RR0pU79A1K', 'products/ordinateurs/imac-m3-2024.webp', 'iMac M3 (2024)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_r1G6u7J22k', 'prod_RR0pU79A1K', 'Silver - 8GB/256GB', 'IMAC-2XRURQ-HTML', 980000, 10, '{"color":"Silver","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_XxBUP8h_Sa', 'prod_RR0pU79A1K', 'Silver - 8GB/512GB', 'IMAC-2XRURQ-3WI7', 980000, 10, '{"color":"Silver","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_K_sRXIMKTb', 'prod_RR0pU79A1K', 'Blue - 8GB/256GB', 'IMAC-2XRURQ-SF26', 980000, 10, '{"color":"Blue","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Jc8e3TwLyl', 'prod_RR0pU79A1K', 'Blue - 8GB/512GB', 'IMAC-2XRURQ-SMYA', 980000, 10, '{"color":"Blue","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_lFelKmrKx6', 'prod_RR0pU79A1K', 'Green - 8GB/256GB', 'IMAC-2XRURQ-Z5YF', 980000, 10, '{"color":"Green","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_HfFaxnt96j', 'prod_RR0pU79A1K', 'Green - 8GB/512GB', 'IMAC-2XRURQ-DJEX', 980000, 10, '{"color":"Green","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_hMvUtQr7nS', 'prod_RR0pU79A1K', 'Pink - 8GB/256GB', 'IMAC-2XRURQ-EPKP', 980000, 10, '{"color":"Pink","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_MKNHU1CJcb', 'prod_RR0pU79A1K', 'Pink - 8GB/512GB', 'IMAC-2XRURQ-XMCQ', 980000, 10, '{"color":"Pink","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_hm3KaMYkLJ', 'prod_RR0pU79A1K', 'Yellow - 8GB/256GB', 'IMAC-2XRURQ-NE4K', 980000, 10, '{"color":"Yellow","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_30sUza6pI5', 'prod_RR0pU79A1K', 'Yellow - 8GB/512GB', 'IMAC-2XRURQ-BSJI', 980000, 10, '{"color":"Yellow","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_x5J_GBtaDt', 'prod_RR0pU79A1K', 'Orange - 8GB/256GB', 'IMAC-2XRURQ-7ANR', 980000, 10, '{"color":"Orange","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_AZtR-fSvU4', 'prod_RR0pU79A1K', 'Orange - 8GB/512GB', 'IMAC-2XRURQ-JIHO', 980000, 10, '{"color":"Orange","storage":"8GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_NCAFgyS08i', 'cat_ordinateurs', 'iMac M4 (2024)', 'imac-m4-2024-pHiGtw', 1250000, NULL, 'IMAC-COLEIW', 'iMac', 1, 0, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_wsXFD8GmNP', 'prod_NCAFgyS08i', 'products/ordinateurs/imac-m4-2024.webp', 'iMac M4 (2024)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_U7z3dEEbBD', 'prod_NCAFgyS08i', 'Silver - 16GB/256GB', 'IMAC-COLEIW-EMCC', 1250000, 10, '{"color":"Silver","storage":"16GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_T284R4ZIme', 'prod_NCAFgyS08i', 'Silver - 16GB/512GB', 'IMAC-COLEIW-GXQA', 1250000, 10, '{"color":"Silver","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_a9L7zhmpf2', 'prod_NCAFgyS08i', 'Blue - 16GB/256GB', 'IMAC-COLEIW-FIVZ', 1250000, 10, '{"color":"Blue","storage":"16GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_RUnDeJDkMH', 'prod_NCAFgyS08i', 'Blue - 16GB/512GB', 'IMAC-COLEIW-AABP', 1250000, 10, '{"color":"Blue","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_5ZQcwBBtb_', 'prod_NCAFgyS08i', 'Green - 16GB/256GB', 'IMAC-COLEIW-SBAR', 1250000, 10, '{"color":"Green","storage":"16GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_cmgg0d7KTX', 'prod_NCAFgyS08i', 'Green - 16GB/512GB', 'IMAC-COLEIW-OCIY', 1250000, 10, '{"color":"Green","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_RZ6suQgsNl', 'prod_NCAFgyS08i', 'Pink - 16GB/256GB', 'IMAC-COLEIW-1ECE', 1250000, 10, '{"color":"Pink","storage":"16GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Iiee5csdmp', 'prod_NCAFgyS08i', 'Pink - 16GB/512GB', 'IMAC-COLEIW-PLJ_', 1250000, 10, '{"color":"Pink","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_VP-AH6Ofc4', 'prod_NCAFgyS08i', 'Yellow - 16GB/256GB', 'IMAC-COLEIW-BL6G', 1250000, 10, '{"color":"Yellow","storage":"16GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_7LaNY7dyxS', 'prod_NCAFgyS08i', 'Yellow - 16GB/512GB', 'IMAC-COLEIW-RFIC', 1250000, 10, '{"color":"Yellow","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__6BCtzNOW-', 'prod_NCAFgyS08i', 'Orange - 16GB/256GB', 'IMAC-COLEIW-A689', 1250000, 10, '{"color":"Orange","storage":"16GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_QdtOcQgbTX', 'prod_NCAFgyS08i', 'Orange - 16GB/512GB', 'IMAC-COLEIW-XS4V', 1250000, 10, '{"color":"Orange","storage":"16GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_cxTDPsbCwC', 'cat_ordinateurs', 'Dell Vostro 3520 i7', 'dell-vostro-3520-i7-7sx2hq', 460000, NULL, 'DELL-AA27XU', 'Dell', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_kg7LFGtrSE', 'prod_cxTDPsbCwC', 'products/ordinateurs/dell-vostro-3520-i7.webp', 'Dell Vostro 3520 i7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_RQK0gzye6R', 'prod_cxTDPsbCwC', 'Black - 8GB/512GB SSD', 'DELL-AA27XU-LV42', 460000, 10, '{"color":"Black","storage":"8GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_ySB-yCnY-8', 'cat_ordinateurs', 'BUREAU HP 290-G9 i5', 'bureau-hp-290-g9-i5-NsbL0z', 345000, NULL, 'BURE-AJGL9A', 'BUREAU', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_f8TEzrYuVQ', 'prod_ySB-yCnY-8', 'products/ordinateurs/bureau-hp-290-g9-i5.webp', 'BUREAU HP 290-G9 i5', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_FAiMIczCDt', 'prod_ySB-yCnY-8', 'Black - 8GB/512GB SSD', 'BURE-AJGL9A-LORO', 345000, 10, '{"color":"Black","storage":"8GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Ba4AkIAfst', 'cat_ordinateurs', 'BUREAU HP PRODESK 400 G9 i5', 'bureau-hp-prodesk-400-g9-i5-HPMC6t', 410000, NULL, 'BURE-8-9C5O', 'BUREAU', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_lPi3K7ax5w', 'prod_Ba4AkIAfst', 'products/ordinateurs/bureau-hp-prodesk-400-g9-i5.webp', 'BUREAU HP PRODESK 400 G9 i5', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_6HiZD846lN', 'prod_Ba4AkIAfst', 'Black - 8GB/512GB SSD', 'BURE-8-9C5O-PNCH', 410000, 10, '{"color":"Black","storage":"8GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_SEEIPPzCdy', 'cat_ordinateurs', 'LENOVO THINKBOOK 14 G6 i7', 'lenovo-thinkbook-14-g6-i7-5k5C8y', 485000, NULL, 'LENO-O-0FTN', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_tJX-NSatQs', 'prod_SEEIPPzCdy', 'products/ordinateurs/lenovo-thinkbook-14-g6-i7.webp', 'LENOVO THINKBOOK 14 G6 i7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_KfN7yoLjgE', 'prod_SEEIPPzCdy', 'Grey - 16GB/512GB SSD', 'LENO-O-0FTN-4E01', 485000, 10, '{"color":"Grey","storage":"16GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_SQkwsZ9IMR', 'cat_ordinateurs', 'LENOVO THINKBOOK 15 G4 i7', 'lenovo-thinkbook-15-g4-i7-3kTUu0', 485000, NULL, 'LENO-8ESRAH', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_rQetRfJdxB', 'prod_SQkwsZ9IMR', 'products/ordinateurs/lenovo-thinkbook-15-g4-i7.webp', 'LENOVO THINKBOOK 15 G4 i7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_oMVpf7Yu0n', 'prod_SQkwsZ9IMR', 'Grey - 16GB/512GB SSD', 'LENO-8ESRAH-NS7R', 485000, 10, '{"color":"Grey","storage":"16GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_HmIj2mDSo1', 'cat_ordinateurs', 'LENOVO THINKPAD E14 G5 i7', 'lenovo-thinkpad-e14-g5-i7-lKRQXt', 550000, NULL, 'LENO---OLGI', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_CW-1AaeEpu', 'prod_HmIj2mDSo1', 'products/ordinateurs/lenovo-thinkpad-e14-g5-i7.webp', 'LENOVO THINKPAD E14 G5 i7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_6Nl27EEt3P', 'prod_HmIj2mDSo1', 'Black - 16GB/512GB SSD', 'LENO---OLGI-F58_', 550000, 10, '{"color":"Black","storage":"16GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_GuV9ztp5Uw', 'cat_ordinateurs', 'Lenovo ThinkPad E15 i7', 'lenovo-thinkpad-e15-i7-2EfdCz', 635000, NULL, 'LENO-E1-SDQ', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_3jlOuk_Xcx', 'prod_GuV9ztp5Uw', 'products/ordinateurs/lenovo-thinkpad-e15-i7.webp', 'Lenovo ThinkPad E15 i7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_xkJPoEvgNm', 'prod_GuV9ztp5Uw', 'Black - 16GB/512GB SSD', 'LENO-E1-SDQ-OF7B', 635000, 10, '{"color":"Black","storage":"16GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_EDbPTcIRxy', 'cat_ordinateurs', 'Lenovo ThinkPad E16 i7', 'lenovo-thinkpad-e16-i7-Vtx4Uk', 630000, NULL, 'LENO-MK1XNS', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_4VEKDwR7c6', 'prod_EDbPTcIRxy', 'products/ordinateurs/lenovo-thinkpad-e16-i7.webp', 'Lenovo ThinkPad E16 i7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_f3wPbt0uJG', 'prod_EDbPTcIRxy', 'Black - 16GB/512GB SSD', 'LENO-MK1XNS-ATNO', 630000, 10, '{"color":"Black","storage":"16GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_c9ZP-fw2KK', 'cat_ordinateurs', 'Lenovo Yoga 9 16 x360', 'lenovo-yoga-9-16-x360-zy7Uja', 690000, NULL, 'LENO-IU7JFC', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_fYWXQlDsJH', 'prod_c9ZP-fw2KK', 'products/ordinateurs/lenovo-yoga-9-16-x360.webp', 'Lenovo Yoga 9 16 x360', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_t1j3QapBWq', 'prod_c9ZP-fw2KK', 'Grey - 16GB/512GB SSD', 'LENO-IU7JFC-T5R6', 690000, 10, '{"color":"Grey","storage":"16GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_MP5VVpxh1J', 'cat_ordinateurs', 'Dell Vostro 3030MT i3', 'dell-vostro-3030mt-i3--fi6Rc', 290000, NULL, 'DELL-JOAQDD', 'Dell', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_-0xpVsCnsq', 'prod_MP5VVpxh1J', 'products/ordinateurs/dell-vostro-3030mt-i3.webp', 'Dell Vostro 3030MT i3', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_vukwCpd5nG', 'prod_MP5VVpxh1J', 'Black - 8GB/512GB SSD', 'DELL-JOAQDD-FRAX', 290000, 10, '{"color":"Black","storage":"8GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_JSMqlXf7EF', 'cat_ordinateurs', 'Dell Vostro 3030MT i7', 'dell-vostro-3030mt-i7-TXpit9', 435000, NULL, 'DELL-HSDE1K', 'Dell', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_o3LAHkoKWx', 'prod_JSMqlXf7EF', 'products/ordinateurs/dell-vostro-3030mt-i7.webp', 'Dell Vostro 3030MT i7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_3g72K2qEFJ', 'prod_JSMqlXf7EF', 'Black - 8GB/512GB SSD', 'DELL-HSDE1K--I8E', 435000, 10, '{"color":"Black","storage":"8GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_APDmPM08CB', 'cat_ordinateurs', 'Lenovo ThinkCentre Neo 50t i3', 'lenovo-thinkcentre-neo-50t-i3-JCp_FA', 295000, NULL, 'LENO-B63C5L', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_4xsv6c23pz', 'prod_APDmPM08CB', 'products/ordinateurs/lenovo-thinkcentre-neo-50t-i3.webp', 'Lenovo ThinkCentre Neo 50t i3', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_S_r0If6anQ', 'prod_APDmPM08CB', 'Black - 8GB/512GB SSD', 'LENO-B63C5L-D79Z', 295000, 10, '{"color":"Black","storage":"8GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_B8VhrMCNZC', 'cat_ordinateurs', 'HP 290 G9 i3', 'hp-290-g9-i3-QjLKMl', 277500, NULL, 'HP-OYUIHI', 'HP', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_qYTE9Sgbdq', 'prod_B8VhrMCNZC', 'products/ordinateurs/hp-290-g9-i3.webp', 'HP 290 G9 i3', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_QV0MoM1rMU', 'prod_B8VhrMCNZC', 'Black - 8GB/512GB SSD', 'HP-OYUIHI-LCCX', 277500, 10, '{"color":"Black","storage":"8GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_7BTDdQh6zU', 'cat_ecouteurs', 'FreeBuds 4 Pro', 'freebuds-4-pro-BrIUx5', 135000, NULL, 'FREE-Y20JSB', 'FreeBuds', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_4lvYPbZ-Ub', 'prod_7BTDdQh6zU', 'products/ecouteurs/freebuds-4-pro.webp', 'FreeBuds 4 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ANmWFoxkMs', 'prod_7BTDdQh6zU', 'Black - N/A', 'FREE-Y20JSB-EZMB', 135000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_dMoJNGpYkz', 'prod_7BTDdQh6zU', 'White - N/A', 'FREE-Y20JSB-H2F-', 135000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod__lhKDy2Co3', 'cat_ecouteurs', 'FreeBuds 6', 'freebuds-6-tLNugK', 110000, NULL, 'FREE-UAQUEJ', 'FreeBuds', 1, 0, 30);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_UMw8IP2pM9', 'prod__lhKDy2Co3', 'products/ecouteurs/freebuds-6.webp', 'FreeBuds 6', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Z4qp6lhcyT', 'prod__lhKDy2Co3', 'Black - N/A', 'FREE-UAQUEJ-1RN4', 110000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_lSB82vfW3A', 'prod__lhKDy2Co3', 'White - N/A', 'FREE-UAQUEJ-AGLV', 110000, 10, '{"color":"White","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_zLyvN9UPop', 'prod__lhKDy2Co3', 'Purple - N/A', 'FREE-UAQUEJ-FXZG', 110000, 10, '{"color":"Purple","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_xuMPNhK0ui', 'cat_ecouteurs', 'FreeBuds 6i', 'freebuds-6i-qfmFFR', 90000, NULL, 'FREE-OD73_5', 'FreeBuds', 1, 0, 30);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_qdSM3H_lqg', 'prod_xuMPNhK0ui', 'products/ecouteurs/freebuds-6i.webp', 'FreeBuds 6i', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_HIip2xrSQe', 'prod_xuMPNhK0ui', 'Black - N/A', 'FREE-OD73_5-BY40', 90000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_3vSWASDZcn', 'prod_xuMPNhK0ui', 'White - N/A', 'FREE-OD73_5-MNAS', 90000, 10, '{"color":"White","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_0-1x5Wn4ox', 'prod_xuMPNhK0ui', 'Purple - N/A', 'FREE-OD73_5-JI-A', 90000, 10, '{"color":"Purple","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_TpaRaYQSzk', 'cat_ecouteurs', 'Galaxy Buds 3', 'galaxy-buds-3-PnsTHg', 75000, NULL, 'SAMS-ESYXAE', 'Samsung', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_sKaLCIsBqt', 'prod_TpaRaYQSzk', 'products/ecouteurs/galaxy-buds-3.webp', 'Galaxy Buds 3', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_VkfFoGmHy8', 'prod_TpaRaYQSzk', 'Black - N/A', 'SAMS-ESYXAE-UFTR', 75000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__hklb1h6XY', 'prod_TpaRaYQSzk', 'White - N/A', 'SAMS-ESYXAE-TEZU', 75000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_heqhdJ2-ll', 'cat_ecouteurs', 'Galaxy Buds 3 Pro', 'galaxy-buds-3-pro-qrmg0I', 100000, NULL, 'SAMS-ZRI8CG', 'Samsung', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_dVGyOw8b3e', 'prod_heqhdJ2-ll', 'products/ecouteurs/galaxy-buds-3-pro.webp', 'Galaxy Buds 3 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_biC8OYncQa', 'prod_heqhdJ2-ll', 'Black - N/A', 'SAMS-ZRI8CG-RUNV', 100000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_SKtYpU0Qs9', 'prod_heqhdJ2-ll', 'White - N/A', 'SAMS-ZRI8CG-WJFD', 100000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_ch85IMVbsu', 'cat_ecouteurs', 'Huawei FreeArc', 'huawei-freearc-BIx-_d', 130000, NULL, 'HUAW-C8WVL2', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_SxmTLgWqD7', 'prod_ch85IMVbsu', 'products/ecouteurs/huawei-freearc.webp', 'Huawei FreeArc', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_izieCaPR-v', 'prod_ch85IMVbsu', 'Black - N/A', 'HUAW-C8WVL2-SXIU', 130000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_OGpZ5a1qd3', 'prod_ch85IMVbsu', 'White - N/A', 'HUAW-C8WVL2-F_--', 130000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_DtnpfZdLme', 'cat_ecouteurs', 'Huawei FreeClip', 'huawei-freeclip-1JZQfM', 135000, NULL, 'HUAW-9O41RN', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Ib5EuE0JT6', 'prod_DtnpfZdLme', 'products/ecouteurs/huawei-freeclip.webp', 'Huawei FreeClip', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_hidXVKh9xz', 'prod_DtnpfZdLme', 'Black - N/A', 'HUAW-9O41RN-LCTU', 135000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_LRtkTi4bg-', 'prod_DtnpfZdLme', 'Beige - N/A', 'HUAW-9O41RN-X_2A', 135000, 10, '{"color":"Beige","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod__4w2XRjeik', 'cat_ecouteurs', 'OnePlus Buds Pro 3', 'oneplus-buds-pro-3-a2TJJJ', 120000, NULL, 'ONEP-XUZULC', 'OnePlus', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_I0nE_-moXi', 'prod__4w2XRjeik', 'products/ecouteurs/oneplus-buds-pro-3.webp', 'OnePlus Buds Pro 3', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_n8gO1895ba', 'prod__4w2XRjeik', 'Black - N/A', 'ONEP-XUZULC-DNBZ', 120000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_BsIiMy5FB7', 'prod__4w2XRjeik', 'White - N/A', 'ONEP-XUZULC-JCRT', 120000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_DNhrQDJSAs', 'cat_ecouteurs', 'Mi In-Ear Headphones Basic', 'mi-in-ear-headphones-basic-Mhdhfw', 10000, NULL, 'XIAO--IJFGS', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_pVFpBgl3f-', 'prod_DNhrQDJSAs', 'products/ecouteurs/mi-in-ear-headphones-basic.webp', 'Mi In-Ear Headphones Basic', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_priOv0DCg_', 'prod_DNhrQDJSAs', 'Black - N/A', 'XIAO--IJFGS-QXHS', 10000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_9-G3jXru8z', 'prod_DNhrQDJSAs', 'White - N/A', 'XIAO--IJFGS-UAG0', 10000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_vsLgydaOyg', 'cat_ecouteurs', 'Redmi Buds 6', 'redmi-buds-6-7jGQwE', 35000, NULL, 'XIAO-O_FMSB', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_vT7ilMCdxV', 'prod_vsLgydaOyg', 'products/ecouteurs/redmi-buds-6.webp', 'Redmi Buds 6', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_hzlmktRqGk', 'prod_vsLgydaOyg', 'Black - N/A', 'XIAO-O_FMSB--GAT', 35000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_WztXVoK5MY', 'prod_vsLgydaOyg', 'White - N/A', 'XIAO-O_FMSB-WJ_N', 35000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_mCJAw86kZy', 'cat_ecouteurs', 'Redmi Buds 6 Active', 'redmi-buds-6-active-J-KOLu', 15000, NULL, 'XIAO-Z9R2BW', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_oK1rZuZu1I', 'prod_mCJAw86kZy', 'products/ecouteurs/redmi-buds-6-active.webp', 'Redmi Buds 6 Active', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_xASHpjR5bN', 'prod_mCJAw86kZy', 'Black - N/A', 'XIAO-Z9R2BW-JLWI', 15000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Lz6-vQaH3U', 'prod_mCJAw86kZy', 'White - N/A', 'XIAO-Z9R2BW-FOGB', 15000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_RcX6xU9GBW', 'cat_ecouteurs', 'Redmi Buds 6 Lite', 'redmi-buds-6-lite-GOY-eC', 25000, NULL, 'XIAO-EDYT3U', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_JVvGSVgcr7', 'prod_RcX6xU9GBW', 'products/ecouteurs/redmi-buds-6-lite.webp', 'Redmi Buds 6 Lite', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_rMVBOLr6_X', 'prod_RcX6xU9GBW', 'Black - N/A', 'XIAO-EDYT3U-PMCG', 25000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_jhLaVvVPQf', 'prod_RcX6xU9GBW', 'White - N/A', 'XIAO-EDYT3U-KAXQ', 25000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_QeonPq6r8a', 'cat_ecouteurs', 'Redmi Buds 6 Play', 'redmi-buds-6-play-nkj9fE', 15000, NULL, 'XIAO-JZBUEJ', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_RxaVgesA1s', 'prod_QeonPq6r8a', 'products/ecouteurs/redmi-buds-6-play.webp', 'Redmi Buds 6 Play', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ElO7tVFBhp', 'prod_QeonPq6r8a', 'Black - N/A', 'XIAO-JZBUEJ-JT_W', 15000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_klg5LBK7TG', 'prod_QeonPq6r8a', 'White - N/A', 'XIAO-JZBUEJ-MH5T', 15000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_fdExhPbt69', 'cat_ecouteurs', 'Redmi Buds 6 Pro', 'redmi-buds-6-pro-GAakcw', 50000, NULL, 'XIAO-MJJE60', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Fr4_WGIj4S', 'prod_fdExhPbt69', 'products/ecouteurs/redmi-buds-6-pro.webp', 'Redmi Buds 6 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_fjgumr-oV2', 'prod_fdExhPbt69', 'Black - N/A', 'XIAO-MJJE60-JO6T', 50000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Af8xW5GEIf', 'prod_fdExhPbt69', 'Cream - N/A', 'XIAO-MJJE60-NPZX', 50000, 10, '{"color":"Cream","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_lOXs-gPM8D', 'cat_ecouteurs', 'Xiaomi Buds 5', 'xiaomi-buds-5-O3Ns6r', 35000, NULL, 'XIAO-DJ6BPO', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_xPolQWf97w', 'prod_lOXs-gPM8D', 'products/ecouteurs/xiaomi-buds-5.webp', 'Xiaomi Buds 5', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_-x9ulB9Cof', 'prod_lOXs-gPM8D', 'Black - N/A', 'XIAO-DJ6BPO-DLRK', 35000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_laRE-K44t1', 'prod_lOXs-gPM8D', 'White - N/A', 'XIAO-DJ6BPO-VMMA', 35000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_XsEPKFR6Mq', 'cat_ecouteurs', 'Xiaomi Buds 5 Pro', 'xiaomi-buds-5-pro-Gb1T0N', 45000, NULL, 'XIAO-LBI8-Q', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_96ELbkoCQE', 'prod_XsEPKFR6Mq', 'products/ecouteurs/xiaomi-buds-5-pro.webp', 'Xiaomi Buds 5 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_n78YW9X571', 'prod_XsEPKFR6Mq', 'Black - N/A', 'XIAO-LBI8-Q-XYWV', 45000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_RFImpcYpTB', 'prod_XsEPKFR6Mq', 'White - N/A', 'XIAO-LBI8-Q-0YQF', 45000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_o4RI5CHlO8', 'cat_accessoires', 'AirPods 4', 'airpods-4-W6z-N3', 100000, NULL, 'APPL-HP7C7K', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_cobDaOWVqZ', 'prod_o4RI5CHlO8', 'products/accessoires/airpods-4.webp', 'AirPods 4', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_2lAMYUvfz-', 'prod_o4RI5CHlO8', 'White - N/A', 'APPL-HP7C7K-N9RX', 100000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_cHVR66jAT1', 'cat_accessoires', 'AirPods 4 ANC', 'airpods-4-anc-JEUZA8', 135000, NULL, 'APPL-OHDIXR', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_UjMwGzs5Ay', 'prod_cHVR66jAT1', 'products/accessoires/airpods-4-anc.webp', 'AirPods 4 ANC', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_tOeip_CidT', 'prod_cHVR66jAT1', 'White - N/A', 'APPL-OHDIXR-DF6J', 135000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_KoHe--6DX6', 'cat_accessoires', 'AirTag (pack of 1)', 'airtag-pack-of-1-xrdOvu', 25000, NULL, 'AIRT-ZK_1RI', 'AirTag', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_pZxat8dKQX', 'prod_KoHe--6DX6', 'products/accessoires/airtag-pack-of-1.webp', 'AirTag (pack of 1)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ahgAq84F4h', 'prod_KoHe--6DX6', 'White - N/A', 'AIRT-ZK_1RI-PNN6', 25000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_XjZjPUQEHb', 'cat_accessoires', 'AirTag (pack of 4)', 'airtag-pack-of-4-dMzneN', 90000, NULL, 'AIRT-RWVNGJ', 'AirTag', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_-4b_o7EsFC', 'prod_XjZjPUQEHb', 'products/accessoires/airtag-pack-of-4.webp', 'AirTag (pack of 4)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_8R0mfH1pH0', 'prod_XjZjPUQEHb', 'White - N/A', 'AIRT-RWVNGJ-GHFM', 90000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_prgBdE2TaT', 'cat_accessoires', 'Apple TV 4K 128Gb (2025)', 'apple-tv-4k-128gb-2025--JRWup', 170000, NULL, 'APPL-R7M94Y', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ZLQ3DQeUqA', 'prod_prgBdE2TaT', 'products/accessoires/apple-tv-4k-128gb-2025.webp', 'Apple TV 4K 128Gb (2025)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_5K3fWtbywM', 'prod_prgBdE2TaT', 'Black - 128GB', 'APPL-R7M94Y-BYCS', 170000, 10, '{"color":"Black","storage":"128GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_lixcBaFNPc', 'cat_jeux', 'Console Sony PS5 Slim + EA FC 26', 'console-sony-ps5-slim-ea-fc-26-aQNMrh', 390000, NULL, 'CONS-GBXXP9', 'Console', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_dEtqKHsZAn', 'prod_lixcBaFNPc', 'products/jeux/console-sony-ps5-slim-ea-fc-26.avif', 'Console Sony PS5 Slim + EA FC 26', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_4usu2FEL5G', 'prod_lixcBaFNPc', 'White - N/A', 'CONS-GBXXP9-FTJK', 390000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_G371YFjDMf', 'cat_jeux', 'EA SPORTS FC 26', 'ea-sports-fc-26-OusPV0', 35000, NULL, 'EA-XIDXQL', 'EA', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_MST4T42-L_', 'prod_G371YFjDMf', 'products/jeux/ea-sports-fc-26.avif', 'EA SPORTS FC 26', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_D_JoBl484j', 'prod_G371YFjDMf', 'N/A - N/A', 'EA-XIDXQL-EXRT', 35000, 10, '{"color":"N/A","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_W6ETCOS-Rv', 'cat_jeux', 'Battlefield 6 PC', 'battlefield-6-pc-PT0foa', 35000, NULL, 'BATT-6SQLPH', 'Battlefield', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Ov5CxHbCDn', 'prod_W6ETCOS-Rv', 'products/jeux/battlefield-6-pc.webp', 'Battlefield 6 PC', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_xmzQMS516I', 'prod_W6ETCOS-Rv', 'N/A - N/A', 'BATT-6SQLPH-8DBB', 35000, 10, '{"color":"N/A","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_sx0I1K3MF9', 'cat_televiseurs', 'Xiaomi TV A Pro', 'xiaomi-tv-a-pro-vDIynm', 110000, NULL, 'XIAO-HVERCF', 'Xiaomi', 1, 0, 30);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_nWq9ZbQdO-', 'prod_sx0I1K3MF9', 'products/televiseurs/xiaomi-tv-a-pro.webp', 'Xiaomi TV A Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_3_-o8fI9bP', 'prod_sx0I1K3MF9', 'Black - 32"', 'XIAO-HVERCF-2PSM', 110000, 10, '{"color":"Black","storage":"32\""}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_G0XGtDR-Wb', 'prod_sx0I1K3MF9', 'Black - 43"', 'XIAO-HVERCF-TAYL', 110000, 10, '{"color":"Black","storage":"43\""}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_sf8KLvAHV4', 'prod_sx0I1K3MF9', 'Black - 55"', 'XIAO-HVERCF-DROC', 110000, 10, '{"color":"Black","storage":"55\""}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_U-bXkFvGYE', 'cat_televiseurs', 'Xiaomi TV A', 'xiaomi-tv-a-xv9Uqr', 250000, NULL, 'XIAO-JIUGDX', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_WtTxKjHuEG', 'prod_U-bXkFvGYE', 'products/televiseurs/xiaomi-tv-a.webp', 'Xiaomi TV A', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_4zDr5BO-sZ', 'prod_U-bXkFvGYE', 'Black - 55"', 'XIAO-JIUGDX-2VBL', 250000, 10, '{"color":"Black","storage":"55\""}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_rdygZCgygQ', 'prod_U-bXkFvGYE', 'Black - 65"', 'XIAO-JIUGDX-QKQO', 250000, 10, '{"color":"Black","storage":"65\""}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_ez_OmdtFIn', 'cat_televiseurs', 'Écran Lenovo 27" Incurvé Gaming', 'ecran-lenovo-27-incurve-gaming-uNi1YL', 195000, NULL, 'ÉCRA-UG8ZAY', 'Écran', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_bAxzN39CBQ', 'prod_ez_OmdtFIn', 'products/televiseurs/ecran-lenovo-27-incurve-gaming.webp', 'Écran Lenovo 27" Incurvé Gaming', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_QsHJm-3EGR', 'prod_ez_OmdtFIn', 'Black - 27"', 'ÉCRA-UG8ZAY-3ICF', 195000, 10, '{"color":"Black","storage":"27\""}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_EEfWhuoxA9', 'cat_televiseurs', 'Écran Lenovo 34" Incurvé Gaming', 'ecran-lenovo-34-incurve-gaming-jEXrYK', 360000, NULL, 'ÉCRA-0GYZM0', 'Écran', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_rkZTCr4yte', 'prod_EEfWhuoxA9', 'products/televiseurs/ecran-lenovo-34-incurve-gaming.webp', 'Écran Lenovo 34" Incurvé Gaming', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_qtds2Fpnmv', 'prod_EEfWhuoxA9', 'Black - 34"', 'ÉCRA-0GYZM0-8BY_', 360000, 10, '{"color":"Black","storage":"34\""}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_qk1J9krLsT', 'cat_televiseurs', 'Écran Philips 34" Incurvé Gaming', 'ecran-philips-34-incurve-gaming-9WPp_j', 390000, NULL, 'ÉCRA-WWWVFA', 'Écran', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_o2ereBDhRt', 'prod_qk1J9krLsT', 'products/televiseurs/ecran-philips-34-incurve-gaming.webp', 'Écran Philips 34" Incurvé Gaming', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_tKS3PySjvu', 'prod_qk1J9krLsT', 'Black - 34"', 'ÉCRA-WWWVFA-OKQW', 390000, 10, '{"color":"Black","storage":"34\""}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_csDZ1TqFVx', 'cat_projecteurs', 'Xiaomi Smart Projector L1 Pro', 'xiaomi-smart-projector-l1-pro-gXrZld', 300000, NULL, 'XIAO-YNDSDD', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Xj72AUWesQ', 'prod_csDZ1TqFVx', 'products/projecteurs/xiaomi-smart-projector-l1-pro.webp', 'Xiaomi Smart Projector L1 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_RmPZ6y3jPo', 'prod_csDZ1TqFVx', 'White - N/A', 'XIAO-YNDSDD-PK1N', 300000, 10, '{"color":"White","storage":"N/A"}');
