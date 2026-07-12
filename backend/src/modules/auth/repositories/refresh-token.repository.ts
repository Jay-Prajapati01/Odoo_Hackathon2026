import { IRefreshToken, RefreshTokenModel } from '../models/refresh-token.model';
import { Model } from 'mongoose';

export class RefreshTokenRepository {
  constructor(private readonly model: Model<IRefreshToken> = RefreshTokenModel) {}

  async create(userId: string, jti: string, expiresAt: Date): Promise<IRefreshToken> {
    return this.model.create({ userId, jti, expiresAt });
  }

  async findByJti(jti: string): Promise<IRefreshToken | null> {
    return this.model.findOne({ jti }).exec();
  }

  async revoke(jti: string): Promise<void> {
    await this.model.findOneAndUpdate({ jti }, { $set: { revoked: true, revokedAt: new Date() } }).exec();
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.model.updateMany({ userId }, { $set: { revoked: true, revokedAt: new Date() } }).exec();
  }
}
