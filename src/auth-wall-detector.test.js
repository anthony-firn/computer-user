import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AuthWallDetector } from "./auth-wall-detector.js";

describe("AuthWallDetector", () => {
  const detector = new AuthWallDetector();

  describe("detect", () => {
    it("identifies a login page with password field", () => {
      const result = detector.detect({
        url: "https://airtable.com/login",
        pageTitle: "Airtable - Sign In",
        pageText: "Sign in to your account Email address Password Forgot password?",
        hasPasswordField: true,
        hasCaptchaIframe: false,
      });

      assert.equal(result.isAuthWall, true);
      assert.equal(result.authType, "login_form");
      assert.ok(result.recommendedAction.includes("handoff"));
    });

    it("identifies a Cloudflare challenge page", () => {
      const result = detector.detect({
        url: "https://airtable.com/login",
        pageTitle: "Just a moment...",
        pageText: "Verifying you are human. This may take a few seconds.",
        hasPasswordField: false,
        hasCaptchaIframe: true,
      });

      assert.equal(result.isAuthWall, true);
      assert.equal(result.authType, "cloudflare_challenge");
    });

    it("identifies SSO redirect by URL", () => {
      const result = detector.detect({
        url: "https://login.microsoftonline.com/abc-123/oauth2/authorize",
        pageTitle: "Sign in to your account",
        pageText: "Pick an account",
        hasPasswordField: false,
        hasCaptchaIframe: false,
      });

      assert.equal(result.isAuthWall, true);
      assert.equal(result.authType, "sso_redirect");
    });

    it("identifies MFA / verification prompt", () => {
      const result = detector.detect({
        url: "https://airtable.com/verify",
        pageTitle: "Verify your identity",
        pageText: "Enter the 6-digit code from your authenticator app",
        hasPasswordField: false,
        hasCaptchaIframe: false,
      });

      assert.equal(result.isAuthWall, true);
      assert.equal(result.authType, "mfa_prompt");
    });

    it("identifies session expired message", () => {
      const result = detector.detect({
        url: "https://app.airtable.com",
        pageTitle: "Session Expired",
        pageText: "Your session has expired. Please log in again to continue.",
        hasPasswordField: false,
        hasCaptchaIframe: false,
      });

      assert.equal(result.isAuthWall, true);
      assert.equal(result.authType, "session_expired");
    });

    it("identifies reCAPTCHA presence", () => {
      const result = detector.detect({
        url: "https://example.com/checkout",
        pageTitle: "Checkout",
        pageText: "Complete your purchase. Verify you are not a robot.",
        hasPasswordField: false,
        hasCaptchaIframe: true,
      });

      assert.equal(result.isAuthWall, true);
      assert.equal(result.authType, "captcha");
    });

    it("returns false for a normal authenticated page", () => {
      const result = detector.detect({
        url: "https://airtable.com/appXXX/tblYYY/viwZZZ",
        pageTitle: "My Base - Airtable",
        pageText: "Grid view  Records  Fields  Filter  Sort  Group",
        hasPasswordField: false,
        hasCaptchaIframe: false,
      });

      assert.equal(result.isAuthWall, false);
      assert.equal(result.authType, "none");
    });

    it("returns false for a public docs page", () => {
      const result = detector.detect({
        url: "https://docs.example.com/getting-started",
        pageTitle: "Getting Started - Docs",
        pageText: "Welcome to the documentation. Here's how to install...",
        hasPasswordField: false,
        hasCaptchaIframe: false,
      });

      assert.equal(result.isAuthWall, false);
      assert.equal(result.authType, "none");
    });

    it("detects sign-up page as auth wall (needs human)", () => {
      const result = detector.detect({
        url: "https://example.com/signup",
        pageTitle: "Create your account",
        pageText: "Sign up for free  Email  Password  Confirm password  Create account",
        hasPasswordField: true,
        hasCaptchaIframe: false,
      });

      assert.equal(result.isAuthWall, true);
      assert.equal(result.authType, "login_form");
    });
  });

  describe("getAuthIndicators", () => {
    it("returns a summary of all detectable auth patterns", () => {
      const indicators = detector.getAuthIndicators();
      assert.ok(indicators.toLowerCase().includes("password"));
      assert.ok(indicators.includes("Cloudflare"));
      assert.ok(indicators.includes("MFA"));
      assert.ok(indicators.includes("CAPTCHA"));
    });
  });
});
