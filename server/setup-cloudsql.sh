#!/bin/bash
set -e

# Cloud SQL Setup Script for Gather
# This script creates a Cloud SQL PostgreSQL instance and database

# Configuration (modify as needed)
PROJECT_ID="${GCP_PROJECT_ID:-noiz-430406}"
REGION="${GCP_REGION:-asia-southeast1}"
INSTANCE_NAME="${CLOUD_SQL_INSTANCE:-gather}"
DB_NAME="${DB_NAME:-gather}"
DB_USER="${DB_USER:-gather}"

echo "============================================"
echo "Cloud SQL Setup for Gather"
echo "============================================"
echo "Project:  $PROJECT_ID"
echo "Region:   $REGION"
echo "Instance: $INSTANCE_NAME"
echo "Database: $DB_NAME"
echo "User:     $DB_USER"
echo "============================================"
echo ""

# Check if instance exists
if gcloud sql instances describe $INSTANCE_NAME --project $PROJECT_ID &>/dev/null; then
  echo "✅ Cloud SQL instance '$INSTANCE_NAME' already exists"
else
  echo "📦 Creating Cloud SQL instance '$INSTANCE_NAME'..."
  echo "   This may take several minutes..."
  
  gcloud sql instances create $INSTANCE_NAME \
    --project $PROJECT_ID \
    --region $REGION \
    --database-version POSTGRES_15 \
    --tier db-f1-micro \
    --storage-type SSD \
    --storage-size 10GB \
    --storage-auto-increase \
    --availability-type zonal \
    --backup-start-time 03:00 \
    --maintenance-window-day SAT \
    --maintenance-window-hour 4
  
  echo "✅ Cloud SQL instance created"
fi

# Check if database exists
if gcloud sql databases describe $DB_NAME --instance $INSTANCE_NAME --project $PROJECT_ID &>/dev/null; then
  echo "✅ Database '$DB_NAME' already exists"
else
  echo "📦 Creating database '$DB_NAME'..."
  gcloud sql databases create $DB_NAME \
    --instance $INSTANCE_NAME \
    --project $PROJECT_ID
  echo "✅ Database created"
fi

# Check if user exists
if gcloud sql users list --instance $INSTANCE_NAME --project $PROJECT_ID | grep -q "^$DB_USER "; then
  echo "✅ User '$DB_USER' already exists"
else
  echo "📦 Creating database user '$DB_USER'..."
  echo "   Please enter a password for the database user:"
  read -s DB_PASSWORD
  
  gcloud sql users create $DB_USER \
    --instance $INSTANCE_NAME \
    --project $PROJECT_ID \
    --password "$DB_PASSWORD"
  
  echo "✅ User created"
  echo ""
  echo "⚠️  IMPORTANT: Save the password! Add it to your .env file:"
  echo "   DB_PASSWORD=$DB_PASSWORD"
fi

# Get connection name
CONNECTION_NAME=$(gcloud sql instances describe $INSTANCE_NAME --project $PROJECT_ID --format='value(connectionName)')

echo ""
echo "============================================"
echo "Setup Complete!"
echo "============================================"
echo ""
echo "Cloud SQL Connection Name:"
echo "   $CONNECTION_NAME"
echo ""
echo "Add these to your .env file:"
echo "   CLOUD_SQL_CONNECTION_NAME=$CONNECTION_NAME"
echo "   DB_NAME=$DB_NAME"
echo "   DB_USER=$DB_USER"
echo "   DB_PASSWORD=<your_password>"
echo ""
echo "============================================"
echo "Local Development (Cloud SQL Proxy)"
echo "============================================"
echo ""
echo "1. Install Cloud SQL Proxy:"
echo "   brew install cloud-sql-proxy"
echo ""
echo "2. Start the proxy:"
echo "   cloud-sql-proxy $CONNECTION_NAME &"
echo ""
echo "3. Connect using:"
echo "   DB_HOST=127.0.0.1"
echo "   DB_PORT=5432"
echo ""
echo "============================================"
echo "Initialize Database Schema"
echo "============================================"
echo ""
echo "The schema will be auto-initialized when the server starts."
echo "Or you can manually run:"
echo "   psql -h 127.0.0.1 -U $DB_USER -d $DB_NAME -f src/db/schema.sql"
echo ""
