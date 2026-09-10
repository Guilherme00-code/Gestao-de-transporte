ALTER TABLE trucks ADD COLUMN year int NULL;
ALTER TABLE trucks ADD COLUMN vin varchar(64) NULL;
ALTER TABLE trucks ADD COLUMN configuration varchar(128) NULL;
ALTER TABLE trucks ADD COLUMN fuel_type varchar(64) NULL;
ALTER TABLE trucks ADD COLUMN load_capacity_tons decimal(10,2) NULL;

ALTER TABLE drivers ADD COLUMN hire_date date NULL;
ALTER TABLE drivers ADD COLUMN notes text NULL;

ALTER TABLE daily_operations ADD COLUMN km_initial decimal(12,2) NULL;
ALTER TABLE daily_operations ADD COLUMN km_final decimal(12,2) NULL;
ALTER TABLE daily_operations ADD COLUMN notes text NULL;

ALTER TABLE maintenance_records ADD COLUMN maintenance_type varchar(32) NOT NULL DEFAULT 'corrective';

CREATE TABLE IF NOT EXISTS driver_truck_history (
  id int AUTO_INCREMENT PRIMARY KEY,
  user_id varchar(191) NOT NULL,
  driver_id int NOT NULL,
  truck_id int NOT NULL,
  started_at datetime NOT NULL,
  ended_at datetime NULL,
  notes text NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX driver_truck_history_scope (user_id, driver_id, started_at),
  CONSTRAINT driver_truck_history_driver_fk FOREIGN KEY (driver_id) REFERENCES drivers(id),
  CONSTRAINT driver_truck_history_truck_fk FOREIGN KEY (truck_id) REFERENCES trucks(id)
);

CREATE TABLE IF NOT EXISTS preventive_maintenance_rules (
  id int AUTO_INCREMENT PRIMARY KEY,
  user_id varchar(191) NOT NULL,
  truck_id int NULL,
  name varchar(191) NOT NULL,
  component varchar(128) NOT NULL,
  interval_km decimal(12,2) NULL,
  interval_days int NULL,
  last_service_km decimal(12,2) NULL,
  last_service_date date NULL,
  active boolean NOT NULL DEFAULT true,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX preventive_rules_scope (user_id, truck_id),
  CONSTRAINT preventive_rules_truck_fk FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS production_records (
  id int AUTO_INCREMENT PRIMARY KEY,
  user_id varchar(191) NOT NULL,
  truck_id int NOT NULL,
  driver_id int NULL,
  production_date date NOT NULL,
  trips decimal(10,2) NOT NULL DEFAULT 0,
  tons decimal(12,2) NOT NULL DEFAULT 0,
  km decimal(12,2) NOT NULL DEFAULT 0,
  notes text NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX production_scope_date (user_id, production_date),
  CONSTRAINT production_truck_fk FOREIGN KEY (truck_id) REFERENCES trucks(id),
  CONSTRAINT production_driver_fk FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS incidents (
  id int AUTO_INCREMENT PRIMARY KEY,
  user_id varchar(191) NOT NULL,
  truck_id int NULL,
  driver_id int NULL,
  incident_date datetime NOT NULL,
  category varchar(64) NOT NULL,
  description text NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'open',
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX incidents_scope_date (user_id, incident_date),
  CONSTRAINT incidents_truck_fk FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE SET NULL,
  CONSTRAINT incidents_driver_fk FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS revenue_rules (
  id int AUTO_INCREMENT PRIMARY KEY,
  user_id varchar(191) NOT NULL,
  name varchar(191) NOT NULL,
  billing_type varchar(32) NOT NULL,
  origin varchar(191) NULL,
  destination varchar(191) NULL,
  rate decimal(14,4) NOT NULL DEFAULT 0,
  valid_from date NOT NULL,
  valid_until date NULL,
  active boolean NOT NULL DEFAULT true,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX revenue_rules_scope (user_id, active, valid_from)
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id int AUTO_INCREMENT PRIMARY KEY,
  user_id varchar(191) NOT NULL,
  name varchar(128) NOT NULL,
  scope varchar(32) NOT NULL DEFAULT 'company',
  active boolean NOT NULL DEFAULT true,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY expense_categories_owner_name (user_id, name)
);

CREATE TABLE IF NOT EXISTS benchmarks (
  id int AUTO_INCREMENT PRIMARY KEY,
  user_id varchar(191) NOT NULL,
  truck_id int NULL,
  metric varchar(64) NOT NULL,
  source varchar(32) NOT NULL,
  target_value decimal(14,4) NOT NULL,
  valid_from date NOT NULL,
  valid_until date NULL,
  active boolean NOT NULL DEFAULT true,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX benchmarks_scope (user_id, truck_id, metric, active),
  CONSTRAINT benchmarks_truck_fk FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS alert_rules (
  id int AUTO_INCREMENT PRIMARY KEY,
  user_id varchar(191) NOT NULL,
  category varchar(64) NOT NULL,
  metric varchar(64) NOT NULL,
  warning_percent decimal(8,3) NOT NULL DEFAULT 5,
  critical_percent decimal(8,3) NOT NULL DEFAULT 10,
  active boolean NOT NULL DEFAULT true,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY alert_rules_owner_metric (user_id, category, metric)
);

CREATE TABLE IF NOT EXISTS notifications (
  id int AUTO_INCREMENT PRIMARY KEY,
  user_id varchar(191) NOT NULL,
  category varchar(64) NOT NULL,
  title varchar(191) NOT NULL,
  message text NOT NULL,
  read_at datetime NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX notifications_inbox (user_id, read_at, created_at)
);

CREATE TABLE IF NOT EXISTS settings (
  id int AUTO_INCREMENT PRIMARY KEY,
  user_id varchar(191) NOT NULL,
  setting_key varchar(128) NOT NULL,
  setting_value text NOT NULL,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY settings_owner_key (user_id, setting_key)
);
