import db from "./db.js";

//add optional public details without changing existing values
try {
  const [columns] = await db.query("SHOW COLUMNS FROM animals");
  const existing = new Set(columns.map((column) => column.Field));
  const additions = ["description", "ideal_home", "care_needs"]
    .filter((field) => !existing.has(field));
  if (additions.length) {
    //column names come only from the fixed list above
    await db.query(`ALTER TABLE animals ${additions.map((field) => `ADD COLUMN ${field} TEXT NULL`).join(", ")}`);
  }
  console.log("Public profile fields are ready.");
} catch (error) {
  console.error("Could not add profile fields:", error.code);
  process.exitCode = 1;
} finally {
  await db.end();
}
