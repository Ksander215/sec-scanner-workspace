/**
 * Browser Intelligence Engine — Authentication Intelligence
 *
 * Strategy Pattern for authentication detection and execution.
 * Supports: Login Forms, JWT, Cookies, Session Storage, Local Storage,
 * CSRF tokens, OAuth (architectural), OpenID Connect (architectural),
 * MFA Extension Points.
 *
 * No hardcoded scenarios — all auth flows are pluggable strategies.
 */

import type {
  AuthResult,
  AuthCookie,
  BrowserAuthMethod,
  StorageEntry,
  IPageController,
  IBrowserContextController,
} from './browser-types.ts';
import { BrowserAuthMethod as AuthMethod } from './browser-types.ts';

// ═══════════════════════════════════════════════════════════════
// Auth Strategy Interface
// ═══════════════════════════════════════════════════════════════

/** Context provided to every auth strategy. */
export interface AuthContext {
  readonly page: IPageController;
  readonly browserContext: IBrowserContextController;
  readonly targetUrl: string;
  readonly credentials: { username?: string; password?: string; token?: string };
  readonly abortSignal?: AbortSignal;
}

/** Result from a strategy's detection phase. */
export interface AuthDetectionResult {
  /** Whether this strategy can handle the auth. */
  readonly canHandle: boolean;
  /** Confidence 0.0-1.0. */
  readonly confidence: number;
  /** Detection evidence. */
  readonly evidence: string;
}

/**
 * Base interface for all authentication strategies.
 * Each strategy can detect and execute authentication.
 */
export interface AuthStrategy {
  /** Unique strategy identifier. */
  readonly id: string;
  /** Human-readable name. */
  readonly name: string;
  /** The auth method this strategy handles. */
  readonly method: BrowserAuthMethod;

  /**
   * Detect whether this strategy can handle authentication on the current page.
   */
  detect(context: AuthContext): Promise<AuthDetectionResult>;

  /**
   * Execute the authentication flow.
   */
  execute(context: AuthContext): Promise<AuthResult>;

  /**
   * Validate that authentication was successful after execution.
   */
  validate(context: AuthContext, result: AuthResult): Promise<boolean>;
}

// ═══════════════════════════════════════════════════════════════
// Login Form Strategy
// ═══════════════════════════════════════════════════════════════

/**
 * Detects and fills login forms.
 * Looks for password inputs, form actions, and submit buttons.
 */
export class LoginFormStrategy implements AuthStrategy {
  readonly id = 'login_form';
  readonly name = 'Login Form';
  readonly method = AuthMethod.LoginForm;

  async detect(context: AuthContext): Promise<AuthDetectionResult> {
    const page = context.page;
    try {
      // Look for password inputs
      const passwordInputs = await page.querySelectorAll('input[type="password"]');
      if (passwordInputs.length === 0) {
        return { canHandle: false, confidence: 0, evidence: 'No password inputs found' };
      }

      // Look for username/email inputs
      const usernameInputs = await page.querySelectorAll(
        'input[type="text"], input[type="email"], input[name*="user"], input[name*="email"], input[name*="login"]',
      );

      // Look for forms containing password inputs
      const forms = await page.querySelectorAll('form');
      let hasFormWithPassword = false;
      for (const form of forms) {
        const html = await form.outerHTML();
        if (html.includes('type="password"')) {
          hasFormWithPassword = true;
          break;
        }
      }

      const confidence = hasFormWithPassword ? 0.95 : (usernameInputs.length > 0 ? 0.8 : 0.5);
      const evidence = [
        `${passwordInputs.length} password input(s) found`,
        usernameInputs.length > 0 ? `${usernameInputs.length} username/email input(s) found` : 'No username input detected',
        hasFormWithPassword ? 'Form with password field detected' : 'Password input not inside a form',
      ].join('; ');

      return { canHandle: true, confidence, evidence };
    } catch {
      return { canHandle: false, confidence: 0, evidence: 'Detection failed' };
    }
  }

