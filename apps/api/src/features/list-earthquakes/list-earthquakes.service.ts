import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { ListEarthquakesDto, SortBy } from './list-earthquakes.dto';

@Injectable()
export class ListEarthquakesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: ListEarthquakesDto) {
    const since = new Date();
    since.setDate(since.getDate() - (filters.days || 7));

    const orderByField = {
      [SortBy.MAGNITUDE]: 'magnitude',
      [SortBy.SIGNIFICANCE]: 'significance',
      [SortBy.TIME]: 'time',
    }[filters.sortBy || SortBy.TIME] as string;

    return this.prisma.earthquake.findMany({
      where: {
        time: { gte: since },
        ...(filters.minMagnitude !== undefined && {
          magnitude: {
            gte: filters.minMagnitude,
            ...(filters.maxMagnitude !== undefined && {
              lte: filters.maxMagnitude,
            }),
          },
        }),
        ...(filters.minMagnitude === undefined &&
          filters.maxMagnitude !== undefined && {
            magnitude: { lte: filters.maxMagnitude },
          }),
      },
      orderBy: { [orderByField]: 'desc' },
      take: filters.limit || 100,
    });
  }
}
