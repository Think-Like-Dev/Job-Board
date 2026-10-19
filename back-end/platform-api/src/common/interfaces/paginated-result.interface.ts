export interface IPaginatedMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface IPaginatedResult<T> {
  data: T[];
  meta: IPaginatedMeta;
}
