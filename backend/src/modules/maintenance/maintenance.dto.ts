import { IMaintenance } from './maintenance.model';

export interface MaintenanceDTO {
  id: string;
  requestNumber: string;
  assetId: string;
  requestedById: string;
  departmentId: string;
  issueTitle: string;
  issueDescription: string;
  priority: string;
  attachments: Array<{
    name: string;
    path: string;
    mimeType: string;
    size: number;
    uploadedAt: Date;
    uploadedBy: string;
  }>;
  estimatedCost?: number;
  estimatedDuration?: string;
  status: string;
  requestedDate: Date;
  approvedById?: string;
  approvalDate?: Date;
  rejectionReason?: string;
  assignedTechnicianId?: string;
  technicianAssignedDate?: Date;
  workStartDate?: Date;
  completionDate?: Date;
  resolutionSummary?: string;
  actualCost?: number;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const toMaintenanceDTO = (maintenance: IMaintenance): MaintenanceDTO => ({
  id: maintenance.id,
  requestNumber: maintenance.requestNumber,
  assetId: maintenance.assetId,
  requestedById: maintenance.requestedById,
  departmentId: maintenance.departmentId,
  issueTitle: maintenance.issueTitle,
  issueDescription: maintenance.issueDescription,
  priority: maintenance.priority,
  attachments: maintenance.attachments,
  estimatedCost: maintenance.estimatedCost,
  estimatedDuration: maintenance.estimatedDuration,
  status: maintenance.status,
  requestedDate: maintenance.requestedDate,
  approvedById: maintenance.approvedById,
  approvalDate: maintenance.approvalDate,
  rejectionReason: maintenance.rejectionReason,
  assignedTechnicianId: maintenance.assignedTechnicianId,
  technicianAssignedDate: maintenance.technicianAssignedDate,
  workStartDate: maintenance.workStartDate,
  completionDate: maintenance.completionDate,
  resolutionSummary: maintenance.resolutionSummary,
  actualCost: maintenance.actualCost,
  createdBy: maintenance.createdBy,
  updatedBy: maintenance.updatedBy,
  createdAt: maintenance.createdAt,
  updatedAt: maintenance.updatedAt,
});
