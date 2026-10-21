import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Uploads')
@Controller('admin/uploads')
@UseGuards(RolesGuard)
@Roles('ADMIN', 'STAFF')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get('signature')
  @ApiOperation({ summary: 'Generate Cloudinary secure server-signed upload params for food pictures' })
  getSignature(@Query('folder') folder?: string) {
    return this.uploadsService.getUploadSignature(folder);
  }
}
