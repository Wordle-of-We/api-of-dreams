import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { UploadApiResponse } from 'cloudinary';
import { v2 as Cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject('CLOUDINARY') private readonly cloudinary: typeof Cloudinary
  ) {}

  uploadBuffer(
    fileBuffer: Buffer,
    folder: string,
    publicId?: string
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = this.cloudinary.uploader.upload_stream(
        { folder, public_id: publicId },
        (err, result) => {
          if (err) return reject(err);
          if (!result) {
            return reject(new BadRequestException('Cloudinary retornou resultado vazio'));
          }
          resolve(result);
        },
      );
      stream.end(fileBuffer);
    });
  }

  deleteImage(publicId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.cloudinary.uploader.destroy(publicId, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  extractPublicIdFromUrl(url: string): string {
    const parts = url.split('/');
    const uploadIdx = parts.findIndex(p => p === 'upload');
    const folderAndFile = parts.slice(uploadIdx + 2).join('/');
    return folderAndFile.replace(/\.[^/.]+$/, '');
  }
}
