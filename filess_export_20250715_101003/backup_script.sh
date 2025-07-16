#!/bin/bash
# Quick backup script for your Filess.io database

# Get current date for filename
DATE=$(date +%Y%m%d_%H%M%S)

echo "Creating backup of Filess.io database..."

# You'll need to replace these with your actual Filess.io credentials
# HOST="your-host.filess.io"
# PORT="3306"
# USER="your_username"
# PASS="your_password"
# DB="your_database_name"

# Uncomment and update the line below with your credentials
# mysqldump -h"$HOST" -P"$PORT" -u"$USER" -p"$PASS" "$DB" > "backup_$DATE.sql"

echo "Instructions:"
echo "1. Update the credentials in this script"
echo "2. Run: ./backup_script.sh"
echo "3. Store backups securely"
echo "4. Test restore process regularly"
