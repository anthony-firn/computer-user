/**
 * AuthWallDetector — inspects page signals to determine if we've hit an
 * authentication wall that requires human intervention.
 *
 * Detection is based on URL patterns, page title, visible text, and DOM
 * signals (presence of password fields, CAPTCHA iframes).
 */

// URL patterns that indicate SSO / identity provider redirects
const SSO_URL_PATTERNS = [
  /login\.microsoftonline\.com/,
  /login\.microsoft\.com/,
  /okta\.com\/oauth2/,
  /auth0\.com\/authorize/,
  /accounts\.google\.com\/signin/,
  /appleid\.apple\.com\/auth/,
  /login\.salesforce\.com/,
  /\.auth0\.com\//,
  /\/saml\/redirect/,
  /\/sso\//,
];

// Text patterns that indicate various auth walls
const AUTH_TEXT_PATTERNS = [
  // Login / sign-in
  { pattern: /sign\s?in\b/i, type: "login_form", weight: 2 },
  { pattern: /log\s?in\b/i, type: "login_form", weight: 2 },
  { pattern: /sign\s?up\b/i, type: "login_form", weight: 2 },
  { pattern: /create\s+(your\s+)?account/i, type: "login_form", weight: 2 },
  { pattern: /forgot\s+(your\s+)?password/i, type: "login_form", weight: 1 },

  // Cloudflare / bot detection
  {
    pattern: /just\s+a\s+moment/i,
    type: "cloudflare_challenge",
    weight: 5,
  },
  {
    pattern: /verifying\s+you\s+are\s+(a\s+)?human/i,
    type: "cloudflare_challenge",
    weight: 5,
  },
  {
    pattern: /checking\s+your\s+browser/i,
    type: "cloudflare_challenge",
    weight: 5,
  },
  {
    pattern: /ddos\s+protection/i,
    type: "cloudflare_challenge",
    weight: 4,
  },

  // MFA / 2FA / verification
  {
    pattern: /verify\s+your\s+(identity|account|email)/i,
    type: "mfa_prompt",
    weight: 4,
  },
  {
    pattern: /\b(authenticator|2fa|two.factor|two.step)\b/i,
    type: "mfa_prompt",
    weight: 4,
  },
  {
    pattern: /enter\s+(the\s+)?\d[\d-]*\s?(digit\s+)?code/i,
    type: "mfa_prompt",
    weight: 5,
  },
  {
    pattern: /security\s+(code|key|token)/i,
    type: "mfa_prompt",
    weight: 3,
  },
  { pattern: /otp\b/i, type: "mfa_prompt", weight: 3 },

  // Session expired
  {
    pattern: /session\s+(has\s+)?expired/i,
    type: "session_expired",
    weight: 5,
  },
  { pattern: /please\s+log\s+(in|on)\s+again/i, type: "session_expired", weight: 4 },
  { pattern: /timed\s+out/i, type: "session_expired", weight: 3 },
  { pattern: /re-authenticate/i, type: "session_expired", weight: 4 },

  // CAPTCHA
  {
    pattern: /(i am|i'm)\s+not\s+a\s+robot/i,
    type: "captcha",
    weight: 5,
  },
  {
    pattern: /complete\s+(the\s+)?security\s+check/i,
    type: "captcha",
    weight: 4,
  },
  { pattern: /prove\s+you\s+are\s+(a\s+)?human/i, type: "captcha", weight: 4 },

  // Generic auth
  { pattern: /unauthorized/i, type: "session_expired", weight: 3 },
  { pattern: /access\s+denied/i, type: "session_expired", weight: 3 },
  { pattern: /authentication\s+required/i, type: "login_form", weight: 4 },
];

// Titles that strongly indicate auth walls
const AUTH_TITLE_PATTERNS = [
  { pattern: /sign\s?in/i, type: "login_form", weight: 3 },
  { pattern: /log\s?in/i, type: "login_form", weight: 3 },
  { pattern: /just a moment/i, type: "cloudflare_challenge", weight: 5 },
  { pattern: /verify/i, type: "mfa_prompt", weight: 3 },
  { pattern: /session expired/i, type: "session_expired", weight: 5 },
  { pattern: /attention required/i, type: "cloudflare_challenge", weight: 4 },
  { pattern: /sign up/i, type: "login_form", weight: 3 },
];

export class AuthWallDetector {
  /**
   * Analyze page signals and determine if we're at an auth wall.
   *
   * @param {Object} signals
   * @param {string} signals.url - Current page URL
   * @param {string} signals.pageTitle - Page title
   * @param {string} [signals.pageText=""] - Visible page text (first ~2K chars)
   * @param {boolean} [signals.hasPasswordField=false] - Password input present
   * @param {boolean} [signals.hasCaptchaIframe=false] - CAPTCHA iframe present
   * @returns {{ isAuthWall: boolean, authType: string, confidence: number, recommendedAction: string, reasons: string[] }}
   */
  detect({ url, pageTitle, pageText = "", hasPasswordField = false, hasCaptchaIframe = false }) {
    const reasons = [];
    const scores = new Map(); // type -> cumulative weight

    // Check URL for SSO redirects
    for (const pattern of SSO_URL_PATTERNS) {
      if (pattern.test(url)) {
        const score = 5;
        scores.set("sso_redirect", (scores.get("sso_redirect") || 0) + score);
        reasons.push(`URL matches SSO pattern: ${pattern}`);
      }
    }

    // Check page title
    for (const { pattern, type, weight } of AUTH_TITLE_PATTERNS) {
      if (pattern.test(pageTitle)) {
        scores.set(type, (scores.get(type) || 0) + weight);
        reasons.push(`Title "${pageTitle}" matches ${type} (weight: ${weight})`);
      }
    }

    // Check page text
    for (const { pattern, type, weight } of AUTH_TEXT_PATTERNS) {
      if (pattern.test(pageText)) {
        scores.set(type, (scores.get(type) || 0) + weight);
        reasons.push(`Text matches ${type} pattern (weight: ${weight})`);
      }
    }

    // Password field is a strong signal for login
    if (hasPasswordField) {
      scores.set("login_form", (scores.get("login_form") || 0) + 5);
      reasons.push("Password field detected (+5 for login_form)");
    }

    // CAPTCHA iframe
    if (hasCaptchaIframe) {
      // If we're already seeing login text, it's likely a captcha-on-login;
      // otherwise treat as standalone captcha
      const existingLogin = scores.get("login_form") || 0;
      if (existingLogin >= 2) {
        scores.set("login_form", existingLogin + 3);
        reasons.push("CAPTCHA iframe on login page (+3 for login_form)");
      } else {
        scores.set("captcha", (scores.get("captcha") || 0) + 5);
        reasons.push("CAPTCHA iframe detected (+5 for captcha)");
      }
    }

    // Determine the dominant auth type
    let bestType = "none";
    let bestScore = 0;

    for (const [type, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }

    // Threshold: need at least weight 3 to classify as auth wall
    const isAuthWall = bestScore >= 3;

    // Generate recommendation
    let recommendedAction;
    if (!isAuthWall) {
      recommendedAction = "proceed: no auth wall detected, continue with task";
    } else {
      recommendedAction = `handoff: ${bestType} detected (confidence: ${bestScore}). Use cu_handoff_to_human to ask the human to authenticate.`;
    }

    return {
      isAuthWall,
      authType: bestType,
      confidence: bestScore,
      recommendedAction,
      reasons,
    };
  }

  /**
   * Returns a human-readable summary of what auth indicators this detector
   * looks for, to help the agent understand what to watch for.
   */
  getAuthIndicators() {
    return [
      "Password fields on a page indicate a login form",
      "Pages titled 'Just a moment...' or 'Verifying...' indicate a Cloudflare/bot challenge",
      "URLs redirecting to Okta, Microsoft Online, Auth0, or Google Accounts indicate SSO",
      "Text asking for verification codes or mentioning authenticator apps indicates MFA",
      "CAPTCHA iframes (reCAPTCHA, hCaptcha, Turnstile) indicate bot detection",
      "'Session expired' or 'Please log in again' messages indicate expired credentials",
      "After the human logs in, these indicators should disappear — then save the session",
    ].join(". ");
  }
}
