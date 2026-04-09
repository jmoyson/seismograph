import {
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ListEarthquakesDto } from './list-earthquakes.dto';
import { ListEarthquakesService } from './list-earthquakes.service';

@Controller('earthquakes')
export class ListEarthquakesController {
  constructor(private readonly service: ListEarthquakesService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async list(@Query() filters: ListEarthquakesDto) {
    return this.service.list(filters);
  }
}
