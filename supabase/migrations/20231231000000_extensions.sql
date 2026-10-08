-- Enable extensions required by migrations
create extension if not exists "btree_gist";     -- needed for EXCLUDE USING GIST with uuid
create extension if not exists "uuid-ossp";      -- fallback for gen_random_uuid() on older PG
