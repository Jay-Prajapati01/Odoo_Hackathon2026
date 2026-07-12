import { IBooking } from '../models/booking.model';
import { BookingListItem } from '../interfaces/booking.interface';

export const toBookingDTO = (booking: IBooking): BookingListItem => ({
  id: booking.id,
  bookingNumber: booking.bookingNumber,
  asset: booking.asset.toString(),
  assetName: booking.assetName,
  assetTag: booking.assetTag,
  employee: booking.employee.toString(),
  employeeName: booking.employeeName,
  department: booking.department?.toString() ?? null,
  departmentName: booking.departmentName,
  title: booking.title,
  purpose: booking.purpose,
  bookingDate: booking.bookingDate,
  startDateTime: booking.startDateTime,
  endDateTime: booking.endDateTime,
  status: booking.status,
  priority: booking.priority,
});

export const toBookingDetailDTO = (booking: IBooking) => ({
  ...toBookingDTO(booking),
  description: booking.description,
  actualStartTime: booking.actualStartTime,
  actualEndTime: booking.actualEndTime,
  remarks: booking.remarks,
  cancelReason: booking.cancelReason,
  createdBy: booking.createdBy,
  updatedBy: booking.updatedBy,
  createdAt: booking.createdAt,
  updatedAt: booking.updatedAt,
});
