/**
 * Browser Intelligence Engine — DOM Snapshot Engine
 *
 * Extracts structured intelligence from the DOM:
 * - Forms with all inputs (including hidden, password, file)
 * - Buttons (standalone, not in forms)
 * - CSRF tokens
 * - Dynamic elements (injected via JS)
 * - Shadow DOM hosts and contents
 * - Iframes (cross-origin detection)
 * - Custom elements (web components)
 * - Meta tags (robots, canonical, OG, description)
 */

import type {
  DomSnapshot,
  FormElement,
  InputElement,
  ButtonElement,
  DynamicElement,
  ShadowDomHost,
  IframeInfo,
  CustomElement,
  InputType,
  IPageController,
  IElementHandle,
} from './browser-types.ts';

// ═══════════════════════════════════════════════════════════════
// DOM Snapshot Engine
// ═══════════════════════════════════════════════════════════════

/** Configuration for DOM snapshot. */
export interface DomSnapshotConfig {
  /** Whether to traverse shadow DOM. Default: true. */
  readonly traverseShadowDom: boolean;
  /** Whether to analyze iframes. Default: true. */
  readonly analyzeIframes: boolean;
  /** Maximum number of elements to extract per category. 0 = unlimited. */
  readonly maxElementsPerCategory: number;
  /** Whether to extract CSS selectors. Default: true. */
  readonly extractSelectors: boolean;
}

/** Default DOM snapshot configuration. */
export const DEFAULT_DOM_SNAPSHOT_CONFIG: DomSnapshotConfig = {
  traverseShadowDom: true,
  analyzeIframes: true,
  maxElementsPerCategory: 0,
  extractSelectors: true,
};

/**
 * DOM Snapshot Engine.
 *
 * Extracts all meaningful data from a page's DOM in a single pass.
 * Uses IPageController for testability (no Playwright dependency).
 */
export class DomSnapshotEngine {
  private readonly config: DomSnapshotConfig;

  constructor(config?: Partial<DomSnapshotConfig>) {
    this.config = { ...DEFAULT_DOM_SNAPSHOT_CONFIG, ...config };
  }

  /**
   * Take a complete DOM snapshot of the current page.
   */
  async snapshot(page: IPageController, pageUrl: string): Promise<DomSnapshot> {
    const timestamp = new Date().toISOString();
    const title = await page.title().catch(() => '');
    const html = await page.content().catch(() => '');

    // Extract all data in parallel where possible
    const [forms, buttons, dynamicElements, shadowDomHosts, iframes, customElements, metaInfo] = await Promise.all([
      this.extractForms(page, pageUrl),
      this.extractButtons(page),
      this.extractDynamicElements(page),
      this.config.traverseShadowDom ? this.extractShadowDomHosts(page) : Promise.resolve([]),
      this.config.analyzeIframes ? this.extractIframes(page, pageUrl) : Promise.resolve([]),
      this.extractCustomElements(page),
      this.extractMetaInfo(page),
    ]);

    // Collect hidden fields and CSRF tokens across all forms
    const hiddenFields: InputElement[] = [];
    const csrfTokens: DomSnapshot['csrfTokens'] = [];
    for (const form of forms) {
      hiddenFields.push(...form.inputs.filter(i => i.type === 'hidden'));
      if (form.csrfToken) {
        csrfTokens.push({
          token: form.csrfToken,
          fieldName: form.csrfFieldName ?? '',
          formAction: form.action || undefined,
        });
      }
    }

    // Count total elements
    const totalElements = await page.evaluate(() => document.querySelectorAll('*').length).catch(() => 0);

    return {
      pageUrl,
      title,
      forms,
      buttons,
      dynamicElements,
      shadowDomHosts,
      iframes,
      customElements,
      hiddenFields,
      csrfTokens,
      totalElements,
      timestamp,
      isNoIndex: metaInfo.isNoIndex,
      canonicalUrl: metaInfo.canonicalUrl,
      openGraph: metaInfo.openGraph,
      metaDescription: metaInfo.metaDescription,
    };
  }

  // ─── Form Extraction ──────────────────────────────────────

