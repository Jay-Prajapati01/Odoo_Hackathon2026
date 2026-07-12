export const generateAuditNumber = (sequenceValue: number): string => `AUD-${sequenceValue.toString().padStart(6, '0')}`;
