begin;

select plan(6);

select has_function(
  'public',
  'persist_government_contract_application_item',
  'Application persistence RPC exists'
);
select has_function(
  'public',
  'record_government_contract_item_failure',
  'Technical failure recovery RPC exists'
);
select has_function(
  'public',
  'read_company_government_contract_evidence',
  'Company Evidence query RPC exists'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.persist_government_contract_application_item(uuid,text,uuid,uuid,text,text,text,text,date,text,text,integer,text,text,jsonb,numeric,text)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.persist_government_contract_application_item(uuid,text,uuid,uuid,text,text,text,text,date,text,text,integer,text,text,jsonb,numeric,text)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.persist_government_contract_application_item(uuid,text,uuid,uuid,text,text,text,text,date,text,text,integer,text,text,jsonb,numeric,text)',
    'execute'
  ),
  'Only the service role can execute application persistence'
);

select is(
  (
    select count(*)::integer
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname in (
        'persist_government_contract_application_item',
        'record_government_contract_item_failure',
        'read_company_government_contract_evidence'
      )
      and pg_proc.prosecdef
  ),
  3,
  'Every Ticket 06 RPC is SECURITY DEFINER'
);

select is(
  (
    select count(*)::integer
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname in (
        'persist_government_contract_application_item',
        'record_government_contract_item_failure',
        'read_company_government_contract_evidence'
      )
      and pg_proc.proconfig @> array['search_path=""']::text[]
  ),
  3,
  'Every Ticket 06 SECURITY DEFINER RPC fixes search_path'
);

select * from finish();
rollback;
