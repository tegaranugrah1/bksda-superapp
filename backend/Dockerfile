FROM php:8.4-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    postgresql-dev \
    libzip-dev \
    zip \
    unzip \
    curl \
    git \
    poppler-utils \
    icu-dev \
    oniguruma-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    libpng-dev

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg && \
    docker-php-ext-install \
    pdo_pgsql \
    pgsql \
    zip \
    intl \
    mbstring \
    bcmath \
    opcache \
    gd

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy composer files first (for layer caching)
COPY composer.json composer.lock ./

# Install dependencies (no dev)
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

# Copy application code
COPY . .

# Generate optimized autoload
RUN composer dump-autoload --optimize --no-dev

# Copy Nginx config for standalone container
COPY nginx.conf /etc/nginx/http.d/default.conf

# Create Nginx run directory
RUN mkdir -p /run/nginx && chown -R www-data:www-data /run/nginx /var/lib/nginx

# Set permissions
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache
RUN chmod -R 775 /var/www/storage /var/www/bootstrap/cache

# PHP production config
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

# Opcache config for production
RUN echo "opcache.enable=1" >> "$PHP_INI_DIR/conf.d/opcache.ini" && \
    echo "opcache.memory_consumption=128" >> "$PHP_INI_DIR/conf.d/opcache.ini" && \
    echo "opcache.max_accelerated_files=10000" >> "$PHP_INI_DIR/conf.d/opcache.ini" && \
    echo "opcache.validate_timestamps=0" >> "$PHP_INI_DIR/conf.d/opcache.ini"

# Upload size
RUN echo "upload_max_filesize=20M" >> "$PHP_INI_DIR/conf.d/uploads.ini" && \
    echo "post_max_size=25M" >> "$PHP_INI_DIR/conf.d/uploads.ini"

EXPOSE 80 9000

CMD ["sh", "-c", "mkdir -p /run/nginx; sed -i 's/listen = 127.0.0.1:9000/listen = 0.0.0.0:9000/g' /usr/local/etc/php-fpm.d/www.conf 2>/dev/null || true; php artisan migrate --force; php artisan db:seed --class=SuperAdminSeeder --force; chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache; php-fpm & nginx -g 'daemon off;'"]
