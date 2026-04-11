-- Run in Supabase SQL Editor. Distinct INCI strings from products matching a substring (for avoid-list autocomplete).

create or replace function public.ingredient_suggest(search_term text)
returns table (ingredient text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct e as ingredient
  from public.products p,
  lateral jsonb_array_elements_text(coalesce(p.inci_list, '[]'::jsonb)) as e
  where length(trim(coalesce(search_term, ''))) >= 2
    and lower(e) like '%' || lower(trim(search_term)) || '%'
  order by ingredient asc
  limit 30;
$$;

grant execute on function public.ingredient_suggest(text) to service_role;