  async execute(context: AuthContext): Promise<AuthResult> {
    const { page, credentials } = context;
    const timestamp = new Date().toISOString();

    // Find username and password fields
    const passwordInputs = await page.querySelectorAll('input[type="password"]');
    if (passwordInputs.length === 0) {
      return {
        method: this.method,
        success: false,
        errorMessage: 'No password field found',
        authCookies: [],
        authLocalStorage: [],
        authSessionStorage: [],
        timestamp,
      };
    }

    // Try to find the best username field
    const usernameSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[name="username"]',
      'input[name="login"]',
      'input[type="text"]',
    ];

    let usernameFilled = false;
    for (const sel of usernameSelectors) {
      try {
        const el = await page.querySelector(sel);
        if (el) {
          await page.fill(sel, credentials.username ?? '');
          usernameFilled = true;
          break;
        }
      } catch { /* try next selector */ }
    }

    // Fill password
    const passwordSelector = 'input[type="password"]';
    await page.fill(passwordSelector, credentials.password ?? '');

    // Look for CSRF token before submitting
    let csrfToken: string | undefined;
    let csrfFieldName: string | undefined;
    const csrfSelectors = [
      'input[name*="csrf"]',
      'input[name*="_token"]',
      'input[name*="anticsrf"]',
      'input[name*="x-csrf"]',
      'input[name*="__RequestVerificationToken"]',
    ];
    for (const sel of csrfSelectors) {
      try {
        const el = await page.querySelector(sel);
        if (el) {
          csrfToken = await el.getAttribute('value') ?? undefined;
          csrfFieldName = await el.getAttribute('name') ?? undefined;
          if (csrfToken) break;
        }
      } catch { /* try next */ }
    }

    // Find and click submit button
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Sign in")',
      'button:has-text("Log in")',
      'button:has-text("Submit")',
      'form button',
    ];

    let submitted = false;
    for (const sel of submitSelectors) {
      try {
        const el = await page.querySelector(sel);
        if (el) {
          await page.click(sel);
          submitted = true;
          break;
        }
      } catch { /* try next */ }
    }

    if (!submitted) {
      // Try pressing Enter
      try {
        await page.evaluate('document.activeElement?.form?.requestSubmit?.() ?? document.querySelector("form")?.submit?.()');
        submitted = true;
      } catch { /* form submission failed */ }
    }

    // Wait for navigation after submit
    try {
      await page.waitForNavigation({ timeout: 10000 });
    } catch { /* timeout — page may not navigate */ }

    // Collect auth cookies and storage
    const authCookies = await context.browserContext.cookies();
    const authLocalStorage = await context.browserContext.localStorage();
    const authSessionStorage = await context.browserContext.sessionStorage();

    // Detect login URL
    const loginUrl = page.url();

    return {
      method: this.method,
      success: submitted,
      csrfToken,
      csrfFieldName,
      loginUrl,
      authCookies,
      authLocalStorage,
      authSessionStorage,
      timestamp,
    };
  }

  async validate(context: AuthContext, result: AuthResult): Promise<boolean> {
    // Auth is valid if we got cookies or if we navigated away from the login page
    const currentUrl = context.page.url();
    const hasCookies = result.authCookies.length > 0;
    const navigatedAway = currentUrl !== result.loginUrl;
    return hasCookies || navigatedAway;
  }
}

// ═══════════════════════════════════════════════════════════════
// JWT Strategy
// ═══════════════════════════════════════════════════════════════

/**
 * Detects and extracts JWT tokens from:
 * - localStorage
 * - sessionStorage
 * - Cookies
 * - Authorization headers (via runtime interception)
 * - Response bodies
 */
export class JwtStrategy implements AuthStrategy {
  readonly id = 'jwt';
  readonly name = 'JWT Token';
  readonly method = AuthMethod.Jwt;

  private static readonly JWT_PATTERN = /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;
  private static readonly JWT_KEY_PATTERNS = [
    /token/i,
    /jwt/i,
    /access_token/i,
    /id_token/i,
    /auth/i,
    /session/i,
  ];

  async detect(context: AuthContext): Promise<AuthDetectionResult> {
    const { page } = context;

    try {
      // Check localStorage
      const lsEntries = await page.evaluate(() => {
        const entries: { key: string; value: string }[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) entries.push({ key, value: localStorage.getItem(key) ?? '' });
        }
        return entries;
      });

      // Check sessionStorage
      const ssEntries = await page.evaluate(() => {
        const entries: { key: string; value: string }[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) entries.push({ key, value: sessionStorage.getItem(key) ?? '' });
        }
        return entries;
      });

