import { boolean, date, integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('admin'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})
export const session = pgTable('session', { id: text('id').primaryKey(), expiresAt: timestamp('expiresAt').notNull(), token: text('token').notNull().unique(), createdAt: timestamp('createdAt').notNull().defaultNow(), updatedAt: timestamp('updatedAt').notNull().defaultNow(), ipAddress: text('ipAddress'), userAgent: text('userAgent'), userId: text('userId').notNull() })
export const account = pgTable('account', { id: text('id').primaryKey(), accountId: text('accountId').notNull(), providerId: text('providerId').notNull(), userId: text('userId').notNull(), accessToken: text('accessToken'), refreshToken: text('refreshToken'), idToken: text('idToken'), accessTokenExpiresAt: timestamp('accessTokenExpiresAt'), refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'), scope: text('scope'), password: text('password'), createdAt: timestamp('createdAt').notNull().defaultNow(), updatedAt: timestamp('updatedAt').notNull().defaultNow() })
export const verification = pgTable('verification', { id: text('id').primaryKey(), identifier: text('identifier').notNull(), value: text('value').notNull(), expiresAt: timestamp('expiresAt').notNull(), createdAt: timestamp('createdAt').defaultNow(), updatedAt: timestamp('updatedAt').defaultNow() })

export const trucks = pgTable('truck', { id: serial('id').primaryKey(), ownerId: text('owner_id').notNull(), code: text('code').notNull(), plate: text('plate').notNull(), brand: text('brand').notNull(), model: text('model').notNull(), year: integer('year'), capacityTons: numeric('capacity_tons', { precision: 10, scale: 2 }), fuelType: text('fuel_type').default('Diesel'), benchmarkKmL: numeric('benchmark_km_l', { precision: 10, scale: 2 }), currentKm: numeric('current_km', { precision: 12, scale: 2 }).notNull().default('0'), status: text('status').notNull().default('active'), createdAt: timestamp('created_at').notNull().defaultNow() })
export const drivers = pgTable('driver', { id: serial('id').primaryKey(), ownerId: text('owner_id').notNull(), userId: text('user_id'), name: text('name').notNull(), email: text('email'), phone: text('phone'), employeeId: text('employee_id'), assignedTruckId: integer('assigned_truck_id'), status: text('status').notNull().default('active'), createdAt: timestamp('created_at').notNull().defaultNow() })
export const transportOperation = pgTable('transport_operation', { id: serial('id').primaryKey(), userId: text('user_id').notNull(), truckId: integer('truck_id'), driverId: integer('driver_id'), operationDate: date('operation_date').notNull(), truckCode: text('truck_code').notNull(), driverName: text('driver_name').notNull(), city: text('city').notNull(), km: numeric('km', { precision: 12, scale: 2 }).notNull(), tons: numeric('tons', { precision: 12, scale: 2 }).notNull(), liters: numeric('liters', { precision: 12, scale: 2 }).notNull(), trips: numeric('trips', { precision: 10, scale: 2 }).notNull().default('1'), status: text('status').notNull().default('concluida'), notes: text('notes'), createdAt: timestamp('created_at').notNull().defaultNow() })
export const fuelRecord = pgTable('fuel_record', { id: serial('id').primaryKey(), ownerId: text('owner_id').notNull(), truckId: integer('truck_id'), driverId: integer('driver_id'), recordDate: date('record_date').notNull(), odometer: numeric('odometer', { precision: 12, scale: 2 }), km: numeric('km', { precision: 12, scale: 2 }).notNull(), liters: numeric('liters', { precision: 12, scale: 2 }).notNull(), pricePerLiter: numeric('price_per_liter', { precision: 10, scale: 3 }).notNull().default('0'), totalCost: numeric('total_cost', { precision: 12, scale: 2 }).notNull().default('0'), station: text('station'), fuelType: text('fuel_type').notNull().default('Diesel'), createdAt: timestamp('created_at').notNull().defaultNow() })
export const maintenanceRecord = pgTable('maintenance_record', { id: serial('id').primaryKey(), ownerId: text('owner_id').notNull(), truckId: integer('truck_id').notNull(), maintenanceDate: date('maintenance_date').notNull(), maintenanceType: text('maintenance_type').notNull().default('corretiva'), problem: text('problem').notNull(), description: text('description'), partsCost: numeric('parts_cost', { precision: 12, scale: 2 }).notNull().default('0'), laborCost: numeric('labor_cost', { precision: 12, scale: 2 }).notNull().default('0'), status: text('status').notNull().default('aberta'), resolvedAt: date('resolved_at'), createdAt: timestamp('created_at').notNull().defaultNow() })
export const downtimeRecord = pgTable('downtime_record', { id: serial('id').primaryKey(), ownerId: text('owner_id').notNull(), truckId: integer('truck_id').notNull(), startedAt: date('started_at').notNull(), endedAt: date('ended_at'), reason: text('reason').notNull(), potentialRevenue: numeric('potential_revenue', { precision: 12, scale: 2 }).notNull().default('0'), createdAt: timestamp('created_at').notNull().defaultNow() })
export const revenue = pgTable('revenue', { id: serial('id').primaryKey(), ownerId: text('owner_id').notNull(), truckId: integer('truck_id'), operationId: integer('operation_id'), revenueDate: date('revenue_date').notNull(), description: text('description').notNull(), amount: numeric('amount', { precision: 12, scale: 2 }).notNull(), createdAt: timestamp('created_at').notNull().defaultNow() })
export const expense = pgTable('expense', { id: serial('id').primaryKey(), ownerId: text('owner_id').notNull(), truckId: integer('truck_id'), expenseDate: date('expense_date').notNull(), category: text('category').notNull(), description: text('description').notNull(), amount: numeric('amount', { precision: 12, scale: 2 }).notNull(), createdAt: timestamp('created_at').notNull().defaultNow() })
export const monthlyClosure = pgTable('monthly_closure', { id: serial('id').primaryKey(), ownerId: text('owner_id').notNull(), referenceMonth: date('reference_month').notNull(), status: text('status').notNull().default('open'), closedAt: timestamp('closed_at'), closedBy: text('closed_by'), createdAt: timestamp('created_at').notNull().defaultNow() })
export const incident = pgTable('incident', { id: serial('id').primaryKey(), ownerId: text('owner_id').notNull(), truckId: integer('truck_id'), driverId: integer('driver_id'), incidentDate: date('incident_date').notNull(), category: text('category').notNull(), description: text('description').notNull(), status: text('status').notNull().default('aberta'), createdAt: timestamp('created_at').notNull().defaultNow() })
export const benchmark = pgTable('benchmark', { id: serial('id').primaryKey(), ownerId: text('owner_id').notNull(), truckId: integer('truck_id'), metric: text('metric').notNull(), targetValue: numeric('target_value', { precision: 12, scale: 2 }).notNull(), validFrom: date('valid_from').notNull(), createdAt: timestamp('created_at').notNull().defaultNow() })
export const notification = pgTable('notification', { id: serial('id').primaryKey(), userId: text('user_id').notNull(), title: text('title').notNull(), message: text('message').notNull(), readAt: timestamp('read_at'), createdAt: timestamp('created_at').notNull().defaultNow() })
export const setting = pgTable('setting', { id: serial('id').primaryKey(), ownerId: text('owner_id').notNull(), settingKey: text('setting_key').notNull(), settingValue: text('setting_value').notNull(), updatedAt: timestamp('updated_at').notNull().defaultNow() })
export const preventiveMaintenanceRule = pgTable('preventive_maintenance_rule', { id: serial('id').primaryKey(), ownerId: text('owner_id').notNull(), truckId: integer('truck_id'), name: text('name').notNull(), component: text('component').notNull(), intervalKm: numeric('interval_km', { precision: 12, scale: 2 }), intervalDays: integer('interval_days'), createdAt: timestamp('created_at').notNull().defaultNow() })
export const alertRule = pgTable('alert_rule', { id: serial('id').primaryKey(), ownerId: text('owner_id').notNull(), category: text('category').notNull(), metric: text('metric').notNull(), warningPercent: numeric('warning_percent', { precision: 6, scale: 2 }).notNull(), criticalPercent: numeric('critical_percent', { precision: 6, scale: 2 }).notNull(), createdAt: timestamp('created_at').notNull().defaultNow() })
export const revenueRule = pgTable('revenue_rule', { id: serial('id').primaryKey(), ownerId: text('owner_id').notNull(), name: text('name').notNull(), billingType: text('billing_type').notNull(), origin: text('origin'), destination: text('destination'), rate: numeric('rate', { precision: 12, scale: 2 }).notNull(), validFrom: date('valid_from').notNull(), createdAt: timestamp('created_at').notNull().defaultNow() })
export const expenseCategory = pgTable('expense_category', { id: serial('id').primaryKey(), ownerId: text('owner_id').notNull(), name: text('name').notNull(), scope: text('scope').notNull(), createdAt: timestamp('created_at').notNull().defaultNow() })
export const auditLog = pgTable('audit_log', { id: serial('id').primaryKey(), userId: text('user_id').notNull(), action: text('action').notNull(), entity: text('entity').notNull(), entityId: text('entity_id'), metadata: text('metadata'), createdAt: timestamp('created_at').notNull().defaultNow() })

export const trips = transportOperation
export const fuelRecords = fuelRecord
export const maintenanceRecords = maintenanceRecord
export const downtimeRecords = downtimeRecord
export const revenues = revenue
export const expenses = expense
export const monthlyClosures = monthlyClosure
export const incidents = incident
export const benchmarks = benchmark
export const notifications = notification
export const settings = setting
export const dailyOperations = transportOperation
export const auditLogs = auditLog
export const preventiveMaintenanceRules = preventiveMaintenanceRule
export const alertRules = alertRule
export const revenueRules = revenueRule
export const expenseCategories = expenseCategory
export const trucksLegacy = trucks
export const driversLegacy = drivers
