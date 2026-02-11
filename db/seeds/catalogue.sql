-- NETEREKA Product Catalogue (auto-generated from WordPress)
-- Generated with: npx tsx scripts/import-from-wp.ts

PRAGMA foreign_keys = OFF;

-- Clean existing data
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM reviews;
DELETE FROM wishlist;
DELETE FROM product_images;
DELETE FROM product_variants;
DELETE FROM products;
DELETE FROM categories;

PRAGMA foreign_keys = ON;

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
INSERT INTO categories (id, name, slug, description, sort_order) VALUES ('cat_imprimantes', 'Imprimantes', 'imprimantes', 'Imprimantes et scanners', 10);
INSERT INTO categories (id, name, slug, description, sort_order) VALUES ('cat_reseau', 'Réseau', 'reseau', 'Routeurs et accessoires réseau', 11);

-- Products
INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_H1T_kUu5tb', 'cat_smartphones', 'REDMI Note 15 Pro+ 5G', 'redmi-note-15-pro-plus-5g-n-ORpG', 215000, NULL, 'XIAO-UJZ_7L', 'Xiaomi', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_0O1rv4q_hR', 'prod_H1T_kUu5tb', 'products/smartphones/redmi-note-15-pro-plus-5g.webp', 'REDMI Note 15 Pro+ 5G', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_ZobSISFTpu', 'cat_smartphones', 'Redmi Note 15', 'redmi-note-15-23mR3e', 110000, NULL, 'XIAO-JQRWVG', 'Xiaomi', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_o6V6yZSM16', 'prod_ZobSISFTpu', 'products/smartphones/redmi-note-15.webp', 'Redmi Note 15', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_zC9ZrF3nor', 'cat_smartphones', 'Redmi Note 15 Pro', 'redmi-note-15-pro-oBuOEn', 145000, NULL, 'XIAO-TRBTOF', 'Xiaomi', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_NOlC_Ag4yG', 'prod_zC9ZrF3nor', 'products/smartphones/redmi-note-15-pro.webp', 'Redmi Note 15 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Y2hMaI5i2-', 'cat_smartphones', 'HUAWEI NOVA 14I', 'huawei-nova-14i-ga82Gg', 150000, NULL, 'HUAW-KSRUQF', 'Huawei', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ss9OZGW26a', 'prod_Y2hMaI5i2-', 'products/smartphones/huawei-nova-14i.webp', 'HUAWEI NOVA 14I', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_XJy8ciwtSM', 'cat_smartphones', 'Samsung Galaxy A17', 'samsung-galaxy-a17-ND_y6d', 78000, NULL, 'SAMS-J3JO3T', 'Samsung', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_3j-z3KmSOP', 'prod_XJy8ciwtSM', 'products/smartphones/samsung-galaxy-a17.avif', 'Samsung Galaxy A17', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_wdeu06fH9E', 'cat_smartphones', 'HONOR Magic 8 Pro', 'honor-magic-8-pro-sAuc2D', 750000, NULL, 'HONO-MRXBZF', 'Honor', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ow8os5uvzv', 'prod_wdeu06fH9E', 'products/smartphones/honor-magic-8-pro.webp', 'HONOR Magic 8 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_x7jfx0NWLo', 'cat_montres', 'Huawei Watch D2', 'huawei-watch-d2-H9lSJe', 270000, 280000, 'HUAW-AKVSEE', 'Huawei', 1, 1, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_k3ikr_Gnva', 'prod_x7jfx0NWLo', 'products/montres-connectees/huawei-watch-d2.webp', 'Huawei Watch D2', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_FDafNLx40d', 'cat_ecouteurs', 'Sony WH-1000XM5 – Casque audio Bluetooth à réduction de bruit – Noir', 'sony-wh-1000xm5-casque-audio-bluetooth-a-reduction-de-bruit-noir-DLi3d6', 280000, NULL, 'SONY-5EHBVG', 'Sony', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_eIJT1fZFnU', 'prod_FDafNLx40d', 'products/ecouteurs/sony-wh-1000xm5-casque-audio-bluetooth-a-reduction-de-bruit-noir.avif', 'Sony WH-1000XM5 – Casque audio Bluetooth à réduction de bruit – Noir', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_ogszJmqVeJ', 'cat_jeux', 'Console Sony PS5 Slim Edition Standard + EA SPORTS FC 26', 'console-sony-ps5-slim-edition-standard-plus-ea-sports-fc-26-n3WGka', 400000, NULL, 'SONY-WMDMH8', 'Sony', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_1lXOvpWxYj', 'prod_ogszJmqVeJ', 'products/jeux/console-sony-ps5-slim-edition-standard-plus-ea-sports-fc-26.avif', 'Console Sony PS5 Slim Edition Standard + EA SPORTS FC 26', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_wBvV8CT3xc', 'cat_jeux', 'NBA 2K26 Switch 2', 'nba-2k26-switch-2-yByw-g', 38000, NULL, '2K G-DOSIRE', '2K Games', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_wm-giXpZX1', 'prod_wBvV8CT3xc', 'products/jeux/nba-2k26-switch-2.avif', 'NBA 2K26 Switch 2', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_K-mJ7W3q2o', 'cat_jeux', 'Légendes Pokémon : Z-A –', 'legendes-pokemon-z-a-yVy9bC', 48000, NULL, 'NINT-MK8GQ2', 'Nintendo', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_DQX7IFmSm7', 'prod_K-mJ7W3q2o', 'products/jeux/legendes-pokemon-z-a.avif', 'Légendes Pokémon : Z-A –', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_keRTHXu3TU', 'cat_jeux', 'The Legend of Zelda: Breath of the Wild – Switch 2 Edition', 'the-legend-of-zelda-breath-of-the-wild-switch-2-edition-lUwJts', 45000, NULL, 'NINT-EMRF99', 'Nintendo', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_JnfHyTqy_d', 'prod_keRTHXu3TU', 'products/jeux/the-legend-of-zelda-breath-of-the-wild-switch-2-edition.avif', 'The Legend of Zelda: Breath of the Wild – Switch 2 Edition', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_x8I_Ohz9nI', 'cat_jeux', 'EA SPORTS FC 26', 'ea-sports-fc-26-ymT_UP', 35000, NULL, 'EA-HBUSK1', 'EA', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_2RaSTJ2QGk', 'prod_x8I_Ohz9nI', 'products/jeux/ea-sports-fc-26.avif', 'EA SPORTS FC 26', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_EGWy7w5yWq', 'cat_jeux', 'Battlefield 6 (PC) – EA App Key – Global', 'battlefield-6-pc-ea-app-key-global-IJAgvO', 37000, NULL, 'EA-RZ4UA-', 'EA', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_nwqxmgWuMG', 'prod_EGWy7w5yWq', 'products/jeux/battlefield-6-pc-ea-app-key-global.webp', 'Battlefield 6 (PC) – EA App Key – Global', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_WroCKwT04q', 'cat_montres', 'Samsung Fit 3 R390', 'samsung-fit-3-r390-nvZnSP', 150000, NULL, 'SAMS-0KR4M1', 'Samsung', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_DgP8jL-x5u', 'prod_WroCKwT04q', 'products/montres-connectees/samsung-fit-3-r390.webp', 'Samsung Fit 3 R390', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_sSmRBUV0-l', 'cat_smartphones', 'Oneplus 15 512Go – Smartphone haut de gamme fluide et performant', 'oneplus-15-512go-smartphone-haut-de-gamme-fluide-et-performant-n_Kur9', 700000, NULL, 'ONEP-KZI3A5', 'OnePlus', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_kO8tFGM_fa', 'prod_sSmRBUV0-l', 'products/smartphones/oneplus-15-512go-smartphone-haut-de-gamme-fluide-et-performant.webp', 'Oneplus 15 512Go – Smartphone haut de gamme fluide et performant', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_SsQhFPEgkK', 'cat_smartphones', 'XIAOMI 15 Ultra 1TB', 'xiaomi-15-ultra-1tb-0les_t', 850000, NULL, 'XIAO-KHLGT4', 'Xiaomi', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_m3jHxd8L4o', 'prod_SsQhFPEgkK', 'products/smartphones/xiaomi-15-ultra-1tb.webp', 'XIAOMI 15 Ultra 1TB', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_ujzXf9DQF2', 'cat_smartphones', 'Honor Magic V5 16Go Ram 512Go', 'honor-magic-v5-16go-ram-512go-ROWkeN', 1000000, NULL, 'HONO-YRQDQJ', 'Honor', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_is1gOHWhbh', 'prod_ujzXf9DQF2', 'products/smartphones/honor-magic-v5-16go-ram-512go.webp', 'Honor Magic V5 16Go Ram 512Go', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_gX8acO807D', 'cat_smartphones', 'Google Pixel 10 Pro xl', 'google-pixel-10-pro-xl-BZHnNq', 650000, NULL, 'GOOG-RC6NME', 'Google', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Da3KEQn9eC', 'prod_gX8acO807D', 'products/smartphones/google-pixel-10-pro-xl.webp', 'Google Pixel 10 Pro xl', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_dS3i9128s3', 'cat_smartphones', 'Google Pixel 10 Pro 512Go', 'google-pixel-10-pro-512go-zrme_c', 800000, NULL, 'GOOG-TY1S4Q', 'Google', 1, 1, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_7QP89P0BAp', 'prod_dS3i9128s3', 'products/smartphones/google-pixel-10-pro-512go.webp', 'Google Pixel 10 Pro 512Go', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_JOQS7bEgNq', 'cat_smartphones', 'Samsung Z TRIFOLD', 'samsung-z-trifold-itaOfh', 3000000, NULL, 'SAMS-DR74RV', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_1fw0P23qdP', 'prod_JOQS7bEgNq', 'products/smartphones/samsung-z-trifold.webp', 'Samsung Z TRIFOLD', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_7xzMb1SjF1', 'cat_smartphones', 'iPhone 17 Air', 'iphone-17-air-Vy-FV4', 650000, NULL, 'APPL-KXJQB0', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_lwV0NEsl31', 'prod_7xzMb1SjF1', 'products/smartphones/iphone-17-air.webp', 'iPhone 17 Air', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_f_8EZFtG7-', 'cat_smartphones', 'iPhone 17 Pro Max', 'iphone-17-pro-max-dzzjw0', 950000, NULL, 'APPL-WFDGB7', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_M27rutd1Nv', 'prod_f_8EZFtG7-', 'products/smartphones/iphone-17-pro-max.webp', 'iPhone 17 Pro Max', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_-kWc9KupiC', 'cat_smartphones', 'iPhone 17 Pro', 'iphone-17-pro-10j8E-', 880000, NULL, 'APPL-LWVTEU', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_UdWUbZ1tQo', 'prod_-kWc9KupiC', 'products/smartphones/iphone-17-pro-max.webp', 'iPhone 17 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_EzZ7Mbq-Lz', 'cat_smartphones', 'Apple iPhone 17 5G smartphone – Puissance, design et iOS 19', 'apple-iphone-17-5g-smartphone-puissance-design-et-ios-19-GMtxhf', 630000, NULL, 'APPL-QIRZF3', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_EdhfJFGBkg', 'prod_EzZ7Mbq-Lz', 'products/smartphones/apple-iphone-17-5g-smartphone-puissance-design-et-ios-19.webp', 'Apple iPhone 17 5G smartphone – Puissance, design et iOS 19', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_WB8OVpGctm', 'cat_tablettes', 'REDMAGIC Nova Gaming', 'redmagic-nova-gaming-15BNnv', 500000, NULL, 'REDM-YEQM_L', 'RedMagic', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_7jQweN4XcA', 'prod_WB8OVpGctm', 'products/tablettes/redmagic-nova-gaming.webp', 'REDMAGIC Nova Gaming', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_LQhETW8Htz', 'cat_ecouteurs', 'OnePlus Buds Pro 3', 'oneplus-buds-pro-3-lp1hDH', 150000, NULL, 'ONEP-FWMOY8', 'OnePlus', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_6rH5P5h2Er', 'prod_LQhETW8Htz', 'products/ecouteurs/oneplus-buds-pro-3.webp', 'OnePlus Buds Pro 3', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_3PZF_tT99v', 'cat_tablettes', 'OnePlus Pad 3', 'oneplus-pad-3-EuZ9Yl', 580000, NULL, 'ONEP-8YRXWE', 'OnePlus', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_U5B8cPKjgl', 'prod_3PZF_tT99v', 'products/tablettes/oneplus-pad-3.webp', 'OnePlus Pad 3', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_fQFRfbwJzF', 'cat_montres', 'Samsung Watch 8', 'samsung-watch-8-2lzeTU', 250000, 400000, 'SAMS-AWFE04', 'Samsung', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_iXkDlEdd8a', 'prod_fQFRfbwJzF', 'products/montres-connectees/samsung-watch-8.webp', 'Samsung Watch 8', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_bqacYgp6gE', 'prod_fQFRfbwJzF', 'Classic 44mm', 'SAMS-AWFE04-N9U8', 400000, 10, '{"style":"Classic 44mm"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_05PzA1_nIK', 'cat_ecouteurs', 'Galaxy Buds 3 Pro', 'galaxy-buds-3-pro-uetRvV', 120000, NULL, 'SAMS-EHMA-P', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_aHjVzabwu-', 'prod_05PzA1_nIK', 'products/ecouteurs/galaxy-buds-3-pro.webp', 'Galaxy Buds 3 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_GwJq3woxNL', 'cat_ecouteurs', 'Galaxy Buds 3', 'galaxy-buds-3-fR5f8r', 100000, NULL, 'SAMS-RJPKI1', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_z3z8e3oC4i', 'prod_GwJq3woxNL', 'products/ecouteurs/galaxy-buds-3.webp', 'Galaxy Buds 3', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_WAQOPQ_04y', 'cat_smartphones', 'Galaxy Z Fold 7', 'galaxy-z-fold-7-U5k0_v', 950000, NULL, 'SAMS-IJC0UX', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_vj9eYve2_S', 'prod_WAQOPQ_04y', 'products/smartphones/galaxy-z-fold-7.webp', 'Galaxy Z Fold 7', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_-0sxVrzEHI', 'cat_smartphones', 'Redmagic 10S Pro', 'redmagic-10s-pro-zqxt7B', 600000, NULL, 'REDM-SJL2BC', 'RedMagic', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_or_lqSUDIN', 'prod_-0sxVrzEHI', 'products/smartphones/redmagic-10s-pro.webp', 'Redmagic 10S Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_KN-XyGICfE', 'cat_smartphones', 'OnePlus Nord 5', 'oneplus-nord-5-P0BtHY', 500000, NULL, 'ONEP-RJMY86', 'OnePlus', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_mDkRygRDZi', 'prod_KN-XyGICfE', 'products/smartphones/oneplus-nord-5.webp', 'OnePlus Nord 5', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_oTwstZudZ9', 'cat_smartphones', 'OnePlus Nord CE4 Lite', 'oneplus-nord-ce4-lite-zwbHZ1', 200000, NULL, 'ONEP-JBJWRF', 'OnePlus', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_fqCASDbvs5', 'prod_oTwstZudZ9', 'products/smartphones/oneplus-nord-ce4-lite.webp', 'OnePlus Nord CE4 Lite', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_w4Mde4LH3J', 'cat_smartphones', 'OnePlus 13S', 'oneplus-13s-Z1yCIc', 450000, NULL, 'ONEP-LAUD5K', 'OnePlus', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_qsoeY0Md13', 'prod_w4Mde4LH3J', 'products/smartphones/oneplus-13s.webp', 'OnePlus 13S', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_6U2PGeYZ9X', 'cat_smartphones', 'OnePlus 13R', 'oneplus-13r-ZE3Ywm', 300000, NULL, 'ONEP-XFTFVV', 'OnePlus', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_yS9Ane3ELZ', 'prod_6U2PGeYZ9X', 'products/smartphones/oneplus-13r.webp', 'OnePlus 13R', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_ahpoVYy8Tt', 'cat_smartphones', 'OnePlus 13', 'oneplus-13-QvOrwn', 530000, NULL, 'ONEP-5INY_O', 'OnePlus', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_baEmWy2qwi', 'prod_ahpoVYy8Tt', 'products/smartphones/oneplus-13.webp', 'OnePlus 13', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_0HhIMIoqDM', 'cat_smartphones', 'Nothing Phone 3a', 'nothing-phone-3a-TfQVmF', 350000, NULL, 'NOTH--2SGMO', 'Nothing', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_JpkwAfxFVu', 'prod_0HhIMIoqDM', 'products/smartphones/nothing-phone-3a.webp', 'Nothing Phone 3a', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_r-49OyyER8', 'cat_smartphones', 'Nothing Phone 2a', 'nothing-phone-2a-eygAvJ', 370000, NULL, 'NOTH-U6PX6A', 'Nothing', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_eDMfR_yzDC', 'prod_r-49OyyER8', 'products/smartphones/nothing-phone-2a.webp', 'Nothing Phone 2a', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_jiK5EME7CQ', 'cat_smartphones', 'Nothing Phone 2', 'nothing-phone-2-MpidIE', 530000, NULL, 'NOTH-J8L3YW', 'Nothing', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_WR7wEXf2j-', 'prod_jiK5EME7CQ', 'products/smartphones/nothing-phone-2.webp', 'Nothing Phone 2', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_tIJIh76wVr', 'cat_reseau', 'Huawei WiFi AX3', 'huawei-wifi-ax3-HCnpyJ', 50000, NULL, 'HUAW-Z9A5NS', 'Huawei', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_mg7R94D35N', 'prod_tIJIh76wVr', 'products/reseau/huawei-wifi-ax3.webp', 'Huawei WiFi AX3', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod__6kNvtJTP7', 'cat_reseau', 'Huawei WiFi BE3', 'huawei-wifi-be3-l0tfit', 100000, NULL, 'HUAW-8--2VE', 'Huawei', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_HSHVGmfc_W', 'prod__6kNvtJTP7', 'products/reseau/huawei-wifi-be3.webp', 'Huawei WiFi BE3', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_DRHPvhmk_O', 'cat_reseau', 'Huawei WiFi Mesh 3', 'huawei-wifi-mesh-3-85Ktd9', 170000, NULL, 'HUAW-RK4REB', 'Huawei', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_f_7FT0tyHf', 'prod_DRHPvhmk_O', 'products/reseau/huawei-wifi-mesh-3.webp', 'Huawei WiFi Mesh 3', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_K4uFMa4T9H', 'cat_montres', 'Huawei Watch Fit 4 Pro', 'huawei-watch-fit-4-pro-cLS8Cm', 180000, NULL, 'HUAW-KDM07M', 'Huawei', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Rr7BL5IetW', 'prod_K4uFMa4T9H', 'products/montres-connectees/huawei-watch-fit-4-pro.webp', 'Huawei Watch Fit 4 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_tFqzTg46i2', 'cat_montres', 'Huawei Watch GT 5 Pro 46mm Multicolore', 'huawei-watch-gt-5-pro-46mm-multicolore-aNKhbc', 300000, NULL, 'HUAW-K8HSTH', 'Huawei', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_zg5CtU-Cw5', 'prod_tFqzTg46i2', 'products/montres-connectees/huawei-watch-gt-5-pro-46mm-multicolore.webp', 'Huawei Watch GT 5 Pro 46mm Multicolore', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_7bKYW86_T5', 'cat_montres', 'Huawei Watch 4 Pro Space Edition', 'huawei-watch-4-pro-space-edition-QTIlhl', 380000, NULL, 'HUAW-IFE-FM', 'Huawei', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_g8x1cWqQj9', 'prod_7bKYW86_T5', 'products/montres-connectees/huawei-watch-4-pro-space-edition.webp', 'Huawei Watch 4 Pro Space Edition', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_2X0Eq6o7FJ', 'cat_montres', 'Huawei Watch 5', 'huawei-watch-5-WrujnT', 350000, 400000, 'HUAW-YLBNS3', 'Huawei', 1, 0, 40);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_CfbBR8TM5q', 'prod_2X0Eq6o7FJ', 'products/montres-connectees/huawei-watch-5.webp', 'Huawei Watch 5', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_fdIfNpI5CG', 'prod_2X0Eq6o7FJ', 'Titanium', 'HUAW-YLBNS3-XHFK', 370000, 10, '{"style":"Titanium"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_jZDGjeKQZ6', 'prod_2X0Eq6o7FJ', 'Brown Composite', 'HUAW-YLBNS3-IFMA', 350000, 10, '{"style":"Brown Composite"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_Pd79a8EUSH', 'prod_2X0Eq6o7FJ', 'Silver', 'HUAW-YLBNS3-YLOR', 400000, 10, '{"style":"Silver"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_MkCDI7TPz1', 'cat_montres', 'Huawei Watch Ultimate', 'huawei-watch-ultimate-0jtMk1', 470000, NULL, 'HUAW-DTTRN_', 'Huawei', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_cqhTMxsMbL', 'prod_MkCDI7TPz1', 'products/montres-connectees/huawei-watch-ultimate.webp', 'Huawei Watch Ultimate', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_kaQ_5koC3v', 'cat_ecouteurs', 'Huawei FreeArc', 'huawei-freearc-1CZL15', 150000, NULL, 'HUAW-PVKWUP', 'Huawei', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_OKwaeRWmPm', 'prod_kaQ_5koC3v', 'products/ecouteurs/huawei-freearc.webp', 'Huawei FreeArc', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_6CPNrUl7ZV', 'cat_ecouteurs', 'Huawei FreeClip', 'huawei-freeclip-uZAFqj', 150000, NULL, 'HUAW-NMN624', 'Huawei', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_6JXdNMo9Mj', 'prod_6CPNrUl7ZV', 'products/ecouteurs/huawei-freeclip.webp', 'Huawei FreeClip', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_s6Mp3GNcGL', 'cat_ecouteurs', 'FreeBuds 4 Pro', 'freebuds-4-pro-XxiT_P', 150000, NULL, 'HUAW-L46K5S', 'Huawei', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_YxSEwNBXW6', 'prod_s6Mp3GNcGL', 'products/ecouteurs/freebuds-4-pro.webp', 'FreeBuds 4 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_A7Tle7eHNx', 'cat_ecouteurs', 'FreeBuds 6i', 'freebuds-6i-CpUegz', 100000, NULL, 'HUAW-F8NDA5', 'Huawei', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_23ailPZvcd', 'prod_A7Tle7eHNx', 'products/ecouteurs/freebuds-6i.webp', 'FreeBuds 6i', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod__u9fSOWvTY', 'cat_ecouteurs', 'FreeBuds 6', 'freebuds-6-pq2FK7', 140000, NULL, 'HUAW-P8MJ0X', 'Huawei', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_BUCJEBHl0f', 'prod__u9fSOWvTY', 'products/ecouteurs/freebuds-6.webp', 'FreeBuds 6', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_NrM89lb7zk', 'cat_smartphones', 'Huawei Mate XT', 'huawei-mate-xt-Jqt4cy', 2030000, 2500000, 'HUAW-DTOIB_', 'Huawei', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_t4BQaXYE2a', 'prod_NrM89lb7zk', 'products/smartphones/huawei-mate-xt.webp', 'Huawei Mate XT', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_5j0dF9eP25', 'prod_NrM89lb7zk', '1TB', 'HUAW-DTOIB_-EIG-', 2500000, 10, '{"storage":"1TB"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_E_9LfqBjDi', 'prod_NrM89lb7zk', '512GB', 'HUAW-DTOIB_-W7IV', 2030000, 10, '{"storage":"512GB"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_fy8u7LX_nF', 'cat_smartphones', 'Huawei Mate X6', 'huawei-mate-x6-rYJt7c', 880000, NULL, 'HUAW-CZY98O', 'Huawei', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_TdyhAJ8xXr', 'prod_fy8u7LX_nF', 'products/smartphones/huawei-mate-x6.webp', 'Huawei Mate X6', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_cgzkWeiQ0J', 'cat_smartphones', 'Huawei Mate X3', 'huawei-mate-x3-_NDxgR', 700000, NULL, 'HUAW-UQ14MP', 'Huawei', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_GFbNDWvrY7', 'prod_cgzkWeiQ0J', 'products/smartphones/huawei-mate-x3.webp', 'Huawei Mate X3', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_1x-cTEOJIk', 'cat_smartphones', 'Huawei Pura 70 Ultra', 'huawei-pura-70-ultra-9K7ROk', 600000, NULL, 'HUAW-BWU9E_', 'Huawei', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_WGhq8Zd9qO', 'prod_1x-cTEOJIk', 'products/smartphones/huawei-pura-70-ultra.webp', 'Huawei Pura 70 Ultra', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_6dz2vhus4_', 'cat_smartphones', 'Huawei Pura 70 Pro', 'huawei-pura-70-pro-ytLeBh', 480000, NULL, 'HUAW-UCMQSF', 'Huawei', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ZFBk98i9nv', 'prod_6dz2vhus4_', 'products/smartphones/huawei-pura-70-pro.webp', 'Huawei Pura 70 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_mu4_rNozMU', 'cat_smartphones', 'Huawei Pura 70', 'huawei-pura-70-0iX5YX', 310000, NULL, 'HUAW-QAXKPJ', 'Huawei', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_3z65NGApit', 'prod_mu4_rNozMU', 'products/smartphones/huawei-pura-70.webp', 'Huawei Pura 70', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_l4pbrtOn8L', 'cat_smartphones', 'Huawei Nova 11 Pro', 'huawei-nova-11-pro-BIMjhn', 480000, NULL, 'HUAW-8IIPGZ', 'Huawei', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_FY8ogbe0ST', 'prod_l4pbrtOn8L', 'products/smartphones/huawei-nova-11-pro.webp', 'Huawei Nova 11 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_SHNZQJsptL', 'cat_smartphones', 'Huawei Nova 12i', 'huawei-nova-12i-Ls4G18', 150000, NULL, 'HUAW-RYL4U6', 'Huawei', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_lBcBJQPcKp', 'prod_SHNZQJsptL', 'products/smartphones/huawei-nova-12i.webp', 'Huawei Nova 12i', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_8gDz9bLiON', 'cat_smartphones', 'Huawei Nova 12s', 'huawei-nova-12s-E7rWx4', 185000, NULL, 'HUAW-BJDJHL', 'Huawei', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Jnq_wVBCKp', 'prod_8gDz9bLiON', 'products/smartphones/huawei-nova-12s.webp', 'Huawei Nova 12s', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_8QMQGeeFHO', 'cat_smartphones', 'Honor Magic V3', 'honor-magic-v3-1wzQDO', 850000, NULL, 'HONO-NCJMCG', 'Honor', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_4hdDiTbnpG', 'prod_8QMQGeeFHO', 'products/smartphones/honor-magic-v3.webp', 'Honor Magic V3', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_mQ3Ux-Q09Z', 'cat_smartphones', 'Honor Magic V2', 'honor-magic-v2-10teMK', 650000, NULL, 'HONO-LLFPFC', 'Honor', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_XMzAVOdedN', 'prod_mQ3Ux-Q09Z', 'products/smartphones/honor-magic-v2.webp', 'Honor Magic V2', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_2k5FOswvC1', 'cat_smartphones', 'Honor Magic 7 Pro', 'honor-magic-7-pro-EiD_tC', 630000, NULL, 'HONO-IG66FO', 'Honor', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_0qEXyiYV_u', 'prod_2k5FOswvC1', 'products/smartphones/honor-magic-7-pro.webp', 'Honor Magic 7 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_ZmKu5i5FNP', 'cat_smartphones', 'Honor Magic 6 Pro', 'honor-magic-6-pro-6E2e-W', 520000, NULL, 'HONO-KOLCSI', 'Honor', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_1pMZD460rm', 'prod_ZmKu5i5FNP', 'products/smartphones/honor-magic-6-pro.webp', 'Honor Magic 6 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Qnj2zeU2jH', 'cat_smartphones', 'Honor 400 Pro', 'honor-400-pro-u0iOYo', 480000, NULL, 'HONO-O8TERL', 'Honor', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_iQS2C98kwe', 'prod_Qnj2zeU2jH', 'products/smartphones/honor-400-pro.webp', 'Honor 400 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_1yXZhImK7N', 'cat_tablettes', 'HONOR PAD 10', 'honor-pad-10-D3WJDq', 300000, NULL, 'HONO-MGKUJ1', 'Honor', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_LGYzW8H6AE', 'prod_1yXZhImK7N', 'products/tablettes/honor-pad-10.webp', 'HONOR PAD 10', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_ggBgQP7CTP', 'cat_smartphones', 'Honor 200', 'honor-200-GhVcX-', 300000, NULL, 'HONO-MKL_U0', 'Honor', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_MNWXW0RG-c', 'prod_ggBgQP7CTP', 'products/smartphones/honor-200.webp', 'Honor 200', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_iA38Yvkusm', 'cat_smartphones', 'Honor 400 Lite', 'honor-400-lite-ge2iz-', 210000, NULL, 'HONO-EFP1KJ', 'Honor', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ZzX4ki4777', 'prod_iA38Yvkusm', 'products/smartphones/honor-400-lite.webp', 'Honor 400 Lite', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_u0uFD3FAVo', 'cat_smartphones', 'Honor X9C', 'honor-x9c-duMFqu', 210000, NULL, 'HONO-SQBR4C', 'Honor', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_E8C5WLkHUx', 'prod_u0uFD3FAVo', 'products/smartphones/honor-x9c.webp', 'Honor X9C', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_CIWRzfQt6L', 'cat_smartphones', 'Honor X7C', 'honor-x7c-lvEB1C', 140000, NULL, 'HONO-528AO2', 'Honor', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_LFfErjFBqe', 'prod_CIWRzfQt6L', 'products/smartphones/honor-x7c.webp', 'Honor X7C', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_UVySsqv7h8', 'cat_smartphones', 'Honor X7B', 'honor-x7b-OIY1k8', 130000, NULL, 'HONO-IS7OEY', 'Honor', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_qtmuTxcBjA', 'prod_UVySsqv7h8', 'products/smartphones/honor-x7b.webp', 'Honor X7B', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Z2pYjK3y7m', 'cat_imprimantes', 'IMPRIMANTE A RESERVOIRE Epson L8050   RPLCE L805  Intégré, Wi-Fi,USB', 'imprimante-a-reservoire-epson-l8050-rplce-l805-integre-wi-fi-usb-f74lXa', 255000, NULL, 'EPSO-SMMALG', 'Epson', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_lorWNPHs-6', 'prod_Z2pYjK3y7m', 'products/imprimantes/imprimante-a-reservoire-epson-l8050-rplce-l805-integre-wi-fi-usb.webp', 'IMPRIMANTE A RESERVOIRE Epson L8050   RPLCE L805  Intégré, Wi-Fi,USB', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_n-OicsgpqF', 'cat_imprimantes', 'IMPRIMANTE JET  A RESERVOIR   Epson L850', 'imprimante-jet-a-reservoir-epson-l850-f5HbK7', 360000, NULL, 'EPSO-SWQMQ4', 'Epson', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_yI-QOp28_L', 'prod_n-OicsgpqF', 'products/imprimantes/imprimante-jet-a-reservoir-epson-l850.webp', 'IMPRIMANTE JET  A RESERVOIR   Epson L850', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_WcD6cZGAJD', 'cat_imprimantes', 'IMPRIAMNTE JET A RESERVOIR  EPSON L 18050', 'impriamnte-jet-a-reservoir-epson-l-18050-dXqk82', 500000, NULL, 'EPSO-37LVBH', 'Epson', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_N6sOwE0XzU', 'prod_WcD6cZGAJD', 'products/imprimantes/impriamnte-jet-a-reservoir-epson-l-18050.webp', 'IMPRIAMNTE JET A RESERVOIR  EPSON L 18050', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_C91oansxhU', 'cat_imprimantes', 'IMPRIMANTE Canon Pixma G3430 WIFI', 'imprimante-canon-pixma-g3430-wifi-kR0H_E', 85000, NULL, 'CANO-MH-ZI5', 'Canon', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_PKZAwz7CXR', 'prod_C91oansxhU', 'products/imprimantes/imprimante-canon-pixma-g3430-wifi.webp', 'IMPRIMANTE Canon Pixma G3430 WIFI', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_wK2wr1-aZp', 'cat_ordinateurs', 'LENOVO THINKBOOK', 'lenovo-thinkbook-gr4TOY', 585000, NULL, 'LENO-V_1_YG', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_9OvdSmxEI7', 'prod_wK2wr1-aZp', 'products/ordinateurs/lenovo-thinkbook.webp', 'LENOVO THINKBOOK', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_5HwcBOsvt1', 'cat_ordinateurs', 'LENOVO THINKBOOK 14″ G6 – Intel Core i7 – 16Go RAM – 512Go SSD', 'lenovo-thinkbook-14-g6-intel-core-i7-16go-ram-512go-ssd-QRWWkB', 585000, NULL, 'LENO-XKLYYP', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_UIxFOqGO04', 'prod_5HwcBOsvt1', 'products/ordinateurs/lenovo-thinkbook-14-g6-intel-core-i7-16go-ram-512go-ssd.webp', 'LENOVO THINKBOOK 14″ G6 – Intel Core i7 – 16Go RAM – 512Go SSD', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_hEBcwHU2J_', 'cat_ordinateurs', 'LENOVO THINKPAD E14 G5 CORE I7 16GO RAAM 512SSD', 'lenovo-thinkpad-e14-g5-core-i7-16go-raam-512ssd-ZrSJwH', 770000, NULL, 'LENO-X5LRGQ', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_HFZVwLRs5n', 'prod_hEBcwHU2J_', 'products/ordinateurs/lenovo-thinkpad-e14-g5-core-i7-16go-raam-512ssd.webp', 'LENOVO THINKPAD E14 G5 CORE I7 16GO RAAM 512SSD', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_TATqTfT9Lb', 'cat_ordinateurs', 'Lenovo ThinkPad E16 – Intel Core i7, 16 Go RAM, SSD 512 Go, Carte Graphique 2 Go, Écran 16” – Neuf', 'lenovo-thinkpad-e16-intel-core-i7-16-go-ram-ssd-512-go-carte-graphique-2-go-ecran-16-neuf-mgGA2E', 650000, NULL, 'LENO-0TQRZB', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_EG-xeDbXtX', 'prod_TATqTfT9Lb', 'products/ordinateurs/lenovo-thinkpad-e16-intel-core-i7-16-go-ram-ssd-512-go-carte-graphique-2-go-ecran-16-neuf.webp', 'Lenovo ThinkPad E16 – Intel Core i7, 16 Go RAM, SSD 512 Go, Carte Graphique 2 Go, Écran 16” – Neuf', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_UuIihsJ7ip', 'cat_ordinateurs', 'Lenovo ThinkPad E15 – Intel Core i7, 16 Go RAM, SSD 512 Go, Carte Graphique 2 Go, 15,6” – Neuf', 'lenovo-thinkpad-e15-intel-core-i7-16-go-ram-ssd-512-go-carte-graphique-2-go-15-6-neuf-yzWxob', 675000, NULL, 'LENO-90XSMR', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_fSbZI-PlKf', 'prod_UuIihsJ7ip', 'products/ordinateurs/lenovo-thinkpad-e15-intel-core-i7-16-go-ram-ssd-512-go-carte-graphique-2-go-15-6-neuf.webp', 'Lenovo ThinkPad E15 – Intel Core i7, 16 Go RAM, SSD 512 Go, Carte Graphique 2 Go, 15,6” – Neuf', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_rjO1g8-I57', 'cat_ordinateurs', 'Lenovo Yoga 9 16 x360 Tactile – Intel Core Ultra 7, 16 Go RAM, SSD 512 Go, Écran 16” – Neuf', 'lenovo-yoga-9-16-x360-tactile-intel-core-ultra-7-16-go-ram-ssd-512-go-ecran-16-neuf-uM_qZj', 790000, NULL, 'LENO-MPE8B1', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_4PfrdBa5s3', 'prod_rjO1g8-I57', 'products/ordinateurs/lenovo-yoga-9-16-x360-tactile-intel-core-ultra-7-16-go-ram-ssd-512-go-ecran-16-neuf.webp', 'Lenovo Yoga 9 16 x360 Tactile – Intel Core Ultra 7, 16 Go RAM, SSD 512 Go, Écran 16” – Neuf', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_pT12vv_qXp', 'cat_ordinateurs', 'Dell Vostro 3520 – Intel Core i7, 8 Go RAM, SSD 512 Go, Écran 15,6” – Clavier AZERTY Français – Neuf', 'dell-vostro-3520-intel-core-i7-8-go-ram-ssd-512-go-ecran-15-6-clavier-azerty-francais-neuf-QRSIhw', 480000, NULL, 'DELL-FP7SLA', 'Dell', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Tkt9WWZ6vA', 'prod_pT12vv_qXp', 'products/ordinateurs/dell-vostro-3520-intel-core-i7-8-go-ram-ssd-512-go-ecran-15-6-clavier-azerty-francais-neuf.webp', 'Dell Vostro 3520 – Intel Core i7, 8 Go RAM, SSD 512 Go, Écran 15,6” – Clavier AZERTY Français – Neuf', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_pGk28FR813', 'cat_televiseurs', 'Écran Philips 34” Incurvé Gaming – UltraWide, Display 346P1CRH', 'ecran-philips-34-incurve-gaming-ultrawide-display-346p1crh-JPlDuS', 400000, NULL, 'PHIL-9QQ7PV', 'Philips', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_KdF6tWXitw', 'prod_pGk28FR813', 'products/televiseurs/ecran-philips-34-incurve-gaming-ultrawide-display-346p1crh.webp', 'Écran Philips 34” Incurvé Gaming – UltraWide, Display 346P1CRH', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_JcEPC9xecu', 'cat_televiseurs', 'Écran Lenovo 34” Incurvé Gaming – UltraWide, G34w-30', 'ecran-lenovo-34-incurve-gaming-ultrawide-g34w-30-fGIgen', 380000, NULL, 'LENO-UVKG2I', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_KloR6banDb', 'prod_JcEPC9xecu', 'products/televiseurs/ecran-lenovo-34-incurve-gaming-ultrawide-g34w-30.webp', 'Écran Lenovo 34” Incurvé Gaming – UltraWide, G34w-30', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_ZDhvmDigHm', 'cat_televiseurs', 'Écran Lenovo 27” Incurvé Gaming – Display R27FC-30', 'ecran-lenovo-27-incurve-gaming-display-r27fc-30-lPZ9tc', 210000, NULL, 'LENO-IDBOUV', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Q82Yh62w4-', 'prod_ZDhvmDigHm', 'products/ordinateurs/lenovo-yoga-9-16-x360-tactile-intel-core-ultra-7-16-go-ram-ssd-512-go-ecran-16-neuf.webp', 'Écran Lenovo 27” Incurvé Gaming – Display R27FC-30', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Wt-Gw1XjZh', 'cat_ordinateurs', 'Ordinateur de Bureau Lenovo ThinkCentre Neo 50t Gen 5 – Intel Core i3, 8 Go RAM, SSD 512 Go + Écran 22”', 'ordinateur-de-bureau-lenovo-thinkcentre-neo-50t-gen-5-intel-core-i3-8-go-ram-ssd-512-go-plus-ecran-22-_CCWUg', 315000, NULL, 'LENO-D4F6NS', 'Lenovo', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_mUnG8RnP8v', 'prod_Wt-Gw1XjZh', 'products/ordinateurs/ordinateur-de-bureau-lenovo-thinkcentre-neo-50t-gen-5-intel-core-i3-8-go-ram-ssd-512-go-plus-ecran-22.webp', 'Ordinateur de Bureau Lenovo ThinkCentre Neo 50t Gen 5 – Intel Core i3, 8 Go RAM, SSD 512 Go + Écran 22”', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_jVS9rgbD2y', 'cat_ordinateurs', 'Ordinateur de Bureau Dell Vostro 3030MT – Intel Core i7 14ᵉ Génération, 8 Go RAM, SSD 512 Go, DVD, DOS + Écran 22" FHD', 'ordinateur-de-bureau-dell-vostro-3030mt-intel-core-i7-14-generation-8-go-ram-ssd-512-go-dvd-dos-plus-ecran-22-fhd-p-_gzp', 455000, NULL, 'DELL-R1ANMD', 'Dell', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_3NtHgyZLth', 'prod_jVS9rgbD2y', 'products/ordinateurs/ordinateur-de-bureau-dell-vostro-3030mt-intel-core-i7-14-generation-8-go-ram-ssd-512-go-dvd-dos-plus-ecran-22-fhd.webp', 'Ordinateur de Bureau Dell Vostro 3030MT – Intel Core i7 14ᵉ Génération, 8 Go RAM, SSD 512 Go, DVD, DOS + Écran 22" FHD', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod__06JleTHiE', 'cat_ordinateurs', 'Ordinateur de Bureau Dell Vostro 3030MT – Intel Core i3 14ᵉ Génération, 8 Go RAM, SSD 512 Go, DVD, DOS + Écran 22" FHD', 'ordinateur-de-bureau-dell-vostro-3030mt-intel-core-i3-14-generation-8-go-ram-ssd-512-go-dvd-dos-plus-ecran-22-fhd-zHY7cq', 300000, NULL, 'DELL-HHXB-3', 'Dell', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_rpyGHq0EA8', 'prod__06JleTHiE', 'products/ordinateurs/ordinateur-de-bureau-dell-vostro-3030mt-intel-core-i7-14-generation-8-go-ram-ssd-512-go-dvd-dos-plus-ecran-22-fhd.webp', 'Ordinateur de Bureau Dell Vostro 3030MT – Intel Core i3 14ᵉ Génération, 8 Go RAM, SSD 512 Go, DVD, DOS + Écran 22" FHD', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_og_EcJb8jd', 'cat_ordinateurs', 'BUREAU HP PRODESK 400 G9 i5/8GB/512 SSD/ECRAN22″G5 HDMI VGA FHD 13th', 'bureau-hp-prodesk-400-g9-i5-8gb-512-ssd-ecran22-g5-hdmi-vga-fhd-13th-exSojB', 440000, NULL, 'HP-RUWMZP', 'HP', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Scbkm2oz41', 'prod_og_EcJb8jd', 'products/ordinateurs/bureau-hp-prodesk-400-g9-i5-8gb-512-ssd-ecran22-g5-hdmi-vga-fhd-13th.webp', 'BUREAU HP PRODESK 400 G9 i5/8GB/512 SSD/ECRAN22″G5 HDMI VGA FHD 13th', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_0ByozO0iTO', 'cat_ordinateurs', 'BUREAU HP 290-G9 i5/8Gb/512 SSD/ECRAN22″G5 HDMI VGA 12 TH', 'bureau-hp-290-g9-i5-8gb-512-ssd-ecran22-g5-hdmi-vga-12-th-bjQuX6', 370000, NULL, 'HP-MIM2BX', 'HP', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_16EXbIE-Ql', 'prod_0ByozO0iTO', 'products/ordinateurs/bureau-hp-290-g9-i5-8gb-512-ssd-ecran22-g5-hdmi-vga-12-th.webp', 'BUREAU HP 290-G9 i5/8Gb/512 SSD/ECRAN22″G5 HDMI VGA 12 TH', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_HeOrFxxRqg', 'cat_ordinateurs', 'Otdinateur de Bureau HP 290 G9 – Intel Core i3 12ᵉ Génération, 8 Go RAM, SSD 512 Go, Écran 22″ G5 HDMI/VGA', 'otdinateur-de-bureau-hp-290-g9-intel-core-i3-12-generation-8-go-ram-ssd-512-go-ecran-22-g5-hdmi-vga-UYarMf', 300000, NULL, 'HP-4FLCMB', 'HP', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_oKXhgD3Qg3', 'prod_HeOrFxxRqg', 'products/ordinateurs/bureau-hp-290-g9-i5-8gb-512-ssd-ecran22-g5-hdmi-vga-12-th.webp', 'Otdinateur de Bureau HP 290 G9 – Intel Core i3 12ᵉ Génération, 8 Go RAM, SSD 512 Go, Écran 22″ G5 HDMI/VGA', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_zTXnjOYv2R', 'cat_accessoires', 'AirTag (pack of 1)', 'airtag-pack-of-1-J6bwha', 30000, NULL, 'APPL-XDG3QB', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_EDJ88PH5l9', 'prod_zTXnjOYv2R', 'products/accessoires/airtag-pack-of-1.webp', 'AirTag (pack of 1)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_GKMlVAJDMC', 'cat_accessoires', 'AirTag (pack of 4)', 'airtag-pack-of-4-olT_Af', 100000, NULL, 'APPL-BJNSN-', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_19P6CpVpjb', 'prod_GKMlVAJDMC', 'products/accessoires/airtag-pack-of-4.webp', 'AirTag (pack of 4)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_0k8g7zLjhm', 'cat_accessoires', 'AirPods 4 ANC', 'airpods-4-anc-1SZw24', 135000, NULL, 'APPL-5FECII', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_W9U5rpfmKQ', 'prod_0k8g7zLjhm', 'products/accessoires/airpods-4-anc.webp', 'AirPods 4 ANC', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_8niGhOiGML', 'cat_accessoires', 'AirPods 4', 'airpods-4-sKIjoa', 100000, NULL, 'APPL-EGKBK0', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_xK4Ie-eiNE', 'prod_8niGhOiGML', 'products/accessoires/airpods-4-anc.webp', 'AirPods 4', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_XXBywLxHM0', 'cat_montres', 'Apple Watch Ultra 2', 'apple-watch-ultra-2-TienZe', 550000, 700000, 'APPL-BIP-CM', 'Apple', 1, 0, 30);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_1x3V8I2yOk', 'prod_XXBywLxHM0', 'products/montres-connectees/apple-watch-ultra-2.webp', 'Apple Watch Ultra 2', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_vFt0v2d8iN', 'prod_XXBywLxHM0', 'Milanese band', 'APPL-BIP-CM-_YYR', 700000, 10, '{"style":"Milanese band"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_it-qjs7MRi', 'prod_XXBywLxHM0', 'Titanium Natural', 'APPL-BIP-CM-4SWK', 550000, 10, '{"style":"Titanium Natural"}');
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_VajjhF7znd', 'prod_XXBywLxHM0', 'Titanium Black', 'APPL-BIP-CM-WNXU', 550000, 10, '{"style":"Titanium Black"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_cK2QZiTomD', 'cat_montres', 'Apple Watch Series 10', 'apple-watch-series-10-gS-fW9', 250000, 700000, 'APPL-VKPCPW', 'Apple', 1, 0, 20);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_DxtlJtcP0i', 'prod_cK2QZiTomD', 'products/montres-connectees/apple-watch-series-10.webp', 'Apple Watch Series 10', 0, 1);
INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('var_dNrDpLAmYO', 'prod_cK2QZiTomD', 'Milanese', 'APPL-VKPCPW-HNEA', 700000, 10, '{"style":"Milanese"}');

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_JjMUfISZzC', 'cat_montres', 'Apple Watch Series 9', 'apple-watch-series-9-bBUAQm', 280000, NULL, 'APPL-YGLPPM', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_kfDwkGsb3q', 'prod_JjMUfISZzC', 'products/montres-connectees/apple-watch-series-9.webp', 'Apple Watch Series 9', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Zzi3oRyB_A', 'cat_montres', 'Apple Watch SE', 'apple-watch-se-jcB7bi', 170000, NULL, 'APPL-CIFJ3V', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_w3bUhXbUEJ', 'prod_Zzi3oRyB_A', 'products/montres-connectees/apple-watch-se.webp', 'Apple Watch SE', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_8wSguDqFde', 'cat_accessoires', 'Apple TV 4K 128Gb (2025)', 'apple-tv-4k-128gb-2025-_NebBj', 190000, NULL, 'APPL-TKLJ0-', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_G21Fu2rB6Y', 'prod_8wSguDqFde', 'products/accessoires/apple-tv-4k-128gb-2025.webp', 'Apple TV 4K 128Gb (2025)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_VBEtmNGmAv', 'cat_accessoires', 'Trackpad (White) (2025)', 'trackpad-white-2025-tWRUV8', 180000, NULL, 'APPL-8L5GCY', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_kuhHcY4T94', 'prod_VBEtmNGmAv', 'products/accessoires/trackpad-white-2025.webp', 'Trackpad (White) (2025)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Rlr50X3eJx', 'cat_accessoires', 'Magic Mouse USB-C (White)', 'magic-mouse-usb-c-white-1EwJpy', 120000, NULL, 'APPL-15DAGD', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_s8fvG9gpmh', 'prod_Rlr50X3eJx', 'products/accessoires/magic-mouse-usb-c-white.webp', 'Magic Mouse USB-C (White)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_IMGmSoMu3l', 'cat_accessoires', 'Magic Mouse USB-C (Black)', 'magic-mouse-usb-c-black-EUylwf', 110000, NULL, 'APPL-9QWLY_', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_1BmMgekKpJ', 'prod_IMGmSoMu3l', 'products/accessoires/magic-mouse-usb-c-black.webp', 'Magic Mouse USB-C (Black)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_7lzFXTUIjV', 'cat_accessoires', 'Magic Keyboard iMac (numeric Touch ID)', 'magic-keyboard-imac-numeric-touch-id-0_8hbV', 220000, NULL, 'APPL-ADZHMM', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_3RLWTE17a5', 'prod_7lzFXTUIjV', 'products/accessoires/magic-keyboard-imac-numeric-touch-id.webp', 'Magic Keyboard iMac (numeric Touch ID)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_lZ-g7AxSmt', 'cat_accessoires', 'Magic Keyboard iMac (qwerty)', 'magic-keyboard-imac-qwerty-xX7-vy', 85000, NULL, 'APPL-LSG3U7', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_tlqrpNEIPd', 'prod_lZ-g7AxSmt', 'products/accessoires/magic-keyboard-imac-qwerty.webp', 'Magic Keyboard iMac (qwerty)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_9x0LKrOIWp', 'cat_ordinateurs', 'iMac M4 (2024)', 'imac-m4-2024-SzVrfA', 1450000, NULL, 'APPL-CPCZTS', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_gqVHxHAybt', 'prod_9x0LKrOIWp', 'products/ordinateurs/imac-m4-2024.webp', 'iMac M4 (2024)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_XnxEutQV1J', 'cat_ordinateurs', 'iMac M3 (2024)', 'imac-m3-2024-NJ-3q4', 1200000, NULL, 'APPL-RSMGZ3', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_3M8HCEEHpQ', 'prod_XnxEutQV1J', 'products/ordinateurs/imac-m3-2024.webp', 'iMac M3 (2024)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_GNOBy1qCpx', 'cat_ordinateurs', 'MacBook Pro M4 Max (2024)', 'macbook-pro-m4-max-2024-If7I8U', 2200000, NULL, 'APPL-VFYDWV', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_TyyeVjP3bB', 'prod_GNOBy1qCpx', 'products/ordinateurs/macbook-pro-m4-max-2024.webp', 'MacBook Pro M4 Max (2024)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_ee6UoojlxV', 'cat_ordinateurs', 'MacBook Pro M4 Pro (2024)', 'macbook-pro-m4-pro-2024-9RAnZc', 1350000, NULL, 'APPL-O08UWX', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_jv8LnhHFxL', 'prod_ee6UoojlxV', 'products/ordinateurs/macbook-pro-m4-pro-2024.webp', 'MacBook Pro M4 Pro (2024)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_sy2OdrFKYA', 'cat_ordinateurs', 'MacBook Pro M4 (2024)', 'macbook-pro-m4-2024-nF2bFk', 1180000, NULL, 'APPL-0NLV6R', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_OCsi7C8qNK', 'prod_sy2OdrFKYA', 'products/ordinateurs/macbook-pro-m4-max-2024.webp', 'MacBook Pro M4 (2024)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_GvBEeOrkkn', 'cat_ordinateurs', 'MacBook Pro M3 Max (2023)', 'macbook-pro-m3-max-2023-bQTIZZ', 2500000, NULL, 'APPL-DZXISD', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_8Ct4qt1j5p', 'prod_GvBEeOrkkn', 'products/ordinateurs/macbook-pro-m4-max-2024.webp', 'MacBook Pro M3 Max (2023)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_5F0XNyN6J5', 'cat_ordinateurs', 'MacBook Pro M3 (2023)', 'macbook-pro-m3-2023-fqVLy8', 1400000, NULL, 'APPL-7Z33GG', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ja4iUq2ilk', 'prod_5F0XNyN6J5', 'products/ordinateurs/macbook-pro-m4-max-2024.webp', 'MacBook Pro M3 (2023)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_C8I-ghX3OM', 'cat_ordinateurs', 'MacBook Pro (2023)', 'macbook-pro-2023-fQg-iu', 1200000, NULL, 'APPL-QSIL05', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_usGUXgAIDa', 'prod_C8I-ghX3OM', 'products/ordinateurs/macbook-pro-2023.webp', 'MacBook Pro (2023)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_lY3mriX0R9', 'cat_ordinateurs', 'MacBook Pro M2 (2022)', 'macbook-pro-m2-2022-B4DahR', 990000, NULL, 'APPL-GZUJVY', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_QgE7mA31aW', 'prod_lY3mriX0R9', 'products/ordinateurs/macbook-pro-m2-2022.webp', 'MacBook Pro M2 (2022)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_SfzjXgbOqH', 'cat_ordinateurs', 'MacBook Air M3 (2023)', 'macbook-air-m3-2023-tSQM3s', 950000, NULL, 'APPL-FQGG9S', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Mp1eP6s49F', 'prod_SfzjXgbOqH', 'products/ordinateurs/macbook-air-m3-2023.webp', 'MacBook Air M3 (2023)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_8UNn7r3Kdo', 'cat_ordinateurs', 'MacBook Air M4 (2025)', 'macbook-air-m4-2025-JyYTAL', 770000, NULL, 'APPL-6LSAEY', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_OAV6_1FQKr', 'prod_8UNn7r3Kdo', 'products/ordinateurs/macbook-air-m4-2025.webp', 'MacBook Air M4 (2025)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_QeF_yaSeD-', 'cat_ordinateurs', 'MacBook Air M2 (2024)', 'macbook-air-m2-2024-CYYl1_', 630000, NULL, 'APPL-D1Q5VD', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_uICCwyA8Oc', 'prod_QeF_yaSeD-', 'products/ordinateurs/macbook-air-m2-2024.webp', 'MacBook Air M2 (2024)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_vNM5z9WTAW', 'cat_ordinateurs', 'MacBook Air M1 (2021)', 'macbook-air-m1-2021-7BQBer', 550000, NULL, 'APPL-NJDSUV', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_AokHotmX5p', 'prod_vNM5z9WTAW', 'products/ordinateurs/macbook-air-m1-2021.webp', 'MacBook Air M1 (2021)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_VFZ9ADoJZQ', 'cat_smartphones', 'iPhone 16 Pro Max', 'iphone-16-pro-max-uMDF2P', 770000, NULL, 'APPL-1XFTAV', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_3neARqZBjv', 'prod_VFZ9ADoJZQ', 'products/smartphones/iphone-16-pro-max.webp', 'iPhone 16 Pro Max', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_SvHt16RKtj', 'cat_smartphones', 'iPhone 16 Pro', 'iphone-16-pro-CsjRz1', 650000, NULL, 'APPL-DPBFET', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_deGuUprvV3', 'prod_SvHt16RKtj', 'products/smartphones/iphone-16-pro-max.webp', 'iPhone 16 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_JAbyrRH595', 'cat_smartphones', 'iPhone 16 Plus', 'iphone-16-plus-fUF0og', 545000, NULL, 'APPL-P7LIXB', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_4CxxDx7ol_', 'prod_JAbyrRH595', 'products/smartphones/iphone-16-plus.webp', 'iPhone 16 Plus', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_NqCnRe-YGC', 'cat_smartphones', 'iPhone 16', 'iphone-16-8qkUbe', 480000, NULL, 'APPL-H2GBWP', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_77ljPYoKbL', 'prod_NqCnRe-YGC', 'products/smartphones/iphone-16.webp', 'iPhone 16', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_XC_ttVUatU', 'cat_accessoires', 'Xiaomi Smart Blender', 'xiaomi-smart-blender-TWnq4y', 150000, NULL, 'XIAO-IMABLL', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_yzglQxuHou', 'prod_XC_ttVUatU', 'products/accessoires/xiaomi-smart-blender.webp', 'Xiaomi Smart Blender', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_5qNoR5201B', 'cat_accessoires', 'Xiaomi TV Stick', 'xiaomi-tv-stick-QutmBs', 38000, NULL, 'XIAO-9DSODQ', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_VOEC8-46xV', 'prod_5qNoR5201B', 'products/accessoires/xiaomi-tv-stick.webp', 'Xiaomi TV Stick', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_xVqEr5ujje', 'cat_accessoires', 'Xiaomi TV Box 3', 'xiaomi-tv-box-3-D7zWbN', 55000, NULL, 'XIAO-_X706E', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_DTLGLU1j5k', 'prod_xVqEr5ujje', 'products/accessoires/xiaomi-tv-box-3.webp', 'Xiaomi TV Box 3', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_f6GyRc56uf', 'cat_televiseurs', 'Xiaomi TV A', 'xiaomi-tv-a-FDmrRJ', 280000, NULL, 'XIAO-6IL9AL', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_L3S6YhfGpy', 'prod_f6GyRc56uf', 'products/televiseurs/xiaomi-tv-a.webp', 'Xiaomi TV A', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_XYhKZNGFiE', 'cat_televiseurs', 'Xiaomi TV A Pro', 'xiaomi-tv-a-pro-7Ly-Ez', 130000, NULL, 'XIAO-ZLEKI4', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_mOs0R9nfUB', 'prod_XYhKZNGFiE', 'products/televiseurs/xiaomi-tv-a-pro.webp', 'Xiaomi TV A Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_v90yBDvz22', 'cat_ecouteurs', 'Mi In-Ear Headphones Basic', 'mi-in-ear-headphones-basic-p9k70a', 15000, NULL, 'XIAO-XW3HKR', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_6Y25vJJsJG', 'prod_v90yBDvz22', 'products/ecouteurs/mi-in-ear-headphones-basic.webp', 'Mi In-Ear Headphones Basic', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_rF53DMkJ69', 'cat_ecouteurs', 'Redmi Buds 6 Active', 'redmi-buds-6-active-4T3psL', 25000, NULL, 'XIAO-I6_D7D', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_VCaoIDSphS', 'prod_rF53DMkJ69', 'products/ecouteurs/redmi-buds-6-active.webp', 'Redmi Buds 6 Active', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_qOzlNnuPbE', 'cat_ecouteurs', 'Redmi Buds 6 Play', 'redmi-buds-6-play-SSHP85', 25000, NULL, 'XIAO-EXADCO', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_xzEjnEIuE1', 'prod_qOzlNnuPbE', 'products/ecouteurs/redmi-buds-6-play.webp', 'Redmi Buds 6 Play', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_SHYFy168pn', 'cat_ecouteurs', 'Redmi Buds 6 Lite', 'redmi-buds-6-lite-_oxNWL', 35000, NULL, 'XIAO-XHRG1X', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_b4_V-OQqaS', 'prod_SHYFy168pn', 'products/ecouteurs/redmi-buds-6-lite.webp', 'Redmi Buds 6 Lite', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_z3ZEExs71f', 'cat_ecouteurs', 'Redmi Buds 6', 'redmi-buds-6-YzVJQr', 45000, NULL, 'XIAO-9QKAKP', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_OUM5wxr0t6', 'prod_z3ZEExs71f', 'products/ecouteurs/redmi-buds-6.webp', 'Redmi Buds 6', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_ER-9fSSmas', 'cat_ecouteurs', 'Xiaomi Buds 5', 'xiaomi-buds-5-cqurUH', 45000, NULL, 'XIAO-FKAYNY', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_u0hU2DtMw6', 'prod_ER-9fSSmas', 'products/ecouteurs/xiaomi-buds-5.webp', 'Xiaomi Buds 5', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_AUwiLzE_Oq', 'cat_ecouteurs', 'Redmi Buds 6 Pro', 'redmi-buds-6-pro-8CUeLI', 60000, NULL, 'XIAO-IIRUMB', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_TQpoWj5DTK', 'prod_AUwiLzE_Oq', 'products/ecouteurs/redmi-buds-6-pro.webp', 'Redmi Buds 6 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_y0HXMbvjm2', 'cat_ecouteurs', 'Xiaomi Buds 5 Pro', 'xiaomi-buds-5-pro-q-5Ewt', 55000, NULL, 'XIAO-8V_JDC', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ryLKOQ_fWh', 'prod_y0HXMbvjm2', 'products/ecouteurs/xiaomi-buds-5-pro.webp', 'Xiaomi Buds 5 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_YfGHOTgxkF', 'cat_accessoires', 'Xiaomi 67W HyperCharge Combo (Type-A) EU', 'xiaomi-67w-hypercharge-combo-type-a-eu-KoZxfk', 33000, NULL, 'XIAO-ONPO66', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_xVQd4Q4zQT', 'prod_YfGHOTgxkF', 'products/accessoires/xiaomi-67w-hypercharge-combo-type-a-eu.webp', 'Xiaomi 67W HyperCharge Combo (Type-A) EU', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_t23Bd1lJSR', 'cat_accessoires', 'Xiaomi 45W Turbo Charging Power Adapter', 'xiaomi-45w-turbo-charging-power-adapter-9cYjJq', 30000, NULL, 'XIAO-IWEKYR', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_eUaTu8A1xd', 'prod_t23Bd1lJSR', 'products/accessoires/xiaomi-45w-turbo-charging-power-adapter.webp', 'Xiaomi 45W Turbo Charging Power Adapter', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_an_X2z5huS', 'cat_accessoires', 'Redmi 18W Fast Charge Power Bank – 20000mAh', 'redmi-18w-fast-charge-power-bank-20000mah-xdhUNs', 35000, NULL, 'XIAO-6HXAUH', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ceEs3qsyq7', 'prod_an_X2z5huS', 'products/accessoires/redmi-18w-fast-charge-power-bank-20000mah.webp', 'Redmi 18W Fast Charge Power Bank – 20000mAh', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_JhQf4gCitR', 'cat_accessoires', 'Xiaomi 33W Power Bank (Cable Integrated) – 20000mAh', 'xiaomi-33w-power-bank-cable-integrated-20000mah-MZqKg6', 35000, NULL, 'XIAO-ANVBV5', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_61BEq4ZqS9', 'prod_JhQf4gCitR', 'products/accessoires/xiaomi-33w-power-bank-cable-integrated-20000mah.webp', 'Xiaomi 33W Power Bank (Cable Integrated) – 20000mAh', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_PBsRT5Dy8v', 'cat_accessoires', 'Xiaomi 22.5W Power Bank – 10000mAh', 'xiaomi-22-5w-power-bank-10000mah-yK2AcK', 35000, NULL, 'XIAO-RRCTX3', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_vnZLy1gvT7', 'prod_PBsRT5Dy8v', 'products/accessoires/xiaomi-22-5w-power-bank-10000mah.webp', 'Xiaomi 22.5W Power Bank – 10000mAh', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_wb7EEHbviB', 'cat_accessoires', 'Xiaomi 212W HyperCharge Power Bank – 25000mAh', 'xiaomi-212w-hypercharge-power-bank-25000mah-HMHJp5', 45000, NULL, 'XIAO-Z8Y6WH', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_oaRsanS36M', 'prod_wb7EEHbviB', 'products/accessoires/xiaomi-212w-hypercharge-power-bank-25000mah.webp', 'Xiaomi 212W HyperCharge Power Bank – 25000mAh', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_hVny4PAdJe', 'cat_projecteurs', 'Xiaomi Smart Laser Measure', 'xiaomi-smart-laser-measure-v9rpIV', 45000, NULL, 'XIAO-VUMYJU', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ds3n_sc2se', 'prod_hVny4PAdJe', 'products/projecteurs/xiaomi-smart-laser-measure.webp', 'Xiaomi Smart Laser Measure', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_8xQ8xVfPlP', 'cat_projecteurs', 'Mi Laser Projector 150', 'mi-laser-projector-150-JHUcMn', 1200000, NULL, 'XIAO-XKV0MA', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_TR7_EHeTDN', 'prod_8xQ8xVfPlP', 'products/projecteurs/mi-laser-projector-150.webp', 'Mi Laser Projector 150', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_yFlUNdL5eB', 'cat_projecteurs', 'Xiaomi Smart Projector L1 Pro', 'xiaomi-smart-projector-l1-pro-DlR3dK', 370000, NULL, 'XIAO-VH6C4S', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_KaedTlbGVa', 'prod_yFlUNdL5eB', 'products/projecteurs/xiaomi-smart-projector-l1-pro.webp', 'Xiaomi Smart Projector L1 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_7SkIdlPL9n', 'cat_projecteurs', 'Xiaomi Smart Projector L1', 'xiaomi-smart-projector-l1-vHMi5S', 350000, NULL, 'XIAO-EC3Y3J', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_NkRwLBNal1', 'prod_7SkIdlPL9n', 'products/projecteurs/xiaomi-smart-projector-l1.webp', 'Xiaomi Smart Projector L1', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Dp0jVMARFS', 'cat_projecteurs', 'Mi Smart Projector 2', 'mi-smart-projector-2-O-KUZy', 310000, NULL, 'XIAO-F_LQNQ', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_FA_rE-QWCt', 'prod_Dp0jVMARFS', 'products/projecteurs/mi-smart-projector-2.webp', 'Mi Smart Projector 2', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_ap3zlePe2O', 'cat_reseau', 'Mi Wi-Fi Range Extender Pro', 'mi-wi-fi-range-extender-pro-wgsIY5', 35000, NULL, 'XIAO-NJPGGL', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_SgtEym9ijs', 'prod_ap3zlePe2O', 'products/reseau/mi-wi-fi-range-extender-pro.webp', 'Mi Wi-Fi Range Extender Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_SWfzgEjegm', 'cat_reseau', 'Xiaomi WiFi Range Extender N300', 'xiaomi-wifi-range-extender-n300-HurAEY', 25000, NULL, 'XIAO-VNN8KK', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_hubFl0CGQZ', 'prod_SWfzgEjegm', 'products/reseau/xiaomi-wifi-range-extender-n300.webp', 'Xiaomi WiFi Range Extender N300', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_a0QKnbIuRI', 'cat_reseau', 'Mi WiFi Range Extender AC1200 GL', 'mi-wifi-range-extender-ac1200-gl-T7ZoSl', 30000, NULL, 'XIAO-B7SNVL', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_keDF3gzX5i', 'prod_a0QKnbIuRI', 'products/reseau/mi-wifi-range-extender-ac1200-gl.webp', 'Mi WiFi Range Extender AC1200 GL', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_5_Kd0qxZ91', 'cat_reseau', 'Xiaomi Router AX1500', 'xiaomi-router-ax1500-37mnEr', 45000, NULL, 'XIAO-UMSCPZ', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_yg3LhSLCjo', 'prod_5_Kd0qxZ91', 'products/reseau/xiaomi-router-ax1500.webp', 'Xiaomi Router AX1500', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_rt2ieO0aRd', 'cat_reseau', 'Xiaomi Router AX3000T EU', 'xiaomi-router-ax3000t-eu-5-poll', 65000, NULL, 'XIAO-IPK7LK', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_krOCd8KMMi', 'prod_rt2ieO0aRd', 'products/reseau/xiaomi-router-ax3000t-eu.webp', 'Xiaomi Router AX3000T EU', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_7cr5h3nfap', 'cat_reseau', 'Xiaomi Router AX3200', 'xiaomi-router-ax3200-A39m74', 70000, NULL, 'XIAO-18U4F-', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ttgw6odZQv', 'prod_7cr5h3nfap', 'products/reseau/xiaomi-router-ax3200.webp', 'Xiaomi Router AX3200', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_sN_3ea8bEL', 'cat_reseau', 'Xiaomi Router AC1200', 'xiaomi-router-ac1200-GyBoJ7', 35000, NULL, 'XIAO-S8SIVB', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_la2sB3aJQV', 'prod_sN_3ea8bEL', 'products/reseau/xiaomi-router-ac1200.webp', 'Xiaomi Router AC1200', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_43ETtPtu3u', 'cat_montres', 'Xiaomi Smart Band 8 Pro', 'xiaomi-smart-band-8-pro-A8mwFr', 80000, NULL, 'XIAO-AM_BFZ', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_vk2CRVCeGa', 'prod_43ETtPtu3u', 'products/montres-connectees/xiaomi-smart-band-8-pro.webp', 'Xiaomi Smart Band 8 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_7qc5HK_oSs', 'cat_montres', 'Redmi Watch 3 Active', 'redmi-watch-3-active-53nVt-', 45000, NULL, 'XIAO-AADRK0', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_R-IjFPrfBy', 'prod_7qc5HK_oSs', 'products/montres-connectees/redmi-watch-3-active.webp', 'Redmi Watch 3 Active', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_O8h_XpGn9c', 'cat_montres', 'Xiaomi Smart Band 9', 'xiaomi-smart-band-9-8xRlqm', 50000, NULL, 'XIAO-XE2VXS', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_QmjGEBFD1M', 'prod_O8h_XpGn9c', 'products/montres-connectees/xiaomi-smart-band-9.webp', 'Xiaomi Smart Band 9', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_FGkPT92LKr', 'cat_montres', 'Xiaomi Smart Band 9 Active', 'xiaomi-smart-band-9-active-HDjwJC', 50000, NULL, 'XIAO-X3P9NZ', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_aNC2MCPjFT', 'prod_FGkPT92LKr', 'products/montres-connectees/xiaomi-smart-band-9-active.webp', 'Xiaomi Smart Band 9 Active', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_zLH1g1RJoV', 'cat_montres', 'Xiaomi Smart Band 9 Pro', 'xiaomi-smart-band-9-pro-E1F8xp', 70000, NULL, 'XIAO-LZYVQH', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_j54Q83tl27', 'prod_zLH1g1RJoV', 'products/montres-connectees/xiaomi-smart-band-9-pro.webp', 'Xiaomi Smart Band 9 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_q_A-WYmnFu', 'cat_montres', 'Redmi Watch 5 Lite', 'redmi-watch-5-lite-VQWjWh', 50000, NULL, 'XIAO-DLDIIV', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_AXWS5Y0Asj', 'prod_q_A-WYmnFu', 'products/montres-connectees/redmi-watch-5-lite.webp', 'Redmi Watch 5 Lite', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_xNdgc-Pl22', 'cat_montres', 'Redmi Watch 5 Active', 'redmi-watch-5-active-iB2xkw', 40000, NULL, 'XIAO-OWI2JH', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_2aLMTMtIs5', 'prod_xNdgc-Pl22', 'products/montres-connectees/redmi-watch-5-active.webp', 'Redmi Watch 5 Active', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_aTQkjSjSGa', 'cat_tablettes', 'Redmi Pad Pro WIFI', 'redmi-pad-pro-wifi-FW-KAF', 215000, NULL, 'XIAO-OXMGAR', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_iP17dVow-O', 'prod_aTQkjSjSGa', 'products/tablettes/redmi-pad-pro-wifi.webp', 'Redmi Pad Pro WIFI', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_qioFdP-CvZ', 'cat_tablettes', 'Redmi Pad Pro 5G', 'redmi-pad-pro-5g-A3LSzA', 250000, NULL, 'XIAO-6SBP4N', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_SwnMLRjXTF', 'prod_qioFdP-CvZ', 'products/tablettes/redmi-pad-pro-5g.webp', 'Redmi Pad Pro 5G', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_AFZEaWvd8N', 'cat_tablettes', 'Redmi Pad SE', 'redmi-pad-se-Njk7kL', 300000, NULL, 'XIAO-4IEWV_', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_UkNErNFA1r', 'prod_AFZEaWvd8N', 'products/tablettes/redmi-pad-se.webp', 'Redmi Pad SE', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_uv0mJiTqqO', 'cat_tablettes', 'Redmi Pad SE 8.7', 'redmi-pad-se-8-7-CGBZtp', 145000, NULL, 'XIAO-GLQONO', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_VFXXpYHh-o', 'prod_uv0mJiTqqO', 'products/tablettes/redmi-pad-se-8-7.webp', 'Redmi Pad SE 8.7', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_MIl2nfO4km', 'cat_tablettes', 'Xiaomi Pad 7 Pro', 'xiaomi-pad-7-pro-SvzsG2', 375000, NULL, 'XIAO-UKX2ZJ', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_D-zaiuRYv6', 'prod_MIl2nfO4km', 'products/tablettes/xiaomi-pad-7-pro.webp', 'Xiaomi Pad 7 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_o261WFCArm', 'cat_tablettes', 'Xiaomi Pad 7', 'xiaomi-pad-7-ep0yF6', 285000, NULL, 'XIAO-XFBV1G', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_I6bSMpJh8n', 'prod_o261WFCArm', 'products/tablettes/xiaomi-pad-7-pro.webp', 'Xiaomi Pad 7', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_3kFWJWJqkF', 'cat_tablettes', 'Redmi Pad 2', 'redmi-pad-2-efJ_wK', 200000, NULL, 'XIAO--_HVID', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ZxEzEc77NT', 'prod_3kFWJWJqkF', 'products/tablettes/redmi-pad-2.webp', 'Redmi Pad 2', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_0t-oTQlswY', 'cat_tablettes', 'Redmi Pad 6S Pro', 'redmi-pad-6s-pro-SVd8Ie', 470000, NULL, 'XIAO-2ZPUJX', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_4pFIuvci7M', 'prod_0t-oTQlswY', 'products/tablettes/redmi-pad-6s-pro.webp', 'Redmi Pad 6S Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_BcTapbPilp', 'cat_tablettes', 'Redmi Pad 2 4G', 'redmi-pad-2-4g-74nttk', 200000, NULL, 'XIAO-DIA5VP', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_UWHcKVt_MI', 'prod_BcTapbPilp', 'products/tablettes/redmi-pad-2.webp', 'Redmi Pad 2 4G', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_UiwXMN50a4', 'cat_smartphones', 'Xiaomi 14T', 'xiaomi-14t-tM_dO4', 270000, NULL, 'XIAO-3TM9FS', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_nluKUeTAvL', 'prod_UiwXMN50a4', 'products/smartphones/xiaomi-14t.webp', 'Xiaomi 14T', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Zt5C-PsCXn', 'cat_smartphones', 'Redmi Note 14 Pro+', 'redmi-note-14-pro-plus-_Im6g0', 185000, NULL, 'XIAO-JFIL7V', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_rLbeWVg7Ly', 'prod_Zt5C-PsCXn', 'products/smartphones/redmi-note-14-pro-plus.webp', 'Redmi Note 14 Pro+', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_0hH_jay24s', 'cat_smartphones', 'Xiaomi 15 Ultra', 'xiaomi-15-ultra-2SEePG', 680000, NULL, 'XIAO-SS3T2Z', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_hAaldYuugb', 'prod_0hH_jay24s', 'products/smartphones/xiaomi-15-ultra.webp', 'Xiaomi 15 Ultra', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_lKa82y5m6Z', 'cat_smartphones', 'Xiaomi 15', 'xiaomi-15-Na2W5f', 560000, NULL, 'XIAO-KSBINQ', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_6UTea8Y2v2', 'prod_lKa82y5m6Z', 'products/smartphones/xiaomi-15.webp', 'Xiaomi 15', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_VlwP9vWHmq', 'cat_smartphones', 'POCO F7 Pro', 'poco-f7-pro-6D_na-', 380000, NULL, 'XIAO-2AN_QJ', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_8jH6Qcwvvn', 'prod_VlwP9vWHmq', 'products/smartphones/poco-f7-pro.webp', 'POCO F7 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_o1ODf521pv', 'cat_smartphones', 'POCO F7 Ultra', 'poco-f7-ultra-3OkFtG', 510000, NULL, 'XIAO-TB-FGK', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Ng7iUDU3gx', 'prod_o1ODf521pv', 'products/smartphones/poco-f7-ultra.webp', 'POCO F7 Ultra', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_2FRQl3hgh2', 'cat_smartphones', 'Poco Pad', 'poco-pad-vd_XeR', 260000, NULL, 'XIAO-KYQG8U', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ncQF3xR7Je', 'prod_2FRQl3hgh2', 'products/smartphones/poco-pad.webp', 'Poco Pad', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_p1j5ho16ym', 'cat_smartphones', 'POCO X7 Pro', 'poco-x7-pro-p1p83Y', 280000, NULL, 'XIAO-TS_BTQ', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_4xiGueiB8P', 'prod_p1j5ho16ym', 'products/smartphones/poco-x7-pro.webp', 'POCO X7 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_kgk6xqebyo', 'cat_smartphones', 'Redmi A5', 'redmi-a5-TV0pFR', 45000, NULL, 'XIAO-BTCRBU', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_J9_7EtDNSQ', 'prod_kgk6xqebyo', 'products/smartphones/redmi-a5.webp', 'Redmi A5', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_W_xxZuBiYz', 'cat_tablettes', 'Samsung Tab S10 Ultra', 'samsung-tab-s10-ultra-qPMnnQ', 700000, NULL, 'SAMS-WECITT', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_EKgBvK_9XF', 'prod_W_xxZuBiYz', 'products/tablettes/samsung-tab-s10-ultra.webp', 'Samsung Tab S10 Ultra', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_soQq_mal_0', 'cat_tablettes', 'Samsung Tab S9 Ultra', 'samsung-tab-s9-ultra-jt1Smo', 1030000, NULL, 'SAMS-XTWJ95', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_7S5D-GKhwE', 'prod_soQq_mal_0', 'products/tablettes/samsung-tab-s9-ultra.webp', 'Samsung Tab S9 Ultra', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_VkxdcVv27X', 'cat_tablettes', 'Samsung Tab S9+', 'samsung-tab-s9-plus-5ikLGR', 680000, NULL, 'SAMS-LMWBIG', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_cQqsCICx5i', 'prod_VkxdcVv27X', 'products/tablettes/samsung-tab-s9-plus.webp', 'Samsung Tab S9+', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_8VkNBWsdkk', 'cat_tablettes', 'Samsung Tab S9 FE+', 'samsung-tab-s9-fe-plus-nCCDmf', 370000, NULL, 'SAMS-AALD6O', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_gpUHDwIkX7', 'prod_8VkNBWsdkk', 'products/tablettes/samsung-tab-s9-fe-plus.webp', 'Samsung Tab S9 FE+', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_a5ZCckrnfy', 'cat_tablettes', 'Samsung Tab S9 FE', 'samsung-tab-s9-fe-25qrq0', 300000, NULL, 'SAMS-RDPVML', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_jPmHXdFlp2', 'prod_a5ZCckrnfy', 'products/tablettes/samsung-tab-s9-fe.webp', 'Samsung Tab S9 FE', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_eLIFx0iK_u', 'cat_tablettes', 'Samsung Tab S9', 'samsung-tab-s9-xB99ff', 400000, NULL, 'SAMS-2P9HIH', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_HsZalgki5X', 'prod_eLIFx0iK_u', 'products/tablettes/samsung-tab-s9-plus.webp', 'Samsung Tab S9', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Pu9gVjDdYG', 'cat_tablettes', 'Samsung Tab A9+', 'samsung-tab-a9-plus-xX4KNt', 145000, NULL, 'SAMS-TWQQIE', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_PZczZ-_5Tn', 'prod_Pu9gVjDdYG', 'products/tablettes/samsung-tab-a9-plus.webp', 'Samsung Tab A9+', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Yil6BVjCSH', 'cat_smartphones', 'Samsung Z Fold 6', 'samsung-z-fold-6-xdkwWM', 590000, NULL, 'SAMS-AUZ9J3', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Z5N6pT0TXB', 'prod_Yil6BVjCSH', 'products/smartphones/samsung-z-fold-6.webp', 'Samsung Z Fold 6', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_MzqoMKEOBT', 'cat_smartphones', 'Samsung Z Fold 5', 'samsung-z-fold-5-FVomlR', 630000, NULL, 'SAMS-6OFFKF', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_haqOl-q2ja', 'prod_MzqoMKEOBT', 'products/smartphones/samsung-z-fold-5.webp', 'Samsung Z Fold 5', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_-B2qugOhk0', 'cat_smartphones', 'Samsung Z Fold 4', 'samsung-z-fold-4-wQ7V26', 485000, NULL, 'SAMS-ANIBML', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_mylIwpwrr4', 'prod_-B2qugOhk0', 'products/smartphones/samsung-z-fold-4.webp', 'Samsung Z Fold 4', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_nHTCXpaqk4', 'cat_smartphones', 'Samsung Z Fold 3', 'samsung-z-fold-3-OgirCB', 475000, NULL, 'SAMS-0AX1MO', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_sL9qho7XGp', 'prod_nHTCXpaqk4', 'products/smartphones/samsung-z-fold-3.webp', 'Samsung Z Fold 3', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_9LT_nkZNYT', 'cat_smartphones', 'Samsung Z Flip 6', 'samsung-z-flip-6-cRmq8o', 455000, NULL, 'SAMS-CC13E8', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_UGNoOVnSyn', 'prod_9LT_nkZNYT', 'products/smartphones/samsung-z-flip-6.webp', 'Samsung Z Flip 6', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_AWIJizVNSF', 'cat_smartphones', 'Samsung S25 Ultra', 'samsung-s25-ultra-YqD0hJ', 550000, NULL, 'SAMS-FC1UL5', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_cuUzCKgbTw', 'prod_AWIJizVNSF', 'products/smartphones/samsung-s25-ultra.webp', 'Samsung S25 Ultra', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_dt5bbxN8An', 'cat_smartphones', 'Samsung S25+', 'samsung-s25-plus-J8T0L7', 505000, NULL, 'SAMS-_N0FSB', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Cf9eFZZ1wy', 'prod_dt5bbxN8An', 'products/smartphones/samsung-s25-plus.webp', 'Samsung S25+', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_rKuWZXIqt4', 'cat_smartphones', 'Samsung S25', 'samsung-s25-GME8Fs', 400000, NULL, 'SAMS-AVHF3E', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_HwnrBwiWNj', 'prod_rKuWZXIqt4', 'products/smartphones/samsung-s25.webp', 'Samsung S25', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_zgcklictfy', 'cat_smartphones', 'Samsung S24 Ultra', 'samsung-s24-ultra-yp-uxK', 495000, NULL, 'SAMS-RMR-UY', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_TEwMQ-dN4F', 'prod_zgcklictfy', 'products/smartphones/samsung-s24-ultra.webp', 'Samsung S24 Ultra', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Yt0csTLFZ8', 'cat_smartphones', 'Samsung S24+', 'samsung-s24-plus-8jEFdM', 385000, NULL, 'SAMS-QUVAWC', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_POksOQbaWw', 'prod_Yt0csTLFZ8', 'products/smartphones/samsung-s24-plus.webp', 'Samsung S24+', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_i2j5k1k-VJ', 'cat_smartphones', 'Samsung S24 FE', 'samsung-s24-fe-4tANtF', 380000, NULL, 'SAMS-XCMC2C', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_n_FvQpQL-S', 'prod_i2j5k1k-VJ', 'products/smartphones/samsung-s24-fe.webp', 'Samsung S24 FE', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_TnrS3vwWcO', 'cat_smartphones', 'Samsung S24', 'samsung-s24-mayFkQ', 340000, NULL, 'SAMS-97RQMU', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_kbRkb6MV7-', 'prod_TnrS3vwWcO', 'products/smartphones/samsung-s24.webp', 'Samsung S24', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_0t3T8PzOU3', 'cat_smartphones', 'Samsung S23+', 'samsung-s23-plus-1D1sD1', 475000, NULL, 'SAMS-7GPLF3', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ubTgBj-9Um', 'prod_0t3T8PzOU3', 'products/smartphones/samsung-s23-plus.webp', 'Samsung S23+', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_PIZgPE6mgv', 'cat_smartphones', 'Samsung S23 FE – 5G', 'samsung-s23-fe-5g-p5uIZM', 270000, NULL, 'SAMS-LXS2J3', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_YDfz85z51i', 'prod_PIZgPE6mgv', 'products/smartphones/samsung-s23-fe-5g.webp', 'Samsung S23 FE – 5G', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_ZaZLDIsvJW', 'cat_smartphones', 'Samsung S23', 'samsung-s23-Bthp8y', 335000, NULL, 'SAMS-M353M_', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_0KpdBBjAZJ', 'prod_ZaZLDIsvJW', 'products/smartphones/samsung-s23.webp', 'Samsung S23', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_IhnIrhaBht', 'cat_smartphones', 'Samsung A06', 'samsung-a06-HaBowV', 82500, NULL, 'SAMS-BIND3F', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_s1087pGoM2', 'prod_IhnIrhaBht', 'products/smartphones/samsung-a06.webp', 'Samsung A06', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_eGPd_IuTMA', 'cat_smartphones', 'Samsung A16', 'samsung-a16-6RoHPA', 160000, NULL, 'SAMS-FNY39J', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_d5NtB8u6Ll', 'prod_eGPd_IuTMA', 'products/smartphones/samsung-a16.webp', 'Samsung A16', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_nww8ndgEIi', 'cat_smartphones', 'Samsung A26', 'samsung-a26-_U3_sG', 16000, NULL, 'SAMS-PRPMSM', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Ud5v_j3e5X', 'prod_nww8ndgEIi', 'products/smartphones/samsung-a26.webp', 'Samsung A26', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_YI0if-eA_x', 'cat_smartphones', 'Samsung A36', 'samsung-a36-20nL3N', 190000, NULL, 'SAMS-JAT5UG', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_hgsPU-ZJDM', 'prod_YI0if-eA_x', 'products/smartphones/samsung-a36.webp', 'Samsung A36', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_E4xUKDgvTO', 'cat_smartphones', 'Samsung A56', 'samsung-a56-ZoUy9M', 210000, NULL, 'SAMS-ZJTIB7', 'Samsung', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_WOLRzSYPUv', 'prod_E4xUKDgvTO', 'products/smartphones/samsung-a56.webp', 'Samsung A56', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_JWGwGjmtUM', 'cat_tablettes', 'iPad Pro M4 – 2024', 'ipad-pro-m4-2024-OqawLr', 100000, NULL, 'APPL-JTY6T1', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_gjA-SZTQRJ', 'prod_JWGwGjmtUM', 'products/tablettes/ipad-pro-m4-2024.webp', 'iPad Pro M4 – 2024', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_3gvX3UQHkO', 'cat_tablettes', 'iPad Air 7th M3 – 2025', 'ipad-air-7th-m3-2025-3umWft', 490000, NULL, 'APPL-2CLB-Y', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Mk-hh-821W', 'prod_3gvX3UQHkO', 'products/tablettes/ipad-air-7th-m3-2025.webp', 'iPad Air 7th M3 – 2025', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_DMjyxZLfqz', 'cat_tablettes', 'iPad Air 6th (M2, 2024)', 'ipad-air-6th-m2-2024-oeOXAO', 390000, NULL, 'APPL-AJOQWB', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_DNYkXvhIQU', 'prod_DMjyxZLfqz', 'products/tablettes/ipad-air-6th-m2-2024.webp', 'iPad Air 6th (M2, 2024)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_C765AqpZ0J', 'cat_tablettes', 'iPad mini 7 (2024)', 'ipad-mini-7-2024-HrLLWH', 310000, NULL, 'APPL-TLPUFD', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_sj8ETQznkH', 'prod_C765AqpZ0J', 'products/tablettes/ipad-mini-7-2024.webp', 'iPad mini 7 (2024)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_9frA9mLsiU', 'cat_tablettes', 'iPad mini 6 (2022)', 'ipad-mini-6-2022-ijYIRV', 300000, NULL, 'APPL-TIV7ZZ', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_mbHpv5vhjT', 'prod_9frA9mLsiU', 'products/tablettes/ipad-mini-6-2022.webp', 'iPad mini 6 (2022)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_J1-HOCmqA9', 'cat_tablettes', 'iPad 11th Gen (2025)', 'ipad-11th-gen-2025-wBo7oT', 310000, NULL, 'APPL-RR8W3C', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_0DZbQrPGDQ', 'prod_J1-HOCmqA9', 'products/tablettes/ipad-11th-gen-2025.webp', 'iPad 11th Gen (2025)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Uca959l1U0', 'cat_smartphones', 'Pixel 6', 'pixel-6--7s7SF', 280000, NULL, 'GOOG-SW_WYF', 'Google', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_r6aHDJx5DK', 'prod_Uca959l1U0', 'products/smartphones/pixel-6.webp', 'Pixel 6', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_J3ZngJsab_', 'cat_smartphones', 'Pixel 7', 'pixel-7-tEoo6d', 335000, NULL, 'GOOG-ISUQP0', 'Google', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_ISYzVP7y20', 'prod_J3ZngJsab_', 'products/smartphones/pixel-7.webp', 'Pixel 7', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_0sNVHA__iF', 'cat_smartphones', 'Pixel 8', 'pixel-8-8LV7u-', 400000, NULL, 'GOOG-UA-E-H', 'Google', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_xMcdoXdWq5', 'prod_0sNVHA__iF', 'products/smartphones/pixel-8.webp', 'Pixel 8', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_k6sG_OLv9-', 'cat_smartphones', 'Pixel 8 Pro', 'pixel-8-pro-7B7-hv', 450000, NULL, 'GOOG-EMCJU1', 'Google', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_DkmkM4fBDj', 'prod_k6sG_OLv9-', 'products/smartphones/pixel-8-pro.webp', 'Pixel 8 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_Yf69vJgfJ6', 'cat_smartphones', 'Pixel 9', 'pixel-9-CyZum4', 420000, NULL, 'GOOG-9PZQI4', 'Google', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_Yckkfx9ECH', 'prod_Yf69vJgfJ6', 'products/smartphones/pixel-9.webp', 'Pixel 9', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_OVEZMoPl-s', 'cat_tablettes', 'iPad 10th Gen (2022)', 'ipad-10th-gen-2022-Ho_xue', 260000, NULL, 'APPL-4QIV1N', 'Apple', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_XTCMwPprfi', 'prod_OVEZMoPl-s', 'products/tablettes/ipad-10th-gen-2022.webp', 'iPad 10th Gen (2022)', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_v6MKeW6nwq', 'cat_montres', 'Redmi Watch 5', 'redmi-watch-5-dTN90y', 80000, NULL, 'XIAO-EL3V0C', 'Xiaomi', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_BTCF-Z5z4y', 'prod_v6MKeW6nwq', 'products/montres-connectees/redmi-watch-5.webp', 'Redmi Watch 5', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_b74sqIgMiR', 'cat_smartphones', 'Pixel 9 Pro', 'pixel-9-pro-pejdEg', 300000, NULL, 'GOOG-MHYOHJ', 'Google', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_lgoieq6kmV', 'prod_b74sqIgMiR', 'products/smartphones/pixel-9-pro.webp', 'Pixel 9 Pro', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_ON6jG3drCg', 'cat_smartphones', 'Pixel 9 Pro XL', 'pixel-9-pro-xl-6heSvH', 300000, NULL, 'GOOG-VLDSXR', 'Google', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_PJpCpU5d6N', 'prod_ON6jG3drCg', 'products/smartphones/pixel-9-pro-xl.webp', 'Pixel 9 Pro XL', 0, 1);

INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('prod_YaY4fO4U6L', 'cat_smartphones', 'Pixel 9 Pro Fold', 'pixel-9-pro-fold-ToistK', 720000, NULL, 'GOOG-MJAM5S', 'Google', 1, 0, 10);
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('img_tRgzndHb5n', 'prod_YaY4fO4U6L', 'products/smartphones/pixel-9-pro-fold.webp', 'Pixel 9 Pro Fold', 0, 1);

-- ==============================================
-- DIVERSIFICATION DES DONNÉES (stocks, variantes, promotions, etc.)
-- ==============================================

-- ==========================================
-- 1. PRODUITS EN RUPTURE DE STOCK (stock_quantity = 0)
-- ==========================================

-- Nothing Phone 2 — ancien modèle épuisé
UPDATE products SET stock_quantity = 0 WHERE id = 'prod_jiK5EME7CQ';

-- MacBook Pro M2 (2022) — modèle remplacé, plus en stock
UPDATE products SET stock_quantity = 0 WHERE id = 'prod_lY3mriX0R9';

-- Samsung Z Fold 3 — ancienne génération épuisée
UPDATE products SET stock_quantity = 0 WHERE id = 'prod_nHTCXpaqk4';

-- Pixel 6 — ancien modèle épuisé
UPDATE products SET stock_quantity = 0 WHERE id = 'prod_Uca959l1U0';

-- ==========================================
-- 2. PRODUITS EN STOCK FAIBLE (1-5 unités)
-- ==========================================

-- Nothing Phone 3a — 2 unités restantes
UPDATE products SET stock_quantity = 2 WHERE id = 'prod_0HhIMIoqDM';

-- Xiaomi Smart Laser Measure — dernière unité
UPDATE products SET stock_quantity = 1 WHERE id = 'prod_hVny4PAdJe';

-- Redmi Buds 6 Active — 3 restants
UPDATE products SET stock_quantity = 3 WHERE id = 'prod_rF53DMkJ69';

-- Samsung Z Fold 4 — 2 restants (ancien modèle)
UPDATE products SET stock_quantity = 2 WHERE id = 'prod_-B2qugOhk0';

-- iPad mini 6 (2022) — 4 restants
UPDATE products SET stock_quantity = 4 WHERE id = 'prod_9frA9mLsiU';

-- ==========================================
-- 3. PRODUITS DÉSACTIVÉS (is_active = 0)
-- ==========================================

-- Huawei Mate X3 — retiré du catalogue (ancien modèle)
UPDATE products SET is_active = 0 WHERE id = 'prod_cgzkWeiQ0J';

-- Honor Magic V2 — retiré du catalogue
UPDATE products SET is_active = 0 WHERE id = 'prod_mQ3Ux-Q09Z';

-- ==========================================
-- 4. PROMOTIONS (ajout de compare_price)
-- ==========================================

-- OnePlus 15 512Go : promo -100 000 XOF
UPDATE products SET compare_price = 800000 WHERE id = 'prod_sSmRBUV0-l';

-- Sony WH-1000XM5 : promo -70 000 XOF
UPDATE products SET compare_price = 350000 WHERE id = 'prod_FDafNLx40d';

-- POCO F7 Pro : promo -50 000 XOF
UPDATE products SET compare_price = 430000 WHERE id = 'prod_VlwP9vWHmq';

-- Samsung A56 : promo -40 000 XOF
UPDATE products SET compare_price = 250000 WHERE id = 'prod_E4xUKDgvTO';

-- Nothing Phone 3a : promo avant rupture
UPDATE products SET compare_price = 400000 WHERE id = 'prod_0HhIMIoqDM';

-- iPad Air 6th (M2) : promo -60 000 XOF
UPDATE products SET compare_price = 450000 WHERE id = 'prod_DMjyxZLfqz';

-- MacBook Air M3 (2023) : promo avant sortie M4
UPDATE products SET compare_price = 1100000 WHERE id = 'prod_SfzjXgbOqH';

-- ==========================================
-- 5. VARIANTES : iPhone 16 Pro Max (stockage + couleur)
-- ==========================================

UPDATE products SET stock_quantity = 25, base_price = 770000, compare_price = 850000 WHERE id = 'prod_VFZ9ADoJZQ';

INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes, sort_order) VALUES
  ('var_ip16pm_256_nat', 'prod_VFZ9ADoJZQ', '256 Go – Titane Naturel', 'APPL-1XFTAV-256-NAT', 770000, 8, '{"storage":"256 Go","color":"#968b7b"}', 0),
  ('var_ip16pm_256_noi', 'prod_VFZ9ADoJZQ', '256 Go – Titane Noir', 'APPL-1XFTAV-256-NOI', 770000, 5, '{"storage":"256 Go","color":"#3c3b37"}', 1),
  ('var_ip16pm_256_bla', 'prod_VFZ9ADoJZQ', '256 Go – Titane Blanc', 'APPL-1XFTAV-256-BLA', 770000, 0, '{"storage":"256 Go","color":"#f0e8d8"}', 2),
  ('var_ip16pm_512_nat', 'prod_VFZ9ADoJZQ', '512 Go – Titane Naturel', 'APPL-1XFTAV-512-NAT', 920000, 4, '{"storage":"512 Go","color":"#968b7b"}', 3),
  ('var_ip16pm_512_noi', 'prod_VFZ9ADoJZQ', '512 Go – Titane Noir', 'APPL-1XFTAV-512-NOI', 920000, 3, '{"storage":"512 Go","color":"#3c3b37"}', 4),
  ('var_ip16pm_1tb_nat', 'prod_VFZ9ADoJZQ', '1 To – Titane Naturel', 'APPL-1XFTAV-1TB-NAT', 1150000, 2, '{"storage":"1 To","color":"#968b7b"}', 5),
  ('var_ip16pm_1tb_des', 'prod_VFZ9ADoJZQ', '1 To – Titane Sable', 'APPL-1XFTAV-1TB-DES', 1150000, 0, '{"storage":"1 To","color":"#c4a96a"}', 6);

-- ==========================================
-- 6. VARIANTES : Samsung S25 Ultra (stockage + couleur)
-- ==========================================

UPDATE products SET stock_quantity = 30, compare_price = 650000 WHERE id = 'prod_AWIJizVNSF';

INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes, sort_order) VALUES
  ('var_s25u_256_bleu', 'prod_AWIJizVNSF', '256 Go – Bleu Titane', 'SAMS-FC1UL5-256-BL', 550000, 10, '{"storage":"256 Go","color":"#3b4e6b"}', 0),
  ('var_s25u_256_noir', 'prod_AWIJizVNSF', '256 Go – Noir Titane', 'SAMS-FC1UL5-256-NO', 550000, 8, '{"storage":"256 Go","color":"#2c2c2c"}', 1),
  ('var_s25u_256_gris', 'prod_AWIJizVNSF', '256 Go – Gris Titane', 'SAMS-FC1UL5-256-GR', 550000, 0, '{"storage":"256 Go","color":"#8c8c8c"}', 2),
  ('var_s25u_512_bleu', 'prod_AWIJizVNSF', '512 Go – Bleu Titane', 'SAMS-FC1UL5-512-BL', 650000, 6, '{"storage":"512 Go","color":"#3b4e6b"}', 3),
  ('var_s25u_512_noir', 'prod_AWIJizVNSF', '512 Go – Noir Titane', 'SAMS-FC1UL5-512-NO', 650000, 4, '{"storage":"512 Go","color":"#2c2c2c"}', 4),
  ('var_s25u_1tb_bleu', 'prod_AWIJizVNSF', '1 To – Bleu Titane', 'SAMS-FC1UL5-1TB-BL', 800000, 2, '{"storage":"1 To","color":"#3b4e6b"}', 5);

