/**
 * SessionManager — persists browser sessions per service so the agent
 * can reuse authenticated sessions across conversations.
 *
 * Directory structure:
 *   profiles/
 *     airtable/
 *       metadata.json    # { service, savedAt }
 *       cookies.json     # [{ name, value, domain, ... }]
 *       localStorage.json # { key: value, ... }
 *     github/
 *       ...
 */

import fs from "node:fs";
import path from "node:path";

export class SessionManager {
  /**
   * @param {string} profilesDir - Root directory for session profiles
   */
  constructor(profilesDir) {
    this.profilesDir = profilesDir;
    fs.mkdirSync(profilesDir, { recursive: true });
  }

  /**
   * Save a session for a service.
   *
   * @param {string} service - Service name (e.g. "airtable", "github")
   * @param {Object} [data] - Session data
   * @param {Array} [data.cookies] - Browser cookies
   * @param {Object} [data.localStorage] - localStorage key-value pairs
   * @returns {{ savedAt: string, service: string }}
   */
  save(service, data = {}) {
    const dir = path.join(this.profilesDir, service);
    fs.mkdirSync(dir, { recursive: true });

    const savedAt = new Date().toISOString();

    const metadata = { service, savedAt };
    fs.writeFileSync(
      path.join(dir, "metadata.json"),
      JSON.stringify(metadata, null, 2)
    );

    if (data.cookies) {
      fs.writeFileSync(
        path.join(dir, "cookies.json"),
        JSON.stringify(data.cookies, null, 2)
      );
    }

    if (data.localStorage) {
      fs.writeFileSync(
        path.join(dir, "localStorage.json"),
        JSON.stringify(data.localStorage, null, 2)
      );
    }

    return { savedAt, service };
  }

  /**
   * Load a session for a service.
   *
   * @param {string} service
   * @returns {{ exists: boolean, service: string, saved_at?: string, cookies?: Array, localStorage?: Object|null }}
   */
  load(service) {
    const dir = path.join(this.profilesDir, service);
    const metadataPath = path.join(dir, "metadata.json");

    if (!fs.existsSync(metadataPath)) {
      return { exists: false, service };
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
    const cookiesPath = path.join(dir, "cookies.json");
    const lsPath = path.join(dir, "localStorage.json");

    const result = {
      exists: true,
      service,
      saved_at: metadata.savedAt,
      cookies: [],
      localStorage: null,
    };

    if (fs.existsSync(cookiesPath)) {
      result.cookies = JSON.parse(fs.readFileSync(cookiesPath, "utf-8"));
    }

    if (fs.existsSync(lsPath)) {
      result.localStorage = JSON.parse(fs.readFileSync(lsPath, "utf-8"));
    }

    return result;
  }

  /**
   * List all saved sessions, sorted by most recently saved first.
   *
   * @returns {Array<{ service: string, saved_at: string, cookie_count: number }>}
   */
  listAll() {
    if (!fs.existsSync(this.profilesDir)) {
      return [];
    }

    const entries = fs.readdirSync(this.profilesDir, { withFileTypes: true });
    const sessions = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const metadataPath = path.join(
        this.profilesDir,
        entry.name,
        "metadata.json"
      );
      if (!fs.existsSync(metadataPath)) continue;

      const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
      const cookiesPath = path.join(
        this.profilesDir,
        entry.name,
        "cookies.json"
      );
      const cookieCount = fs.existsSync(cookiesPath)
        ? JSON.parse(fs.readFileSync(cookiesPath, "utf-8")).length
        : 0;

      sessions.push({
        service: metadata.service,
        saved_at: metadata.savedAt,
        cookie_count: cookieCount,
      });
    }

    sessions.sort((a, b) => b.saved_at.localeCompare(a.saved_at));
    return sessions;
  }

  /**
   * Delete a saved session.
   *
   * @param {string} service
   * @returns {{ success: boolean }}
   */
  delete(service) {
    const dir = path.join(this.profilesDir, service);
    if (!fs.existsSync(dir)) {
      return { success: false };
    }
    fs.rmSync(dir, { recursive: true, force: true });
    return { success: true };
  }
}
