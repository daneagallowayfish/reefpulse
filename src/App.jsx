import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer } from "recharts";

const IDEAL_RANGES = {
  nitrate: { min: 0, max: 10, unit: "ppm", label: "Nitrate (NO\u2083)", icon: "\u{1F52C}" },
  ph: { min: 7.8, max: 8.4, unit: "", label: "pH", icon: "\u{1F4CA}" },
  alkalinity: { min: 7.5, max: 11, unit: "dKH", label: "Alkalinity", icon: "\u2697\uFE0F" },
  calcium: { min: 380, max: 450, unit: "ppm", label: "Calcium", icon: "\u{1FAB8}" },
  phosphate: { min: 0, max: 0.1, unit: "ppm", label: "Phosphate (PO\u2084)", icon: "\u{1F4A7}" },
  salinity: { min: 1.024, max: 1.026, unit: "sg", label: "Salinity", icon: "\u{1F30A}" },
  temperature: { min: 76, max: 80, unit: "\u00B0F", label: "Temperature", icon: "\u{1F321}\uFE0F" },
  magnesium: { min: 1250, max: 1400, unit: "ppm", label: "Magnesium", icon: "\u{1F9EA}" },
  ammonia: { min: 0, max: 0, unit: "ppm", label: "Ammonia (NH\u2083)", icon: "\u26A0\uFE0F" },
  nitrite: { min: 0, max: 0, unit: "ppm", label: "Nitrite (NO\u2082)", icon: "\u{1F9EB}" },
};

const CORAL_PRESETS = {
  sps: { label: "SPS Dominant", desc: "Acropora, Montipora, Stylophora", adjustments: { calcium: { min: 420, max: 460 }, alkalinity: { min: 8, max: 9.5 }, magnesium: { min: 1300, max: 1400 }, nitrate: { min: 0.5, max: 5 }, phosphate: { min: 0.01, max: 0.05 } } },
  lps: { label: "LPS Dominant", desc: "Hammer, Torch, Frogspawn, Brain", adjustments: { calcium: { min: 380, max: 440 }, alkalinity: { min: 7.5, max: 10 }, nitrate: { min: 2, max: 15 }, phosphate: { min: 0.02, max: 0.1 } } },
  mixed: { label: "Mixed Reef", desc: "Variety of SPS, LPS, and Softies", adjustments: { calcium: { min: 400, max: 450 }, alkalinity: { min: 8, max: 10 } } },
  softie: { label: "Softies / FOWLR", desc: "Mushrooms, Zoas, Leathers, Fish Only", adjustments: { nitrate: { min: 0, max: 20 }, phosphate: { min: 0, max: 0.15 } } },
};

const PRODUCT_RECOMMENDATIONS = {
  calcium_low: [
    { name: "BRS Calcium Chloride", url: "https://www.bulkreefsupply.com/calcium-chloride.html", note: "Most cost-effective for 2-part dosing" },
    { name: "Fritz RPM Calcium", url: "https://fritzaquatics.com", note: "Pre-mixed solution, easy to use" },
  ],
  alkalinity_low: [
    { name: "BRS Soda Ash", url: "https://www.bulkreefsupply.com/soda-ash.html", note: "Best value for raising alkalinity" },
    { name: "ESV B-Ionic Alkalinity", url: "https://www.esv-aquatics.com", note: "Balanced 2-part supplement" },
  ],
  alkalinity_high: [{ name: "Perform water change", url: null, note: "Dilute with NSW to gradually lower" }],
  magnesium_low: [
    { name: "BRS Magnesium Chloride + Sulfate", url: "https://www.bulkreefsupply.com/magnesium.html", note: "DIY recipe - most cost-effective" },
    { name: "Brightwell Aquatics Magnesion", url: "https://brightwellaquatics.com", note: "Pre-mixed convenience" },
  ],
  nitrate_high: [
    { name: "Seachem Matrix Bio Media", url: "https://www.seachem.com/matrix.php", note: "Excellent bio filtration media" },
    { name: "NOPOX / Vodka Dosing", url: "https://www.bulkreefsupply.com/nopox.html", note: "Carbon dosing to feed bacteria" },
    { name: "Reduce feeding", url: null, note: "Cut back feedings and clean mechanical filtration" },
  ],
  phosphate_high: [
    { name: "BRS GFO (Granular Ferric Oxide)", url: "https://www.bulkreefsupply.com/brs-gfo.html", note: "Gold standard phosphate removal" },
    { name: "Fauna Marin Phosphate Reduction", url: "https://faunamarin.com", note: "Biological phosphate control" },
  ],
  ammonia_high: [
    { name: "Seachem Prime", url: "https://www.seachem.com/prime.php", note: "Emergency ammonia detoxifier" },
    { name: "Fritz TurboStart 900", url: "https://fritzaquatics.com", note: "Live nitrifying bacteria - fast cycle" },
  ],
  nitrite_high: [
    { name: "Fritz TurboStart 900", url: "https://fritzaquatics.com", note: "Accelerate the nitrogen cycle" },
    { name: "Seachem Stability", url: "https://www.seachem.com/stability.php", note: "Daily bacterial supplement" },
  ],
  ph_low: [
    { name: "Open windows / Increase ventilation", url: null, note: "Indoor CO2 buildup is the #1 cause of low pH" },
    { name: "BRS CO2 Scrubber", url: "https://www.bulkreefsupply.com/co2-scrubber.html", note: "Scrubs CO2 from skimmer air intake" },
    { name: "Kalkwasser (Kalk Reactor)", url: "https://www.bulkreefsupply.com/kalkwasser.html", note: "Raises pH and supplements calcium/alk" },
  ],
  temperature_high: [
    { name: "Inkbird Temperature Controller", url: "https://www.amazon.com/Inkbird-Temperature-Controller", note: "Automate heater/fan with dual-stage controller" },
    { name: "Add a fan to sump", url: null, note: "Evaporative cooling can drop temp 2-4F" },
  ],
  temperature_low: [
    { name: "Eheim Jager Heater", url: "https://www.amazon.com/Eheim-Jager-Aquarium-Thermostat-Heater", note: "Most reliable heater on the market" },
    { name: "Inkbird Temperature Controller", url: "https://www.amazon.com/Inkbird-Temperature-Controller", note: "Prevents heater malfunction disasters" },
  ],
};

