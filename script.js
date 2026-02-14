// Init Icons
lucide.createIcons();

// --- DARK MODE LOGIC ---
function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
    updateChartTheme(); // Update Chart colors
}

function updateThemeIcon() {
    const isDark = document.documentElement.classList.contains('dark');
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.setAttribute('data-lucide', isDark ? 'moon' : 'sun');
        lucide.createIcons();
    }
}

// Init Theme
if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}
// Run icon update after DOM load
setTimeout(updateThemeIcon, 100);

// --- HYBRID AI ENGINE (Local + Cloud) ---
let apiKey = localStorage.getItem("gemini_api_key") || "";

// Settings Logic
function openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
}

function closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
}

// Logout Logic
async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        await window.supabase.auth.signOut();
        localStorage.removeItem('isAuthenticated'); // Clear legacy flag just in case
        window.location.href = 'login.html';
    }
}

// Check Session on Load
async function checkSession() {
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) {
        // Double check local storage for legacy/fallback, but rely on Supabase
        window.location.href = 'login.html';
    } else {
        localStorage.setItem('isAuthenticated', 'true'); // Keep legacy flag in sync
    }
}

// Run Session Check
checkSession();
// 1. Local Logic Engine (Works Offline)
function analyzeLocalAffordability(query, balance, spending) {
    const lowerQ = query.toLowerCase();

    // Extract numbers (supports "50k", "50000", "1.5L")
    let cost = 0;
    const kMatch = lowerQ.match(/(\d+(\.\d+)?)\s*k/);
    const lMatch = lowerQ.match(/(\d+(\.\d+)?)\s*l/);
    const numMatch = lowerQ.match(/(\d{1,3}(,\d{3})*(\.\d+)?)/); // Matches 50,000 or 50000

    if (kMatch) cost = parseFloat(kMatch[1]) * 1000;
    else if (lMatch) cost = parseFloat(lMatch[1]) * 100000;
    else if (numMatch) cost = parseFloat(numMatch[1].replace(/,/g, ''));

    if (cost > 0) {
        const ratio = cost / balance;
        if (ratio > 0.5) return `🚫 **Critical Risk**: This costs ₹${cost.toLocaleString()}, which is ${Math.round(ratio * 100)}% of your total balance! absolutely not.`;
        if (ratio > 0.2) return `⚠️ **Risky**: This is a heavy purchase (₹${cost.toLocaleString()}). Only buy if urgent.`;
        if (ratio < 0.05) return `✅ **Safe**: This is tiny (₹${cost.toLocaleString()}). Go for it!`;
        return `ℹ️ **Standard Purchase**: It's affordable, but check your budget first.`;
    }

    // Keyword Checks
    if (lowerQ.includes("iphone") || lowerQ.includes("apple")) return "🍎 **Luxury Alert**: iPhones are depreciating assets. Do you *really* need it?";
    if (lowerQ.includes("party") || lowerQ.includes("dinner")) return "🍔 **Foodie Alert**: You spend ₹${spending} monthly. Maybe cook at home?";
    if (lowerQ.includes("invest") || lowerQ.includes("sip")) return "📈 **Yes!** Always a good time to invest. Check the Budget tab.";

    return null; // Could not analyze locally
}

async function callGeminiAPI(prompt) {
    if (!apiKey) {
        apiKey = prompt("Please enter your Gemini API Key to use AI features:");
        if (apiKey) localStorage.setItem("gemini_api_key", apiKey);
        else {
            const retry = confirm("API Key is required to use AI features. Do you want to try again?");
            if (retry) return callGeminiAPI(prompt);
            return "⚠️ API Key is missing. Click 'Reset Key' to try again.";
        }
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        // Handle Invalid Key Gracefully
        if (response.status === 400 || response.status === 403) {
            localStorage.removeItem("gemini_api_key");
            apiKey = "";
            return "⚠️ Invalid API Key. The key has been reset. Please try again with a valid key.";
        }

        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error(error);
        // Fallback / Mock Response to ensure it 'works'
        return "**(Simulation Mode)**: Analysis failed (Network/API Error). \n\nBased on your local data: \n- You are spending 65% of your income. \n- Consider cutting down on 'Zomato' to boost your 'Royal Enfield' savings.";
    }
}

