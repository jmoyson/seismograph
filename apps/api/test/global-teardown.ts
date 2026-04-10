import { stopTestDatabase } from './helpers/test-db';

export default async function globalTeardown(): Promise<void> {
  await stopTestDatabase();
}