const RESOLUTION_STEPS = {
  calcium_low: [
    { step: "Test magnesium first", detail: "If magnesium is below 1250 ppm, correct it before adjusting calcium - low mag makes calcium unstable." },
    { step: "Calculate your dose", detail: "Use calcium chloride (CaCl2). Approximately 1 tsp per 50 gallons raises calcium ~19 ppm." },
    { step: "Dissolve in RODI water", detail: "Mix your dose into a cup of RODI water. Never add powder directly to the tank." },
    { step: "Dose slowly to high-flow area", detail: "Pour near a powerhead or return pump. Never raise more than 20 ppm per day." },
    { step: "Retest after 24 hours", detail: "Wait a full day, then retest. Repeat dosing if still low. Consider a 2-part dosing system." },
  ],
  calcium_high: [
    { step: "Stop all calcium supplementation", detail: "Pause 2-part, kalkwasser, or calcium reactor immediately." },
    { step: "Perform a water change", detail: "A 15-20% water change with properly mixed NSW will help dilute excess calcium." },
    { step: "Check alkalinity balance", detail: "High calcium often pairs with low alkalinity. The two are inversely related." },
    { step: "Retest in 48 hours", detail: "Calcium will naturally be consumed by corals. Resume dosing at a lower rate once stable." },
  ],
  alkalinity_low: [
    { step: "Prepare soda ash solution", detail: "Dissolve ~1 tsp of soda ash per cup of RODI water. Raises alk ~1 dKH per 40 gallons." },
    { step: "Calculate your dose", detail: "Determine the deficit. Never raise alkalinity more than 1.4 dKH in a single day." },
    { step: "Drip or pour into high-flow area", detail: "Add slowly near a powerhead. Rapid alk swings are more dangerous than the low level itself." },
    { step: "Retest after 12-24 hours", detail: "Alkalinity is consumed quickly by SPS corals. If it drops fast, increase daily dosing." },
    { step: "Set up automated dosing", detail: "If alk drops daily, invest in a dosing pump for consistent 2-part delivery." },
  ],
  alkalinity_high: [
    { step: "Stop alkalinity supplementation", detail: "Pause 2-part dosing, kalkwasser, or any alk supplement immediately." },
    { step: "Perform a water change", detail: "Do a 15-25% water change with properly mixed saltwater to dilute." },
    { step: "Watch corals for stress", detail: "High alk can burn SPS tissue. Look for tissue recession, bleaching, or RTN." },
    { step: "Retest in 24 hours", detail: "Resume dosing at a reduced rate once alk returns to range." },
  ],
  magnesium_low: [
    { step: "Prioritize magnesium correction", detail: "Low magnesium destabilizes both calcium and alkalinity. Fix mag FIRST." },
    { step: "Mix magnesium supplement", detail: "Use 3 parts magnesium chloride + 2 parts magnesium sulfate dissolved in RODI water." },
    { step: "Dose slowly - max 100 ppm/day", detail: "Large mag swings are stressful. Spread dosing over multiple days if deficit is large." },
    { step: "Retest after 24 hours", detail: "Once magnesium is stable at 1300+ ppm, calcium and alkalinity should stabilize more easily." },
  ],
  magnesium_high: [
    { step: "Stop magnesium supplementation", detail: "Pause any mag dosing immediately." },
    { step: "Perform water changes", detail: "Standard NSW sits around 1280-1350 ppm mag. Water changes will gradually dilute excess." },
    { step: "Retest in 48 hours", detail: "Magnesium is consumed slowly, so patience is key." },
  ],
  nitrate_high: [
    { step: "Perform a water change", detail: "An immediate 20-30% water change will dilute nitrate." },
    { step: "Reduce feeding", detail: "Cut feeding amount in half and remove uneaten food within 5 minutes." },
    { step: "Clean mechanical filtration", detail: "Rinse filter socks, sponges, and clean your skimmer cup. Trapped detritus is a nitrate factory." },
    { step: "Add biological filtration", detail: "Consider adding bio media (Seachem Matrix, MarinePure) to your sump." },
    { step: "Consider carbon dosing", detail: "NOPOX or vodka dosing feeds bacteria that consume nitrate. Start at half dose." },
  ],
  phosphate_high: [
    { step: "Do NOT drop phosphate rapidly", detail: "Fast phosphate reduction shocks corals. Target no more than 0.03 ppm reduction per day." },
    { step: "Run GFO in a reactor or bag", detail: "Start with a small amount of granular ferric oxide. Replace every 2-4 weeks." },
    { step: "Check and clean filtration", detail: "Dirty filter socks, skimmer, and detritus in sump all leach phosphate." },
    { step: "Reduce feeding", detail: "Most phosphate enters via food. Cut back and use low-phosphate foods." },
    { step: "Retest weekly", detail: "Track the downward trend. Slow and steady wins." },
  ],
  ammonia_high: [
    { step: "EMERGENCY: Dose Seachem Prime NOW", detail: "5ml per 50 gallons detoxifies ammonia for 24-48 hours." },
    { step: "Perform a 25-50% water change", detail: "Immediately dilute ammonia with properly mixed saltwater." },
    { step: "Find the source", detail: "Check for dead fish, invertebrates, uneaten food, or dead animals hidden in rockwork." },
    { step: "Add bottled bacteria", detail: "Fritz TurboStart 900 or Seachem Stability will accelerate biological filtration." },
    { step: "Retest every 12 hours", detail: "Continue dosing Prime and water changes until ammonia reads 0." },
  ],
  nitrite_high: [
    { step: "Dose Seachem Prime immediately", detail: "Prime detoxifies nitrite. Dose 5ml per 50 gallons." },
    { step: "Perform a 25% water change", detail: "Dilute nitrite levels with clean saltwater." },
    { step: "Add nitrifying bacteria", detail: "Fritz TurboStart 900 is the fastest. Dose into the sump or near biological media." },
    { step: "Check for disruption", detail: "Did you recently clean all filter media, add medication, or have a power outage?" },
    { step: "Retest daily", detail: "Continue Prime until nitrite reads 0." },
  ],
  ph_low: [
    { step: "Open a window near your tank", detail: "The #1 cause of low pH is elevated indoor CO2. Ventilation often fixes it immediately." },
    { step: "Check alkalinity", detail: "Low alkalinity directly causes low pH. Correct alk first and pH may follow." },
    { step: "Run a CO2 scrubber", detail: "Attach a CO2 scrubber to your protein skimmer's air intake." },
    { step: "Consider kalkwasser", detail: "Kalkwasser in your ATO raises pH while supplementing calcium and alkalinity." },
    { step: "Grow macro algae (refugium)", detail: "Chaeto in a refugium with reverse light cycle consumes CO2 at night, stabilizing pH." },
  ],
  ph_high: [
    { step: "Check kalkwasser dosing", detail: "If using kalk, reduce concentration or slow drip rate." },
    { step: "Verify test accuracy", detail: "pH probes drift over time. Calibrate or cross-check with a fresh test kit." },
    { step: "Slight elevation is OK", detail: "pH 8.4-8.5 is safe. Only act if consistently above 8.5." },
    { step: "Reduce aeration if extreme", detail: "Temporarily reduce protein skimmer air intake." },
  ],
  temperature_high: [
    { step: "Point a fan across the water surface", detail: "Evaporative cooling can drop temperature 2-4F." },
    { step: "Reduce lighting period", detail: "Shift light schedule so peak intensity avoids the hottest part of the day." },
    { step: "Float ice packs (short-term only)", detail: "Sealed ice packs in the sump can help in emergencies." },
    { step: "Install a temperature controller", detail: "An Inkbird dual-stage controller can automate fans/chiller and heater." },
    { step: "Consider a chiller for chronic issues", detail: "If your tank consistently overheats, a chiller is the permanent fix." },
  ],
  temperature_low: [
    { step: "Check your heater", detail: "Verify it is plugged in, set correctly, and indicator light is on." },
    { step: "Verify heater capacity", detail: "You need approximately 3-5 watts per gallon." },
    { step: "Use a temperature controller", detail: "An Inkbird controller adds a safety layer." },
    { step: "Consider a backup heater", detail: "Two smaller heaters are safer than one large one." },
  ],
  salinity_low: [
    { step: "Check your ATO system", detail: "Too much freshwater dosing is the most common cause." },
    { step: "Top off with saltwater temporarily", detail: "Use mixed saltwater for top-offs until salinity recovers." },
    { step: "Raise slowly - max 0.001 sg/day", detail: "Rapid salinity changes stress fish and corals." },
    { step: "Calibrate your refractometer", detail: "Use calibration fluid (not RODI water)." },
  ],
  salinity_high: [
    { step: "Top off with RODI freshwater", detail: "Add fresh RODI water to dilute. Likely an evaporation/ATO issue." },
    { step: "Check for ATO failure", detail: "Inspect float switch, pump, and reservoir." },
    { step: "Lower slowly - max 0.001 sg/day", detail: "Rapid drops stress livestock just as much as rapid increases." },
    { step: "Recalibrate your refractometer", detail: "Use 35 ppt calibration fluid to verify readings." },
  ],
};

