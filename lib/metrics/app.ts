import { Gauge, Registry, collectDefaultMetrics } from "prom-client";

type GlobalMetricsState = typeof globalThis & {
  __workspaceAppMetricsRegistry?: Registry;
};

const globalMetricsState = globalThis as GlobalMetricsState;

function createAppMetricsRegistry() {
  const registry = new Registry();

  collectDefaultMetrics({
    register: registry,
    prefix: "workspace_app_",
  });

  new Gauge({
    name: "workspace_app_info",
    help: "Workspace app process info.",
    labelNames: ["service", "version"],
    registers: [registry],
  }).set(
    {
      service: "timetable-web",
      version: process.env.npm_package_version ?? "0.0.0",
    },
    1
  );

  return registry;
}

export function getAppMetricsRegistry() {
  if (!globalMetricsState.__workspaceAppMetricsRegistry) {
    globalMetricsState.__workspaceAppMetricsRegistry = createAppMetricsRegistry();
  }

  return globalMetricsState.__workspaceAppMetricsRegistry;
}
