export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
}

export interface SortOptions {
  [key: string]: 1 | -1;
}

export const parsePagination = (query: Record<string, unknown>): PaginationOptions => {
  const rawPage = Number(query.page) || 1;
  const rawLimit = Number(query.limit) || 10;
  const page = rawPage < 1 ? 1 : rawPage;
  const limit = rawLimit > 100 ? 100 : rawLimit < 1 ? 10 : rawLimit;
  return { page, limit, skip: (page - 1) * limit };
};

export const parseSort = (query: Record<string, unknown>): SortOptions => {
  const sortParam = (query.sort as string) || '-createdAt';
  const sort: SortOptions = {};
  sortParam.split(',').forEach((field) => {
    const trimmed = field.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('-')) sort[trimmed.slice(1)] = -1;
    else sort[trimmed] = 1;
  });
  return sort;
};

export const parseSearch = (query: Record<string, unknown>): string | undefined => {
  const term = query.search as string;
  return term && term.trim() ? term.trim() : undefined;
};

export const buildRegexFilter = (
  term: string,
  fields: string[]
): Record<string, unknown> => {
  return {
    $or: fields.map((field) => ({ [field]: { $regex: term, $options: 'i' } })),
  };
};