  private async extractForms(page: IPageController, pageUrl: string): Promise<FormElement[]> {
    const formElements = await page.querySelectorAll('form');
    const results: FormElement[] = [];

    for (const form of formElements) {
      if (this.isLimitReached(results.length)) break;

      try {
        const action = (await form.getAttribute('action')) ?? pageUrl;
        const method = ((await form.getAttribute('method')) ?? 'GET').toUpperCase() as 'GET' | 'POST';
        const enctype = (await form.getAttribute('enctype')) ?? 'application/x-www-form-urlencoded';
        const formId = await form.getAttribute('id');
        const selector = await this.buildSelector(form, 'form', formId);

        // Extract inputs
        const inputs = await this.extractFormInputs(form);

        // Check for file upload
        const hasFileUpload = inputs.some(i => i.type === 'file');
        // Check for CAPTCHA
        const html = await form.outerHTML();
        const hasCaptcha = /captcha|recaptcha|g-recaptcha|h-captcha|cf-turnstile/i.test(html);
        // Check for password
        const hasPassword = inputs.some(i => i.type === 'password');
        // Check for hidden fields
        const hiddenFieldNames = inputs.filter(i => i.type === 'hidden').map(i => i.name);
        const hasHiddenFields = hiddenFieldNames.length > 0;

        // Find CSRF token
        let csrfToken: string | undefined;
        let csrfFieldName: string | undefined;
        const csrfPatterns = ['csrf', '_token', 'csrf_token', 'csrfmiddlewaretoken', '__RequestVerificationToken', 'authenticity_token'];
        for (const input of inputs) {
          if (input.type === 'hidden' && csrfPatterns.some(p => input.name.toLowerCase().includes(p.toLowerCase()))) {
            csrfToken = input.value;
            csrfFieldName = input.name;
            break;
          }
        }

        // Find submit button
        let submitButtonSelector: string | undefined;
        const submitBtn = await form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
        if (submitBtn) {
          submitButtonSelector = await this.buildSelector(submitBtn, 'button', await submitBtn.getAttribute('id'));
        }

        results.push({
          id: formId ?? undefined,
          action,
          method,
          enctype,
          inputs,
          hasFileUpload,
          hasCaptcha,
          hasPassword,
          hasHiddenFields,
          hiddenFieldNames,
          csrfToken,
          csrfFieldName,
          submitButtonSelector,
          pageUrl,
          selector,
        });
      } catch {
        // Skip malformed forms
      }
    }

    return results;
  }

  private async extractFormInputs(form: IElementHandle): Promise<InputElement[]> {
    const inputElements = await form.querySelectorAll(
      'input, select, textarea, [contenteditable="true"]',
    );

    const inputs: InputElement[] = [];
    for (const input of inputElements) {
      try {
        const tagName = (await input.tagName()).toLowerCase();
        const inputType = await this.resolveInputType(input, tagName);
        const name = (await input.getAttribute('name')) ?? '';
        const id = await input.getAttribute('id');
        const placeholder = await input.getAttribute('placeholder');
        const value = await input.getAttribute('value');
        const required = (await input.getAttribute('required')) !== null;
        const readonly = (await input.getAttribute('readonly')) !== null;
        const disabled = (await input.getAttribute('disabled')) !== null;
        const pattern = await input.getAttribute('pattern');
        const minLength = await input.getAttribute('minlength');
        const maxLength = await input.getAttribute('maxlength');
        const min = await input.getAttribute('min');
        const max = await input.getAttribute('max');
        const step = await input.getAttribute('step');
        const autocomplete = await input.getAttribute('autocomplete');
        const accept = await input.getAttribute('accept');
        const multiple = (await input.getAttribute('multiple')) !== null;

        // Get label
        const label = await input.evaluate(el => {
          const inputEl = el as HTMLElement;
          if (inputEl.id) {
            const labelEl = document.querySelector(`label[for="${inputEl.id}"]`);
            return labelEl?.textContent?.trim() ?? undefined;
          }
          // Try parent label
          const parentLabel = inputEl.closest('label');
          return parentLabel?.textContent?.trim()?.slice(0, 100) ?? undefined;
        });

        const ariaLabel = await input.getAttribute('aria-label');
        const selector = await this.buildSelector(input, tagName, id);

        inputs.push({
          name,
          type: inputType,
          id: id ?? undefined,
          placeholder: placeholder ?? undefined,
          value: value ?? undefined,
          required,
          readonly,
          disabled,
          pattern: pattern ?? undefined,
          minLength: minLength ? parseInt(minLength, 10) : undefined,
          maxLength: maxLength ? parseInt(maxLength, 10) : undefined,
          min: min ?? undefined,
          max: max ?? undefined,
          step: step ?? undefined,
          autocomplete: autocomplete ?? undefined,
          accept: accept ?? undefined,
          multiple,
          label,
          ariaLabel: ariaLabel ?? undefined,
          selector,
        });
      } catch {
        // Skip malformed inputs
      }
    }

    return inputs;
  }

