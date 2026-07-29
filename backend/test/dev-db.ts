/**
 * Boots a throwaway embedded Postgres for local verification when Docker is
 * unavailable. Prints the DATABASE_URL and keeps running until killed.
 * Run: npx tsx test/dev-db.ts <dataDir> [port]
 */
import EmbeddedPostgres from "embedded-postgres";

async function main(): Promise<void> {
  const dataDir = process.argv[2];
  const port = Number(process.argv[3] ?? 5433);
  if (!dataDir) {
    console.error("usage: tsx test/dev-db.ts <dataDir> [port]");
    process.exit(1);
  }

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "saahvik",
    password: "saahvik",
    port,
    persistent: false,
    // Windows initdb defaults to the ANSI codepage (WIN1252), which cannot
    // store ₹. Production Postgres must be UTF8 too.
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase("saahvik");
  console.log(`READY postgresql://saahvik:saahvik@localhost:${port}/saahvik`);

  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

void main();
