/**
 * Wynn Safety Protocol (pure).
 *
 * A deterministic pre-check on user messages before they reach the LLM. When a
 * message indicates a mental-health crisis or an eating-disorder-pattern
 * request, Wynn breaks character and returns a fixed, safe response with
 * region-appropriate resources rather than coaching. Everything here is
 * auditable and tested; the copy mirrors the PRD's Wynn Safety Reference.
 *
 * This is a safety net, not a diagnosis. It errs toward surfacing support.
 */

export interface SafetyFlags {
  crisis: boolean;
  eatingDisorder: boolean;
  medicalDiagnosis: boolean;
  medication: boolean;
}

export type SafetyType = "crisis" | "eating_disorder" | null;

export interface SafetyResult {
  type: SafetyType;
  /** Deterministic message to return to the user, or null to proceed normally. */
  message: string | null;
  flags: SafetyFlags;
}

/** Medical daily-calorie floors (kcal). Below these, intake targets are refused. */
export const CALORIE_FLOOR = { female: 1200, male: 1500, default: 1200 } as const;

// Stems (suicid, anorexi, bulimi, purg) match deliberately, so no trailing \b.
const CRISIS_PATTERN =
  /\b(kill myself|killing myself|suicid|end my life|ending my life|want to die|wanna die|don'?t want to (?:be alive|live)|self[-\s]?harm|harm myself|hurt myself|cut(?:ting)? myself|no reason to live|better off dead)/i;

const ED_PATTERN =
  /\b(anorexi|bulimi|purg(?:e|ing)|make myself (?:throw up|vomit)|starv(?:e|ing) myself|stop eating (?:entirely|completely|for)|how (?:little|few) (?:can|should) i eat|i (?:hate|despise) my body)/i;

const DIAGNOSIS_PATTERN =
  /\b(do i have|have i got|is (?:this|it) (?:cancer|diabetes|covid|a (?:tumou?r|disease))|diagnos(?:e|is|ed)|what(?:'s| is) wrong with me)\b/i;

const MEDICATION_PATTERN =
  /\b(should i (?:take|stop|increase|decrease)|how much .* should i take|change my (?:dose|medication|meds)|stop taking my)\b/i;

/**
 * Parse a requested daily-calorie intake target from the message, if the text
 * frames it as something to eat/limit (not calories burned). Returns the number
 * or null.
 */
export function parseCalorieIntakeTarget(text: string): number | null {
  const m = text.match(
    /(?:eat|eating|consume|intake|limit(?:ing)?|stick to|stay under|only (?:eat|have)|cut to|drop to|diet of)\D{0,24}?(\d{3,4})\s*(?:k?cal|cal|calories)\b/i,
  );
  if (!m) return null;
  return parseInt(m[1], 10);
}

/** Whether a daily intake target is below the medical floor for the given sex. */
export function belowCalorieFloor(target: number, sex?: string | null): boolean {
  const floor = sex === "male" ? CALORIE_FLOOR.male : sex === "female" ? CALORIE_FLOOR.female : CALORIE_FLOOR.default;
  return target < floor;
}

export function classifyMessage(text: string): SafetyFlags {
  return {
    crisis: CRISIS_PATTERN.test(text),
    eatingDisorder: ED_PATTERN.test(text),
    medicalDiagnosis: DIAGNOSIS_PATTERN.test(text),
    medication: MEDICATION_PATTERN.test(text),
  };
}

export function crisisMessage(): string {
  return [
    "It sounds like you're going through something really hard right now, and I'm really glad you said something. This matters far more than anything to do with your training.",
    "",
    "Please reach out to someone who can help right now:",
    "- US: call or text 988 (Suicide & Crisis Lifeline)",
    "- UK & Ireland: call 116 123 (Samaritans)",
    "- Canada: call or text 988",
    "- Australia: call 13 11 14 (Lifeline)",
    "- Anywhere else: find a helpline at findahelpline.com",
    "",
    "You deserve support from a real person. I'm here when you're ready, but please talk to one of these first.",
  ].join("\n");
}

export function eatingDisorderMessage(): string {
  return [
    "I can't help with that. Targets and patterns like that are below what's safe and can be genuinely harmful.",
    "",
    "If you're struggling with food, eating, or how you feel about your body, please talk to a doctor or a registered dietitian. In the US you can also reach the NEDA Helpline at 1-800-931-2237; elsewhere, findahelpline.com lists local support.",
    "",
    "I'd be glad to help you build a sustainable, healthy plan instead whenever you're ready.",
  ].join("\n");
}

/**
 * Evaluate a user message. Returns a deterministic safety response when a
 * crisis or eating-disorder pattern is detected, otherwise type null to proceed
 * to the normal coaching path.
 */
export function evaluateSafety(text: string, sex?: string | null): SafetyResult {
  const flags = classifyMessage(text);

  if (flags.crisis) {
    return { type: "crisis", message: crisisMessage(), flags };
  }

  const target = parseCalorieIntakeTarget(text);
  const floorViolation = target !== null && belowCalorieFloor(target, sex);
  if (flags.eatingDisorder || floorViolation) {
    return { type: "eating_disorder", message: eatingDisorderMessage(), flags };
  }

  return { type: null, message: null, flags };
}
