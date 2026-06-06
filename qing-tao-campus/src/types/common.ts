export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface LoginData {
  token: string;
  user: import('./user').User;
}
