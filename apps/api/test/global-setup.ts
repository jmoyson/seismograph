import { startTestDatabase } from './helpers/test-db';

export default async function globalSetup(): Promise<void> {
  await startTestDatabase();
}
