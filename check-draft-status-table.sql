-- Check if draft_status table exists and its structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'draft_status' 
ORDER BY ordinal_position;

-- Check if there's any data in draft_status
SELECT * FROM draft_status LIMIT 5;





