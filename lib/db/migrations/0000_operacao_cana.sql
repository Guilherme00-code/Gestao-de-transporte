CREATE TABLE IF NOT EXISTS "user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  image text,
  role text NOT NULL DEFAULT 'admin',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session (
  id text PRIMARY KEY,
  "expiresAt" timestamp NOT NULL,
  token text NOT NULL UNIQUE,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account (
  id text PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamp,
  "refreshTokenExpiresAt" timestamp,
  scope text,
  password text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp DEFAULT now(),
  "updatedAt" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trucks (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  code text NOT NULL,
  plate text NOT NULL,
  model text NOT NULL,
  brand text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_driver text,
  current_km numeric NOT NULL DEFAULT 0,
  benchmark_km_l numeric NOT NULL DEFAULT 2.1,
  created_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (user_id, code),
  UNIQUE (user_id, plate)
);

CREATE TABLE IF NOT EXISTS drivers (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  employee_id text,
  assigned_truck_id integer REFERENCES trucks(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_operations (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  truck_id integer NOT NULL REFERENCES trucks(id),
  driver_name text NOT NULL,
  operation_date date NOT NULL,
  km numeric NOT NULL CHECK (km > 0),
  trips numeric NOT NULL CHECK (trips > 0),
  tons numeric NOT NULL CHECK (tons >= 0),
  liters numeric NOT NULL CHECK (liters > 0),
  km_per_trip numeric NOT NULL,
  tons_per_trip numeric NOT NULL,
  km_per_liter numeric NOT NULL,
  liters_per_100_km numeric NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fuel_records (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  truck_id integer NOT NULL REFERENCES trucks(id),
  driver_name text NOT NULL,
  record_date date NOT NULL,
  km numeric NOT NULL CHECK (km > 0),
  liters numeric NOT NULL CHECK (liters > 0),
  price_per_liter numeric NOT NULL CHECK (price_per_liter >= 0),
  total_cost numeric NOT NULL,
  cost_per_km numeric NOT NULL,
  station text,
  fuel_type text,
  created_at timestamp NOT NULL DEFAULT now()
);

ALTER TABLE daily_operations ADD COLUMN IF NOT EXISTS liters_per_100_km numeric NOT NULL DEFAULT 0;
ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS cost_per_km numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS trips (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  truck_id integer NOT NULL REFERENCES trucks(id),
  driver_id integer REFERENCES drivers(id) ON DELETE SET NULL,
  trip_date date NOT NULL,
  origin text NOT NULL,
  destination text NOT NULL,
  km numeric NOT NULL CHECK (km >= 0),
  tons numeric NOT NULL CHECK (tons >= 0),
  started_at timestamp,
  notes text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS maintenance_records (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  truck_id integer NOT NULL REFERENCES trucks(id),
  maintenance_date date NOT NULL,
  problem text NOT NULL,
  description text,
  parts_cost numeric NOT NULL DEFAULT 0 CHECK (parts_cost >= 0),
  labor_cost numeric NOT NULL DEFAULT 0 CHECK (labor_cost >= 0),
  services_cost numeric NOT NULL DEFAULT 0 CHECK (services_cost >= 0),
  total_cost numeric NOT NULL DEFAULT 0,
  workshop text,
  status text NOT NULL DEFAULT 'open',
  entry_at timestamp,
  exit_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS downtime_records (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  truck_id integer NOT NULL REFERENCES trucks(id),
  reason text NOT NULL,
  started_at timestamp NOT NULL,
  ended_at timestamp,
  description text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  truck_id integer REFERENCES trucks(id) ON DELETE SET NULL,
  category text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  expense_date date NOT NULL,
  description text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revenues (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  truck_id integer REFERENCES trucks(id) ON DELETE SET NULL,
  trip_id integer REFERENCES trips(id) ON DELETE SET NULL,
  origin text,
  destination text,
  tons numeric NOT NULL DEFAULT 0,
  trips numeric NOT NULL DEFAULT 0,
  km numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL CHECK (amount >= 0),
  revenue_date date NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  truck_id integer REFERENCES trucks(id) ON DELETE SET NULL,
  severity text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  resolved_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  entity text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  old_value text,
  new_value text,
  reason text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monthly_closures (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  reference_month date NOT NULL,
  status text NOT NULL DEFAULT 'open',
  closed_at timestamp,
  closed_by text,
  created_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (user_id, reference_month)
);

CREATE INDEX IF NOT EXISTS daily_operations_user_date_idx ON daily_operations (user_id, operation_date);
CREATE INDEX IF NOT EXISTS fuel_records_user_date_idx ON fuel_records (user_id, record_date);
CREATE INDEX IF NOT EXISTS trips_user_date_idx ON trips (user_id, trip_date);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs (user_id, entity, entity_id);