      // Check cookies
      const cookies = await context.browserContext.cookies();

      // Look for JWT-like values
      const allEntries = [
        ...lsEntries.map(e => ({ ...e, source: 'local' as const })),
        ...ssEntries.map(e => ({ ...e, source: 'session' as const })),
        ...cookies.map(c => ({ key: c.name, value: c.value, source: 'cookie' as const })),
      ];

      let jwtFound = false;
      let evidence = '';
      for (const entry of allEntries) {
        if (JwtStrategy.JWT_PATTERN.test(entry.value)) {
          jwtFound = true;
          evidence = `JWT found in ${entry.source}: ${entry.key}`;
          break;
        }
        // Also check if value contains a JWT
        if (entry.value.includes('eyJ') && JwtStrategy.JWT_PATTERN.test(entry.value.trim())) {
          jwtFound = true;
          evidence = `JWT found embedded in ${entry.source}: ${entry.key}`;
          break;
        }
      }

      return {
        canHandle: jwtFound,
        confidence: jwtFound ? 0.9 : 0,
        evidence: evidence || 'No JWT tokens found in storage or cookies',
      };
    } catch {
      return { canHandle: false, confidence: 0, evidence: 'JWT detection failed' };
    }
  }

  async execute(context: AuthContext): Promise<AuthResult> {
    const timestamp = new Date().toISOString();

    try {
      const lsEntries = await context.browserContext.localStorage();
      const ssEntries = await context.browserContext.sessionStorage();
      const cookies = await context.browserContext.cookies();

      // Extract all JWTs
      const allEntries: { key: string; value: string; source: 'local' | 'session' | 'cookie' }[] = [
        ...lsEntries.map(e => ({ ...e, source: 'local' as const })),
        ...ssEntries.map(e => ({ ...e, source: 'session' as const })),
        ...cookies.map(c => ({ key: c.name, value: c.value, source: 'cookie' as const })),
      ];

      let jwtPayload: Record<string, unknown> | undefined;
      let jwtHeader: Record<string, unknown> | undefined;
      let jwtExpiresAt: string | undefined;
      let sessionToken: string | undefined;

      for (const entry of allEntries) {
        const value = entry.value.trim();
        if (JwtStrategy.JWT_PATTERN.test(value)) {
          sessionToken = value;
          const parts = value.split('.');
          if (parts.length >= 2) {
            try {
              jwtHeader = JSON.parse(atob(parts[0]));
            } catch { /* invalid base64 */ }
            try {
              jwtPayload = JSON.parse(atob(parts[1]));
              if (typeof jwtPayload.exp === 'number') {
                jwtExpiresAt = new Date(jwtPayload.exp * 1000).toISOString();
              }
            } catch { /* invalid base64 */ }
          }
          break;
        }
      }

      return {
        method: this.method,
        success: !!sessionToken,
        sessionToken,
        jwtPayload,
        jwtHeader,
        jwtExpiresAt,
        authCookies: cookies,
        authLocalStorage: lsEntries,
        authSessionStorage: ssEntries,
        timestamp,
      };
    } catch (err) {
      return {
        method: this.method,
        success: false,
        errorMessage: err instanceof Error ? err.message : 'JWT extraction failed',
        authCookies: [],
        authLocalStorage: [],
        authSessionStorage: [],
        timestamp,
      };
    }
  }

  async validate(context: AuthContext, result: AuthResult): Promise<boolean> {
    if (!result.sessionToken) return false;
    // Check if token is not expired
    if (result.jwtExpiresAt) {
      return new Date(result.jwtExpiresAt) > new Date();
    }
    return true;
  }
}

// ═══════════════════════════════════════════════════════════════
// Cookie Strategy
// ═══════════════════════════════════════════════════════════════

/**
 * Detects session cookies and authentication via cookie-based sessions.
 */
export class CookieStrategy implements AuthStrategy {
  readonly id = 'cookie';
  readonly name = 'Cookie-based Session';
  readonly method = AuthMethod.Cookie;

