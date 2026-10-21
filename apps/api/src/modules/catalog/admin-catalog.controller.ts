import { Controller, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { CreateProductDto, ToggleSoldOutDto } from './dto/catalog.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Admin Catalog')
@Controller('admin/catalog')
@UseGuards(RolesGuard)
@Roles('ADMIN', 'STAFF')
export class AdminCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post('products')
  @ApiOperation({ summary: 'Create new catalog product' })
  async createProduct(@Body() dto: CreateProductDto) {
    return this.catalogService.createProduct(dto);
  }

  @Patch('products/:id/availability')
  @ApiOperation({ summary: 'Toggle sold-out status for specific date' })
  async toggleAvailability(
    @Param('id') productId: string,
    @Body() dto: ToggleSoldOutDto,
  ) {
    return this.catalogService.toggleSoldOut(productId, dto);
  }
}
