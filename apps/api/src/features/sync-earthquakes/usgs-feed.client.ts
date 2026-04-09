import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface UsgsFeature {
  id: string;
  properties: {
    mag: number;
    place: string;
    time: number;
    url: string;
    tsunami: number;
    sig: number;
    status: string;
  };
  geometry: {
    coordinates: [number, number, number]; // [lng, lat, depth]
  };
}

interface UsgsResponse {
  metadata: { count: number; generated: number };
  features: UsgsFeature[];
}

@Injectable()
export class UsgsFeedClient {
  private readonly logger = new Logger(UsgsFeedClient.name);

  constructor(private config: ConfigService) {}

  async fetchHourly(): Promise<UsgsFeature[]> {
    return this.fetch(this.config.get<string>('USGS_FEED_URL')!);
  }

  async fetchWeekly(): Promise<UsgsFeature[]> {
    return this.fetch(this.config.get<string>('USGS_SEED_URL')!);
  }

  private async fetch(url: string): Promise<UsgsFeature[]> {
    try {
      const { data } = await axios.get<UsgsResponse>(url);
      this.logger.log(`Fetched ${data.metadata.count} earthquakes from USGS`);
      return data.features;
    } catch (error) {
      this.logger.error(`USGS feed error: ${error.message}`);
      throw error;
    }
  }
}
