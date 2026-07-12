import { IAllocation } from './allocation.model';

export interface AllocationDTO {
  id: string;
  allocationNumber: string;
  assetId: string;
  employeeId: string;
  departmentId: string;
  allocatedById: string;
  allocationDate: Date;
  expectedReturnDate?: Date;
  actualReturnDate?: Date;
  purpose?: string;
  status: string;
  conditionAtAllocation?: string;
  conditionAtReturn?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const toAllocationDTO = (allocation: IAllocation): AllocationDTO => ({
  id: allocation.id,
  allocationNumber: allocation.allocationNumber,
  assetId: allocation.assetId,
  employeeId: allocation.employeeId,
  departmentId: allocation.departmentId,
  allocatedById: allocation.allocatedById,
  allocationDate: allocation.allocationDate,
  expectedReturnDate: allocation.expectedReturnDate,
  actualReturnDate: allocation.actualReturnDate,
  purpose: allocation.purpose,
  status: allocation.status,
  conditionAtAllocation: allocation.conditionAtAllocation,
  conditionAtReturn: allocation.conditionAtReturn,
  remarks: allocation.remarks,
  createdAt: allocation.createdAt,
  updatedAt: allocation.updatedAt,
});
