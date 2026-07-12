import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { BadRequestError } from '../../common/errors';

const uploadsDir = path.resolve(process.cwd(), 'uploads', 'audits');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, extension)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    cb(null, `${Date.now()}-${base || 'audit-file'}${extension.toLowerCase()}`);
  },
});

const allowed = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (!allowed.has(file.mimetype)) {
      cb(new BadRequestError(`Unsupported file type for ${file.fieldname}`));
      return;
    }
    cb(null, true);
  },
});

export const uploadAuditAttachments = upload.array('attachments', 8);
