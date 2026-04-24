import type { QuizQuestion } from "@/contexts/AppContext";

// Lightweight on-device "AI" generators for the first build.
// Produces structured, believable outputs without a backend.

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const RAG_TEMPLATES: Record<string, string[]> = {
  default: [
    "Based on the indexed material, the central idea is structured around three pillars: definition, constitutional/legal grounding, and contemporary relevance. Most rankers approach this by stating the framework first, citing the relevant Article or doctrine, then anchoring it to a recent example.",
    "The vault returns multiple converging passages. Synthesised: the concept evolved from a colonial-era construct, was reframed during the constituent assembly debates, and has been progressively expanded by judicial interpretation. Note the shift from a literal to a purposive reading post the 1970s.",
    "Three retrieved chunks point to the same conclusion. (1) Statutory backing: the relevant act and section. (2) Institutional architecture: ministry/regulator/body that enforces it. (3) Critique: implementation gaps highlighted in the latest CAG/parliamentary committee report.",
  ],
  polity: [
    "Article 32, the 'heart and soul' of the Constitution per Dr. Ambedkar, makes the right to constitutional remedies itself a fundamental right. The Supreme Court can issue five writs: habeas corpus, mandamus, prohibition, certiorari, and quo warranto. Note the basic structure overlay from Kesavananda Bharati (1973).",
    "The 7th Schedule distributes legislative power across Union (List I, 97 entries), State (List II, 59 entries), and Concurrent (List III, 47 entries) lists. Doctrinal tools — pith and substance, colourable legislation, repugnancy under Article 254 — resolve overlaps. Recent GST reforms expanded cooperative federalism.",
  ],
  history: [
    "The Revolt of 1857 was sparked by greased cartridges but driven by structural causes — annexations under Doctrine of Lapse, Permanent Settlement's agrarian distress, and erosion of traditional elites. Failure stemmed from regional limits, lack of unified leadership, and superior British logistics post Crimean War.",
    "Moderate phase (1885–1905) emphasised constitutional methods and 'prayer petitions'. Surat Split (1907) divided Congress; Extremists led by Lal-Bal-Pal pushed Swadeshi and Boycott. The shift was less ideological rupture and more generational — from Naoroji's drain theory to Tilak's swaraj 'birthright'.",
  ],
  geography: [
    "Indian monsoon is bi-modal: SW (June–Sep) brings ~75% annual rainfall, modulated by ITCZ shift, Mascarene High, Tibetan plateau heating, and ENSO/IOD oscillations. La Niña years correlate with above-normal monsoon; positive IOD strengthens it. Recent trend: fewer rainy days but higher intensity.",
  ],
};

export async function ragAnswer(question: string, subject: string) {
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 600));
  const key = subject.toLowerCase();
  const pool =
    RAG_TEMPLATES[key] ??
    RAG_TEMPLATES.default!;
  const base = pick(pool);
  const q = question.trim().replace(/\?+$/, "");
  return `${base}\n\nDirect take on "${q}":\n• Define and contextualise (1 line)\n• Cite the constitutional/legal/empirical anchor (1–2 lines)\n• Add a contemporary example or report\n• Close with a forward-looking observation`;
}

