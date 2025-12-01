// main.js
(() => {
  const STORAGE_KEY = "pfm_data_v1";

  const defaultState = {
    settings: {
      currency: "ZAR",
      theme: "dark",
      beginnerHints: true,
      expenseCategories: ["Groceries", "Transport", "Rent", "Eating Out", "Other"],
      incomeCategories: ["Salary", "Freelance", "Gifts", "Other"],
    },
    transactions: [],
  };

  let state = loadState();
  let charts = {
    trend: null,
    expensePie: null,
    incomePie: null,
  };

  // DOM helpers
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  init();

  function init() {
    applyTheme(state.settings.theme);
    applyHintsState(state.settings.beginnerHints);
    $("#footer-year").textContent = new Date().getFullYear();

    setupNav();
    setupThemeToggle();
    setupHomeButtons();
    setupForms();
    setupFilters();
    setupSettings();
    initCharts();
    refreshUI();
  }

  /* ---------- State & Storage ---------- */

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(defaultState);
      const parsed = JSON.parse(raw);
      return {
        settings: { ...defaultState.settings, ...(parsed.settings || {}) },
        transactions: parsed.transactions || [],
      };
    } catch (e) {
      console.error("Failed to load state", e);
      return structuredClone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function resetState() {
    state = structuredClone(defaultState);
    saveState();
    refreshUI();
  }

  function addTransaction(tx) {
    state.transactions.push(tx);
    saveState();
  }

  function updateTransaction(id, patch) {
    const idx = state.transactions.findIndex((t) => t.id === id);
    if (idx !== -1) {
      state.transactions[idx] = { ...state.transactions[idx], ...patch };
      saveState();
    }
  }

  function deleteTransaction(id) {
    state.transactions = state.transactions.filter((t) => t.id !== id);
    saveState();
  }

  function deleteBulk(type, ids) {
    const set = new Set(ids);
    state.transactions = state.transactions.filter(
      (t) => !(t.type === type && set.has(t.id))
    );
    saveState();
  }

  /* ---------- Nav & Theme ---------- */

  function setupNav() {
    const navButtons = $$(".nav-link");
    navButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = btn.dataset.view;
        navButtons.forEach((b) => b.classList.toggle("active", b === btn));
        $$(".view").forEach((v) => v.classList.remove("active"));
        const target = $("#view-" + view);
        if (target) target.classList.add("active");
      });
    });
  }

  function setupThemeToggle() {
    const toggle = $("#theme-toggle");
    if (!toggle) return;
    toggle.addEventListener("click", () => {
      const next = state.settings.theme === "dark" ? "light" : "dark";
      state.settings.theme = next;
      saveState();
      applyTheme(next);
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  function applyHintsState(on) {
    document.documentElement.setAttribute("data-hints", on ? "on" : "off");
  }

  /* ---------- Home Quick Buttons ---------- */

  function setupHomeButtons() {
    $("#btn-add-expense-home").addEventListener("click", () => {
      switchView("expenses");
      $("#expense-amount").focus();
    });

    $("#btn-add-income-home").addEventListener("click", () => {
      switchView("income");
      $("#income-amount").focus();
    });

    $("#btn-sample-data").addEventListener("click", () => {
      loadSampleData();
      refreshUI();
    });

    $("#btn-export-data-home").addEventListener("click", exportJSON);
  }

  function switchView(view) {
    $$(".nav-link").forEach((b) =>
      b.classList.toggle("active", b.dataset.view === view)
    );
    $$(".view").forEach((v) => v.classList.remove("active"));
    const target = $("#view-" + view);
    if (target) target.classList.add("active");
  }

  /* ---------- Sample Data ---------- */

  function loadSampleData() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;

    const sample = [
      // Income
      {
        id: crypto.randomUUID(),
        type: "income",
        date: `${y}-${pad(m)}-01`,
        amount: 15000,
        category: "Salary",
        account: "Bank",
        notes: "Main job",
        recurring: true,
        frequency: "monthly",
      },
      {
        id: crypto.randomUUID(),
        type: "income",
        date: `${y}-${pad(m)}-10`,
        amount: 2500,
        category: "Freelance",
        account: "Bank",
        notes: "Video project",
        recurring: false,
      },
      // Expenses
      {
        id: crypto.randomUUID(),
        type: "expense",
        date: `${y}-${pad(m)}-03`,
        amount: 1800,
        category: "Rent",
        account: "Bank",
        notes: "Room",
        recurring: true,
        frequency: "monthly",
      },
      {
        id: crypto.randomUUID(),
        type: "expense",
        date: `${y}-${pad(m)}-05`,
        amount: 650,
        category: "Groceries",
        account: "Card",
        notes: "Food",
        recurring: false,
      },
      {
        id: crypto.randomUUID(),
        type: "expense",
        date: `${y}-${pad(m)}-12`,
        amount: 220,
        category: "Transport",
        account: "Cash",
        notes: "Taxi",
        recurring: false,
      },
      {
        id: crypto.randomUUID(),
        type: "expense",
        date: `${y}-${pad(m)}-16`,
        amount: 400,
        category: "Eating Out",
        account: "Card",
        notes: "Dinner",
        recurring: false,
      },
    ];

    state.transactions = sample;
    saveState();
  }

  /* ---------- Forms (Expenses & Income) ---------- */

  function setupForms() {
    // Prefill dates
    const today = new Date().toISOString().slice(0, 10);
    $("#expense-date").value = today;
    $("#income-date").value = today;

    // Categories in select boxes
    refreshCategorySelects();

    // New category buttons
    $("#btn-new-expense-cat").addEventListener("click", () => {
      const val = prompt("New expense category name?");
      if (!val) return;
      if (!state.settings.expenseCategories.includes(val)) {
        state.settings.expenseCategories.push(val);
        saveState();
        refreshCategorySelects();
      }
      $("#expense-category").value = val;
    });

    $("#btn-new-income-cat").addEventListener("click", () => {
      const val = prompt("New income category name?");
      if (!val) return;
      if (!state.settings.incomeCategories.includes(val)) {
        state.settings.incomeCategories.push(val);
        saveState();
        refreshCategorySelects();
      }
      $("#income-category").value = val;
    });

    // Expense form submit
    $("#form-expense").addEventListener("submit", (e) => {
      e.preventDefault();
      const id = $("#expense-id").value || crypto.randomUUID();
      const tx = {
        id,
        type: "expense",
        date: $("#expense-date").value,
        amount: parseFloat($("#expense-amount").value || "0"),
        category: $("#expense-category").value || "Other",
        account: $("#expense-account").value || "",
        notes: $("#expense-notes").value || "",
        recurring: $("#expense-recurring").checked,
        frequency: $("#expense-recurring").checked
          ? $("#expense-frequency").value
          : undefined,
      };

      if (!tx.date || !(tx.amount > 0)) {
        alert("Please enter a valid amount and date.");
        return;
      }

      const exists = state.transactions.some((t) => t.id === id);
      if (exists) {
        updateTransaction(id, tx);
      } else {
        addTransaction(tx);
      }
      $("#form-expense").reset();
      $("#expense-id").value = "";
      $("#expense-date").value = today;
      refreshUI();
    });

    $("#btn-expense-reset").addEventListener("click", () => {
      $("#expense-id").value = "";
      $("#expense-date").value = today;
    });

    // Income form submit
    $("#form-income").addEventListener("submit", (e) => {
      e.preventDefault();
      const id = $("#income-id").value || crypto.randomUUID();
      const tx = {
        id,
        type: "income",
        date: $("#income-date").value,
        amount: parseFloat($("#income-amount").value || "0"),
        category: $("#income-category").value || "Other",
        account: $("#income-account").value || "",
        notes: $("#income-notes").value || "",
        recurring: $("#income-recurring").checked,
        frequency: $("#income-recurring").checked
          ? $("#income-frequency").value
          : undefined,
      };

      if (!tx.date || !(tx.amount > 0)) {
        alert("Please enter a valid amount and date.");
        return;
      }

      const exists = state.transactions.some((t) => t.id === id);
      if (exists) {
        updateTransaction(id, tx);
      } else {
        addTransaction(tx);
      }
      $("#form-income").reset();
      $("#income-id").value = "";
      $("#income-date").value = today;
      refreshUI();
    });

    $("#btn-income-reset").addEventListener("click", () => {
      $("#income-id").value = "";
      $("#income-date").value = today;
    });
  }

  function refreshCategorySelects() {
    const expSelect = $("#expense-category");
    const incSelect = $("#income-category");
    const expFilter = $("#exp-filter-cat");
    const incFilter = $("#inc-filter-cat");

    function fillSelect(select, options) {
      select.innerHTML = "";
      options.forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
      });
    }

    fillSelect(expSelect, state.settings.expenseCategories);
    fillSelect(incSelect, state.settings.incomeCategories);

    // Filters keep the "All" option
    expFilter.innerHTML = '<option value="">All</option>';
    incFilter.innerHTML = '<option value="">All</option>';
    state.settings.expenseCategories.forEach((cat) => {
      const o = document.createElement("option");
      o.value = cat;
      o.textContent = cat;
      expFilter.appendChild(o);
    });
    state.settings.incomeCategories.forEach((cat) => {
      const o = document.createElement("option");
      o.value = cat;
      o.textContent = cat;
      incFilter.appendChild(o);
    });
  }

  /* ---------- Filters ---------- */

  function setupFilters() {
    ["exp", "inc"].forEach((prefix) => {
      [
        `${prefix}-filter-from`,
        `${prefix}-filter-to`,
        `${prefix}-filter-cat`,
        `${prefix}-filter-search`,
      ].forEach((id) => {
        $("#" + id).addEventListener("input", refreshUI);
      });
    });

    $("#exp-select-all").addEventListener("change", (e) => {
      $$("#exp-table-body input[type='checkbox']").forEach(
        (cb) => (cb.checked = e.target.checked)
      );
    });

    $("#inc-select-all").addEventListener("change", (e) => {
      $$("#inc-table-body input[type='checkbox']").forEach(
        (cb) => (cb.checked = e.target.checked)
      );
    });

    $("#btn-exp-delete-selected").addEventListener("click", () => {
      const ids = $$("#exp-table-body input[type='checkbox']:checked").map(
        (cb) => cb.dataset.id
      );
      if (!ids.length) return;
      if (!confirm(`Delete ${ids.length} expense(s)?`)) return;
      deleteBulk("expense", ids);
      refreshUI();
    });

    $("#btn-inc-delete-selected").addEventListener("click", () => {
      const ids = $$("#inc-table-body input[type='checkbox']:checked").map(
        (cb) => cb.dataset.id
      );
      if (!ids.length) return;
      if (!confirm(`Delete ${ids.length} income item(s)?`)) return;
      deleteBulk("income", ids);
      refreshUI();
    });
  }

  /* ---------- Settings ---------- */

  function setupSettings() {
    // Currency
    const currencySelect = $("#setting-currency");
    currencySelect.value = state.settings.currency;
    currencySelect.addEventListener("change", () => {
      state.settings.currency = currencySelect.value;
      saveState();
      refreshUI();
    });

    // Beginner hints
    const hintsToggle = $("#setting-hints");
    hintsToggle.checked = state.settings.beginnerHints;
    hintsToggle.addEventListener("change", () => {
      state.settings.beginnerHints = hintsToggle.checked;
      saveState();
      applyHintsState(hintsToggle.checked);
    });

    // Categories lists
    refreshSettingsCategoryLists();

    $("#btn-setting-expense-add").addEventListener("click", () => {
      const val = $("#setting-expense-new").value.trim();
      if (!val) return;
      if (!state.settings.expenseCategories.includes(val)) {
        state.settings.expenseCategories.push(val);
        saveState();
        refreshSettingsCategoryLists();
        refreshCategorySelects();
        $("#setting-expense-new").value = "";
      }
    });

    $("#btn-setting-income-add").addEventListener("click", () => {
      const val = $("#setting-income-new").value.trim();
      if (!val) return;
      if (!state.settings.incomeCategories.includes(val)) {
        state.settings.incomeCategories.push(val);
        saveState();
        refreshSettingsCategoryLists();
        refreshCategorySelects();
        $("#setting-income-new").value = "";
      }
    });

    // Export / Import / Reset
    $("#btn-export-data-settings").addEventListener("click", exportJSON);

    $("#input-import-json").addEventListener("change", handleImportJSON);

    $("#btn-reset-app").addEventListener("click", () => {
      if (
        confirm(
          "This will delete ALL your data and reset everything. Are you sure?"
        )
      ) {
        resetState();
      }
    });
  }

  function refreshSettingsCategoryLists() {
    const expUl = $("#setting-expense-cats");
    const incUl = $("#setting-income-cats");
    expUl.innerHTML = "";
    incUl.innerHTML = "";

    state.settings.expenseCategories.forEach((cat) => {
      const li = document.createElement("li");
      li.textContent = cat;
      const btn = document.createElement("button");
      btn.className = "pill-remove";
      btn.textContent = "×";
      btn.addEventListener("click", () => removeCategory("expense", cat));
      li.appendChild(btn);
      expUl.appendChild(li);
    });

    state.settings.incomeCategories.forEach((cat) => {
      const li = document.createElement("li");
      li.textContent = cat;
      const btn = document.createElement("button");
      btn.className = "pill-remove";
      btn.textContent = "×";
      btn.addEventListener("click", () => removeCategory("income", cat));
      li.appendChild(btn);
      incUl.appendChild(li);
    });
  }

  function removeCategory(type, cat) {
    const used = state.transactions.some(
      (t) => t.type === (type === "expense" ? "expense" : "income") && t.category === cat
    );
    if (used && !confirm(`"${cat}" is used in existing transactions. Delete anyway?`)) {
      return;
    }

    if (type === "expense") {
      state.settings.expenseCategories = state.settings.expenseCategories.filter(
        (c) => c !== cat
      );
    } else {
      state.settings.incomeCategories = state.settings.incomeCategories.filter(
        (c) => c !== cat
      );
    }
    saveState();
    refreshSettingsCategoryLists();
    refreshCategorySelects();
  }

  /* ---------- Export / Import JSON ---------- */

  function exportJSON() {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pfm_backup.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleImportJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed || !Array.isArray(parsed.transactions)) {
          alert("This file does not look like a valid backup.");
          return;
        }
        state = {
          settings: { ...defaultState.settings, ...(parsed.settings || {}) },
          transactions: parsed.transactions || [],
        };
        saveState();
        refreshUI();
        alert("Data imported.");
      } catch (err) {
        console.error(err);
        alert("Could not read this JSON file.");
      }
    };
    reader.readAsText(file);
  }

  /* ---------- Charts ---------- */

  function initCharts() {
    const trendCtx = $("#chart-trend")?.getContext("2d");
    const expPieCtx = $("#chart-expense-pie")?.getContext("2d");
    const incPieCtx = $("#chart-income-pie")?.getContext("2d");

    charts.trend = new Chart(trendCtx, {
      type: "bar",
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: "rgba(255,255,255,0.06)" } },
        },
        plugins: {
          legend: { display: true, labels: { color: "rgba(255,255,255,0.8)" } },
        },
      },
    });

    charts.expensePie = new Chart(expPieCtx, {
      type: "pie",
      data: { labels: [], datasets: [{ data: [] }] },
      options: { responsive: true },
    });

    charts.incomePie = new Chart(incPieCtx, {
      type: "pie",
      data: { labels: [], datasets: [{ data: [] }] },
      options: { responsive: true },
    });
  }

  function updateCharts() {
    const { trend, expensePie, incomePie } = charts;
    if (!trend || !expensePie || !incomePie) return;

    const currency = state.settings.currency;

    // Last 12 months labels
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString(undefined, { month: "short" });
      months.push({ label, year: d.getFullYear(), month: d.getMonth() + 1 });
    }

    const incomeData = [];
    const expenseData = [];

    months.forEach(({ year, month }) => {
      const { income, expense } = sumForMonth(year, month);
      incomeData.push(income);
      expenseData.push(expense);
    });

    trend.data.labels = months.map((m) => m.label);
    trend.data.datasets = [
      {
        label: "Income (" + currency + ")",
        data: incomeData,
        backgroundColor: "rgba(46, 204, 113, 0.7)",
      },
      {
        label: "Expenses (" + currency + ")",
        data: expenseData,
        backgroundColor: "rgba(231, 76, 60, 0.7)",
      },
    ];
    trend.update();

    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth() + 1;
    const { expenseByCat, incomeByCat } = sumByCategoryForMonth(
      thisYear,
      thisMonth
    );

    // Expense pie
    expensePie.data.labels = Object.keys(expenseByCat);
    expensePie.data.datasets[0].data = Object.values(expenseByCat);
    expensePie.update();

    // Income pie
    incomePie.data.labels = Object.keys(incomeByCat);
    incomePie.data.datasets[0].data = Object.values(incomeByCat);
    incomePie.update();
  }

  function sumForMonth(year, month) {
    let income = 0;
    let expense = 0;
    state.transactions.forEach((t) => {
      const [y, m] = t.date.split("-").map((n) => parseInt(n, 10));
      if (y === year && m === month) {
        if (t.type === "income") income += t.amount;
        else expense += t.amount;
      }
    });
    return { income, expense };
  }

  function sumByCategoryForMonth(year, month) {
    const expenseByCat = {};
    const incomeByCat = {};

    state.transactions.forEach((t) => {
      const [y, m] = t.date.split("-").map((n) => parseInt(n, 10));
      if (y === year && m === month) {
        const cat = t.category || "Other";
        if (t.type === "expense") {
          expenseByCat[cat] = (expenseByCat[cat] || 0) + t.amount;
        } else {
          incomeByCat[cat] = (incomeByCat[cat] || 0) + t.amount;
        }
      }
    });

    return { expenseByCat, incomeByCat };
  }

  /* ---------- UI Refresh ---------- */

  function refreshUI() {
    refreshCategorySelects();
    refreshTablesAndStats();
    refreshDashboard();
    refreshSettingsCategoryLists();
    updateCharts();
  }

  function refreshTablesAndStats() {
    const currency = state.settings.currency;

    // Expense filtered
    const expFiltered = filterTransactions("expense", {
      from: $("#exp-filter-from").value,
      to: $("#exp-filter-to").value,
      category: $("#exp-filter-cat").value,
      search: $("#exp-filter-search").value.toLowerCase(),
    });

    fillTable("#exp-table-body", expFiltered, "expense");
    fillStats("#exp-stat-total", "#exp-stat-avg", "#exp-stat-max", expFiltered, currency);

    // Income filtered
    const incFiltered = filterTransactions("income", {
      from: $("#inc-filter-from").value,
      to: $("#inc-filter-to").value,
      category: $("#inc-filter-cat").value,
      search: $("#inc-filter-search").value.toLowerCase(),
    });

    fillTable("#inc-table-body", incFiltered, "income");
    fillStats("#inc-stat-total", "#inc-stat-avg", "#inc-stat-max", incFiltered, currency);
  }

  function filterTransactions(type, { from, to, category, search }) {
    return state.transactions
      .filter((t) => t.type === type)
      .filter((t) => {
        if (from && t.date < from) return false;
        if (to && t.date > to) return false;
        if (category && t.category !== category) return false;
        if (search && !t.notes.toLowerCase().includes(search)) return false;
        return true;
      })
      .sort((a, b) => (a.date > b.date ? -1 : 1)); // newest first
  }

  function fillTable(bodySelector, rows, type) {
    const tbody = $(bodySelector);
    tbody.innerHTML = "";
    const currency = state.settings.currency;

    rows.forEach((t) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="checkbox" data-id="${t.id}" /></td>
        <td>${t.date}</td>
        <td>${escapeHtml(t.category || "")}</td>
        <td>${escapeHtml(t.account || "")}</td>
        <td>${formatMoney(t.amount, currency)}</td>
        <td>${escapeHtml(t.notes || "")}</td>
        <td>${t.recurring ? t.frequency || "yes" : ""}</td>
        <td>
          <button class="btn small ghost" data-edit="${t.id}">Edit</button>
          <button class="btn small outline danger" data-del="${t.id}">×</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Edit / delete handlers
    tbody.addEventListener(
      "click",
      (e) => {
        const editId = e.target.dataset.edit;
        const delId = e.target.dataset.del;
        if (editId) {
          const tx = state.transactions.find((t) => t.id === editId);
          if (!tx) return;
          if (type === "expense") fillExpenseForm(tx);
          else fillIncomeForm(tx);
        }
        if (delId) {
          if (!confirm("Delete this item?")) return;
          deleteTransaction(delId);
          refreshUI();
        }
      },
      { once: true }
    );
  }

  function fillStats(totalSel, avgSel, maxSel, rows, currency) {
    if (!rows.length) {
      $(totalSel).textContent = formatMoney(0, currency);
      $(avgSel).textContent = formatMoney(0, currency);
      $(maxSel).textContent = formatMoney(0, currency);
      return;
    }
    let total = 0;
    let max = 0;
    let minDate = rows[0].date;
    let maxDate = rows[0].date;

    rows.forEach((t) => {
      total += t.amount;
      if (t.amount > max) max = t.amount;
      if (t.date < minDate) minDate = t.date;
      if (t.date > maxDate) maxDate = t.date;
    });

    const days =
      1 +
      Math.floor(
        (new Date(maxDate) - new Date(minDate)) / (1000 * 60 * 60 * 24)
      );
    const avg = total / Math.max(1, days);

    $(totalSel).textContent = formatMoney(total, currency);
    $(avgSel).textContent = formatMoney(avg, currency);
    $(maxSel).textContent = formatMoney(max, currency);
  }

  function fillExpenseForm(tx) {
    switchView("expenses");
    $("#expense-id").value = tx.id;
    $("#expense-amount").value = tx.amount;
    $("#expense-date").value = tx.date;
    $("#expense-category").value = tx.category;
    $("#expense-account").value = tx.account;
    $("#expense-notes").value = tx.notes;
    $("#expense-recurring").checked = !!tx.recurring;
    $("#expense-frequency").value = tx.frequency || "monthly";
  }

  function fillIncomeForm(tx) {
    switchView("income");
    $("#income-id").value = tx.id;
    $("#income-amount").value = tx.amount;
    $("#income-date").value = tx.date;
    $("#income-category").value = tx.category;
    $("#income-account").value = tx.account;
    $("#income-notes").value = tx.notes;
    $("#income-recurring").checked = !!tx.recurring;
    $("#income-frequency").value = tx.frequency || "monthly";
  }

  function refreshDashboard() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const currency = state.settings.currency;
    const { income, expense } = sumForMonth(y, m);

    $("#kpi-income").textContent = formatMoney(income, currency);
    $("#kpi-expenses").textContent = formatMoney(expense, currency);
    $("#kpi-net").textContent = formatMoney(income - expense, currency);

    const daysInMonth = new Date(y, m, 0).getDate();
    const dayOfMonth = now.getDate();

    const daysSoFar = Math.max(1, dayOfMonth);
    const runRate = expense / daysSoFar;
    const projected = runRate * daysInMonth;

    $("#kpi-run-rate").textContent = `${formatMoney(runRate, currency)} / day`;
    $("#kpi-projected").textContent = formatMoney(projected, currency);

    // Top 3 expense categories
    const { expenseByCat } = sumByCategoryForMonth(y, m);
    const entries = Object.entries(expenseByCat).sort((a, b) => b[1] - a[1]);
    const ul = $("#top-expense-cats");
    ul.innerHTML = "";
    if (!entries.length) {
      $("#top-expense-empty").style.display = "block";
    } else {
      $("#top-expense-empty").style.display = "none";
      entries.slice(0, 3).forEach(([cat, amount]) => {
        const li = document.createElement("li");
        li.textContent = `${cat}: ${formatMoney(amount, currency)}`;
        ul.appendChild(li);
      });
    }

    // Upcoming recurring items next 30 days
    const upcomingUl = $("#upcoming-recurring");
    upcomingUl.innerHTML = "";
    const nowMs = now.getTime();
    const cutoffMs = nowMs + 30 * 24 * 60 * 60 * 1000;

    const recurring = state.transactions.filter((t) => t.recurring);
    const upcoming = recurring.filter((t) => {
      const dt = new Date(t.date);
      const d = new Date(dt);
      d.setFullYear(now.getFullYear());
      d.setMonth(now.getMonth());
      d.setDate(dt.getDate());
      if (d.getTime() < nowMs) {
        d.setMonth(d.getMonth() + 1);
      }
      return d.getTime() <= cutoffMs;
    });

    if (!upcoming.length) {
      $("#upcoming-recurring-empty").style.display = "block";
    } else {
      $("#upcoming-recurring-empty").style.display = "none";
      upcoming.forEach((t) => {
        const li = document.createElement("li");
        li.textContent = `${t.type === "expense" ? "Expense" : "Income"} · ${
          t.category
        } · ${formatMoney(t.amount, currency)} (${t.frequency || "recurring"})`;
        upcomingUl.appendChild(li);
      });
    }
  }

  /* ---------- Utils ---------- */

  function formatMoney(amount, currency) {
    const symbol = currency === "ZAR" ? "R" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency + " ";
    return `${symbol}${amount.toFixed(2)}`;
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
})();
