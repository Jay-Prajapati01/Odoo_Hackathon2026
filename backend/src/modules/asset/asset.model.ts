import mongoose, { Document, Schema } from 'mongoose';

export const ASSET_STATUSES = ['available', 'allocated', 'reserved', 'maintenance', 'lost', 'retired', 'disposed'] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const ASSET_CONDITIONS = ['new', 'excellent', 'good', 'fair', 'poor', 'damaged'] as const;
export type AssetCondition = (typeof ASSET_CONDITIONS)[number];

export const ASSET_DOCUMENT_TYPES = ['invoice', 'warranty', 'manual', 'certificate', 'image', 'other'] as const;
export type AssetDocumentType = (typeof ASSET_DOCUMENT_TYPES)[number];

export interface IAssetLocation {
  building?: string;
  floor?: string;
  room?: string;
  shelf?: string;
  section?: string;
  label?: string;
}

export interface IAssetDocument {
  name: string;
  path: string;
  mimeType: string;
  size: number;
  type: AssetDocumentType;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface IAsset extends Document {
  assetTag: string;
  assetCode?: string;
  name: string;
  description?: string;
  category: string;
  categoryId?: string;
  categoryName?: string;
  department?: string;
  departmentId?: string;
  departmentName?: string;
  location?: IAssetLocation;
  serialNumber?: string;
  manufacturer?: string;
  assetModel?: string;
  supplier?: string;
  condition: AssetCondition;
  status: AssetStatus;
  purchaseDate?: Date;
  purchaseCost: number;
  currentValue: number;
  warrantyStart?: Date;
  warrantyEnd?: Date;
  sharedResource: boolean;
  qrCode?: string;
  barcode?: string;
  assetImage?: string;
  documents: IAssetDocument[];
  specifications: Record<string, unknown>;
  assignedTo?: string;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  createdBy: string;
  updatedBy?: string;
  deletedAt?: Date | null;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const assetLocationSchema = new Schema<IAssetLocation>(
  {
    building: { type: String, trim: true },
    floor: { type: String, trim: true },
    room: { type: String, trim: true },
    shelf: { type: String, trim: true },
    section: { type: String, trim: true },
    label: { type: String, trim: true },
  },
  { _id: false }
);

const assetDocumentSchema = new Schema<IAssetDocument>(
  {
    name: { type: String, required: true, trim: true },
    path: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    type: {
      type: String,
      enum: ASSET_DOCUMENT_TYPES,
      default: 'other',
    },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String, required: true },
  },
  { _id: false }
);

const assetSchema = new Schema<IAsset>(
  {
    assetTag: { type: String, required: true, unique: true, trim: true, uppercase: true, alias: 'assetCode' },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, required: true, index: true, alias: 'categoryId' },
    categoryName: { type: String, trim: true, index: true },
    department: { type: String, index: true, alias: 'departmentId' },
    departmentName: { type: String, trim: true, index: true },
    location: { type: assetLocationSchema, default: undefined },
    serialNumber: { type: String, trim: true, uppercase: true, sparse: true, unique: true, index: true },
    manufacturer: { type: String, trim: true, index: true },
    assetModel: { type: String, trim: true, alias: 'model' },
    supplier: { type: String, trim: true },
    condition: {
      type: String,
      enum: ASSET_CONDITIONS,
      default: 'new',
      index: true,
    },
    status: {
      type: String,
      enum: ASSET_STATUSES,
      default: 'available',
      index: true,
    },
    purchaseDate: { type: Date },
    purchaseCost: { type: Number, required: true, min: 0 },
    currentValue: { type: Number, required: true, min: 0 },
    warrantyStart: { type: Date },
    warrantyEnd: { type: Date, index: true },
    sharedResource: { type: Boolean, default: false },
    qrCode: { type: String },
    barcode: { type: String },
    assetImage: { type: String },
    documents: { type: [assetDocumentSchema], default: [] },
    specifications: { type: Schema.Types.Mixed, default: {} },
    assignedTo: { type: String, index: true },
    lastMaintenanceDate: { type: Date },
    nextMaintenanceDate: { type: Date },
    createdBy: { type: String, required: true, index: true },
    updatedBy: { type: String },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

assetSchema.index({ deletedAt: 1, status: 1 });
assetSchema.index({ deletedAt: 1, category: 1, department: 1 });
assetSchema.index({ deletedAt: 1, manufacturer: 1, warrantyEnd: 1 });
assetSchema.index({
  assetTag: 'text',
  name: 'text',
  serialNumber: 'text',
  manufacturer: 'text',
  categoryName: 'text',
  departmentName: 'text',
});

assetSchema.pre('validate', function assetPreValidate(next) {
  if (this.currentValue === undefined || this.currentValue === null) {
    this.currentValue = this.purchaseCost;
  }
  next();
});

export const AssetModel = mongoose.model<IAsset>('Asset', assetSchema);
