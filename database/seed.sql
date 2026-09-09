-- Demo seed. Run only in a classroom database.
insert into tenants (name, slug) values ('Growth Classroom', 'growth-classroom') on conflict do nothing;

insert into providers (tenant_id, name, adapter, priority, success_rate, latency_ms)
select t.id, p.name, p.adapter, p.priority, p.success_rate, p.latency
from tenants t
cross join (values
  ('DemoProvider Fast','demo-fast',10,98.40,230),
  ('DemoProvider Economy','demo-economy',20,95.70,520),
  ('DemoProvider Premium','demo-premium',5,99.20,180)
) as p(name,adapter,priority,success_rate,latency)
where t.slug='growth-classroom'
on conflict do nothing;

insert into categories (tenant_id, name, slug)
select t.id, 'Categoría ' || n, 'categoria-' || n
from tenants t cross join generate_series(1,12) n
where t.slug='growth-classroom'
on conflict do nothing;

insert into services (tenant_id, category_id, provider_id, external_id, name, description, base_price_minor, sale_price_minor, min_quantity, max_quantity, refill_enabled, cancel_enabled)
select t.id, c.id, p.id, 'demo-service-' || lpad(n::text,3,'0'), 'Servicio sandbox ' || n, 'Servicio educativo simulado', 75+n*3, 110+n*4, 10, 10000, n%2=0, n%3<>0
from tenants t
join categories c on c.tenant_id=t.id
join providers p on p.tenant_id=t.id
cross join generate_series(1,100) n
where t.slug='growth-classroom' and c.slug='categoria-' || (((n-1)%12)+1) and p.name = (array['DemoProvider Fast','DemoProvider Economy','DemoProvider Premium'])[((n-1)%3)+1]
on conflict do nothing;
