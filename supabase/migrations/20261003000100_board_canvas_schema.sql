-- The canvas record schema version a board was last saved with. Lets the client
-- migrate stored objects forward when the canvas engine is upgraded.
alter table public.boards
  add column canvas_schema jsonb check (octet_length(canvas_schema::text) <= 65536);