// Dosing calculator configs
const DOSING_CALCS = {
  calcium: {
    label: "Calcium", unit: "ppm", icon: "\u{1FAB8}",
    methods: [
      { name: "Calcium Chloride (CaCl2)", perUnit: 19, perAmount: "1 tsp", perGal: 50, maxPerDay: 20, gramsPerTsp: 3.7, note: "Most common 2-part method. Dissolve in RODI water before adding." },
      { name: "Kalkwasser (Ca(OH)2)", perUnit: 2, perAmount: "1/4 tsp per gallon ATO", perGal: 1, maxPerDay: 20, gramsPerTsp: 2.3, note: "Slow drip via ATO. Also raises pH and alkalinity. Best for maintenance, not large corrections.", isATO: true },
    ],
  },
  alkalinity: {
    label: "Alkalinity", unit: "dKH", icon: "\u2697\uFE0F",
    methods: [
      { name: "Soda Ash (Na2CO3)", perUnit: 1, perAmount: "1 tsp", perGal: 40, maxPerDay: 1.4, gramsPerTsp: 3.8, note: "Standard 2-part method. Preferred over baking soda for reef tanks." },
      { name: "Baking Soda (NaHCO3)", perUnit: 0.7, perAmount: "1 tsp", perGal: 40, maxPerDay: 1.4, gramsPerTsp: 4.6, note: "Cheaper but slightly less effective. Can depress pH if overdosed." },
    ],
  },
  magnesium: {
    label: "Magnesium", unit: "ppm", icon: "\u{1F9EA}",
    methods: [
      { name: "DIY Mag Mix (MgCl2 + MgSO4)", perUnit: 100, perAmount: "6 tsp MgCl2 + 4 tsp MgSO4", perGal: 50, maxPerDay: 100, gramsPerTsp: 3.9, note: "Most cost-effective. Use 3:2 ratio of magnesium chloride to magnesium sulfate." },
      { name: "Brightwell Magnesion", perUnit: 8, perAmount: "5 ml", perGal: 20, maxPerDay: 100, gramsPerTsp: null, mlPerDose: 5, note: "Pre-mixed convenience. Great for small adjustments." },
    ],
  },
};

function getDiagnosis(params, tankGallons, coralType) {
  const issues = [];
  const ranges = { ...IDEAL_RANGES };
  if (coralType && CORAL_PRESETS[coralType]) {
    const adj = CORAL_PRESETS[coralType].adjustments;
    Object.keys(adj).forEach(k => { ranges[k] = { ...ranges[k], ...adj[k] }; });
  }
  Object.keys(params).forEach(key => {
    const val = parseFloat(params[key]);
    if (isNaN(val) || params[key] === "") return;
    const range = ranges[key];
    if (!range) return;
    if (val < range.min) issues.push({ param: key, status: "low", value: val, range, severity: getSeverity(key, val, range, "low") });
    else if (val > range.max) issues.push({ param: key, status: "high", value: val, range, severity: getSeverity(key, val, range, "high") });
  });
  return issues;
}

function getSeverity(key, val, range, direction) {
  if ((key === "ammonia" || key === "nitrite") && val > 0) return "critical";
  const span = range.max - range.min || 1;
  const diff = direction === "low" ? range.min - val : val - range.max;
  const pct = diff / span;
  if (pct > 0.5) return "critical";
  if (pct > 0.2) return "warning";
  return "attention";
}

function getDosingRec(key, val, range, tankGallons) {
  const gal = parseFloat(tankGallons) || 50;
  if (key === "calcium" && val < range.min) { const d = range.min - val; const t = (d / 19) * (gal / 50); return `Add ~${t.toFixed(1)} tsp calcium chloride to raise from ${val} to ~${range.min} ppm. Max 20 ppm/day.`; }
  if (key === "alkalinity" && val < range.min) { const d = range.min - val; const t = d * (gal / 40); return `Add ~${t.toFixed(1)} tsp soda ash to raise from ${val} to ~${range.min} dKH. Max 1.4 dKH/day.`; }
  if (key === "alkalinity" && val > range.max) return `Perform a ${Math.min(Math.round((val - range.max) / range.max * 100 + 10), 30)}% water change. Retest after 24 hours.`;
  if (key === "magnesium" && val < range.min) { const d = (range.min - val) / 100 * (gal / 50); return `Add ~${(d*6).toFixed(1)} tsp mag chloride + ${(d*4).toFixed(1)} tsp mag sulfate. Max 100 ppm/day.`; }
  if (key === "nitrate" && val > range.max) return `Perform a ${Math.min(Math.round(((val - range.max) / val) * 100 + 10), 50)}% water change.`;
  if (key === "phosphate" && val > range.max) return "Run GFO in a reactor or media bag. Max 0.03 ppm reduction/day.";
  if (key === "ammonia" && val > 0) return "URGENT: Dose Seachem Prime (5ml/50gal) + 25-50% water change NOW.";
  if (key === "nitrite" && val > 0) return "URGENT: Dose Seachem Prime + 25% water change. Add bottled bacteria.";
  return null;
}

function getProducts(key, status) { return PRODUCT_RECOMMENDATIONS[`${key}_${status}`] || []; }
function getSteps(key, status) { return RESOLUTION_STEPS[`${key}_${status}`] || []; }

const SEV = {
  critical: { bg: "rgba(239,68,68,0.12)", border: "#ef4444", text: "#fca5a5", badge: "#dc2626" },
  warning: { bg: "rgba(245,158,11,0.12)", border: "#f59e0b", text: "#fcd34d", badge: "#d97706" },
  attention: { bg: "rgba(59,130,246,0.12)", border: "#3b82f6", text: "#93c5fd", badge: "#2563eb" },
};

function Sparkline({ data, width = 120, height = 32, color = "#06b6d4" }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d.value);
  const mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn || 1, pad = 2;
  const pts = vals.map((v, i) => `${pad + (i / (vals.length - 1)) * (width - pad * 2)},${height - pad - ((v - mn) / rng) * (height - pad * 2)}`).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {vals.map((v, i) => <circle key={i} cx={pad + (i / (vals.length - 1)) * (width - pad * 2)} cy={height - pad - ((v - mn) / rng) * (height - pad * 2)} r="2" fill={color} />)}
    </svg>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(6,182,212,0.3)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#e2e8f0" }}>
      <div style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: "#06b6d4" }}>{payload[0].value}</div>
    </div>
  );
}

