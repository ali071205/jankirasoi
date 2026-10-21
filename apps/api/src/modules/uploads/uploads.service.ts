import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

@Injectable()
export class UploadsService {
  constructor(private readonly configService: ConfigService) {}

  getUploadSignature(folder = 'jankirasoi/menu') {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME') || 'jankirasoi';
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY') || 'mock_api_key';
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET') || 'mock_secret';

    const timestamp = Math.floor(Date.now() / 1000);

    // Cloudinary signature sorting order: parameters in alphabetical order
    // e.g. folder=jankirasoi/menu&timestamp=1234567890<api_secret>
    const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash('sha1').update(stringToSign).digest('hex');

    return {
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    };
  }
}
