CREATE TABLE IF NOT EXISTS session (
  id varchar(191) PRIMARY KEY,
  expiresAt datetime NOT NULL,
  token varchar(191) NOT NULL UNIQUE,
  createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ipAddress varchar(191),
  userAgent text,
  userId varchar(191) NOT NULL,
  CONSTRAINT session_user_fk FOREIGN KEY (userId) REFERENCES `user`(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account (
  id varchar(191) PRIMARY KEY,
  accountId varchar(191) NOT NULL,
  providerId varchar(191) NOT NULL,
  userId varchar(191) NOT NULL,
  accessToken text,
  refreshToken text,
  idToken text,
  accessTokenExpiresAt datetime,
  refreshTokenExpiresAt datetime,
  scope text,
  password text,
  createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT account_user_fk FOREIGN KEY (userId) REFERENCES `user`(id) ON DELETE CASCADE
);
