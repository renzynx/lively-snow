import { sql, eq } from "drizzle-orm";
import type { db as Database } from "../database";
import { sessions } from "../database/schema";
import type { SessionStore } from "@fastify/session";
import type { Session } from "fastify";

// Create a custom session store that works with Fastify session
export class DrizzleStore implements SessionStore {
  private db: typeof Database;
  private pruneInterval: NodeJS.Timeout | null = null;

  constructor(db: typeof Database, options: { pruneInterval?: number } = {}) {
    this.db = db;

    // Set up automatic pruning of expired sessions
    if (options.pruneInterval) {
      this.pruneInterval = setInterval(() => {
        this.prune().catch(console.error);
      }, options.pruneInterval);

      // Make sure to clean up the interval when the process exits
      process.on("exit", () => {
        if (this.pruneInterval) {
          clearInterval(this.pruneInterval);
        }
      });
    }
  }

  // Implement the SessionStore interface with callback-style methods
  set(
    sessionId: string,
    session: Session,
    callback: (err?: any) => void,
  ): void {
    // Get expiration time from session cookie
    const expires = session.cookie?.expires || new Date(Date.now() + 86400000); // Default to 1 day

    // Extract user_id from session if it exists
    const user_id = session.user?.id || null;

    this.db
      .insert(sessions)
      .values({
        id: sessionId,
        session_data: JSON.stringify(session),
        expires: expires,
        user_id: user_id,
      })
      .onConflictDoUpdate({
        target: sessions.id,
        set: {
          session_data: JSON.stringify(session),
          expires: expires,
          updated_at: new Date(),
          user_id: user_id,
        },
      })
      .then(() => callback())
      .catch((err) => {
        console.error("Error saving session:", err);
        callback(err);
      });
  }

  get(
    sessionId: string,
    callback: (err: any, result?: Session | null) => void,
  ): void {
    this.db.query.sessions
      .findFirst({
        where: eq(sessions.id, sessionId),
      })
      .then((session) => {
        if (!session) {
          return callback(null, null);
        }

        // Check if session has expired
        if (session.expires.getTime() < new Date().getTime()) {
          this.destroy(sessionId, (err) => {
            if (err) return callback(err);
            callback(null, null);
          });
          return;
        }

        try {
          const sessionData = JSON.parse(session.session_data);
          callback(null, sessionData);
        } catch (error) {
          console.error("Error parsing session data:", error);
          callback(error);
        }
      })
      .catch((error) => {
        console.error("Error retrieving session:", error);
        callback(error);
      });
  }

  destroy(sessionId: string, callback: (err?: any) => void): void {
    this.db
      .delete(sessions)
      .where(eq(sessions.id, sessionId))
      .then(() => callback())
      .catch((error) => {
        console.error("Error destroying session:", error);
        callback(error);
      });
  }

  // Helper method to prune expired sessions
  async prune(): Promise<void> {
    try {
      const now = new Date();
      await this.db.delete(sessions).where(sql`${sessions.expires} < ${now}`);
    } catch (error) {
      console.error("Error pruning expired sessions:", error);
    }
  }
}