-- ==========================================
-- 7. VARIANTES : MacBook Air M4 (2025) (RAM/stockage + couleur)
-- ==========================================

UPDATE products SET stock_quantity = 20, base_price = 770000 WHERE id = 'prod_8UNn7r3Kdo';

INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes, sort_order) VALUES
  ('var_mbam4_16_256_min', 'prod_8UNn7r3Kdo', '16 Go / 256 Go – Minuit', 'APPL-6LSAEY-16-256-MIN', 770000, 5, '{"ram":"16 Go","storage":"256 Go","color":"#2e3642"}', 0),
  ('var_mbam4_16_256_lum', 'prod_8UNn7r3Kdo', '16 Go / 256 Go – Lumière Stellaire', 'APPL-6LSAEY-16-256-LUM', 770000, 4, '{"ram":"16 Go","storage":"256 Go","color":"#f0e6d3"}', 1),
  ('var_mbam4_16_512_min', 'prod_8UNn7r3Kdo', '16 Go / 512 Go – Minuit', 'APPL-6LSAEY-16-512-MIN', 920000, 3, '{"ram":"16 Go","storage":"512 Go","color":"#2e3642"}', 2),
  ('var_mbam4_24_512_sid', 'prod_8UNn7r3Kdo', '24 Go / 512 Go – Sidéral', 'APPL-6LSAEY-24-512-SID', 1100000, 2, '{"ram":"24 Go","storage":"512 Go","color":"#7a7a7e"}', 3),
  ('var_mbam4_24_1tb_lum', 'prod_8UNn7r3Kdo', '24 Go / 1 To – Lumière Stellaire', 'APPL-6LSAEY-24-1TB-LUM', 1350000, 0, '{"ram":"24 Go","storage":"1 To","color":"#f0e6d3"}', 4);

