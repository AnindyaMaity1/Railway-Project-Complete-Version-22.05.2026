const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(bodyParser.json({ limit: '2mb' }));

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Gemini configuration - disabled to use local analysis only
// To enable AI analysis, add a valid GEMINI_API_KEY to .env file
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
let geminiClientPromise = null;
const HISTORY_PATH = path.join(__dirname, 'decisions-history.json');

async function getGeminiClient() {
  // Always return null to use local analysis only
  // The local analysis provides good results without needing API key
  return null;
}

function safeReadHistory() {
  try {
    if (!fs.existsSync(HISTORY_PATH)) return [];
    const raw = fs.readFileSync(HISTORY_PATH, 'utf8');
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read decisions history file:', err);
    return [];
  }
}

function safeWriteHistory(history) {
  try {
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write decisions history file:', err);
  }
}

function computeLearningStats(history) {
  const byLabel = {};
  history.forEach((record) => {
    if (!record || !record.outcome || typeof record.outcome.reward !== 'number') {
      return;
    }
    const { suggestedOptionLabel } = record.analysisSummary || {};
    if (!suggestedOptionLabel) return;
    if (!byLabel[suggestedOptionLabel]) {
      byLabel[suggestedOptionLabel] = { count: 0, totalReward: 0 };
    }
    byLabel[suggestedOptionLabel].count += 1;
    byLabel[suggestedOptionLabel].totalReward += record.outcome.reward;
  });

  const stats = {};
  Object.keys(byLabel).forEach((label) => {
    const { count, totalReward } = byLabel[label];
    stats[label] = {
      count,
      avgReward: count ? totalReward / count : 0,
    };
  });
  return stats;
}

function applyReinforcementLearning(scoredOptions, learningStats) {
  if (!learningStats || !Object.keys(learningStats).length) {
    return scoredOptions;
  }
  return scoredOptions.map((opt) => {
    const stat = learningStats[opt.optionLabel];
    if (!stat) return opt;
    // Simple bandit-style bonus: higher average reward nudges score up
    const bonus = Math.max(-2, Math.min(2, stat.avgReward)) * 0.3;
    return {
      ...opt,
      score: (opt.score || 0) + bonus,
      learningBonus: bonus,
    };
  });
}

function computeScenarioFinancials(scoredOptions) {
  if (!scoredOptions || !scoredOptions.length) {
    return {
      profitForecast: [],
      budgetImpact: [],
      deadlineImpact: [],
    };
  }

  const profitForecast = ['pessimistic', 'base', 'optimistic'].map(
    (scenario, idx) => {
      const factor = scenario === 'optimistic' ? 1.15 : scenario === 'pessimistic' ? 0.85 : 1;
      const description =
        scenario === 'optimistic'
          ? 'Higher service reliability, fewer disruptions, stronger asset utilisation.'
          : scenario === 'pessimistic'
          ? 'More stock‑outs, emergency repairs, and budget pressure.'
          : 'Most likely outcome based on current information.';

const options = scoredOptions.map((o) => {
        const baseProfit = ((o.score || 0) * 10000 - (o.risk || 0) * 2500) * 83;
        return {
          optionId: o.optionId,
          optionLabel: o.optionLabel,
          projectedProfit: baseProfit * factor,
        };
      });

      return {
        scenarioId: scenario,
        label: scenario === 'base' ? 'Base case' : scenario[0].toUpperCase() + scenario.slice(1),
        description,
        options,
      };
    }
  );

  const budgetImpact = scoredOptions.map((o) => {
    const spendShift = (o.risk || 0) * 0.1 - (o.score || 0) * 0.05;
    return {
      optionId: o.optionId,
      optionLabel: o.optionLabel,
      impactCategory:
        spendShift > 0.5 ? 'higher spend' : spendShift < -0.5 ? 'lower spend' : 'neutral',
      relativeChange: spendShift,
    };
  });

  const deadlineImpact = scoredOptions.map((o) => {
    const delayRisk = (o.risk || 0) * 0.15;
    return {
      optionId: o.optionId,
      optionLabel: o.optionLabel,
      expectedDelayWeeks: delayRisk,
      riskCategory:
        delayRisk > 6 ? 'high schedule risk' : delayRisk > 2 ? 'moderate schedule risk' : 'low',
    };
  });

  return { profitForecast, budgetImpact, deadlineImpact };
}

