import { Model } from 'mongoose';
import { AuditAssignmentModel, IAuditAssignment, AuditAssignmentStatus } from './audit-assignment.model';

export class AuditAssignmentRepository {
  constructor(private readonly model: Model<IAuditAssignment> = AuditAssignmentModel) {}

  async create(data: Partial<IAuditAssignment>): Promise<IAuditAssignment> {
    return this.model.create(data);
  }

  async findById(id: string): Promise<IAuditAssignment | null> {
    return this.model.findById(id).exec();
  }

  async findByAuditCycle(auditCycle: string): Promise<IAuditAssignment[]> {
    return this.model.find({ auditCycle }).sort({ assignedDate: 1 }).exec();
  }

  async findByAuditCycleAndAuditor(auditCycle: string, auditor: string): Promise<IAuditAssignment | null> {
    return this.model.findOne({ auditCycle, auditor }).exec();
  }

  async findAuditCycleIdsByAuditor(auditor: string): Promise<string[]> {
    const records = await this.model.find({ auditor }).select('auditCycle').lean().exec();
    return Array.from(new Set(records.map((record) => String(record.auditCycle))));
  }

  async findAcceptedOrAssigned(auditCycle: string): Promise<IAuditAssignment[]> {
    return this.model.find({ auditCycle, status: { $in: ['assigned', 'accepted'] } }).exec();
  }

  async update(id: string, data: Partial<IAuditAssignment>): Promise<IAuditAssignment | null> {
    return this.model.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  }

  async countByStatus(auditCycle: string, statuses: AuditAssignmentStatus[]): Promise<number> {
    return this.model.countDocuments({ auditCycle, status: { $in: statuses } }).exec();
  }
}