  private static readonly AUTH_COOKIE_PATTERNS = [
    /session/i,
    /sid/i,
    /connect\.sid/i,
    /jsessionid/i,
    /phpsessid/i,
    /asp\.net_sessionid/i,
    /_session_id/i,
    /auth/i,
    /token/i,
  ];

  async detect(context: AuthContext): Promise<AuthDetectionResult> {
    try {
      const cookies = await context.browserContext.cookies();
      const authCookies = cookies.filter(c =>
        CookieStrategy.AUTH_COOKIE_PATTERNS.some(p => p.test(c.name)),
      );

      if (authCookies.length === 0) {
        return { canHandle: false, confidence: 0, evidence: 'No session cookies detected' };
      }

      return {
        canHandle: true,
        confidence: Math.min(0.9, 0.3 * authCookies.length),
        evidence: `Found ${authCookies.length} session cookie(s): ${authCookies.map(c => c.name).join(', ')}`,
      };
    } catch {
      return { canHandle: false, confidence: 0, evidence: 'Cookie detection failed' };
    }
  }

  async execute(context: AuthContext): Promise<AuthResult> {
    const timestamp = new Date().toISOString();
    try {
      const cookies = await context.browserContext.cookies();
      const lsEntries = await context.browserContext.localStorage();
      const ssEntries = await context.browserContext.sessionStorage();

      return {
        method: this.method,
        success: cookies.length > 0,
        sessionToken: cookies.find(c => /session/i.test(c.name))?.value,
        authCookies: cookies,
        authLocalStorage: lsEntries,
        authSessionStorage: ssEntries,
        timestamp,
      };
    } catch (err) {
      return {
        method: this.method,
        success: false,
        errorMessage: err instanceof Error ? err.message : 'Cookie extraction failed',
        authCookies: [],
        authLocalStorage: [],
        authSessionStorage: [],
        timestamp,
      };
    }
  }

  async validate(context: AuthContext, result: AuthResult): Promise<boolean> {
    return result.authCookies.length > 0;
  }
}

// ═══════════════════════════════════════════════════════════════
// CSRF Detection Strategy
// ═══════════════════════════════════════════════════════════════

/**
 * Detects CSRF protection mechanisms.
 * This is a supplementary strategy — it doesn't authenticate but detects CSRF tokens.
 */
export class CsrfDetectionStrategy implements AuthStrategy {
  readonly id = 'csrf_detection';
  readonly name = 'CSRF Detection';
  readonly method = AuthMethod.None;

  private static readonly CSRF_PATTERNS = [
    'csrf', 'csrf_token', '_token', '_csrf', 'csrfmiddlewaretoken',
    'anticsrf', 'x-csrf-token', '__RequestVerificationToken',
    'authenticity_token',
  ];

  async detect(context: AuthContext): Promise<AuthDetectionResult> {
    try {
      const page = context.page;
      const csrfSelectors = CsrfDetectionStrategy.CSRF_PATTERNS
        .map(p => `input[name*="${p}"], meta[name*="${p}"], input[name="${p}"], meta[name="${p}"]`)
        .join(', ');

      const elements = await page.querySelectorAll(csrfSelectors);
      const hasCsrf = elements.length > 0;

      // Also check headers in meta tags
      const metaCsrf = await page.evaluate(() => {
        const metas = document.querySelectorAll('meta[http-equiv], meta[name*="csrf"], meta[name*="token"]');
        return Array.from(metas).map(m => ({
          name: m.getAttribute('name') ?? m.getAttribute('http-equiv') ?? '',
          content: m.getAttribute('content') ?? '',
        })).filter(m => m.content);
      });

      return {
        canHandle: hasCsrf || metaCsrf.length > 0,
        confidence: (hasCsrf || metaCsrf.length > 0) ? 0.95 : 0,
        evidence: [
          hasCsrf ? `${elements.length} CSRF input field(s) found` : '',
          metaCsrf.length > 0 ? `${metaCsrf.length} CSRF meta tag(s) found` : '',
        ].filter(Boolean).join('; ') || 'No CSRF protection detected',
      };
    } catch {
      return { canHandle: false, confidence: 0, evidence: 'CSRF detection failed' };
    }
  }

