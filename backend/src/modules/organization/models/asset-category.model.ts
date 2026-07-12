import mongoose, { Schema, Document } from 'mongoose';

export type AssetCategoryStatus = 'active' | 'inactive';
export type CustomFieldType = 'text' | 'number' | 'date' | 'boolean' | 'select';

export interface ICustomField {
  key: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options?: string[];
}

export interface IAssetCategory extends Document {
  name: string;
  code: string;
  description: string;
  categoryType: string;
  status: AssetCategoryStatus;
  customFields: ICustomField[];
  isDeleted: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const customFieldSchema = new Schema<ICustomField>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'number', 'date', 'boolean', 'select'], default: 'text' },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] },
  },
  { _id: false }
);

const assetCategorySchema = new Schema<IAssetCategory>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    categoryType: { type: String, default: 'General', trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    customFields: { type: [customFieldSchema], default: [] },
    isDeleted: { type: Boolean, default: false, index: true },
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

assetCategorySchema.index({ name: 1 }, { collation: { locale: 'en', strength: 2 } });

export const AssetCategoryModel = mongoose.model<IAssetCategory>('AssetCategory', assetCategorySchema);
