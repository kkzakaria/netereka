-- NETEREKA Product Catalogue (auto-generated)
-- DO NOT EDIT MANUALLY - regenerate with: npx tsx scripts/import-catalogue.ts

BEGIN TRANSACTION;

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
INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_95hb7i_3vc', 'cat_smartphones', 'Google Pixel 10 Pro xl', 'google-pixel-10-pro-xl-6yx7WL', 650000, 880000, 'GOOG-OCZ0AM', 'Google', 1, 1, 90);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Uxt5_DjuSI', 'prod_95hb7i_3vc', 'products/smartphones/google-pixel-10-pro-xl.webp', 'Google Pixel 10 Pro xl', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_u-pW8I5Jig', 'prod_95hb7i_3vc', 'Black - 256GB', 'GOOG-OCZ0AM-PFV3', 650000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_JiffhZipUg', 'prod_95hb7i_3vc', 'Black - 512GB', 'GOOG-OCZ0AM-EPPL', 765000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_a2nSAJTCIa', 'prod_95hb7i_3vc', 'Black - 1TB', 'GOOG-OCZ0AM-JWUK', 880000, 10, '{"color":"Black","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_uPNfB6kgwE', 'prod_95hb7i_3vc', 'White - 256GB', 'GOOG-OCZ0AM-CNEX', 650000, 10, '{"color":"White","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_lY_NyTa_bq', 'prod_95hb7i_3vc', 'White - 512GB', 'GOOG-OCZ0AM-8PBQ', 765000, 10, '{"color":"White","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_1fWI96GTh6', 'prod_95hb7i_3vc', 'White - 1TB', 'GOOG-OCZ0AM-EVHB', 880000, 10, '{"color":"White","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_M4VKEnOuNq', 'prod_95hb7i_3vc', 'Blue - 256GB', 'GOOG-OCZ0AM-Y2HC', 650000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_cgcbxS-9Wz', 'prod_95hb7i_3vc', 'Blue - 512GB', 'GOOG-OCZ0AM-OI4B', 765000, 10, '{"color":"Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_dPXrPjq2yb', 'prod_95hb7i_3vc', 'Blue - 1TB', 'GOOG-OCZ0AM-LV86', 880000, 10, '{"color":"Blue","storage":"1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_aYTja1a_Ln', 'cat_smartphones', 'Google Pixel 10 Pro 512Go', 'google-pixel-10-pro-512go-ow4lb4', 720000, NULL, 'GOOG-IFEULP', 'Google', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_tdfecxqRAR', 'prod_aYTja1a_Ln', 'products/smartphones/google-pixel-10-pro-512go.webp', 'Google Pixel 10 Pro 512Go', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_1QqpoqBNdJ', 'prod_aYTja1a_Ln', 'N/A - 512GB', 'GOOG-IFEULP-EWKK', 720000, 10, '{"color":"N/A","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_YjtkpZy7vL', 'cat_smartphones', 'Samsung Z TRIFOLD', 'samsung-z-trifold-fGThEU', 2900000, NULL, 'SAMS-CSM4-V', 'Samsung', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_4XfDWcYIqP', 'prod_YjtkpZy7vL', 'products/smartphones/samsung-z-trifold.webp', 'Samsung Z TRIFOLD', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_a3iUoVd2X5', 'prod_YjtkpZy7vL', 'Black - 512GB', 'SAMS-CSM4-V-EDG6', 2900000, 10, '{"color":"Black","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_vTf-oD3Q1t', 'cat_smartphones', 'iPhone 17 Air', 'iphone-17-air-3-ViPM', 590000, NULL, 'APPL-C9GVXJ', 'Apple', 1, 1, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_rVh1WoQlW2', 'prod_vTf-oD3Q1t', 'products/smartphones/iphone-17-air.webp', 'iPhone 17 Air', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_LPEPfGliZU', 'prod_vTf-oD3Q1t', 'Black - 128GB', 'APPL-C9GVXJ-WUQW', 590000, 10, '{"color":"Black","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_x_q3psqtVn', 'prod_vTf-oD3Q1t', 'Black - 256GB', 'APPL-C9GVXJ-WGHM', 590000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_iZFfjrs7hQ', 'prod_vTf-oD3Q1t', 'White - 128GB', 'APPL-C9GVXJ-73GD', 590000, 10, '{"color":"White","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_6dY2otXeIf', 'prod_vTf-oD3Q1t', 'White - 256GB', 'APPL-C9GVXJ-L8JO', 590000, 10, '{"color":"White","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Iq_0bOZlmX', 'prod_vTf-oD3Q1t', 'Blue - 128GB', 'APPL-C9GVXJ-BXZO', 590000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_TxCVLLeIkN', 'prod_vTf-oD3Q1t', 'Blue - 256GB', 'APPL-C9GVXJ-KBK3', 590000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_wzK62yISDn', 'prod_vTf-oD3Q1t', 'Pink - 128GB', 'APPL-C9GVXJ-ZCPP', 590000, 10, '{"color":"Pink","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_d-8M57PyPX', 'prod_vTf-oD3Q1t', 'Pink - 256GB', 'APPL-C9GVXJ-Q6EX', 590000, 10, '{"color":"Pink","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_sfAEZUYY5A', 'cat_smartphones', 'iPhone 17 Pro Max', 'iphone-17-pro-max-vMSe3x', 950000, 1260000, 'APPL-DIMW_C', 'Apple', 1, 1, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_xN-dAli7u-', 'prod_sfAEZUYY5A', 'products/smartphones/iphone-17-pro-max.webp', 'iPhone 17 Pro Max', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_IgHF10_FQF', 'prod_sfAEZUYY5A', 'Black Titanium - 256GB', 'APPL-DIMW_C-700V', 950000, 10, '{"color":"Black Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_XI_sqpAXNQ', 'prod_sfAEZUYY5A', 'Black Titanium - 512GB', 'APPL-DIMW_C-JTEI', 1105000, 10, '{"color":"Black Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_nrLBNzMtxk', 'prod_sfAEZUYY5A', 'Black Titanium - 1TB', 'APPL-DIMW_C-CML6', 1260000, 10, '{"color":"Black Titanium","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_NxZHIElKmi', 'prod_sfAEZUYY5A', 'White Titanium - 256GB', 'APPL-DIMW_C-6VIQ', 950000, 10, '{"color":"White Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_CCVxXV7xg6', 'prod_sfAEZUYY5A', 'White Titanium - 512GB', 'APPL-DIMW_C-LMLG', 1105000, 10, '{"color":"White Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_YNEX-9uqCG', 'prod_sfAEZUYY5A', 'White Titanium - 1TB', 'APPL-DIMW_C-MRKG', 1260000, 10, '{"color":"White Titanium","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_l3J-Xtpqgn', 'prod_sfAEZUYY5A', 'Desert Titanium - 256GB', 'APPL-DIMW_C-30ZO', 950000, 10, '{"color":"Desert Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_53jJn5Asjc', 'prod_sfAEZUYY5A', 'Desert Titanium - 512GB', 'APPL-DIMW_C-SPBJ', 1105000, 10, '{"color":"Desert Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_mWlfQHyPRW', 'prod_sfAEZUYY5A', 'Desert Titanium - 1TB', 'APPL-DIMW_C-TC0Z', 1260000, 10, '{"color":"Desert Titanium","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ZfuYixg-uo', 'prod_sfAEZUYY5A', 'Titanium Blue - 256GB', 'APPL-DIMW_C-U4AR', 950000, 10, '{"color":"Titanium Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_vxnN09gGrb', 'prod_sfAEZUYY5A', 'Titanium Blue - 512GB', 'APPL-DIMW_C-RDFC', 1105000, 10, '{"color":"Titanium Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_x8490jvoUf', 'prod_sfAEZUYY5A', 'Titanium Blue - 1TB', 'APPL-DIMW_C-QZKS', 1260000, 10, '{"color":"Titanium Blue","storage":"1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_jUq07WmhA2', 'cat_smartphones', 'iPhone 17 Pro', 'iphone-17-pro-DRImdM', 880000, 900000, 'APPL-CDU4W9', 'Apple', 1, 1, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_3XRl2SqaI2', 'prod_jUq07WmhA2', 'products/smartphones/iphone-17-pro.webp', 'iPhone 17 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_rGIjjtPNWJ', 'prod_jUq07WmhA2', 'Black Titanium - 256GB', 'APPL-CDU4W9-HB2I', 880000, 10, '{"color":"Black Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_02o2k6Yy2h', 'prod_jUq07WmhA2', 'Black Titanium - 512GB', 'APPL-CDU4W9-NNSK', 900000, 10, '{"color":"Black Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_gyjzFcdpe0', 'prod_jUq07WmhA2', 'White Titanium - 256GB', 'APPL-CDU4W9-AKXB', 880000, 10, '{"color":"White Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ug8tZXC37c', 'prod_jUq07WmhA2', 'White Titanium - 512GB', 'APPL-CDU4W9-ZMT-', 900000, 10, '{"color":"White Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_j_QwpMOixE', 'prod_jUq07WmhA2', 'Desert Titanium - 256GB', 'APPL-CDU4W9-1XFC', 880000, 10, '{"color":"Desert Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ZP-aDIfSgH', 'prod_jUq07WmhA2', 'Desert Titanium - 512GB', 'APPL-CDU4W9--JTE', 900000, 10, '{"color":"Desert Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_gD_DGrVct8', 'prod_jUq07WmhA2', 'Titanium Blue - 256GB', 'APPL-CDU4W9-MJD3', 880000, 10, '{"color":"Titanium Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_8-qVZa0wQJ', 'prod_jUq07WmhA2', 'Titanium Blue - 512GB', 'APPL-CDU4W9-KJEM', 900000, 10, '{"color":"Titanium Blue","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_a9Q0_upITd', 'cat_smartphones', 'Apple iPhone 17 5G', 'apple-iphone-17-5g-XvqSJK', 580000, NULL, 'APPL-FGD2MB', 'Apple', 1, 1, 100);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_NakAlAfUzy', 'prod_a9Q0_upITd', 'products/smartphones/apple-iphone-17-5g.webp', 'Apple iPhone 17 5G', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_3pML2XyvJe', 'prod_a9Q0_upITd', 'Black - 128GB', 'APPL-FGD2MB-EYMO', 580000, 10, '{"color":"Black","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ji3op2ITzh', 'prod_a9Q0_upITd', 'Black - 256GB', 'APPL-FGD2MB-N9MD', 580000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_RK5SDAObql', 'prod_a9Q0_upITd', 'White - 128GB', 'APPL-FGD2MB-I2KF', 580000, 10, '{"color":"White","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_eykb_EtGtJ', 'prod_a9Q0_upITd', 'White - 256GB', 'APPL-FGD2MB-4PHY', 580000, 10, '{"color":"White","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_tCuOrnnUJ9', 'prod_a9Q0_upITd', 'Blue - 128GB', 'APPL-FGD2MB-T5_7', 580000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_AL-_myReZn', 'prod_a9Q0_upITd', 'Blue - 256GB', 'APPL-FGD2MB-V6AX', 580000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_eyTcr-gg4M', 'prod_a9Q0_upITd', 'Green - 128GB', 'APPL-FGD2MB-OQDO', 580000, 10, '{"color":"Green","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_0GyRmPUzEK', 'prod_a9Q0_upITd', 'Green - 256GB', 'APPL-FGD2MB-3U8T', 580000, 10, '{"color":"Green","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_uvsE5iKL1B', 'prod_a9Q0_upITd', 'Pink - 128GB', 'APPL-FGD2MB-XKIR', 580000, 10, '{"color":"Pink","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_QaiDMJfVVK', 'prod_a9Q0_upITd', 'Pink - 256GB', 'APPL-FGD2MB-JG01', 580000, 10, '{"color":"Pink","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_sVm_bxjNt-', 'cat_smartphones', 'Galaxy Z Fold 7', 'galaxy-z-fold-7-NrzWUY', 950000, 1270000, 'SAMS-YHJ9ST', 'Samsung', 1, 1, 90);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_tTQ9l9AglL', 'prod_sVm_bxjNt-', 'products/smartphones/galaxy-z-fold-7.webp', 'Galaxy Z Fold 7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_hu9ew5ddyA', 'prod_sVm_bxjNt-', 'Black - 256GB', 'SAMS-YHJ9ST-NGUG', 950000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_UGSDa6mPDf', 'prod_sVm_bxjNt-', 'Black - 512GB', 'SAMS-YHJ9ST-9C_O', 1110000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_b4_eQ9S7n5', 'prod_sVm_bxjNt-', 'Black - 1TB', 'SAMS-YHJ9ST-4BG0', 1270000, 10, '{"color":"Black","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Z2r28MY1Rr', 'prod_sVm_bxjNt-', 'Silver - 256GB', 'SAMS-YHJ9ST-YSX4', 950000, 10, '{"color":"Silver","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_N7S3sPV6l7', 'prod_sVm_bxjNt-', 'Silver - 512GB', 'SAMS-YHJ9ST-PMEO', 1110000, 10, '{"color":"Silver","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_QlcX5znHK9', 'prod_sVm_bxjNt-', 'Silver - 1TB', 'SAMS-YHJ9ST-3HRA', 1270000, 10, '{"color":"Silver","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_AnqR6g2psQ', 'prod_sVm_bxjNt-', 'Blue - 256GB', 'SAMS-YHJ9ST-G10V', 950000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_q0iED41LcR', 'prod_sVm_bxjNt-', 'Blue - 512GB', 'SAMS-YHJ9ST-_ZE1', 1110000, 10, '{"color":"Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_uEoRAVTT-e', 'prod_sVm_bxjNt-', 'Blue - 1TB', 'SAMS-YHJ9ST-GQKT', 1270000, 10, '{"color":"Blue","storage":"1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_7MTya_rjrB', 'cat_smartphones', 'iPhone 16 Pro Max', 'iphone-16-pro-max-PKPEwI', 770000, 1100000, 'APPL-MJAWK1', 'Apple', 1, 1, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_0NbpvghC7V', 'prod_7MTya_rjrB', 'products/smartphones/iphone-16-pro-max.webp', 'iPhone 16 Pro Max', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_4nXi8HUBvu', 'prod_7MTya_rjrB', 'Black Titanium - 256GB', 'APPL-MJAWK1-MYKV', 770000, 10, '{"color":"Black Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_zSF9OGXthP', 'prod_7MTya_rjrB', 'Black Titanium - 512GB', 'APPL-MJAWK1-ZVJ3', 935000, 10, '{"color":"Black Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Z7RrKWSmHL', 'prod_7MTya_rjrB', 'Black Titanium - 1TB', 'APPL-MJAWK1-4VRF', 1100000, 10, '{"color":"Black Titanium","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_8V1L29G67e', 'prod_7MTya_rjrB', 'White Titanium - 256GB', 'APPL-MJAWK1-7RCD', 770000, 10, '{"color":"White Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_A_2g62s6X-', 'prod_7MTya_rjrB', 'White Titanium - 512GB', 'APPL-MJAWK1-LZP8', 935000, 10, '{"color":"White Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_YxW26nwwqN', 'prod_7MTya_rjrB', 'White Titanium - 1TB', 'APPL-MJAWK1-RAFW', 1100000, 10, '{"color":"White Titanium","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_MORVhpObve', 'prod_7MTya_rjrB', 'Desert Titanium - 256GB', 'APPL-MJAWK1-R4UH', 770000, 10, '{"color":"Desert Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ng8ePWIUoY', 'prod_7MTya_rjrB', 'Desert Titanium - 512GB', 'APPL-MJAWK1-9UG7', 935000, 10, '{"color":"Desert Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_dM3XqBnyPc', 'prod_7MTya_rjrB', 'Desert Titanium - 1TB', 'APPL-MJAWK1-OHTW', 1100000, 10, '{"color":"Desert Titanium","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_YZOxzEfC7L', 'prod_7MTya_rjrB', 'Titanium Blue - 256GB', 'APPL-MJAWK1-NFWJ', 770000, 10, '{"color":"Titanium Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_yzSxXme8oz', 'prod_7MTya_rjrB', 'Titanium Blue - 512GB', 'APPL-MJAWK1-CNVC', 935000, 10, '{"color":"Titanium Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_k_da5wbJSv', 'prod_7MTya_rjrB', 'Titanium Blue - 1TB', 'APPL-MJAWK1-JHSD', 1100000, 10, '{"color":"Titanium Blue","storage":"1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_miATyM7JLs', 'cat_smartphones', 'iPhone 16 Pro', 'iphone-16-pro-dPKioQ', 650000, 710000, 'APPL-EIC9TS', 'Apple', 1, 1, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_e6vhPZZyzA', 'prod_miATyM7JLs', 'products/smartphones/iphone-16-pro.webp', 'iPhone 16 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_yODdd4_tUk', 'prod_miATyM7JLs', 'Black Titanium - 128GB', 'APPL-EIC9TS-JDCT', 650000, 10, '{"color":"Black Titanium","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_VgMYHDNZ6H', 'prod_miATyM7JLs', 'Black Titanium - 256GB', 'APPL-EIC9TS-_FLR', 680000, 10, '{"color":"Black Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_0Qq7n5G_Fi', 'prod_miATyM7JLs', 'Black Titanium - 512GB', 'APPL-EIC9TS-YLKF', 710000, 10, '{"color":"Black Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_-YjxM-Q5I2', 'prod_miATyM7JLs', 'White Titanium - 128GB', 'APPL-EIC9TS-0GXM', 650000, 10, '{"color":"White Titanium","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_40IVDr5hRY', 'prod_miATyM7JLs', 'White Titanium - 256GB', 'APPL-EIC9TS-QJIY', 680000, 10, '{"color":"White Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_l1IpgeC_RO', 'prod_miATyM7JLs', 'White Titanium - 512GB', 'APPL-EIC9TS-OELN', 710000, 10, '{"color":"White Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Cgn0bP_4wx', 'prod_miATyM7JLs', 'Desert Titanium - 128GB', 'APPL-EIC9TS-61R7', 650000, 10, '{"color":"Desert Titanium","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_UknnooTh9r', 'prod_miATyM7JLs', 'Desert Titanium - 256GB', 'APPL-EIC9TS-MESG', 680000, 10, '{"color":"Desert Titanium","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_uWVe2KNEtG', 'prod_miATyM7JLs', 'Desert Titanium - 512GB', 'APPL-EIC9TS-4-_N', 710000, 10, '{"color":"Desert Titanium","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_zIcGty6glL', 'prod_miATyM7JLs', 'Titanium Blue - 128GB', 'APPL-EIC9TS-XWLM', 650000, 10, '{"color":"Titanium Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_8K9MHaWU98', 'prod_miATyM7JLs', 'Titanium Blue - 256GB', 'APPL-EIC9TS-CI4R', 680000, 10, '{"color":"Titanium Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_X0kNKhMZuD', 'prod_miATyM7JLs', 'Titanium Blue - 512GB', 'APPL-EIC9TS-CJ-Q', 710000, 10, '{"color":"Titanium Blue","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_XzwaK0QVnj', 'cat_smartphones', 'iPhone 16 Plus', 'iphone-16-plus-pyZ9HK', 545000, 620000, 'APPL-0UCVUO', 'Apple', 1, 1, 150);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_mTGbpsMhsr', 'prod_XzwaK0QVnj', 'products/smartphones/iphone-16-plus.webp', 'iPhone 16 Plus', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ebsgXVrGqa', 'prod_XzwaK0QVnj', 'Black - 128GB', 'APPL-0UCVUO-DDZI', 545000, 10, '{"color":"Black","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_dOupwuRbbJ', 'prod_XzwaK0QVnj', 'Black - 256GB', 'APPL-0UCVUO-Z0NY', 582500, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_IFiy5hVSci', 'prod_XzwaK0QVnj', 'Black - 512GB', 'APPL-0UCVUO-5HZ_', 620000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_RIcBydnm7g', 'prod_XzwaK0QVnj', 'White - 128GB', 'APPL-0UCVUO-DDL_', 545000, 10, '{"color":"White","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_uuAkvfwfVA', 'prod_XzwaK0QVnj', 'White - 256GB', 'APPL-0UCVUO-ENCI', 582500, 10, '{"color":"White","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_IiMz67hEX_', 'prod_XzwaK0QVnj', 'White - 512GB', 'APPL-0UCVUO-ELDM', 620000, 10, '{"color":"White","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_JmK38IlSz8', 'prod_XzwaK0QVnj', 'Blue - 128GB', 'APPL-0UCVUO-OKAE', 545000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_2r4VqgAlcK', 'prod_XzwaK0QVnj', 'Blue - 256GB', 'APPL-0UCVUO-BPVL', 582500, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_2oASOv7ZmD', 'prod_XzwaK0QVnj', 'Blue - 512GB', 'APPL-0UCVUO-EWKM', 620000, 10, '{"color":"Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Z0JawPRrEL', 'prod_XzwaK0QVnj', 'Pink - 128GB', 'APPL-0UCVUO-_DHX', 545000, 10, '{"color":"Pink","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_6FAte1jj0c', 'prod_XzwaK0QVnj', 'Pink - 256GB', 'APPL-0UCVUO-WFQC', 582500, 10, '{"color":"Pink","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_PNeLLbNuFN', 'prod_XzwaK0QVnj', 'Pink - 512GB', 'APPL-0UCVUO-6S6U', 620000, 10, '{"color":"Pink","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_L8YCftuoBM', 'prod_XzwaK0QVnj', 'Green - 128GB', 'APPL-0UCVUO-HN2C', 545000, 10, '{"color":"Green","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_AA6C1VJwFm', 'prod_XzwaK0QVnj', 'Green - 256GB', 'APPL-0UCVUO-O3EQ', 582500, 10, '{"color":"Green","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_7UH5DssWKy', 'prod_XzwaK0QVnj', 'Green - 512GB', 'APPL-0UCVUO-MIRA', 620000, 10, '{"color":"Green","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_oRQuIKV4rD', 'cat_smartphones', 'iPhone 16', 'iphone-16-6jMHd0', 480000, 550000, 'APPL-83RBOP', 'Apple', 1, 1, 150);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_J-S4VlSUuC', 'prod_oRQuIKV4rD', 'products/smartphones/iphone-16.webp', 'iPhone 16', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Qov_SGk4A3', 'prod_oRQuIKV4rD', 'Black - 128GB', 'APPL-83RBOP-XOTF', 480000, 10, '{"color":"Black","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ZQfUHjuEpt', 'prod_oRQuIKV4rD', 'Black - 256GB', 'APPL-83RBOP-QCGT', 515000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_PzWT-CqsSj', 'prod_oRQuIKV4rD', 'Black - 512GB', 'APPL-83RBOP-GORG', 550000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ek_t7Y_DSK', 'prod_oRQuIKV4rD', 'White - 128GB', 'APPL-83RBOP-JW2Z', 480000, 10, '{"color":"White","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_E4vcuYdOyW', 'prod_oRQuIKV4rD', 'White - 256GB', 'APPL-83RBOP-DFBX', 515000, 10, '{"color":"White","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_vlyCgFoe8c', 'prod_oRQuIKV4rD', 'White - 512GB', 'APPL-83RBOP-CRJY', 550000, 10, '{"color":"White","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_luuDtjB1Ka', 'prod_oRQuIKV4rD', 'Blue - 128GB', 'APPL-83RBOP-YLAG', 480000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_xtp-ysIEbl', 'prod_oRQuIKV4rD', 'Blue - 256GB', 'APPL-83RBOP-MASG', 515000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_9SGnVOtXiy', 'prod_oRQuIKV4rD', 'Blue - 512GB', 'APPL-83RBOP-94KR', 550000, 10, '{"color":"Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_z2wtDsotRy', 'prod_oRQuIKV4rD', 'Pink - 128GB', 'APPL-83RBOP-WKUX', 480000, 10, '{"color":"Pink","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_k2yvBKvfwl', 'prod_oRQuIKV4rD', 'Pink - 256GB', 'APPL-83RBOP-2WIA', 515000, 10, '{"color":"Pink","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_0g6uDuK837', 'prod_oRQuIKV4rD', 'Pink - 512GB', 'APPL-83RBOP-L4M0', 550000, 10, '{"color":"Pink","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_j6_b4U-HKY', 'prod_oRQuIKV4rD', 'Green - 128GB', 'APPL-83RBOP-TIBJ', 480000, 10, '{"color":"Green","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_qIvQgXORtc', 'prod_oRQuIKV4rD', 'Green - 256GB', 'APPL-83RBOP-CCML', 515000, 10, '{"color":"Green","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_57XnvZgkJR', 'prod_oRQuIKV4rD', 'Green - 512GB', 'APPL-83RBOP-F350', 550000, 10, '{"color":"Green","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_r4-9wop1xl', 'cat_smartphones', 'Samsung Z Fold 6', 'samsung-z-fold-6-XM8pfK', 590000, 980000, 'SAMS-ORMMOO', 'Samsung', 1, 1, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_nAplPFgCTh', 'prod_r4-9wop1xl', 'products/smartphones/samsung-z-fold-6.webp', 'Samsung Z Fold 6', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_sJmn6V-MHr', 'prod_r4-9wop1xl', 'Black - 256GB', 'SAMS-ORMMOO-3MDH', 590000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_FIoTrdEMzY', 'prod_r4-9wop1xl', 'Black - 512GB', 'SAMS-ORMMOO-NT4H', 785000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_re8QwSZeAA', 'prod_r4-9wop1xl', 'Black - 1TB', 'SAMS-ORMMOO-8LPU', 980000, 10, '{"color":"Black","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_CEE21eO75s', 'prod_r4-9wop1xl', 'Silver - 256GB', 'SAMS-ORMMOO-YWZQ', 590000, 10, '{"color":"Silver","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_gQgGIxDsQf', 'prod_r4-9wop1xl', 'Silver - 512GB', 'SAMS-ORMMOO-1HQA', 785000, 10, '{"color":"Silver","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_r_qtfuMHF4', 'prod_r4-9wop1xl', 'Silver - 1TB', 'SAMS-ORMMOO-XEBI', 980000, 10, '{"color":"Silver","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_VCa-RdaZpr', 'prod_r4-9wop1xl', 'Blue - 256GB', 'SAMS-ORMMOO-ESBT', 590000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_p60HKyFG7B', 'prod_r4-9wop1xl', 'Blue - 512GB', 'SAMS-ORMMOO-UTIK', 785000, 10, '{"color":"Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_hipF3dTDSI', 'prod_r4-9wop1xl', 'Blue - 1TB', 'SAMS-ORMMOO-BBXA', 980000, 10, '{"color":"Blue","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Mgz5xNyViZ', 'prod_r4-9wop1xl', 'Pink - 256GB', 'SAMS-ORMMOO-L9TN', 590000, 10, '{"color":"Pink","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_gn6JwJ853N', 'prod_r4-9wop1xl', 'Pink - 512GB', 'SAMS-ORMMOO-D53F', 785000, 10, '{"color":"Pink","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_uY6IsrTnz2', 'prod_r4-9wop1xl', 'Pink - 1TB', 'SAMS-ORMMOO-OCKL', 980000, 10, '{"color":"Pink","storage":"1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_0rTNfUdhM8', 'cat_smartphones', 'Samsung Z Fold 5', 'samsung-z-fold-5-7x8Yqx', 630000, 670000, 'SAMS--_M6JG', 'Samsung', 1, 1, 60);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_wBHHZIOHUP', 'prod_0rTNfUdhM8', 'products/smartphones/samsung-z-fold-5.webp', 'Samsung Z Fold 5', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_IAqxchVecs', 'prod_0rTNfUdhM8', 'Black - 256GB', 'SAMS--_M6JG-0MVG', 630000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_R3C5QOtHYg', 'prod_0rTNfUdhM8', 'Black - 512GB', 'SAMS--_M6JG-YHRC', 670000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ReG75-2E2N', 'prod_0rTNfUdhM8', 'Cream - 256GB', 'SAMS--_M6JG-OMNX', 630000, 10, '{"color":"Cream","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_C1Ygil7j7C', 'prod_0rTNfUdhM8', 'Cream - 512GB', 'SAMS--_M6JG-MWJH', 670000, 10, '{"color":"Cream","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Aqx_V0gZaX', 'prod_0rTNfUdhM8', 'Blue - 256GB', 'SAMS--_M6JG-980_', 630000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_tEN11aZM1f', 'prod_0rTNfUdhM8', 'Blue - 512GB', 'SAMS--_M6JG-JDAF', 670000, 10, '{"color":"Blue","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_U1bRjY-yY5', 'cat_smartphones', 'Samsung Z Fold 4', 'samsung-z-fold-4-ROvZGq', 485000, 570000, 'SAMS-SHMO3P', 'Samsung', 1, 1, 60);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_-P_Iknp77c', 'prod_U1bRjY-yY5', 'products/smartphones/samsung-z-fold-4.webp', 'Samsung Z Fold 4', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_cfw01qIZEK', 'prod_U1bRjY-yY5', 'Black - 256GB', 'SAMS-SHMO3P-T6CA', 485000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_GOjFY21qFt', 'prod_U1bRjY-yY5', 'Black - 512GB', 'SAMS-SHMO3P-IAXN', 570000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_3wa9b7Yimp', 'prod_U1bRjY-yY5', 'Grey - 256GB', 'SAMS-SHMO3P-0ULA', 485000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__dm64J6PW4', 'prod_U1bRjY-yY5', 'Grey - 512GB', 'SAMS-SHMO3P-BIGV', 570000, 10, '{"color":"Grey","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_bo7QjiTSTt', 'prod_U1bRjY-yY5', 'Beige - 256GB', 'SAMS-SHMO3P-25U8', 485000, 10, '{"color":"Beige","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__H_bx3TT_U', 'prod_U1bRjY-yY5', 'Beige - 512GB', 'SAMS-SHMO3P-ZWBP', 570000, 10, '{"color":"Beige","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_VQsPFpU-4u', 'cat_smartphones', 'Samsung Z Fold 3', 'samsung-z-fold-3-voPC7w', 475000, 630000, 'SAMS-OLY3SX', 'Samsung', 1, 1, 60);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_2oGERtXl77', 'prod_VQsPFpU-4u', 'products/smartphones/samsung-z-fold-3.webp', 'Samsung Z Fold 3', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_LD37MVfKMI', 'prod_VQsPFpU-4u', 'Black - 256GB', 'SAMS-OLY3SX-9OPK', 475000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_QArABGzf6I', 'prod_VQsPFpU-4u', 'Black - 512GB', 'SAMS-OLY3SX-_HY0', 630000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_0MgI2KW1cF', 'prod_VQsPFpU-4u', 'Silver - 256GB', 'SAMS-OLY3SX-GMJ9', 475000, 10, '{"color":"Silver","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_eLyK7nwm7h', 'prod_VQsPFpU-4u', 'Silver - 512GB', 'SAMS-OLY3SX-U_IR', 630000, 10, '{"color":"Silver","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_BMWpZDogck', 'prod_VQsPFpU-4u', 'Green - 256GB', 'SAMS-OLY3SX-TX2O', 475000, 10, '{"color":"Green","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_neU1CvfuTh', 'prod_VQsPFpU-4u', 'Green - 512GB', 'SAMS-OLY3SX-ENBS', 630000, 10, '{"color":"Green","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_MgPWtTbfEB', 'cat_smartphones', 'Samsung Z Flip 6', 'samsung-z-flip-6-bIbr9F', 455000, 550000, 'SAMS-LL0T0L', 'Samsung', 1, 1, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_cgOa9KjZbt', 'prod_MgPWtTbfEB', 'products/smartphones/samsung-z-flip-6.webp', 'Samsung Z Flip 6', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_iKciLtR3JK', 'prod_MgPWtTbfEB', 'Black - 256GB', 'SAMS-LL0T0L-5CUC', 455000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_tKeN9V-QGQ', 'prod_MgPWtTbfEB', 'Black - 512GB', 'SAMS-LL0T0L-6JJK', 550000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_2WjAsdF9s9', 'prod_MgPWtTbfEB', 'Blue - 256GB', 'SAMS-LL0T0L-KDUN', 455000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_tSaMceyWGV', 'prod_MgPWtTbfEB', 'Blue - 512GB', 'SAMS-LL0T0L-ZWJH', 550000, 10, '{"color":"Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_nBC8rr0iSh', 'prod_MgPWtTbfEB', 'Mint - 256GB', 'SAMS-LL0T0L--LTR', 455000, 10, '{"color":"Mint","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_AC1fmEE3Dk', 'prod_MgPWtTbfEB', 'Mint - 512GB', 'SAMS-LL0T0L-J4ZS', 550000, 10, '{"color":"Mint","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_NGk9cbGYDp', 'prod_MgPWtTbfEB', 'Yellow - 256GB', 'SAMS-LL0T0L-UC7E', 455000, 10, '{"color":"Yellow","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_uTEv5IXoau', 'prod_MgPWtTbfEB', 'Yellow - 512GB', 'SAMS-LL0T0L-FELV', 550000, 10, '{"color":"Yellow","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_WHb_wI9FLV', 'cat_smartphones', 'Samsung S25 Ultra', 'samsung-s25-ultra-7JCQfN', 550000, 830000, 'SAMS-PAF7NU', 'Samsung', 1, 1, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ZPPmZ6f_Nj', 'prod_WHb_wI9FLV', 'products/smartphones/samsung-s25-ultra.webp', 'Samsung S25 Ultra', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_LI7ymOuScr', 'prod_WHb_wI9FLV', 'Black - 12GB/256GB', 'SAMS-PAF7NU-NGPT', 550000, 10, '{"color":"Black","storage":"12GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__dzwp5yrLW', 'prod_WHb_wI9FLV', 'Black - 12GB/512GB', 'SAMS-PAF7NU-2JTB', 690000, 10, '{"color":"Black","storage":"12GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_mmNLizB3d2', 'prod_WHb_wI9FLV', 'Black - 12GB/1TB', 'SAMS-PAF7NU-VT_O', 830000, 10, '{"color":"Black","storage":"12GB/1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_dHzM4hNuA9', 'prod_WHb_wI9FLV', 'White - 12GB/256GB', 'SAMS-PAF7NU-IG3I', 550000, 10, '{"color":"White","storage":"12GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_dKwx9ndQjG', 'prod_WHb_wI9FLV', 'White - 12GB/512GB', 'SAMS-PAF7NU-8KWY', 690000, 10, '{"color":"White","storage":"12GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_RnCD35Y2ve', 'prod_WHb_wI9FLV', 'White - 12GB/1TB', 'SAMS-PAF7NU-FIGX', 830000, 10, '{"color":"White","storage":"12GB/1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ejUIM_crPg', 'prod_WHb_wI9FLV', 'Blue - 12GB/256GB', 'SAMS-PAF7NU--ZQS', 550000, 10, '{"color":"Blue","storage":"12GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_CnduCrl7kN', 'prod_WHb_wI9FLV', 'Blue - 12GB/512GB', 'SAMS-PAF7NU-AJA0', 690000, 10, '{"color":"Blue","storage":"12GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_twq2_iMTIa', 'prod_WHb_wI9FLV', 'Blue - 12GB/1TB', 'SAMS-PAF7NU-63XG', 830000, 10, '{"color":"Blue","storage":"12GB/1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ESYXSmaRrG', 'prod_WHb_wI9FLV', 'Silver - 12GB/256GB', 'SAMS-PAF7NU-_QME', 550000, 10, '{"color":"Silver","storage":"12GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_2Dad8D3lQ2', 'prod_WHb_wI9FLV', 'Silver - 12GB/512GB', 'SAMS-PAF7NU-QKCP', 690000, 10, '{"color":"Silver","storage":"12GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_D9hGxS1-xk', 'prod_WHb_wI9FLV', 'Silver - 12GB/1TB', 'SAMS-PAF7NU-BVE0', 830000, 10, '{"color":"Silver","storage":"12GB/1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_VPTboZiQWt', 'cat_smartphones', 'Samsung S25+', 'samsung-s25--BqAlW', 505000, 580000, 'SAMS-FGWWEG', 'Samsung', 1, 1, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_fAFFTfhGVB', 'prod_VPTboZiQWt', 'products/smartphones/samsung-s25.webp', 'Samsung S25+', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_PBZPF_i-3C', 'prod_VPTboZiQWt', 'Black - 12GB/256GB', 'SAMS-FGWWEG-U1HL', 505000, 10, '{"color":"Black","storage":"12GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_h8M-DtWr3C', 'prod_VPTboZiQWt', 'Black - 12GB/512GB', 'SAMS-FGWWEG-QXWW', 580000, 10, '{"color":"Black","storage":"12GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_os15IA_o3o', 'prod_VPTboZiQWt', 'Blue - 12GB/256GB', 'SAMS-FGWWEG-BK49', 505000, 10, '{"color":"Blue","storage":"12GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_hpXqul3bZ5', 'prod_VPTboZiQWt', 'Blue - 12GB/512GB', 'SAMS-FGWWEG-YUY2', 580000, 10, '{"color":"Blue","storage":"12GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_XdSCI1XAuo', 'prod_VPTboZiQWt', 'Silver - 12GB/256GB', 'SAMS-FGWWEG-IHV7', 505000, 10, '{"color":"Silver","storage":"12GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_E8GXMiReu8', 'prod_VPTboZiQWt', 'Silver - 12GB/512GB', 'SAMS-FGWWEG-IA_R', 580000, 10, '{"color":"Silver","storage":"12GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__37tcxOOtW', 'prod_VPTboZiQWt', 'Mint - 12GB/256GB', 'SAMS-FGWWEG-CV5N', 505000, 10, '{"color":"Mint","storage":"12GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_282ojWIZpT', 'prod_VPTboZiQWt', 'Mint - 12GB/512GB', 'SAMS-FGWWEG-GLA1', 580000, 10, '{"color":"Mint","storage":"12GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_f23naenUMZ', 'cat_smartphones', 'Samsung S25', 'samsung-s25-HXAApf', 400000, 455000, 'SAMS-PLA4A_', 'Samsung', 1, 1, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_0qogt-sEOX', 'prod_f23naenUMZ', 'products/smartphones/samsung-s25.webp', 'Samsung S25', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_sdBzV7PO13', 'prod_f23naenUMZ', 'Black - 8GB/128GB', 'SAMS-PLA4A_-STAB', 400000, 10, '{"color":"Black","storage":"8GB/128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_hpTMxHPoNv', 'prod_f23naenUMZ', 'Black - 8GB/256GB', 'SAMS-PLA4A_-J8DX', 455000, 10, '{"color":"Black","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_sWfefdkXoP', 'prod_f23naenUMZ', 'Blue - 8GB/128GB', 'SAMS-PLA4A_-S6SP', 400000, 10, '{"color":"Blue","storage":"8GB/128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_r9hnWD1C_T', 'prod_f23naenUMZ', 'Blue - 8GB/256GB', 'SAMS-PLA4A_-GA5H', 455000, 10, '{"color":"Blue","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_WEOzpoWLdw', 'prod_f23naenUMZ', 'Silver - 8GB/128GB', 'SAMS-PLA4A_-QETC', 400000, 10, '{"color":"Silver","storage":"8GB/128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_-CQBiiKFqm', 'prod_f23naenUMZ', 'Silver - 8GB/256GB', 'SAMS-PLA4A_-FED4', 455000, 10, '{"color":"Silver","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_HPwaMYjAZD', 'prod_f23naenUMZ', 'Mint - 8GB/128GB', 'SAMS-PLA4A_-_A-A', 400000, 10, '{"color":"Mint","storage":"8GB/128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_XhzFwR_O8f', 'prod_f23naenUMZ', 'Mint - 8GB/256GB', 'SAMS-PLA4A_-DG-G', 455000, 10, '{"color":"Mint","storage":"8GB/256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_qJXrqYJyO4', 'cat_smartphones', 'Samsung S24 Ultra', 'samsung-s24-ultra-W8xzlL', 495000, 780000, 'SAMS-E3UOG_', 'Samsung', 1, 0, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_asE8XXMCWD', 'prod_qJXrqYJyO4', 'products/smartphones/samsung-s24-ultra.webp', 'Samsung S24 Ultra', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_sys3wxULEl', 'prod_qJXrqYJyO4', 'Titanium Black - 256GB', 'SAMS-E3UOG_-ZOSO', 495000, 10, '{"color":"Titanium Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_jIWY3EQqXs', 'prod_qJXrqYJyO4', 'Titanium Black - 512GB', 'SAMS-E3UOG_-_XES', 637500, 10, '{"color":"Titanium Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_3n8hOixDDm', 'prod_qJXrqYJyO4', 'Titanium Black - 1TB', 'SAMS-E3UOG_-MIRG', 780000, 10, '{"color":"Titanium Black","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_tkZ_6-l8xv', 'prod_qJXrqYJyO4', 'Titanium Gray - 256GB', 'SAMS-E3UOG_-A7FP', 495000, 10, '{"color":"Titanium Gray","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_UQvoZwPN2y', 'prod_qJXrqYJyO4', 'Titanium Gray - 512GB', 'SAMS-E3UOG_-0UMI', 637500, 10, '{"color":"Titanium Gray","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_IpZuPt1nxe', 'prod_qJXrqYJyO4', 'Titanium Gray - 1TB', 'SAMS-E3UOG_-V9_6', 780000, 10, '{"color":"Titanium Gray","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_d56b_XYmRx', 'prod_qJXrqYJyO4', 'Titanium Violet - 256GB', 'SAMS-E3UOG_-H1R8', 495000, 10, '{"color":"Titanium Violet","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ofNERuum2L', 'prod_qJXrqYJyO4', 'Titanium Violet - 512GB', 'SAMS-E3UOG_-IRAA', 637500, 10, '{"color":"Titanium Violet","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_XdHPUToWaG', 'prod_qJXrqYJyO4', 'Titanium Violet - 1TB', 'SAMS-E3UOG_-ROTK', 780000, 10, '{"color":"Titanium Violet","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_UsEf3mBv-x', 'prod_qJXrqYJyO4', 'Titanium Yellow - 256GB', 'SAMS-E3UOG_-VDAB', 495000, 10, '{"color":"Titanium Yellow","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_WfM1XIS7_w', 'prod_qJXrqYJyO4', 'Titanium Yellow - 512GB', 'SAMS-E3UOG_-LA7X', 637500, 10, '{"color":"Titanium Yellow","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_pVyVczhsBV', 'prod_qJXrqYJyO4', 'Titanium Yellow - 1TB', 'SAMS-E3UOG_--9UN', 780000, 10, '{"color":"Titanium Yellow","storage":"1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_tqUzTwb7d8', 'cat_smartphones', 'Samsung S24', 'samsung-s24-l6NAme', 340000, 550000, 'SAMS-ICUGPQ', 'Samsung', 1, 0, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_WCu3JZiSp_', 'prod_tqUzTwb7d8', 'products/smartphones/samsung-s24.webp', 'Samsung S24', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_UVDZnpi1ik', 'prod_tqUzTwb7d8', 'Black - 128GB', 'SAMS-ICUGPQ-LLVH', 340000, 10, '{"color":"Black","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_jeM_NBnmyl', 'prod_tqUzTwb7d8', 'Black - 256GB', 'SAMS-ICUGPQ-345A', 445000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_KaTIQWScsX', 'prod_tqUzTwb7d8', 'Black - 512GB', 'SAMS-ICUGPQ-RU7D', 550000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_LSDUmKToGK', 'prod_tqUzTwb7d8', 'Grey - 128GB', 'SAMS-ICUGPQ-YET2', 340000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_R4qVXdngfa', 'prod_tqUzTwb7d8', 'Grey - 256GB', 'SAMS-ICUGPQ-D9IQ', 445000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_5HbDBvpyEx', 'prod_tqUzTwb7d8', 'Grey - 512GB', 'SAMS-ICUGPQ-Q7FW', 550000, 10, '{"color":"Grey","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_irJYAY4TcV', 'prod_tqUzTwb7d8', 'Violet - 128GB', 'SAMS-ICUGPQ-MF-N', 340000, 10, '{"color":"Violet","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_4_SYq35ovY', 'prod_tqUzTwb7d8', 'Violet - 256GB', 'SAMS-ICUGPQ-SVXN', 445000, 10, '{"color":"Violet","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_zMlc5p0ICK', 'prod_tqUzTwb7d8', 'Violet - 512GB', 'SAMS-ICUGPQ-ZYZ1', 550000, 10, '{"color":"Violet","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_2cXmEbKd49', 'prod_tqUzTwb7d8', 'Yellow - 128GB', 'SAMS-ICUGPQ-U5T-', 340000, 10, '{"color":"Yellow","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_w-bgEaj5tj', 'prod_tqUzTwb7d8', 'Yellow - 256GB', 'SAMS-ICUGPQ-ITHW', 445000, 10, '{"color":"Yellow","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_na1qFtFKUM', 'prod_tqUzTwb7d8', 'Yellow - 512GB', 'SAMS-ICUGPQ-VJD4', 550000, 10, '{"color":"Yellow","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod__diSAEW5Qx', 'cat_smartphones', 'Samsung S23 FE 5G', 'samsung-s23-fe-5g-QaeCEK', 270000, 295000, 'SAMS-CLVBJP', 'Samsung', 1, 0, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_HuZHpcAnzk', 'prod__diSAEW5Qx', 'products/smartphones/samsung-s23-fe-5g.webp', 'Samsung S23 FE 5G', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Bp_RfN7OI-', 'prod__diSAEW5Qx', 'Black - 128GB', 'SAMS-CLVBJP-G4TJ', 270000, 10, '{"color":"Black","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_RrlXlaKxTs', 'prod__diSAEW5Qx', 'Black - 256GB', 'SAMS-CLVBJP-JRI6', 295000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_rx4qtaRY9Y', 'prod__diSAEW5Qx', 'Cream - 128GB', 'SAMS-CLVBJP-YW8Y', 270000, 10, '{"color":"Cream","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_okC2j2xnhE', 'prod__diSAEW5Qx', 'Cream - 256GB', 'SAMS-CLVBJP-V08I', 295000, 10, '{"color":"Cream","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_IrII27vThK', 'prod__diSAEW5Qx', 'Mint - 128GB', 'SAMS-CLVBJP-TRXC', 270000, 10, '{"color":"Mint","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_LP8b8bPu5U', 'prod__diSAEW5Qx', 'Mint - 256GB', 'SAMS-CLVBJP-F1YV', 295000, 10, '{"color":"Mint","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_VzRIHpbudf', 'prod__diSAEW5Qx', 'Purple - 128GB', 'SAMS-CLVBJP-DC82', 270000, 10, '{"color":"Purple","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_qse46Z6ppe', 'prod__diSAEW5Qx', 'Purple - 256GB', 'SAMS-CLVBJP-BFCE', 295000, 10, '{"color":"Purple","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_fey-HZ6nVM', 'cat_smartphones', 'Honor 200', 'honor-200-o3NcYx', 280000, NULL, 'HONO-N4R6UY', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_VVZYvdSvj6', 'prod_fey-HZ6nVM', 'products/smartphones/honor-200.webp', 'Honor 200', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_3XxZheR9ha', 'prod_fey-HZ6nVM', 'Black - 256GB', 'HONO-N4R6UY-OQY1', 280000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_2AiC-MiPtr', 'prod_fey-HZ6nVM', 'Green - 256GB', 'HONO-N4R6UY-W0CN', 280000, 10, '{"color":"Green","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_JrJeccMQz0', 'cat_smartphones', 'Honor 400 Lite', 'honor-400-lite-dWHUti', 190000, NULL, 'HONO-5WSVSU', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_wmJL14kGaM', 'prod_JrJeccMQz0', 'products/smartphones/honor-400-lite.webp', 'Honor 400 Lite', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_DY5dp-GBDq', 'prod_JrJeccMQz0', 'Silver - 256GB', 'HONO-5WSVSU-QPUT', 190000, 10, '{"color":"Silver","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_8f9n4dUuYD', 'prod_JrJeccMQz0', 'Black - 256GB', 'HONO-5WSVSU-WQK7', 190000, 10, '{"color":"Black","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_0SSFzw2DNW', 'cat_smartphones', 'Honor 400 Pro', 'honor-400-pro-US2c3l', 450000, NULL, 'HONO-Z5FWX0', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_K2ZAi_Z4dh', 'prod_0SSFzw2DNW', 'products/smartphones/honor-400-pro.webp', 'Honor 400 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_7Ka2fN97Jt', 'prod_0SSFzw2DNW', 'Sky Blue - 512GB', 'HONO-Z5FWX0-EWU3', 450000, 10, '{"color":"Sky Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_cAIzo_gSAC', 'prod_0SSFzw2DNW', 'Black - 512GB', 'HONO-Z5FWX0-0KIU', 450000, 10, '{"color":"Black","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_7h6W09V8BZ', 'cat_smartphones', 'Honor Magic 6 Pro', 'honor-magic-6-pro-2O5di2', 500000, NULL, 'HONO-5NF0CI', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_DXVZhNOsKZ', 'prod_7h6W09V8BZ', 'products/smartphones/honor-magic-6-pro.webp', 'Honor Magic 6 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ctC1Wfs4Ab', 'prod_7h6W09V8BZ', 'Green - 512GB', 'HONO-5NF0CI-J5ZV', 500000, 10, '{"color":"Green","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_yeyrKAXT-C', 'prod_7h6W09V8BZ', 'Black - 512GB', 'HONO-5NF0CI-BHCF', 500000, 10, '{"color":"Black","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_bJjpNq5NMD', 'cat_smartphones', 'Honor Magic 7 Pro', 'honor-magic-7-pro-Ozdzkh', 600000, NULL, 'HONO-BFCFFY', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_lv_fHy6UBG', 'prod_bJjpNq5NMD', 'products/smartphones/honor-magic-7-pro.webp', 'Honor Magic 7 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_jCu6QbdQIJ', 'prod_bJjpNq5NMD', 'Silver - 512GB', 'HONO-BFCFFY-0ACX', 600000, 10, '{"color":"Silver","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_vdZZc_buJ9', 'prod_bJjpNq5NMD', 'Black - 512GB', 'HONO-BFCFFY-NL8C', 600000, 10, '{"color":"Black","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_WZ5Yv3-7XV', 'cat_smartphones', 'Honor Magic V2', 'honor-magic-v2-B-X6KO', 630000, NULL, 'HONO-S9E70G', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_lWX9VruZxM', 'prod_WZ5Yv3-7XV', 'products/smartphones/honor-magic-v2.webp', 'Honor Magic V2', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_TSWy1jTOBM', 'prod_WZ5Yv3-7XV', 'Black - 512GB', 'HONO-S9E70G-W9IF', 630000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_c2bqZFTCtH', 'prod_WZ5Yv3-7XV', 'Purple - 512GB', 'HONO-S9E70G-J79U', 630000, 10, '{"color":"Purple","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_2MVX_HRQCY', 'cat_smartphones', 'Honor Magic V3', 'honor-magic-v3-etJbGJ', 830000, NULL, 'HONO-KU-34J', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_bkzPZLIUsh', 'prod_2MVX_HRQCY', 'products/smartphones/honor-magic-v3.webp', 'Honor Magic V3', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_hIJhsTQEtU', 'prod_2MVX_HRQCY', 'Brown - 512GB', 'HONO-KU-34J-UZI3', 830000, 10, '{"color":"Brown","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_FNFOO7sO8I', 'prod_2MVX_HRQCY', 'Black - 512GB', 'HONO-KU-34J-TU6N', 830000, 10, '{"color":"Black","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_cpPgw7sRVH', 'cat_smartphones', 'Honor Magic V5 16Go Ram 512Go', 'honor-magic-v5-16go-ram-512go-yVHr1f', 930000, NULL, 'HONO-U4EXKO', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_nnOWG32Qda', 'prod_cpPgw7sRVH', 'products/smartphones/honor-magic-v5-16go-ram-512go.webp', 'Honor Magic V5 16Go Ram 512Go', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_xMA7vayBca', 'prod_cpPgw7sRVH', 'Black - 512GB', 'HONO-U4EXKO-GCKI', 930000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_GkwTgcdc12', 'prod_cpPgw7sRVH', 'White - 512GB', 'HONO-U4EXKO-L8E5', 930000, 10, '{"color":"White","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Yl7_5rZBbK', 'cat_smartphones', 'Honor X7B', 'honor-x7b-oYRhJ5', 100000, NULL, 'HONO-I4EW78', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_MnlRbY426g', 'prod_Yl7_5rZBbK', 'products/smartphones/honor-x7b.webp', 'Honor X7B', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_r1545QoleN', 'prod_Yl7_5rZBbK', 'Green - 128GB', 'HONO-I4EW78-U_XL', 100000, 10, '{"color":"Green","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_LkWJYxcRBn', 'prod_Yl7_5rZBbK', 'Black - 128GB', 'HONO-I4EW78-I1Y1', 100000, 10, '{"color":"Black","storage":"128GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_lSo04D9V7-', 'cat_smartphones', 'Honor X7C', 'honor-x7c-eiAJ2S', 120000, NULL, 'HONO-W7T9BV', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_klCSWbfRzo', 'prod_lSo04D9V7-', 'products/smartphones/honor-x7c.webp', 'Honor X7C', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_yGf4CBairo', 'prod_lSo04D9V7-', 'Black - 128GB', 'HONO-W7T9BV-LEGV', 120000, 10, '{"color":"Black","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_vZNDSiB2m9', 'prod_lSo04D9V7-', 'Blue - 128GB', 'HONO-W7T9BV-X2Y6', 120000, 10, '{"color":"Blue","storage":"128GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_6SWP8pTwlm', 'cat_smartphones', 'Honor X9C', 'honor-x9c-0snSwD', 190000, NULL, 'HONO-TADMUB', 'Honor', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_3XMJK0lcYn', 'prod_6SWP8pTwlm', 'products/smartphones/honor-x9c.webp', 'Honor X9C', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_QVaj83tG-1', 'prod_6SWP8pTwlm', 'Orange - 256GB', 'HONO-TADMUB-YAQD', 190000, 10, '{"color":"Orange","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_CW8qhfotgU', 'prod_6SWP8pTwlm', 'Black - 256GB', 'HONO-TADMUB-DKWY', 190000, 10, '{"color":"Black","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_fWUximxfhs', 'cat_smartphones', 'Huawei Mate X3', 'huawei-mate-x3-a3AScx', 680000, NULL, 'HUAW-WJTRBN', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_G6QF1lpO_G', 'prod_fWUximxfhs', 'products/smartphones/huawei-mate-x3.webp', 'Huawei Mate X3', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_--Twsg89JG', 'prod_fWUximxfhs', 'Black - 512GB', 'HUAW-WJTRBN-OTA0', 680000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_IHhdQ6Zg5Q', 'prod_fWUximxfhs', 'Gold - 512GB', 'HUAW-WJTRBN-EHXC', 680000, 10, '{"color":"Gold","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_uWBe-2nPpz', 'cat_smartphones', 'Huawei Mate X6', 'huawei-mate-x6-eDbZ_e', 850000, NULL, 'HUAW-GTJQNR', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_KFx9grZWtY', 'prod_uWBe-2nPpz', 'products/smartphones/huawei-mate-x6.webp', 'Huawei Mate X6', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_0PCaHxtStb', 'prod_uWBe-2nPpz', 'Black - 512GB', 'HUAW-GTJQNR-8KZC', 850000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_UyFvVUDCXc', 'prod_uWBe-2nPpz', 'Red - 512GB', 'HUAW-GTJQNR-PYTC', 850000, 10, '{"color":"Red","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod__YhuvUZJ46', 'cat_smartphones', 'Huawei Mate XT', 'huawei-mate-xt-eTp6Fr', 1550000, 1800000, 'HUAW-780_1K', 'Huawei', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_boqROyLIV8', 'prod__YhuvUZJ46', 'products/smartphones/huawei-mate-xt.webp', 'Huawei Mate XT', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_k84KmzX3ev', 'prod__YhuvUZJ46', 'Black - 1TB', 'HUAW-780_1K-KXN1', 1800000, 10, '{"color":"Black","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_uO4jCXSViI', 'prod__YhuvUZJ46', 'Gold - 1TB', 'HUAW-780_1K-4RO6', 1800000, 10, '{"color":"Gold","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_GAKqtlAT59', 'prod__YhuvUZJ46', 'Black - 512GB', 'HUAW-780_1K-US8Y', 1550000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_yOcmvf5fUi', 'prod__YhuvUZJ46', 'Gold - 512GB', 'HUAW-780_1K-ACT7', 1550000, 10, '{"color":"Gold","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_0Fb1DGeSth', 'cat_smartphones', 'Huawei Nova 11 Pro', 'huawei-nova-11-pro-VunR3i', 450000, NULL, 'HUAW-KUJNJQ', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_nmP9OWw-DE', 'prod_0Fb1DGeSth', 'products/smartphones/huawei-nova-11-pro.webp', 'Huawei Nova 11 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_3_AIkVqGhS', 'prod_0Fb1DGeSth', 'Black - 256GB', 'HUAW-KUJNJQ-V_TV', 450000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ZICtdFkiBr', 'prod_0Fb1DGeSth', 'Gold - 256GB', 'HUAW-KUJNJQ-W-LC', 450000, 10, '{"color":"Gold","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_gVkaYP_owX', 'cat_smartphones', 'Huawei Nova 12i', 'huawei-nova-12i-0Dq_aN', 138000, NULL, 'HUAW-KDUD-M', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_vHTKd8ddn5', 'prod_gVkaYP_owX', 'products/smartphones/huawei-nova-12i.webp', 'Huawei Nova 12i', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_PVhW4C_P36', 'prod_gVkaYP_owX', 'Blue - 256GB', 'HUAW-KDUD-M-XSHI', 138000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Wot3739ExI', 'prod_gVkaYP_owX', 'Black - 256GB', 'HUAW-KDUD-M-MY6W', 138000, 10, '{"color":"Black","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_N8I1Tx7R9z', 'cat_smartphones', 'Huawei Nova 12s', 'huawei-nova-12s-8_kB0l', 165000, NULL, 'HUAW-ZFKSVU', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_vhL7O_jOQv', 'prod_N8I1Tx7R9z', 'products/smartphones/huawei-nova-12s.webp', 'Huawei Nova 12s', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_qyLz5IauNI', 'prod_N8I1Tx7R9z', 'Black - 256GB', 'HUAW-ZFKSVU-PCZ7', 165000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_QFBh916zbJ', 'prod_N8I1Tx7R9z', 'Green - 256GB', 'HUAW-ZFKSVU-SYIG', 165000, 10, '{"color":"Green","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Su6q4oORWg', 'cat_smartphones', 'Huawei Pura 70', 'huawei-pura-70-MG4mE2', 290000, NULL, 'HUAW-ECU4GF', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_urvjcE0U_B', 'prod_Su6q4oORWg', 'products/smartphones/huawei-pura-70.webp', 'Huawei Pura 70', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ynCQmpdXhI', 'prod_Su6q4oORWg', 'Black - 256GB', 'HUAW-ECU4GF-BCS_', 290000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_9Ch-PbNH6I', 'prod_Su6q4oORWg', 'Green - 256GB', 'HUAW-ECU4GF-DI74', 290000, 10, '{"color":"Green","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_58AN3LKzwK', 'cat_smartphones', 'Huawei Pura 70 Pro', 'huawei-pura-70-pro-WQHCF2', 450000, NULL, 'HUAW-9TVBQZ', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_oxakkwzGs0', 'prod_58AN3LKzwK', 'products/smartphones/huawei-pura-70-pro.webp', 'Huawei Pura 70 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_NmwUFs9Wcz', 'prod_58AN3LKzwK', 'White - 512GB', 'HUAW-9TVBQZ-PMRW', 450000, 10, '{"color":"White","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_cgxaXRgY-K', 'prod_58AN3LKzwK', 'Black - 512GB', 'HUAW-9TVBQZ-BYEW', 450000, 10, '{"color":"Black","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_7v-DLwNDL7', 'cat_smartphones', 'Huawei Pura 70 Ultra', 'huawei-pura-70-ultra-q_ikl-', 580000, NULL, 'HUAW-5ZHKPG', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_CyYE1bJ8Gk', 'prod_7v-DLwNDL7', 'products/smartphones/huawei-pura-70-ultra.webp', 'Huawei Pura 70 Ultra', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_yX4OfFaQHJ', 'prod_7v-DLwNDL7', 'Brown - 512GB', 'HUAW-5ZHKPG-RCU2', 580000, 10, '{"color":"Brown","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_545SZTLvmj', 'prod_7v-DLwNDL7', 'Black - 512GB', 'HUAW-5ZHKPG-NIX3', 580000, 10, '{"color":"Black","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_TJg4E-smZK', 'cat_smartphones', 'Xiaomi 15 Ultra', 'xiaomi-15-ultra-KdCqIu', 700000, 850000, 'XIAO-RTFCKM', 'Xiaomi', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_GcGvpW9f3w', 'prod_TJg4E-smZK', 'products/smartphones/xiaomi-15-ultra.webp', 'Xiaomi 15 Ultra', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_CRnECYeJa-', 'prod_TJg4E-smZK', 'Black - 512GB', 'XIAO-RTFCKM-W2TX', 700000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_oWVxdsyFF2', 'prod_TJg4E-smZK', 'Black - 1TB', 'XIAO-RTFCKM-Q2T4', 850000, 10, '{"color":"Black","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_NMByH90ri8', 'prod_TJg4E-smZK', 'White - 512GB', 'XIAO-RTFCKM-WASG', 700000, 10, '{"color":"White","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_PTqkJbVuH1', 'prod_TJg4E-smZK', 'White - 1TB', 'XIAO-RTFCKM-GFWQ', 850000, 10, '{"color":"White","storage":"1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_IigSagevq5', 'cat_smartphones', 'Pixel 7', 'pixel-7-QsVJYL', 325000, NULL, 'GOOG-SWPJQN', 'Google', 1, 0, 60);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_2OYuuI6bjq', 'prod_IigSagevq5', 'products/smartphones/pixel-7.webp', 'Pixel 7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_44BwSlPiFq', 'prod_IigSagevq5', 'Black - 128GB', 'GOOG-SWPJQN-L_WY', 325000, 10, '{"color":"Black","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_mhZ-uu2EdG', 'prod_IigSagevq5', 'Black - 256GB', 'GOOG-SWPJQN-84TN', 325000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_VmpqToZRhD', 'prod_IigSagevq5', 'White - 128GB', 'GOOG-SWPJQN-2S7I', 325000, 10, '{"color":"White","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Cnxi-GxneR', 'prod_IigSagevq5', 'White - 256GB', 'GOOG-SWPJQN-MQIH', 325000, 10, '{"color":"White","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_bo1YSHc4z1', 'prod_IigSagevq5', 'Lemongrass - 128GB', 'GOOG-SWPJQN-THZ4', 325000, 10, '{"color":"Lemongrass","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_peUlEDLKfD', 'prod_IigSagevq5', 'Lemongrass - 256GB', 'GOOG-SWPJQN-KUNX', 325000, 10, '{"color":"Lemongrass","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_29tLnsD43_', 'cat_tablettes', 'iPad 10th Gen (2022)', 'ipad-10th-gen-2022-KIz_3q', 260000, 430000, 'APPL-3PYH2P', 'Apple', 1, 0, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_G57WM7dA-b', 'prod_29tLnsD43_', 'products/tablettes/ipad-10th-gen-2022.webp', 'iPad 10th Gen (2022)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_upG5rKJ_zy', 'prod_29tLnsD43_', 'Blue - 64GB', 'APPL-3PYH2P-NJGA', 260000, 10, '{"color":"Blue","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_jr8RaDihzW', 'prod_29tLnsD43_', 'Blue - 256GB', 'APPL-3PYH2P-YDP9', 430000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ucwwX9cbU6', 'prod_29tLnsD43_', 'Pink - 64GB', 'APPL-3PYH2P-5DGH', 260000, 10, '{"color":"Pink","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_1PKcrfdFvG', 'prod_29tLnsD43_', 'Pink - 256GB', 'APPL-3PYH2P-BL67', 430000, 10, '{"color":"Pink","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Q0QsNT1gmp', 'prod_29tLnsD43_', 'Yellow - 64GB', 'APPL-3PYH2P-KU2L', 260000, 10, '{"color":"Yellow","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_zMmMxRbUEq', 'prod_29tLnsD43_', 'Yellow - 256GB', 'APPL-3PYH2P-NH8M', 430000, 10, '{"color":"Yellow","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Dh8T0JXCqE', 'prod_29tLnsD43_', 'Silver - 64GB', 'APPL-3PYH2P-8V4J', 260000, 10, '{"color":"Silver","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_PDG4PvmSBs', 'prod_29tLnsD43_', 'Silver - 256GB', 'APPL-3PYH2P-UP0T', 430000, 10, '{"color":"Silver","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_g0ghhbOFUv', 'cat_tablettes', 'iPad 11th Gen (2025)', 'ipad-11th-gen-2025-ZrKKfZ', 310000, 410000, 'APPL-6WITMF', 'Apple', 1, 0, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_hxtaPt03Zh', 'prod_g0ghhbOFUv', 'products/tablettes/ipad-11th-gen-2025.webp', 'iPad 11th Gen (2025)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_uyAhYct88L', 'prod_g0ghhbOFUv', 'Blue - 128GB', 'APPL-6WITMF-Z1JB', 310000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_VNpfSFpNsc', 'prod_g0ghhbOFUv', 'Blue - 256GB', 'APPL-6WITMF-BSNF', 410000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_LaP_arhBp2', 'prod_g0ghhbOFUv', 'Yellow - 128GB', 'APPL-6WITMF-_W0B', 310000, 10, '{"color":"Yellow","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_tGseprpZ7t', 'prod_g0ghhbOFUv', 'Yellow - 256GB', 'APPL-6WITMF-NVTV', 410000, 10, '{"color":"Yellow","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_J8lBWOKc0I', 'prod_g0ghhbOFUv', 'Silver - 128GB', 'APPL-6WITMF-QLYA', 310000, 10, '{"color":"Silver","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_T94jvGg2Rm', 'prod_g0ghhbOFUv', 'Silver - 256GB', 'APPL-6WITMF-NT95', 410000, 10, '{"color":"Silver","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_xc8nOepkoO', 'prod_g0ghhbOFUv', 'Pink - 128GB', 'APPL-6WITMF-HNHE', 310000, 10, '{"color":"Pink","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_PiljOnrrh7', 'prod_g0ghhbOFUv', 'Pink - 256GB', 'APPL-6WITMF-FMOK', 410000, 10, '{"color":"Pink","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_qYKVxKDxKx', 'cat_tablettes', 'iPad mini 6 (2022)', 'ipad-mini-6-2022--j56rK', 300000, 400000, 'APPL-KLB0TT', 'Apple', 1, 0, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Udh8l4r1DU', 'prod_qYKVxKDxKx', 'products/tablettes/ipad-mini-6-2022.webp', 'iPad mini 6 (2022)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_DICI8h68VH', 'prod_qYKVxKDxKx', 'Space Gray - 64GB', 'APPL-KLB0TT-RN0W', 300000, 10, '{"color":"Space Gray","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_jkk_7e4pF9', 'prod_qYKVxKDxKx', 'Space Gray - 256GB', 'APPL-KLB0TT-K9Z6', 400000, 10, '{"color":"Space Gray","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_2OAWcibVJm', 'prod_qYKVxKDxKx', 'Pink - 64GB', 'APPL-KLB0TT-HOOJ', 300000, 10, '{"color":"Pink","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_nDmTqlecBQ', 'prod_qYKVxKDxKx', 'Pink - 256GB', 'APPL-KLB0TT-JWWL', 400000, 10, '{"color":"Pink","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_bl3C4f0uRy', 'prod_qYKVxKDxKx', 'Purple - 64GB', 'APPL-KLB0TT-H8WS', 300000, 10, '{"color":"Purple","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_XBSoRAYNYa', 'prod_qYKVxKDxKx', 'Purple - 256GB', 'APPL-KLB0TT-PPCF', 400000, 10, '{"color":"Purple","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_qmc4xk2IFm', 'prod_qYKVxKDxKx', 'Starlight - 64GB', 'APPL-KLB0TT-BKZN', 300000, 10, '{"color":"Starlight","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ZLwkXwSCF4', 'prod_qYKVxKDxKx', 'Starlight - 256GB', 'APPL-KLB0TT-6ALQ', 400000, 10, '{"color":"Starlight","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_5ySgGG3f8C', 'cat_tablettes', 'iPad mini 7 (2024)', 'ipad-mini-7-2024-flXsQa', 310000, 600000, 'APPL-QHO0PW', 'Apple', 1, 0, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_uRM-PKSQo-', 'prod_5ySgGG3f8C', 'products/tablettes/ipad-mini-7-2024.webp', 'iPad mini 7 (2024)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_v5iPzr2dss', 'prod_5ySgGG3f8C', 'Space Gray - 128GB', 'APPL-QHO0PW-DXQY', 310000, 10, '{"color":"Space Gray","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_vT0ESi9sST', 'prod_5ySgGG3f8C', 'Space Gray - 256GB', 'APPL-QHO0PW-QLE4', 455000, 10, '{"color":"Space Gray","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_pvmQviEvwc', 'prod_5ySgGG3f8C', 'Space Gray - 512GB', 'APPL-QHO0PW-IPSE', 600000, 10, '{"color":"Space Gray","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_14XYgxQrHL', 'prod_5ySgGG3f8C', 'Blue - 128GB', 'APPL-QHO0PW-RPP0', 310000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_4Ids5zDkKh', 'prod_5ySgGG3f8C', 'Blue - 256GB', 'APPL-QHO0PW-OCOG', 455000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_8SApI30SqW', 'prod_5ySgGG3f8C', 'Blue - 512GB', 'APPL-QHO0PW-4XUM', 600000, 10, '{"color":"Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_69ltt9xUnO', 'prod_5ySgGG3f8C', 'Purple - 128GB', 'APPL-QHO0PW-PTPE', 310000, 10, '{"color":"Purple","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ZrVXN5oKMK', 'prod_5ySgGG3f8C', 'Purple - 256GB', 'APPL-QHO0PW-KJHM', 455000, 10, '{"color":"Purple","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_BROA5HvbKS', 'prod_5ySgGG3f8C', 'Purple - 512GB', 'APPL-QHO0PW-VHVH', 600000, 10, '{"color":"Purple","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_P1PpM7Z2O8', 'prod_5ySgGG3f8C', 'Starlight - 128GB', 'APPL-QHO0PW-MCJU', 310000, 10, '{"color":"Starlight","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_e-uWCvwjuk', 'prod_5ySgGG3f8C', 'Starlight - 256GB', 'APPL-QHO0PW-FLPK', 455000, 10, '{"color":"Starlight","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_I52GUd4Ks_', 'prod_5ySgGG3f8C', 'Starlight - 512GB', 'APPL-QHO0PW-TWO6', 600000, 10, '{"color":"Starlight","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_uaSe6P1kWF', 'cat_tablettes', 'iPad Air 6th (M2, 2024)', 'ipad-air-6th-m2-2024-zQ4naR', 390000, 490000, 'APPL--KYWOT', 'Apple', 1, 0, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_sVt8DcH4qY', 'prod_uaSe6P1kWF', 'products/tablettes/ipad-air-6th-m2-2024.webp', 'iPad Air 6th (M2, 2024)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_4VRHWa0GSl', 'prod_uaSe6P1kWF', 'Space Gray - 128GB', 'APPL--KYWOT-WS7A', 390000, 10, '{"color":"Space Gray","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_mlxxuJ_igc', 'prod_uaSe6P1kWF', 'Space Gray - 256GB', 'APPL--KYWOT-KGLE', 490000, 10, '{"color":"Space Gray","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Hx1TXItlFl', 'prod_uaSe6P1kWF', 'Blue - 128GB', 'APPL--KYWOT-EWUA', 390000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_v6zcpM6vC0', 'prod_uaSe6P1kWF', 'Blue - 256GB', 'APPL--KYWOT-ANI0', 490000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_XSPJzIWphw', 'prod_uaSe6P1kWF', 'Purple - 128GB', 'APPL--KYWOT-O9MK', 390000, 10, '{"color":"Purple","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_SEix30J8Ia', 'prod_uaSe6P1kWF', 'Purple - 256GB', 'APPL--KYWOT-VMNZ', 490000, 10, '{"color":"Purple","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_pka--SHWQP', 'prod_uaSe6P1kWF', 'Starlight - 128GB', 'APPL--KYWOT-NWO6', 390000, 10, '{"color":"Starlight","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_fdaZjtpoyV', 'prod_uaSe6P1kWF', 'Starlight - 256GB', 'APPL--KYWOT-1N4U', 490000, 10, '{"color":"Starlight","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_DnuMWkC2Ey', 'cat_tablettes', 'iPad Air 7th M3 - 2025', 'ipad-air-7th-m3-2025-0BQh88', 490000, 800000, 'APPL-1-ISMG', 'Apple', 1, 0, 160);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_tMVJdDUf5V', 'prod_DnuMWkC2Ey', 'products/tablettes/ipad-air-7th-m3-2025.webp', 'iPad Air 7th M3 - 2025', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_L5IXK4CcFw', 'prod_DnuMWkC2Ey', 'Space Gray - 128GB', 'APPL-1-ISMG-2ZOQ', 490000, 10, '{"color":"Space Gray","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_o-kl0yySbx', 'prod_DnuMWkC2Ey', 'Space Gray - 256GB', 'APPL-1-ISMG-HKFZ', 593333, 10, '{"color":"Space Gray","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_gmjOn6Fj3g', 'prod_DnuMWkC2Ey', 'Space Gray - 512GB', 'APPL-1-ISMG-CUZP', 696666, 10, '{"color":"Space Gray","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_qt2m9PzSaF', 'prod_DnuMWkC2Ey', 'Space Gray - 1TB', 'APPL-1-ISMG-YEGH', 800000, 10, '{"color":"Space Gray","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_AjdbIwyCD_', 'prod_DnuMWkC2Ey', 'Blue - 128GB', 'APPL-1-ISMG-9WLX', 490000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_mRRhIFdmXV', 'prod_DnuMWkC2Ey', 'Blue - 256GB', 'APPL-1-ISMG-WI8I', 593333, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_6mCEPRS-ld', 'prod_DnuMWkC2Ey', 'Blue - 512GB', 'APPL-1-ISMG-LUDJ', 696666, 10, '{"color":"Blue","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_BaxNWcV0Bg', 'prod_DnuMWkC2Ey', 'Blue - 1TB', 'APPL-1-ISMG-RUL8', 800000, 10, '{"color":"Blue","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_uxJBBP4dZ6', 'prod_DnuMWkC2Ey', 'Purple - 128GB', 'APPL-1-ISMG-X-UF', 490000, 10, '{"color":"Purple","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_hwZcVSSkJQ', 'prod_DnuMWkC2Ey', 'Purple - 256GB', 'APPL-1-ISMG-TL_U', 593333, 10, '{"color":"Purple","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_FDnVua_JQQ', 'prod_DnuMWkC2Ey', 'Purple - 512GB', 'APPL-1-ISMG-_9M6', 696666, 10, '{"color":"Purple","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_lzPhrfOnDu', 'prod_DnuMWkC2Ey', 'Purple - 1TB', 'APPL-1-ISMG-641H', 800000, 10, '{"color":"Purple","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_MD7mhsvtNc', 'prod_DnuMWkC2Ey', 'Starlight - 128GB', 'APPL-1-ISMG-7EL2', 490000, 10, '{"color":"Starlight","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_iZL4PkP9VX', 'prod_DnuMWkC2Ey', 'Starlight - 256GB', 'APPL-1-ISMG-NCN2', 593333, 10, '{"color":"Starlight","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_rVq8LSMfNz', 'prod_DnuMWkC2Ey', 'Starlight - 512GB', 'APPL-1-ISMG-_ERS', 696666, 10, '{"color":"Starlight","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_oNl_hSIpQr', 'prod_DnuMWkC2Ey', 'Starlight - 1TB', 'APPL-1-ISMG-QFNK', 800000, 10, '{"color":"Starlight","storage":"1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_ws2lmB9Yp-', 'cat_tablettes', 'iPad Pro M4 - 2024', 'ipad-pro-m4-2024-6L2LFM', 100000, 1070000, 'APPL-_DHJLJ', 'Apple', 1, 0, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Mm8GIOAPRc', 'prod_ws2lmB9Yp-', 'products/tablettes/ipad-pro-m4-2024.webp', 'iPad Pro M4 - 2024', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_xDMGHvYg8Y', 'prod_ws2lmB9Yp-', 'Space Gray - 256GB', 'APPL-_DHJLJ-6GVS', 100000, 10, '{"color":"Space Gray","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_-ChAiVysQY', 'prod_ws2lmB9Yp-', 'Space Gray - 512GB', 'APPL-_DHJLJ-YVWM', 423333, 10, '{"color":"Space Gray","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_SsdrDrjOFH', 'prod_ws2lmB9Yp-', 'Space Gray - 1TB', 'APPL-_DHJLJ-BJEW', 746666, 10, '{"color":"Space Gray","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_XIeXCxxzQF', 'prod_ws2lmB9Yp-', 'Space Gray - 2TB', 'APPL-_DHJLJ-ZTPU', 1070000, 10, '{"color":"Space Gray","storage":"2TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_e6ZoCwYaln', 'prod_ws2lmB9Yp-', 'Silver - 256GB', 'APPL-_DHJLJ-H-WT', 100000, 10, '{"color":"Silver","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__rBl7IZZ6v', 'prod_ws2lmB9Yp-', 'Silver - 512GB', 'APPL-_DHJLJ-0STS', 423333, 10, '{"color":"Silver","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Zj5Qpdbkeo', 'prod_ws2lmB9Yp-', 'Silver - 1TB', 'APPL-_DHJLJ-GGFU', 746666, 10, '{"color":"Silver","storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_06bJqphTRY', 'prod_ws2lmB9Yp-', 'Silver - 2TB', 'APPL-_DHJLJ-FKZQ', 1070000, 10, '{"color":"Silver","storage":"2TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_UZi9nDR3CR', 'cat_tablettes', 'Samsung Tab A9+', 'samsung-tab-a9-22sYoS', 145000, 220000, 'SAMS-L6DNEE', 'Samsung', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_CYgwk7H7id', 'prod_UZi9nDR3CR', 'products/tablettes/samsung-tab-a9.webp', 'Samsung Tab A9+', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_RECfziO8KI', 'prod_UZi9nDR3CR', 'Grey - 64GB', 'SAMS-L6DNEE-9HOS', 145000, 10, '{"color":"Grey","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_tTTE9vZN50', 'prod_UZi9nDR3CR', 'Grey - 128GB', 'SAMS-L6DNEE-EAFN', 220000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_h5o42exHWp', 'prod_UZi9nDR3CR', 'Blue - 64GB', 'SAMS-L6DNEE-2EV_', 145000, 10, '{"color":"Blue","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Pm51SzXp0W', 'prod_UZi9nDR3CR', 'Blue - 128GB', 'SAMS-L6DNEE-ZQKZ', 220000, 10, '{"color":"Blue","storage":"128GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_q9LH3oJE6H', 'cat_tablettes', 'Samsung Tab S9', 'samsung-tab-s9-PKdAQd', 400000, 550000, 'SAMS-AWMQ9S', 'Samsung', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_PtajQFHLbh', 'prod_q9LH3oJE6H', 'products/tablettes/samsung-tab-s9.webp', 'Samsung Tab S9', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_xt0tdnwCpX', 'prod_q9LH3oJE6H', 'Grey - 128GB', 'SAMS-AWMQ9S-X_QI', 400000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_EoFqVuv9jH', 'prod_q9LH3oJE6H', 'Grey - 256GB', 'SAMS-AWMQ9S-PKLI', 550000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_3sN9JWRGq_', 'prod_q9LH3oJE6H', 'Beige - 128GB', 'SAMS-AWMQ9S-31M7', 400000, 10, '{"color":"Beige","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_6UGg1pLX18', 'prod_q9LH3oJE6H', 'Beige - 256GB', 'SAMS-AWMQ9S-XLET', 550000, 10, '{"color":"Beige","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_kescnrkSGM', 'cat_tablettes', 'Samsung Tab S9 FE', 'samsung-tab-s9-fe-34fEMp', 270000, NULL, 'SAMS-9QMOF4', 'Samsung', 1, 0, 60);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_f8vBG71u6u', 'prod_kescnrkSGM', 'products/tablettes/samsung-tab-s9-fe.webp', 'Samsung Tab S9 FE', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Ch6bMYLwjK', 'prod_kescnrkSGM', 'Grey - 128GB', 'SAMS-9QMOF4-PDXF', 270000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_JhRRAMDFWX', 'prod_kescnrkSGM', 'Grey - 256GB', 'SAMS-9QMOF4-BNXY', 270000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_J4NXj3yvTD', 'prod_kescnrkSGM', 'Mint - 128GB', 'SAMS-9QMOF4-CLFK', 270000, 10, '{"color":"Mint","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Xm3sxGT9a6', 'prod_kescnrkSGM', 'Mint - 256GB', 'SAMS-9QMOF4-F0JK', 270000, 10, '{"color":"Mint","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ZSMikq9L06', 'prod_kescnrkSGM', 'Pink - 128GB', 'SAMS-9QMOF4-IZRJ', 270000, 10, '{"color":"Pink","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_crxzC_gUdN', 'prod_kescnrkSGM', 'Pink - 256GB', 'SAMS-9QMOF4-IIKR', 270000, 10, '{"color":"Pink","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_TmqOJ9HRLS', 'cat_tablettes', 'Samsung Tab S9 FE+', 'samsung-tab-s9-fe-nWF4ym', 340000, NULL, 'SAMS-I3OL0P', 'Samsung', 1, 0, 60);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_DEohZ0G-94', 'prod_TmqOJ9HRLS', 'products/tablettes/samsung-tab-s9-fe.webp', 'Samsung Tab S9 FE+', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_V7zI05pT59', 'prod_TmqOJ9HRLS', 'Grey - 128GB', 'SAMS-I3OL0P-5O6I', 340000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_imoEeSTBEP', 'prod_TmqOJ9HRLS', 'Grey - 256GB', 'SAMS-I3OL0P-BGVS', 340000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_gVTQByxW-A', 'prod_TmqOJ9HRLS', 'Mint - 128GB', 'SAMS-I3OL0P-LC7D', 340000, 10, '{"color":"Mint","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_HmXbAxg_T7', 'prod_TmqOJ9HRLS', 'Mint - 256GB', 'SAMS-I3OL0P-SKJI', 340000, 10, '{"color":"Mint","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_YchSeU3dBQ', 'prod_TmqOJ9HRLS', 'Pink - 128GB', 'SAMS-I3OL0P-_9H_', 340000, 10, '{"color":"Pink","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_m3CR5wcKXW', 'prod_TmqOJ9HRLS', 'Pink - 256GB', 'SAMS-I3OL0P-PYIX', 340000, 10, '{"color":"Pink","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_LRIQI8kAGM', 'cat_tablettes', 'Samsung Tab S9+', 'samsung-tab-s9-M-BrXg', 680000, 780000, 'SAMS-GLLBII', 'Samsung', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_HbZlM3O8aP', 'prod_LRIQI8kAGM', 'products/tablettes/samsung-tab-s9.webp', 'Samsung Tab S9+', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_XMHXoA4jpj', 'prod_LRIQI8kAGM', 'Grey - 256GB', 'SAMS-GLLBII-0SAO', 680000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ygV6gMRgqG', 'prod_LRIQI8kAGM', 'Grey - 512GB', 'SAMS-GLLBII-2E5L', 780000, 10, '{"color":"Grey","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_QZYa1ec7pa', 'prod_LRIQI8kAGM', 'Beige - 256GB', 'SAMS-GLLBII-YAUG', 680000, 10, '{"color":"Beige","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_zUsYMlLj4L', 'prod_LRIQI8kAGM', 'Beige - 512GB', 'SAMS-GLLBII-3WJ6', 780000, 10, '{"color":"Beige","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_8JhKlCJZ1s', 'cat_tablettes', 'Samsung Tab S9 Ultra', 'samsung-tab-s9-ultra-HiTZan', 980000, NULL, 'SAMS-M5Z-QV', 'Samsung', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_eBgcs_uk4t', 'prod_8JhKlCJZ1s', 'products/tablettes/samsung-tab-s9-ultra.webp', 'Samsung Tab S9 Ultra', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_WrLvs4K0Yn', 'prod_8JhKlCJZ1s', 'Graphite - 256GB', 'SAMS-M5Z-QV-BKPY', 980000, 10, '{"color":"Graphite","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_QYElgKsr7Q', 'prod_8JhKlCJZ1s', 'Graphite - 512GB', 'SAMS-M5Z-QV-EDD1', 980000, 10, '{"color":"Graphite","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ZLKU-Labs-', 'prod_8JhKlCJZ1s', 'Beige - 256GB', 'SAMS-M5Z-QV-3CCU', 980000, 10, '{"color":"Beige","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ppwuCLWepQ', 'prod_8JhKlCJZ1s', 'Beige - 512GB', 'SAMS-M5Z-QV-GHGK', 980000, 10, '{"color":"Beige","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod__wy2kSJKAJ', 'cat_tablettes', 'Samsung Tab S10 Ultra', 'samsung-tab-s10-ultra-JNjxQA', 700000, 780000, 'SAMS-EZ4Y31', 'Samsung', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_oRdrTmRnzu', 'prod__wy2kSJKAJ', 'products/tablettes/samsung-tab-s10-ultra.webp', 'Samsung Tab S10 Ultra', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_zJ2WFIrlT_', 'prod__wy2kSJKAJ', 'Grey - 256GB', 'SAMS-EZ4Y31-G5BC', 700000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Q4FEPLjPpg', 'prod__wy2kSJKAJ', 'Grey - 512GB', 'SAMS-EZ4Y31-MP4B', 780000, 10, '{"color":"Grey","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_XU87QNcEGO', 'prod__wy2kSJKAJ', 'Silver - 256GB', 'SAMS-EZ4Y31-UF-A', 700000, 10, '{"color":"Silver","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ObEY-xiJFF', 'prod__wy2kSJKAJ', 'Silver - 512GB', 'SAMS-EZ4Y31-XD4U', 780000, 10, '{"color":"Silver","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_wJdvaASI12', 'cat_tablettes', 'Redmi Pad 2 4G', 'redmi-pad-2-4g-8Q4V47', 180000, NULL, 'XIAO-ZIVTFT', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_xENujKkNJ4', 'prod_wJdvaASI12', 'products/tablettes/redmi-pad-2-4g.webp', 'Redmi Pad 2 4G', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_yp0v8jpKIb', 'prod_wJdvaASI12', 'Grey - 128GB', 'XIAO-ZIVTFT-MXGD', 180000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_UsYrOW_FJ9', 'prod_wJdvaASI12', 'Mint Green - 128GB', 'XIAO-ZIVTFT-A1SV', 180000, 10, '{"color":"Mint Green","storage":"128GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_AnQSig5Qb9', 'cat_tablettes', 'Redmi Pad 6S Pro', 'redmi-pad-6s-pro-ABg0FB', 440000, NULL, 'XIAO-QX9NMH', 'Xiaomi', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Z-WH1bOw-J', 'prod_AnQSig5Qb9', 'products/tablettes/redmi-pad-6s-pro.webp', 'Redmi Pad 6S Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_NkVX4gbGkP', 'prod_AnQSig5Qb9', 'Grey - 256GB', 'XIAO-QX9NMH-9H-G', 440000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_cWnz4QCLxV', 'prod_AnQSig5Qb9', 'Grey - 512GB', 'XIAO-QX9NMH-OVXB', 440000, 10, '{"color":"Grey","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_LUt7v39fW-', 'prod_AnQSig5Qb9', 'Black - 256GB', 'XIAO-QX9NMH-GPKH', 440000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_zfpZqYcvH8', 'prod_AnQSig5Qb9', 'Black - 512GB', 'XIAO-QX9NMH-BJDK', 440000, 10, '{"color":"Black","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Oxl0-g4YVr', 'cat_tablettes', 'Redmi Pad 2', 'redmi-pad-2-77Vo0N', 170000, NULL, 'XIAO-MJKYAB', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_G-Wr3Kgi5o', 'prod_Oxl0-g4YVr', 'products/tablettes/redmi-pad-2.webp', 'Redmi Pad 2', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_-hSmjtoYp5', 'prod_Oxl0-g4YVr', 'Grey - 128GB', 'XIAO-MJKYAB-_PTS', 170000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_QXdpmFm2vw', 'prod_Oxl0-g4YVr', 'Graphite Grey - 128GB', 'XIAO-MJKYAB-XMIE', 170000, 10, '{"color":"Graphite Grey","storage":"128GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_cX9c5plu9W', 'cat_tablettes', 'Xiaomi Pad 7', 'xiaomi-pad-7-mFGCHx', 255000, NULL, 'XIAO-AVFT6Z', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_-Ly4c2rqYd', 'prod_cX9c5plu9W', 'products/tablettes/xiaomi-pad-7.webp', 'Xiaomi Pad 7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ZzyxyrxrxP', 'prod_cX9c5plu9W', 'Black - 256GB', 'XIAO-AVFT6Z-8DXB', 255000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_GaZ4bnqc8b', 'prod_cX9c5plu9W', 'Green - 256GB', 'XIAO-AVFT6Z-OH6A', 255000, 10, '{"color":"Green","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_hUxHKJIRNb', 'cat_tablettes', 'Xiaomi Pad 7 Pro', 'xiaomi-pad-7-pro-e12Jbw', 335000, NULL, 'XIAO-VTDYGI', 'Xiaomi', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ojslC-vc30', 'prod_hUxHKJIRNb', 'products/tablettes/xiaomi-pad-7-pro.webp', 'Xiaomi Pad 7 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_MJadtaOGep', 'prod_hUxHKJIRNb', 'Black - 256GB', 'XIAO-VTDYGI-KCWW', 335000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_7qzygCVTsq', 'prod_hUxHKJIRNb', 'Black - 512GB', 'XIAO-VTDYGI-MGUE', 335000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_p9bLLY6iZI', 'prod_hUxHKJIRNb', 'Green - 256GB', 'XIAO-VTDYGI-ZBNK', 335000, 10, '{"color":"Green","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_oVaXX_0jCM', 'prod_hUxHKJIRNb', 'Green - 512GB', 'XIAO-VTDYGI-9GDL', 335000, 10, '{"color":"Green","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_4kFWJJJ9jM', 'cat_tablettes', 'Redmi Pad SE 8.7', 'redmi-pad-se-8-7-DqqtVZ', 125000, NULL, 'XIAO-XPIDBT', 'Xiaomi', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_as7HSG-2yH', 'prod_4kFWJJJ9jM', 'products/tablettes/redmi-pad-se-8-7.webp', 'Redmi Pad SE 8.7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_3W8jpPibRe', 'prod_4kFWJJJ9jM', 'Grey - 64GB', 'XIAO-XPIDBT-R9WF', 125000, 10, '{"color":"Grey","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_kySzhM4u-2', 'prod_4kFWJJJ9jM', 'Grey - 128GB', 'XIAO-XPIDBT-COUQ', 125000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_GuPuuEJV29', 'prod_4kFWJJJ9jM', 'Blue - 64GB', 'XIAO-XPIDBT-I8PX', 125000, 10, '{"color":"Blue","storage":"64GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_qsCVHvS6Ns', 'prod_4kFWJJJ9jM', 'Blue - 128GB', 'XIAO-XPIDBT-Z7UN', 125000, 10, '{"color":"Blue","storage":"128GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_brlLWC_t2a', 'cat_tablettes', 'HONOR PAD 10', 'honor-pad-10-w4ia6L', 280000, NULL, 'HONO-MCSTFU', 'HONOR', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_klEbyw0rGs', 'prod_brlLWC_t2a', 'products/tablettes/honor-pad-10.webp', 'HONOR PAD 10', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_YmSLu0TEcf', 'prod_brlLWC_t2a', 'Grey - 128GB', 'HONO-MCSTFU-XGTJ', 280000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_j8YZKsOOE6', 'prod_brlLWC_t2a', 'Grey - 256GB', 'HONO-MCSTFU-RFCQ', 280000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_G9kIJjwxq9', 'prod_brlLWC_t2a', 'Blue - 128GB', 'HONO-MCSTFU-CE0B', 280000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_h888Gv42dL', 'prod_brlLWC_t2a', 'Blue - 256GB', 'HONO-MCSTFU-QDLT', 280000, 10, '{"color":"Blue","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_adJUl6RFxT', 'cat_tablettes', 'OnePlus Pad 3', 'oneplus-pad-3-xHWB2w', 580000, 600000, 'ONEP-OBHWZZ', 'OnePlus', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_CSEOsxSoKv', 'prod_adJUl6RFxT', 'products/tablettes/oneplus-pad-3.webp', 'OnePlus Pad 3', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_mJGwJRBk4L', 'prod_adJUl6RFxT', 'Black - 256GB', 'ONEP-OBHWZZ-EFGE', 580000, 10, '{"color":"Black","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_yxQaXRxkmZ', 'prod_adJUl6RFxT', 'Black - 512GB', 'ONEP-OBHWZZ-MLCQ', 600000, 10, '{"color":"Black","storage":"512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_NCpS9v614g', 'prod_adJUl6RFxT', 'Grey - 256GB', 'ONEP-OBHWZZ-JKQV', 580000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_fj1zf80mfW', 'prod_adJUl6RFxT', 'Grey - 512GB', 'ONEP-OBHWZZ-NGGJ', 600000, 10, '{"color":"Grey","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_fPTkYcWKTN', 'cat_tablettes', 'REDMAGIC Nova Gaming', 'redmagic-nova-gaming-a3F8JA', 500000, 600000, 'REDM-2PS0YX', 'REDMAGIC', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_iIRg2aWzPH', 'prod_fPTkYcWKTN', 'products/tablettes/redmagic-nova-gaming.webp', 'REDMAGIC Nova Gaming', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_53e5jO_w2w', 'prod_fPTkYcWKTN', 'Black Infinity - 256GB', 'REDM-2PS0YX-XMEF', 500000, 10, '{"color":"Black Infinity","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_etAdLxjeAd', 'prod_fPTkYcWKTN', 'Black Infinity - 512GB', 'REDM-2PS0YX-ADGY', 600000, 10, '{"color":"Black Infinity","storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_t_PUu1r5JC', 'cat_tablettes', 'Redmi Pad Pro 5G', 'redmi-pad-pro-5g-74MK7k', 220000, NULL, 'XIAO-6JFWWN', 'Xiaomi', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_1_dCYk7_Op', 'prod_t_PUu1r5JC', 'products/tablettes/redmi-pad-pro-5g.webp', 'Redmi Pad Pro 5G', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_v4zgAYjjR3', 'prod_t_PUu1r5JC', 'Grey - 128GB', 'XIAO-6JFWWN-SICW', 220000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_EEXNQ3mQDa', 'prod_t_PUu1r5JC', 'Grey - 256GB', 'XIAO-6JFWWN-ZE3O', 220000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_7lBFqqWpTs', 'prod_t_PUu1r5JC', 'Blue - 128GB', 'XIAO-6JFWWN-PULD', 220000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Z1f3VC9bUY', 'prod_t_PUu1r5JC', 'Blue - 256GB', 'XIAO-6JFWWN-IVIL', 220000, 10, '{"color":"Blue","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_7EAyGixznS', 'cat_tablettes', 'Redmi Pad Pro WIFI', 'redmi-pad-pro-wifi-i81Cod', 195000, NULL, 'XIAO-TXBPV9', 'Xiaomi', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_rSVEnE1aBz', 'prod_7EAyGixznS', 'products/tablettes/redmi-pad-pro-wifi.webp', 'Redmi Pad Pro WIFI', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_9EayzvscwV', 'prod_7EAyGixznS', 'Grey - 128GB', 'XIAO-TXBPV9-YPXX', 195000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_8eFAWr9fSZ', 'prod_7EAyGixznS', 'Grey - 256GB', 'XIAO-TXBPV9-L4LR', 195000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_l6uyaEpovo', 'prod_7EAyGixznS', 'Blue - 128GB', 'XIAO-TXBPV9--NH8', 195000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_m1wh2cdtb3', 'prod_7EAyGixznS', 'Blue - 256GB', 'XIAO-TXBPV9-VCRX', 195000, 10, '{"color":"Blue","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Viw15UUUeo', 'cat_tablettes', 'Redmi Pad SE', 'redmi-pad-se-yAh0wi', 195000, NULL, 'XIAO-GFMHBW', 'Xiaomi', 1, 0, 60);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ij3JHZTct2', 'prod_Viw15UUUeo', 'products/tablettes/redmi-pad-se.webp', 'Redmi Pad SE', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_eOgTtxlh6v', 'prod_Viw15UUUeo', 'Grey - 128GB', 'XIAO-GFMHBW-CU4W', 195000, 10, '{"color":"Grey","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_s5f_MGxf4B', 'prod_Viw15UUUeo', 'Grey - 256GB', 'XIAO-GFMHBW-HLUW', 195000, 10, '{"color":"Grey","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ZP69PGcC7G', 'prod_Viw15UUUeo', 'Blue - 128GB', 'XIAO-GFMHBW-POY5', 195000, 10, '{"color":"Blue","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_KLK9FB5RKH', 'prod_Viw15UUUeo', 'Blue - 256GB', 'XIAO-GFMHBW-ULSU', 195000, 10, '{"color":"Blue","storage":"256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__CZ9945lU0', 'prod_Viw15UUUeo', 'Purple - 128GB', 'XIAO-GFMHBW-KFON', 195000, 10, '{"color":"Purple","storage":"128GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_QYsWSD32Lq', 'prod_Viw15UUUeo', 'Purple - 256GB', 'XIAO-GFMHBW-DUKN', 195000, 10, '{"color":"Purple","storage":"256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_77SfvCjhg6', 'cat_montres', 'Apple Watch Series 10', 'apple-watch-series-10-sPu6AU', 250000, 680000, 'APPL-6IUECS', 'Apple', 1, 0, 100);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_RKQr2taD4q', 'prod_77SfvCjhg6', 'products/montres-connectees/apple-watch-series-10.webp', 'Apple Watch Series 10', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_6QpxyKWSzS', 'prod_77SfvCjhg6', 'Black - 42mm', 'APPL-6IUECS-00NE', 250000, 10, '{"color":"Black","storage":"42mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_sE73lau5YT', 'prod_77SfvCjhg6', 'Black - 46mm', 'APPL-6IUECS-H-HH', 280000, 10, '{"color":"Black","storage":"46mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_0RjpeRPbTR', 'prod_77SfvCjhg6', 'Silver - 42mm', 'APPL-6IUECS-UQM_', 250000, 10, '{"color":"Silver","storage":"42mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_bGoDoIlj0I', 'prod_77SfvCjhg6', 'Silver - 46mm', 'APPL-6IUECS-A-HB', 280000, 10, '{"color":"Silver","storage":"46mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_pGPYboCWLC', 'prod_77SfvCjhg6', 'Gold - 42mm', 'APPL-6IUECS-6VVA', 250000, 10, '{"color":"Gold","storage":"42mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_K5lae5W9du', 'prod_77SfvCjhg6', 'Gold - 46mm', 'APPL-6IUECS-IZZY', 280000, 10, '{"color":"Gold","storage":"46mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_zQiYwSdAGG', 'prod_77SfvCjhg6', 'Rose - 42mm', 'APPL-6IUECS-T8RV', 250000, 10, '{"color":"Rose","storage":"42mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_TYpjXqauTF', 'prod_77SfvCjhg6', 'Rose - 46mm', 'APPL-6IUECS-YGAI', 280000, 10, '{"color":"Rose","storage":"46mm"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_jLYnkzhv_p', 'cat_montres', 'Apple Watch Ultra 2', 'apple-watch-ultra-2-YfeRv3', 500000, 680000, 'APPL-FGFGDM', 'Apple', 1, 0, 60);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_5Lb02JEOww', 'prod_jLYnkzhv_p', 'products/montres-connectees/apple-watch-ultra-2.webp', 'Apple Watch Ultra 2', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_aYmx1evf7d', 'prod_jLYnkzhv_p', 'Black - 49mm', 'APPL-FGFGDM-GULQ', 530000, 10, '{"color":"Black","storage":"49mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_2juPJ7OKyz', 'prod_jLYnkzhv_p', 'Orange - 49mm', 'APPL-FGFGDM-NJBN', 530000, 10, '{"color":"Orange","storage":"49mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_2ZnJR45LJ5', 'prod_jLYnkzhv_p', 'Natural - 49mm', 'APPL-FGFGDM-AWE7', 500000, 10, '{"color":"Natural","storage":"49mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_BXpwXUU8tv', 'prod_jLYnkzhv_p', 'Silver - 49mm', 'APPL-FGFGDM-S_0A', 680000, 10, '{"color":"Silver","storage":"49mm"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_qpB1kGjCdl', 'cat_montres', 'Huawei Watch Ultimate', 'huawei-watch-ultimate-kOxAI_', 255000, NULL, 'HUAW-B6IUMK', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_guI-7Oeeci', 'prod_qpB1kGjCdl', 'products/montres-connectees/huawei-watch-ultimate.webp', 'Huawei Watch Ultimate', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_GvjNYv8ktf', 'prod_qpB1kGjCdl', 'Black - 48mm', 'HUAW-B6IUMK-FONC', 255000, 10, '{"color":"Black","storage":"48mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_O-1S1LuX2l', 'prod_qpB1kGjCdl', 'Brown - 48mm', 'HUAW-B6IUMK-JFE9', 255000, 10, '{"color":"Brown","storage":"48mm"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Y8c4seKrGw', 'cat_montres', 'Huawei Watch 5', 'huawei-watch-5--U5dVc', 300000, 350000, 'HUAW-1PFQJX', 'Huawei', 1, 0, 50);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_PuPGyXXC9i', 'prod_Y8c4seKrGw', 'products/montres-connectees/huawei-watch-5.webp', 'Huawei Watch 5', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_PfeJvjyRYr', 'prod_Y8c4seKrGw', 'Silver - 46mm', 'HUAW-1PFQJX-IRWG', 350000, 10, '{"color":"Silver","storage":"46mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_FRCYkZFZTJ', 'prod_Y8c4seKrGw', 'Brown - 46mm', 'HUAW-1PFQJX-JMLV', 330000, 10, '{"color":"Brown","storage":"46mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ibWauY1Jyp', 'prod_Y8c4seKrGw', 'Titanium - 46mm', 'HUAW-1PFQJX-U-2M', 350000, 10, '{"color":"Titanium","storage":"46mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_SDtraoCfdZ', 'prod_Y8c4seKrGw', 'Violet - 46mm', 'HUAW-1PFQJX-CCIV', 300000, 10, '{"color":"Violet","storage":"46mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_2ObnZprPsT', 'prod_Y8c4seKrGw', 'Black - 46mm', 'HUAW-1PFQJX-91KZ', 300000, 10, '{"color":"Black","storage":"46mm"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_FrGu122B6X', 'cat_montres', 'Huawei Watch 4 Pro Space Edition', 'huawei-watch-4-pro-space-edition-q29iFn', 225000, NULL, 'HUAW-FZU-EM', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_jgxWxaLLLQ', 'prod_FrGu122B6X', 'products/montres-connectees/huawei-watch-4-pro-space-edition.webp', 'Huawei Watch 4 Pro Space Edition', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_RDRX5iI2tQ', 'prod_FrGu122B6X', 'Black - 48mm', 'HUAW-FZU-EM-ZVYW', 225000, 10, '{"color":"Black","storage":"48mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_tRHTSo-_aA', 'prod_FrGu122B6X', 'Silver - 48mm', 'HUAW-FZU-EM-6RLX', 225000, 10, '{"color":"Silver","storage":"48mm"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_wOV1d0iQtc', 'cat_montres', 'Huawei Watch GT 5 Pro 46mm Multicolore', 'huawei-watch-gt-5-pro-46mm-multicolore-G6k91t', 195000, NULL, 'HUAW-PNDZ7O', 'Huawei', 1, 0, 30);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_otyYEhNERo', 'prod_wOV1d0iQtc', 'products/montres-connectees/huawei-watch-gt-5-pro-46mm-multicolore.webp', 'Huawei Watch GT 5 Pro 46mm Multicolore', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_9uLII0-dSg', 'prod_wOV1d0iQtc', 'Black - 46mm', 'HUAW-PNDZ7O-OY5W', 195000, 10, '{"color":"Black","storage":"46mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_u6oZEdRUdp', 'prod_wOV1d0iQtc', 'Brown - 46mm', 'HUAW-PNDZ7O-J-_P', 195000, 10, '{"color":"Brown","storage":"46mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_x4Pmy0fNMx', 'prod_wOV1d0iQtc', 'Green - 46mm', 'HUAW-PNDZ7O-60MM', 195000, 10, '{"color":"Green","storage":"46mm"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_O_BusijASN', 'cat_montres', 'Huawei Watch Fit 4 Pro', 'huawei-watch-fit-4-pro-WoBrni', 150000, NULL, 'HUAW-OGCVKO', 'Huawei', 1, 0, 30);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_BelbahR3CX', 'prod_O_BusijASN', 'products/montres-connectees/huawei-watch-fit-4-pro.webp', 'Huawei Watch Fit 4 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_hia_YMKcfT', 'prod_O_BusijASN', 'Black - Standard', 'HUAW-OGCVKO-WZFD', 150000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_rJlS6gWAGz', 'prod_O_BusijASN', 'Pink - Standard', 'HUAW-OGCVKO-BUFP', 150000, 10, '{"color":"Pink","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_b3faGzEnZF', 'prod_O_BusijASN', 'White - Standard', 'HUAW-OGCVKO-_RUF', 150000, 10, '{"color":"White","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_a_3PFvcdPW', 'cat_montres', 'Huawei Watch D2', 'huawei-watch-d2-JP7Ini', 250000, NULL, 'HUAW-5OLYFO', 'Huawei', 1, 0, 30);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_URN1-MCm9O', 'prod_a_3PFvcdPW', 'products/montres-connectees/huawei-watch-d2.webp', 'Huawei Watch D2', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_WJWlZeWGdE', 'prod_a_3PFvcdPW', 'Black - Standard', 'HUAW-5OLYFO-LGKV', 250000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_eFjkTsVRbW', 'prod_a_3PFvcdPW', 'Brown - Standard', 'HUAW-5OLYFO-AIAC', 250000, 10, '{"color":"Brown","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_WWDaJwS5gt', 'cat_montres', 'Samsung Watch 8', 'samsung-watch-8-3oQndr', 195000, 375000, 'SAMS-NLM9ZH', 'Samsung', 1, 0, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_f2b4CPQbBy', 'prod_WWDaJwS5gt', 'products/montres-connectees/samsung-watch-8.webp', 'Samsung Watch 8', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_dW3jFkk7Vc', 'prod_WWDaJwS5gt', 'Black - 40mm', 'SAMS-NLM9ZH-OFNS', 195000, 10, '{"color":"Black","storage":"40mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_q6F2CT9Jvg', 'prod_WWDaJwS5gt', 'Black - 44mm', 'SAMS-NLM9ZH-ZVV4', 195000, 10, '{"color":"Black","storage":"44mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_W7FWiR_hqt', 'prod_WWDaJwS5gt', 'Silver - 40mm', 'SAMS-NLM9ZH-B8RZ', 195000, 10, '{"color":"Silver","storage":"40mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__I_T1GYF9M', 'prod_WWDaJwS5gt', 'Silver - 44mm', 'SAMS-NLM9ZH-FIZI', 195000, 10, '{"color":"Silver","storage":"44mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_0fVFIM0pcO', 'prod_WWDaJwS5gt', 'Pink - 40mm', 'SAMS-NLM9ZH-AK0C', 195000, 10, '{"color":"Pink","storage":"40mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Wkxwzfx8GH', 'prod_WWDaJwS5gt', 'Pink - 44mm', 'SAMS-NLM9ZH-HU2H', 195000, 10, '{"color":"Pink","storage":"44mm"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_dMDpVmoRdW', 'cat_montres', 'Samsung Fit 3 R390', 'samsung-fit-3-r390-PzPfCU', 105000, NULL, 'SAMS-LWAGQG', 'Samsung', 1, 0, 30);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_2jsZ9RtmGY', 'prod_dMDpVmoRdW', 'products/montres-connectees/samsung-fit-3-r390.webp', 'Samsung Fit 3 R390', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_te6Op6ej52', 'prod_dMDpVmoRdW', 'Black - Standard', 'SAMS-LWAGQG-_UXL', 105000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_n69TO6e9lm', 'prod_dMDpVmoRdW', 'Silver - Standard', 'SAMS-LWAGQG-ACC3', 105000, 10, '{"color":"Silver","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_N9mDPnmoRS', 'prod_dMDpVmoRdW', 'Pink - Standard', 'SAMS-LWAGQG-VLIE', 105000, 10, '{"color":"Pink","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_PS_vASswgx', 'cat_montres', 'Apple Watch SE', 'apple-watch-se-2fRlx0', 170000, 200000, 'APPL-I0EVKF', 'Apple', 1, 0, 60);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_XdpYihdXCM', 'prod_PS_vASswgx', 'products/montres-connectees/apple-watch-se.webp', 'Apple Watch SE', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_tPqXQAJ0A4', 'prod_PS_vASswgx', 'Silver - 40mm', 'APPL-I0EVKF-WMIF', 170000, 10, '{"color":"Silver","storage":"40mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_EihgseKolm', 'prod_PS_vASswgx', 'Silver - 44mm', 'APPL-I0EVKF-17WQ', 200000, 10, '{"color":"Silver","storage":"44mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_oWVzcbxTyV', 'prod_PS_vASswgx', 'Starlight - 40mm', 'APPL-I0EVKF-SXFH', 170000, 10, '{"color":"Starlight","storage":"40mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_4dunBEhiP8', 'prod_PS_vASswgx', 'Starlight - 44mm', 'APPL-I0EVKF-UB98', 200000, 10, '{"color":"Starlight","storage":"44mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_KXyNbcJbBj', 'prod_PS_vASswgx', 'Black - 40mm', 'APPL-I0EVKF-OIVL', 170000, 10, '{"color":"Black","storage":"40mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_oMW7P5uFgR', 'prod_PS_vASswgx', 'Black - 44mm', 'APPL-I0EVKF-PVUI', 200000, 10, '{"color":"Black","storage":"44mm"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_GXxsyP0ccC', 'cat_montres', 'Apple Watch Series 9', 'apple-watch-series-9-mL0zX7', 250000, NULL, 'APPL-OFYWHF', 'Apple', 1, 0, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_17eF93kXPH', 'prod_GXxsyP0ccC', 'products/montres-connectees/apple-watch-series-9.webp', 'Apple Watch Series 9', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_7P1BSsREEm', 'prod_GXxsyP0ccC', 'Silver - 41mm', 'APPL-OFYWHF-LVVI', 250000, 10, '{"color":"Silver","storage":"41mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_U2E5DL45Na', 'prod_GXxsyP0ccC', 'Silver - 45mm', 'APPL-OFYWHF-RVW9', 250000, 10, '{"color":"Silver","storage":"45mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_9fxSapjQmh', 'prod_GXxsyP0ccC', 'Black - 41mm', 'APPL-OFYWHF-KOTU', 250000, 10, '{"color":"Black","storage":"41mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_LEhsNKLQN9', 'prod_GXxsyP0ccC', 'Black - 45mm', 'APPL-OFYWHF-YGV_', 250000, 10, '{"color":"Black","storage":"45mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ePsgPwKrap', 'prod_GXxsyP0ccC', 'Pink - 41mm', 'APPL-OFYWHF-JJYN', 250000, 10, '{"color":"Pink","storage":"41mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_i1GduAXk-j', 'prod_GXxsyP0ccC', 'Pink - 45mm', 'APPL-OFYWHF-P0KV', 250000, 10, '{"color":"Pink","storage":"45mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_pmwQx7d69T', 'prod_GXxsyP0ccC', 'Starlight - 41mm', 'APPL-OFYWHF-N6XO', 250000, 10, '{"color":"Starlight","storage":"41mm"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_cdy-NJ7pI-', 'prod_GXxsyP0ccC', 'Starlight - 45mm', 'APPL-OFYWHF-9WT-', 250000, 10, '{"color":"Starlight","storage":"45mm"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_uTVvINIw85', 'cat_montres', 'Redmi Watch 3 Active', 'redmi-watch-3-active-1rjspX', 28000, NULL, 'XIAO-U2FDXT', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_esO3EGTxdF', 'prod_uTVvINIw85', 'products/montres-connectees/redmi-watch-3-active.webp', 'Redmi Watch 3 Active', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_FE69o0hqIf', 'prod_uTVvINIw85', 'Black - Standard', 'XIAO-U2FDXT-NUJT', 28000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_XGWtvcm5fu', 'prod_uTVvINIw85', 'Grey - Standard', 'XIAO-U2FDXT-BGQK', 28000, 10, '{"color":"Grey","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod__LEquAWGTX', 'cat_montres', 'Redmi Watch 5', 'redmi-watch-5-LpKFte', 65000, NULL, 'XIAO-PDLG91', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ls-UmPvtPZ', 'prod__LEquAWGTX', 'products/montres-connectees/redmi-watch-5.webp', 'Redmi Watch 5', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_RMjoysbNFC', 'prod__LEquAWGTX', 'Black - Standard', 'XIAO-PDLG91-KFKW', 65000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Rt-MCvppNp', 'prod__LEquAWGTX', 'Silver - Standard', 'XIAO-PDLG91-ZJCM', 65000, 10, '{"color":"Silver","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_tO8nCiYSEd', 'cat_montres', 'Redmi Watch 5 Active', 'redmi-watch-5-active-xMZEkf', 28000, NULL, 'XIAO-1Q94QP', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_o0uh8clv7e', 'prod_tO8nCiYSEd', 'products/montres-connectees/redmi-watch-5-active.webp', 'Redmi Watch 5 Active', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_9JPS7qwSZy', 'prod_tO8nCiYSEd', 'Black - Standard', 'XIAO-1Q94QP-VAK2', 28000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_pOSdcG7v-k', 'prod_tO8nCiYSEd', 'White - Standard', 'XIAO-1Q94QP-0UWU', 28000, 10, '{"color":"White","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_7yhSP_lOf4', 'cat_montres', 'Redmi Watch 5 Lite', 'redmi-watch-5-lite-Tq1D8i', 38000, NULL, 'XIAO-4VJXLT', 'Xiaomi', 1, 0, 30);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_E0_GZKr4bx', 'prod_7yhSP_lOf4', 'products/montres-connectees/redmi-watch-5-lite.webp', 'Redmi Watch 5 Lite', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_l3XaIw2LLq', 'prod_7yhSP_lOf4', 'Black - Standard', 'XIAO-4VJXLT-EA_D', 38000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_AssH4--b7D', 'prod_7yhSP_lOf4', 'White - Standard', 'XIAO-4VJXLT-7H1I', 38000, 10, '{"color":"White","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_1t66z-oy1D', 'prod_7yhSP_lOf4', 'Pink - Standard', 'XIAO-4VJXLT-JS1A', 38000, 10, '{"color":"Pink","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_JmX2PGTrWt', 'cat_montres', 'Xiaomi Smart Band 8 Pro', 'xiaomi-smart-band-8-pro-IMbElY', 60000, NULL, 'XIAO-CKFSM4', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_fcT5rAbWXK', 'prod_JmX2PGTrWt', 'products/montres-connectees/xiaomi-smart-band-8-pro.webp', 'Xiaomi Smart Band 8 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_kj4nonh9Pg', 'prod_JmX2PGTrWt', 'Black - Standard', 'XIAO-CKFSM4-QHGD', 60000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_xWA-EXgZxv', 'prod_JmX2PGTrWt', 'White - Standard', 'XIAO-CKFSM4-9NMW', 60000, 10, '{"color":"White","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_vOHPYuCVol', 'cat_montres', 'Xiaomi Smart Band 9', 'xiaomi-smart-band-9-G-6DiH', 30000, NULL, 'XIAO-Y2OIBA', 'Xiaomi', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_fJ9KTdxJ5z', 'prod_vOHPYuCVol', 'products/montres-connectees/xiaomi-smart-band-9.webp', 'Xiaomi Smart Band 9', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_eSHTBWPm-4', 'prod_vOHPYuCVol', 'Black - Standard', 'XIAO-Y2OIBA-DGGM', 30000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_uw_W6iSwby', 'prod_vOHPYuCVol', 'Blue - Standard', 'XIAO-Y2OIBA-HGSE', 30000, 10, '{"color":"Blue","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_aTxmrDaSHv', 'prod_vOHPYuCVol', 'Pink - Standard', 'XIAO-Y2OIBA-A2EF', 30000, 10, '{"color":"Pink","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_0Fz9fORE56', 'prod_vOHPYuCVol', 'White - Standard', 'XIAO-Y2OIBA-ZUQH', 30000, 10, '{"color":"White","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_UUjifDyEQz', 'cat_montres', 'Xiaomi Smart Band 9 Active', 'xiaomi-smart-band-9-active-rubVN5', 35000, NULL, 'XIAO-O_4F0J', 'Xiaomi', 1, 0, 30);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_37GnaGLj0P', 'prod_UUjifDyEQz', 'products/montres-connectees/xiaomi-smart-band-9-active.webp', 'Xiaomi Smart Band 9 Active', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_IBbntJSYOp', 'prod_UUjifDyEQz', 'Black - Standard', 'XIAO-O_4F0J-K7BD', 35000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_CZLVuU_T3s', 'prod_UUjifDyEQz', 'White - Standard', 'XIAO-O_4F0J-TDNJ', 35000, 10, '{"color":"White","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_WpIHjVCT1H', 'prod_UUjifDyEQz', 'Pink - Standard', 'XIAO-O_4F0J-B4RP', 35000, 10, '{"color":"Pink","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_EIpQlB3e5t', 'cat_montres', 'Xiaomi Smart Band 9 Pro', 'xiaomi-smart-band-9-pro-f0lpHK', 50000, NULL, 'XIAO-M1C7RW', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_sszPE5KlAr', 'prod_EIpQlB3e5t', 'products/montres-connectees/xiaomi-smart-band-9-pro.webp', 'Xiaomi Smart Band 9 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_jpDdV6cpC6', 'prod_EIpQlB3e5t', 'Black - Standard', 'XIAO-M1C7RW-ON5Z', 50000, 10, '{"color":"Black","storage":"Standard"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_IRE6xxjtZ_', 'prod_EIpQlB3e5t', 'Silver - Standard', 'XIAO-M1C7RW-BJ8M', 50000, 10, '{"color":"Silver","storage":"Standard"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Ul26UjfJQn', 'cat_ordinateurs', 'MacBook Pro M3 Max (2023)', 'macbook-pro-m3-max-2023-woAxic', 2200000, NULL, 'APPL-NZW7FC', 'Apple', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_zA0V76DybS', 'prod_Ul26UjfJQn', 'products/ordinateurs/macbook-pro-m3-max-2023.webp', 'MacBook Pro M3 Max (2023)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_0cu7rCNBzw', 'prod_Ul26UjfJQn', 'Silver - 36GB/1TB', 'APPL-NZW7FC-VY0H', 2200000, 10, '{"color":"Silver","storage":"36GB/1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_5WIX-i6uY3', 'prod_Ul26UjfJQn', 'Space Gray - 36GB/1TB', 'APPL-NZW7FC-UBRX', 2200000, 10, '{"color":"Space Gray","storage":"36GB/1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_8pRpxYNf2U', 'cat_ordinateurs', 'MacBook Pro M3 (2023)', 'macbook-pro-m3-2023-VjIdiv', 1100000, NULL, 'APPL-N9FJNO', 'Apple', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Y4QMwx5VEk', 'prod_8pRpxYNf2U', 'products/ordinateurs/macbook-pro-m3-2023.webp', 'MacBook Pro M3 (2023)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_6jNDBxaKLs', 'prod_8pRpxYNf2U', 'Silver - 18GB/512GB', 'APPL-N9FJNO-ASFN', 1100000, 10, '{"color":"Silver","storage":"18GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_bFq72_u41s', 'prod_8pRpxYNf2U', 'Space Gray - 18GB/512GB', 'APPL-N9FJNO-DRWE', 1100000, 10, '{"color":"Space Gray","storage":"18GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_a82M4boq5G', 'cat_ordinateurs', 'MacBook Pro (2023)', 'macbook-pro-2023-8HF2-x', 950000, NULL, 'APPL--AEXCI', 'Apple', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_AYngFXtSwp', 'prod_a82M4boq5G', 'products/ordinateurs/macbook-pro-2023.webp', 'MacBook Pro (2023)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_mDZtpap5ax', 'prod_a82M4boq5G', 'Silver - 8GB/256GB', 'APPL--AEXCI-5SMB', 950000, 10, '{"color":"Silver","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_6kVWLdAWU4', 'prod_a82M4boq5G', 'Silver - 8GB/512GB', 'APPL--AEXCI-EDN-', 950000, 10, '{"color":"Silver","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_fKmZqs0_Bn', 'prod_a82M4boq5G', 'Space Gray - 8GB/256GB', 'APPL--AEXCI-KPAX', 950000, 10, '{"color":"Space Gray","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ub0v1CqujK', 'prod_a82M4boq5G', 'Space Gray - 8GB/512GB', 'APPL--AEXCI-R6IY', 950000, 10, '{"color":"Space Gray","storage":"8GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_nm2SME0r9S', 'cat_ordinateurs', 'MacBook Pro M2 (2022)', 'macbook-pro-m2-2022-z9vyN3', 780000, NULL, 'APPL-ESGJ6A', 'Apple', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_KrvSsFcOul', 'prod_nm2SME0r9S', 'products/ordinateurs/macbook-pro-m2-2022.webp', 'MacBook Pro M2 (2022)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_C6OznOA02p', 'prod_nm2SME0r9S', 'Silver - 8GB/256GB', 'APPL-ESGJ6A-UTO5', 780000, 10, '{"color":"Silver","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_NOX5ul5_Ni', 'prod_nm2SME0r9S', 'Silver - 16GB/512GB', 'APPL-ESGJ6A-AOH0', 780000, 10, '{"color":"Silver","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_sFB9lzUPKb', 'prod_nm2SME0r9S', 'Space Gray - 8GB/256GB', 'APPL-ESGJ6A-MI5M', 780000, 10, '{"color":"Space Gray","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_7TPPS0C39I', 'prod_nm2SME0r9S', 'Space Gray - 16GB/512GB', 'APPL-ESGJ6A-S9QB', 780000, 10, '{"color":"Space Gray","storage":"16GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_VT4vmnbv8M', 'cat_ordinateurs', 'MacBook Air M4 (2025)', 'macbook-air-m4-2025-PxycyE', 770000, 880000, 'APPL-IMLORV', 'Apple', 1, 0, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_fpWYn-yteR', 'prod_VT4vmnbv8M', 'products/ordinateurs/macbook-air-m4-2025.webp', 'MacBook Air M4 (2025)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_z0HVSndOEG', 'prod_VT4vmnbv8M', 'Silver - 16GB/256GB', 'APPL-IMLORV-G0AN', 770000, 10, '{"color":"Silver","storage":"16GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_1c0OyBjCmM', 'prod_VT4vmnbv8M', 'Silver - 16GB/512GB', 'APPL-IMLORV-SDYS', 825000, 10, '{"color":"Silver","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_NdF6nhnfnp', 'prod_VT4vmnbv8M', 'Silver - 24GB/512GB', 'APPL-IMLORV-BMDN', 880000, 10, '{"color":"Silver","storage":"24GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_bxAMHsGR2F', 'prod_VT4vmnbv8M', 'Space Gray - 16GB/256GB', 'APPL-IMLORV-K1ST', 770000, 10, '{"color":"Space Gray","storage":"16GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_VDCShoiOgl', 'prod_VT4vmnbv8M', 'Space Gray - 16GB/512GB', 'APPL-IMLORV-WR0C', 825000, 10, '{"color":"Space Gray","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_KSRZbbaOgU', 'prod_VT4vmnbv8M', 'Space Gray - 24GB/512GB', 'APPL-IMLORV-BC_W', 880000, 10, '{"color":"Space Gray","storage":"24GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ILPLMLysD0', 'prod_VT4vmnbv8M', 'Starlight - 16GB/256GB', 'APPL-IMLORV-T8-6', 770000, 10, '{"color":"Starlight","storage":"16GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_QtNPWlBOAf', 'prod_VT4vmnbv8M', 'Starlight - 16GB/512GB', 'APPL-IMLORV-1RRE', 825000, 10, '{"color":"Starlight","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_8JUu2hDz1E', 'prod_VT4vmnbv8M', 'Starlight - 24GB/512GB', 'APPL-IMLORV-M1VJ', 880000, 10, '{"color":"Starlight","storage":"24GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_jtSI40rMvi', 'prod_VT4vmnbv8M', 'Sky Blue - 16GB/256GB', 'APPL-IMLORV-DFWV', 770000, 10, '{"color":"Sky Blue","storage":"16GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Ek2tAozJHJ', 'prod_VT4vmnbv8M', 'Sky Blue - 16GB/512GB', 'APPL-IMLORV-SIAY', 825000, 10, '{"color":"Sky Blue","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_C4m5Lnf80Y', 'prod_VT4vmnbv8M', 'Sky Blue - 24GB/512GB', 'APPL-IMLORV-9LDX', 880000, 10, '{"color":"Sky Blue","storage":"24GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_tAuXoN4d_u', 'cat_ordinateurs', 'MacBook Air M3 (2023)', 'macbook-air-m3-2023-4lGn0L', 850000, NULL, 'APPL-26RCUE', 'Apple', 1, 0, 80);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ulN9TYtsrq', 'prod_tAuXoN4d_u', 'products/ordinateurs/macbook-air-m3-2023.webp', 'MacBook Air M3 (2023)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_WXRcIcUl4B', 'prod_tAuXoN4d_u', 'Silver - 8GB/256GB', 'APPL-26RCUE-C7DX', 850000, 10, '{"color":"Silver","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_05UD2QsSS9', 'prod_tAuXoN4d_u', 'Silver - 8GB/512GB', 'APPL-26RCUE-ILGS', 850000, 10, '{"color":"Silver","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_H30LtICqr-', 'prod_tAuXoN4d_u', 'Space Gray - 8GB/256GB', 'APPL-26RCUE-9LDF', 850000, 10, '{"color":"Space Gray","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_QSkJ3DxRCM', 'prod_tAuXoN4d_u', 'Space Gray - 8GB/512GB', 'APPL-26RCUE-JOIU', 850000, 10, '{"color":"Space Gray","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_z-ui1JTmR0', 'prod_tAuXoN4d_u', 'Starlight - 8GB/256GB', 'APPL-26RCUE-Z3Y8', 850000, 10, '{"color":"Starlight","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_U3XwAtGuMd', 'prod_tAuXoN4d_u', 'Starlight - 8GB/512GB', 'APPL-26RCUE-3WBH', 850000, 10, '{"color":"Starlight","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_bdpgqiZvEF', 'prod_tAuXoN4d_u', 'Sky Blue - 8GB/256GB', 'APPL-26RCUE-A-0H', 850000, 10, '{"color":"Sky Blue","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_wIyXs0-s2X', 'prod_tAuXoN4d_u', 'Sky Blue - 8GB/512GB', 'APPL-26RCUE-ERGV', 850000, 10, '{"color":"Sky Blue","storage":"8GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_yj3B9K4GEJ', 'cat_ordinateurs', 'MacBook Air M2 (2024)', 'macbook-air-m2-2024-v0pyIj', 630000, 700000, 'APPL-O_CJMO', 'Apple', 1, 0, 60);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_WZ6BRviRTw', 'prod_yj3B9K4GEJ', 'products/ordinateurs/macbook-air-m2-2024.webp', 'MacBook Air M2 (2024)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_MJcGVhoKog', 'prod_yj3B9K4GEJ', 'Silver - 8GB/256GB', 'APPL-O_CJMO-OVBT', 630000, 10, '{"color":"Silver","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_BdiJSkig7m', 'prod_yj3B9K4GEJ', 'Silver - 8GB/512GB', 'APPL-O_CJMO-YIER', 700000, 10, '{"color":"Silver","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_70QhCe9-C1', 'prod_yj3B9K4GEJ', 'Space Gray - 8GB/256GB', 'APPL-O_CJMO-0X3Y', 630000, 10, '{"color":"Space Gray","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_LX2zdpIK70', 'prod_yj3B9K4GEJ', 'Space Gray - 8GB/512GB', 'APPL-O_CJMO-SDIX', 700000, 10, '{"color":"Space Gray","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_M9Ti35SD_A', 'prod_yj3B9K4GEJ', 'Starlight - 8GB/256GB', 'APPL-O_CJMO-VE-A', 630000, 10, '{"color":"Starlight","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Sfw2ebMLxC', 'prod_yj3B9K4GEJ', 'Starlight - 8GB/512GB', 'APPL-O_CJMO-3FST', 700000, 10, '{"color":"Starlight","storage":"8GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_mKITu5mNQ4', 'cat_ordinateurs', 'MacBook Air M1 (2021)', 'macbook-air-m1-2021-lvkcDz', 530000, NULL, 'APPL-K-PEJV', 'Apple', 1, 0, 30);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_WllH01z6hp', 'prod_mKITu5mNQ4', 'products/ordinateurs/macbook-air-m1-2021.webp', 'MacBook Air M1 (2021)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_KBIvhMLP4C', 'prod_mKITu5mNQ4', 'Silver - 8GB/256GB', 'APPL-K-PEJV-6ATA', 530000, 10, '{"color":"Silver","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Wfe690Zp0F', 'prod_mKITu5mNQ4', 'Space Gray - 8GB/256GB', 'APPL-K-PEJV-COJM', 530000, 10, '{"color":"Space Gray","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_hZ4CjIRGY1', 'prod_mKITu5mNQ4', 'Gold - 8GB/256GB', 'APPL-K-PEJV-I8WF', 530000, 10, '{"color":"Gold","storage":"8GB/256GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_NFvnjb4JDq', 'cat_ordinateurs', 'MacBook Pro M4 (2024)', 'macbook-pro-m4-2024-aCl8t_', 1180000, 1280000, 'APPL-UPDKHS', 'Apple', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_SEu9qoFlBu', 'prod_NFvnjb4JDq', 'products/ordinateurs/macbook-pro-m4-2024.webp', 'MacBook Pro M4 (2024)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_MxDcsuBF1z', 'prod_NFvnjb4JDq', 'Silver - 16GB/512GB', 'APPL-UPDKHS-G1XS', 1180000, 10, '{"color":"Silver","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_DLnmk7DoSJ', 'prod_NFvnjb4JDq', 'Silver - 24GB/512GB', 'APPL-UPDKHS-Y_DV', 1280000, 10, '{"color":"Silver","storage":"24GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_5Km_RZiidX', 'prod_NFvnjb4JDq', 'Space Gray - 16GB/512GB', 'APPL-UPDKHS-ATS2', 1180000, 10, '{"color":"Space Gray","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Yt9fNsQYV1', 'prod_NFvnjb4JDq', 'Space Gray - 24GB/512GB', 'APPL-UPDKHS-YNWT', 1280000, 10, '{"color":"Space Gray","storage":"24GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_M5-mlrgfeZ', 'cat_ordinateurs', 'MacBook Pro M4 Max (2024)', 'macbook-pro-m4-max-2024-L3tXPc', 2200000, 2360000, 'APPL-LG4P7C', 'Apple', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_BYn4lPgkxz', 'prod_M5-mlrgfeZ', 'products/ordinateurs/macbook-pro-m4-max-2024.webp', 'MacBook Pro M4 Max (2024)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_xAgN7UpNA7', 'prod_M5-mlrgfeZ', 'Silver - 36GB/1TB', 'APPL-LG4P7C-_RTJ', 2200000, 10, '{"color":"Silver","storage":"36GB/1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_3Zhq32VRKp', 'prod_M5-mlrgfeZ', 'Silver - 48GB/1TB', 'APPL-LG4P7C-3KGX', 2360000, 10, '{"color":"Silver","storage":"48GB/1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_6ELpFAbKc2', 'prod_M5-mlrgfeZ', 'Space Gray - 36GB/1TB', 'APPL-LG4P7C-S0B6', 2200000, 10, '{"color":"Space Gray","storage":"36GB/1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_W8YScV4HH-', 'prod_M5-mlrgfeZ', 'Space Gray - 48GB/1TB', 'APPL-LG4P7C-5_GQ', 2360000, 10, '{"color":"Space Gray","storage":"48GB/1TB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_NYu-SQe7CI', 'cat_ordinateurs', 'MacBook Pro M4 Pro (2024)', 'macbook-pro-m4-pro-2024-q0DHrm', 1350000, 2000000, 'APPL-AVIF9A', 'Apple', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_TVzFOYnVY3', 'prod_NYu-SQe7CI', 'products/ordinateurs/macbook-pro-m4-pro-2024.webp', 'MacBook Pro M4 Pro (2024)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_SmS_aiwa84', 'prod_NYu-SQe7CI', 'Silver - 24GB/512GB', 'APPL-AVIF9A-FNAT', 1350000, 10, '{"color":"Silver","storage":"24GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_YTQ83nHM-h', 'prod_NYu-SQe7CI', 'Silver - 48GB/512GB', 'APPL-AVIF9A-0OUF', 2000000, 10, '{"color":"Silver","storage":"48GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_JUqLolSkE3', 'prod_NYu-SQe7CI', 'Space Gray - 24GB/512GB', 'APPL-AVIF9A-S0KZ', 1350000, 10, '{"color":"Space Gray","storage":"24GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_IDMNAA_RnA', 'prod_NYu-SQe7CI', 'Space Gray - 48GB/512GB', 'APPL-AVIF9A-UKY4', 2000000, 10, '{"color":"Space Gray","storage":"48GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_zc69ubIHuh', 'cat_ordinateurs', 'iMac M3 (2024)', 'imac-m3-2024-YH03n0', 980000, NULL, 'IMAC-MZC4FD', 'iMac', 1, 0, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_O2LyjgdnyT', 'prod_zc69ubIHuh', 'products/ordinateurs/imac-m3-2024.webp', 'iMac M3 (2024)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_F67hoOAZ5M', 'prod_zc69ubIHuh', 'Silver - 8GB/256GB', 'IMAC-MZC4FD-RJSC', 980000, 10, '{"color":"Silver","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ZD80hALk5H', 'prod_zc69ubIHuh', 'Silver - 8GB/512GB', 'IMAC-MZC4FD-PYUO', 980000, 10, '{"color":"Silver","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_TllEyf1lbC', 'prod_zc69ubIHuh', 'Blue - 8GB/256GB', 'IMAC-MZC4FD-YENG', 980000, 10, '{"color":"Blue","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_O3GNzVPNow', 'prod_zc69ubIHuh', 'Blue - 8GB/512GB', 'IMAC-MZC4FD-2ADP', 980000, 10, '{"color":"Blue","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_lPx3BeTO9g', 'prod_zc69ubIHuh', 'Green - 8GB/256GB', 'IMAC-MZC4FD-Z3_Z', 980000, 10, '{"color":"Green","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_XoZgqQfHTg', 'prod_zc69ubIHuh', 'Green - 8GB/512GB', 'IMAC-MZC4FD-293A', 980000, 10, '{"color":"Green","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_GDn2gKr8qd', 'prod_zc69ubIHuh', 'Pink - 8GB/256GB', 'IMAC-MZC4FD-CRSJ', 980000, 10, '{"color":"Pink","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_JVffvuDjAC', 'prod_zc69ubIHuh', 'Pink - 8GB/512GB', 'IMAC-MZC4FD-B-Q-', 980000, 10, '{"color":"Pink","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_TJQ4qVISLY', 'prod_zc69ubIHuh', 'Yellow - 8GB/256GB', 'IMAC-MZC4FD-BZSA', 980000, 10, '{"color":"Yellow","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_WYnORVjbfZ', 'prod_zc69ubIHuh', 'Yellow - 8GB/512GB', 'IMAC-MZC4FD-1CHU', 980000, 10, '{"color":"Yellow","storage":"8GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_iRhFd5g1On', 'prod_zc69ubIHuh', 'Orange - 8GB/256GB', 'IMAC-MZC4FD-QXTN', 980000, 10, '{"color":"Orange","storage":"8GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_BhRwpUZ01Y', 'prod_zc69ubIHuh', 'Orange - 8GB/512GB', 'IMAC-MZC4FD-KKK7', 980000, 10, '{"color":"Orange","storage":"8GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_nnH9Xfs3F7', 'cat_ordinateurs', 'iMac M4 (2024)', 'imac-m4-2024-aNo-OW', 1250000, NULL, 'IMAC-4DRSW3', 'iMac', 1, 0, 120);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_3WBFz95_ki', 'prod_nnH9Xfs3F7', 'products/ordinateurs/imac-m4-2024.webp', 'iMac M4 (2024)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_MOZxEDxceq', 'prod_nnH9Xfs3F7', 'Silver - 16GB/256GB', 'IMAC-4DRSW3-XNTN', 1250000, 10, '{"color":"Silver","storage":"16GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ZjB9Ipk3_b', 'prod_nnH9Xfs3F7', 'Silver - 16GB/512GB', 'IMAC-4DRSW3-AZMC', 1250000, 10, '{"color":"Silver","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_RKmn5xhXeJ', 'prod_nnH9Xfs3F7', 'Blue - 16GB/256GB', 'IMAC-4DRSW3-DUCO', 1250000, 10, '{"color":"Blue","storage":"16GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_O_1WpoqBzw', 'prod_nnH9Xfs3F7', 'Blue - 16GB/512GB', 'IMAC-4DRSW3-GXFF', 1250000, 10, '{"color":"Blue","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_slzIMxgIpH', 'prod_nnH9Xfs3F7', 'Green - 16GB/256GB', 'IMAC-4DRSW3-Q0R7', 1250000, 10, '{"color":"Green","storage":"16GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_pn5RpI1ktL', 'prod_nnH9Xfs3F7', 'Green - 16GB/512GB', 'IMAC-4DRSW3-IBFC', 1250000, 10, '{"color":"Green","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_IcGhHYfaIN', 'prod_nnH9Xfs3F7', 'Pink - 16GB/256GB', 'IMAC-4DRSW3-DAK_', 1250000, 10, '{"color":"Pink","storage":"16GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_u-4JvwE0Gv', 'prod_nnH9Xfs3F7', 'Pink - 16GB/512GB', 'IMAC-4DRSW3-I7FX', 1250000, 10, '{"color":"Pink","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_BQAhanFLgu', 'prod_nnH9Xfs3F7', 'Yellow - 16GB/256GB', 'IMAC-4DRSW3-MB5I', 1250000, 10, '{"color":"Yellow","storage":"16GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_W4N85Hf0W8', 'prod_nnH9Xfs3F7', 'Yellow - 16GB/512GB', 'IMAC-4DRSW3-TCME', 1250000, 10, '{"color":"Yellow","storage":"16GB/512GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_zJVPe2cAy-', 'prod_nnH9Xfs3F7', 'Orange - 16GB/256GB', 'IMAC-4DRSW3-RGRY', 1250000, 10, '{"color":"Orange","storage":"16GB/256GB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_e-XbiSpWnD', 'prod_nnH9Xfs3F7', 'Orange - 16GB/512GB', 'IMAC-4DRSW3-N2MM', 1250000, 10, '{"color":"Orange","storage":"16GB/512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_UhKkKAwaNz', 'cat_ordinateurs', 'Dell Vostro 3520 i7', 'dell-vostro-3520-i7-lHpvpl', 460000, NULL, 'DELL-JW6H2Z', 'Dell', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_V2QYij1cax', 'prod_UhKkKAwaNz', 'products/ordinateurs/dell-vostro-3520-i7.webp', 'Dell Vostro 3520 i7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_PA3bGkgigQ', 'prod_UhKkKAwaNz', 'Black - 8GB/512GB SSD', 'DELL-JW6H2Z-RWBA', 460000, 10, '{"color":"Black","storage":"8GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_e8i8Ubzn1m', 'cat_ordinateurs', 'BUREAU HP 290-G9 i5', 'bureau-hp-290-g9-i5-TwJDvm', 345000, NULL, 'BURE-3IXMDY', 'BUREAU', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_PmPf94L5Gp', 'prod_e8i8Ubzn1m', 'products/ordinateurs/bureau-hp-290-g9-i5.webp', 'BUREAU HP 290-G9 i5', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_fI_nDxFSKC', 'prod_e8i8Ubzn1m', 'Black - 8GB/512GB SSD', 'BURE-3IXMDY-BIHZ', 345000, 10, '{"color":"Black","storage":"8GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_RjJVFyHv89', 'cat_ordinateurs', 'BUREAU HP PRODESK 400 G9 i5', 'bureau-hp-prodesk-400-g9-i5-DLsVlK', 410000, NULL, 'BURE-FWW7XG', 'BUREAU', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_3wRgS_jFiF', 'prod_RjJVFyHv89', 'products/ordinateurs/bureau-hp-prodesk-400-g9-i5.webp', 'BUREAU HP PRODESK 400 G9 i5', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_kYxiyqZzu8', 'prod_RjJVFyHv89', 'Black - 8GB/512GB SSD', 'BURE-FWW7XG-FQ9U', 410000, 10, '{"color":"Black","storage":"8GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Q7UxV4M-z-', 'cat_ordinateurs', 'LENOVO THINKBOOK 14 G6 i7', 'lenovo-thinkbook-14-g6-i7-wNTNVk', 485000, NULL, 'LENO-RY0ENO', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_EJ0PkD2UhS', 'prod_Q7UxV4M-z-', 'products/ordinateurs/lenovo-thinkbook-14-g6-i7.webp', 'LENOVO THINKBOOK 14 G6 i7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ngPj1COX13', 'prod_Q7UxV4M-z-', 'Grey - 16GB/512GB SSD', 'LENO-RY0ENO-_-SX', 485000, 10, '{"color":"Grey","storage":"16GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_mItBnCQMaZ', 'cat_ordinateurs', 'LENOVO THINKBOOK 15 G4 i7', 'lenovo-thinkbook-15-g4-i7-6JqNjX', 485000, NULL, 'LENO-AQWXIZ', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_CHgHJ-CmRX', 'prod_mItBnCQMaZ', 'products/ordinateurs/lenovo-thinkbook-15-g4-i7.webp', 'LENOVO THINKBOOK 15 G4 i7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_9rBjy0QsI6', 'prod_mItBnCQMaZ', 'Grey - 16GB/512GB SSD', 'LENO-AQWXIZ-V4IV', 485000, 10, '{"color":"Grey","storage":"16GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_sNn7UTWExa', 'cat_ordinateurs', 'LENOVO THINKPAD E14 G5 i7', 'lenovo-thinkpad-e14-g5-i7-T6WSDh', 550000, NULL, 'LENO-TOD9HQ', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_N_47rkrH1r', 'prod_sNn7UTWExa', 'products/ordinateurs/lenovo-thinkpad-e14-g5-i7.webp', 'LENOVO THINKPAD E14 G5 i7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_9-_l8D-IQi', 'prod_sNn7UTWExa', 'Black - 16GB/512GB SSD', 'LENO-TOD9HQ-ZAGN', 550000, 10, '{"color":"Black","storage":"16GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_J_6_7ZI72a', 'cat_ordinateurs', 'Lenovo ThinkPad E15 i7', 'lenovo-thinkpad-e15-i7-k3XLfl', 635000, NULL, 'LENO-AU1HIJ', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_DXn4nkfLmf', 'prod_J_6_7ZI72a', 'products/ordinateurs/lenovo-thinkpad-e15-i7.webp', 'Lenovo ThinkPad E15 i7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_bzlTR5Byf1', 'prod_J_6_7ZI72a', 'Black - 16GB/512GB SSD', 'LENO-AU1HIJ-EETA', 635000, 10, '{"color":"Black","storage":"16GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_GgdVajmasz', 'cat_ordinateurs', 'Lenovo ThinkPad E16 i7', 'lenovo-thinkpad-e16-i7-t1gtOV', 630000, NULL, 'LENO-8OBONU', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_H_NXayneg-', 'prod_GgdVajmasz', 'products/ordinateurs/lenovo-thinkpad-e16-i7.webp', 'Lenovo ThinkPad E16 i7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_IP5uSLGfem', 'prod_GgdVajmasz', 'Black - 16GB/512GB SSD', 'LENO-8OBONU-SIRF', 630000, 10, '{"color":"Black","storage":"16GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_9lpPEo3Tgq', 'cat_ordinateurs', 'Lenovo Yoga 9 16 x360', 'lenovo-yoga-9-16-x360-fMhug7', 690000, NULL, 'LENO-A23ZPB', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Fz6t7HzJ1l', 'prod_9lpPEo3Tgq', 'products/ordinateurs/lenovo-yoga-9-16-x360.webp', 'Lenovo Yoga 9 16 x360', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_b2gZE-P3sc', 'prod_9lpPEo3Tgq', 'Grey - 16GB/512GB SSD', 'LENO-A23ZPB-SLWU', 690000, 10, '{"color":"Grey","storage":"16GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_jXsvFmPqXr', 'cat_ordinateurs', 'Dell Vostro 3030MT i3', 'dell-vostro-3030mt-i3-OlLX-x', 290000, NULL, 'DELL-YWDDEA', 'Dell', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_8WSSeN-itB', 'prod_jXsvFmPqXr', 'products/ordinateurs/dell-vostro-3030mt-i3.webp', 'Dell Vostro 3030MT i3', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_L8F-08AQMw', 'prod_jXsvFmPqXr', 'Black - 8GB/512GB SSD', 'DELL-YWDDEA-PC2X', 290000, 10, '{"color":"Black","storage":"8GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_fuVVcqHht-', 'cat_ordinateurs', 'Dell Vostro 3030MT i7', 'dell-vostro-3030mt-i7-92K-je', 435000, NULL, 'DELL-KB7HRV', 'Dell', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_UcxgKmB7RU', 'prod_fuVVcqHht-', 'products/ordinateurs/dell-vostro-3030mt-i7.webp', 'Dell Vostro 3030MT i7', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_9pGFZkIAyE', 'prod_fuVVcqHht-', 'Black - 8GB/512GB SSD', 'DELL-KB7HRV-PNCO', 435000, 10, '{"color":"Black","storage":"8GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Z6tD1vy1_z', 'cat_ordinateurs', 'Lenovo ThinkCentre Neo 50t i3', 'lenovo-thinkcentre-neo-50t-i3-f1K6XX', 295000, NULL, 'LENO-YIBXKS', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_7CvmhuMFe8', 'prod_Z6tD1vy1_z', 'products/ordinateurs/lenovo-thinkcentre-neo-50t-i3.webp', 'Lenovo ThinkCentre Neo 50t i3', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_27Mq0wHMxA', 'prod_Z6tD1vy1_z', 'Black - 8GB/512GB SSD', 'LENO-YIBXKS-KFLN', 295000, 10, '{"color":"Black","storage":"8GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_3tXoRvpV5S', 'cat_ordinateurs', 'HP 290 G9 i3', 'hp-290-g9-i3-pKR9Hs', 277500, NULL, 'HP-S0PBTS', 'HP', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_bKgsGYi2iD', 'prod_3tXoRvpV5S', 'products/ordinateurs/hp-290-g9-i3.webp', 'HP 290 G9 i3', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_kMX2wZOhRb', 'prod_3tXoRvpV5S', 'Black - 8GB/512GB SSD', 'HP-S0PBTS-J9SS', 277500, 10, '{"color":"Black","storage":"8GB/512GB SSD"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_ZkTmdzbkHx', 'cat_ecouteurs', 'FreeBuds 4 Pro', 'freebuds-4-pro-toHaBD', 135000, NULL, 'FREE-G2EVZI', 'FreeBuds', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_hbAUMbjOVU', 'prod_ZkTmdzbkHx', 'products/ecouteurs/freebuds-4-pro.webp', 'FreeBuds 4 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_fwAYWgpB7B', 'prod_ZkTmdzbkHx', 'Black - N/A', 'FREE-G2EVZI-ABYF', 135000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_f_V-bTf62f', 'prod_ZkTmdzbkHx', 'White - N/A', 'FREE-G2EVZI-UVKN', 135000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_-NSNlGlQ44', 'cat_ecouteurs', 'FreeBuds 6', 'freebuds-6-6e8M6E', 110000, NULL, 'FREE-VFVCN1', 'FreeBuds', 1, 0, 30);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_XLj2ThBr99', 'prod_-NSNlGlQ44', 'products/ecouteurs/freebuds-6.webp', 'FreeBuds 6', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_c9PeGCMRNC', 'prod_-NSNlGlQ44', 'Black - N/A', 'FREE-VFVCN1-ZYZF', 110000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_oChiJTZg7S', 'prod_-NSNlGlQ44', 'White - N/A', 'FREE-VFVCN1-BNUS', 110000, 10, '{"color":"White","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_zAataU22jW', 'prod_-NSNlGlQ44', 'Purple - N/A', 'FREE-VFVCN1-II-C', 110000, 10, '{"color":"Purple","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_cxi2q_SC0J', 'cat_ecouteurs', 'FreeBuds 6i', 'freebuds-6i-b2X4lz', 90000, NULL, 'FREE-K9TKUT', 'FreeBuds', 1, 0, 30);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_QYygrPK38v', 'prod_cxi2q_SC0J', 'products/ecouteurs/freebuds-6i.webp', 'FreeBuds 6i', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_hE8N0ixv_r', 'prod_cxi2q_SC0J', 'Black - N/A', 'FREE-K9TKUT-BFW4', 90000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_4a2Af349Sr', 'prod_cxi2q_SC0J', 'White - N/A', 'FREE-K9TKUT-KXEW', 90000, 10, '{"color":"White","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_KsLcDQOfGp', 'prod_cxi2q_SC0J', 'Purple - N/A', 'FREE-K9TKUT-IPDD', 90000, 10, '{"color":"Purple","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_x9zcDjNkC3', 'cat_ecouteurs', 'Galaxy Buds 3', 'galaxy-buds-3-1dTH1F', 75000, NULL, 'SAMS-3OCAMP', 'Samsung', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_sM05cTdH4e', 'prod_x9zcDjNkC3', 'products/ecouteurs/galaxy-buds-3.webp', 'Galaxy Buds 3', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__mgaRthrDL', 'prod_x9zcDjNkC3', 'Black - N/A', 'SAMS-3OCAMP-JQ0_', 75000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_qDXGwwX0Fw', 'prod_x9zcDjNkC3', 'White - N/A', 'SAMS-3OCAMP-VTQE', 75000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_wNHuT7BzMM', 'cat_ecouteurs', 'Galaxy Buds 3 Pro', 'galaxy-buds-3-pro-yJS7qg', 100000, NULL, 'SAMS-6AVU8L', 'Samsung', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_5SnpjdshY_', 'prod_wNHuT7BzMM', 'products/ecouteurs/galaxy-buds-3-pro.webp', 'Galaxy Buds 3 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_a9czMmkSV_', 'prod_wNHuT7BzMM', 'Black - N/A', 'SAMS-6AVU8L-M7OV', 100000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_qHDHFLRV5g', 'prod_wNHuT7BzMM', 'White - N/A', 'SAMS-6AVU8L-_IMH', 100000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_PstKfIim45', 'cat_ecouteurs', 'Huawei FreeArc', 'huawei-freearc-e2pb2y', 130000, NULL, 'HUAW-Z0WTUV', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_lJODcOgRMg', 'prod_PstKfIim45', 'products/ecouteurs/huawei-freearc.webp', 'Huawei FreeArc', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_T3c0pWGO_m', 'prod_PstKfIim45', 'Black - N/A', 'HUAW-Z0WTUV-ZK4Y', 130000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_B-GLprIvT0', 'prod_PstKfIim45', 'White - N/A', 'HUAW-Z0WTUV-MULG', 130000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_M7N3SAB2nM', 'cat_ecouteurs', 'Huawei FreeClip', 'huawei-freeclip-BipR1p', 135000, NULL, 'HUAW-7DPLSX', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_jZi79fmB9C', 'prod_M7N3SAB2nM', 'products/ecouteurs/huawei-freeclip.webp', 'Huawei FreeClip', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_OPkZiImkda', 'prod_M7N3SAB2nM', 'Black - N/A', 'HUAW-7DPLSX-WTWU', 135000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ls2IF3yAUU', 'prod_M7N3SAB2nM', 'Beige - N/A', 'HUAW-7DPLSX-DM9K', 135000, 10, '{"color":"Beige","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_PnNjoEPpBo', 'cat_ecouteurs', 'OnePlus Buds Pro 3', 'oneplus-buds-pro-3-2fpIvJ', 120000, NULL, 'ONEP-OGAZUY', 'OnePlus', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_4oOGOu5BIt', 'prod_PnNjoEPpBo', 'products/ecouteurs/oneplus-buds-pro-3.webp', 'OnePlus Buds Pro 3', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_WocC52Vlor', 'prod_PnNjoEPpBo', 'Black - N/A', 'ONEP-OGAZUY-HGTB', 120000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_OgppXf5l_E', 'prod_PnNjoEPpBo', 'White - N/A', 'ONEP-OGAZUY-IHBW', 120000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_r25VEx8Rvy', 'cat_ecouteurs', 'Mi In-Ear Headphones Basic', 'mi-in-ear-headphones-basic-UAL1Yc', 10000, NULL, 'XIAO-6IUTST', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_iIDQeEwZCN', 'prod_r25VEx8Rvy', 'products/ecouteurs/mi-in-ear-headphones-basic.webp', 'Mi In-Ear Headphones Basic', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_CG8i4FMqj4', 'prod_r25VEx8Rvy', 'Black - N/A', 'XIAO-6IUTST-_1L4', 10000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__9sYIV2Wx-', 'prod_r25VEx8Rvy', 'White - N/A', 'XIAO-6IUTST-OXVZ', 10000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_yvuFNFrRm0', 'cat_ecouteurs', 'Redmi Buds 6', 'redmi-buds-6-k0G3gj', 35000, NULL, 'XIAO-FNY7ZD', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_rjGXn-Hxs5', 'prod_yvuFNFrRm0', 'products/ecouteurs/redmi-buds-6.webp', 'Redmi Buds 6', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_NJhdFiYlMv', 'prod_yvuFNFrRm0', 'Black - N/A', 'XIAO-FNY7ZD-DRH9', 35000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_0eYsgochu3', 'prod_yvuFNFrRm0', 'White - N/A', 'XIAO-FNY7ZD-OP3Y', 35000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_tmFUDH0CQH', 'cat_ecouteurs', 'Redmi Buds 6 Active', 'redmi-buds-6-active-RsXHUO', 15000, NULL, 'XIAO-RRNFS_', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_XxScGfudnk', 'prod_tmFUDH0CQH', 'products/ecouteurs/redmi-buds-6-active.webp', 'Redmi Buds 6 Active', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ZlOeZeDt9C', 'prod_tmFUDH0CQH', 'Black - N/A', 'XIAO-RRNFS_-MCW7', 15000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_ksORKackUg', 'prod_tmFUDH0CQH', 'White - N/A', 'XIAO-RRNFS_-DESQ', 15000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_FrUMbyOC1F', 'cat_ecouteurs', 'Redmi Buds 6 Lite', 'redmi-buds-6-lite-L8B31y', 25000, NULL, 'XIAO--EEWVS', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_UuzLxAd3F3', 'prod_FrUMbyOC1F', 'products/ecouteurs/redmi-buds-6-lite.webp', 'Redmi Buds 6 Lite', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_IJIzyhaGId', 'prod_FrUMbyOC1F', 'Black - N/A', 'XIAO--EEWVS-E5JP', 25000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_KG6U8Hrvh7', 'prod_FrUMbyOC1F', 'White - N/A', 'XIAO--EEWVS-UX2X', 25000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_yYG3I68lCw', 'cat_ecouteurs', 'Redmi Buds 6 Play', 'redmi-buds-6-play-qhpv7i', 15000, NULL, 'XIAO-IFOIHT', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_MVjisXiUID', 'prod_yYG3I68lCw', 'products/ecouteurs/redmi-buds-6-play.webp', 'Redmi Buds 6 Play', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Mo4HKU-ApT', 'prod_yYG3I68lCw', 'Black - N/A', 'XIAO-IFOIHT-WPOG', 15000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_G0ztC21Gxm', 'prod_yYG3I68lCw', 'White - N/A', 'XIAO-IFOIHT-KOGF', 15000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_LYB7CyF5X5', 'cat_ecouteurs', 'Redmi Buds 6 Pro', 'redmi-buds-6-pro-yJfu-L', 50000, NULL, 'XIAO-AZVGYM', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img__8mAaYaUlN', 'prod_LYB7CyF5X5', 'products/ecouteurs/redmi-buds-6-pro.webp', 'Redmi Buds 6 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_7l-wpfi3Kq', 'prod_LYB7CyF5X5', 'Black - N/A', 'XIAO-AZVGYM-UAUY', 50000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__Fwx7AzsHn', 'prod_LYB7CyF5X5', 'Cream - N/A', 'XIAO-AZVGYM-YC7M', 50000, 10, '{"color":"Cream","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_5cgRwjiqbA', 'cat_ecouteurs', 'Xiaomi Buds 5', 'xiaomi-buds-5-KPh83X', 35000, NULL, 'XIAO-HZCNU3', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_vrPdnaMjIG', 'prod_5cgRwjiqbA', 'products/ecouteurs/xiaomi-buds-5.webp', 'Xiaomi Buds 5', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_JJwDlXBkR1', 'prod_5cgRwjiqbA', 'Black - N/A', 'XIAO-HZCNU3-VC1_', 35000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_X2lfpxwBLN', 'prod_5cgRwjiqbA', 'White - N/A', 'XIAO-HZCNU3-1AJD', 35000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_-17zs_E-V9', 'cat_ecouteurs', 'Xiaomi Buds 5 Pro', 'xiaomi-buds-5-pro-y7CED8', 45000, NULL, 'XIAO-TSHKLX', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_K7Ma0gBJOH', 'prod_-17zs_E-V9', 'products/ecouteurs/xiaomi-buds-5-pro.webp', 'Xiaomi Buds 5 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_9oWkJkVMZf', 'prod_-17zs_E-V9', 'Black - N/A', 'XIAO-TSHKLX-IJ_I', 45000, 10, '{"color":"Black","storage":"N/A"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_PyQ1uRam2r', 'prod_-17zs_E-V9', 'White - N/A', 'XIAO-TSHKLX-3NBT', 45000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_YxuIxhGHgL', 'cat_accessoires', 'AirPods 4', 'airpods-4-0grNKj', 100000, NULL, 'APPL-W5NHPW', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_xKz6FUsMN4', 'prod_YxuIxhGHgL', 'products/accessoires/airpods-4.webp', 'AirPods 4', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_SMlpXdjKxh', 'prod_YxuIxhGHgL', 'White - N/A', 'APPL-W5NHPW-TPHQ', 100000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_duMsbI5EuV', 'cat_accessoires', 'AirPods 4 ANC', 'airpods-4-anc-MDhdwu', 135000, NULL, 'APPL-QSVO0L', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_WrFDM-QNPU', 'prod_duMsbI5EuV', 'products/accessoires/airpods-4-anc.webp', 'AirPods 4 ANC', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var__70ksDLl9m', 'prod_duMsbI5EuV', 'White - N/A', 'APPL-QSVO0L-ZW1B', 135000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_dh_Sbgk863', 'cat_accessoires', 'AirTag (pack of 1)', 'airtag-pack-of-1-1sBtB2', 25000, NULL, 'AIRT-R-YR48', 'AirTag', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_rS33xszWTM', 'prod_dh_Sbgk863', 'products/accessoires/airtag-pack-of-1.webp', 'AirTag (pack of 1)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_y7u3J_5OoH', 'prod_dh_Sbgk863', 'White - N/A', 'AIRT-R-YR48-HK6W', 25000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_ePKd0OiLCN', 'cat_accessoires', 'AirTag (pack of 4)', 'airtag-pack-of-4-sxvGLv', 90000, NULL, 'AIRT-KJWAKV', 'AirTag', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ZdCdgOPKyQ', 'prod_ePKd0OiLCN', 'products/accessoires/airtag-pack-of-4.webp', 'AirTag (pack of 4)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_9bOMTagTex', 'prod_ePKd0OiLCN', 'White - N/A', 'AIRT-KJWAKV-NKRO', 90000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_D0O6w-E8Qa', 'cat_accessoires', 'Apple TV 4K 128Gb (2025)', 'apple-tv-4k-128gb-2025-2iaKuF', 170000, NULL, 'APPL-MPQ-Z8', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_e_g2GF7OFC', 'prod_D0O6w-E8Qa', 'products/accessoires/apple-tv-4k-128gb-2025.webp', 'Apple TV 4K 128Gb (2025)', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_L6TiGk7YRe', 'prod_D0O6w-E8Qa', 'Black - 128GB', 'APPL-MPQ-Z8-GQY_', 170000, 10, '{"color":"Black","storage":"128GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_i8toVotVNd', 'cat_jeux', 'Console Sony PS5 Slim + EA FC 26', 'console-sony-ps5-slim-ea-fc-26-vS42Ux', 390000, NULL, 'CONS-TZ56KG', 'Console', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_pkmQRarW4R', 'prod_i8toVotVNd', 'products/jeux/console-sony-ps5-slim-ea-fc-26.avif', 'Console Sony PS5 Slim + EA FC 26', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_awr5aA98tl', 'prod_i8toVotVNd', 'White - N/A', 'CONS-TZ56KG-1RPD', 390000, 10, '{"color":"White","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_CVLqOnJxr2', 'cat_jeux', 'EA SPORTS FC 26', 'ea-sports-fc-26-sLwQZl', 35000, NULL, 'EA-LQTLH6', 'EA', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ZtV83zcfZs', 'prod_CVLqOnJxr2', 'products/jeux/ea-sports-fc-26.avif', 'EA SPORTS FC 26', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_jGwbN4gHfX', 'prod_CVLqOnJxr2', 'N/A - N/A', 'EA-LQTLH6-SBPG', 35000, 10, '{"color":"N/A","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_RwtdsyRxAa', 'cat_jeux', 'Battlefield 6 PC', 'battlefield-6-pc-6wwQ6v', 35000, NULL, 'BATT-DCUAPW', 'Battlefield', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_xtAOnDRdYV', 'prod_RwtdsyRxAa', 'products/jeux/battlefield-6-pc.webp', 'Battlefield 6 PC', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_E38KCPHsbQ', 'prod_RwtdsyRxAa', 'N/A - N/A', 'BATT-DCUAPW-FOOX', 35000, 10, '{"color":"N/A","storage":"N/A"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_emM2OXB6Px', 'cat_televiseurs', 'Xiaomi TV A Pro', 'xiaomi-tv-a-pro-YLkQH4', 110000, NULL, 'XIAO-LMMJIV', 'Xiaomi', 1, 0, 30);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_enuBYwq-hw', 'prod_emM2OXB6Px', 'products/televiseurs/xiaomi-tv-a-pro.webp', 'Xiaomi TV A Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_WS06tcRKKL', 'prod_emM2OXB6Px', 'Black - 32"', 'XIAO-LMMJIV-EGJT', 110000, 10, '{"color":"Black","storage":"32\""}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_srYjACsO3V', 'prod_emM2OXB6Px', 'Black - 43"', 'XIAO-LMMJIV-BEEO', 110000, 10, '{"color":"Black","storage":"43\""}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_32qLynT2Q0', 'prod_emM2OXB6Px', 'Black - 55"', 'XIAO-LMMJIV-BZQD', 110000, 10, '{"color":"Black","storage":"55\""}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_c2qQeDFYKX', 'cat_televiseurs', 'Xiaomi TV A', 'xiaomi-tv-a-5kCko6', 250000, NULL, 'XIAO-FX7LLU', 'Xiaomi', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_GguBGFDgwi', 'prod_c2qQeDFYKX', 'products/televiseurs/xiaomi-tv-a.webp', 'Xiaomi TV A', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_13q9BQm38z', 'prod_c2qQeDFYKX', 'Black - 55"', 'XIAO-FX7LLU-4DPQ', 250000, 10, '{"color":"Black","storage":"55\""}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_O5Pd0grAGK', 'prod_c2qQeDFYKX', 'Black - 65"', 'XIAO-FX7LLU-OD_R', 250000, 10, '{"color":"Black","storage":"65\""}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Tza0ldKVoU', 'cat_televiseurs', 'Écran Lenovo 27" Incurvé Gaming', 'ecran-lenovo-27-incurve-gaming-Ti4tp1', 195000, NULL, 'ÉCRA-ZOVJKN', 'Écran', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Wq7GUQ3-Kt', 'prod_Tza0ldKVoU', 'products/televiseurs/ecran-lenovo-27-incurve-gaming.webp', 'Écran Lenovo 27" Incurvé Gaming', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_hdNo6Io3FB', 'prod_Tza0ldKVoU', 'Black - 27"', 'ÉCRA-ZOVJKN-TYDX', 195000, 10, '{"color":"Black","storage":"27\""}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_JMASj_-Dzf', 'cat_televiseurs', 'Écran Lenovo 34" Incurvé Gaming', 'ecran-lenovo-34-incurve-gaming-Kubgd1', 360000, NULL, 'ÉCRA-SNW3LY', 'Écran', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_y9VNh91oMb', 'prod_JMASj_-Dzf', 'products/televiseurs/ecran-lenovo-34-incurve-gaming.webp', 'Écran Lenovo 34" Incurvé Gaming', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_wE021Q3YE_', 'prod_JMASj_-Dzf', 'Black - 34"', 'ÉCRA-SNW3LY-EZRE', 360000, 10, '{"color":"Black","storage":"34\""}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_peMnujvfPX', 'cat_televiseurs', 'Écran Philips 34" Incurvé Gaming', 'ecran-philips-34-incurve-gaming-1L3s4p', 390000, NULL, 'ÉCRA-4RHGJT', 'Écran', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_SVJy-PVokV', 'prod_peMnujvfPX', 'products/televiseurs/ecran-philips-34-incurve-gaming.webp', 'Écran Philips 34" Incurvé Gaming', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_n1Kc3CkTuQ', 'prod_peMnujvfPX', 'Black - 34"', 'ÉCRA-4RHGJT-R2UE', 390000, 10, '{"color":"Black","storage":"34\""}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_yHHlg97Pem', 'cat_projecteurs', 'Xiaomi Smart Projector L1 Pro', 'xiaomi-smart-projector-l1-pro-HjfjnI', 300000, NULL, 'XIAO-UXO3MP', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_7UDRMg2mmJ', 'prod_yHHlg97Pem', 'products/projecteurs/xiaomi-smart-projector-l1-pro.webp', 'Xiaomi Smart Projector L1 Pro', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_5gBDflPTEv', 'prod_yHHlg97Pem', 'White - N/A', 'XIAO-UXO3MP-_XXM', 300000, 10, '{"color":"White","storage":"N/A"}');

COMMIT;
