-- The story box becomes a classic script: scene headings, action and lines
-- of dialogue (who speaks, an optional direction, what they say), edited in
-- place. Claude's summaries are gone.
--   blocks: [{ id, type: 'scene' | 'action' | 'dialogue', text,
--              character?, parenthetical? }]

alter table public.project_stories
  drop column summary,
  drop column summarized_at,
  add column blocks jsonb not null default '[]'::jsonb
    check (jsonb_typeof(blocks) = 'array' and pg_column_size(blocks) < 400000);

-- Text written before goes in as the script's first block of action.
update public.project_stories
set blocks = jsonb_build_array(
  jsonb_build_object('id', gen_random_uuid()::text, 'type', 'action', 'text', body)
)
where btrim(body) <> '';