  async execute(context: AuthContext): Promise<AuthResult> {
    const timestamp = new Date().toISOString();
    try {
      const page = context.page;
      const csrfSelectors = CsrfDetectionStrategy.CSRF_PATTERNS
        .map(p => `input[name*="${p}"], input[name="${p}"]`)
        .join(', ');

      const elements = await page.querySelectorAll(csrfSelectors);
      const csrfTokens: { token: string; fieldName: string; formAction?: string }[] = [];

      for (const el of elements) {
        const token = await el.getAttribute('value');
        const fieldName = await el.getAttribute('name');
        if (token && fieldName) {
          // Try to find parent form action
          const formAction = await el.evaluate((element) => {
            let parent = element.parentElement;
            while (parent && parent.tagName !== 'FORM') {
              parent = parent.parentElement;
            }
            return (parent as HTMLFormElement | null)?.action ?? undefined;
          });
          csrfTokens.push({ token, fieldName, formAction });
        }
      }

      return {
        method: AuthMethod.None,
        success: csrfTokens.length > 0,
        csrfToken: csrfTokens[0]?.token,
        csrfFieldName: csrfTokens[0]?.fieldName,
        authCookies: [],
        authLocalStorage: [],
        authSessionStorage: [],
        timestamp,
      };
    } catch (err) {
      return {
        method: AuthMethod.None,
        success: false,
        errorMessage: err instanceof Error ? err.message : 'CSRF detection failed',
        authCookies: [],
        authLocalStorage: [],
        authSessionStorage: [],
        timestamp,
      };
    }
  }

  async validate(_context: AuthContext, result: AuthResult): Promise<boolean> {
    return !!result.csrfToken;
  }
}

// ═══════════════════════════════════════════════════════════════
// OAuth Strategy (Architectural Stub)
// ═══════════════════════════════════════════════════════════════

/**
 * Architectural stub for OAuth authentication.
 * In production, this would redirect to the OAuth provider and handle the callback.
 */
export class OAuthStrategy implements AuthStrategy {
  readonly id = 'oauth';
  readonly name = 'OAuth 2.0';
  readonly method = AuthMethod.Oauth;

  async detect(context: AuthContext): Promise<AuthDetectionResult> {
    try {
      const html = await context.page.content();
      const hasOAuthLinks = /authorize|oauth|auth\/callback|oauth2/i.test(html);
      const hasOAuthMeta = /meta.*oauth/i.test(html);
      return {
        canHandle: hasOAuthLinks || hasOAuthMeta,
        confidence: (hasOAuthLinks || hasOAuthMeta) ? 0.6 : 0,
        evidence: hasOAuthLinks ? 'OAuth-related links or endpoints detected' : 'No OAuth indicators found',
      };
    } catch {
      return { canHandle: false, confidence: 0, evidence: 'OAuth detection failed' };
    }
  }

  async execute(context: AuthContext): Promise<AuthResult> {
    const timestamp = new Date().toISOString();
    try {
      // Detect OAuth URLs
      const oauthUrls = await context.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="oauth"], a[href*="authorize"], a[href*="auth/callback"]'));
        return links.map(a => (a as HTMLAnchorElement).href);
      });

      return {
        method: this.method,
        success: oauthUrls.length > 0,
        oauthUrl: oauthUrls[0],
        authCookies: await context.browserContext.cookies(),
        authLocalStorage: await context.browserContext.localStorage(),
        authSessionStorage: await context.browserContext.sessionStorage(),
        timestamp,
      };
    } catch (err) {
      return {
        method: this.method,
        success: false,
        errorMessage: err instanceof Error ? err.message : 'OAuth detection failed',
        authCookies: [],
        authLocalStorage: [],
        authSessionStorage: [],
        timestamp,
      };
    }
  }

  async validate(_context: AuthContext, result: AuthResult): Promise<boolean> {
    return !!result.oauthUrl;
  }
}

// ═══════════════════════════════════════════════════════════════
// OpenID Connect Strategy (Architectural Stub)
// ═══════════════════════════════════════════════════════════════

/**
 * Architectural stub for OpenID Connect.
 * Extends OAuth with ID token verification and discovery.
 */
