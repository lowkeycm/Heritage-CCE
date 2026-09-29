-- What the customer is asking about (collision repair, PeelClear, upfitting...), picked on the
-- commercial form. Retail leads leave it empty.
alter table public.leads add column service text;
