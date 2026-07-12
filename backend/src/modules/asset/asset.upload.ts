import multer from 'multer';
import path from 'path';
import { BadRequestError } from '../../common/errors';
import { getAssetDocumentDirectory, getAssetImageDirectory, sanitizeFileName } from './asset.utils';

const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const documentMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const targetDirectory = file.fieldname === 'assetImage' ? getAssetImageDirectory() : getAssetDocumentDirectory();
    cb(null, targetDirectory);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname) || '';
    const baseName = sanitizeFileName(path.basename(file.originalname, extension));
    cb(null, `${Date.now()}-${baseName}${extension.toLowerCase()}`);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = file.fieldname === 'assetImage' ? imageMimeTypes.has(file.mimetype) : documentMimeTypes.has(file.mimetype);
  if (!allowed) {
    cb(new BadRequestError(`Unsupported file type for ${file.fieldname}`));
    return;
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 10,
  },
});

export const uploadAssetImage = upload.single('assetImage');
export const uploadAssetDocuments = upload.array('documents', 10);
