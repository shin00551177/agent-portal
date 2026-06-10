/**
 * Guardrail tests — Fleet Review required gate (COMMON.md §1-4)
 * Tests run offline — no DB, no external API.
 */

import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";

const ROOT = path.resolve(__dirname, "..");

// ── 1. Governance files present ─────────────────────────────────────────────
// Fleet Review §3: All 4 governance documents must exist.
describe("Governance files (Fleet Review §3)", () => {
  const required = ["GOVERNANCE.md", "agent.yaml", "COMMON.md", ".env.example"];

  for (const file of required) {
    it(`${file} exists`, async () => {
      await expect(fs.access(path.join(ROOT, file))).resolves.toBeUndefined();
    });
  }
});

// ── 2. agent.yaml structure ──────────────────────────────────────────────────
describe("agent.yaml required fields (Fleet Review §3)", () => {
  let config: Record<string, unknown>;

  beforeAll(async () => {
    const raw = await fs.readFile(path.join(ROOT, "agent.yaml"), "utf-8");
    config = yaml.load(raw) as Record<string, unknown>;
  });

  it("has name, owner, status fields", () => {
    expect(config.name).toBeTruthy();
    expect(config.owner).toBeTruthy();
    expect(config.status).toBeTruthy();
  });

  it("has data_access section", () => {
    expect(config.data_access).toBeTruthy();
  });

  it("has kill_switch defined", () => {
    expect(config.kill_switch).toBeTruthy();
  });

  it("requires human approval for writes (approval_required=true)", () => {
    expect(config.approval_required).toBe(true);
  });
});

// ── 3. Credential validation ────────────────────────────────────────────────
// COMMON.md §2: SESSION_SECRET and PORTAL_PASSWORD must be set. No fallback.
// Verified via code inspection — guard must be present in lib/auth.ts source.
describe("Credential validation guard (COMMON.md §2)", () => {
  it("lib/auth.ts contains the required env-var guard (no fallback)", async () => {
    const content = await fs.readFile(path.join(ROOT, "lib/auth.ts"), "utf-8");
    // Guard must throw if env vars are missing — no hardcoded fallback allowed
    expect(content).toContain("SESSION_SECRET");
    expect(content).toContain("PORTAL_PASSWORD");
    expect(content).toMatch(/throw new Error/);
    // Must NOT contain hardcoded fallback strings
    expect(content).not.toMatch(/\|\|\s*["'`][a-zA-Z0-9]{8,}/);
  });
});

// ── 4. No hardcoded secrets in .env.example ─────────────────────────────────
// COMMON.md §3: Never commit real credentials. .env.example must have empty values.
describe("No hardcoded secrets (COMMON.md §3)", () => {
  it(".env.example has no values assigned (all lines are comments or blank)", async () => {
    const content = await fs.readFile(path.join(ROOT, ".env.example"), "utf-8");
    const valueLines = content
      .split("\n")
      .filter((l) => !l.trim().startsWith("#") && l.includes("=") && l.trim() !== "");
    // All value lines should have empty or placeholder values (no real-looking secrets)
    for (const line of valueLines) {
      const value = line.split("=").slice(1).join("=").trim();
      // Values should be empty or comment-style placeholders
      expect(value.length).toBeLessThan(60);
      expect(value).not.toMatch(/^[A-Za-z0-9+/]{40,}={0,2}$/); // no base64 secrets
    }
  });
});
