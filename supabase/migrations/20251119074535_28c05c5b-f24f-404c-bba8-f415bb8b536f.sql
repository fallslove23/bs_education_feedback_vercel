-- Add retry tracking to email_logs table
ALTER TABLE email_logs 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;

-- Add comment for clarity
COMMENT ON COLUMN email_logs.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN email_logs.last_retry_at IS 'Timestamp of last retry attempt';
COMMENT ON COLUMN email_logs.max_retries IS 'Maximum number of retries allowed';

-- Create index for efficient retry queries
CREATE INDEX IF NOT EXISTS idx_email_logs_retry_lookup 
ON email_logs(status, retry_count, created_at) 
WHERE status IN ('partial', 'failed');