export class OpenIdConnectStrategy implements AuthStrategy {
  readonly id = 'openid_connect';
  readonly name = 'OpenID Connect';
  readonly method = AuthMethod.OpenIdConnect;

  async detect(context: AuthContext): Promise<AuthDetectionResult> {
    try {
      const html = await context.page.content();
      const hasOidc = /openid|\.well-known\/openid-configuration|id_token/i.test(html);
      return {
        canHandle: hasOidc,
        confidence: hasOidc ? 0.7 : 0,
        evidence: hasOidc ? 'OpenID Connect indicators detected' : 'No OIDC indicators found',
      };
    } catch {
      return { canHandle: false, confidence: 0, evidence: 'OIDC detection failed' };
    }
  }

  async execute(context: AuthContext): Promise<AuthResult> {
    const timestamp = new Date().toISOString();
    return {
      method: this.method,
      success: false,
      errorMessage: 'OpenID Connect requires interactive flow — architectural stub',
      authCookies: await context.browserContext.cookies(),
      authLocalStorage: await context.browserContext.localStorage(),
      authSessionStorage: await context.browserContext.sessionStorage(),
      timestamp,
    };
  }

  async validate(_context: AuthContext, result: AuthResult): Promise<boolean> {
    return result.success;
  }
}

// ═══════════════════════════════════════════════════════════════
// MFA Extension Point
// ═══════════════════════════════════════════════════════════════

/**
 * MFA Extension Point — detects MFA challenges and provides hook for custom handlers.
 * This is an extension point, not a full strategy.
 */
export class MfaExtensionPoint implements AuthStrategy {
  readonly id = 'mfa_extension';
  readonly name = 'MFA Extension Point';
  readonly method = AuthMethod.Mfa;

  async detect(context: AuthContext): Promise<AuthDetectionResult> {
    try {
      const html = await context.page.content();
      // Common MFA indicators
      const mfaPatterns = [
        /two.?factor/i,
        /2fa/i,
        /mfa/i,
        /verification.?code/i,
        /otp/i,
        /totp/i,
        /authenticator/i,
        /sms.?code/i,
        /one.?time.?password/i,
      ];

      const detected: string[] = [];
      for (const pattern of mfaPatterns) {
        if (pattern.test(html)) {
          detected.push(pattern.source.replace(/\\/g, ''));
        }
      }

      // Look for MFA input fields
      const mfaInputs = await context.page.querySelectorAll(
        'input[name*="code"], input[name*="otp"], input[name*="token"], input[inputmode="numeric"][maxlength="6"]',
      );

      if (detected.length > 0 || mfaInputs.length > 0) {
        const mfaType = detected.find(d => /totp/i.test(d)) ? 'totp'
          : detected.find(d => /sms/i.test(d)) ? 'sms'
          : detected.find(d => /email/i.test(d)) ? 'email'
          : 'unknown';

        return {
          canHandle: true,
          confidence: 0.85,
          evidence: [
            ...detected.map(d => `Pattern: ${d}`),
            mfaInputs.length > 0 ? `${mfaInputs.length} MFA input(s) found` : '',
          ].filter(Boolean).join('; '),
        };
      }

      return { canHandle: false, confidence: 0, evidence: 'No MFA challenge detected' };
    } catch {
      return { canHandle: false, confidence: 0, evidence: 'MFA detection failed' };
    }
  }

  async execute(context: AuthContext): Promise<AuthResult> {
    const timestamp = new Date().toISOString();
    return {
      method: this.method,
      success: false,
      mfaType: 'unknown',
      mfaExtensionId: this.id,
      errorMessage: 'MFA requires interactive handler — extension point',
      authCookies: await context.browserContext.cookies(),
      authLocalStorage: await context.browserContext.localStorage(),
      authSessionStorage: await context.browserContext.sessionStorage(),
      timestamp,
    };
  }

  async validate(_context: AuthContext, result: AuthResult): Promise<boolean> {
    return !!result.mfaExtensionId;
  }
}

// ═══════════════════════════════════════════════════════════════
// Authentication Intelligence Coordinator
// ═══════════════════════════════════════════════════════════════