-- ==========================================
-- 8. VARIANTES : Samsung A56 (couleur uniquement)
-- ==========================================

UPDATE products SET stock_quantity = 40, compare_price = 250000 WHERE id = 'prod_E4xUKDgvTO';

INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes, sort_order) VALUES
  ('var_a56_noir', 'prod_E4xUKDgvTO', 'Noir', 'SAMS-ZJTIB7-NOI', 210000, 15, '{"color":"#1a1a1a"}', 0),
  ('var_a56_bleu', 'prod_E4xUKDgvTO', 'Bleu Glacier', 'SAMS-ZJTIB7-BLE', 210000, 12, '{"color":"#7ba7c9"}', 1),
  ('var_a56_lav', 'prod_E4xUKDgvTO', 'Lavande', 'SAMS-ZJTIB7-LAV', 210000, 8, '{"color":"#b8a9d1"}', 2),
  ('var_a56_vert', 'prod_E4xUKDgvTO', 'Vert Menthe', 'SAMS-ZJTIB7-VER', 210000, 5, '{"color":"#a8d8b9"}', 3);

-- ==========================================
-- 9. VARIANTES : Galaxy Z Fold 7 — TOUTES épuisées
-- ==========================================

UPDATE products SET stock_quantity = 0 WHERE id = 'prod_WAQOPQ_04y';

INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes, sort_order) VALUES
  ('var_zfold7_256_noir', 'prod_WAQOPQ_04y', '256 Go – Noir', 'SAMS-IJC0UX-256-NO', 950000, 0, '{"storage":"256 Go","color":"#1a1a1a"}', 0),
  ('var_zfold7_256_crem', 'prod_WAQOPQ_04y', '256 Go – Crème', 'SAMS-IJC0UX-256-CR', 950000, 0, '{"storage":"256 Go","color":"#f5f0e1"}', 1),
  ('var_zfold7_512_noir', 'prod_WAQOPQ_04y', '512 Go – Noir', 'SAMS-IJC0UX-512-NO', 1100000, 0, '{"storage":"512 Go","color":"#1a1a1a"}', 2);

-- ==========================================
-- 10. VARIANTES : iPhone 16 Pro (stockage + couleur)
-- ==========================================

UPDATE products SET stock_quantity = 18, compare_price = 750000 WHERE id = 'prod_SvHt16RKtj';

INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes, sort_order) VALUES
  ('var_ip16p_128_nat', 'prod_SvHt16RKtj', '128 Go – Titane Naturel', 'APPL-DPBFET-128-NAT', 650000, 6, '{"storage":"128 Go","color":"#968b7b"}', 0),
  ('var_ip16p_256_nat', 'prod_SvHt16RKtj', '256 Go – Titane Naturel', 'APPL-DPBFET-256-NAT', 750000, 5, '{"storage":"256 Go","color":"#968b7b"}', 1),
  ('var_ip16p_256_noi', 'prod_SvHt16RKtj', '256 Go – Titane Noir', 'APPL-DPBFET-256-NOI', 750000, 4, '{"storage":"256 Go","color":"#3c3b37"}', 2),
  ('var_ip16p_512_noi', 'prod_SvHt16RKtj', '512 Go – Titane Noir', 'APPL-DPBFET-512-NOI', 900000, 3, '{"storage":"512 Go","color":"#3c3b37"}', 3);

