import db from "./db.js";

//add an optional field without replacing existing animal details
try {
  const [columns] = await db.query("SHOW COLUMNS FROM animals LIKE 'breed_type'");
  if (columns.length === 0) {
    await db.query("ALTER TABLE animals ADD COLUMN breed_type VARCHAR(100) NULL DEFAULT NULL");
    console.log("Added the optional breed/type field.");
  } else {
    console.log("The breed/type field already exists.");
  }
} catch (error) {
  console.error("Could not add breed/type:", error.code);
  process.exitCode = 1;
} finally {
  await db.end();
}
