USE hirenextai;

ALTER TABLE users
  ADD COLUMN interface_language VARCHAR(50) DEFAULT 'English' AFTER language,
  ADD COLUMN ai_language VARCHAR(50) DEFAULT 'English' AFTER interface_language;