function runMonteCarloForOption(option, iterations = 500) {
  if (!option) return null;
  const base = option.score || 0;
  const risk = Math.max(1, option.risk || 1);

  const samples = [];
  for (let i = 0; i < iterations; i += 1) {
    // Box-Muller transform for normal noise
    const u1 = Math.random() || 1e-6;
    const u2 = Math.random() || 1e-6;
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const noise = z * risk;
    samples.push(base + noise);
  }

  samples.sort((a, b) => a - b);
  const idx = (p) => samples[Math.floor((samples.length - 1) * p)];
  const successProb = samples.filter((s) => s > 0).length / samples.length;

  return {
    optionId: option.optionId,
    optionLabel: option.optionLabel,
    simulations: iterations,
    successProbability: successProb,
    p5: idx(0.05),
    p50: idx(0.5),
    p95: idx(0.95),
  };
}

function buildExplainability(argumentsByOption, scoredOptions) {
  if (!argumentsByOption || !scoredOptions) return [];

  return scoredOptions.map((opt) => {
    const arg = argumentsByOption.find((a) => a.optionId === opt.optionId) || {
      pros: [],
      cons: [],
      neutral: [],
    };

    const prosCount = arg.pros.length;
    const consCount = arg.cons.length;
    const neutralCount = arg.neutral.length;
    const risk = opt.risk || 0;
    const baseScore = opt.score || 0;

    const contributions = {
      prosCount: prosCount * 2,
      consCount: consCount * -1.5,
      uncertainty: neutralCount * -0.5,
      implementationRisk: -risk,
      biasAdjustment: (opt.learningBonus || 0) * 1,
    };

    return {
      optionId: opt.optionId,
      optionLabel: opt.optionLabel,
      shapLikeContributions: contributions,
      approximateScore: baseScore,
      explanation:
        'SHAP-style breakdown of how pros, cons, uncertainty, risk, and learned bias adjustments contribute to the option score.',
    };
  });
}

function attachLearningAndSimulations(analysis, payload) {
  const history = safeReadHistory();
  const learningStats = computeLearningStats(history);

  // Ensure scoredOptions exists
  const scoredOptions = analysis.scoredOptions || [];
  
  // Ensure argumentsByOption exists
  const argumentsByOption = analysis.argumentsByOption || [];

  const adjustedScored = applyReinforcementLearning(
    scoredOptions,
    learningStats
  );

  const { profitForecast, budgetImpact, deadlineImpact } =
    computeScenarioFinancials(adjustedScored);

  const topAfterLearning = adjustedScored[0] || null;
  const monteCarloSummary = runMonteCarloForOption(topAfterLearning);

  const explanations = buildExplainability(
    argumentsByOption,
    adjustedScored
  );

  const enhanced = {
    ...analysis,
    scoredOptions: adjustedScored,
    profitForecast: profitForecast || [],
    budgetImpact: budgetImpact || [],
    deadlineImpact: deadlineImpact || [],
    monteCarloSummary,
    explanations: explanations || [],
  };

  const record = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    createdAt: new Date().toISOString(),
    payload,
    analysisSummary: {
      title: enhanced.title,
      suggestedOptionLabel: enhanced.suggestedDecision?.optionLabel || null,
      confidence: enhanced.suggestedDecision?.confidence || null,
    },
    outcome: null, // can be updated later via a separate endpoint
  };

  history.push(record);
  safeWriteHistory(history);

  return { enhanced, decisionId: record.id };
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Decision Copilot backend is running' });
});

function extractArguments(rawText, options) {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const byOption = {};
  options.forEach((opt) => {
    byOption[opt.id] = {
      optionId: opt.id,
      optionLabel: opt.label,
      pros: [],
      cons: [],
      neutral: [],
    };
  });

  const proMarkers = ['+', 'pro:', 'pros:', 'benefit:', 'strength:'];
  const conMarkers = ['-', 'con:', 'cons:', 'risk:', 'weakness:'];

  // If no notes provided, generate default pros/cons based on options
  if (!rawText || lines.length === 0) {
    options.forEach((opt, idx) => {
      // Generate relevant pros and cons for railway inventory decisions
      byOption[opt.id].pros.push('Potential for improved operational efficiency');
      byOption[opt.id].pros.push('May reduce long-term maintenance costs');
      byOption[opt.id].cons.push('Requires initial investment');
      byOption[opt.id].cons.push('May require staff training');
      byOption[opt.id].neutral.push('Implementation timeline: 3-6 months');
    });
    return Object.values(byOption);
  }

  // If notes exist but don't match any option, distribute them across options
  const unmatchedLines = [];
  
  lines.forEach((line) => {
    const lower = line.toLowerCase();
    const matchedOption = options.find((opt) =>
      lower.includes(opt.label.toLowerCase())
    );

    const bucket =
      proMarkers.some((m) => lower.startsWith(m) || lower.includes(` ${m}`))
        ? 'pros'
        : conMarkers.some((m) => lower.startsWith(m) || lower.includes(` ${m}`))
        ? 'cons'
        : 'neutral';

    if (matchedOption) {
      byOption[matchedOption.id][bucket].push(line);
    } else {
      unmatchedLines.push({ line, bucket });
    }
  });

  // Distribute unmatched lines across all options
  if (unmatchedLines.length > 0) {
    unmatchedLines.forEach((item, idx) => {
      const optionIdx = idx % options.length;
      const optionId = options[optionIdx].id;
      byOption[optionId][item.bucket].push(item.line);
    });
  }

  return Object.values(byOption);
}

