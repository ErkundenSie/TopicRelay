import { writeFile } from "node:fs/promises";

const required = [
  "TOPIC_RELAY_WORKER_NAME",
  "TOPIC_RELAY_D1_DATABASE_NAME",
  "TOPIC_RELAY_D1_DATABASE_ID",
];

const values = Object.fromEntries(
  required.map((name) => [name, process.env[name]?.trim()]),
);
const missing = required.filter((name) => !values[name]);

if (missing.length > 0) {
  throw new Error(
    `Missing required build environment variables: ${missing.join(", ")}`,
  );
}

const config = {
  name: values.TOPIC_RELAY_WORKER_NAME,
  main: "_worker.js",
  compatibility_date: "2026-08-03",
  keep_vars: true,
  d1_databases: [
    {
      binding: "D1",
      database_name: values.TOPIC_RELAY_D1_DATABASE_NAME,
      database_id: values.TOPIC_RELAY_D1_DATABASE_ID,
    },
  ],
};

await writeFile(
  new URL("../wrangler.jsonc", import.meta.url),
  `${JSON.stringify(config, null, 2)}\n`,
  "utf8",
);