-- ==========================================
-- 11. VARIANTES : Console PS5 Slim (édition)
-- ==========================================

UPDATE products SET stock_quantity = 15, base_price = 350000 WHERE id = 'prod_ogszJmqVeJ';

INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes, sort_order) VALUES
  ('var_ps5_std_fc26', 'prod_ogszJmqVeJ', 'Standard + EA FC 26', 'SONY-WMDMH8-STD', 400000, 8, '{"edition":"Standard + FC 26"}', 0),
  ('var_ps5_digital', 'prod_ogszJmqVeJ', 'Numérique', 'SONY-WMDMH8-DIG', 350000, 5, '{"edition":"Numérique"}', 1),
  ('var_ps5_std', 'prod_ogszJmqVeJ', 'Standard (sans jeu)', 'SONY-WMDMH8-SOLO', 380000, 2, '{"edition":"Standard"}', 2);

-- ==========================================
-- 12. VARIANTES : OnePlus 13 (stockage + couleur)
-- ==========================================

UPDATE products SET stock_quantity = 20, compare_price = 600000 WHERE id = 'prod_ahpoVYy8Tt';

INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes, sort_order) VALUES
  ('var_op13_256_noir', 'prod_ahpoVYy8Tt', '256 Go – Midnight Ocean', 'ONEP-5INY_O-256-NO', 530000, 8, '{"storage":"256 Go","color":"#1a2333"}', 0),
  ('var_op13_256_vert', 'prod_ahpoVYy8Tt', '256 Go – Arctic Dawn', 'ONEP-5INY_O-256-VE', 530000, 7, '{"storage":"256 Go","color":"#d4e4d9"}', 1),
  ('var_op13_512_noir', 'prod_ahpoVYy8Tt', '512 Go – Midnight Ocean', 'ONEP-5INY_O-512-NO', 630000, 3, '{"storage":"512 Go","color":"#1a2333"}', 2),
  ('var_op13_512_vert', 'prod_ahpoVYy8Tt', '512 Go – Arctic Dawn', 'ONEP-5INY_O-512-VE', 630000, 0, '{"storage":"512 Go","color":"#d4e4d9"}', 3);

