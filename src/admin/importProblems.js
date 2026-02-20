import fs from "fs";
import path from "path";
import db from "../config/db.js";

const DATA_DIR = path.join(process.cwd(), "data", "problems");

function getAllJsonFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(getAllJsonFiles(filePath));
    } else if (file.endsWith(".json")) {
      results.push(filePath);
    }
  }

  return results;
}

async function importProblems() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error("❌ data/problems folder not found:", DATA_DIR);
    process.exit(1);
  }

  const files = getAllJsonFiles(DATA_DIR);

  if (files.length === 0) {
    console.log("⚠️ No JSON files found");
    process.exit(0);
  }

  console.log(`📦 Found ${files.length} JSON files`);

  for (const filePath of files) {
    const problems = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    for (const p of problems) {
      if (!p.platform || !p.title || !p.difficulty || !p.topic || !p.url) {
        console.warn("⚠️ Skipping invalid entry:", p);
        continue;
      }

      const topicResult = await db.query(
        `SELECT id FROM topics WHERE name = $1`,
        [p.topic]
      );

      const topicRow = topicResult.rows[0];

      if (!topicRow) {
        console.warn(`⚠️ Topic not found: ${p.topic}`);
        continue;
      }

      await db.query(
        `
        INSERT INTO problem_bank
          (platform, title, difficulty, topic_id, url)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (title, topic_id) DO NOTHING
        `,
        [p.platform, p.title, p.difficulty, topicRow.id, p.url]
      );
    }

    console.log(`✅ Imported ${path.relative(DATA_DIR, filePath)}`);
  }

  console.log("🎉 Problem import completed");
  process.exit(0);
}

importProblems().catch(err => {
  console.error("❌ Import failed:", err);
  process.exit(1);
});
