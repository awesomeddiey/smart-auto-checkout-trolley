-- Smart Auto-Checkout Trolley — Seed Data
-- Run after schema.sql

-- ─────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────
INSERT INTO categories (name, slug, icon, color) VALUES
  ('Fresh Produce',   'fresh-produce',  '🥦', '#10b981'),
  ('Dairy & Eggs',    'dairy-eggs',     '🥛', '#3b82f6'),
  ('Bakery',          'bakery',         '🍞', '#f59e0b'),
  ('Beverages',       'beverages',      '🧃', '#6366f1'),
  ('Snacks',          'snacks',         '🍫', '#ec4899'),
  ('Meat & Seafood',  'meat-seafood',   '🥩', '#ef4444'),
  ('Frozen Foods',    'frozen-foods',   '🧊', '#06b6d4'),
  ('Personal Care',   'personal-care',  '🧴', '#8b5cf6'),
  ('Household',       'household',      '🧹', '#64748b'),
  ('Canned & Dry',    'canned-dry',     '🥫', '#a16207');

-- ─────────────────────────────────────────
-- AISLE MAP  (grid 0–100 units)
-- ─────────────────────────────────────────
INSERT INTO aisle_map (aisle_code, aisle_name, x_position, y_position, width, height, description) VALUES
  ('A1',  'Fresh Produce',       5,  10, 18, 30, 'Fruits and vegetables'),
  ('A2',  'Dairy & Eggs',        5,  50, 18, 20, 'Milk, cheese, butter, eggs'),
  ('B1',  'Bakery',              30, 10, 18, 15, 'Bread, pastries, cakes'),
  ('B2',  'Beverages',           30, 35, 18, 25, 'Juices, sodas, water'),
  ('B3',  'Snacks',              30, 68, 18, 20, 'Chips, chocolates, biscuits'),
  ('C1',  'Meat & Seafood',      55, 10, 18, 25, 'Fresh meat, poultry, fish'),
  ('C2',  'Frozen Foods',        55, 43, 18, 20, 'Frozen meals and ice cream'),
  ('C3',  'Canned & Dry',        55, 70, 18, 18, 'Canned goods, pasta, rice'),
  ('D1',  'Personal Care',       80, 10, 16, 30, 'Soap, shampoo, hygiene'),
  ('D2',  'Household',           80, 48, 16, 25, 'Cleaning, laundry supplies');

-- ─────────────────────────────────────────
-- PRODUCTS
-- ─────────────────────────────────────────
INSERT INTO products (sku, barcode, name, description, category_id, price, weight_grams, weight_tolerance_percent, yolo_class_name, aisle_id, shelf_position, stock_quantity) VALUES

-- Fresh Produce
('PRD-001', '6001007012345', 'Red Apple (each)',           'Fresh Fuji red apple',                  1,  1.50,  182, 20, 'apple',       1, 'A1-S1', 200),
('PRD-002', '6001007012346', 'Banana Bunch',               '5-piece banana bunch',                  1,  2.20,  600, 15, 'banana',      1, 'A1-S2', 150),
('PRD-003', '6001007012347', 'Broccoli Head',              'Fresh broccoli crown ~400g',             1,  3.50,  400, 20, 'broccoli',    1, 'A1-S3', 80),
('PRD-004', '6001007012348', 'Tomatoes (pack of 6)',       'Vine-ripened tomatoes 500g',             1,  4.00,  500, 15, 'tomato',      1, 'A1-S4', 120),
('PRD-005', '6001007012349', 'Onion Bag 1kg',              'Brown cooking onions',                  1,  3.20, 1000, 10, 'onion',       1, 'A1-S5', 90),
('PRD-006', '6001007012350', 'Carrot Pack 500g',           'Fresh carrots washed',                  1,  2.80,  500, 10, 'carrot',      1, 'A1-S6', 100),
('PRD-007', '6001007012351', 'Garlic Bulb',                'Single garlic bulb ~60g',               1,  0.80,   60, 25, 'garlic',      1, 'A1-S7', 200),

-- Dairy & Eggs
('PRD-010', '6001007022345', 'Full Cream Milk 2L',         'Dairibord full cream milk',             2,  5.50, 2060, 5,  'milk_carton', 2, 'A2-S1', 80),
('PRD-011', '6001007022346', 'Free Range Eggs (12)',       'Large free-range eggs',                 2,  6.00,  720, 10, 'egg_carton',  2, 'A2-S2', 60),
('PRD-012', '6001007022347', 'Cheddar Cheese 250g',        'Mature cheddar block',                  2,  8.50,  260, 8,  'cheese',      2, 'A2-S3', 45),
('PRD-013', '6001007022348', 'Salted Butter 250g',         'Anchor salted butter',                  2,  7.00,  255, 5,  'butter',      2, 'A2-S4', 50),
('PRD-014', '6001007022349', 'Plain Yoghurt 500ml',        'Natural low-fat yoghurt',               2,  4.50,  520, 8,  'yoghurt',     2, 'A2-S5', 40),