-- ==========================================
-- 13. VARIANTES : iPad Air 7th M3 (stockage + couleur)
-- ==========================================

UPDATE products SET stock_quantity = 15, base_price = 490000 WHERE id = 'prod_3gvX3UQHkO';

INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes, sort_order) VALUES
  ('var_ipam3_128_bleu', 'prod_3gvX3UQHkO', '128 Go – Bleu', 'APPL-2CLB-Y-128-BL', 490000, 5, '{"storage":"128 Go","color":"#5b7fa6"}', 0),
  ('var_ipam3_128_viol', 'prod_3gvX3UQHkO', '128 Go – Mauve', 'APPL-2CLB-Y-128-VI', 490000, 4, '{"storage":"128 Go","color":"#b8a0c8"}', 1),
  ('var_ipam3_256_bleu', 'prod_3gvX3UQHkO', '256 Go – Bleu', 'APPL-2CLB-Y-256-BL', 580000, 3, '{"storage":"256 Go","color":"#5b7fa6"}', 2),
  ('var_ipam3_256_lum', 'prod_3gvX3UQHkO', '256 Go – Lumière Stellaire', 'APPL-2CLB-Y-256-LU', 580000, 3, '{"storage":"256 Go","color":"#f0e6d3"}', 3);

-- ==========================================
-- 14. VARIANTES : Xiaomi 15 Ultra (stockage)
-- ==========================================