export async function evaluateMains(params: {
  question: string;
  paper: string;
  wordCount: number;
}) {
  await new Promise((r) => setTimeout(r, 1100 + Math.random() * 700));
  const ideal = params.paper === "Essay" ? 1000 : 250;
  const lengthRatio = Math.min(params.wordCount / ideal, 1.2);
  const base = 6 + Math.random() * 2.5;

  const structure = Math.max(3, Math.min(10, base + (lengthRatio - 0.6) * 3));
  const content = Math.max(3, Math.min(10, base + Math.random() * 2));
  const relevance = Math.max(4, Math.min(10, base + Math.random() * 1.5));
  const presentation = Math.max(3, Math.min(10, base + Math.random() * 2));
  const valueAddition = Math.max(2, Math.min(10, base - 0.5 + Math.random() * 3));

  const round = (n: number) => Math.round(n * 10) / 10;
  const scores = {
    structure: round(structure),
    content: round(content),
    relevance: round(relevance),
    presentation: round(presentation),
    valueAddition: round(valueAddition),
  };

  const total = round(
    (scores.structure +
      scores.content +
      scores.relevance +
      scores.presentation +
      scores.valueAddition) /
      5 *
      (params.paper === "Essay" ? 12.5 : 1.5),
  );
  const max = params.paper === "Essay" ? 125 : 15;

  const feedback: string[] = [];
  if (scores.structure < 7)
    feedback.push(
      "Use a clearer 3-part structure: introduction → body (2–3 dimensions) → way forward.",
    );
  else
    feedback.push(
      "Structure is coherent — keep using subheadings or numbered points for examiner scan-ability.",
    );

  if (scores.content < 7)
    feedback.push(
      "Add 1–2 specific facts: a Supreme Court case, a committee name, or an NSO/CAG figure.",
    );
  else
    feedback.push(
      "Content depth is solid. Consider adding a counter-perspective to elevate it further.",
    );

  if (scores.valueAddition < 6)
    feedback.push(
      "Bring in a quote, a constitutional Article, or a recent report (Niti Aayog, Economic Survey).",
    );
  else
    feedback.push(
      "Good value addition — the citation strengthens the argument.",
    );

  if (params.wordCount < ideal * 0.7)
    feedback.push(
      `Word count is short (${params.wordCount}/${ideal}). Expand the body, not the introduction.`,
    );
  else if (params.wordCount > ideal * 1.15)
    feedback.push(
      `Slightly over the limit (${params.wordCount}/${ideal}). Tighten the introduction and conclusion.`,
    );

  const modelAnswerHint =
    params.paper === "Essay"
      ? "A ranker-grade essay weaves a single thread through 4–5 dimensions (philosophical, historical, political, economic, ethical). Open with a vignette, close with a vision."
      : "A 10-marker should resolve in 150 words: 1-line definition, 2 dimensions with examples, 1-line forward path. Avoid the 'kitchen sink' approach.";

  return { scores, totalScore: total, maxScore: max, feedback, modelAnswerHint };
}

