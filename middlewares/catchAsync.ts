import { Request, Response } from "express";

export const catchAsync = (fn: (req: any, res: any, next: Function) => Promise<any>) => (req: Request, res: Response, next: Function) => {
  Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};
