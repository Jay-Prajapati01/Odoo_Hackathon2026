import { IBooking, BookingModel, ACTIVE_BOOKING_STATUSES } from '../models/booking.model';
import { Model } from 'mongoose';
import { BookingFilter } from '../interfaces/booking.interface';

const SORT_MAP: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  upcoming: { startDateTime: 1 },
  completed: { actualEndTime: -1 },
  cancelled: { updatedAt: -1 },
};

export class BookingRepository {
  constructor(private readonly model: Model<IBooking> = BookingModel) {}

  async create(data: Partial<IBooking>): Promise<IBooking> {
    return this.model.create(data);
  }

  async findById(id: string): Promise<IBooking | null> {
    return this.model.findById(id).exec();
  }

  async findByBookingNumber(bookingNumber: string): Promise<IBooking | null> {
    return this.model.findOne({ bookingNumber: bookingNumber.toUpperCase() }).exec();
  }

  async findOverlapping(
    assetId: string,
    start: Date,
    end: Date,
    excludeId?: string,
    activeStatuses: string[] = ACTIVE_BOOKING_STATUSES
  ): Promise<IBooking | null> {
    const query: Record<string, unknown> = {
      asset: assetId,
      status: { $in: activeStatuses },
      $and: [{ startDateTime: { $lt: end } }, { endDateTime: { $gt: start } }],
    };
    if (excludeId) query._id = { $ne: excludeId };
    return this.model.findOne(query).exec();
  }

  async findAll(filter: BookingFilter): Promise<IBooking[]> {
    return this.model
      .find(this.buildQuery(filter))
      .skip(filter.skip)
      .limit(filter.limit)
      .sort(SORT_MAP[filter.sort ?? 'newest'] ?? { createdAt: -1 })
      .exec();
  }

  async count(filter: BookingFilter): Promise<number> {
    return this.model.countDocuments(this.buildQuery(filter)).exec();
  }

  async update(id: string, data: Partial<IBooking>): Promise<IBooking | null> {
    return this.model.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  }

  async countUpcoming(): Promise<number> {
    return this.model.countDocuments({ status: 'Upcoming' }).exec();
  }

  async findInRange(start: Date, end: Date, scope?: Record<string, unknown>): Promise<IBooking[]> {
    const query: Record<string, unknown> = {
      ...(scope ?? {}),
      status: { $in: ACTIVE_BOOKING_STATUSES },
      $and: [{ startDateTime: { $lt: end } }, { endDateTime: { $gt: start } }],
    };
    return this.model.find(query).sort({ startDateTime: 1 }).exec();
  }

  async expireStale(now: Date = new Date()): Promise<void> {
    await this.model.updateMany(
      { status: 'Upcoming', endDateTime: { $lt: now } },
      { $set: { status: 'Expired' } }
    );
    await this.model.updateMany(
      { status: 'Ongoing', endDateTime: { $lt: now } },
      { $set: { status: 'Completed', actualEndTime: now } }
    );
  }

  private buildQuery(filter: BookingFilter): Record<string, unknown> {
    const query: Record<string, unknown> = { ...(filter.scope ?? {}) };
    if (filter.status) {
      query.status = Array.isArray(filter.status) ? { $in: filter.status } : filter.status;
    }
    if (filter.department) query.department = filter.department;
    if (filter.employee) query.employee = filter.employee;
    if (filter.asset) query.asset = filter.asset;
    if (filter.priority) query.priority = filter.priority;
    if (filter.dateFrom || filter.dateTo) {
      const range: Record<string, Date> = {};
      if (filter.dateFrom) range.$gte = filter.dateFrom;
      if (filter.dateTo) range.$lte = filter.dateTo;
      query.startDateTime = range;
    }
    if (filter.search) {
      const searchRegex = { $regex: filter.search, $options: 'i' };
      query.$or = [
        { bookingNumber: searchRegex },
        { assetName: searchRegex },
        { assetTag: searchRegex },
        { employeeName: searchRegex },
        { departmentName: searchRegex },
        { purpose: searchRegex },
        { title: searchRegex },
      ];
    }
    return query;
  }
}