UPDATE products SET stock_quantity = 12, compare_price = 780000 WHERE id = 'prod_0hH_jay24s';

INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes, sort_order) VALUES
  ('var_x15u_256', 'prod_0hH_jay24s', '256 Go – Noir', 'XIAO-SS3T2Z-256', 680000, 6, '{"storage":"256 Go","color":"#1a1a1a"}', 0),
  ('var_x15u_512', 'prod_0hH_jay24s', '512 Go – Noir', 'XIAO-SS3T2Z-512', 780000, 4, '{"storage":"512 Go","color":"#1a1a1a"}', 1),
  ('var_x15u_512_whi', 'prod_0hH_jay24s', '512 Go – Blanc', 'XIAO-SS3T2Z-512W', 780000, 2, '{"storage":"512 Go","color":"#f5f5f5"}', 2);

-- ==========================================
-- 15. ATTRIBUTS PRODUIT (specs)
-- ==========================================

-- iPhone 16 Pro Max
INSERT INTO product_attributes (id, product_id, name, value) VALUES
  ('attr_ip16pm_ecran', 'prod_VFZ9ADoJZQ', 'Écran', '6.9" Super Retina XDR OLED'),
  ('attr_ip16pm_puce', 'prod_VFZ9ADoJZQ', 'Processeur', 'A18 Pro'),
  ('attr_ip16pm_cam', 'prod_VFZ9ADoJZQ', 'Caméra', '48 MP + 48 MP Ultra-angle + 12 MP Téléphoto 5x'),
  ('attr_ip16pm_bat', 'prod_VFZ9ADoJZQ', 'Batterie', '4685 mAh'),
  ('attr_ip16pm_os', 'prod_VFZ9ADoJZQ', 'OS', 'iOS 18');

