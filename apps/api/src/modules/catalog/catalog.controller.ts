import { Controller, Get, Patch, Query, Param, Body, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { ToggleSoldOutDto } from './dto/catalog.dto';

@ApiTags('Catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @ApiOperation({ summary: 'Get active public menu catalog with prices in paise' })
  @ApiQuery({ name: 'service_date', required: false, example: '2026-10-22' })
  async getCatalog(@Query('service_date') serviceDate?: string) {
    return this.catalogService.getPublicCatalog(serviceDate);
  }

  @Patch(':id/sold-out')
  @ApiOperation({ summary: 'Toggle dish 86 / sold out status for a service date' })
  async toggleSoldOut(
    @Param('id') productId: string,
    @Body() dto: ToggleSoldOutDto,
  ) {
    return this.catalogService.toggleSoldOut(productId, dto);
  }
}
