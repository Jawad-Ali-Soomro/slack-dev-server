import { IUser } from "../../src/interfaces";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}
