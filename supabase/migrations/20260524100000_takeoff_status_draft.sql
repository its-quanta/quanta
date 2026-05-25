-- Manual takeoff draft status (distinct from AI draft)
alter type public.takeoff_item_status add value if not exists 'draft';
