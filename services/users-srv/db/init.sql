  -- Crear extensión para bcrypt
  create extension if not exists pgcrypto;

  -- Roles
  create table if not exists roles (
    role_id bigserial primary key,
    name varchar(30) not null unique,
    description varchar(160)
  );

  -- Users
  create table if not exists users (
    user_id bigserial primary key,
    first_name varchar(100) not null,
    last_name varchar(100) not null,
    email varchar(120) not null unique,
    phone varchar(20) not null unique,
    username varchar(60) not null unique,
    password_hash varchar(255) not null,
    status varchar(20) not null default 'ACTIVE',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz default null
  );

  alter table users
    add column if not exists phone varchar(20);

  -- User↔Role
  create table if not exists user_roles (
    user_role_id bigserial primary key,
    user_id bigint not null references users(user_id) on delete cascade,
    role_id bigint not null references roles(role_id) on delete cascade,
    assigned_at timestamptz not null default now(),
    unique (user_id, role_id)
  );

  -- Insert roles
  insert into roles(name, description) values
    ('ADMIN',      'System administrator'),
    ('SUPERVISOR', 'Operations supervisor'),
    ('DRIVER',     'Vehicle driver')
  on conflict (name) do nothing;

  -- Insert users con bcrypt
  insert into users(first_name, last_name, email, phone, username, password_hash)
  values
    ('Alice', 'Admin', 'josuegarcab2@hotmail.com', '+51 111 222 333', 'alice_admin', crypt('admin123', gen_salt('bf'))),
    ('Sam',   'Supervisor', 'samsupervisor@gmail.com', '+51 444 555 666', 'sam_supervisor', crypt('supervisor123', gen_salt('bf'))),
    ('Dylan', 'Driver', 'dylandriver@gmail.com', '+51 777 888 999', 'dylan_driver', crypt('driver123', gen_salt('bf'))),
    -- Admin extras
    ('Bruce', 'Admin', 'bruceadmin@gmail.com', '+51 111 333 555', 'bruce_admin', crypt('admin123', gen_salt('bf'))),
    ('Carol', 'Admin', 'caroladmin@gmail.com', '+51 111 444 666', 'carol_admin', crypt('admin123', gen_salt('bf'))),
    -- Supervisors extras
    ('Mark', 'Supervisor', 'marksupervisor@gmail.com', '+51 444 666 888', 'mark_supervisor', crypt('supervisor123', gen_salt('bf'))),
    ('Lisa', 'Supervisor', 'lisasupervisor@gmail.com', '+51 444 777 999', 'lisa_supervisor', crypt('supervisor123', gen_salt('bf'))),
    -- Drivers extras
    ('John', 'Driver', 'johndriver@gmail.com', '+51 777 111 222', 'john_driver', crypt('driver123', gen_salt('bf'))),
    ('Mary', 'Driver', 'marydriver@gmail.com', '+51 777 222 333', 'mary_driver', crypt('driver123', gen_salt('bf')))
  on conflict (username) do nothing;

  -- Asignar roles a usuarios
  insert into user_roles(user_id, role_id)
  select u.user_id, r.role_id
  from users u
  join roles r on (
    (u.username = 'alice_admin'     and r.name = 'ADMIN') or
    (u.username = 'bruce_admin'     and r.name = 'ADMIN') or
    (u.username = 'carol_admin'     and r.name = 'ADMIN') or
    (u.username = 'sam_supervisor'  and r.name = 'SUPERVISOR') or
    (u.username = 'mark_supervisor' and r.name = 'SUPERVISOR') or
    (u.username = 'lisa_supervisor' and r.name = 'SUPERVISOR') or
    (u.username = 'dylan_driver'    and r.name = 'DRIVER')
    or (u.username = 'john_driver'   and r.name = 'DRIVER')
    or (u.username = 'mary_driver'   and r.name = 'DRIVER')
  );

