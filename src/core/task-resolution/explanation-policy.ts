/**
 * Task Resolution — Explanation Policy
 * TASK-AIS-TASK-RESOLUTION-SLICE-001 §9-§11
 *
 * AIS MUST NOT always explain. The explanation level is adaptive with a
 * strict priority order (task §9):
 *
 *   1. explicit user preference   → respected ALWAYS (none/short/detailed)
 *   2. contextual adaptation      → short ONLY when explanation is useful
 *   3. AIS default                → none (silence when nothing non-obvious)
 *
 * DETAILED is never selected adaptively — it is reachable only by explicit
 * request (task §10: "only when requested or justified").
 *
 * Human-facing rules (task §10/§11):
 *   - Messages are composed from FIXED templates keyed by deterministic
 *     reason codes. No single hard-coded mandatory phrase (§10), and no
 *     implementation jargon (§11): never model/provider names, tool counts,
 *     file paths, or raw prompts — meaning, not machinery.
 *   - Language follows the user's intent (Cyrillic → ru, else en).
 *   - The §10 pattern ("Я подготовил всё необходимое. [короткое объяснение —
 *     только если полезно].") is the lead-in + reason-sentence composition,
 *     not a fixed string.
 *
 * All strings are static vocabulary → sanitized by construction (§22).
 */

import type {
  ExplanationMode,
  ExplanationReasonCode,
  TaskResolutionExplanation,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════
// LANGUAGE
// ═══════════════════════════════════════════════════════════════════

export type MessageLanguage = 'ru' | 'en';

const CYRILLIC = /[\u0400-\u04FF]/;

/** Deterministic language detection from the user's intent text. */
export function detectLanguage(intent: string): MessageLanguage {
  return CYRILLIC.test(intent) ? 'ru' : 'en';
}

// ═══════════════════════════════════════════════════════════════════
// TEMPLATES (static vocabulary — meaning-focused, §11 GOOD examples)
// ═══════════════════════════════════════════════════════════════════

const LEAD_IN: Record<MessageLanguage, string> = {
  ru: 'Я подготовил всё необходимое.',
  en: 'Everything is prepared.',
};

const REASON_SENTENCES: Record<ExplanationReasonCode, Record<MessageLanguage, string>> = {
  'related-context': {
    ru: 'Сначала проверю связанные части проекта, чтобы ответ не основывался только на месте возникновения ошибки.',
    en: 'I will first check the related parts of the project so the answer does not rely only on the place where the problem appears.',
  },
  'ambiguous-target': {
    ru: 'Пока не до конца ясно, о каком месте проекта речь, поэтому отвечу по проекту в целом; если важно конкретное место — покажи его.',
    en: 'It is not yet clear which part of the project you mean, so I will answer based on the project as a whole; if a specific place matters, show me where.',
  },
  'history-grounded': {
    ru: 'Ответ будет опираться на сохранённую историю работы над проектом.',
    en: 'The answer will take the project’s saved working history into account.',
  },
  'history-absent': {
    ru: 'Сохранённой истории по этому проекту пока нет — отвечу по текущему состоянию, ничего не выдумывая.',
    en: 'There is no saved history for this project yet — I will answer from its current state without inventing anything.',
  },
  'degraded': {
    ru: 'Подготовить полный контекст не получилось, поэтому продолжаю с минимальной безопасной подготовкой.',
    en: 'Full preparation was not possible, so I am continuing with minimal safe preparation.',
  },
};

const DETAILED_PREFIX: Record<MessageLanguage, string> = {
  ru: 'Что подготовлено:',
  en: 'What was prepared:',
};

/** Deterministic order for reason sentences (stability over variety). */
const REASON_ORDER: readonly ExplanationReasonCode[] = [
  'degraded',
  'ambiguous-target',
  'related-context',
  'history-absent',
  'history-grounded',
];

// ═══════════════════════════════════════════════════════════════════
// POLICY
// ═══════════════════════════════════════════════════════════════════

export interface ExplanationSituation {
  /** Priority 1 — explicit user preference, when given. */
  readonly preference?: ExplanationMode;
  /** Priority 2 — deterministic reason codes describing the situation. */
  readonly reasons: readonly ExplanationReasonCode[];
  /** Human requirement statements for the DETAILED composition. */
  readonly requirements: readonly string[];
  readonly language: MessageLanguage;
}

/**
 * Resolve the explanation for a situation.
 *
 * Adaptive rule (priority 2/3): short when at least one reason code says an
 * explanation materially improves trust/understanding (§9); none otherwise.
 * Explicit preference always wins, including 'detailed'.
 */
export function resolveExplanation(situation: ExplanationSituation): TaskResolutionExplanation {
  const { preference, reasons, requirements, language } = situation;

  const mode: ExplanationMode = preference ?? (reasons.length > 0 ? 'short' : 'none');

  if (mode === 'none') {
    return { mode, message: null };
  }

  const ordered = REASON_ORDER.filter(code => reasons.includes(code));
  const sentences = ordered.map(code => REASON_SENTENCES[code][language]);

  if (mode === 'short') {
    // Concise: lead-in + the situation's reason sentences, nothing more.
    const message = [LEAD_IN[language], ...sentences].join(' ');
    return { mode, message };
  }

  // DETAILED (explicit only): adds what was prepared, in human terms.
  const detailedBody = requirements.length > 0
    ? ` ${DETAILED_PREFIX[language]} ${requirements.join('; ')}.`
    : '';
  const message = [LEAD_IN[language], ...sentences].join(' ') + detailedBody;
  return { mode, message };
}
