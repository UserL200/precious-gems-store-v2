-- Verification queries for Filess.io import

-- Check if all tables exist
SHOW TABLES;

-- Check row counts for main tables
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'products' as table_name, COUNT(*) as row_count FROM products  
UNION ALL
SELECT 'orders' as table_name, COUNT(*) as row_count FROM orders
UNION ALL
SELECT 'order_items' as table_name, COUNT(*) as row_count FROM order_items
UNION ALL
SELECT 'categories' as table_name, COUNT(*) as row_count FROM categories
UNION ALL
SELECT 'reviews' as table_name, COUNT(*) as row_count FROM reviews;

-- Check sample data from key tables
SELECT 'Sample Products' as section;
SELECT id, name, price, category, stock FROM products LIMIT 5;

SELECT 'Sample Users' as section;
SELECT id, email, first_name, last_name, role FROM users LIMIT 5;

SELECT 'Sample Orders' as section;
SELECT id, user_id, total_amount, status, created_at FROM orders LIMIT 5;

-- Check for potential data issues
SELECT 'Data Quality Check' as section;

SELECT 
    'products_with_null_price' as issue,
    COUNT(*) as count 
FROM products 
WHERE price IS NULL OR price = 0;

SELECT 
    'users_with_invalid_email' as issue,
    COUNT(*) as count 
FROM users 
WHERE email = '' OR email IS NULL OR email NOT LIKE '%@%';

SELECT 
    'orders_with_zero_total' as issue,
    COUNT(*) as count 
FROM orders 
WHERE total_amount IS NULL OR total_amount = 0;

-- Check database size (approximate)
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.tables 
WHERE table_schema = DATABASE()
ORDER BY size_mb DESC;
