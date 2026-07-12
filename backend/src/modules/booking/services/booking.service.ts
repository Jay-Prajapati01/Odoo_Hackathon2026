import { BookingRepository } from '../repositories/booking.repository';
import { AssetRepository } from '../../asset/asset.repository';
import { EmployeeRepository } from '../../organization/repositories/employee.repository';
import { DepartmentRepository } from '../../organization/repositories/department.repository';
import { IBooking, BLOCKED_ASSET_STATUSES, ACTIVE_BOOKING_STATUSES } from '../models/booking.model';
import { BookingFilter } from '../interfaces/booking.interface';
import {
  ConflictError,
  NotFoundError,
  BusinessRuleError,
  ForbiddenError,
} from '../../../common/errors';
import { parsePagination, parseSearch, parseSort } from '../../../utils/pagination';
import { recordActivity, dispatchNotification } from '../../../shared/events';
import { generateReferenceId } from '../../../utils/helpers';
import { Request } from 'express';
import { BookingScope, CreateBookingInput, RescheduleInput, CancelInput, UpdateBookingInput } from '../types/booking.types';
import { toBookingDTO, toBookingDetailDTO } from '../dto/booking.dto';

export class BookingService {
  constructor(
    private readonly repo: BookingRepository,
    private readonly assets: AssetRepository,
    private readonly employees: EmployeeRepository,
    private readonly departments: DepartmentRepository
  ) {}

  private buildScopeFilter(scope?: BookingScope): Record<string, unknown> | undefined {
    if (!scope) return undefined;
    if (scope.roleName === 'Employee') return { employee: scope.employeeId };
    if (scope.roleName === 'Department Head') return { department: scope.departmentId };
    return undefined;
  }

  private assertScope(booking: IBooking, scope?: BookingScope): void {
    if (!scope) return;
    if (scope.roleName === 'Employee' && booking.employee.toString() !== scope.employeeId) {
      throw new ForbiddenError('You can only access your own bookings');
    }
    if (scope.roleName === 'Department Head' && booking.department?.toString() !== scope.departmentId) {
      throw new ForbiddenError('You can only access bookings in your department');
    }
  }

  private async recipientFor(booking: IBooking): Promise<string | undefined> {
    const employee = await this.employees.findById(booking.employee.toString());
    return employee?.userId;
  }

  private async resolveBookingEmployee(employeeId: string, actorId: string) {
    const employee = await this.employees.findById(employeeId);
    if (!employee) throw new NotFoundError('Employee not found');
    if (employee.employmentStatus !== 'active') {
      throw new BusinessRuleError('Inactive employee cannot create a booking');
    }
    return employee;
  }

  async create(data: CreateBookingInput, scope: BookingScope, actorId: string, req?: Request): Promise<IBooking> {
    const bookingEmployeeId = data.employee ?? scope.employeeId;
    if (!bookingEmployeeId) throw new BusinessRuleError('A booking must be created for an employee');

    if (scope.roleName === 'Employee' && data.employee && data.employee !== scope.employeeId) {
      throw new ForbiddenError('Employees can only create bookings for themselves');
    }

    const employee = await this.resolveBookingEmployee(bookingEmployeeId, actorId);

    if (!employee.departmentId) throw new BusinessRuleError('Employee is not assigned to a department');
    const department = await this.departments.findById(employee.departmentId);
    if (!department) throw new NotFoundError('Department not found');

    const asset = await this.assets.findById(data.asset);
    if (!asset) throw new NotFoundError('Asset not found');
    if (!asset.sharedResource) throw new BusinessRuleError('Selected asset is not a bookable shared resource');
    if ((BLOCKED_ASSET_STATUSES as readonly string[]).includes(asset.status)) {
      throw new BusinessRuleError(`Asset cannot be booked (current status: ${asset.status})`);
    }

    const start = new Date(data.startDateTime);
    const end = new Date(data.endDateTime);
    if (end <= start) throw new BusinessRuleError('End time must be after start time');
    const now = new Date();
    if (start < now && data.status !== 'Draft') {
      throw new BusinessRuleError('Cannot create a booking in the past');
    }

    const overlap = await this.repo.findOverlapping(asset.id, start, end);
    if (overlap) {
      dispatchNotification({
        recipientId: employee.userId,
        type: 'booking',
        title: 'Booking Conflict',
        message: `Resource ${asset.name} is already reserved from ${overlap.startDateTime.toISOString()} to ${overlap.endDateTime.toISOString()}.`,
        reference: { entity: 'Booking', entityId: overlap.id },
      });
      throw new ConflictError('Booking conflict: the resource is already reserved for the selected time slot');
    }

    const status = data.status === 'Draft' ? 'Draft' : start <= now ? 'Ongoing' : 'Upcoming';
    const booking = await this.repo.create({
      bookingNumber: generateReferenceId('BK').slice(0, 20),
      asset: asset.id as never,
      employee: employee.id as never,
      department: (department.id as never) ?? null,
      title: data.title,
      purpose: data.purpose,
      description: data.description,
      bookingDate: start,
      startDateTime: start,
      endDateTime: end,
      status,
      priority: data.priority ?? 'Medium',
      remarks: data.remarks,
      createdBy: actorId,
      assetName: asset.name,
      assetTag: asset.assetTag,
      employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
      departmentName: department.name,
    });

    recordActivity({ req, userId: actorId, action: 'booking.created', entity: 'Booking', entityId: booking.id, newValue: booking.toObject() });
    dispatchNotification({
      recipientId: employee.userId,
      type: 'booking',
      title: 'Booking Confirmed',
      message: `Your booking for ${asset.name} (${asset.assetTag}) is confirmed from ${start.toISOString()} to ${end.toISOString()}.`,
      reference: { entity: 'Booking', entityId: booking.id },
    });
    return booking;
  }

