import { Controller, Get, Query } from '@nestjs/common';
import { GetStatisticsService } from './get-statistics.service';

@Controller('statistics')
export class GetStatisticsController {
  constructor(private readonly service: GetStatisticsService) {}

  @Get()
  async getStats(@Query('days') days?: string) {
    return this.service.getStats(days ? parseInt(days, 10) : 7);
  }
}
