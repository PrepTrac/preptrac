import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { logger, __resetLogLevelCache } from "~/server/logger";

describe("structured logger", () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  const originalLevel = process.env.LOG_LEVEL;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    if (originalLevel === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = originalLevel;
    __resetLogLevelCache();
  });

  function parseCalls(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown>[] {
    return spy.mock.calls.map((call: unknown[]) => JSON.parse(String(call[0])));
  }

  it("emits one JSON object per line with level, timestamp, and message", () => {
    logger.info("hello", { requestId: "abc" });
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const record = JSON.parse(String(stdoutSpy.mock.calls[0]![0]));
    expect(record).toMatchObject({ level: "info", message: "hello", requestId: "abc" });
    expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("writes error records to stderr and others to stdout", () => {
    logger.info("info-msg");
    logger.error("err-msg");
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    expect(stderrSpy).toHaveBeenCalledTimes(1);
    const errRecord = JSON.parse(String(stderrSpy.mock.calls[0]![0]));
    expect(errRecord.level).toBe("error");
  });

  it("respects LOG_LEVEL filtering", () => {
    process.env.LOG_LEVEL = "warn";
    __resetLogLevelCache();
    logger.info("should-be-skipped");
    logger.warn("should-pass");
    logger.error("should-pass");
    expect(parseCalls(stdoutSpy).map((r) => r.message)).toEqual(["should-pass"]);
    expect(parseCalls(stderrSpy).map((r) => r.message)).toEqual(["should-pass"]);
  });

  it("serializes error context", () => {
    logger.error("boom", { error: "disk full" });
    const record = JSON.parse(String(stderrSpy.mock.calls[0]![0]));
    expect(record.error).toBe("disk full");
  });

  it("skips undefined context values without clobbering core fields", () => {
    logger.info("x", { level: "forged", undefined: undefined, keep: 1 });
    const record = JSON.parse(String(stdoutSpy.mock.calls[0]![0]));
    expect(record.level).toBe("info"); // not overwritten
    expect(record).not.toHaveProperty("undefined");
    expect(record.keep).toBe(1);
  });
});
