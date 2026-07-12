import mongoose, { Document, Schema } from 'mongoose';

export interface IAssetSequence extends Document {
  key: string;
  value: number;
  createdAt: Date;
  updatedAt: Date;
}

const assetSequenceSchema = new Schema<IAssetSequence>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, versionKey: false }
);

export const AssetSequenceModel = mongoose.model<IAssetSequence>('AssetSequence', assetSequenceSchema);
