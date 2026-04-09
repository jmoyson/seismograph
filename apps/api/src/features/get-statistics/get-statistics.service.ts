import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import type { EarthquakeStats } from '@seismograph/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class GetStatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(days: number): Promise<EarthquakeStats> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const stats = await this.prisma.$queryRaw<
      [
        {
          totalCount: number;
          avgMagnitude: number;
          maxMagnitude: number;
          minMagnitude: number;
          significantCount: number;
          tsunamiAlerts: number;
        },
      ]
    >(Prisma.sql`
      SELECT
        COUNT(*)::int AS "totalCount",
        ROUND(AVG(magnitude)::numeric, 2)::float AS "avgMagnitude",
        MAX(magnitude) AS "maxMagnitude",
        MIN(magnitude) AS "minMagnitude",
        COUNT(CASE WHEN magnitude >= 5 THEN 1 END)::int AS "significantCount",
        COUNT(CASE WHEN tsunami = true THEN 1 END)::int AS "tsunamiAlerts"
      FROM earthquakes
      WHERE time >= ${since}
    `);

    const distribution = await this.prisma.$queryRaw<
      { range: string; count: number }[]
    >(Prisma.sql`
      SELECT
        CASE
          WHEN magnitude < 3 THEN '2-3'
          WHEN magnitude < 4 THEN '3-4'
          WHEN magnitude < 5 THEN '4-5'
          WHEN magnitude < 6 THEN '5-6'
          WHEN magnitude < 7 THEN '6-7'
          ELSE '7+'
        END AS range,
        COUNT(*)::int AS count
      FROM earthquakes
      WHERE time >= ${since}
      GROUP BY range
      ORDER BY range ASC
    `);

    return {
      period: { days, since: since.toISOString() },
      ...stats[0],
      distribution,
    };
  }
}
