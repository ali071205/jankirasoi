import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';

@ApiTags('Catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'Get active public menu catalog with prices in paise' })
  @ApiQuery({ name: 'service_date', required: false, example: '2026-10-22' })
  async getCatalog(@Query('service_date') serviceDate?: string) {
    return this.catalogService.getPublicCatalog(serviceDate);
  }
}
