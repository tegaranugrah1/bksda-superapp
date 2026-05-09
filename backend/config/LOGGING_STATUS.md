# Backend Logging & Error Handling

## Logging Configuration ✅
**File**: `backend/config/logging.php`

- Default Channel: `stack` (combines multiple channels)
- Deprecations Channel: `null` (disabled in production)
- Available Channels: single, daily, slack, syslog, errorlog, monolog, custom

## Error Handling ✅

**Debug Mode** (`backend/config/app.php`):
```php
'debug' => (bool) env('APP_DEBUG', false),
```

- `APP_DEBUG=true` in local - shows detailed error pages
- `APP_DEBUG=false` in production - shows generic error page

## Environment Variables

```env
LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
APP_DEBUG=false
APP_ENV=production
```

## Best Practices

1. Never set `APP_DEBUG=true` in production
2. Use `LOG_CHANNEL=daily` for production (rotates daily)
3. Monitor `storage/logs/laravel.log` for errors
