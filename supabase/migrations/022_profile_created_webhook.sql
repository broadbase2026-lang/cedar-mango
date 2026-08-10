-- Fires the profile-created webhook via pg_net (async HTTP), instead of
-- the older supabase_functions.http_request mechanism, which isn't
-- provisioned on this project.

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_profile_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  -- Left null-safe on purpose: if no brand row exists yet at the moment
  -- the profile is created (e.g. brand setup happens in a later
  -- onboarding step), brand_name will just come through blank/null in
  -- the email — the Resend template should tolerate an empty value.
  v_brand_name text;
begin
  select u.email into v_email
  from auth.users u
  where u.id = new.id;

  if new.user_type = 'brand' then
    select b.name into v_brand_name
    from public.brands b
    where b.owner_id = new.id
      and b.deleted_at is null
    order by b.created_at asc
    limit 1;
  end if;

  perform net.http_post(
    url := 'https://broadbase.app/api/webhooks/profile-created',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '19c7b8864ea250eae1ef096e910e42467d035fd0fbdea5a315a5d972a8db5bff'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'profiles',
      'schema', 'public',
      'record', jsonb_build_object(
        'id', new.id,
        'email', v_email,
        'user_type', new.user_type,
        'first_name', split_part(coalesce(new.full_name, ''), ' ', 1),
        'brand_name', v_brand_name
      ),
      'old_record', null
    ),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

drop trigger if exists on_profile_created on public.profiles;

create trigger on_profile_created
after insert on public.profiles
for each row
execute function public.notify_profile_created();