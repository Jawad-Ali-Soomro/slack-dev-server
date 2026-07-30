import { IUser } from "../interfaces/index";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}