export default function ReefApp() {
  const [view, setView] = useState("dashboard");
  const [tankGallons, setTankGallons] = useState("50");
  const [coralType, setCoralType] = useState("mixed");
  const [params, setParams] = useState({ nitrate: "", ph: "", alkalinity: "", calcium: "", phosphate: "", salinity: "", temperature: "", magnesium: "", ammonia: "", nitrite: "" });
  const [testDate, setTestDate] = useState("");
  const [history, setHistory] = useState([]);
  const [diagnosis, setDiagnosis] = useState(null);
  const [showSetup, setShowSetup] = useState(true);
  const [expandedIssue, setExpandedIssue] = useState(null);
  const [animateIn, setAnimateIn] = useState(false);
  const [historySubView, setHistorySubView] = useState("log");
  const [selectedTrendParam, setSelectedTrendParam] = useState("calcium");
  // Dosing calc state
  const [calcParam, setCalcParam] = useState("calcium");
  const [calcCurrent, setCalcCurrent] = useState("");
  const [calcTarget, setCalcTarget] = useState("");
  const [calcMethod, setCalcMethod] = useState(0);
  const [doseUnit, setDoseUnit] = useState("tsp"); // tsp, tbsp, ml, g

  useEffect(() => {
    async function load() {
      try {
        const raw = localStorage.getItem("reef-tank-data"); const r = raw ? { value: raw } : null;
        if (r && r.value) { const d = JSON.parse(r.value); if (d.tankGallons) setTankGallons(d.tankGallons); if (d.coralType) setCoralType(d.coralType); if (d.history) setHistory(d.history); if (d.tankGallons || d.history?.length) setShowSetup(false); }
      } catch (e) {}
    }
    load();
    setTimeout(() => setAnimateIn(true), 100);
  }, []);

  const saveData = useCallback(async (newHistory, tg, ct) => {
    try { localStorage.setItem("reef-tank-data", JSON.stringify({ tankGallons: tg || tankGallons, coralType: ct || coralType, history: newHistory || history })); } catch (e) {}
  }, [tankGallons, coralType, history]);

  const runDiagnosis = () => {
    setDiagnosis(getDiagnosis(params, tankGallons, coralType)); setExpandedIssue(null);
    const dateToUse = testDate ? new Date(testDate).toISOString() : new Date().toISOString();
    const entry = { id: Date.now(), date: dateToUse, params: { ...params }, tankGallons, coralType };
    const nh = [entry, ...history].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 100);
    setHistory(nh); saveData(nh);
  };

  const saveTest = () => {
    setParams({ nitrate: "", ph: "", alkalinity: "", calcium: "", phosphate: "", salinity: "", temperature: "", magnesium: "", ammonia: "", nitrite: "" });
    setTestDate("");
    setDiagnosis(null); setView("dashboard");
  };

  const clearHistory = async () => { setHistory([]); try { localStorage.setItem("reef-tank-data", JSON.stringify({ tankGallons, coralType, history: [] })); } catch(e){} };
  const saveTankProfile = () => { setShowSetup(false); saveData(history, tankGallons, coralType); };
  const getParamHistory = (key) => history.filter(h => h.params[key] && h.params[key] !== "").map(h => ({ date: h.date, value: parseFloat(h.params[key]) })).reverse();
  const getChartData = (key) => history.filter(h => h.params[key] && h.params[key] !== "").map(h => ({ date: new Date(h.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }), fullDate: new Date(h.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }), value: parseFloat(h.params[key]) })).reverse();
  const getEffectiveRange = (key) => ({ ...IDEAL_RANGES[key], ...(CORAL_PRESETS[coralType]?.adjustments?.[key] || {}) });
  const allGood = diagnosis && diagnosis.length === 0;
  const hasEntries = Object.values(params).some(v => v !== "");

  // Dosing calculator logic
  const calcResult = (() => {
    const cur = parseFloat(calcCurrent);
    const tar = parseFloat(calcTarget);
    const gal = parseFloat(tankGallons) || 50;
    if (isNaN(cur) || isNaN(tar) || tar <= cur) return null;
    const deficit = tar - cur;
    const cfg = DOSING_CALCS[calcParam];
    if (!cfg) return null;
    const method = cfg.methods[calcMethod] || cfg.methods[0];
    const doses = (deficit / method.perUnit) * (gal / method.perGal);
    const daysNeeded = Math.ceil(deficit / method.maxPerDay);
    const perDay = deficit / daysNeeded;
    const dosesPerDay = (perDay / method.perUnit) * (gal / method.perGal);
    return { deficit, method, doses, daysNeeded, perDay, dosesPerDay, unit: cfg.unit };
  })();

  // Unit conversion for dosing display
  const UNIT_OPTIONS = [
    { key: "tsp", label: "tsp", fullLabel: "Teaspoons" },
    { key: "tbsp", label: "tbsp", fullLabel: "Tablespoons" },
    { key: "ml", label: "ml", fullLabel: "Milliliters" },
    { key: "g", label: "g", fullLabel: "Grams" },
  ];
  const convertDose = (tspAmount) => {
    const method = DOSING_CALCS[calcParam]?.methods[calcMethod];
    if (!method) return { value: tspAmount, label: "tsp" };
    // If method is already in ml (like Brightwell), base unit is doses not tsp
    if (method.mlPerDose) {
      const mlTotal = tspAmount * method.mlPerDose;
      if (doseUnit === "ml") return { value: mlTotal, label: "ml" };
      if (doseUnit === "tsp") return { value: mlTotal / 4.93, label: "tsp" };
      if (doseUnit === "tbsp") return { value: mlTotal / 14.79, label: "tbsp" };
      if (doseUnit === "g") return { value: mlTotal * 1.05, label: "g" }; // approx density
      return { value: mlTotal, label: "ml" };
    }
    if (doseUnit === "tsp") return { value: tspAmount, label: "tsp" };
    if (doseUnit === "tbsp") return { value: tspAmount / 3, label: "tbsp" };
    if (doseUnit === "ml") return { value: tspAmount * 4.93, label: "ml" };
    if (doseUnit === "g" && method.gramsPerTsp) return { value: tspAmount * method.gramsPerTsp, label: "g" };
    if (doseUnit === "g") return { value: tspAmount * 4.0, label: "g" }; // fallback
    return { value: tspAmount, label: "tsp" };
  };
  const fmtDose = (tspAmount) => {
    const c = convertDose(tspAmount);
    if (c.value < 0.01) return `${c.value.toFixed(3)} ${c.label}`;
    if (c.value < 1) return `${c.value.toFixed(2)} ${c.label}`;
    if (c.value < 10) return `${c.value.toFixed(1)} ${c.label}`;
    return `${Math.round(c.value)} ${c.label}`;
  };

  const base = {
    app: { minHeight: "100vh", background: "linear-gradient(165deg, #0a0f1e 0%, #0d1b2a 30%, #0a192f 60%, #051020 100%)", color: "#c8d6e5", fontFamily: "'Outfit', 'DM Sans', system-ui, sans-serif", position: "relative", overflow: "hidden" },
    overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 20% 20%, rgba(6,182,212,0.05) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(14,165,233,0.04) 0%, transparent 50%)", zIndex: 0 },
    container: { maxWidth: 520, margin: "0 auto", padding: "0 16px 80px", position: "relative", zIndex: 1, opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(12px)", transition: "all 0.5s ease" },
    card: { background: "rgba(15,23,42,0.5)", border: "1px solid rgba(51,65,85,0.35)", borderRadius: 14, padding: 20, marginBottom: 14, backdropFilter: "blur(12px)" },
    cardTitle: { fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 14 },
    input: { background: "rgba(2,6,23,0.5)", border: "1px solid rgba(51,65,85,0.5)", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 15, fontFamily: "'JetBrains Mono', monospace", outline: "none", width: "100%", boxSizing: "border-box" },
    select: { background: "rgba(2,6,23,0.5)", border: "1px solid rgba(51,65,85,0.5)", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box", cursor: "pointer" },
    secBtn: { padding: "10px 16px", border: "1px solid rgba(51,65,85,0.5)", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", background: "transparent", color: "#94a3b8" },
    lbl: { fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.5px" },
  };
  const btn = (p) => ({ width: "100%", padding: "13px 20px", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: p ? "pointer" : "default", letterSpacing: "0.5px", background: p ? "linear-gradient(135deg, #0891b2, #06b6d4)" : "rgba(51,65,85,0.3)", color: p ? "#fff" : "#94a3b8", boxShadow: p ? "0 4px 20px rgba(6,182,212,0.25)" : "none", opacity: p ? 1 : 0.5 });
  const navBtn = (a) => ({ flex: 1, padding: "10px 4px", border: "none", borderRadius: 8, background: a ? "rgba(6,182,212,0.15)" : "transparent", color: a ? "#06b6d4" : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.2px" });
  const subNavBtn = (a) => ({ flex: 1, padding: "8px 0", border: "none", borderRadius: 6, background: a ? "rgba(6,182,212,0.12)" : "transparent", color: a ? "#06b6d4" : "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" });
  const badge = (s) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", background: `${SEV[s].badge}30`, color: SEV[s].text });
  const pill = (st) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", background: st === "ok" ? "rgba(16,185,129,0.12)" : st === "critical" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.12)", color: st === "ok" ? "#34d399" : st === "critical" ? "#fca5a5" : "#fcd34d", marginRight: 4, marginBottom: 4 });

  const renderDashboard = () => {
    const last = history[0];
    const days = last ? Math.floor((Date.now() - new Date(last.date).getTime()) / 86400000) : null;
    return (
      <div>
        {showSetup && (
          <div style={base.card}>
            <div style={base.cardTitle}>Tank Profile</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={base.lbl}>Tank Size (gal)</span>
                <input style={base.input} type="number" placeholder="50" value={tankGallons} onChange={e => setTankGallons(e.target.value)} />
              </div>
              <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={base.lbl}>Coral Type</span>
                <select style={base.select} value={coralType} onChange={e => setCoralType(e.target.value)}>
                  {Object.entries(CORAL_PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>{CORAL_PRESETS[coralType].desc}</div>
            <button style={btn(true)} onClick={saveTankProfile}>Save Profile</button>
          </div>
        )}
        {!showSetup && (
          <div style={{ ...base.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontSize: 20, fontWeight: 300, color: "#e2e8f0" }}>{tankGallons} gal</div><div style={{ fontSize: 12, color: "#64748b" }}>{CORAL_PRESETS[coralType]?.label}</div></div>
            <button style={base.secBtn} onClick={() => setShowSetup(true)}>Edit</button>
          </div>
        )}
        <div style={base.card}>
          <div style={base.cardTitle}>Status</div>
          {!last ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#475569" }}><div style={{ fontSize: 32, marginBottom: 8 }}>{"\u{1F9EA}"}</div><div style={{ fontSize: 14 }}>No test results yet</div><div style={{ fontSize: 12, marginTop: 4 }}>Run your first water test to get started</div></div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div><div style={{ fontSize: 13, color: "#94a3b8" }}>Last tested</div><div style={{ fontSize: 16, color: "#e2e8f0", fontWeight: 500 }}>{days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`}</div></div>
                {days > 7 && <span style={{ ...badge("warning"), fontSize: 11 }}>Test Overdue</span>}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                {Object.entries(last.params).filter(([_, v]) => v !== "").map(([key, val]) => {
                  const v = parseFloat(val), range = getEffectiveRange(key);
                  let st = "ok"; if (v < range.min || v > range.max) st = getSeverity(key, v, range, v < range.min ? "low" : "high") === "critical" ? "critical" : "warning";
                  return <span key={key} style={pill(st)}>{IDEAL_RANGES[key].icon} {IDEAL_RANGES[key].label.split(" ")[0]}: {val}</span>;
                })}
              </div>
            </div>
          )}
        </div>
        {history.length >= 2 && (
          <div style={base.card}>
            <div style={base.cardTitle}>Trends</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {["calcium", "alkalinity", "magnesium", "nitrate"].map(key => {
                const data = getParamHistory(key); if (data.length < 2) return null;
                const latest = data[data.length - 1]?.value, range = getEffectiveRange(key), ok = latest >= range.min && latest <= range.max;
                return (<div key={key} style={{ background: "rgba(2,6,23,0.3)", borderRadius: 8, padding: 10 }}><div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 2 }}>{IDEAL_RANGES[key].label}</div><div style={{ fontSize: 18, fontFamily: "'JetBrains Mono', monospace", color: ok ? "#34d399" : "#f59e0b", fontWeight: 600 }}>{latest}</div><Sparkline data={data} color={ok ? "#34d399" : "#f59e0b"} /></div>);
              })}
            </div>
          </div>
        )}
        <button style={btn(true)} onClick={() => { setView("test"); setDiagnosis(null); setExpandedIssue(null); }}>{"\u{1F9EA}"}  New Water Test</button>
      </div>
    );
  };

  const csvTemplateHeaders = ["date","nitrate","ph","alkalinity","calcium","phosphate","salinity","temperature","magnesium","ammonia","nitrite"];
  const downloadCsvTemplate = () => {
    const exampleRow = ["2026-01-15 10:30","3","8.2","8.5","420","0.03","1.025","78","1350","0","0"];
    const csv = [csvTemplateHeaders.join(","), exampleRow.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "reefpulse-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };
  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.trim().split("\n").map(l => l.trim()).filter(l => l);
      if (lines.length < 2) { alert("CSV must have a header row and at least one data row."); return; }
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const paramKeys = Object.keys(IDEAL_RANGES);
      const dataRows = lines.slice(1);
      const newEntries = [];
      for (const line of dataRows) {
        const cols = line.split(",").map(c => c.trim());
        const row = {};
        headers.forEach((h, i) => { row[h] = cols[i] || ""; });
        const entryParams = {};
        paramKeys.forEach(k => { entryParams[k] = row[k] !== undefined && row[k] !== "" ? row[k] : ""; });
        const dateVal = row["date"] || row["test_date"] || row["timestamp"] || "";
        const parsedDate = dateVal ? new Date(dateVal) : new Date();
        const isoDate = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
        newEntries.push({ id: Date.now() + Math.random(), date: isoDate, params: entryParams, tankGallons, coralType });
      }
      if (newEntries.length === 0) { alert("No valid data rows found."); return; }
      if (newEntries.length === 1) {
        const entry = newEntries[0];
        setParams(entry.params);
        if (entry.date) {
          const d = new Date(entry.date);
          const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          setTestDate(local);
        }
        setDiagnosis(null);
      } else {
        const nh = [...newEntries, ...history].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 100);
        setHistory(nh); saveData(nh);
        setView("history");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const renderTest = () => (
    <div>
      <div style={base.card}>
        <div style={base.cardTitle}>Enter Water Parameters</div>
        <div style={{ fontSize: 12, color: "#475569", marginBottom: 16 }}>{tankGallons}gal {CORAL_PRESETS[coralType]?.label} - leave any field blank to skip</div>

        {/* CSV Import/Template */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <label style={{ ...base.secBtn, flex: 1, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {"\u{1F4C2}"} Import CSV
            <input type="file" accept=".csv" onChange={handleCsvUpload} style={{ display: "none" }} />
          </label>
          <button style={{ ...base.secBtn, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={downloadCsvTemplate}>
            {"\u{1F4E5}"} CSV Template
          </button>
        </div>

        {/* Date input */}
        <div style={{ marginBottom: 14, padding: "12px 14px", background: "rgba(2,6,23,0.3)", borderRadius: 10, border: "1px solid rgba(51,65,85,0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: testDate ? 8 : 0 }}>
            <div>
              <span style={{ ...base.lbl, fontSize: 12 }}>{"\u{1F4C5}"} Test Date</span>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{testDate ? new Date(testDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Defaults to now if left blank"}</div>
            </div>
            {testDate && <button style={{ ...base.secBtn, padding: "4px 10px", fontSize: 11 }} onClick={() => setTestDate("")}>Clear</button>}
          </div>
          <input
            type="datetime-local"
            value={testDate}
            onChange={e => setTestDate(e.target.value)}
            style={{ ...base.input, fontSize: 13, marginTop: testDate ? 0 : 8, background: "rgba(2,6,23,0.4)", color: testDate ? "#e2e8f0" : "#475569" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {Object.entries(IDEAL_RANGES).map(([key, info]) => (
            <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={base.lbl}>{info.icon} {info.label} {info.unit && `(${info.unit})`}</span>
              <input style={base.input} type="number" step="any" placeholder={`${info.min}\u2013${info.max}`} value={params[key]} onChange={e => setParams(p => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
      </div>
      {!diagnosis && <button style={btn(hasEntries)} disabled={!hasEntries} onClick={runDiagnosis}>Analyze Parameters</button>}
      {diagnosis && (
        <div>
          {allGood && (
            <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 14, padding: 24, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>{"\u2705"}</div>
              <div style={{ fontSize: 18, fontWeight: 500, color: "#34d399", marginBottom: 4 }}>All Parameters In Range</div>
              <div style={{ fontSize: 13, color: "#6ee7b7" }}>Your reef is looking healthy!</div>
            </div>
          )}
          {diagnosis.sort((a, b) => ({ critical: 0, warning: 1, attention: 2 })[a.severity] - ({ critical: 0, warning: 1, attention: 2 })[b.severity]).map((issue, i) => {
            const exp = expandedIssue === i;
            const rec = getDosingRec(issue.param, issue.value, issue.range, tankGallons);
            const products = getProducts(issue.param, issue.status);
            const steps = getSteps(issue.param, issue.status);
            return (
              <div key={i} style={{ background: SEV[issue.severity].bg, border: `1px solid ${SEV[issue.severity].border}${exp ? "60" : "30"}`, borderRadius: 12, marginBottom: 10, cursor: "pointer", borderLeft: `3px solid ${SEV[issue.severity].border}`, overflow: "hidden", transition: "all 0.25s" }} onClick={() => setExpandedIssue(exp ? null : i)}>
                <div style={{ padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: 6 }}><span style={badge(issue.severity)}>{issue.severity}</span></div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0" }}>{IDEAL_RANGES[issue.param].icon} {IDEAL_RANGES[issue.param].label}</div>
                      <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: SEV[issue.severity].text }}>{issue.value} {issue.range.unit}</span>
                        {" \u2014 "}{issue.status === "low" ? "below" : "above"} ideal ({issue.range.min}{"\u2013"}{issue.range.max})
                      </div>
                    </div>
                    <span style={{ fontSize: 16, color: "#475569", transform: exp ? "rotate(180deg)" : "none", transition: "transform 0.25s", marginTop: 4 }}>{"\u25BE"}</span>
                  </div>
                  {!exp && <div style={{ marginTop: 10, fontSize: 11, color: SEV[issue.severity].text, opacity: 0.8, fontWeight: 500 }}>Tap for {steps.length} resolution step{steps.length !== 1 ? "s" : ""} {"\u2192"}</div>}
                </div>
                {exp && (
                  <div style={{ borderTop: `1px solid ${SEV[issue.severity].border}20`, padding: "0 16px 16px" }} onClick={e => e.stopPropagation()}>
                    {rec && <div style={{ margin: "14px 0", padding: "10px 14px", background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: 8, fontSize: 13, lineHeight: 1.6, color: "#a5d8e6" }}>{"\u{1F48A}"} <strong>Quick fix:</strong> {rec}</div>}
                    {steps.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "1px", marginBottom: 10, textTransform: "uppercase" }}>Step-by-Step Resolution</div>
                        {steps.map((s, j) => (
                          <div key={j} style={{ display: "flex", gap: 10, marginBottom: 10, paddingBottom: j < steps.length - 1 ? 10 : 0, borderBottom: j < steps.length - 1 ? "1px solid rgba(51,65,85,0.2)" : "none" }}>
                            <div style={{ minWidth: 24, height: 24, borderRadius: "50%", background: "rgba(6,182,212,0.15)", color: "#06b6d4", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{j + 1}</div>
                            <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 2 }}>{s.step}</div><div style={{ fontSize: 12, lineHeight: 1.5, color: "#94a3b8" }}>{s.detail}</div></div>
                          </div>
                        ))}
                      </div>
                    )}
                    {products.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "1px", marginBottom: 6, textTransform: "uppercase" }}>Suggested Products</div>
                        {products.map((p, j) => (
                          <div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(2,6,23,0.4)", borderRadius: 8, marginTop: 6, border: "1px solid rgba(51,65,85,0.3)" }}>
                            <div><div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{p.name}</div><div style={{ fontSize: 11, color: "#64748b" }}>{p.note}</div></div>
                            {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#06b6d4", textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>View {"\u2192"}</a>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={{ ...btn(true), flex: 2 }} onClick={saveTest}>Done & Return</button>
            <button style={{ ...base.secBtn, flex: 1 }} onClick={() => { setDiagnosis(null); setExpandedIssue(null); }}>Re-enter</button>
          </div>
        </div>
      )}
    </div>
  );

  // Dosing Calculator
  const renderCalc = () => {
    const cfg = DOSING_CALCS[calcParam];
    const method = cfg?.methods[calcMethod] || cfg?.methods[0];
    return (
      <div>
        <div style={base.card}>
          <div style={base.cardTitle}>{"\u{1F9EE}"} Dosing Calculator</div>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 16 }}>Calculate exact doses for your {tankGallons} gallon tank</div>

          {/* Parameter selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {Object.entries(DOSING_CALCS).map(([key, c]) => (
              <button key={key} onClick={() => { setCalcParam(key); setCalcMethod(0); setCalcCurrent(""); setCalcTarget(""); }} style={{
                flex: 1, padding: "10px 8px", borderRadius: 8, border: "none",
                background: calcParam === key ? "rgba(6,182,212,0.2)" : "rgba(2,6,23,0.3)",
                color: calcParam === key ? "#06b6d4" : "#64748b",
                fontSize: 13, fontWeight: calcParam === key ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
                outline: calcParam === key ? "1px solid rgba(6,182,212,0.4)" : "1px solid rgba(51,65,85,0.2)",
              }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          {/* Method selector */}
          {cfg && cfg.methods.length > 1 && (
            <div style={{ marginBottom: 14 }}>
              <span style={base.lbl}>Method</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                {cfg.methods.map((m, idx) => (
                  <button key={idx} onClick={() => setCalcMethod(idx)} style={{
                    padding: "10px 14px", borderRadius: 8, border: "none", textAlign: "left",
                    background: calcMethod === idx ? "rgba(6,182,212,0.1)" : "rgba(2,6,23,0.3)",
                    outline: calcMethod === idx ? "1px solid rgba(6,182,212,0.35)" : "1px solid rgba(51,65,85,0.2)",
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: calcMethod === idx ? "#06b6d4" : "#94a3b8" }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{m.note}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Inputs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 6 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={base.lbl}>Current ({cfg?.unit})</span>
              <input style={base.input} type="number" step="any" placeholder="e.g. 380" value={calcCurrent} onChange={e => setCalcCurrent(e.target.value)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={base.lbl}>Target ({cfg?.unit})</span>
              <input style={base.input} type="number" step="any" placeholder="e.g. 440" value={calcTarget} onChange={e => setCalcTarget(e.target.value)} />
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginBottom: 4 }}>
            Ideal range for {CORAL_PRESETS[coralType]?.label}: {getEffectiveRange(calcParam).min}{"\u2013"}{getEffectiveRange(calcParam).max} {cfg?.unit}
          </div>
        </div>

        {/* Results */}
        {calcResult && (
          <div style={{ ...base.card, borderColor: "rgba(6,182,212,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={base.cardTitle}>{"\u{1F4CA}"} Dosing Plan</div>
              {/* Unit toggle */}
              <div style={{ display: "flex", gap: 2, background: "rgba(2,6,23,0.4)", borderRadius: 6, padding: 2 }}>
                {UNIT_OPTIONS.map(u => (
                  <button key={u.key} onClick={() => setDoseUnit(u.key)} style={{
                    padding: "4px 8px", borderRadius: 4, border: "none",
                    background: doseUnit === u.key ? "rgba(6,182,212,0.2)" : "transparent",
                    color: doseUnit === u.key ? "#06b6d4" : "#475569",
                    fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}>{u.label}</button>
                ))}
              </div>
            </div>

            {/* Big number */}
            <div style={{ textAlign: "center", padding: "10px 0 16px" }}>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Total Dose Needed</div>
              <div style={{ fontSize: 32, fontWeight: 300, color: "#06b6d4", fontFamily: "'JetBrains Mono', monospace" }}>
                {fmtDose(calcResult.doses)}
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>
                of {method.name.split("(")[0].trim()}
              </div>
            </div>

            {/* Dosing schedule */}
            <div style={{ background: "rgba(2,6,23,0.3)", borderRadius: 10, padding: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#475569", marginBottom: 2 }}>Deficit</div>
                  <div style={{ fontSize: 16, fontFamily: "'JetBrains Mono', monospace", color: "#e2e8f0", fontWeight: 600 }}>{calcResult.deficit} {calcResult.unit}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#475569", marginBottom: 2 }}>Max per day</div>
                  <div style={{ fontSize: 16, fontFamily: "'JetBrains Mono', monospace", color: "#e2e8f0", fontWeight: 600 }}>{method.maxPerDay} {calcResult.unit}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#475569", marginBottom: 2 }}>Days to complete</div>
                  <div style={{ fontSize: 16, fontFamily: "'JetBrains Mono', monospace", color: calcResult.daysNeeded > 1 ? "#f59e0b" : "#34d399", fontWeight: 600 }}>{calcResult.daysNeeded} day{calcResult.daysNeeded !== 1 ? "s" : ""}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#475569", marginBottom: 2 }}>Dose per day</div>
                  <div style={{ fontSize: 16, fontFamily: "'JetBrains Mono', monospace", color: "#e2e8f0", fontWeight: 600 }}>{fmtDose(calcResult.dosesPerDay)}</div>
                </div>
              </div>
            </div>

            {/* Daily schedule breakdown */}
            {calcResult.daysNeeded > 1 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "1px", marginBottom: 8, textTransform: "uppercase" }}>Daily Schedule</div>
                {Array.from({ length: Math.min(calcResult.daysNeeded, 7) }).map((_, d) => {
                  const isLast = d === calcResult.daysNeeded - 1;
                  const dayDose = calcResult.dosesPerDay;
                  const raised = calcResult.perDay;
                  const cumulative = Math.min(parseFloat(calcCurrent) + raised * (d + 1), parseFloat(calcTarget));
                  return (
                    <div key={d} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 6, background: d % 2 === 0 ? "rgba(2,6,23,0.2)" : "transparent" }}>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>Day {d + 1}{isLast ? " (retest)" : ""}</span>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "#06b6d4", fontWeight: 600 }}>
                          {fmtDose(dayDose)}
                        </span>
                        <span style={{ fontSize: 11, color: "#475569", marginLeft: 8 }}>{"\u2192"} ~{cumulative.toFixed(calcParam === "alkalinity" ? 1 : 0)} {calcResult.unit}</span>
                      </div>
                    </div>
                  );
                })}
                {calcResult.daysNeeded > 7 && <div style={{ fontSize: 11, color: "#475569", padding: "6px 10px" }}>...and {calcResult.daysNeeded - 7} more day{calcResult.daysNeeded - 7 > 1 ? "s" : ""}</div>}
              </div>
            )}

            {/* Safety note */}
            <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 8, fontSize: 12, lineHeight: 1.5, color: "#fcd34d" }}>
              {"\u26A0\uFE0F"} Always dissolve supplements in RODI water before adding to tank. Dose near a powerhead for even distribution. Retest after completing the dosing schedule.
            </div>
          </div>
        )}

        {calcCurrent && calcTarget && !calcResult && (
          <div style={{ ...base.card, textAlign: "center", color: "#475569", padding: 20 }}>
            <div style={{ fontSize: 13 }}>Target must be higher than current value</div>
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => {
    const chartData = getChartData(selectedTrendParam);
    const er = getEffectiveRange(selectedTrendParam);
    const pi = IDEAL_RANGES[selectedTrendParam];
    const available = Object.keys(IDEAL_RANGES).filter(key => history.some(h => h.params[key] && h.params[key] !== ""));
    return (
      <div>
        <div style={{ display: "flex", gap: 2, background: "rgba(2,6,23,0.4)", borderRadius: 8, padding: 2, marginBottom: 16 }}>
          <button style={subNavBtn(historySubView === "log")} onClick={() => setHistorySubView("log")}>{"\u{1F4CB}"} Test Log</button>
          <button style={subNavBtn(historySubView === "trends")} onClick={() => setHistorySubView("trends")}>{"\u{1F4C8}"} Trends</button>
        </div>
        {historySubView === "trends" && (
          <div>
            {history.length < 1 ? (
              <div style={{ ...base.card, textAlign: "center", padding: 30, color: "#475569" }}><div style={{ fontSize: 32, marginBottom: 8 }}>{"\u{1F4C8}"}</div><div>Save at least 1 test to see trends</div></div>
            ) : (
              <>
                <div style={base.card}>
                  <div style={base.cardTitle}>Select Parameter</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {available.map(key => {
                      const act = selectedTrendParam === key, data = getParamHistory(key), latest = data[data.length - 1]?.value, range = getEffectiveRange(key), ok = latest !== undefined && latest >= range.min && latest <= range.max;
                      return (<button key={key} onClick={() => setSelectedTrendParam(key)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: act ? "rgba(6,182,212,0.2)" : "rgba(2,6,23,0.3)", color: act ? "#06b6d4" : "#94a3b8", fontSize: 12, fontWeight: act ? 700 : 500, cursor: "pointer", fontFamily: "inherit", outline: act ? "1px solid rgba(6,182,212,0.4)" : "1px solid rgba(51,65,85,0.2)" }}>{IDEAL_RANGES[key].icon} {IDEAL_RANGES[key].label.split(" ")[0].split("(")[0]}</button>);
                    })}
                  </div>
                </div>
                <div style={base.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={base.cardTitle}>{pi.icon} {pi.label}</div>
                    <div style={{ fontSize: 11, color: "#475569" }}>Ideal: {er.min}{"\u2013"}{er.max} {pi.unit}</div>
                  </div>
                  {chartData.length < 2 ? (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "#475569", fontSize: 13 }}>Need at least 2 tests with {pi.label.toLowerCase()} data to show trend</div>
                  ) : (
                    <div style={{ marginLeft: -12 }}>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.25)" />
                          <ReferenceArea y1={er.min} y2={er.max} fill="rgba(16,185,129,0.06)" strokeOpacity={0} />
                          <ReferenceLine y={er.min} stroke="rgba(16,185,129,0.35)" strokeDasharray="4 4" />
                          <ReferenceLine y={er.max} stroke="rgba(16,185,129,0.35)" strokeDasharray="4 4" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#475569" }} axisLine={{ stroke: "rgba(51,65,85,0.3)" }} tickLine={{ stroke: "rgba(51,65,85,0.3)" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#475569", fontFamily: "'JetBrains Mono', monospace" }} axisLine={{ stroke: "rgba(51,65,85,0.3)" }} tickLine={{ stroke: "rgba(51,65,85,0.3)" }} domain={['auto', 'auto']} />
                          <Tooltip content={<ChartTooltip />} />
                          <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4, fill: "#06b6d4", stroke: "#0a192f", strokeWidth: 2 }} activeDot={{ r: 6, fill: "#06b6d4", stroke: "#fff", strokeWidth: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {chartData.length > 0 && (
                    <div style={{ marginTop: 14, borderTop: "1px solid rgba(51,65,85,0.2)", paddingTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: "1px", marginBottom: 8, textTransform: "uppercase" }}>Readings</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {[...chartData].reverse().map((d, j) => {
                          const ok = d.value >= er.min && d.value <= er.max;
                          return (<div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: 6, background: j === 0 ? "rgba(6,182,212,0.06)" : "transparent" }}><span style={{ fontSize: 12, color: "#64748b" }}>{d.fullDate || d.date}</span><span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: ok ? "#34d399" : "#f59e0b" }}>{d.value} {pi.unit}</span></div>);
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        {historySubView === "log" && (
          <div>
            {history.length === 0 ? (
              <div style={{ ...base.card, textAlign: "center", padding: 30, color: "#475569" }}><div style={{ fontSize: 32, marginBottom: 8 }}>{"\u{1F4CB}"}</div><div>No test history yet</div></div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: "#64748b" }}>{history.length} test{history.length !== 1 ? "s" : ""} recorded</div>
                  <button style={{ ...base.secBtn, fontSize: 11, padding: "6px 12px", color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }} onClick={clearHistory}>Clear All</button>
                </div>
                {history.map((entry) => {
                  const date = new Date(entry.date), filled = Object.entries(entry.params).filter(([_, v]) => v !== ""), issues = getDiagnosis(entry.params, entry.tankGallons, entry.coralType);
                  return (
                    <div key={entry.id} style={{ background: "rgba(15,23,42,0.4)", border: "1px solid rgba(51,65,85,0.25)", borderRadius: 10, padding: 14, marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                        <div style={{ fontSize: 12, color: "#475569" }}>{date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                        {filled.map(([key, val]) => {
                          const v = parseFloat(val), range = getEffectiveRange(key); let st = "ok";
                          if (v < range.min || v > range.max) st = getSeverity(key, v, range, v < range.min ? "low" : "high") === "critical" ? "critical" : "warning";
                          return <span key={key} style={pill(st)}>{IDEAL_RANGES[key].label.split(" ")[0].split("(")[0]}: {val}</span>;
                        })}
                      </div>
                      {issues.length > 0 && <div style={{ marginTop: 6, fontSize: 12, color: "#94a3b8" }}>{issues.length} issue{issues.length !== 1 ? "s" : ""} detected</div>}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={base.app}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      <div style={base.overlay} />
      <div style={base.container}>
        <div style={{ textAlign: "center", padding: "32px 0 20px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#06b6d4", marginBottom: 4 }}>ReefPulse</div>
          <h1 style={{ fontSize: 28, fontWeight: 300, color: "#e2e8f0", letterSpacing: "-0.5px", margin: 0, lineHeight: 1.2 }}>Reef Tank Monitor</h1>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Track {"\u00B7"} Diagnose {"\u00B7"} Dose {"\u00B7"} Trend</div>
        </div>
        <div style={{ display: "flex", gap: 2, background: "rgba(15,23,42,0.7)", borderRadius: 10, padding: 3, marginBottom: 20, border: "1px solid rgba(51,65,85,0.4)" }}>
          <button style={navBtn(view === "dashboard")} onClick={() => setView("dashboard")}>Dashboard</button>
          <button style={navBtn(view === "test")} onClick={() => { setView("test"); setDiagnosis(null); setExpandedIssue(null); }}>Test</button>
          <button style={navBtn(view === "calc")} onClick={() => setView("calc")}>Dosing</button>
          <button style={navBtn(view === "history")} onClick={() => setView("history")}>History</button>
        </div>
        {view === "dashboard" && renderDashboard()}
        {view === "test" && renderTest()}
        {view === "calc" && renderCalc()}
        {view === "history" && renderHistory()}
      </div>
    </div>
  );
}
