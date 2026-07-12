import { IReturn } from './return.model';

export interface ReturnDTO {
  id: string;
  allocationId: string;
  assetId: string;
  returnedById: string;
  receivedById: string;
  condition: string;
  damageNotes?: string;
  photos: string[];
  returnDate: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const toReturnDTO = (ret: IReturn): ReturnDTO => ({
  id: ret.id,
  allocationId: ret.allocationId,
  assetId: ret.assetId,
  returnedById: ret.returnedById,
  receivedById: ret.receivedById,
  condition: ret.condition,
  damageNotes: ret.damageNotes,
  photos: ret.photos,
  returnDate: ret.returnDate,
  remarks: ret.remarks,
  createdAt: ret.createdAt,
  updatedAt: ret.updatedAt,
});
