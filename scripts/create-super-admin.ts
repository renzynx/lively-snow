#!/usr/bin/env tsx

/**
 * Script to create a super admin account
 * Usage: tsx scripts/create-super-admin.ts <email> <username> [password]
 * If password is not provided, it will be prompted securely
 */

import { hash } from "argon2";
import { eq } from "drizzle-orm";
import { createInterface } from "readline";
import { users, Role } from "../server/database/schema";
import { db } from "../server/database/index";

// Helper function to read password securely
function readPassword(prompt = "Enter password: "): Promise<string> {
  return new Promise((resolve) => {
    const readline = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Hide password input
    readline.question(prompt, (password) => {
      readline.close();
      resolve(password);
    });

    // Hide the input - simple approach
    const originalWrite = process.stdout.write;
    process.stdout.write = function (string: string) {
      if (string.includes(prompt)) {
        return originalWrite.call(this, string);
      }
      return originalWrite.call(this, "*");
    };

    // Restore original write after question
    setTimeout(() => {
      process.stdout.write = originalWrite;
    }, 100);
  });
}

async function createSuperAdmin() {
  try {
    const args = process.argv.slice(2);

    if (args.length < 2) {
      console.error(
        "Usage: tsx scripts/create-super-admin.ts <email> <username> [password]",
      );
      console.error(
        "Example: tsx scripts/create-super-admin.ts admin@example.com admin",
      );
      process.exit(1);
    }

    const email = args[0];
    const username = args[1];
    const providedPassword = args[2]; // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      console.error("Error: Invalid email format");
      process.exit(1);
    }

    // Validate username
    if (!username || username.length < 3 || username.length > 20) {
      console.error("Error: Username must be between 3 and 20 characters");
      process.exit(1);
    }

    // Check if user already exists
    console.log("Checking if user already exists...");
    const existingUserByEmail = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    const existingUserByUsername = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (existingUserByEmail) {
      console.error(`Error: User with email "${email}" already exists`);

      // Show existing user info (without password)
      const { password: _, ...safeUser } = existingUserByEmail;
      console.log("Existing user:", safeUser);

      // Ask if user wants to update role to super admin
      const readline = createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>((resolve) => {
        readline.question(
          "Do you want to update this user's role to SUPER_ADMIN? (y/N): ",
          resolve,
        );
      });

      readline.close();

      if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
        await db
          .update(users)
          .set({ role: Role.SUPER_ADMIN })
          .where(eq(users.email, email));

        console.log(
          `✅ Successfully updated user "${email}" to SUPER_ADMIN role`,
        );
        return;
      } else {
        console.log("Operation cancelled");
        process.exit(1);
      }
    }

    if (existingUserByUsername) {
      console.error(`Error: User with username "${username}" already exists`);
      process.exit(1);
    }

    // Get password
    let password = providedPassword;
    if (!password) {
      password = await readPassword("Enter password for super admin: ");

      if (!password || password.length < 6) {
        console.error("Error: Password must be at least 6 characters long");
        process.exit(1);
      }

      const confirmPassword = await readPassword("Confirm password: ");
      if (password !== confirmPassword) {
        console.error("Error: Passwords do not match");
        process.exit(1);
      }
    }

    // Hash password
    console.log("Hashing password...");
    const hashedPassword = await hash(password);

    // Create super admin user
    console.log("Creating super admin user...");
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        username,
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
      })
      .returning();

    // Remove password from output
    if (newUser) {
      const { password: _, ...safeUser } = newUser;

      console.log("✅ Super admin user created successfully!");
      console.log("User details:", safeUser);
      console.log(`\n🔐 You can now login with:`);
      console.log(`   Email: ${email}`);
      console.log(`   Username: ${username}`);
      console.log(`   Role: ${Role.SUPER_ADMIN}`);
    }
  } catch (error: any) {
    console.error("❌ Error creating super admin:", error?.message || error);
    process.exit(1);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Handle script execution - run if this file is executed directly
createSuperAdmin();

export { createSuperAdmin };
