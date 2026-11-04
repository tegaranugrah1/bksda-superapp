FROM php:8.4-cli-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends python3 libonig-dev libzip-dev libicu-dev libpng-dev libpq-dev && docker-php-ext-install -j2 mbstring zip intl gd bcmath pdo_pgsql && rm -rf /var/lib/apt/lists/*
WORKDIR /scratch