const QUESTION_BANKS: Record<string, QuizQuestion[]> = {
  Polity: [
    {
      id: uid(),
      prompt:
        "Which Article of the Indian Constitution empowers the Supreme Court to issue writs for the enforcement of Fundamental Rights?",
      options: ["Article 19", "Article 21", "Article 32", "Article 226"],
      correctIndex: 2,
      explanation:
        "Article 32 is itself a Fundamental Right — Dr. Ambedkar called it the 'heart and soul' of the Constitution. Article 226 gives similar (wider) powers to High Courts but is not a Fundamental Right.",
    },
    {
      id: uid(),
      prompt: "The 'Doctrine of Basic Structure' was first propounded in which case?",
      options: [
        "Golak Nath v. State of Punjab (1967)",
        "Kesavananda Bharati v. State of Kerala (1973)",
        "Minerva Mills v. Union of India (1980)",
        "Indira Gandhi v. Raj Narain (1975)",
      ],
      correctIndex: 1,
      explanation:
        "The 13-judge Kesavananda Bharati bench (1973) held that Parliament cannot amend the 'basic structure' of the Constitution, overruling Golak Nath partly.",
    },
    {
      id: uid(),
      prompt:
        "Which Schedule of the Constitution deals with the distribution of powers between the Union and the States?",
      options: ["Sixth Schedule", "Seventh Schedule", "Eighth Schedule", "Ninth Schedule"],
      correctIndex: 1,
      explanation:
        "The Seventh Schedule contains the Union List (97 entries), State List (59), and Concurrent List (47).",
    },
  ],
  History: [
    {
      id: uid(),
      prompt: "The Indian National Congress was founded in which year and where?",
      options: ["1885, Bombay", "1857, Calcutta", "1905, Bengal", "1916, Lucknow"],
      correctIndex: 0,
      explanation:
        "Founded in December 1885 in Bombay by A. O. Hume; W. C. Bonnerjee was the first president.",
    },
    {
      id: uid(),
      prompt:
        "The Permanent Settlement of Bengal (1793) is associated with which Governor-General?",
      options: ["Warren Hastings", "Lord Cornwallis", "Lord Dalhousie", "Lord Ripon"],
      correctIndex: 1,
      explanation:
        "Lord Cornwallis introduced the Permanent Settlement, fixing land revenue with zamindars in perpetuity.",
    },
    {
      id: uid(),
      prompt: "The Lahore Session of INC (1929) is famous for which resolution?",
      options: [
        "Non-Cooperation",
        "Quit India",
        "Purna Swaraj",
        "Communal Award",
      ],
      correctIndex: 2,
      explanation:
        "Under Jawaharlal Nehru's presidency, the Lahore Session declared 'Purna Swaraj' (complete independence) as the goal; 26 January 1930 was observed as Independence Day.",
    },
  ],
  Geography: [
    {
      id: uid(),
      prompt:
        "The Indian Standard Time meridian (82°30'E) passes through which city?",
      options: ["Allahabad (Prayagraj)", "Mirzapur", "Bhopal", "Nagpur"],
      correctIndex: 1,
      explanation:
        "The IST reference passes through the clock tower at Mirzapur, Uttar Pradesh.",
    },
    {
      id: uid(),
      prompt: "Which one of these rivers does NOT originate in India?",
      options: ["Godavari", "Krishna", "Brahmaputra", "Mahanadi"],
      correctIndex: 2,
      explanation:
        "The Brahmaputra (Yarlung Tsangpo) originates in the Kailash range in Tibet, China.",
    },
    {
      id: uid(),
      prompt:
        "The 'October Heat' phenomenon in northern India is primarily due to:",
      options: [
        "Withdrawal of monsoon and high humidity",
        "Western disturbances",
        "Cyclonic activity in Bay of Bengal",
        "Heat island effect",
      ],
      correctIndex: 0,
      explanation:
        "After the SW monsoon withdraws, residual moisture combined with high temperatures creates oppressive humid heat — known as the 'October Heat'.",
    },
  ],
  Economy: [
    {
      id: uid(),
      prompt:
        "The 'Repo Rate' in India is decided by which body?",
      options: [
        "Finance Ministry",
        "RBI Board of Directors",
        "Monetary Policy Committee (MPC)",
        "Niti Aayog",
      ],
      correctIndex: 2,
      explanation:
        "The MPC, a 6-member committee (3 RBI, 3 government-appointed), sets the policy repo rate. Created via the RBI Act amendment of 2016.",
    },
    {
      id: uid(),
      prompt: "Which of the following is a 'direct tax' in India?",
      options: ["GST", "Customs duty", "Corporate tax", "Excise duty"],
      correctIndex: 2,
      explanation:
        "Corporate tax is levied directly on the income of companies — a direct tax. GST, customs and excise are indirect taxes.",
    },
  ],
  Environment: [
    {
      id: uid(),
      prompt:
        "The 'Coalition for Disaster Resilient Infrastructure (CDRI)' was launched by India at which forum?",
      options: [
        "G20 Summit, Osaka 2019",
        "UN Climate Action Summit 2019",
        "COP26 Glasgow",
        "BRICS Summit 2018",
      ],
      correctIndex: 1,
      explanation:
        "PM Modi launched CDRI at the UN Climate Action Summit in New York, September 2019.",
    },
    {
      id: uid(),
      prompt:
        "Which gas has the highest Global Warming Potential (GWP) over a 100-year horizon?",
      options: ["CO₂", "Methane", "Nitrous oxide", "Sulphur hexafluoride (SF₆)"],
      correctIndex: 3,
      explanation:
        "SF₆ has a GWP ~23,500 times that of CO₂ over 100 years — the highest of common greenhouse gases.",
    },
  ],
};

export async function generateQuiz(
  topic: string,
  count: number,
): Promise<QuizQuestion[]> {
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));
  const subjectKeys = Object.keys(QUESTION_BANKS);
  const matched =
    subjectKeys.find((k) => topic.toLowerCase().includes(k.toLowerCase())) ??
    pick(subjectKeys);
  const bank = QUESTION_BANKS[matched]!;

  const all: QuizQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const q = bank[i % bank.length]!;
    all.push({ ...q, id: uid() });
  }
  return all;
}

export function pickRandomTopic() {
  const topics = [
    "Polity — Fundamental Rights",
    "History — Modern India",
    "Geography — Climatology",
    "Economy — Monetary Policy",
    "Environment — Climate Change",
  ];
  return pick(topics);
}

export function randomFactCount() {
  return rand(40, 220);
}