  async getById(id: string, scope?: BookingScope): Promise<IBooking> {
    const booking = await this.repo.findById(id);
    if (!booking) throw new NotFoundError('Booking not found');
    this.assertScope(booking, scope);
    return booking;
  }

  async list(query: Record<string, unknown>, scope?: BookingScope): Promise<{ data: IBooking[]; page: number; limit: number; total: number }> {
    await this.repo.expireStale();
    const { page, limit, skip } = parsePagination(query);
    const search = parseSearch(query);
    const status = query.status ? String(query.status).split(',').map((s) => s.trim()) : undefined;
    const filter: BookingFilter = {
      page,
      limit,
      skip,
      search,
      status,
      department: query.department as string | undefined,
      employee: query.employee as string | undefined,
      asset: query.asset as string | undefined,
      priority: query.priority as string | undefined,
      dateFrom: query.dateFrom ? new Date(query.dateFrom as string) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo as string) : undefined,
      sort: (query.sort as string) ?? 'newest',
      scope: this.buildScopeFilter(scope),
    };
    const [rows, total] = await Promise.all([this.repo.findAll(filter), this.repo.count(filter)]);
    return { data: rows, page, limit, total };
  }

  async calendar(view: 'day' | 'week' | 'month', date: Date, scope?: BookingScope): Promise<IBooking[]> {
    await this.repo.expireStale();
    const { start, end } = this.resolveRange(view, date);
    return this.repo.findInRange(start, end, this.buildScopeFilter(scope));
  }

  async upcoming(scope?: BookingScope): Promise<IBooking[]> {
    await this.repo.expireStale();
    const now = new Date();
    const filter: BookingFilter = {
      page: 1,
      limit: 100,
      skip: 0,
      status: 'Upcoming',
      dateFrom: now,
      sort: 'upcoming',
      scope: this.buildScopeFilter(scope),
    };
    return this.repo.findAll(filter);
  }

  async update(id: string, data: UpdateBookingInput, scope: BookingScope, actorId: string, req?: Request): Promise<IBooking> {
    const booking = await this.repo.findById(id);
    if (!booking) throw new NotFoundError('Booking not found');
    this.assertScope(booking, scope);
    if (booking.status === 'Completed' || booking.status === 'Cancelled' || booking.status === 'Expired') {
      throw new BusinessRuleError(`Cannot update a booking that is ${booking.status}`);
    }
    const updated = await this.repo.update(id, { ...data, updatedBy: actorId });
    recordActivity({ req, userId: actorId, action: 'booking.updated', entity: 'Booking', entityId: id, oldValue: booking.toObject(), newValue: updated?.toObject() });
    return updated!;
  }

  async reschedule(id: string, data: RescheduleInput, scope: BookingScope, actorId: string, req?: Request): Promise<IBooking> {
    const booking = await this.repo.findById(id);
    if (!booking) throw new NotFoundError('Booking not found');
    this.assertScope(booking, scope);
    if (booking.status === 'Completed' || booking.status === 'Cancelled' || booking.status === 'Expired') {
      throw new BusinessRuleError(`Cannot reschedule a booking that is ${booking.status}`);
    }

    const start = new Date(data.startDateTime);
    const end = new Date(data.endDateTime);
    if (end <= start) throw new BusinessRuleError('End time must be after start time');

    const overlap = await this.repo.findOverlapping(booking.asset.toString(), start, end, id);
    if (overlap) {
      throw new ConflictError('Booking conflict: the resource is already reserved for the selected time slot');
    }

    const updated = await this.repo.update(id, {
      startDateTime: start,
      endDateTime: end,
      bookingDate: start,
      remarks: data.remarks ?? booking.remarks,
      updatedBy: actorId,
    });
    recordActivity({ req, userId: actorId, action: 'booking.rescheduled', entity: 'Booking', entityId: id, oldValue: { startDateTime: booking.startDateTime, endDateTime: booking.endDateTime }, newValue: { startDateTime: start, endDateTime: end } });
    const recipientId = await this.recipientFor(booking);
    if (recipientId) {
      dispatchNotification({
        recipientId,
        type: 'booking',
        title: 'Booking Rescheduled',
        message: `Your booking has been rescheduled to ${start.toISOString()} - ${end.toISOString()}.`,
        reference: { entity: 'Booking', entityId: id },
      });
    }
    return updated!;
  }

  async cancel(id: string, data: CancelInput, scope: BookingScope, actorId: string, req?: Request): Promise<IBooking> {
    const booking = await this.repo.findById(id);
    if (!booking) throw new NotFoundError('Booking not found');
    this.assertScope(booking, scope);
    if (booking.status === 'Completed' || booking.status === 'Cancelled' || booking.status === 'Expired') {
      throw new BusinessRuleError(`Booking is already ${booking.status}`);
    }
    const updated = await this.repo.update(id, { status: 'Cancelled', cancelReason: data.cancelReason, updatedBy: actorId });
    recordActivity({ req, userId: actorId, action: 'booking.cancelled', entity: 'Booking', entityId: id, oldValue: { status: booking.status }, newValue: { status: 'Cancelled', cancelReason: data.cancelReason } });
    const recipientId = await this.recipientFor(booking);
    if (recipientId) {
      dispatchNotification({
        recipientId,
        type: 'booking',
        title: 'Booking Cancelled',
        message: `Booking ${booking.bookingNumber} was cancelled. Reason: ${data.cancelReason}`,
        reference: { entity: 'Booking', entityId: id },
      });
    }
    return updated!;
  }

  async start(id: string, scope: BookingScope, actorId: string, req?: Request): Promise<IBooking> {
    const booking = await this.repo.findById(id);
    if (!booking) throw new NotFoundError('Booking not found');
    this.assertScope(booking, scope);
    if (booking.status !== 'Upcoming') {
      throw new BusinessRuleError(`Only upcoming bookings can be started (current status: ${booking.status})`);
    }
    const updated = await this.repo.update(id, { status: 'Ongoing', actualStartTime: new Date(), updatedBy: actorId });
    recordActivity({ req, userId: actorId, action: 'booking.started', entity: 'Booking', entityId: id, oldValue: { status: booking.status }, newValue: { status: 'Ongoing' } });
    return updated!;
  }

  async complete(id: string, scope: BookingScope, actorId: string, req?: Request): Promise<IBooking> {
    const booking = await this.repo.findById(id);
    if (!booking) throw new NotFoundError('Booking not found');
    this.assertScope(booking, scope);
    if (booking.status !== 'Ongoing') {
      throw new BusinessRuleError(`Only ongoing bookings can be completed (current status: ${booking.status})`);
    }
    const updated = await this.repo.update(id, { status: 'Completed', actualEndTime: new Date(), updatedBy: actorId });
    recordActivity({ req, userId: actorId, action: 'booking.completed', entity: 'Booking', entityId: id, oldValue: { status: booking.status }, newValue: { status: 'Completed' } });
    const recipientId = await this.recipientFor(booking);
    if (recipientId) {
      dispatchNotification({
        recipientId,
        type: 'booking',
        title: 'Booking Completed',
        message: `Booking ${booking.bookingNumber} has been marked as completed.`,
        reference: { entity: 'Booking', entityId: id },
      });
    }
    return updated!;
  }

  private resolveRange(view: 'day' | 'week' | 'month', date: Date): { start: Date; end: Date } {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    if (view === 'day') end.setDate(end.getDate() + 1);
    else if (view === 'week') end.setDate(end.getDate() + 7);
    else end.setMonth(end.getMonth() + 1);
    return { start, end };
  }
}
