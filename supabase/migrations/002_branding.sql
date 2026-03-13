-- Sprint 8: Add branding column for white-label customization
ALTER TABLE clients ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT NULL;

-- Comment
COMMENT ON COLUMN clients.branding IS 'White-label branding: {logo_url, primary_color, secondary_color, accent_color}';
