export interface ScoreCheck {
  id: string;
  label: string;
  passed: boolean;
  points: number;
  maxPoints: number;
  tip: string;
  bonus?: boolean;
  pending?: boolean;
}

export interface PostScore {
  totalScore: number;
  grade: "excellent" | "good" | "fair" | "needs-work";
  checks: ScoreCheck[];
  topTip: string;
  tooShort: boolean;
}

const AI_PHRASES = [
  "in today's",
  "game-changer",
  "landscape",
  "leverage",
  "delve",
  "foster",
  "navigate",
  "elevate",
  "here's the thing",
  "let me share",
  "it's not about",
  "read that again",
  "let that sink in",
];

const FIRST_PERSON = [/\bi\b/, /\bmy\b/, /\bwe\b/, /\bour\b/];
const EXPERIENCE_WORDS = [
  "realized", "learned", "noticed", "happened", "moment",
  "years ago", "last week", "last month", "one day",
  "remember when", "remember", "discovered", "struggled",
  "failed", "succeeded", "built", "lost", "found", "changed",
];

const STORY_INDICATORS = [
  "i remember",
  "last year",
  "my client",
  "i was",
  "years ago",
  "one day",
  "last month",
  "last week",
  "i noticed",
  "i realized",
  "true story",
];

import { stripUnicodeFormatting } from "@/lib/unicode-formatter";

export interface AnalyzeOptions {
  /** True if the post was regenerated with a user-provided personal story */
  hasStoryContext?: boolean;
}

