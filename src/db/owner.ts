import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Migrations and sample-data scripts must keep using the owner connection.
// The app role cannot skip row policies, so a seed run as that role would
// write nothing once the caller id is unset. Falls back to DATABASE_URL
// until the owner URL is set on its own.
const ownerUrl = process.env.DATABASE_URL_MIGRATE ?? process.env.DATABASE_URL!;
const client = postgres(ownerUrl, { prepare: false });

export const ownerDb = drizzle(client, { schema });
