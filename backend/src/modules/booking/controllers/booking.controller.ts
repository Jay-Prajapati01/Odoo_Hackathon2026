import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/async-handler';
import { sendResponse, sendPaginatedResponse } from '../../../common/api-response';
import { httpStatus } from '../../../common/http-status';
import { BookingRepository } from '../repositories/booking.repository';
import { BookingService } from '../services/booking.service';
import { AssetRepository } from '../../asset/asset.repository';
import { EmployeeRepository } from '../../organization/repositories/employee.repository';
import { DepartmentRepository } from '../../organization/repositories/department.repository';
import { EmployeeService } from '../../organization/services/employee.service';
import { UserRepository } from '../../auth/repositories/user.repository';
import { RoleRepository } from '../../rbac/repositories/role.repository';
import { authorize } from '../../../middleware/rbac';
import { validate } from '../../../middleware/error-handler';
import {
  createBookingSchema,
  updateBookingSchema,
  rescheduleBookingSchema,
  cancelBookingSchema,
  bookingQuerySchema,
  calendarQuerySchema,
  idParamSchema,
} from '../validators/booking.validator';
import { BookingScope } from '../types/booking.types';
import { toBookingDTO, toBookingDetailDTO } from '../dto/booking.dto';

const employeeService = new EmployeeService(
  new EmployeeRepository(),
  new DepartmentRepository(),
  new UserRepository(),
  new RoleRepository()
);

const bookingService = new BookingService(
  new BookingRepository(),
  new AssetRepository(),
  new EmployeeRepository(),
  new DepartmentRepository()
);

const buildScope = async (req: Request): Promise<BookingScope> => {
  const ctx = await employeeService.getCallerContext(req.user!.userId);
  return { roleName: req.user!.roleName, employeeId: ctx.employeeId, departmentId: ctx.departmentId };
};

/**
 * @swagger
 * /api/v1/bookings:
 *   post:
 *     summary: Create a resource booking (RBAC scoped)
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [asset, title, purpose, startDateTime, endDateTime]
 *             properties:
 *               asset: { type: string }
 *               employee: { type: string }
 *               title: { type: string }
 *               purpose: { type: string }
 *               description: { type: string }
 *               startDateTime: { type: string, format: date-time }
 *               endDateTime: { type: string, format: date-time }
 *               priority: { type: string, enum: [Low, Medium, High, Urgent] }
 *               status: { type: string, enum: [Draft, Upcoming] }
 *               remarks: { type: string }
 *     responses:
 *       201: { description: Booking created }
 *       409: { description: Booking conflict }
 *       400: { description: Invalid asset / time / employee }
 */
export const createBooking = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const booking = await bookingService.create(req.body, scope, req.user!.userId, req);
  sendResponse(res, httpStatus.CREATED, 'Booking created', toBookingDetailDTO(booking));
});

/**
 * @swagger
 * /api/v1/bookings:
 *   get:
 *     summary: List bookings (search, filter, sort, paginate, RBAC scoped)
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string } }
 *       - { in: query, name: department, schema: { type: string } }
 *       - { in: query, name: employee, schema: { type: string } }
 *       - { in: query, name: asset, schema: { type: string } }
 *       - { in: query, name: priority, schema: { type: string } }
 *       - { in: query, name: dateFrom, schema: { type: string, format: date-time } }
 *       - { in: query, name: dateTo, schema: { type: string, format: date-time } }
 *       - { in: query, name: sort, schema: { type: string, enum: [newest, oldest, upcoming, completed, cancelled] } }
 *     responses:
 *       200: { description: Paginated bookings }
 */
export const listBookings = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const result = await bookingService.list(req.query as Record<string, unknown>, scope);
  sendPaginatedResponse(res, 'Bookings retrieved', result.data.map(toBookingDTO), result.page, result.limit, result.total);
});

/**
 * @swagger
 * /api/v1/bookings/upcoming:
 *   get:
 *     summary: List upcoming bookings (RBAC scoped)
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Upcoming bookings }
 */
export const listUpcoming = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const data = await bookingService.upcoming(scope);
  sendResponse(res, httpStatus.OK, 'Upcoming bookings retrieved', data.map(toBookingDTO));
});