export function analyzePost(rawText: string, options?: AnalyzeOptions): PostScore {
  // Strip Unicode bold/italic so word counts and phrase detection work correctly
  const text = stripUnicodeFormatting(rawText);
  const checks: ScoreCheck[] = [];
  const lines = text.split("\n").filter((l) => l.trim());
  const hookLine = lines[0] || "";
  const hookWords = hookLine.trim().split(/\s+/).filter(Boolean).length;
  const allWords = text.trim().split(/\s+/).filter(Boolean).length;
  const paragraphBreaks = (text.match(/\n\s*\n/g) || []).length;
  const hasLink = /https?:\/\/|www\./i.test(text);
  const hashtags = text.match(/#[\w\u00C0-\u024F]+/g) || [];
  // Strip trailing hashtags (on their own line or inline) and whitespace before checking for CTA question
  const strippedText = text
    .replace(/[\s]*(#[\w\u00C0-\u024F]+[\s]*)+$/g, "")
    .trimEnd();
  const endsWithQuestion = strippedText.endsWith("?");
  const lower = text.toLowerCase();

  // 1. Hook quality (20 points)
  let hookPoints = 0;
  let hookLabel = "";
  if (hookWords <= 12) {
    hookPoints = 20;
    hookLabel = `Strong hook (${hookWords} words)`;
  } else if (hookWords <= 20) {
    hookPoints = 10;
    hookLabel = `Hook could be shorter (${hookWords} words)`;
  } else {
    hookPoints = 0;
    hookLabel = `Hook is too long (${hookWords} words)`;
  }
  checks.push({
    id: "hook",
    label: hookLabel,
    passed: hookPoints >= 15,
    points: hookPoints,
    maxPoints: 20,
    tip: "LinkedIn shows only the first line before 'see more'. Cut your hook to under 12 words to maximize clicks.",
  });

  const isTooShort = allWords < 50;

  // Helper to create a pending check for short posts
  const pendingCheck = (id: string, maxPoints: number, bonus?: boolean): ScoreCheck => ({
    id,
    label: "Write more to unlock this check",
    passed: false,
    points: 0,
    maxPoints,
    tip: "",
    bonus,
    pending: true,
  });

  // 2. Post length (15 points)
  if (isTooShort) {
    checks.push(pendingCheck("length", 15));
  } else {
    let lengthPoints = 0;
    let lengthLabel = "";
    if (allWords >= 100 && allWords <= 180) {
      lengthPoints = 15;
      lengthLabel = `Great length (${allWords} words)`;
    } else if ((allWords >= 80 && allWords < 100) || (allWords > 180 && allWords <= 250)) {
      lengthPoints = 10;
      lengthLabel = `Acceptable length (${allWords} words)`;
    } else if ((allWords >= 50 && allWords < 80) || (allWords > 250 && allWords <= 300)) {
      lengthPoints = 5;
      lengthLabel = `Consider adjusting length (${allWords} words)`;
    } else {
      lengthPoints = 0;
      lengthLabel = allWords < 50 ? `Post is too short (${allWords} words)` : `Post is too long (${allWords} words)`;
    }
    checks.push({
      id: "length",
      label: lengthLabel,
      passed: lengthPoints >= 10,
      points: lengthPoints,
      maxPoints: 15,
      tip: `Posts between 100-180 words get the highest engagement on LinkedIn. Yours is ${allWords} words.`,
    });
  }

  // 3. CTA quality (15 points)
  if (isTooShort) {
    checks.push(pendingCheck("cta", 15));
  } else {
    checks.push({
      id: "cta",
      label: endsWithQuestion ? "Ends with a question (drives comments)" : "No question at the end",
      passed: endsWithQuestion,
      points: endsWithQuestion ? 15 : 0,
      maxPoints: 15,
      tip: "Posts that end with a specific question get 2x more comments. Add a question your audience can answer from experience.",
    });
  }

  // 4. Formatting (15 points)
  if (isTooShort) {
    checks.push(pendingCheck("formatting", 15));
  } else {
    let formatPoints = 0;
    let formatLabel = "";
    if (paragraphBreaks >= 3) {
      formatPoints = 15;
      formatLabel = "Well-formatted with spacing";
    } else if (paragraphBreaks >= 1) {
      formatPoints = 8;
      formatLabel = "Could use more line breaks";
    } else {
      formatPoints = 0;
      formatLabel = "Wall of text (add line breaks)";
    }
    checks.push({
      id: "formatting",
      label: formatLabel,
      passed: formatPoints >= 10,
      points: formatPoints,
      maxPoints: 15,
      tip: "White space increases dwell time. LinkedIn's algorithm rewards posts that people read slowly. Add a blank line between every 1-2 sentences.",
    });
  }

  // 5. Link check (10 points)
  if (isTooShort) {
    checks.push(pendingCheck("links", 10));
  } else {
    checks.push({
      id: "links",
      label: hasLink ? "External link detected (reduces reach ~50%)" : "No external links (algorithm friendly)",
      passed: !hasLink,
      points: hasLink ? 0 : 10,
      maxPoints: 10,
      tip: "LinkedIn penalizes posts with external links. Remove the link and put it in the first comment instead.",
    });
  }

  // 6. Hashtag status (10 points)
  if (isTooShort) {
    checks.push(pendingCheck("hashtags", 10));
  } else {
    let hashPoints = 0;
    let hashLabel = "";
    const hashCount = hashtags.length;
    if (hashCount >= 1 && hashCount <= 3) {
      hashPoints = 10;
      hashLabel = `Good hashtag usage (${hashCount} hashtags)`;
    } else if (hashCount === 0) {
      hashPoints = 3;
      hashLabel = "No hashtags (add 2-3 for discoverability)";
    } else if (hashCount <= 5) {
      hashPoints = 5;
      hashLabel = `Slightly too many hashtags (${hashCount})`;
    } else {
      hashPoints = 0;
      hashLabel = `Too many hashtags (LinkedIn penalizes 6+)`;
    }
    checks.push({
      id: "hashtags",
      label: hashLabel,
      passed: hashPoints >= 8,
      points: hashPoints,
      maxPoints: 10,
      tip: "2-3 specific hashtags help LinkedIn categorize your post and show it to the right audience.",
    });
  }

  // BONUS: 7. AI phrase detection (5 points)
  if (isTooShort) {
    checks.push(pendingCheck("ai-phrases", 5, true));
  } else {
    const detectedPhrase = AI_PHRASES.find((p) => lower.includes(p));
    checks.push({
      id: "ai-phrases",
      label: detectedPhrase ? `AI phrase detected: "${detectedPhrase}"` : "No AI phrases detected",
      passed: !detectedPhrase,
      points: detectedPhrase ? 0 : 5,
      maxPoints: 5,
      tip: detectedPhrase
        ? `Remove "${detectedPhrase}" — it signals AI-generated content and reduces trust.`
        : "No AI phrases found.",
      bonus: true,
    });
  }

  // BONUS: 8. Punctuation (5 points)
  if (isTooShort) {
    checks.push(pendingCheck("punctuation", 5, true));
  } else {
    const hasEmDash = /[—–;]/.test(text);
    checks.push({
      id: "punctuation",
      label: hasEmDash ? "Em dash or semicolon detected" : "Clean punctuation",
      passed: !hasEmDash,
      points: hasEmDash ? 0 : 5,
      maxPoints: 5,
      tip: "Em dashes are the #1 sign of AI writing. Replace with a comma, period, or line break.",
      bonus: true,
    });
  }

  // BONUS: 9. Personal story (5 points)
  if (isTooShort) {
    checks.push(pendingCheck("story", 5, true));
  } else {
    const hasBrackets = /\[[^\]]+\]/.test(text);

    let hasStory = false;
    let storyLabel = "Consider adding a personal story";
    let storyTip = "Posts with real personal stories get 2x more comments. Add a real experience to make this post stand out.";

    if (hasBrackets) {
      // Brackets present = story NOT filled in yet
      hasStory = false;
      storyLabel = "Fill in the [bracket] placeholders with your story";
      storyTip = "Your post has placeholder brackets. Fill them in using the story section below, or edit them directly.";
    } else if (options?.hasStoryContext) {
      // Post was regenerated with user's real story
      hasStory = true;
      storyLabel = "Your personal story makes this post stand out";
      storyTip = "Your personal story makes this post stand out.";
    } else {
      // Heuristic: check for first-person + experience words
      const hasFirstPerson = FIRST_PERSON.some((re) => re.test(lower));
      const experienceCount = EXPERIENCE_WORDS.filter((w) => lower.includes(w)).length;
      const hasOldIndicator = STORY_INDICATORS.some((s) => lower.includes(s));
      hasStory = (hasFirstPerson && experienceCount >= 2) || hasOldIndicator;
      if (hasStory) {
        storyLabel = "Contains personal element";
        storyTip = "Your personal story makes this post stand out.";
      }
    }

    checks.push({
      id: "story",
      label: storyLabel,
      passed: hasStory,
      points: hasStory ? 5 : 0,
      maxPoints: 5,
      tip: storyTip,
      bonus: true,
    });
  }

  let totalScore = checks.reduce((sum, c) => sum + c.points, 0);
  if (isTooShort && totalScore > 25) totalScore = 25;

  let grade: PostScore["grade"];
  if (totalScore >= 85) grade = "excellent";
  else if (totalScore >= 70) grade = "good";
  else if (totalScore >= 50) grade = "fair";
  else grade = "needs-work";

  // topTip = tip from the failed check with the biggest point gap (skip pending checks)
  const failedChecks = checks
    .filter((c) => !c.passed && !c.pending)
    .sort((a, b) => (b.maxPoints - b.points) - (a.maxPoints - a.points));
  const topTip = isTooShort
    ? "Keep writing or click Generate Post to see your full score."
    : failedChecks[0]?.tip || "Your post looks great! Ready to publish.";

  return { totalScore, grade, checks, topTip, tooShort: isTooShort };
}
