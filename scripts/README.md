# Create Super Admin Script

This script allows you to create a super admin account for the Lively Snow file management system.

## Usage

### Method 1: Using npm script (Recommended)

```bash
npm run create-super-admin <email> <username> [password]
```

### Method 2: Direct execution

```bash
node scripts/create-super-admin.js <email> <username> [password]
```

## Parameters

- **email**: The email address for the super admin account (required)
- **username**: The username for the super admin account (required)
- **password**: The password for the super admin account (optional - will be prompted securely if not provided)

## Examples

### Interactive password entry (recommended for security)

```bash
npm run create-super-admin admin@example.com admin
```

### With password provided (less secure)

```bash
npm run create-super-admin admin@example.com admin MySecurePassword123
```

## Features

- ✅ **Secure password handling**: If password is not provided as argument, it will be prompted securely (hidden input)
- ✅ **Validation**: Validates email format and username length
- ✅ **Duplicate checking**: Prevents creating users with existing email/username
- ✅ **Role upgrading**: If user exists, offers to upgrade their role to SUPER_ADMIN
- ✅ **Password confirmation**: When prompted, requires password confirmation
- ✅ **Argon2 hashing**: Uses the same secure password hashing as the application

## Requirements

- Node.js environment
- Database must be accessible
- All dependencies must be installed (`npm install`)

## Security Notes

- Always use interactive password entry in production environments
- The script will hash passwords using Argon2, the same method used by the application
- Passwords are never logged or stored in plain text
- The script will hide password input when typed interactively

## Role System

The system supports three roles:

- `USER`: Regular user (default)
- `ADMIN`: Administrative user
- `SUPER_ADMIN`: Super administrator with highest privileges

This script specifically creates `SUPER_ADMIN` accounts.

## Troubleshooting

### "User already exists"

If a user with the same email already exists, the script will offer to upgrade their role to SUPER_ADMIN instead of creating a new user.

### "Username already taken"

Choose a different username. Usernames must be unique across the system.

### "Invalid email format"

Ensure the email follows the format: `user@domain.com`

### "Password too short"

Passwords must be at least 6 characters long.

### "Database connection error"

Ensure the database is running and accessible, and that all environment variables are properly configured.
