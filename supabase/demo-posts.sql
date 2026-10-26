-- Optional: 4 sample posts under your own account, so the feed isn't empty.
-- Run in the Supabase SQL Editor AFTER schema.sql section 4.
-- Change the email if you signed up with another one.
insert into public.posts (author_id, title, body, tags, image_urls, created_at)
select u.id, v.title, v.body, v.tags, '{}', now() - v.age
from auth.users u,
(values
  ('Beach clean-up this weekend', 'Joined 20 volunteers and collected 40 bags of plastic. Everyone is welcome next time! #cleanup #ocean', array['cleanup','ocean'], interval '5 hours'),
  (null, 'Started composting on my balcony. Small steps, big difference. Any tips? #composting #zerowaste', array['composting','zerowaste'], interval '1 day'),
  ('Cycling to work: week 3', 'Saved around 12 kg of CO2 this month by leaving the car at home. #cycling #greencommute', array['cycling','greencommute'], interval '2 days'),
  (null, 'Planted 5 native trees in the community garden today. The forest starts with one tree! #trees #community', array['trees','community'], interval '3 days')
) as v(title, body, tags, age)
where u.email = 'dmytrosyvak97@gmail.com';
