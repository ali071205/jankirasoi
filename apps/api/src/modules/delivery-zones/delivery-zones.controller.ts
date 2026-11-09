import { Controller, Get, Post, Body, Query, BadRequestException, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { DeliveryZonesService } from './delivery-zones.service';
import { OlaMapsService } from './ola-maps.service';

@ApiTags('Delivery Zones & Maps')
@Controller('delivery-zones')
export class DeliveryZonesController {
  constructor(
    private readonly zonesService: DeliveryZonesService,
    private readonly olaMapsService: OlaMapsService,
  ) {}

  @Get('check')
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  @ApiOperation({ summary: 'Check pincode and distance serviceability from Sagore Kitchen' })
  @ApiQuery({ name: 'pincode', required: true, example: '454774' })
  @ApiQuery({ name: 'lat', required: false, example: '22.6288' })
  @ApiQuery({ name: 'lng', required: false, example: '75.5684' })
  async checkPincode(
    @Query('pincode') pincode: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    if (!pincode || !/^[1-9][0-9]{5}$/.test(pincode)) {
      throw new BadRequestException('Please provide a valid 6-digit Indian PIN code.');
    }
    const parsedLat = lat ? parseFloat(lat) : undefined;
    const parsedLng = lng ? parseFloat(lng) : undefined;
    return this.zonesService.checkPincode(pincode, parsedLat, parsedLng);
  }

  @Get('places-search')
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  @ApiOperation({ summary: 'Places autocomplete search backed by Ola Maps with local fallback' })
  @ApiQuery({ name: 'q', required: true, example: 'Chatrachhaya' })
  @ApiQuery({ name: 'lat', required: false, example: '22.6288' })
  @ApiQuery({ name: 'lng', required: false, example: '75.5684' })
  async searchPlaces(
    @Query('q') query: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    if (!query || query.trim().length < 2) {
      return [];
    }
    const biasLat = lat ? parseFloat(lat) : undefined;
    const biasLng = lng ? parseFloat(lng) : undefined;
    return this.olaMapsService.autocomplete(query, biasLat, biasLng);
  }

  @Get('reverse-geocode')
  @Header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=172800')
  @ApiOperation({ summary: 'Reverse geocode coordinates to structured Indian address' })
  @ApiQuery({ name: 'lat', required: true, example: '22.6288' })
  @ApiQuery({ name: 'lng', required: true, example: '75.5684' })
  async reverseGeocode(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      throw new BadRequestException('Valid lat and lng query parameters are required.');
    }
    return this.olaMapsService.reverseGeocode(parsedLat, parsedLng);
  }

  @Get('directions')
  @Header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200')
  @ApiOperation({ summary: 'Calculate delivery routing directions and polyline coordinates' })
  @ApiQuery({ name: 'originLat', required: true, example: '22.6288' })
  @ApiQuery({ name: 'originLng', required: true, example: '75.5684' })
  @ApiQuery({ name: 'destLat', required: true, example: '22.6254' })
  @ApiQuery({ name: 'destLng', required: true, example: '75.5642' })
  async getDirections(
    @Query('originLat') originLat: string,
    @Query('originLng') originLng: string,
    @Query('destLat') destLat: string,
    @Query('destLng') destLng: string,
  ) {
    const oLat = parseFloat(originLat);
    const oLng = parseFloat(originLng);
    const dLat = parseFloat(destLat);
    const dLng = parseFloat(destLng);
    if (isNaN(oLat) || isNaN(oLng) || isNaN(dLat) || isNaN(dLng)) {
      throw new BadRequestException('Valid originLat, originLng, destLat, and destLng are required.');
    }
    return this.olaMapsService.getDirections(oLat, oLng, dLat, dLng);
  }

  @Post('route-optimize')
  @ApiOperation({ summary: 'Optimize multi-stop delivery sequence for riders (batch dispatch)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        origin: { type: 'object', properties: { lat: { type: 'number' }, lng: { type: 'number' } } },
        stops: {
          type: 'array',
          items: {
            type: 'object',
            properties: { id: { type: 'string' }, lat: { type: 'number' }, lng: { type: 'number' }, title: { type: 'string' } },
          },
        },
      },
      required: ['origin', 'stops'],
    },
  })
  async optimizeRoute(
    @Body() body: { origin: { lat: number; lng: number }; stops: { id: string; lat: number; lng: number; title?: string }[] },
  ) {
    if (!body?.origin || !Array.isArray(body?.stops)) {
      throw new BadRequestException('Valid origin and stops array are required.');
    }
    return this.olaMapsService.optimizeRoute(body.origin, body.stops);
  }

  @Post('snap-to-road')
  @ApiOperation({ summary: 'Snap noisy rider GPS telemetry points to actual road segments' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        points: {
          type: 'array',
          items: { type: 'array', items: { type: 'number' } },
        },
      },
      required: ['points'],
    },
  })
  async snapToRoad(@Body() body: { points: [number, number][] }) {
    if (!Array.isArray(body?.points)) {
      throw new BadRequestException('Valid points array is required.');
    }
    return this.olaMapsService.snapToRoad(body.points);
  }

  @Get()
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=1800')
  @ApiOperation({ summary: 'List all active delivery zones' })
  async listZones() {
    return this.zonesService.getAllActiveZones();
  }
}

