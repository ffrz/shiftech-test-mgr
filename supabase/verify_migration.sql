-- Verification queries for migration 20260725000005

-- 1. Check migration was recorded
select name, version from supabase_migrations.schema_migrations
where version like '20260725%'
order by version;

-- 2. Users table: row count, sample data
select '=== USERS TABLE ===' as info;
select count(*) as user_count from users;
select id, email, role, full_name, deleted_at is not null as is_deleted
from users
order by email
limit 10;

-- 3. Check role distribution in users
select '=== ROLE DISTRIBUTION ===' as info;
select role, count(*) from users group by role;

-- 4. Profiles table: count per user, sample data
select '=== PROFILES TABLE ===' as info;
select count(*) as profile_count from profiles;
select p.id, p.username, p.display_name, p.avatar_url, u.email, u.role
from profiles p
join users u on u.id = p.id
order by u.email
limit 10;

-- 5. Check for any profiles row without matching users row (orphans)
select '=== ORPHAN CHECKS ===' as info;
select count(*) as users_without_profile
from users u left join profiles p on p.id = u.id
where p.id is null;
select count(*) as profiles_without_user
from profiles p left join users u on u.id = p.id
where u.id is null;

-- 6. Check username uniqueness and nulls
select '=== USERNAME INTEGRITY ===' as info;
select count(*) as null_usernames from profiles where username is null;
select username, count(*) as dup_count
from profiles
group by username
having count(*) > 1;

-- 7. Check is_admin() and is_approved() function definitions
select '=== FUNCTION DEFINITIONS ===' as info;
select proname, prosrc
from pg_proc
where proname in ('is_admin', 'is_approved')
order by proname;

-- 8. Verify FKs still point to users (not profiles directly)
select '=== FOREIGN KEY CHECKS ===' as info;
select
    con.conname as constraint_name,
    cl.relname as referencing_table,
    col.attname as referencing_column,
    cl2.relname as referenced_table
from pg_constraint con
join pg_class cl on cl.oid = con.conrelid
join pg_class cl2 on cl2.oid = con.confrelid
join pg_attribute col on col.attrelid = con.conrelid and col.attnum = any(con.conkey)
where con.confrelid = 'users'::regclass or con.confrelid = 'profiles'::regclass
and con.contype = 'f'
order by cl.relname, col.attname;

-- 9. Check RLS policies on new profiles table
select '=== PROFILES RLS POLICIES ===' as info;
select schemaname, tablename, policyname, permissive, roles, cmd, qual
from pg_policies
where tablename = 'profiles'
order by policyname;

-- 10. Verify handle_new_user() trigger function
select '=== TRIGGER FUNCTION ===' as info;
select proname, prosrc
from pg_proc
where proname = 'handle_new_user';