/** Configuration for the Authentication Intelligence coordinator. */
export interface AuthIntelligenceConfig {
  /** Strategy ID to use (or 'auto' for detection). Default: 'auto'. */
  readonly strategyId?: string;
  /** Maximum time for auth in ms. Default: 30000. */
  readonly timeoutMs?: number;
}

/**
 * Coordinates authentication detection and execution.
 * Runs all strategies, picks the best one, and executes.
 */
export class AuthenticationIntelligence {
  private readonly strategies: Map<string, AuthStrategy>;
  private readonly config: AuthIntelligenceConfig;

  constructor(config: AuthIntelligenceConfig = {}) {
    this.config = config;
    this.strategies = new Map();
    // Register default strategies
    this.register(new LoginFormStrategy());
    this.register(new JwtStrategy());
    this.register(new CookieStrategy());
    this.register(new CsrfDetectionStrategy());
    this.register(new OAuthStrategy());
    this.register(new OpenIdConnectStrategy());
    this.register(new MfaExtensionPoint());
  }

  /** Register a custom strategy. */
  register(strategy: AuthStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  /** Get a strategy by ID. */
  getStrategy(id: string): AuthStrategy | undefined {
    return this.strategies.get(id);
  }

  /** Get all registered strategies. */
  getAllStrategies(): readonly AuthStrategy[] {
    return [...this.strategies.values()];
  }

  /**
   * Run authentication detection across all strategies.
   * Returns the best detection result.
   */
  async detectBestStrategy(context: AuthContext): Promise<{ strategy: AuthStrategy; detection: AuthDetectionResult } | null> {
    let best: { strategy: AuthStrategy; detection: AuthDetectionResult } | null = null;

    for (const strategy of this.strategies.values()) {
      // Skip CSRF detection as a primary strategy
      if (strategy.id === 'csrf_detection') continue;

      const detection = await strategy.detect(context);
      if (detection.canHandle && (!best || detection.confidence > best.detection.confidence)) {
        best = { strategy, detection };
      }
    }

    return best;
  }

  /**
   * Execute the full authentication flow:
   * 1. Detect the best strategy (or use configured one)
   * 2. Execute the strategy
   * 3. Validate the result
   * 4. Also run CSRF detection (supplementary)
   */
  async execute(context: AuthContext): Promise<AuthResult> {
    let strategy: AuthStrategy;

    if (this.config.strategyId && this.config.strategyId !== 'auto') {
      const selected = this.strategies.get(this.config.strategyId);
      if (!selected) {
        return this.createErrorResult(`Strategy not found: ${this.config.strategyId}`);
      }
      strategy = selected;
    } else {
      const best = await this.detectBestStrategy(context);
      if (!best) {
        // No auth detected — return a "none" result
        const cookies = await context.browserContext.cookies().catch(() => []);
        const ls = await context.browserContext.localStorage().catch(() => []);
        const ss = await context.browserContext.sessionStorage().catch(() => []);
        return {
          method: AuthMethod.None,
          success: true,
          authCookies: cookies,
          authLocalStorage: ls,
          authSessionStorage: ss,
          timestamp: new Date().toISOString(),
        };
      }
      strategy = best.strategy;
    }

    // Execute the selected strategy
    const result = await strategy.execute(context);

    // Validate
    if (result.success) {
      const isValid = await strategy.validate(context, result).catch(() => false);
      if (!isValid) {
        return { ...result, success: false, errorMessage: 'Authentication validation failed' };
      }
    }

    // Run CSRF detection as supplementary
    const csrfStrategy = this.strategies.get('csrf_detection');
    if (csrfStrategy && !result.csrfToken) {
      const csrfResult = await csrfStrategy.execute(context);
      if (csrfResult.csrfToken) {
        return { ...result, csrfToken: csrfResult.csrfToken, csrfFieldName: csrfResult.csrfFieldName };
      }
    }

    return result;
  }

  private createErrorResult(message: string): AuthResult {
    return {
      method: AuthMethod.None,
      success: false,
      errorMessage: message,
      authCookies: [],
      authLocalStorage: [],
      authSessionStorage: [],
      timestamp: new Date().toISOString(),
    };
  }
}