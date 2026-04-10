(() => {
  const form = document.getElementById('decision-form');
  const optionsContainer = document.getElementById('options-container');
  const addOptionBtn = document.getElementById('add-option');
  const preferredCheckbox = document.getElementById(
    'preferred-option-checkbox'
  );
  const analyzeBtn = document.getElementById('analyze-button');
  const analyzeSpinner = document.getElementById('analyze-spinner');
  const statusPill = document.getElementById('status-pill');

  const prosConsEmpty = document.getElementById('pros-cons-empty');
  const prosConsContent = document.getElementById('pros-cons-content');
  const prosConsPill = document.getElementById('pros-cons-pill');
  const biasList = document.getElementById('bias-list');
  const biasCount = document.getElementById('bias-count');
  const suggestionBox = document.getElementById('suggestion-box');
  const confidencePill = document.getElementById('confidence-pill');
  const treeContent = document.getElementById('tree-content');
  const treeHint = document.getElementById('tree-hint');
  const downloadBtn = document.getElementById('download-pdf');
const footerMeta = document.getElementById('footer-meta');

  const scenarioSection = document.getElementById('scenario-analysis-section');
  const profitForecastContent = document.getElementById('profit-forecast-content');
  const budgetImpactContent = document.getElementById('budget-impact-content');
  const deadlineImpactContent = document.getElementById('deadline-impact-content');

  const monteCarloSection = document.getElementById('monte-carlo-section');
  const monteCarloContent = document.getElementById('monte-carlo-content');

  const whatIfInput = document.getElementById('whatif-input');
  const whatIfButton = document.getElementById('whatif-button');
  const whatIfSpinner = document.getElementById('whatif-spinner');
  const whatIfResult = document.getElementById('whatif-result');

  const shapSection = document.getElementById('shap-section');
  const shapContent = document.getElementById('shap-content');

  const historySection = document.getElementById('history-section');
  const historyEmpty = document.getElementById('history-empty');
  const historyContent = document.getElementById('history-content');
  const outcomeTracking = document.getElementById('outcome-tracking');
  const outcomeDecisionSelect = document.getElementById('outcome-decision-select');
  const outcomeRating = document.getElementById('outcome-rating');
  const saveOutcomeBtn = document.getElementById('save-outcome');
  const refreshHistoryBtn = document.getElementById('refresh-history');

  let lastAnalysis = null;
  let currentDecisionId = null;
  let optionCounter = 0;

  function refreshOptionNumbers() {
    Array.from(optionsContainer.children).forEach((node, idx) => {
      const displayIndex = idx + 1;
      const handle = node.querySelector('[data-role="option-index"]');
      if (handle) {
        handle.textContent = String(displayIndex);
      }
      const input = node.querySelector('input');
      if (input) {
        input.placeholder = `Option ${displayIndex}`;
      }
    });
  }

  function setStatus(label, tone = 'idle') {
    statusPill.textContent = label;
    const base = 'text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 ';
    if (tone === 'working') {
      statusPill.className =
        base +
        'border border-sky-500/70 bg-sky-500/10 text-sky-300 shadow-[0_0_0_1px_rgba(56,189,248,0.3)]';
    } else if (tone === 'ready') {
      statusPill.className =
        base +
        'border border-emerald-500/70 bg-emerald-500/10 text-emerald-300';
    } else if (tone === 'error') {
      statusPill.className =
        base + 'border border-rose-500/70 bg-rose-500/10 text-rose-300';
    } else {
      statusPill.className =
        base + 'border border-slate-700 text-slate-400 bg-transparent';
    }
  }

  function addOption(initialLabel = '') {
    optionCounter += 1;
    const index = optionsContainer.children.length + 1;
    const id = `opt-${optionCounter}`;

    const wrapper = document.createElement('div');
    wrapper.className =
      'flex items-center gap-2 rounded-xl bg-slate-950/60 border border-slate-800 px-2 py-1.5 group';
    wrapper.dataset.optionId = id;

    const handle = document.createElement('div');
    handle.className =
      'text-[11px] text-slate-500 w-4 text-center select-none font-mono';
    handle.dataset.role = 'option-index';
    handle.textContent = String(index);

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Option ${index}`;
    input.value = initialLabel;
    input.className =
      'flex-1 bg-transparent border-none outline-none text-xs text-slate-100 placeholder-slate-500';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className =
      'text-[10px] text-slate-500 hover:text-rose-400 px-1 opacity-0 group-hover:opacity-100 transition-opacity';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => {
      wrapper.remove();
      if (!optionsContainer.children.length) {
        addOption();
      }
      refreshOptionNumbers();
    });

    wrapper.appendChild(handle);
    wrapper.appendChild(input);
    wrapper.appendChild(removeBtn);
    optionsContainer.appendChild(wrapper);
    refreshOptionNumbers();
  }

  function collectPayload() {
    const title = document.getElementById('title').value.trim();
    const context = document.getElementById('context').value.trim();
    const notes = document.getElementById('notes').value.trim();

    const rawOptions = Array.from(optionsContainer.children)
      .map((node) => {
        const input = node.querySelector('input');
        const label = (input?.value || '').trim();
        const id = node.dataset.optionId;
        return label
          ? {
              id,
              label,
            }
          : null;
      })
      .filter(Boolean);

    const options =
      rawOptions.length > 0
        ? rawOptions
        : [
            { id: 'opt-1', label: 'Option 1' },
            { id: 'opt-2', label: 'Option 2' },
          ];

    const preferredOptionId =
      preferredCheckbox.checked && options.length
        ? options[0].id
        : undefined;

    return { title, context, notes, options, preferredOptionId };
  }

  function cleanBulletText(text) {
    if (!text) return '';
    return String(text).replace(/^[\s*+\-•]+/, '').trim();
  }

  function renderProsCons(argumentsByOption) {
    prosConsContent.innerHTML = '';

    argumentsByOption
      .filter((o) => o.optionId !== '__general__')
      .forEach((o) => {
        const card = document.createElement('div');
        card.className =
          'border border-slate-800 rounded-xl bg-slate-950/40 p-3 space-y-2';

        const header = document.createElement('div');
        header.className = 'flex items-center justify-between gap-2';
        header.innerHTML = `
          <div class="font-medium text-slate-100 text-xs">${o.optionLabel}</div>
          <div class="flex items-center gap-1 text-[10px] text-slate-400">
            <span>+${o.pros.length}</span>
            <span>−${o.cons.length}</span>
          </div>
        `;

        const totalSignals = o.pros.length + o.cons.length || 1;
        const prosShare = (o.pros.length / totalSignals) * 100;
        const consShare = (o.cons.length / totalSignals) * 100;

        const barWrapper = document.createElement('div');
        barWrapper.className =
          'mt-1 h-2 rounded-full bg-slate-900/80 overflow-hidden flex';
        barWrapper.title = 'Relative balance of pros (green) vs cons (red)';

        const prosBar = document.createElement('div');
        prosBar.className = 'h-full bg-emerald-400/70 transition-all';
        prosBar.style.width = `${prosShare}%`;

        const consBar = document.createElement('div');
        consBar.className = 'h-full bg-rose-400/70 transition-all';
        consBar.style.width = `${consShare}%`;

        barWrapper.appendChild(prosBar);
        barWrapper.appendChild(consBar);

        const body = document.createElement('div');
        body.className = 'grid grid-cols-2 gap-2 items-stretch';

        const prosCol = document.createElement('div');
        prosCol.className = 'bg-emerald-950/40 border border-emerald-800/50 rounded-lg p-2';
        prosCol.innerHTML = `<div class="text-[11px] text-emerald-300 mb-1 font-medium underline decoration-emerald-400 underline-offset-2">Pros</div>`;
        if (o.pros.length) {
          const list = document.createElement('ul');
          list.className = 'space-y-0.5';
          o.pros.forEach((p) => {
            const li = document.createElement('li');
            li.className = 'text-[11px] text-slate-200 flex gap-1';
            li.innerHTML = `<span class="text-emerald-400 mt-px">+</span><span>${cleanBulletText(
              p
            )}</span>`;
            list.appendChild(li);
          });
          prosCol.appendChild(list);
        } else {
          const empty = document.createElement('div');
          empty.className = 'text-[11px] text-slate-500 italic';
          empty.textContent = 'No explicit pros captured.';
          prosCol.appendChild(empty);
        }

        const consCol = document.createElement('div');
        consCol.className = 'bg-rose-950/40 border border-rose-800/50 rounded-lg p-2';
        consCol.innerHTML = `<div class="text-[11px] text-rose-300 mb-1 font-medium underline decoration-rose-400 underline-offset-2">Cons</div>`;
        if (o.cons.length) {
          const list = document.createElement('ul');
          list.className = 'space-y-0.5';
          o.cons.forEach((c) => {
            const li = document.createElement('li');
            li.className = 'text-[11px] text-slate-200 flex gap-1';
            li.innerHTML = `<span class="text-rose-400 mt-px">−</span><span>${cleanBulletText(
              c
            )}</span>`;
            list.appendChild(li);
          });
          consCol.appendChild(list);
        } else {
          const empty = document.createElement('div');
          empty.className = 'text-[11px] text-slate-500 italic';
          empty.textContent = 'No explicit cons captured.';
          consCol.appendChild(empty);
        }

        body.appendChild(prosCol);
        body.appendChild(consCol);

        card.appendChild(header);
        card.appendChild(barWrapper);
        card.appendChild(body);
        prosConsContent.appendChild(card);
      });

    prosConsEmpty.classList.add('hidden');
    prosConsContent.classList.remove('hidden');
    prosConsPill.classList.remove('hidden');
    prosConsPill.textContent = 'updated';
  }

  function renderBiases(biases) {
    biasList.innerHTML = '';
    biasCount.textContent = `${biases.length} signal${
      biases.length === 1 ? '' : 's'
    }`;

    if (!biases.length) {
      biasList.textContent =
        'No strong bias patterns detected in your notes. That does not mean there are none—invite someone to challenge the current framing.';
      return;
    }

    const list = document.createElement('div');
    list.className = 'space-y-2';

    biases.forEach((b) => {
      const card = document.createElement('div');
      card.className =
        'border border-slate-700 rounded-lg px-2.5 py-2 bg-slate-950/40';
      card.innerHTML = `
        <div class="flex items-center justify-between gap-2 mb-0.5">
          <div class="text-[11px] font-medium text-slate-100">${b.type}</div>
          <span class="text-[10px] rounded-full px-1.5 py-0.5 border ${
            b.severity === 'high'
              ? 'border-rose-500/60 text-rose-300'
              : 'border-amber-400/60 text-amber-200'
          }">${b.severity}</span>
        </div>
        <div class="text-[11px] text-slate-300 mb-0.5">
          ${b.details}
        </div>
        <div class="text-[10px] text-slate-400">
          Next step: ${b.recommendation}
        </div>
      `;
      list.appendChild(card);
    });

    biasList.appendChild(list);
  }

  function renderSuggestion(analysis) {
    if (!analysis || !analysis.suggestedDecision) {
      confidencePill.classList.add('hidden');
      suggestionBox.textContent =
        'Once you run an analysis, I’ll outline the most defensible option and why.';
      return;
    }

    const d = analysis.suggestedDecision;
    const pct = Math.round((d.confidence || 0) * 100);

    confidencePill.classList.remove('hidden');
    confidencePill.textContent = `Confidence: ${pct}%`;

    const option = analysis.options.find((o) => o.id === d.optionId);
    const label = option ? option.label : d.optionLabel;

    const runnerUp =
      analysis.scoredOptions && analysis.scoredOptions[1]
        ? analysis.scoredOptions[1]
        : null;

    suggestionBox.innerHTML = `
      <div class="text-sm">
        <span class="text-slate-400">Suggested path:</span>
        <span class="font-medium text-slate-100">${label}</span>
      </div>
      <div class="text-[11px] text-slate-300 mt-1.5">
        Based on the captured arguments, this option has the strongest
        pros‑to‑cons ratio and an acceptable risk band.
      </div>
      ${
        runnerUp
          ? `<div class="text-[11px] text-slate-400 mt-1.5">
               Keep ${runnerUp.optionLabel} in view as a credible alternative, especially if new risks emerge.
             </div>`
          : ''
      }
      <div class="text-[11px] text-slate-500 mt-2">
        Use this as a stress‑test, not a replacement, for your team’s judgment.
      </div>
    `;
  }

  function renderTree(tree) {
    if (!tree) {
      treeContent.textContent =
        'I’ll translate the analysis into a simple decision path you can explain in 30 seconds.';
      treeHint.textContent = '';
      return;
    }

    treeHint.textContent = 'Use this to narrate your reasoning.';

    const container = document.createElement('div');
    container.className = 'space-y-2';

    if (tree.description) {
      const desc = document.createElement('div');
      desc.className = 'text-[11px] text-slate-300';
      desc.textContent = tree.description;
      container.appendChild(desc);
    }

    if (tree.steps && tree.steps.length) {
      const list = document.createElement('ol');
      list.className = 'space-y-1.5 mt-1';
      tree.steps.forEach((step, idx) => {
        const li = document.createElement('li');
        li.className =
          'border-l border-slate-700 pl-2.5 text-[11px] text-slate-200';
        li.innerHTML = `
          <div class="font-medium text-slate-100">Step ${idx + 1}</div>
          <div class="text-slate-200">${step.question}</div>
          <div class="text-slate-400 mt-0.5">${step.rule}</div>
        `;
        list.appendChild(li);
      });
      container.appendChild(list);
    }

    if (tree.summaryFactors && tree.summaryFactors.length) {
      const footer = document.createElement('div');
      footer.className = 'text-[10px] text-slate-500 mt-1.5';
      footer.textContent = `Key filters: ${tree.summaryFactors.join(', ')}`;
      container.appendChild(footer);
    }

treeContent.innerHTML = '';
    treeContent.appendChild(container);
  }

  function renderScenarioAnalysis(analysis) {
    // Always show the section
    scenarioSection.classList.remove('hidden');
    
    profitForecastContent.innerHTML = '';
    budgetImpactContent.innerHTML = '';
    deadlineImpactContent.innerHTML = '';

    // If no data, show a message
    if (!analysis.profitForecast || !analysis.profitForecast.length) {
      profitForecastContent.innerHTML = '<div class="text-xs text-slate-400 p-2">No financial data available. Add more context to see projections.</div>';
      budgetImpactContent.innerHTML = '<div class="text-xs text-slate-400 p-2">No budget data available.</div>';
      deadlineImpactContent.innerHTML = '<div class="text-xs text-slate-400 p-2">No deadline data available.</div>';
      return;
    }

    analysis.profitForecast.forEach((scenario) => {
      const scenarioCard = document.createElement('div');
      scenarioCard.className = 'border border-slate-800 rounded-xl bg-slate-950/40 p-3 space-y-2';
      
      const header = document.createElement('div');
      header.className = 'flex items-center justify-between';
      header.innerHTML = `
        <span class="text-[11px] font-medium text-slate-100 capitalize">${scenario.label} Case</span>
        <span class="text-[10px] text-slate-400">${scenario.description.substring(0, 50)}...</span>
      `;
      
      const optionsList = document.createElement('div');
      optionsList.className = 'space-y-1';
      scenario.options.forEach((opt) => {
        const optDiv = document.createElement('div');
        optDiv.className = 'flex items-center justify-between text-[11px]';
        optDiv.innerHTML = `
          <span class="text-slate-300">${opt.optionLabel}</span>
          <span class="text-emerald-300 font-mono">₹${opt.projectedProfit.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
        `;
        optionsList.appendChild(optDiv);
      });
      
      scenarioCard.appendChild(header);
      scenarioCard.appendChild(optionsList);
      profitForecastContent.appendChild(scenarioCard);
    });

    analysis.budgetImpact.forEach((b) => {
      const card = document.createElement('div');
      card.className = 'border border-slate-800 rounded-xl bg-slate-950/40 px-3 py-2.5 flex items-center justify-between';
      const impactColor = b.relativeChange > 0 ? 'text-rose-300' : b.relativeChange < 0 ? 'text-emerald-300' : 'text-slate-300';
      card.innerHTML = `
        <span class="text-[11px] text-slate-100">${b.optionLabel}</span>
        <span class="text-[10px] ${impactColor}">${b.impactCategory} (${b.relativeChange > 0 ? '+' : ''}${b.relativeChange.toFixed(2)})</span>
      `;
      budgetImpactContent.appendChild(card);
    });

    analysis.deadlineImpact.forEach((d) => {
      const card = document.createElement('div');
      card.className = 'border border-slate-800 rounded-xl bg-slate-950/40 px-3 py-2.5 flex items-center justify-between';
      const riskColor = d.riskCategory === 'high schedule risk' ? 'text-rose-300' : d.riskCategory === 'moderate schedule risk' ? 'text-amber-300' : 'text-emerald-300';
      card.innerHTML = `
        <span class="text-[11px] text-slate-100">${d.optionLabel}</span>
        <span class="text-[10px] ${riskColor}">${d.riskCategory} (${d.expectedDelayWeeks.toFixed(1)}w)</span>
      `;
      deadlineImpactContent.appendChild(card);
    });
  }

  function renderMonteCarlo(mc) {
    // Always show the section
    monteCarloSection.classList.remove('hidden');
    monteCarloContent.innerHTML = '';

    // If no data, show a message
    if (!mc) {
      monteCarloContent.innerHTML = '<div class="text-xs text-slate-400 p-2">Run analysis to see Monte Carlo simulation results.</div>';
      return;
    }

    const card = document.createElement('div');
    card.className = 'border border-slate-800 rounded-xl bg-slate-950/40 p-3 space-y-2';

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between';
    header.innerHTML = `
      <span class="text-[11px] font-medium text-slate-100">${mc.optionLabel}</span>
      <span class="text-[10px] text-emerald-300">${(mc.successProbability * 100).toFixed(1)}% success rate</span>
    `;

    const barContainer = document.createElement('div');
    barContainer.className = 'space-y-1';
    
    const createBar = (label, value, color) => {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-2 text-[10px]';
      row.innerHTML = `
        <span class="w-10 text-slate-400">${label}</span>
        <div class="flex-1 h-2 rounded-full bg-slate-900 overflow-hidden">
          <div class="h-full ${color}" style="width: ${Math.min(100, Math.max(0, (value + 5) * 10))}%"></div>
        </div>
        <span class="w-8 text-right text-slate-300 font-mono">${value.toFixed(2)}</span>
      `;
      return row;
    };

    barContainer.appendChild(createBar('P5 (worst)', mc.p5, 'bg-rose-400/70'));
    barContainer.appendChild(createBar('P50', mc.p50, 'bg-amber-400/70'));
    barContainer.appendChild(createBar('P95 (best)', mc.p95, 'bg-emerald-400/70'));

    card.appendChild(header);
    card.appendChild(barContainer);
    monteCarloContent.appendChild(card);
  }

  function renderSHAP(explanations) {
    if (!explanations || !explanations.length) {
      shapSection.classList.add('hidden');
      return;
    }

    // Always show the section
    shapSection.classList.remove('hidden');
    
    // If no data, show a message
    if (!explanations || !explanations.length) {
      shapContent.innerHTML = '<div class="text-xs text-slate-400 p-2">Run analysis to see Explainable AI (SHAP) results.</div>';
      return;
    }
    
    shapContent.innerHTML = '';

    explanations.forEach((exp) => {
      const card = document.createElement('div');
      card.className = 'border border-slate-800 rounded-xl bg-slate-950/40 p-3 space-y-2';

      const header = document.createElement('div');
      header.className = 'flex items-center justify-between';
      header.innerHTML = `
        <span class="text-[11px] font-medium text-slate-100">${exp.optionLabel}</span>
        <span class="text-[10px] text-slate-400">Score: ${exp.approximateScore.toFixed(2)}</span>
      `;

      const contrib = exp.shapLikeContributions;
      const contribList = document.createElement('div');
      contribList.className = 'space-y-1';

      const contribItems = [
        { label: 'Pros', value: contrib.prosCount, positive: true },
        { label: 'Cons', value: contrib.consCount, positive: false },
        { label: 'Uncertainty', value: contrib.uncertainty, positive: false },
        { label: 'Risk', value: contrib.implementationRisk, positive: false },
        { label: 'RL Bonus', value: contrib.biasAdjustment, positive: true },
      ];

      contribItems.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between text-[10px]';
        const color = item.value >= 0 ? 'text-emerald-300' : 'text-rose-300';
        row.innerHTML = `
          <span class="text-slate-400">${item.label}</span>
          <span class="${color} font-mono">${item.value >= 0 ? '+' : ''}${item.value.toFixed(2)}</span>
        `;
        contribList.appendChild(row);
      });

      const explanation = document.createElement('div');
      explanation.className = 'text-[10px] text-slate-500 italic mt-1';
      explanation.textContent = exp.explanation;

      card.appendChild(header);
      card.appendChild(contribList);
      card.appendChild(explanation);
      shapContent.appendChild(card);
    });
  }

  async function renderHistory() {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      
      if (!data.history || data.history.length === 0) {
        historyEmpty.classList.remove('hidden');
        historyContent.classList.add('hidden');
        outcomeTracking.classList.add('hidden');
        return;
      }

      historyEmpty.classList.add('hidden');
      historyContent.classList.remove('hidden');
      outcomeTracking.classList.remove('hidden');
      historyContent.innerHTML = '';
      outcomeDecisionSelect.innerHTML = '<option value="">Select a decision...</option>';

      data.history.forEach((record) => {
        const item = document.createElement('div');
        item.className = 'border border-slate-800 rounded-xl bg-slate-950/40 px-3 py-2 text-[11px]';
        
        const date = new Date(record.createdAt).toLocaleDateString();
        const outcomeBadge = record.outcome ? 
          `<span class="text-[10px] px-1.5 py-0.5 rounded-full ${record.outcome.reward > 0 ? 'bg-emerald-500/20 text-emerald-300' : record.outcome.reward < 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-700 text-slate-400'}">${record.outcome.reward > 0 ? '+' : ''}${record.outcome.reward}</span>` :
          '<span class="text-[10px] text-amber-400">Pending</span>';

        item.innerHTML = `
          <div class="flex items-center justify-between gap-2">
            <span class="text-slate-100 font-medium truncate">${record.analysisSummary?.title || 'Untitled'}</span>
            ${outcomeBadge}
          </div>
          <div class="text-[10px] text-slate-500 mt-0.5">${date} → ${record.analysisSummary?.suggestedOptionLabel || 'N/A'}</div>
        `;
        historyContent.appendChild(item);

        const option = document.createElement('option');
        option.value = record.id;
        option.textContent = `${record.analysisSummary?.title || 'Untitled'} - ${record.analysisSummary?.suggestedOptionLabel || 'N/A'}`;
        outcomeDecisionSelect.appendChild(option);
      });
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }

  async function simulateWhatIf() {
    const question = whatIfInput.value.trim();
    if (!question || !lastAnalysis) return;

    whatIfButton.disabled = true;
    whatIfSpinner.classList.remove('hidden');
    whatIfResult.classList.add('hidden');

    try {
      const res = await fetch('/api/whatif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, analysis: lastAnalysis }),
      });

      const data = await res.json();
      const responseText = data.response ? data.response.split('\n').map(line => `<div class="text-slate-300">${line}</div>`).join('') : 'Simulation complete.';
      whatIfResult.innerHTML = `
        <div class="font-medium text-slate-100 mb-2">${question}</div>
        ${responseText}
        ${data.projectedImpact ? `<div class="mt-2 text-emerald-300 font-medium">Projected Impact: ${data.projectedImpact}</div>` : ''}
      `;
      whatIfResult.classList.remove('hidden');
    } catch (err) {
      console.error('What-if simulation failed:', err);
      whatIfResult.innerHTML = `<div class="text-rose-300">Simulation failed. Please try again.</div>`;
      whatIfResult.classList.remove('hidden');
    } finally {
      whatIfButton.disabled = false;
      whatIfSpinner.classList.add('hidden');
    }
  }

  async function saveOutcome() {
    const decisionId = outcomeDecisionSelect.value;
    const reward = parseInt(outcomeRating.value);
    
    if (!decisionId || isNaN(reward)) {
      alert('Please select a decision and rate the outcome.');
      return;
    }

    try {
      await fetch('/api/outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionId, reward }),
      });
      
      outcomeRating.value = '';
      renderHistory();
      alert('Outcome saved! This will improve future recommendations.');
    } catch (err) {
      console.error('Failed to save outcome:', err);
      alert('Failed to save outcome.');
    }
  }

  async function analyze(event) {
    event?.preventDefault();
    const payload = collectPayload();

    analyzeBtn.disabled = true;
    analyzeSpinner.classList.remove('hidden');
    setStatus('analyzing…', 'working');

    try {
      console.log('Sending payload to server:', payload);
      
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error response:', errorText);
        throw new Error(`Server returned ${res.status}: ${errorText}`);
      }

      const analysis = await res.json();
      console.log('Analysis response:', analysis);
      lastAnalysis = analysis;

      renderProsCons(analysis.argumentsByOption || []);
      renderBiases(analysis.biases || []);
      renderSuggestion(analysis);
      renderTree(analysis.decisionTree || null);
      renderScenarioAnalysis(analysis);
      renderMonteCarlo(analysis.monteCarloSummary);
      renderSHAP(analysis.explanations);
      
      currentDecisionId = analysis.decisionId;
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Download Report`;
      setStatus('analysis ready', 'ready');
      
      renderHistory();
    } catch (err) {
      console.error('Analysis error:', err);
      setStatus('error', 'error');
      alert('Failed to analyze: ' + err.message);
    } finally {
      analyzeBtn.disabled = false;
      analyzeSpinner.classList.add('hidden');
    }
  }

  async function downloadReport() {
    if (!lastAnalysis) return;
    try {
      downloadBtn.disabled = true;
      downloadBtn.innerHTML = `<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Generating…`;

      const res = await fetch('/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lastAnalysis),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Drishti-Decision-Report.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate the PDF report. Please try again.');
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Download Report`;
    }
  }

function initFooter() {
    if (!footerMeta) return;
    const now = new Date();
    footerMeta.textContent = `Session ${now
      .toISOString()
      .slice(0, 10)} • v2.0 AI Enhanced`;
  }

  addOption('Option A');
  addOption('Option B');
  initFooter();

form.addEventListener('submit', analyze);
  addOptionBtn.addEventListener('click', () => addOption());
  downloadBtn.addEventListener('click', downloadReport);
  whatIfButton.addEventListener('click', simulateWhatIf);
  whatIfInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') simulateWhatIf(); });
  refreshHistoryBtn.addEventListener('click', renderHistory);
  saveOutcomeBtn.addEventListener('click', saveOutcome);
  
  renderHistory();
})();