-- Samsung S25 Ultra
INSERT INTO product_attributes (id, product_id, name, value) VALUES
  ('attr_s25u_ecran', 'prod_AWIJizVNSF', 'Écran', '6.9" Dynamic AMOLED 2X, 120Hz'),
  ('attr_s25u_puce', 'prod_AWIJizVNSF', 'Processeur', 'Snapdragon 8 Elite'),
  ('attr_s25u_cam', 'prod_AWIJizVNSF', 'Caméra', '200 MP + 50 MP Ultra-angle + 50 MP Téléphoto 5x'),
  ('attr_s25u_bat', 'prod_AWIJizVNSF', 'Batterie', '5000 mAh'),
  ('attr_s25u_spen', 'prod_AWIJizVNSF', 'S Pen', 'Intégré');

-- MacBook Air M4
INSERT INTO product_attributes (id, product_id, name, value) VALUES
  ('attr_mbam4_ecran', 'prod_8UNn7r3Kdo', 'Écran', '13.6" Liquid Retina'),
  ('attr_mbam4_puce', 'prod_8UNn7r3Kdo', 'Processeur', 'Apple M4'),
  ('attr_mbam4_auto', 'prod_8UNn7r3Kdo', 'Autonomie', 'Jusqu''à 18h'),
  ('attr_mbam4_poids', 'prod_8UNn7r3Kdo', 'Poids', '1,24 kg');

-- ==========================================
-- 16. IMAGES SECONDAIRES (produits populaires)
-- ==========================================

-- iPhone 16 Pro Max — images supplémentaires
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES
  ('img_ip16pm_side', 'prod_VFZ9ADoJZQ', 'products/smartphones/iphone-16-pro-max.webp', 'iPhone 16 Pro Max – Vue latérale', 1, 0),
  ('img_ip16pm_back', 'prod_VFZ9ADoJZQ', 'products/smartphones/iphone-16-pro-max.webp', 'iPhone 16 Pro Max – Vue arrière', 2, 0);

-- Samsung S25 Ultra — images supplémentaires
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES
  ('img_s25u_side', 'prod_AWIJizVNSF', 'products/smartphones/samsung-s25-ultra.webp', 'Samsung S25 Ultra – Vue latérale', 1, 0),
  ('img_s25u_spen', 'prod_AWIJizVNSF', 'products/smartphones/samsung-s25-ultra.webp', 'Samsung S25 Ultra – S Pen', 2, 0);

-- MacBook Air M4 — images supplémentaires
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES
  ('img_mbam4_open', 'prod_8UNn7r3Kdo', 'products/ordinateurs/macbook-air-m4-2025.webp', 'MacBook Air M4 – Ouvert', 1, 0),
  ('img_mbam4_close', 'prod_8UNn7r3Kdo', 'products/ordinateurs/macbook-air-m4-2025.webp', 'MacBook Air M4 – Fermé', 2, 0);

-- ==========================================
-- 17. AVIS CLIENTS
-- ==========================================

INSERT INTO reviews (id, product_id, user_id, rating, comment, is_verified_purchase, created_at) VALUES
  ('rev_ip16pm_1', 'prod_VFZ9ADoJZQ', 'user_client_test', 5, 'Excellent téléphone, la caméra est incroyable ! Livraison rapide à Cocody.', 1, datetime('now', '-15 days')),
  ('rev_ip16pm_2', 'prod_VFZ9ADoJZQ', 'user_client_test', 4, 'Très bon produit mais le prix est élevé. Autonomie correcte.', 1, datetime('now', '-10 days')),
  ('rev_s25u_1', 'prod_AWIJizVNSF', 'user_client_test', 5, 'Le S Pen est un vrai plus. Écran magnifique, je recommande !', 1, datetime('now', '-12 days')),
  ('rev_s25u_2', 'prod_AWIJizVNSF', 'user_client_test', 4, 'Bon téléphone, Galaxy AI très utile. Un peu lourd.', 0, datetime('now', '-8 days')),
  ('rev_mbam4_1', 'prod_8UNn7r3Kdo', 'user_client_test', 5, 'Parfait pour le travail, léger et puissant. La puce M4 est rapide.', 1, datetime('now', '-20 days')),
  ('rev_sony_1', 'prod_FDafNLx40d', 'user_client_test', 5, 'Réduction de bruit exceptionnelle. Confort parfait même après des heures.', 1, datetime('now', '-25 days')),
  ('rev_sony_2', 'prod_FDafNLx40d', 'user_client_test', 3, 'Bon casque mais le boîtier de charge est fragile.', 0, datetime('now', '-18 days')),
  ('rev_ps5_1', 'prod_ogszJmqVeJ', 'user_client_test', 5, 'Console au top ! FC 26 inclus, super affaire.', 1, datetime('now', '-7 days')),
  ('rev_op13_1', 'prod_ahpoVYy8Tt', 'user_client_test', 4, 'Excellent rapport qualité/prix, charge ultra rapide.', 1, datetime('now', '-5 days')),
  ('rev_a56_1', 'prod_E4xUKDgvTO', 'user_client_test', 4, 'Très bon pour le prix. Batterie qui tient 2 jours.', 1, datetime('now', '-3 days')),
  ('rev_a56_2', 'prod_E4xUKDgvTO', 'user_client_test', 5, 'Design soigné, la couleur Lavande est superbe !', 0, datetime('now', '-1 day')),
  ('rev_poco_1', 'prod_VlwP9vWHmq', 'user_client_test', 4, 'Performances gaming excellentes pour le prix.', 1, datetime('now', '-6 days')),
  ('rev_noth3a_1', 'prod_0HhIMIoqDM', 'user_client_test', 4, 'Design unique avec les LED, appareil original et performant.', 1, datetime('now', '-14 days'));

-- ==========================================
-- 18. CODES PROMO
-- ==========================================

INSERT INTO promo_codes (id, code, description, discount_type, discount_value, min_order_amount, max_uses, used_count, starts_at, expires_at, is_active) VALUES
  ('promo_bienvenue', 'BIENVENUE', 'Remise de bienvenue pour les nouveaux clients', 'percentage', 10, 50000, 100, 12, datetime('now', '-30 days'), datetime('now', '+60 days'), 1),
  ('promo_noel', 'NOEL2025', 'Promo fin d''année 2025', 'fixed', 15000, 100000, 50, 50, datetime('now', '-60 days'), datetime('now', '-10 days'), 0),
  ('promo_livraison', 'LIVRAISON0', 'Livraison offerte dès 200 000 XOF', 'fixed', 3000, 200000, NULL, 35, datetime('now', '-15 days'), datetime('now', '+30 days'), 1),
  ('promo_flash', 'FLASH20', 'Vente flash 20%', 'percentage', 20, 150000, 20, 3, datetime('now', '-1 day'), datetime('now', '+2 days'), 1);

-- ==========================================
-- 19. STOCKS VARIÉS POUR LES PRODUITS EXISTANTS (plus réalistes)
-- ==========================================

-- Smartphones populaires : stocks plus importants
UPDATE products SET stock_quantity = 25 WHERE id = 'prod_H1T_kUu5tb'; -- REDMI Note 15 Pro+
UPDATE products SET stock_quantity = 30 WHERE id = 'prod_XJy8ciwtSM'; -- Samsung Galaxy A17
UPDATE products SET stock_quantity = 15 WHERE id = 'prod_wdeu06fH9E'; -- HONOR Magic 8 Pro
UPDATE products SET stock_quantity = 20 WHERE id = 'prod_SsQhFPEgkK'; -- XIAOMI 15 Ultra 1TB

-- Montres : stock moyen
UPDATE products SET stock_quantity = 15 WHERE id = 'prod_x7jfx0NWLo'; -- Huawei Watch D2

-- Accessoires : stocks élevés (petits produits)
UPDATE products SET stock_quantity = 50 WHERE id = 'prod_zTXnjOYv2R'; -- AirTag (pack 1)
UPDATE products SET stock_quantity = 30 WHERE id = 'prod_GKMlVAJDMC'; -- AirTag (pack 4)
UPDATE products SET stock_quantity = 40 WHERE id = 'prod_an_X2z5huS'; -- Power Bank 20000mAh
UPDATE products SET stock_quantity = 35 WHERE id = 'prod_JhQf4gCitR'; -- Power Bank 33W

-- Anciens modèles : stocks réduits
UPDATE products SET stock_quantity = 5 WHERE id = 'prod_MzqoMKEOBT'; -- Samsung Z Fold 5
UPDATE products SET stock_quantity = 6 WHERE id = 'prod_0t3T8PzOU3'; -- Samsung S23+
UPDATE products SET stock_quantity = 5 WHERE id = 'prod_ZaZLDIsvJW'; -- Samsung S23
UPDATE products SET stock_quantity = 7 WHERE id = 'prod_vNM5z9WTAW'; -- MacBook Air M1 (2021)

-- Écouteurs populaires : stocks variés
UPDATE products SET stock_quantity = 25 WHERE id = 'prod_v90yBDvz22'; -- Mi In-Ear (pas cher)
UPDATE products SET stock_quantity = 20 WHERE id = 'prod_z3ZEExs71f'; -- Redmi Buds 6
UPDATE products SET stock_quantity = 8 WHERE id = 'prod_LQhETW8Htz'; -- OnePlus Buds Pro 3
