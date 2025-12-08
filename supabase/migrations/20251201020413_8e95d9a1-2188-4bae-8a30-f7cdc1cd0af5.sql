-- Add auto email sending control setting
INSERT INTO cron_settings (key, value)
VALUES ('auto_email_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE cron_settings IS 'Settings for cron jobs and automated tasks';
COMMENT ON COLUMN cron_settings.key IS 'Setting key identifier';
COMMENT ON COLUMN cron_settings.value IS 'Setting value';