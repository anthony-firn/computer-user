import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { SessionManager } from "./session-manager.js";

describe("SessionManager", () => {
  let tmpDir;
  let manager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cu-test-"));
    manager = new SessionManager(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("save", () => {
    it("creates a session directory with metadata", () => {
      const meta = manager.save("github");
      assert.ok(meta.savedAt);
      assert.ok(fs.existsSync(path.join(tmpDir, "github")));
      assert.ok(fs.existsSync(path.join(tmpDir, "github", "metadata.json")));

      const stored = JSON.parse(
        fs.readFileSync(path.join(tmpDir, "github", "metadata.json"), "utf-8")
      );
      assert.equal(stored.service, "github");
    });

    it("saves cookies if provided", () => {
      const cookies = [
        { name: "session", value: "abc123", domain: ".github.com" },
        { name: "user_session", value: "xyz789", domain: "github.com" },
      ];
      const meta = manager.save("github", { cookies });
      assert.ok(meta.savedAt);
      assert.ok(fs.existsSync(path.join(tmpDir, "github", "cookies.json")));

      const stored = JSON.parse(
        fs.readFileSync(path.join(tmpDir, "github", "cookies.json"), "utf-8")
      );
      assert.equal(stored.length, 2);
      assert.equal(stored[0].name, "session");
    });

    it("saves localStorage if provided", () => {
      const localStorage = { token: "bearer-123", theme: "dark" };
      manager.save("airtable", { localStorage });

      const stored = JSON.parse(
        fs.readFileSync(path.join(tmpDir, "airtable", "localStorage.json"), "utf-8")
      );
      assert.equal(stored.token, "bearer-123");
    });

    it("overwrites an existing session with updated timestamp", () => {
      const first = manager.save("github");
      // wait a tick for timestamp difference
      const firstTime = new Date(first.savedAt).getTime();

      const second = manager.save("github");
      const secondTime = new Date(second.savedAt).getTime();
      assert.ok(secondTime >= firstTime);
    });
  });

  describe("load", () => {
    it("returns exists=false for an unknown service", () => {
      const result = manager.load("nonexistent");
      assert.equal(result.exists, false);
      assert.equal(result.service, "nonexistent");
    });

    it("returns session data for a saved service", () => {
      manager.save("airtable", {
        cookies: [{ name: "session", value: "token123" }],
      });

      const result = manager.load("airtable");
      assert.equal(result.exists, true);
      assert.equal(result.service, "airtable");
      assert.ok(result.saved_at);
      assert.equal(result.cookies.length, 1);
      assert.equal(result.cookies[0].value, "token123");
    });

    it("returns empty arrays when no cookies/localStorage saved", () => {
      manager.save("airtable");

      const result = manager.load("airtable");
      assert.equal(result.exists, true);
      assert.equal(result.cookies.length, 0);
      assert.equal(result.localStorage, null);
    });
  });

  describe("listAll", () => {
    it("returns empty array when no sessions", () => {
      const sessions = manager.listAll();
      assert.equal(sessions.length, 0);
    });

    it("lists all saved services with timestamps", () => {
      manager.save("airtable");
      manager.save("github");

      const sessions = manager.listAll();
      assert.equal(sessions.length, 2);

      const names = sessions.map((s) => s.service).sort();
      assert.deepEqual(names, ["airtable", "github"]);

      for (const s of sessions) {
        assert.ok(s.saved_at);
        assert.ok(s.cookie_count !== undefined);
      }
    });

    it("sorts by most recently saved", () => {
      manager.save("airtable");
      // Brief pause to ensure different timestamps
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
      manager.save("github");

      const sessions = manager.listAll();
      assert.equal(sessions.length, 2);
      // Most recent first
      assert.equal(sessions[0].service, "github");
      assert.equal(sessions[1].service, "airtable");
    });
  });

  describe("delete", () => {
    it("removes a session directory", () => {
      manager.save("airtable");
      assert.ok(fs.existsSync(path.join(tmpDir, "airtable")));

      const result = manager.delete("airtable");
      assert.equal(result.success, true);
      assert.equal(fs.existsSync(path.join(tmpDir, "airtable")), false);
    });

    it("returns success=false for nonexistent service", () => {
      const result = manager.delete("nonexistent");
      assert.equal(result.success, false);
    });
  });
});
