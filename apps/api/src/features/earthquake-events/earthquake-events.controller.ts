import { Controller, Sse } from '@nestjs/common';
import { Observable, Subject, interval, merge, map } from 'rxjs';
import { OnEvent } from '@nestjs/event-emitter';
import type { SSEEvent } from '@seismograph/shared';

interface MessageEvent {
  data: string | object;
  type?: string;
  id?: string;
  retry?: number;
}

@Controller('events')
export class EarthquakeEventsController {
  private readonly clients = new Set<Subject<SSEEvent>>();

  @Sse('earthquakes')
  streamEarthquakes(): Observable<MessageEvent> {
    const client = new Subject<SSEEvent>();
    this.clients.add(client);

    client.subscribe({
      complete: () => this.clients.delete(client),
    });

    const heartbeat$ = interval(30000).pipe(
      map(() => ({ data: '', type: 'heartbeat' }) as MessageEvent),
    );

    const data$ = client.asObservable().pipe(
      map(
        (payload) =>
          ({
            data: JSON.stringify(payload),
            type: 'earthquake-update',
            retry: 10000,
          }) as MessageEvent,
      ),
    );

    return merge(data$, heartbeat$);
  }

  @OnEvent('earthquakes.synced')
  handleSync(payload: SSEEvent) {
    this.clients.forEach((client) => client.next(payload));
  }
}
