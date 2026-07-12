import mongoose, { Schema, Document } from 'mongoose';

export type BookingStatus = 'Draft' | 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled' | 'Expired';
export type BookingPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export const BOOKING_STATUSES: BookingStatus[] = ['Draft', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled', 'Expired'];
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ['Draft', 'Upcoming', 'Ongoing'];
export const BLOCKED_ASSET_STATUSES = ['retired', 'disposed', 'lost', 'maintenance'] as const;

export interface IBooking extends Document {
  bookingNumber: string;
  asset: mongoose.Types.ObjectId;
  employee: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId | null;
  title: string;
  purpose: string;
  description?: string;
  bookingDate: Date;
  startDateTime: Date;
  endDateTime: Date;
  actualStartTime?: Date | null;
  actualEndTime?: Date | null;
  status: BookingStatus;
  priority: BookingPriority;
  remarks?: string;
  cancelReason?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  // Denormalized search fields
  assetName: string;
  assetTag: string;
  employeeName: string;
  departmentName: string;
}

const bookingSchema = new Schema<IBooking>(
  {
    bookingNumber: { type: String, required: true, unique: true, uppercase: true, index: true },
    asset: { type: Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
    employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    department: { type: Schema.Types.ObjectId, ref: 'Department', default: null, index: true },
    title: { type: String, required: true, trim: true },
    purpose: { type: String, required: true, trim: true },
    description: { type: String },
    bookingDate: { type: Date, required: true, index: true },
    startDateTime: { type: Date, required: true, index: true },
    endDateTime: { type: Date, required: true, index: true },
    actualStartTime: { type: Date, default: null },
    actualEndTime: { type: Date, default: null },
    status: { type: String, enum: BOOKING_STATUSES, default: 'Upcoming', index: true },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium', index: true },
    remarks: { type: String },
    cancelReason: { type: String },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
    assetName: { type: String, default: '' },
    assetTag: { type: String, default: '' },
    employeeName: { type: String, default: '' },
    departmentName: { type: String, default: '' },
  },
  { timestamps: true }
);

bookingSchema.index({ startDateTime: 1, endDateTime: 1 });
bookingSchema.index({ status: 1, startDateTime: 1 });
bookingSchema.index({ employee: 1, status: 1 });
bookingSchema.index({ department: 1, status: 1 });

export const BookingModel = mongoose.model<IBooking>('Booking', bookingSchema);
