import { afterEach, describe, expect, it, vi } from "vitest";
import { register } from "../instrumentation";
import { validateRuntimeEnv } from "../lib/env";

const productionEnv = {
  ACTOS_API_URL: "http://api:3100",
  ACTOS_SITE_URL: "https://actos.com.tr",
  NEXT_PUBLIC_ACTOS_API_URL: "https://api.actos.com.tr",
};

describe("runtime environment validation", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    vi.unstubAllEnvs();
    process.env = { ...originalEnv };
  });

  it("requires all configured URLs in production", () => {
    for (const name of Object.keys(productionEnv) as Array<keyof typeof productionEnv>) {
      const env = { ...productionEnv };
      delete env[name];

      expect(() => validateRuntimeEnv(env, "production")).toThrow(`${name} is required`);
    }
  });

  it("accepts valid public origins and an internal Docker API hostname", () => {
    expect(() => validateRuntimeEnv(productionEnv, "production")).not.toThrow();
  });

  it("allows an explicit loopback API URL for host-run production and e2e", () => {
    expect(() =>
      validateRuntimeEnv(
        { ...productionEnv, ACTOS_API_URL: "http://127.0.0.1:3100" },
        "production",
      ),
    ).not.toThrow();
  });

  it.each([
    ["ACTOS_API_URL", "ftp://api:3100"],
    ["ACTOS_SITE_URL", "https://user:secret@actos.com.tr"],
    ["ACTOS_SITE_URL", "https://actos.com.tr/app"],
    ["NEXT_PUBLIC_ACTOS_API_URL", "https://api.actos.com.tr?token=secret"],
  ] as const)("rejects invalid %s values", (name, value) => {
    expect(() => validateRuntimeEnv({ ...productionEnv, [name]: value }, "production")).toThrow(
      name,
    );
  });

  it("keeps optional defaults available during local development", () => {
    expect(() => validateRuntimeEnv({}, "development")).not.toThrow();
    expect(() => validateRuntimeEnv({}, "test")).not.toThrow();
  });

  it("validates the environment as part of Next server startup", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.ACTOS_API_URL;
    delete process.env.ACTOS_SITE_URL;
    delete process.env.NEXT_PUBLIC_ACTOS_API_URL;

    expect(() => register()).toThrow("ACTOS_API_URL is required");
  });
});