-- Bakery
('PRD-020', '6001007032345', 'White Bread 700g',           'Bakeway soft white loaf',               3,  2.50,  720, 8,  'bread_loaf',  3, 'B1-S1', 60),
('PRD-021', '6001007032346', 'Brown Bread 700g',           'Whole wheat brown loaf',                3,  3.00,  730, 8,  'bread_loaf',  3, 'B1-S2', 55),
('PRD-022', '6001007032347', 'Croissants (4 pack)',        'Butter croissants',                     3,  5.50,  280, 10, 'croissant',   3, 'B1-S3', 30),

-- Beverages
('PRD-030', '6001007042345', 'Orange Juice 1L',            'Mazoe fresh orange juice',              4,  4.20, 1040, 5,  'juice_box',   4, 'B2-S1', 70),
('PRD-031', '6001007042346', 'Coca-Cola 2L',               'Coca-Cola classic bottle',              4,  3.50, 2100, 5,  'soda_bottle', 4, 'B2-S2', 90),
('PRD-032', '6001007042347', 'Still Water 1.5L',           'Aquarius still water',                  4,  1.80, 1530, 5,  'water_bottle',4, 'B2-S3', 120),
('PRD-033', '6001007042348', 'Energy Drink 250ml',         'Red Bull energy drink',                 4,  2.50,  265, 5,  'energy_can',  4, 'B2-S4', 80),

-- Snacks
('PRD-040', '6001007052345', 'Potato Chips 150g',          'Lays original flavour',                 5,  3.00,  155, 10, 'chips_bag',   5, 'B3-S1', 100),
('PRD-041', '6001007052346', 'Chocolate Bar 100g',         'Cadbury Dairy Milk',                    5,  2.50,  105, 8,  'chocolate',   5, 'B3-S2', 150),
('PRD-042', '6001007052347', 'Biscuits Pack 200g',         'Tennis biscuits',                       5,  2.20,  210, 8,  'biscuit_box', 5, 'B3-S3', 120),

-- Meat & Seafood
('PRD-050', '6001007062345', 'Chicken Breast 500g',        'Irvines skinless breast fillets',       6,  9.50,  520, 10, 'chicken',     6, 'C1-S1', 40),
('PRD-051', '6001007062346', 'Beef Mince 500g',            'Extra lean beef mince',                 6, 12.00,  520, 10, 'meat_pack',   6, 'C1-S2', 35),
('PRD-052', '6001007062347', 'Pork Sausages 400g',         'Cumberland pork sausages',              6,  8.00,  415, 10, 'sausage_pack',6, 'C1-S3', 30),

-- Frozen Foods
('PRD-060', '6001007072345', 'Frozen Peas 500g',           'Bird''s Eye garden peas',               7,  4.50,  510, 8,  'frozen_bag',  7, 'C2-S1', 50),
('PRD-061', '6001007072346', 'Ice Cream 1L',               'Dairyboard vanilla ice cream',          7,  7.50, 1050, 8,  'ice_cream',   7, 'C2-S2', 30),

-- Canned & Dry
('PRD-070', '6001007082345', 'Pasta Spaghetti 500g',       'Fatti''s & Moni''s spaghetti',          10, 2.50,  510, 5,  'pasta_box',   8, 'C3-S1', 80),
('PRD-071', '6001007082346', 'Tomato Sauce 410g',          'All Gold tomato sauce tin',             10, 3.20,  420, 5,  'tin_can',     8, 'C3-S2', 90),
('PRD-072', '6001007082347', 'Basmati Rice 2kg',           'Spekko basmati rice',                   10, 8.00, 2050, 5,  'rice_bag',    8, 'C3-S3', 60),
('PRD-073', '6001007082348', 'Cooking Oil 750ml',          'Olivine sunflower oil',                 10, 5.50,  720, 5,  'oil_bottle',  8, 'C3-S4', 70),
('PRD-074', '6001007082349', 'Sugar 2kg',                  'Zimbabwe Sugar white sugar',            10, 4.50, 2020, 5,  'sugar_bag',   8, 'C3-S5', 85),
('PRD-075', '6001007082350', 'Baked Beans 410g',           'Koo baked beans in tomato sauce',       10, 3.00,  425, 5,  'tin_can',     8, 'C3-S6', 95),

