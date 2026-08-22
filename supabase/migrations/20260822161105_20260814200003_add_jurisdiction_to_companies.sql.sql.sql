alter table public.companies add column if not exists jurisdiction text;

update public.companies
set jurisdiction = 'CA-ON'
where canonical_domain = 'northstar-civic.example';