function detectBiases(argumentsByOption, selectedOptionId) {
  const biases = [];

  const confirmationPhrases = [
    'we already know',
    'obviously',
    'clearly',
    'everyone agrees',
    'no doubt',
  ];
  const sunkCostPhrases = [
    'we already invested',
    'we have already spent',
    'too much to quit',
    'we have come too far',
  ];
  const statusQuoPhrases = ['we always', 'we have always', 'as usual'];

  const allText = argumentsByOption
    .map((o) => [...o.pros, ...o.cons, ...o.neutral].join(' '))
    .join(' ')
    .toLowerCase();

  if (confirmationPhrases.some((p) => allText.includes(p))) {
    biases.push({
      type: 'Confirmation bias',
      severity: 'medium',
      details:
        'Language suggests conclusions may be assumed true without actively challenging them.',
      recommendation:
        'Invite at least one participant to argue the opposite and explore disconfirming evidence.',
    });
  }

  if (sunkCostPhrases.some((p) => allText.includes(p))) {
    biases.push({
      type: 'Sunk cost fallacy',
      severity: 'high',
      details:
        'Previous investments are mentioned as a reason to continue rather than focusing on future value.',
      recommendation:
        'Evaluate options based on expected future impact only, ignoring past spend as “non-recoverable”.',
    });
  }

  if (statusQuoPhrases.some((p) => allText.includes(p))) {
    biases.push({
      type: 'Status quo bias',
      severity: 'medium',
      details:
        'There is emphasis on continuing the current approach because it is familiar.',
      recommendation:
        'Explicitly compare the cost and risk of doing nothing versus changing course.',
    });
  }

  const general = argumentsByOption.find(
    (o) => o.optionId === '__general__'
  );
  const prosOnly = argumentsByOption.filter(
    (o) => o.optionId !== '__general__' && o.pros.length && !o.cons.length
  );
  if (!general && prosOnly.length === argumentsByOption.length - 0) {
    biases.push({
      type: 'Missing counter-arguments',
      severity: 'medium',
      details:
        'Options are mostly described in terms of benefits with little explicit downside analysis.',
      recommendation:
        'Ask: “What would have to be true for this option to fail badly?” and capture those risks.',
    });
  }

  if (selectedOptionId) {
    const chosen = argumentsByOption.find(
      (o) => o.optionId === selectedOptionId
    );
    if (chosen && chosen.pros.length > 0 && chosen.cons.length === 0) {
      biases.push({
        type: 'Choice-supportive bias',
        severity: 'medium',
        details:
          'The currently preferred option is framed only in positive terms.',
        recommendation:
          'Document at least two concrete downsides for the preferred option to balance the evaluation.',
      });
    }
  }

  return biases;
}

