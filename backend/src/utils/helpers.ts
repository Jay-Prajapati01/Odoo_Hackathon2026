export const generateReferenceId = (prefix: string): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
};

export const toObjectId = (id: string): string => id;

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
