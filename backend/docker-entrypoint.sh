#!/bin/bash
# Docker entrypoint script for PostgreSQL with SSL support
# Fixes file permissions for SSL certificates on Windows Docker

# Fix permissions on SSL certificates if they exist
if [ -f /var/lib/postgresql/server.key ]; then
    chmod 0600 /var/lib/postgresql/server.key
    chmod 0644 /var/lib/postgresql/server.crt
fi

# Start PostgreSQL with the passed arguments
exec postgres "$@"
