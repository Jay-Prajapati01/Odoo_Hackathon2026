import mongoose, { Document, Schema } from 'mongoose';

export const ASSET_HISTORY_ACTIONS = [
  'created',
  'updated',
  'status_changed',
  'image_uploaded',
  'documents_uploaded',
  'qr_generated',
  'barcode_generated',
  'deleted',
] as const;

export type AssetHistoryAction = (typeof ASSET_HISTORY_ACTIONS)[number];

export interface IAssetHistoryChange {
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface IAssetHistory extends Document {
  assetId: string;
  assetTag: string;
  action: AssetHistoryAction;
  changes: IAssetHistoryChange[];
  snapshot?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
}

const assetHistoryChangeSchema = new Schema<IAssetHistoryChange>(
  {
    field: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const assetHistorySchema = new Schema<IAssetHistory>(
  {
    assetId: { type: String, required: true, index: true },
    assetTag: { type: String, required: true, index: true },
    action: { type: String, enum: ASSET_HISTORY_ACTIONS, required: true, index: true },
    changes: { type: [assetHistoryChangeSchema], default: [] },
    snapshot: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
    createdBy: { type: String, required: true, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

assetHistorySchema.index({ assetId: 1, createdAt: -1 });

export const AssetHistoryModel = mongoose.model<IAssetHistory>('AssetHistory', assetHistorySchema);
