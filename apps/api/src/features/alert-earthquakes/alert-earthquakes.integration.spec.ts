import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TestingModule } from '@nestjs/testing';
import { AlertEarthquakesModule } from './alert-earthquakes.module';
import { AlertEarthquakesService } from './alert-earthquakes.service';
import { createTestingModule } from '../../../test/helpers/test-db';

describe('alert-earthquakes (integration)', () => {
  let moduleRef: TestingModule;
  let service: AlertEarthquakesService;
  let emitter: EventEmitter2;
  let warnSpy: jest.SpyInstance;

  beforeAll(async () => {
    moduleRef = await createTestingModule(AlertEarthquakesModule);
    service = moduleRef.get(AlertEarthquakesService);
    emitter = moduleRef.get(EventEmitter2);
  });

  beforeEach(() => {
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('emits a warning for each earthquake with magnitude >= 6.0', () => {
    const count = service.handleSyncedBatch({
      type: 'sync',
      count: 3,
      earthquakes: [
        { id: 'low', magnitude: 5.0, place: 'Place A', time: '2026-04-10T12:00:00Z', latitude: 0, longitude: 0, depth: 10, url: 'https://u/low' } as any,
        { id: 'high', magnitude: 6.5, place: 'Place B', time: '2026-04-10T12:01:00Z', latitude: 0, longitude: 0, depth: 10, url: 'https://u/high' } as any,
        { id: 'huge', magnitude: 7.8, place: 'Place C', time: '2026-04-10T12:02:00Z', latitude: 0, longitude: 0, depth: 10, url: 'https://u/huge' } as any,
      ],
      timestamp: '2026-04-10T12:03:00Z',
    });

    expect(count).toBe(2);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    // The warn calls should mention magnitude and place of each alert
    const messages = warnSpy.mock.calls.map((call) => String(call[0]));
    expect(messages.some((m) => m.includes('6.5') && m.includes('Place B'))).toBe(true);
    expect(messages.some((m) => m.includes('7.8') && m.includes('Place C'))).toBe(true);
  });

  it('emits no warnings when no earthquake is at or above 6.0', () => {
    const count = service.handleSyncedBatch({
      type: 'sync',
      count: 2,
      earthquakes: [
        { id: 'low1', magnitude: 3.0, place: 'A', time: '2026-04-10T12:00:00Z', latitude: 0, longitude: 0, depth: 10, url: 'https://u/1' } as any,
        { id: 'low2', magnitude: 5.9, place: 'B', time: '2026-04-10T12:01:00Z', latitude: 0, longitude: 0, depth: 10, url: 'https://u/2' } as any,
      ],
      timestamp: '2026-04-10T12:02:00Z',
    });

    expect(count).toBe(0);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('reacts to the earthquakes.synced event (end-to-end via EventEmitter2)', () => {
    emitter.emit('earthquakes.synced', {
      type: 'sync',
      count: 1,
      earthquakes: [
        { id: 'big', magnitude: 6.2, place: 'Big place', time: '2026-04-10T12:00:00Z', latitude: 0, longitude: 0, depth: 10, url: 'https://u/big' } as any,
      ],
      timestamp: '2026-04-10T12:01:00Z',
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain('6.2');
  });
});
