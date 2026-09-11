CREATE TABLE IF NOT EXISTS transport_operation (
  id int AUTO_INCREMENT PRIMARY KEY,
  user_id varchar(191) NOT NULL,
  operation_date date NOT NULL,
  truck_code varchar(64) NOT NULL,
  driver_name varchar(191) NOT NULL,
  city varchar(191) NOT NULL,
  km decimal(12,2) NOT NULL,
  tons decimal(12,2) NOT NULL,
  liters decimal(12,2) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'concluida',
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX transport_operation_user_date (user_id, operation_date)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id int AUTO_INCREMENT PRIMARY KEY,
  user_id varchar(191) NOT NULL,
  action varchar(64) NOT NULL,
  entity varchar(64) NOT NULL,
  entity_id varchar(191),
  metadata text,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX audit_logs_user_entity (user_id, entity)
);