  private async resolveInputType(el: IElementHandle, tagName: string): Promise<InputType> {
    if (tagName === 'select') return 'select';
    if (tagName === 'textarea') return 'textarea';
    if (tagName !== 'input') {
      const ce = await el.getAttribute('contenteditable');
      return ce === 'true' ? 'contenteditable' : 'custom';
    }
    const type = (await el.getAttribute('type')) ?? 'text';
    const validTypes: InputType[] = [
      'text', 'password', 'email', 'number', 'tel', 'url', 'search',
      'date', 'datetime-local', 'time', 'month', 'week', 'color', 'range',
      'file', 'hidden', 'checkbox', 'radio', 'submit', 'button', 'reset', 'image',
    ];
    return validTypes.includes(type as InputType) ? (type as InputType) : 'custom';
  }

  // ─── Button Extraction ────────────────────────────────────

  private async extractButtons(page: IPageController): Promise<ButtonElement[]> {
    const buttons = await page.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]');
    const results: ButtonElement[] = [];

    // Skip buttons inside forms (they're already captured there)
    const formButtons = new Set<string>();
    const forms = await page.querySelectorAll('form');
    for (const form of forms) {
      const formBtns = await form.querySelectorAll('button, input[type="button"], input[type="submit"]');
      for (const btn of formBtns) {
        const selector = await this.buildSelector(btn, 'button', await btn.getAttribute('id'));
        formButtons.add(selector);
      }
    }

    for (const btn of buttons) {
      if (this.isLimitReached(results.length)) break;
      try {
        const selector = await this.buildSelector(btn, 'button', await btn.getAttribute('id'));
        if (formButtons.has(selector)) continue;

        const text = (await btn.textContent())?.trim() ?? '';
        const type = (await btn.getAttribute('type')) ?? 'button';
        const id = await btn.getAttribute('id');
        const name = await btn.getAttribute('name');
        const disabled = (await btn.getAttribute('disabled')) !== null;
        const formAction = await btn.getAttribute('formaction');

        if (text) {
          results.push({ text, type, id: id ?? undefined, name: name ?? undefined, disabled, selector, formAction: formAction ?? undefined });
        }
      } catch {
        // Skip
      }
    }

