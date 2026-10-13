-- The studio works in Czech; ship the default add-ons in Czech.
-- Only rows still carrying the original English seed text are touched,
-- so anything the studio already edited stays as it is.
update public.services as s
set name = v.cs_name, description = v.cs_description
from (values
  ('Additional shoot day', 'An extra day of shooting with the same crew and setup.',
   'Natáčecí den navíc', 'Další den natáčení se stejným štábem a technikou.'),
  ('Additional edit', 'Another cut of the film, e.g. a different length or format.',
   'Další střih', 'Další verze videa, např. jiná délka nebo formát.'),
  ('Social cutdowns', 'Short vertical versions for Instagram, TikTok and Reels.',
   'Verze pro sociální sítě', 'Krátké vertikální verze pro Instagram, TikTok a Reels.'),
  ('Extra retouched photos', 'More final images beyond the agreed selection.',
   'Retuš fotek navíc', 'Více finálních fotek nad rámec dohodnutého výběru.'),
  ('Colour grading revision', 'Another round of colour adjustments.',
   'Úprava color gradingu', 'Další kolo barevných korekcí.')
) as v (en_name, en_description, cs_name, cs_description)
where s.name = v.en_name and s.description = v.en_description;
