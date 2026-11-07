import { Controller, Get, Post, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Post('food-image')
  @ApiOperation({ summary: 'Upload food image directly to Supabase Storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  async uploadFoodImage(@UploadedFile() file?: any) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Please provide a valid image file');
    }
    return this.uploadsService.uploadFoodImageToSupabase(file.buffer, file.mimetype, file.originalname);
  }
}
