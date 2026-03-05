import { eq } from "drizzle-orm";
import { db, pool } from "./db/db.js";
import { demoUsers } from "./db/schema.js";

async function main() {
  try {
    console.log("Running CRUD operations...");

    // CREATE
    const [newUser] = await db
      .insert(demoUsers)
      .values({ name: "Admin User", email: "admin@example.com" })
      .returning();

    if (!newUser) {
      throw new Error("Failed to create user");
    }

    console.log("✅ CREATE:", newUser);

    // READ
    const [found] = await db
      .select()
      .from(demoUsers)
      .where(eq(demoUsers.id, newUser.id));
    console.log("✅ READ:", found);

    // UPDATE
    const [updated] = await db
      .update(demoUsers)
      .set({ name: "Super Admin" })
      .where(eq(demoUsers.id, newUser.id))
      .returning();
    console.log("✅ UPDATE:", updated);

    await db.delete(demoUsers).where(eq(demoUsers.id, newUser.id));
    console.log("✅ DELETE: done");
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  } finally {
    await pool.end();
    console.log("Connection closed.");
  }
}

main();
