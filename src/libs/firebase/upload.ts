import { Logger } from '@nestjs/common';
import { getStorage } from 'firebase-admin/storage';
import configuration from 'src/config/configuration';
import { EUploadFolder } from 'src/constants/constant';

export const uploadFilesFromFirebase = async (
  filesContent: Express.Multer.File[],
  uploadFolder: EUploadFolder,
) => {
  try {
    const result = await Promise.all(
      filesContent.map(async (item) => {
        try {
          const buffer = item.buffer;
          const bf = Buffer.from(buffer);
          const bucket = getStorage().bucket();
          const fileName =
            new Date().valueOf().toString() + '-' + item.originalname;
          const file = bucket.file(`${uploadFolder}/${fileName}`);
          await file.save(bf, {
            contentType: item.mimetype,
          });
          await file.makePublic();
          return `https://firebasestorage.googleapis.com/v0/b/${configuration().firebase_project_id}.appspot.com/o/${uploadFolder}%2F${fileName}?alt=media`;
        } catch (error) {
          Logger.log('Error uploading file to Firebase Storage:', error);
          return '';
        }
      }),
    );
    return {
      success: true,
      urls: result,
    };
  } catch (error) {
    Logger.log('Error uploading file to Firebase Storage:', error);
    return {
      success: false,
      urls: [],
    };
  }
};
