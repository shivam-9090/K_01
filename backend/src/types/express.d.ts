/* eslint-disable */
declare namespace Express {
  export interface Request {
    user?: {
      userId: string;
      email: string;
      username: string;
      role: string;
    };
  }
}
