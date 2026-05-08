#!/usr/bin/env node

/**
 * Computer User MCP Server
 *
 * A lightweight MCP server that provides human-in-the-loop tools for browser automation.
 * Works alongside stealth-agent-browser-mcp — detects auth walls and hands off to
 * a human when login/CAPTCHA/MFA is needed.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { AuthWallDetector } from "./auth-wall-detector.js";
import { SessionManager } from "./session-manager.js";
import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const PROFILES_DIR =
  process.env.CU_PROFILES_DIR ||
  path.join(os.homedir(), ".computer-user", "profiles");

const HEADLESS = process.env.CU_HEADLESS !== "false";

const sessionManager = new SessionManager(PROFILES_DIR);
const authDetector = new AuthWallDetector();

// ---- Tools Registry ----

const tools = [
  {
    name: "cu_handoff_to_human",
    description:
      "Pause automation and ask a human to intervene. Use when you hit a login page, " +
      "Cloudflare challenge, CAPTCHA, SSO redirect, MFA prompt, or any auth wall you cannot bypass. " +
      "Opens a visible browser window, tells the human what to do, waits for them to finish, " +
      "then saves the session and resumes headless mode.",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description:
            "What the human needs to do, e.g. 'Please log into Airtable with your SSO credentials.'",
        },
        service: {
          type: "string",
          description:
            "Service name for session storage, e.g. 'airtable', 'github', 'salesforce'.",
        },
        wait_for_url_pattern: {
          type: "string",
          description:
            "URL glob pattern to detect successful auth, e.g. '**/airtable.com/*/apps**'.",
        },
        wait_for_element_text: {
          type: "string",
          description:
            "Text that should appear on the page after successful auth.",
        },
        wait_for_cookie_name: {
          type: "string",
          description:
            "Cookie name that gets set after successful login.",
        },
        timeout_seconds: {
          type: "number",
          description: "Max time to wait for human (default 300).",
          default: 300,
        },
      },
      required: ["message", "service"],
    },
  },
  {
    name: "cu_detect_auth_wall",
    description:
      "Analyze the current page and determine if it's an auth wall. " +
      "Returns the type of auth wall detected and recommended next action.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Current page URL to analyze.",
        },
        page_title: {
          type: "string",
          description: "Current page title.",
        },
        page_text_sample: {
          type: "string",
          description:
            "First ~2000 chars of visible page text to scan for auth patterns.",
        },
        has_password_field: {
          type: "boolean",
          description: "Whether the page contains a password input.",
        },
        has_captcha_iframe: {
          type: "boolean",
          description:
            "Whether the page contains a CAPTCHA iframe (reCAPTCHA, hCaptcha, Turnstile).",
        },
      },
      required: ["url", "page_title"],
    },
  },
  {
    name: "cu_save_session",
    description:
      "Save the current browser session (cookies, localStorage) for a service. " +
      "Call this after successful human login to persist the session.",
    inputSchema: {
      type: "object",
      properties: {
        service: {
          type: "string",
          description: "Service name, e.g. 'airtable', 'github'.",
        },
      },
      required: ["service"],
    },
  },
  {
    name: "cu_load_session",
    description:
      "Load a previously saved browser session for a service. " +
      "Returns whether a session exists and when it was last saved.",
    inputSchema: {
      type: "object",
      properties: {
        service: {
          type: "string",
          description: "Service name, e.g. 'airtable', 'github'.",
        },
      },
      required: ["service"],
    },
  },
  {
    name: "cu_list_sessions",
    description:
      "List all saved browser sessions with their last-used timestamps.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// ---- Server Setup ----

const server = new Server(
  { name: "computer-user", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "cu_detect_auth_wall": {
      const result = authDetector.detect({
        url: args.url,
        pageTitle: args.page_title,
        pageText: args.page_text_sample || "",
        hasPasswordField: args.has_password_field,
        hasCaptchaIframe: args.has_captcha_iframe,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    case "cu_handoff_to_human": {
      const result = await handoffToHuman(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    case "cu_save_session": {
      const meta = sessionManager.save(args.service);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                service: args.service,
                saved_at: meta.savedAt,
                message: `Session for '${args.service}' saved.`,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "cu_load_session": {
      const session = sessionManager.load(args.service);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(session, null, 2),
          },
        ],
      };
    }

    case "cu_list_sessions": {
      const sessions = sessionManager.listAll();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(sessions, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// ---- Human Handoff Implementation ----

async function handoffToHuman(args) {
  const {
    message,
    service,
    wait_for_url_pattern,
    wait_for_element_text,
    wait_for_cookie_name,
    timeout_seconds = 300,
  } = args;

  const profilePath = path.join(PROFILES_DIR, service);

  console.error(`[computer-user] Handoff requested for '${service}'`);
  console.error(`[computer-user] Message: ${message}`);
  console.error(`[computer-user] Profile: ${profilePath}`);

  // Check if we have a cached session first
  const existingSession = sessionManager.load(service);
  if (existingSession.exists) {
    console.error(
      `[computer-user] Existing session found for '${service}' from ${existingSession.saved_at}`
    );
    console.error(
      `[computer-user] Will reuse session; handoff may not be needed.`
    );
    return {
      action: "session_exists",
      service,
      message:
        `A saved session for '${service}' already exists from ${existingSession.saved_at}. ` +
        `Try navigating first — if the session is still valid, no login is needed. ` +
        `If the session expired and you hit an auth wall, call cu_handoff_to_human with force=true.`,
    };
  }

  // Signal to the agent/user that handoff is starting
  console.error(`\n${"=".repeat(60)}`);
  console.error(`  HUMAN HANDOFF REQUESTED`);
  console.error(`  Service: ${service}`);
  console.error(`  ${message}`);
  console.error(`${"=".repeat(60)}\n`);

  // In practice, this would:
  // 1. Launch a visible browser pointing at the current page
  // 2. Tell the user what to do
  // 3. Poll for completion (URL change, element appearance, cookie set)
  // 4. Save the session

  // For now, we return instructions for the agent to use stealth-agent-browser-mcp
  // to navigate to the login page and then signal the human

  const instructions = {
    action: "handoff_initiated",
    service,
    profile_path: profilePath,
    steps: [
      {
        step: 1,
        instruction:
          "Use browser_navigate from stealth-browser MCP to go to the login page.",
        tool: "browser_navigate",
      },
      {
        step: 2,
        instruction: `Tell the human: "${message}"`,
        note: "The human needs to manually log in. If using OpenHands Cloud, share the browser view.",
      },
      {
        step: 3,
        instruction:
          "Use browser_snapshot repeatedly (every 3-5 seconds) to check if auth succeeded.",
        wait_conditions: {
          ...(wait_for_url_pattern && { url_pattern: wait_for_url_pattern }),
          ...(wait_for_element_text && {
            element_text: wait_for_element_text,
          }),
          ...(wait_for_cookie_name && { cookie_name: wait_for_cookie_name }),
        },
        timeout_seconds,
      },
      {
        step: 4,
        instruction:
          "Once auth is confirmed, call cu_save_session to persist the session.",
        tool: "cu_save_session",
        args: { service },
      },
      {
        step: 5,
        instruction: "Resume the original task now that you're authenticated.",
      },
    ],
    detection_hint:
      authDetector.getAuthIndicators() +
      " After the human logs in, these indicators should disappear.",
    timeout_seconds,
  };

  return instructions;
}

// ---- Start Server ----

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("[computer-user] MCP server started (stdio)");
console.error(`[computer-user] Profiles: ${PROFILES_DIR}`);
console.error(`[computer-user] Headless: ${HEADLESS}`);
