import mongoose, { Schema, Document } from 'mongoose';

export interface ISetting extends Document {
  key: string;
  value: Schema.Types.Mixed;
  group: string;
  description?: string;
  updatedAt: Date;
}

const settingSchema = new Schema<ISetting>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    group: { type: String, default: 'general' },
    description: { type: String },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const SettingModel = mongoose.model<ISetting>('Setting', settingSchema);
