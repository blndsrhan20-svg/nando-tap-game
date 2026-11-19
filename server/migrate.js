import "dotenv/config";
import { readFile } from "node:fs/promises";
import { pool } from "./db.js";

try {
  const sql = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
  await pool.query(sql);
  console.log("NANDO database schema is ready.");
} catch (error) {
  console.error("Database migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
