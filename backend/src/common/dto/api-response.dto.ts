export class ApiResponse<T> {
  constructor(
    public success: boolean,
    public data: T,
    public message?: string,
    public error?: any,
  ) {}

  static ok<T>(data: T, message = 'Success'): ApiResponse<T> {
    return new ApiResponse(true, data, message);
  }

  static error<T>(error: any, message = 'Error'): ApiResponse<T> {
    return new ApiResponse(false, null as T, message, error);
  }
}
