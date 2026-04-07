import type { RequestHandler } from "express";
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "prom-client";

type GlobalMetricsState = typeof globalThis & {
  __workspaceAuthMetricsRegistry?: Registry;
  __workspaceAuthHttpRequestsTotal?: Counter<"method" | "route" | "status_code">;
  __workspaceAuthHttpRequestDurationSeconds?: Histogram<"method" | "route" | "status_code">;
};

const globalMetricsState = globalThis as GlobalMetricsState;

function createAuthMetricsRegistry() {
  const registry = new Registry();

  collectDefaultMetrics({
    register: registry,
    prefix: "workspace_auth_",
  });

  new Gauge({
    name: "workspace_auth_info",
    help: "Workspace auth-server process info.",
    labelNames: ["service", "version"],
    registers: [registry],
  }).set(
    {
      service: "workspace-auth-server",
      version: process.env.npm_package_version ?? "0.0.0",
    },
    1
  );

  globalMetricsState.__workspaceAuthHttpRequestsTotal = new Counter({
    name: "workspace_auth_http_requests_total",
    help: "Total HTTP requests handled by auth-server.",
    labelNames: ["method", "route", "status_code"],
    registers: [registry],
  });

  globalMetricsState.__workspaceAuthHttpRequestDurationSeconds = new Histogram({
    name: "workspace_auth_http_request_duration_seconds",
    help: "HTTP request latency for auth-server.",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [registry],
  });

  return registry;
}

export function getAuthMetricsRegistry() {
  if (!globalMetricsState.__workspaceAuthMetricsRegistry) {
    globalMetricsState.__workspaceAuthMetricsRegistry = createAuthMetricsRegistry();
  }

  return globalMetricsState.__workspaceAuthMetricsRegistry;
}

function normalizeMetricsRoute(originalUrl?: string) {
  if (!originalUrl) {
    return "unknown";
  }

  if (originalUrl.startsWith("/api/v1/auth/provider/")) {
    return "/api/v1/auth/provider/:provider";
  }

  if (originalUrl.startsWith("/api/v1/auth/callback/")) {
    return "/api/v1/auth/callback/:provider";
  }

  return originalUrl.split("?")[0] || "unknown";
}

export const authMetricsMiddleware: RequestHandler = (req, res, next) => {
  getAuthMetricsRegistry();
  const requestCounter = globalMetricsState.__workspaceAuthHttpRequestsTotal;
  const requestDuration = globalMetricsState.__workspaceAuthHttpRequestDurationSeconds;

  if (!requestCounter || !requestDuration) {
    next();
    return;
  }

  const route = normalizeMetricsRoute(req.originalUrl);

  if (route === "/metrics") {
    next();
    return;
  }

  const stopTimer = requestDuration.startTimer({
    method: req.method,
    route,
  });

  res.on("finish", () => {
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    requestCounter.inc(labels);
    stopTimer(labels);
  });

  next();
};