/**
 * @swagger
 * /api/v1/bookings/calendar:
 *   get:
 *     summary: Calendar view (day/week/month) compatible with FullCalendar
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: view, schema: { type: string, enum: [day, week, month] } }
 *       - { in: query, name: date, schema: { type: string, format: date-time } }
 *     responses:
 *       200: { description: Calendar bookings }
 */
export const calendarView = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const view = (req.query.view as 'day' | 'week' | 'month') ?? 'week';
  const date = req.query.date ? new Date(req.query.date as string) : new Date();
  const data = await bookingService.calendar(view, date, scope);
  sendResponse(res, httpStatus.OK, 'Calendar bookings retrieved', data.map(toBookingDTO));
});

/**
 * @swagger
 * /api/v1/bookings/{id}:
 *   get:
 *     summary: Get a booking by id (RBAC scoped)
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Booking }
 *       404: { description: Not found }
 */
export const getBooking = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const booking = await bookingService.getById(req.params.id, scope);
  sendResponse(res, httpStatus.OK, 'Booking retrieved', toBookingDetailDTO(booking));
});

/**
 * @swagger
 * /api/v1/bookings/{id}:
 *   patch:
 *     summary: Update booking details (Admin/Asset Manager/Department Head)
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Booking updated }
 */
export const updateBooking = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const updated = await bookingService.update(req.params.id, req.body, scope, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Booking updated', toBookingDetailDTO(updated));
});

/**
 * @swagger
 * /api/v1/bookings/{id}/reschedule:
 *   post:
 *     summary: Reschedule a booking (overlap re-checked)
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Booking rescheduled }
 */
export const rescheduleBooking = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const updated = await bookingService.reschedule(req.params.id, req.body, scope, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Booking rescheduled', toBookingDetailDTO(updated));
});

/**
 * @swagger
 * /api/v1/bookings/{id}/cancel:
 *   post:
 *     summary: Cancel a booking (own booking for employees)
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cancelReason]
 *             properties: { cancelReason: { type: string } }
 *     responses:
 *       200: { description: Booking cancelled }
 */
export const cancelBooking = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const updated = await bookingService.cancel(req.params.id, req.body, scope, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Booking cancelled', toBookingDetailDTO(updated));
});

/**
 * @swagger
 * /api/v1/bookings/{id}/start:
 *   post:
 *     summary: Mark a booking as Ongoing
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Booking started }
 */
export const startBooking = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const updated = await bookingService.start(req.params.id, scope, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Booking started', toBookingDetailDTO(updated));
});

/**
 * @swagger
 * /api/v1/bookings/{id}/complete:
 *   post:
 *     summary: Mark a booking as Completed
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Booking completed }
 */
export const completeBooking = asyncHandler(async (req: Request, res: Response) => {
  const scope = await buildScope(req);
  const updated = await bookingService.complete(req.params.id, scope, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Booking completed', toBookingDetailDTO(updated));
});

export const bookingRoutes = require('express').Router();
bookingRoutes.post('/', authorize('booking.create'), validate(createBookingSchema), createBooking);
bookingRoutes.get('/', authorize('booking.read'), validate(bookingQuerySchema), listBookings);
bookingRoutes.get('/upcoming', authorize('booking.read'), listUpcoming);
bookingRoutes.get('/calendar', authorize('booking.read'), validate(calendarQuerySchema), calendarView);
bookingRoutes.get('/:id', authorize('booking.read'), validate(idParamSchema, 'params'), getBooking);
bookingRoutes.patch('/:id', authorize('booking.manage'), validate(updateBookingSchema), updateBooking);
bookingRoutes.post('/:id/reschedule', authorize('booking.create'), validate(rescheduleBookingSchema), rescheduleBooking);
bookingRoutes.post('/:id/cancel', authorize('booking.create'), validate(cancelBookingSchema), cancelBooking);
bookingRoutes.post('/:id/start', authorize('booking.create'), startBooking);
bookingRoutes.post('/:id/complete', authorize('booking.create'), completeBooking);
