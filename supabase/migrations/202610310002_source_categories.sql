create function public.civic_category_stats() returns table(name text,count bigint)
language sql security invoker set search_path='' as $$
select category,count(*) from public.civic_sources group by category order by count(*) desc;
$$;
grant execute on function public.civic_category_stats() to anon,authenticated;
