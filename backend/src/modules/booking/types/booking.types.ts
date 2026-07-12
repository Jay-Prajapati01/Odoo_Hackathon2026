export interface BookingScope {
  roleName: string;
  employeeId?: string;
  departmentId?: string;
}

export interface CreateBookingInput {
  asset: string;
  employee?: string;
  title: string;
  purpose: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  status?: 'Draft' | 'Upcoming';
  remarks?: string;
}

export interface RescheduleInput {
  startDateTime: string;
  endDateTime: string;
  remarks?: string;
}

export interface CancelInput {
  cancelReason: string;
}

export interface UpdateBookingInput {
  title?: string;
  purpose?: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  remarks?: string;
}
