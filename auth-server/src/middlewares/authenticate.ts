import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/app-error.js";
import { verifyAccessToken } from "../lib/jwt.js";

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return next(new AppError(401, "UNAUTHORIZED", "액세스 토큰이 필요합니다."));
  }

  const token = authorization.slice("Bearer ".length);

  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch {
    return next(new AppError(403, "INVALID_ACCESS_TOKEN", "유효하지 않은 액세스 토큰입니다."));
  }
}
