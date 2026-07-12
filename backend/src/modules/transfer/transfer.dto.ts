import { ITransfer } from './transfer.model';

export interface TransferDTO {
  id: string;
  transferNumber: string;
  allocationId: string;
  assetId: string;
  currentHolderId: string;
  requestedHolderId: string;
  requestReason: string;
  requestedById: string;
  approvedById?: string;
  approvalDate?: Date;
  rejectionReason?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export const toTransferDTO = (transfer: ITransfer): TransferDTO => ({
  id: transfer.id,
  transferNumber: transfer.transferNumber,
  allocationId: transfer.allocationId,
  assetId: transfer.assetId,
  currentHolderId: transfer.currentHolderId,
  requestedHolderId: transfer.requestedHolderId,
  requestReason: transfer.requestReason,
  requestedById: transfer.requestedById,
  approvedById: transfer.approvedById,
  approvalDate: transfer.approvalDate,
  rejectionReason: transfer.rejectionReason,
  status: transfer.status,
  createdAt: transfer.createdAt,
  updatedAt: transfer.updatedAt,
});
