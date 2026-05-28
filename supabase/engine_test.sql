-- Transactional proof of the assignment engine. ROLLBACK at the end keeps seed pristine.
\set ON_ERROR_STOP on
begin;

\echo '=== 1) SEED SANITY (expect agents=5, available=4, listings=20) ==='
select 'agents' as metric, count(*)::text as value from agents
union all select 'available_agents', count(*)::text from agents where status='available'
union all select 'away_agents', count(*)::text from agents where status='away'
union all select 'listings', count(*)::text from listings;

\echo '=== 2) ROUND-ROBIN: create 6 inquiries, expect balanced 2/2/1/1 across the 4 available agents, Bea(away)=0 ==='
select start_inquiry('t1','C1');
select start_inquiry('t2','C2');
select start_inquiry('t3','C3');
select start_inquiry('t4','C4');
select start_inquiry('t5','C5');
select start_inquiry('t6','C6');

select a.name, a.status, count(i.id) as active_chats
from agents a
left join inquiries i on i.current_agent_id = a.id and i.state = 'assigned'
group by a.name, a.status
order by active_chats desc, a.name;

\echo '=== 3) TIMEOUT REASSIGN on t1: agent before vs after must DIFFER ==='
update inquiries set last_customer_msg_at = now() - interval '20 seconds',
                     current_assigned_at  = now() - interval '20 seconds'
 where session_id = 't1';
select (select name from agents where id = (select current_agent_id from inquiries where session_id='t1')) as agent_before;
select reconcile_assignments(5);  -- 20s silent > 5s timeout => overdue
select (select name from agents where id = (select current_agent_id from inquiries where session_id='t1')) as agent_after;

\echo 'Audit trail for t1 (expect: initial released, then reassigned_timeout active):'
select a.reason, a.released_at is null as is_active, ag.name as agent
from assignments a
join inquiries i on i.id = a.inquiry_id
join agents ag on ag.id = a.agent_id
where i.session_id = 't1'
order by a.assigned_at;

\echo '=== 4) RESOLVE t2: expect state=resolved, current_agent_id=NULL, assignment released ==='
select resolve_inquiry(id) from inquiries where session_id='t2';
select state, current_agent_id is null as no_owner from inquiries where session_id='t2';
select count(*) as open_assignments_for_t2
from assignments a join inquiries i on i.id=a.inquiry_id
where i.session_id='t2' and a.released_at is null;

\echo '=== 5) GUARANTEE: every non-resolved inquiry has an owner OR is queued ==='
select count(*) as orphans
from inquiries
where state = 'assigned' and current_agent_id is null;

rollback;
\echo '=== rolled back — seed restored ==='