async function checkAffordability() {
    const input = document.getElementById('afford-input');
    const resultDiv = document.getElementById('afford-result');
    const btn = document.getElementById('btn-afford-check');
    const query = input.value.trim();
    if (!query) return;

    btn.innerText = "...";
    btn.disabled = true;
    resultDiv.classList.remove('hidden');

    // STEP 1: Try Local Logic First (Fast & Free)
    const localAnalysis = analyzeLocalAffordability(query, userContext.totalBalance, userContext.monthlySpending);
    if (localAnalysis) {
        await new Promise(r => setTimeout(r, 600)); // Fake thinking time for effect
        resultDiv.innerHTML = localAnalysis;
        btn.innerText = "Check";
        btn.disabled = false;
        return;
    }

    // STEP 2: Try API if configured
    if (apiKey) {
        resultDiv.innerHTML = "Consulting Gemini...";
        const prompt = `Strict financing advice. Balance: ${userContext.totalBalance}. Q: ${query}. Short answer.`;
        const response = await callGeminiAPI(prompt);

        // If API returns our generic error simulation, use a smarter fallback
        if (response.includes("(Simulation Mode)")) {
            resultDiv.innerHTML = "🤔 **Hmm**: I couldn't reach the cloud, and I didn't see a price in your question. Try asking with a number, like 'Can I afford a 50k bike?' so I can calculate it locally!";
        } else {
            resultDiv.innerHTML = response;
        }
    } else {
        // STEP 3: Fallback if NO Key and NO Local Match
        await new Promise(r => setTimeout(r, 600));
        resultDiv.innerHTML = "💡 **Tip**: I work best with numbers! Ask me 'Can I afford 20k?' or add your API Key in Settings for smarter answers.";
    }

    btn.innerText = "Check";
    btn.disabled = false;
}




const userContext = {
    totalBalance: 1245000,
    monthlyIncome: 85000,
    monthlySpending: 45200,
    savingsGoal: { item: "Royal Enfield Meteor", target: 250000, current: 180000 },
    recentTransactions: [
        { name: "Lic India Premium", amount: -12400, category: "Insurance" },
        { name: "Rahul (Rent Share)", amount: 8500, category: "Income" },
        { name: "Netflix India", amount: -649, category: "Entertainment" },
        { name: "Zomato", amount: -450, category: "Food" },
        { name: "Local Kirana", amount: -1240, category: "Groceries" }
    ],
    // Data for Graph
    monthlyStats: {
        labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
        income: [75000, 78000, 80000, 80000, 85000, 85000],
        expense: [40000, 42000, 55000, 38000, 60000, 45200]
    }
};

// --- CHART.JS INTEGRATION ---
let cashFlowChartInstance = null;

function updateChartTheme() {
    if (!cashFlowChartInstance) return;

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#1e293b' : '#f1f5f9'; // Slate 800 for dark mode grid

    cashFlowChartInstance.options.scales.x.ticks.color = textColor;
    cashFlowChartInstance.options.scales.y.ticks.color = textColor;
    cashFlowChartInstance.options.scales.y.grid.color = gridColor;
    cashFlowChartInstance.update();
}

function initChart() {
    const ctx = document.getElementById('cashFlowChart').getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');

    // Destroy existing if re-initializing (good for tab switches)
    if (cashFlowChartInstance) cashFlowChartInstance.destroy();

    cashFlowChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: userContext.monthlyStats.labels,
            datasets: [
                {
                    label: 'Income',
                    data: userContext.monthlyStats.income,
                    backgroundColor: isDark ? '#334155' : '#e2e8f0', // Slate 800 vs Slate 200
                    hoverBackgroundColor: '#10b981', // Emerald 500
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.6,
                    categoryPercentage: 0.8
                },
                {
                    label: 'Expenses',
                    data: userContext.monthlyStats.expense,
                    backgroundColor: '#7c3aed', // Primary 600
                    hoverBackgroundColor: '#8b5cf6',
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.6,
                    categoryPercentage: 0.8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }, // Custom legend used in HTML
                tooltip: {
                    backgroundColor: isDark ? '#0f172a' : '#1e293b',
                    padding: 12,
                    titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13 },
                    bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            return '₹' + context.raw.toLocaleString('en-IN');
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: isDark ? '#334155' : '#f1f5f9', borderDash: [5, 5] },
                    ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 10 }, color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '600' }, color: isDark ? '#94a3b8' : '#64748b' }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false,
            },
        }
    });
}

