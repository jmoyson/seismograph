import { stopTestDatabase } from './helpers/test-db';

export default function globalTeardown(): void {
  stopTestDatabase();
}
