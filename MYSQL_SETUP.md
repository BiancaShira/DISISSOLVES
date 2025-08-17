# MySQL Setup Instructions for DisiSolves

## Prerequisites
- XAMPP installed on your machine
- MySQL server running on localhost:3306

## Step 1: Create Database
1. Start XAMPP and ensure MySQL is running
2. Open phpMyAdmin (usually at http://localhost/phpmyadmin)
3. Create a new database named `disisolves`

## Step 2: Configure Environment Variables
Create a `.env` file in the project root with the following variables:

```env
# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=disisolves

# Legacy (will be ignored)
DATABASE_URL=placeholder
```

## Step 3: Update Database Connection
The schema has been updated to use MySQL. The next step is to update the server database connection file.

## Step 4: Run Database Migration
Once the database connection is updated, run:
```bash
npm run db:push
```

## Step 5: Seed Initial Data
The system will automatically create admin user and sample data on first run.

## Default Admin Credentials
- Username: admin
- Password: admin123

## Troubleshooting
- Ensure MySQL is running on port 3306
- Check that the database `disisolves` exists
- Verify root user has proper permissions
- Make sure no firewall is blocking the connection

## Current Status
✅ Schema converted to MySQL format
✅ Raise issue functionality fixed across all pages  
✅ Answer posting functionality ready
🔄 Database connection needs to be updated to MySQL
🔄 Migration to be run after connection update