CREATE TABLE IF NOT EXISTS professionals (
  id                   SERIAL PRIMARY KEY,
  name                 VARCHAR(255) NOT NULL,
  telegram_id          BIGINT UNIQUE,
  google_refresh_token TEXT,
  calendar_id          VARCHAR(255) DEFAULT 'primary',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id                   SERIAL PRIMARY KEY,
  professional_id      INTEGER REFERENCES professionals(id),
  client_name          VARCHAR(255) NOT NULL,
  client_telegram_id   BIGINT NOT NULL,
  service              VARCHAR(100) NOT NULL,
  duration_minutes     INTEGER NOT NULL,
  starts_at            TIMESTAMPTZ NOT NULL,
  ends_at              TIMESTAMPTZ NOT NULL,
  google_event_id      VARCHAR(255),
  reminder_job_id      VARCHAR(255),
  status               VARCHAR(50) DEFAULT 'confirmed',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_starts_at    ON appointments(starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_professional ON appointments(professional_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_client       ON appointments(client_telegram_id);