    return results;
  }

  // ─── Dynamic Element Detection ────────────────────────────

  private async extractDynamicElements(page: IPageController): Promise<DynamicElement[]> {
    // Elements with data-* attributes that suggest dynamic behavior
    const dynamicSelectors = [
      '[data-testid]',
      '[data-reactroot]',
      '[data-v-]',
      '[data-id]',
      '[ng-if]',
      '[ng-show]',
      '[ng-hide]',
      '[v-if]',
      '[v-show]',
      '[v-for]',
      '[x-data]',
      '[hx-get]',
      '[hx-post]',
    ].join(', ');

    const elements = await page.querySelectorAll(dynamicSelectors);
    const results: DynamicElement[] = [];

    for (const el of elements) {
      if (this.isLimitReached(results.length)) break;
      try {
        const tag = (await el.tagName()).toLowerCase();
        const id = await el.getAttribute('id');
        const className = await el.getAttribute('class');
        const text = (await el.textContent())?.trim().slice(0, 100) ?? undefined;
        const selector = await this.buildSelector(el, tag, id);

        results.push({
          tag,
          id: id ?? undefined,
          className: className ?? undefined,
          text,
          selector,
          appearedAt: new Date().toISOString(),
          trigger: 'page_load',
        });
      } catch {
        // Skip
      }
    }

    return results;
  }

  // ─── Shadow DOM Extraction ────────────────────────────────

  private async extractShadowDomHosts(page: IPageController): Promise<ShadowDomHost[]> {
    const hosts: ShadowDomHost[] = [];

    try {
      const hostData = await page.evaluate(() => {
        const results: { tag: string; selector: string; mode: string; childCount: number; hasForms: boolean; hasInputs: boolean; hasScripts: boolean }[] = [];
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          const shadowRoot = (el as HTMLElement).shadowRoot;
          if (shadowRoot) {
            results.push({
              tag: el.tagName.toLowerCase(),
              selector: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
              mode: 'open',  // Only open shadow roots are accessible
              childCount: shadowRoot.querySelectorAll('*').length,
              hasForms: shadowRoot.querySelectorAll('form').length > 0,
              hasInputs: shadowRoot.querySelectorAll('input, select, textarea').length > 0,
              hasScripts: shadowRoot.querySelectorAll('script').length > 0,
            });
          }
        }
        return results;
      });

      for (const data of hostData) {
        hosts.push({
          ...data,
          mode: data.mode as 'open' | 'closed',
        });
      }
    } catch {
      // Shadow DOM evaluation failed
    }

    return hosts;
  }

  // ─── Iframe Extraction ────────────────────────────────────

  private async extractIframes(page: IPageController, pageUrl: string): Promise<IframeInfo[]> {
    const iframes = await page.querySelectorAll('iframe, frame');
    const results: IframeInfo[] = [];

    for (const iframe of iframes) {
      if (this.isLimitReached(results.length)) break;
      try {
        const src = await iframe.getAttribute('src');
        const id = await iframe.getAttribute('id');
        const name = await iframe.getAttribute('name');
        const sandbox = await iframe.getAttribute('sandbox');
        const allow = await iframe.getAttribute('allow');
        const selector = await this.buildSelector(iframe, 'iframe', id);

        let isCrossOrigin = false;
        if (src) {
          try {
            const iframeUrl = new URL(src, pageUrl);
            const pageHostname = new URL(pageUrl).hostname;
            isCrossOrigin = iframeUrl.hostname !== pageHostname;
          } catch {
            isCrossOrigin = true;
          }
        }

        results.push({
          src: src ?? undefined,
          id: id ?? undefined,
          name: name ?? undefined,
          sandbox: sandbox ?? undefined,
          allow: allow ?? undefined,
          selector,
          isCrossOrigin,
          isAccessible: !isCrossOrigin,
        });
      } catch {
        // Skip
      }
    }

    return results;
  }

  // ─── Custom Element Extraction ────────────────────────────

  private async extractCustomElements(page: IPageController): Promise<CustomElement[]> {
    const customElements: CustomElement[] = [];

    try {
      const data = await page.evaluate(() => {
        const results: { tagName: string; selector: string; observedAttributes: string[]; hasShadowRoot: boolean; isConnected: boolean }[] = [];
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          const tag = el.tagName.toLowerCase();
          if (tag.includes('-')) {
            // Custom elements must contain a hyphen
            const customEl = el as any;
            results.push({
              tagName: tag,
              selector: el.id ? `#${el.id}` : tag,
              observedAttributes: Array.isArray(customEl.observedAttributes) ? customEl.observedAttributes : [],
              hasShadowRoot: !!el.shadowRoot,
              isConnected: el.isConnected,
            });
          }
        }
        return results;
      });

      for (const item of data) {
        customElements.push(item);
      }
    } catch {
      // Custom element detection failed
    }

    return customElements;
  }

  // ─── Meta Information ─────────────────────────────────────

  private async extractMetaInfo(page: IPageController): Promise<{
    isNoIndex: boolean;
    canonicalUrl?: string;
    openGraph: Map<string, string>;
    metaDescription?: string;
  }> {
    return page.evaluate(() => {
      const isNoIndex = (
        document.querySelector('meta[name="robots"][content*="noindex"]') !== null ||
        document.querySelector('meta[name="robots"][content*="none"]') !== null
      );

      const canonicalEl = document.querySelector('link[rel="canonical"]');
      const canonicalUrl = canonicalEl ? (canonicalEl as HTMLLinkElement).href : undefined;

      const openGraph = new Map<string, string>();
      document.querySelectorAll('meta[property^="og:"]').forEach(meta => {
        const property = meta.getAttribute('property') ?? '';
        const content = meta.getAttribute('content') ?? '';
        if (property && content) openGraph.set(property, content);
      });

      const descEl = document.querySelector('meta[name="description"]');
      const metaDescription = descEl ? (descEl as HTMLMetaElement).content : undefined;

      return { isNoIndex, canonicalUrl, openGraph, metaDescription };
    });
  }

  // ─── Helpers ──────────────────────────────────────────────

  private async buildSelector(el: IElementHandle, tag: string, id: string | null): Promise<string> {
    if (!this.config.extractSelectors) return `${tag}`;
    if (id) return `#${id}`;
    // Try name attribute
    const name = await el.getAttribute('name');
    if (name) return `${tag}[name="${name}"]`;
    return tag;
  }

  private isLimitReached(count: number): boolean {
    return this.config.maxElementsPerCategory > 0 && count >= this.config.maxElementsPerCategory;
  }
}