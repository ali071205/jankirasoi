import { Controller, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { CreateProductDto, ToggleSoldOutDto, UpdateProductDto } from './dto/catalog.dto';
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

  @Patch('products/:id')
  @ApiOperation({ summary: 'Update existing catalog product details and pricing' })
  async updateProduct(
    @Param('id') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.catalogService.updateProduct(productId, dto);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Soft-delete/remove product from active menu' })
  async deleteProduct(@Param('id') productId: string) {
    return this.catalogService.deleteProduct(productId);
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
