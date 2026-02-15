-- 1. Create Profiles Table (Public Profile Data)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone
);

-- 2. Create Transactions Table
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  amount numeric not null,
  description text,
  category text, 
  type text check (type in ('income', 'expense', 'transfer')),
  date date default current_date,
  created_at timestamp with time zone default now()
);

-- 3. Enable Row Level Security (RLS)
-- This ensures users can ONLY see/edit their own data
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;

-- 4. Create Policies for Profiles
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- 5. Create Policies for Transactions
create policy "Users can view their own transactions."
  on transactions for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own transactions."
  on transactions for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own transactions."
  on transactions for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own transactions."
  on transactions for delete
  using ( auth.uid() = user_id );

-- 6. Trigger to create profile on signup
-- This automatically creates a profile row when a new user signs up
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
