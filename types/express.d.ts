
import { JwtPayload } from "../interfaces/user.interface";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
