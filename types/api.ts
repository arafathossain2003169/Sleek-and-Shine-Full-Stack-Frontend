export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  meta: ApiMeta;
}

export interface ApiFailure {
  success: false;
  message: string;
  errors: { path?: string; message: string }[];
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
