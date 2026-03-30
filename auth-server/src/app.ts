import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { API_PREFIX } from "./config/constants.js";
import { env, normalizeOrigin } from "./config/env.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { apiRouter } from "./routes/index.js";

function isAllowedCorsOrigin(origin?: string | null) {
  if (!origin) {
    return true;
  }

  return env.clientOrigins.includes(normalizeOrigin(origin));
}

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, isAllowedCorsOrigin(origin));
      },
      optionsSuccessStatus: 204,
      credentials: true
    })
  );
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: "ok"
      }
    });
  });

  app.use(API_PREFIX, apiRouter);
  app.use(errorHandler);

  return app;
}
