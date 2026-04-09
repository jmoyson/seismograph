import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Controller('earthquakes')
export class GetEarthquakeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id')
  async getById(@Param('id') id: string) {
    const earthquake = await this.prisma.earthquake.findUnique({
      where: { id },
    });
    if (!earthquake) {
      throw new NotFoundException(`Earthquake ${id} not found`);
    }
    return earthquake;
  }
}