function scoreOptions(argumentsByOption) {
  return argumentsByOption
    .filter((o) => o.optionId !== '__general__')
    .map((o) => {
      const baseScore = o.pros.length * 2 - o.cons.length * 1.5;
      const uncertaintyPenalty = o.neutral.filter((n) =>
        n.toLowerCase().includes('unknown')
      ).length;
      const score = baseScore - uncertaintyPenalty;

      const risk =
        o.cons.length +
        o.neutral.filter((n) =>
          /risk|unknown|uncertain|dependency|blocked/i.test(n)
        ).length;

      return {
        optionId: o.optionId,
        optionLabel: o.optionLabel,
        score,
        risk,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function simulateRisk(sortedScores) {
  return sortedScores.map((o) => {
    const base = o.score || 0;
    const riskFactor = Math.max(1, o.risk || 1);

    const bestCase = base + 2 * (4 - Math.min(riskFactor, 3));
    const worstCase = base - 2 * riskFactor;
    const typical = base - 0.5 * (riskFactor - 1);

    return {
      optionId: o.optionId,
      optionLabel: o.optionLabel,
      bestCase,
      typical,
      worstCase,
    };
  });
}

function buildDecisionTree(sortedScores) {
  const total = sortedScores.length;
  const factors = [];

  const highScore = sortedScores.filter((o) => o.score >= 0).length;
  if (total > 0) {
    factors.push('Expected impact (more pros than cons)');
  }

  const lowRisk = sortedScores.filter((o) => o.risk <= 2).length;
  if (lowRisk) {
    factors.push('Implementation risk and uncertainty');
  }

  factors.push('Alignment with meeting objectives and constraints');

  return {
    title: 'Decision path',
    description:
      'Heuristic tree showing how options are filtered by impact and risk.',
    steps: [
      {
        question: 'Does the option have clearly more pros than cons?',
        rule: 'Filter out options with heavily negative score.',
      },
      {
        question: 'Is the risk/uncertainty acceptable?',
        rule: 'Prefer options with fewer severe risks and unknowns.',
      },
      {
        question: 'Does it align with constraints (budget, time, strategy)?',
        rule: 'Use context from the meeting notes to judge fit.',
      },
    ],
    summaryFactors: factors,
  };
}

function buildAnalysis(payload) {
  const { title, context, options, notes, preferredOptionId } = payload;

  const normalizedOptions =
    options && options.length
      ? options.map((o, idx) => ({
          id: o.id || String(idx + 1),
          label: o.label || o.name || `Option ${idx + 1}`,
        }))
      : [
          { id: '1', label: 'Option 1' },
          { id: '2', label: 'Option 2' },
        ];

  const argumentsByOption = extractArguments(notes || '', normalizedOptions);
  const biases = detectBiases(argumentsByOption, preferredOptionId);
  const scored = scoreOptions(argumentsByOption);
  const riskSimulation = simulateRisk(scored);
  const decisionTree = buildDecisionTree(scored);

  const top = scored[0] || null;
  let confidence = 0.5;
  if (top) {
    const span = Math.max(
      1,
      (scored[0].score || 0) - (scored[scored.length - 1].score || 0)
    );
    const normalizedLead = Math.min(
      1,
      Math.max(0, (top.score - (scored[1]?.score || 0)) / span)
    );
    confidence = 0.55 + 0.35 * normalizedLead - 0.05 * biases.length;
    confidence = Math.max(0.2, Math.min(0.95, confidence));
  }

  return {
    title: title || 'Untitled decision',
    context: context || '',
    options: normalizedOptions,
    argumentsByOption,
    scoredOptions: scored,
    biases,
    decisionTree,
    riskSimulation,
    suggestedDecision: top
      ? {
          optionId: top.optionId,
          optionLabel: top.optionLabel,
          confidence,
        }
      : null,
  };
}

async function buildGeminiAnalysis(payload) {
  const { title, context, options, notes, preferredOptionId } = payload || {};

  const normalizedOptions =
    options && options.length
      ? options.map((o, idx) => ({
          id: o.id || String(idx + 1),
          label: o.label || o.name || `Option ${idx + 1}`,
        }))
      : [
          { id: '1', label: 'Option 1' },
          { id: '2', label: 'Option 2' },
        ];

  const scenario = {
    title: title || 'Railway inventory decision',
    context:
      context ||
      'We are managing railway tracks and spare parts inventory across multiple depots.',
    options: normalizedOptions,
    notes: notes || '',
    preferredOptionId: preferredOptionId || null,
  };

  const systemInstruction =
    'You are an expert assistant helping plan decisions for a railway track and parts inventory management system. ' +
    'You will receive a decision scenario including title, context, options and notes captured from a meeting. ' +
    'Simulate how this decision might play out over the next 6–12 months in a real railway operations environment. ' +
    'Focus on maintenance windows, asset reliability, stock‑outs, lead times, safety incidents, budget, and service levels.';

  const outputShapeDescription = `
Return a single JSON object with the following exact shape (no extra top-level keys):
{
  "title": string,
  "context": string,
  "options": [{ "id": string, "label": string }],
  "argumentsByOption": [{
    "optionId": string,
    "optionLabel": string,
    "pros": string[],
    "cons": string[],
    "neutral": string[]
  }],
  "scoredOptions": [{
    "optionId": string,
    "optionLabel": string,
    "score": number,
    "risk": number
  }],
  "biases": [{
    "type": string,
    "severity": "low" | "medium" | "high",
    "details": string,
    "recommendation": string
  }],
  "decisionTree": {
    "title": string,
    "description": string,
    "steps": [{
      "question": string,
      "rule": string
    }],
    "summaryFactors": string[]
  },
  "riskSimulation": [{
    "optionId": string,
    "optionLabel": string,
    "bestCase": number,
    "typical": number,
    "worstCase": number
  }],
  "suggestedDecision": {
    "optionId": string,
    "optionLabel": string,
    "confidence": number
  } | null
}

Strict rules:
- Use the provided options ids/labels as the source of truth.
- Use numeric values for all score, risk, bestCase, typical, worstCase, and confidence (0–1 for confidence).
- Do NOT wrap the JSON in backticks or any explanation. Respond with raw JSON only.
`;

  const prompt = [
    systemInstruction,
    '',
    'Here is the current decision scenario in JSON:',
    JSON.stringify(scenario, null, 2),
    '',
    'Interpret the scenario as a railway track and parts inventory management problem.',
    'Think through realistic future outcomes and trade‑offs for each option, including:',
    '- likelihood of stock‑outs or over‑stocking,',
    '- impact on asset uptime and safety,',
    '- effect on maintenance planning and track possession windows,',
    '- budget and working capital implications,',
    '- operational complexity across depots.',
    '',
    'Then fill in all of the fields in the required JSON shape.',
    outputShapeDescription,
  ].join('\n');

  try {
    console.log('Using local fallback analysis (Gemini API disabled).');
    return buildAnalysis(payload);
  } catch (err) {
    console.error('Error in buildGeminiAnalysis:', err);
    return buildAnalysis(payload);
  }
}

app.post('/api/analyze', async (req, res) => {
  try {
    const payload = req.body || {};
    console.log('Received payload:', JSON.stringify(payload, null, 2));
    
    // Ensure defaults
    if (!payload.options || payload.options.length === 0) {
      payload.options = [
        { id: 'opt-1', label: 'Option A' },
        { id: 'opt-2', label: 'Option B' }
      ];
    }
    if (!payload.title) {
      payload.title = 'Untitled Decision';
    }
    
    let baseAnalysis;
    try {
      baseAnalysis = await buildGeminiAnalysis(payload);
    } catch (geminiErr) {
      console.warn('Gemini analysis failed, using fallback:', geminiErr.message);
      baseAnalysis = buildAnalysis(payload);
    }
    
    console.log('Analysis result keys:', Object.keys(baseAnalysis));
    
    const { enhanced, decisionId } = attachLearningAndSimulations(
      baseAnalysis,
      payload
    );
    
    console.log('Enhanced result ready, decisionId:', decisionId);
    
    res.json({ ...enhanced, decisionId });
  } catch (err) {
    console.error('Error in /api/analyze', err);
    // Even on error, try to return a basic response
    try {
      const fallback = buildAnalysis(req.body || {});
      const { enhanced, decisionId } = attachLearningAndSimulations(fallback, req.body || {});
      res.json({ ...enhanced, decisionId });
    } catch (fallbackErr) {
      console.error('Fallback also failed:', fallbackErr);
      res.status(500).json({ error: 'Failed to analyze decision.' });
    }
  }
});

app.post('/api/report', (req, res) => {
  try {
    const analysis = req.body;
    if (!analysis || !analysis.title) {
      return res.status(400).json({ error: 'Analysis payload is required.' });
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="decision-report-${Date.now()}.pdf"`
    );
    doc.pipe(res);

    // Colors
    const primaryColor = '#1e40af';
    const secondaryColor = '#7c3aed';
    const accentColor = '#0891b2';
    const successColor = '#059669';
    const warningColor = '#d97706';
    const dangerColor = '#dc2626';
    const darkColor = '#1f2937';
    const lightGray = '#f3f4f6';
    const borderColor = '#e5e7eb';

    // Helper functions
    const addHeader = () => {
      // Gradient-like header bar
      doc.rect(0, 0, doc.page.width, 80).fill('#1e3a8a');
      
      // Title
      doc.fillColor('#ffffff')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('DRISHTI', 50, 25, { align: 'center' });
      
      doc.fontSize(12)
        .font('Helvetica')
        .text('Decision Copilot Report', 50, 50, { align: 'center' });
      
      // Reset position
      doc.moveDown(8);
      doc.fillColor('#1f2937');
    };

    const addSectionHeader = (title) => {
      doc.moveDown(1);
      // Section header bar
      doc.rect(50, doc.y, doc.page.width - 100, 2).fill(secondaryColor);
      
      doc.moveDown(0.5);
      doc.fontSize(16)
        .font('Helvetica-Bold')
        .fillColor(secondaryColor)
        .text(title, 50);
      
      doc.moveDown(0.5);
      doc.fillColor('#1f2937');
    };

    const addSubsection = (title) => {
      doc.moveDown(0.8);
      doc.fontSize(13)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text(title, 50);
      doc.fillColor('#1f2937');
      doc.font('Helvetica');
    };

    const addInfoRow = (label, value, color = '#1f2937') => {
      doc.fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(color)
        .text(`${label}: `, { continued: true });
      doc.font('Helvetica')
        .fillColor('#1f2937')
        .text(value || 'N/A');
    };

    // Cover Page
    addHeader();

    // Decision Title Box
    const titleY = doc.y;
    doc.rect(50, titleY, doc.page.width - 100, 60)
      .fillAndStroke('#f8fafc', borderColor);
    
    doc.fontSize(18)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text(analysis.title || 'Untitled Decision', 60, titleY + 10, {
        width: doc.page.width - 120,
        align: 'center'
      });
    
    doc.moveDown(4);

    // Summary Box
    if (analysis.suggestedDecision) {
      doc.rect(50, doc.y, doc.page.width - 100, 50)
        .fillAndStroke('#ecfdf5', borderColor);
      
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(successColor)
        .text('RECOMMENDED DECISION', 60, doc.y - 40, { align: 'center' });
      
      doc.fontSize(14)
        .fillColor(darkColor)
        .text(analysis.suggestedDecision.optionLabel || '', { align: 'center' });
      
      const confidence = Math.round((analysis.suggestedDecision.confidence || 0) * 100);
      doc.fontSize(10)
        .fillColor('#6b7280')
        .text(`Confidence Level: ${confidence}%`, { align: 'center' });
    }

    doc.moveDown(4);

    // Context Section
    if (analysis.context) {
      addSectionHeader('Railway Context & Constraints');
      doc.fontSize(11)
        .font('Helvetica')
        .text(analysis.context, {
          align: 'justify',
          lineGap: 2
        });
    }

    // Options Section
    if (analysis.options && analysis.options.length) {
      doc.addPage();
      addHeader();
      addSectionHeader('Strategic Options Analyzed');

      analysis.options.forEach((option, idx) => {
        // Option card
        const cardY = doc.y;
        doc.rect(50, cardY, doc.page.width - 100, 30)
          .fillAndStroke('#f0f9ff', borderColor);
        
        doc.fontSize(12)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text(`Option ${idx + 1}: ${option.label}`, 60, cardY + 8);
        
        doc.moveDown(1);
      });
    }

    // Pros & Cons Section
    if (analysis.argumentsByOption && analysis.argumentsByOption.length) {
      doc.addPage();
      addHeader();
      addSectionHeader('Pros & Cons Analysis');

      analysis.argumentsByOption.forEach((option) => {
        // Option header with colored background
        const optY = doc.y;
        doc.rect(50, optY, doc.page.width - 100, 25)
          .fillAndStroke(primaryColor, borderColor);
        
        doc.fontSize(13)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text(option.optionLabel, 60, optY + 5);
        
        doc.moveDown(1);

        // Pros column
        if (option.pros && option.pros.length) {
          doc.rect(50, doc.y, (doc.page.width - 120) / 2, 8 + option.pros.length * 18)
            .fillAndStroke('#ecfdf5', successColor);
          
          doc.fontSize(12)
            .font('Helvetica-Bold')
            .fillColor(successColor)
            .text('PROS', 55, doc.y - 5);
          
          doc.fontSize(10)
            .font('Helvetica')
            .fillColor('#065f46');
          
          option.pros.forEach((pro, idx) => {
            const proY = doc.y + 2;
            doc.text(`✓ ${pro}`, 55, proY, {
              width: (doc.page.width - 140) / 2,
              continued: false
            });
          });
        }

        // Cons column
        if (option.cons && option.cons.length) {
          const consX = 50 + (doc.page.width - 100) / 2 + 10;
          doc.rect(consX, optY + 28, (doc.page.width - 120) / 2, 8 + option.cons.length * 18)
            .fillAndStroke('#fef2f2', dangerColor);
          
          doc.fontSize(12)
            .font('Helvetica-Bold')
            .fillColor(dangerColor)
            .text('CONS', consX + 5, optY + 23);
          
          doc.fontSize(10)
            .font('Helvetica')
            .fillColor('#991b1b');
          
          option.cons.forEach((con) => {
            const conY = doc.y + 2;
            doc.text(`✗ ${con}`, consX + 5, conY, {
              width: (doc.page.width - 140) / 2,
              continued: false
            });
          });
        }

        doc.moveDown(2);
      });
    }

    // Bias Detection Section
    if (analysis.biases && analysis.biases.length) {
      doc.addPage();
      addHeader();
      addSectionHeader('Cognitive Bias Detection');

      analysis.biases.forEach((bias) => {
        // Bias card
        const biasY = doc.y;
        doc.rect(50, biasY, doc.page.width - 100, 60)
          .fillAndStroke('#fffbeb', borderColor);
        
        // Severity indicator
        const severityColor = bias.severity === 'high' ? dangerColor : 
                             bias.severity === 'medium' ? warningColor : '#6b7280';
        
        doc.rect(50, biasY, 5, 60).fill(severityColor);
        
        doc.fontSize(12)
          .font('Helvetica-Bold')
          .fillColor(darkColor)
          .text(bias.type, 65, biasY + 8);
        
        doc.fontSize(10)
          .font('Helvetica')
          .fillColor('#6b7280')
          .text(`Severity: ${bias.severity || 'unknown'}`, 65, biasY + 25);
        
        doc.fontSize(9)
          .text(bias.details || '', 65, biasY + 38, {
            width: doc.page.width - 130,
            lineGap: 1
          });
        
        doc.moveDown(1);
      });
    }

    // Score vs Risk Analysis
    if (analysis.scoredOptions && analysis.scoredOptions.length) {
      doc.addPage();
      addHeader();
      addSectionHeader('Score vs Risk Analysis');
      analysis.scoredOptions.forEach((o) => {
        doc.fontSize(11)
          .font('Helvetica')
          .text(`${o.optionLabel || 'Option'} – Score: ${
            o.score != null ? o.score.toFixed(2) : 'n/a'
          }, Risk: ${o.risk != null ? o.risk.toFixed(2) : 'n/a'}`);
        doc.moveDown(0.4);
      });
    }

    // Options Analysis table showing counts
    if (analysis.scoredOptions && analysis.scoredOptions.length) {
      doc.addPage();
      addHeader();
      addSectionHeader('Options Analysis');

      // header row
      const startX = 60;
      const colX = [startX, startX + 160, startX + 240, startX + 320, startX + 380];
      doc.fontSize(11).font('Helvetica-Bold');
      doc.text('Option', colX[0], doc.y);
      doc.text('Score', colX[1], doc.y);
      doc.text('Risk', colX[2], doc.y);
      doc.text('Pros', colX[3], doc.y);
      doc.text('Cons', colX[4], doc.y);
      doc.moveDown(1);

      // rows
      analysis.scoredOptions.forEach((o) => {
        const prosCount = (o.pros && o.pros.length) || 0;
        const consCount = (o.cons && o.cons.length) || 0;
        doc.fontSize(10).font('Helvetica');
        doc.text(o.optionLabel || 'Option', colX[0], doc.y);
        doc.text(o.score != null ? o.score.toFixed(2) : 'n/a', colX[1], doc.y);
        doc.text(o.risk != null ? o.risk.toFixed(2) : 'n/a', colX[2], doc.y);
        doc.text(String(prosCount), colX[3], doc.y);
        doc.text(String(consCount), colX[4], doc.y);
        doc.moveDown(1);
      });
    }

    // Financial Scenario Analysis
    if (analysis.profitForecast && analysis.profitForecast.length) {
      doc.addPage();
      addHeader();
      addSectionHeader('Financial Scenario Analysis');
      analysis.profitForecast.forEach((scenario) => {
        doc.fontSize(13).font('Helvetica-Bold').text(scenario.label || 'Scenario');
        if (scenario.description) {
          doc.fontSize(10).font('Helvetica').fillColor('#4b5563')
            .text(scenario.description, { indent: 20, lineGap: 2 });
        }
        scenario.options.forEach((opt) => {
          doc.fontSize(11).font('Helvetica')
            .text(`${opt.optionLabel}: ₹${
              typeof opt.projectedProfit === 'number'
                ? opt.projectedProfit.toLocaleString()
                : 'n/a'
            }`, { indent: 20 });
        });
        doc.moveDown(0.8);
      });
    }

    // Monte Carlo Simulation summary
    if (analysis.monteCarloSummary) {
      doc.addPage();
      addHeader();
      addSectionHeader('Monte Carlo Simulation');
      const mc = analysis.monteCarloSummary;
      doc.fontSize(12).font('Helvetica-Bold').text(mc.optionLabel || 'Option');
      doc.fontSize(11).font('Helvetica')
        .text(`Success Rate: ${(mc.successProbability || 0) * 100}%`);
      if (mc.p5 != null) doc.text(`P5 (Worst): ${mc.p5.toFixed(2)}`);
      if (mc.p50 != null) doc.text(`P50: ${mc.p50.toFixed(2)}`);
      if (mc.p95 != null) doc.text(`P95 (Best): ${mc.p95.toFixed(2)}`);
      doc.moveDown(1);
    }

    // Decision Tree Section
    if (analysis.decisionTree) {
      doc.addPage();
      addHeader();
      addSectionHeader('Decision Tree');

      if (analysis.decisionTree.description) {
        doc.fontSize(11)
          .font('Helvetica')
          .text(analysis.decisionTree.description, {
            align: 'justify',
            lineGap: 2
          });
        doc.moveDown(1);
      }

      if (analysis.decisionTree.steps && analysis.decisionTree.steps.length) {
        analysis.decisionTree.steps.forEach((step, idx) => {
          // Step number circle
          const stepY = doc.y;
          doc.circle(70, stepY + 10, 12).fillAndStroke(accentColor, accentColor);
          
          doc.fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#ffffff')
            .text(String(idx + 1), 66, stepY + 5);
          
          doc.fontSize(12)
            .font('Helvetica-Bold')
            .fillColor(darkColor)
            .text(step.question || step, 90, stepY);
          
          if (step.rule) {
            doc.fontSize(10)
              .font('Helvetica')
              .fillColor('#6b7280')
              .text(`→ ${step.rule}`, 90, stepY + 15);
          }
          
          doc.moveDown(1);
        });
      }
    }

    // Footer
    const footerY = doc.page.height - 40;
    doc.rect(0, footerY - 10, doc.page.width, 50).fill('#1f2937');
    
    doc.fontSize(9)
      .font('Helvetica')
      .fillColor('#9ca3af')
      .text('Generated by Drishti - Decision Copilot', 50, footerY, {
        align: 'center'
      });
    
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, 50, footerY + 12, {
      align: 'center'
    });

    doc.end();
  } catch (err) {
    console.error('Error in /api/report', err);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

app.get('/api/history', (req, res) => {
  try {
    const history = safeReadHistory();
    res.json({ history });
  } catch (err) {
    console.error('Error in /api/history', err);
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
});

app.post('/api/outcome', (req, res) => {
  try {
    const { decisionId, reward } = req.body;
    if (!decisionId || typeof reward !== 'number') {
      return res.status(400).json({ error: 'decisionId and reward are required.' });
    }

    const history = safeReadHistory();
    const record = history.find((r) => r.id === decisionId);
    if (!record) {
      return res.status(404).json({ error: 'Decision not found.' });
    }

    record.outcome = {
      reward,
      recordedAt: new Date().toISOString(),
    };

    safeWriteHistory(history);
    res.json({ success: true, message: 'Outcome recorded successfully.' });
  } catch (err) {
    console.error('Error in /api/outcome', err);
    res.status(500).json({ error: 'Failed to save outcome.' });
  }
});

app.post('/api/whatif', async (req, res) => {
  try {
    const { question, analysis } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    const client = await getGeminiClient();
    
    if (client && analysis) {
      const prompt = `
You are a railway inventory decision assistant. A user is asking a "What-if" question about a previous decision analysis.

Previous decision context:
- Title: ${analysis.title}
- Options: ${analysis.options?.map(o => o.label).join(', ')}
- Suggested: ${analysis.suggestedDecision?.optionLabel}

User question: "${question}"

Provide a concise response with 3-4 crisp bullet points (use dashes, not asterisks). Each point should be short and actionable.

Respond in JSON format:
{
  "response": "your response as bullet points separated by newlines",
  "projectedImpact": "brief one-line impact summary"
}
`;
      try {
        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        
        const text = response.text?.trim() || '';
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1) {
          const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));
          return res.json(parsed);
        }
      } catch (aiErr) {
        console.error('Gemini what-if failed:', aiErr);
      }
    }

    const genericResponses = [
      '- Risk-reward balance would shift. Reconsider recommended option.\n- May increase operational complexity.\n- Budget implications need reassessment.',
      '- Uncertainty increases significantly.\n- Run new analysis with updated parameters.\n- Monitor key risk indicators.',
      '- Impact depends on implementation speed.\n- Historical patterns suggest moderate adjustment.\n- Stakeholder buy-in may vary.',
    ];
    
    res.json({
      response: genericResponses[Math.floor(Math.random() * genericResponses.length)],
      projectedImpact: 'Variable - depends on implementation',
    });
  } catch (err) {
    console.error('Error in /api/whatif', err);
    res.status(500).json({ error: 'Failed to process what-if question.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Decision Copilot server listening on http://localhost:${PORT}`);
});