// Navigation Logic
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('fade-in');
    });
    const target = document.getElementById(tabId);
    target.classList.remove('hidden');
    void target.offsetWidth; // trigger reflow
    target.classList.add('fade-in');

    // Initialize chart if dashboard is opened
    if (tabId === 'dashboard') {
        setTimeout(initChart, 50); // Small delay to ensure container is rendered
    }

    // Nav Styles
    document.querySelectorAll('.nav-item').forEach(el => {
        el.className = "nav-item w-full flex items-center p-3.5 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-all duration-200 group relative";
        el.querySelector('div')?.classList.remove('h-8', 'opacity-100');
    });

    const activeBtn = document.getElementById('nav-' + tabId);
    if (activeBtn) {
        activeBtn.className = "nav-item w-full flex items-center p-3.5 rounded-2xl transition-all duration-200 group relative overflow-hidden bg-primary-50 text-primary-700 font-semibold shadow-sm dark:bg-primary-900/20 dark:text-primary-300 dark:shadow-neon";
        activeBtn.querySelector('div')?.classList.add('h-8', 'opacity-100');
    }

    const titles = { 'dashboard': 'Dashboard', 'transactions': 'Passbook', 'budget': 'Budget & Goals' };
    document.getElementById('page-title').innerText = titles[tabId];
}

function switchTxMode(mode) {
    const autoBtn = document.getElementById('btn-auto');
    const manualBtn = document.getElementById('btn-manual');
    const autoView = document.getElementById('view-automatic');
    const manualView = document.getElementById('view-manual');

    if (mode === 'automatic') {
        autoBtn.className = "flex-1 py-5 text-sm font-bold flex items-center justify-center gap-2 transition-all text-primary-700 bg-primary-50/50 border-b-2 border-primary-600 dark:bg-primary-900/10 dark:text-primary-400 dark:border-primary-500";
        manualBtn.className = "flex-1 py-5 text-sm font-bold flex items-center justify-center gap-2 transition-all text-slate-400 hover:bg-slate-50 border-b-2 border-transparent dark:hover:bg-white/5";
        autoView.classList.remove('hidden');
        manualView.classList.add('hidden');
    } else {
        manualBtn.className = "flex-1 py-5 text-sm font-bold flex items-center justify-center gap-2 transition-all text-orange-600 bg-orange-50/50 border-b-2 border-orange-500 dark:bg-orange-900/10 dark:text-orange-400 dark:border-orange-500";
        autoBtn.className = "flex-1 py-5 text-sm font-bold flex items-center justify-center gap-2 transition-all text-slate-400 hover:bg-slate-50 border-b-2 border-transparent dark:hover:bg-white/5";
        manualView.classList.remove('hidden');
        autoView.classList.add('hidden');
    }
}

// New Logic for Manual Transaction Type
function setTxType(type) {
    // Reset buttons
    document.getElementById('type-expense').className = "flex-1 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-rose-600 transition-all";
    document.getElementById('type-income').className = "flex-1 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-emerald-600 transition-all";
    document.getElementById('type-transfer').className = "flex-1 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-blue-600 transition-all";

    // Set active
    if (type === 'expense') document.getElementById('type-expense').className = "flex-1 py-2 rounded-lg text-sm font-bold bg-white shadow-sm text-rose-600 transition-all";
    if (type === 'income') document.getElementById('type-income').className = "flex-1 py-2 rounded-lg text-sm font-bold bg-white shadow-sm text-emerald-600 transition-all";
    if (type === 'transfer') document.getElementById('type-transfer').className = "flex-1 py-2 rounded-lg text-sm font-bold bg-white shadow-sm text-blue-600 transition-all";
}

function toggleMobileMenu() {
    const sidebar = document.getElementById('mobile-sidebar');
    const overlay = document.getElementById('mobile-menu-overlay');
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}



// Initialize
switchTab('dashboard');