-- Personal Care
('PRD-080', '6001007092345', 'Shampoo 400ml',              'Head & Shoulders classic',              8,  9.00,  420, 8,  'shampoo',     9, 'D1-S1', 50),
('PRD-081', '6001007092346', 'Body Wash 250ml',            'Dove moisturising body wash',           8,  6.50,  265, 8,  'body_wash',   9, 'D1-S2', 55),
('PRD-082', '6001007092347', 'Toothpaste 100ml',           'Colgate whitening toothpaste',          8,  4.50,  145, 8,  'toothpaste',  9, 'D1-S3', 80),
('PRD-083', '6001007092348', 'Deodorant 150ml',            'Sure anti-perspirant',                  8,  7.00,  155, 8,  'deodorant',   9, 'D1-S4', 60),

-- Household
('PRD-090', '6001007102345', 'Dishwashing Liquid 500ml',   'Sunlight original dishwash',            9,  3.50,  525, 8,  'bottle',      10, 'D2-S1', 65),
('PRD-091', '6001007102346', 'Laundry Powder 1kg',         'Skip bio laundry powder',               9,  8.50, 1050, 5,  'powder_box',  10, 'D2-S2', 45),
('PRD-092', '6001007102347', 'Toilet Paper 9 roll',        'Twinsaver double-ply',                  9,  7.00,  950, 8,  'toilet_paper',10, 'D2-S3', 70);

-- ─────────────────────────────────────────
-- RECIPES
-- ─────────────────────────────────────────
INSERT INTO recipes (name, slug, description, servings, prep_time, cook_time, tags) VALUES
  ('Spaghetti Bolognese', 'spaghetti-bolognese', 'Classic Italian meat sauce pasta', 4, 15, 45, ARRAY['italian','pasta','beef','dinner']),
  ('Chicken Stir Fry',    'chicken-stir-fry',    'Quick Asian-style chicken and veg', 2, 10, 15, ARRAY['asian','quick','chicken','healthy']),
  ('Full English Breakfast', 'full-english',     'Classic cooked breakfast',         2, 5,  20, ARRAY['breakfast','eggs','quick']),
  ('Tomato Soup',         'tomato-soup',          'Homemade fresh tomato soup',       4, 10, 25, ARRAY['soup','vegetarian','lunch']);

-- Recipe items
INSERT INTO recipe_items (recipe_id, product_id, ingredient, quantity, unit) VALUES
  -- Spaghetti Bolognese (recipe 1)
  (1, (SELECT id FROM products WHERE sku='PRD-070'), 'Spaghetti',        500,  'g'),
  (1, (SELECT id FROM products WHERE sku='PRD-051'), 'Beef Mince',       500,  'g'),
  (1, (SELECT id FROM products WHERE sku='PRD-071'), 'Tomato Sauce',     410,  'g'),
  (1, (SELECT id FROM products WHERE sku='PRD-005'), 'Onion',            1,    'large'),
  (1, (SELECT id FROM products WHERE sku='PRD-007'), 'Garlic',           3,    'cloves'),
  (1, (SELECT id FROM products WHERE sku='PRD-073'), 'Olive Oil',        2,    'tbsp'),
  -- Chicken Stir Fry (recipe 2)
  (2, (SELECT id FROM products WHERE sku='PRD-050'), 'Chicken Breast',   300,  'g'),
  (2, (SELECT id FROM products WHERE sku='PRD-003'), 'Broccoli',         200,  'g'),
  (2, (SELECT id FROM products WHERE sku='PRD-006'), 'Carrots',          2,    'medium'),
  (2, (SELECT id FROM products WHERE sku='PRD-007'), 'Garlic',           2,    'cloves'),
  (2, (SELECT id FROM products WHERE sku='PRD-073'), 'Cooking Oil',      2,    'tbsp'),
  -- Full English (recipe 3)
  (3, (SELECT id FROM products WHERE sku='PRD-011'), 'Eggs',             4,    'large'),
  (3, (SELECT id FROM products WHERE sku='PRD-052'), 'Pork Sausages',    4,    'links'),
  (3, (SELECT id FROM products WHERE sku='PRD-020'), 'White Bread',      4,    'slices'),
  (3, (SELECT id FROM products WHERE sku='PRD-075'), 'Baked Beans',      410,  'g'),
  -- Tomato Soup (recipe 4)
  (4, (SELECT id FROM products WHERE sku='PRD-004'), 'Tomatoes',         1000, 'g'),
  (4, (SELECT id FROM products WHERE sku='PRD-005'), 'Onion',            1,    'large'),
  (4, (SELECT id FROM products WHERE sku='PRD-007'), 'Garlic',           2,    'cloves');
