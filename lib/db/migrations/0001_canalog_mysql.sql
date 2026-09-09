CREATE DATABASE IF NOT EXISTS canalog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE canalog;

CREATE TABLE IF NOT EXISTS `user` (
  id varchar(191) PRIMARY KEY,
  name varchar(191) NOT NULL,
  email varchar(191) NOT NULL UNIQUE,
  emailVerified boolean NOT NULL DEFAULT false,
  image text,
  role varchar(32) NOT NULL DEFAULT 'admin',
  createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS session (
  id varchar(191) PRIMARY KEY, expiresAt datetime NOT NULL, token varchar(191) NOT NULL UNIQUE,
  createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ipAddress varchar(191), userAgent text, userId varchar(191) NOT NULL,
  CONSTRAINT session_user_fk FOREIGN KEY (userId) REFERENCES `user`(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS account (
  id varchar(191) PRIMARY KEY, accountId varchar(191) NOT NULL, providerId varchar(191) NOT NULL,
  userId varchar(191) NOT NULL, accessToken text, refreshToken text, idToken text,
  accessTokenExpiresAt datetime, refreshTokenExpiresAt datetime, scope text, password text,
  createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT account_user_fk FOREIGN KEY (userId) REFERENCES `user`(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS verification (
  id varchar(191) PRIMARY KEY, identifier varchar(191) NOT NULL, value text NOT NULL,
  expiresAt datetime NOT NULL, createdAt datetime DEFAULT CURRENT_TIMESTAMP, updatedAt datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS trucks (
  id int AUTO_INCREMENT PRIMARY KEY, user_id varchar(191) NOT NULL, code varchar(64) NOT NULL, plate varchar(16) NOT NULL,
  model varchar(128) NOT NULL, brand varchar(128) NOT NULL, status varchar(32) NOT NULL DEFAULT 'active',
  current_driver varchar(191), current_km decimal(12,2) NOT NULL DEFAULT 0, benchmark_km_l decimal(8,3) NOT NULL DEFAULT 2.1,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY trucks_owner_code (user_id, code), UNIQUE KEY trucks_owner_plate (user_id, plate)
);
CREATE TABLE IF NOT EXISTS drivers (
  id int AUTO_INCREMENT PRIMARY KEY, user_id varchar(191) NOT NULL, name varchar(191) NOT NULL, email varchar(191),
  phone varchar(64), employee_id varchar(64), assigned_truck_id int, status varchar(32) NOT NULL DEFAULT 'active',
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT drivers_truck_fk FOREIGN KEY (assigned_truck_id) REFERENCES trucks(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS daily_operations (
  id int AUTO_INCREMENT PRIMARY KEY, user_id varchar(191) NOT NULL, truck_id int NOT NULL, driver_name varchar(191) NOT NULL,
  operation_date date NOT NULL, km decimal(12,2) NOT NULL, trips decimal(10,2) NOT NULL, tons decimal(12,2) NOT NULL,
  liters decimal(12,2) NOT NULL, km_per_trip decimal(12,4) NOT NULL, tons_per_trip decimal(12,4) NOT NULL,
  km_per_liter decimal(12,4) NOT NULL, liters_per_100_km decimal(12,4) NOT NULL, created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT operations_truck_fk FOREIGN KEY (truck_id) REFERENCES trucks(id), INDEX operations_user_date (user_id, operation_date)
);
CREATE TABLE IF NOT EXISTS fuel_records (
  id int AUTO_INCREMENT PRIMARY KEY, user_id varchar(191) NOT NULL, truck_id int NOT NULL, driver_name varchar(191) NOT NULL,
  record_date date NOT NULL, km decimal(12,2) NOT NULL, liters decimal(12,2) NOT NULL, price_per_liter decimal(12,4) NOT NULL,
  total_cost decimal(14,2) NOT NULL, cost_per_km decimal(14,4) NOT NULL, station varchar(191), fuel_type varchar(64),
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT fuel_truck_fk FOREIGN KEY (truck_id) REFERENCES trucks(id), INDEX fuel_user_date (user_id, record_date)
);
CREATE TABLE IF NOT EXISTS trips (
  id int AUTO_INCREMENT PRIMARY KEY, user_id varchar(191) NOT NULL, truck_id int NOT NULL, driver_id int, trip_date date NOT NULL,
  origin varchar(191) NOT NULL, destination varchar(191) NOT NULL, km decimal(12,2) NOT NULL, tons decimal(12,2) NOT NULL,
  started_at datetime, notes text, created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT trips_truck_fk FOREIGN KEY (truck_id) REFERENCES trucks(id), CONSTRAINT trips_driver_fk FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
  INDEX trips_user_date (user_id, trip_date)
);
CREATE TABLE IF NOT EXISTS maintenance_records (
  id int AUTO_INCREMENT PRIMARY KEY, user_id varchar(191) NOT NULL, truck_id int NOT NULL, maintenance_date date NOT NULL,
  problem varchar(191) NOT NULL, description text, parts_cost decimal(14,2) NOT NULL DEFAULT 0, labor_cost decimal(14,2) NOT NULL DEFAULT 0,
  services_cost decimal(14,2) NOT NULL DEFAULT 0, total_cost decimal(14,2) NOT NULL DEFAULT 0, workshop varchar(191),
  status varchar(32) NOT NULL DEFAULT 'open', entry_at datetime, exit_at datetime, created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT maintenance_truck_fk FOREIGN KEY (truck_id) REFERENCES trucks(id)
);
CREATE TABLE IF NOT EXISTS downtime_records (
  id int AUTO_INCREMENT PRIMARY KEY, user_id varchar(191) NOT NULL, truck_id int NOT NULL, reason varchar(191) NOT NULL,
  started_at datetime NOT NULL, ended_at datetime, description text, status varchar(32) NOT NULL DEFAULT 'open',
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT downtime_truck_fk FOREIGN KEY (truck_id) REFERENCES trucks(id)
);
CREATE TABLE IF NOT EXISTS expenses (
  id int AUTO_INCREMENT PRIMARY KEY, user_id varchar(191) NOT NULL, truck_id int, category varchar(64) NOT NULL,
  amount decimal(14,2) NOT NULL, expense_date date NOT NULL, description text, created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT expenses_truck_fk FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS revenues (
  id int AUTO_INCREMENT PRIMARY KEY, user_id varchar(191) NOT NULL, truck_id int, trip_id int, origin varchar(191), destination varchar(191),
  tons decimal(12,2) NOT NULL DEFAULT 0, trips decimal(10,2) NOT NULL DEFAULT 0, km decimal(12,2) NOT NULL DEFAULT 0,
  amount decimal(14,2) NOT NULL, revenue_date date NOT NULL, created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT revenues_truck_fk FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE SET NULL, CONSTRAINT revenues_trip_fk FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS alerts (
  id int AUTO_INCREMENT PRIMARY KEY, user_id varchar(191) NOT NULL, truck_id int, severity varchar(32) NOT NULL, title varchar(191) NOT NULL,
  message text NOT NULL, resolved_at datetime, created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT alerts_truck_fk FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id int AUTO_INCREMENT PRIMARY KEY, user_id varchar(191) NOT NULL, entity varchar(64) NOT NULL, entity_id varchar(191) NOT NULL,
  action varchar(64) NOT NULL, old_value text, new_value text, reason text, created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX audit_entity (user_id, entity, entity_id)
);
CREATE TABLE IF NOT EXISTS monthly_closures (
  id int AUTO_INCREMENT PRIMARY KEY, user_id varchar(191) NOT NULL, reference_month date NOT NULL, status varchar(32) NOT NULL DEFAULT 'open',
  closed_at datetime, closed_by varchar(191), created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY closure_owner_month (user_id, reference_month)
);
