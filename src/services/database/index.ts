/**
 * VIRALCLIP STUDIO — DATABASE SERVICE EXPORTS
 */

import { PostgresDatabase } from './PostgresDatabase';

export function getDatabase(): PostgresDatabase {
  return PostgresDatabase.getInstance();
}

export { PostgresDatabase };
