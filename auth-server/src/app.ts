import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { API_PREFIX } from "./config/constants.js";
import { env, normalizeOrigin } from "./config/env.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { authMetricsMiddleware, getAuthMetricsRegistry } from "./metrics.js";
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
  app.use(authMetricsMiddleware);
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

  app.get("/metrics", async (_req, res, next) => {
    try {
      const registry = getAuthMetricsRegistry();
      res.setHeader("Content-Type", registry.contentType);
      res.status(200).send(await registry.metrics());
    } catch (error) {
      next(error);
    }
  });

  app.use(API_PREFIX, apiRouter);
  app.use(errorHandler);

  return app;
}
