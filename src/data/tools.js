const tone = {
  success: "success",
  warning: "warning",
  danger: "danger",
  neutral: "neutral",
};

const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const sum = (values) =>
  values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);

export const calculateCrCl = ({
  age,
  weight,
  serumCreatinine,
  creatinineUnit,
  sex,
}) => {
  const patientAge = asNumber(age);
  const patientWeight = asNumber(weight);
  const creatinine = asNumber(serumCreatinine);

  if (!patientAge || !patientWeight || !creatinine) {
    return null;
  }

  const rawValue =
    creatinineUnit === "mgdl"
      ? ((140 - patientAge) * patientWeight) / (72 * creatinine)
      : ((140 - patientAge) * patientWeight) / (creatinine * 0.815);

  const adjusted = sex === "female" ? rawValue * 0.85 : rawValue;
  return Math.round(adjusted * 10) / 10;
};

const formatScore = (value) => {
  if (!Number.isFinite(value)) {
    return "Pending";
  }

  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
};

const buildMetrics = (entries) =>
  entries.filter((entry) => entry.value !== undefined && entry.value !== null && entry.value !== "");

const getChadsVascScore = (values) => {
  const age = asNumber(values.age) ?? 0;
  const female = Boolean(values.femaleSex);
  const agePoints = age >= 75 ? 2 : age >= 65 ? 1 : 0;

  return sum([
    values.chf ? 1 : 0,
    values.hypertension ? 1 : 0,
    values.diabetes ? 1 : 0,
    values.priorStroke ? 2 : 0,
    values.vascularDisease ? 1 : 0,
    female ? 1 : 0,
    agePoints,
  ]);
};

const getChadsRecommendation = (score, femaleOnly) => {
  if (femaleOnly) {
    return {
      headline: "No anticoagulation indicated by score alone",
      summary: "Female sex alone does not justify stroke prevention therapy.",
      preference: "No routine anticoagulation",
      tone: tone.success,
    };
  }

  if (score <= 0) {
    return {
      headline: "No anticoagulation indicated",
      summary: "Estimated thromboembolic risk is low by CHA2DS2-VASc.",
      preference: "No routine anticoagulation",
      tone: tone.success,
    };
  }

  if (score === 1) {
    return {
      headline: "Consider anticoagulation",
      summary: "Shared decision-making is appropriate for borderline stroke risk.",
      preference: "Consider DOAC if bleeding risk acceptable",
      tone: tone.warning,
    };
  }

  return {
    headline: "Anticoagulation recommended",
    summary: "Stroke prevention benefit generally outweighs bleeding risk.",
    preference: "DOAC preferred unless warfarin-only condition present",
    tone: tone.danger,
  };
};

const getAgeBucket = (age) => {
  const numericAge = asNumber(age) ?? 0;

  if (numericAge >= 80) {
    return "80plus";
  }

  if (numericAge >= 75) {
    return "75to79";
  }

  if (numericAge >= 65) {
    return "65to74";
  }

  return "under65";
};

const mapPerioperativeHold = (drug, bleedingRisk, crcl) => {
  if (!Number.isFinite(crcl)) {
    return null;
  }

  if (["apixaban", "rivaroxaban", "edoxaban"].includes(drug)) {
    if (bleedingRisk === "lowDental") {
      return "Hold the morning of the procedure";
    }

    if (crcl < 15) {
      return "Use specialist input; renal function is below standard dosing thresholds";
    }

    if (crcl < 30) {
      return bleedingRisk === "low"
        ? "Hold 48 hours before"
        : "Hold 72 hours before";
    }

    return bleedingRisk === "low" ? "Hold 24 hours before" : "Hold 48 hours before";
  }

  if (drug === "dabigatran") {
    if (bleedingRisk === "lowDental") {
      return "Hold the morning of the procedure";
    }

    if (crcl >= 80) {
      return bleedingRisk === "low" ? "Hold 24 hours before" : "Hold 48 hours before";
    }

    if (crcl >= 50) {
      return bleedingRisk === "low" ? "Hold 48 hours before" : "Hold 72 hours before";
    }

    if (crcl >= 30) {
      return bleedingRisk === "low" ? "Hold 48 hours before" : "Hold 96 hours before";
    }

    if (crcl >= 15) {
      return bleedingRisk === "low" ? "Hold 72 hours before" : "Hold 96 hours before";
    }

    return "Avoid standard dosing assumptions; seek specialist input";
  }

  return null;
};

const getRestartWindow = (bleedingRisk, anticoagulant) => {
  if (anticoagulant === "warfarin") {
    return "Restart the evening of the procedure if hemostasis is secure";
  }

  if (bleedingRisk === "low" || bleedingRisk === "lowDental") {
    return "Restart the evening of the procedure or the following day";
  }

  return "Restart after 48 to 72 hours once bleeding risk is controlled";
};

export const toolCategories = [
  { id: "all", label: "All tools" },
  { id: "algorithm", label: "Algorithms" },
  { id: "score", label: "Scoring tools" },
  { id: "renal", label: "Renal dosing" },
];

export const tools = [
  {
    id: "perioperative",
    title: "Perioperative Anticoagulant Planner",
    shortTitle: "Perioperative",
    type: "algorithm",
    category: "algorithm",
    badge: "Pathway",
    blurb:
      "Plan hold timing, reversal strategy, and restart advice for surgery or invasive procedures.",
    tags: ["DOAC", "warfarin", "surgery", "bleeding"],
    notes: [
      "Use with local anesthesia, reversal stock, and perioperative policy.",
      "Bridging is usually unnecessary outside clearly high thromboembolic risk states.",
    ],
    inputs: [
      {
        id: "surgeryType",
        label: "Procedure urgency",
        type: "radio",
        options: [
          { value: "elective", label: "Elective / planned" },
          { value: "urgent", label: "Urgent within 12 to 24 hours" },
          { value: "emergency", label: "Emergency within 12 hours" },
        ],
        defaultValue: "elective",
      },
      {
        id: "bleedingRisk",
        label: "Bleeding risk",
        type: "select",
        options: [
          { value: "low", label: "Low non-dental" },
          { value: "lowDental", label: "Low dental" },
          { value: "moderate", label: "Moderate" },
          { value: "high", label: "High" },
        ],
        defaultValue: "low",
      },
      {
        id: "anticoagulant",
        label: "Current anticoagulant",
        type: "select",
        options: [
          { value: "apixaban", label: "Apixaban" },
          { value: "dabigatran", label: "Dabigatran" },
          { value: "edoxaban", label: "Edoxaban" },
          { value: "rivaroxaban", label: "Rivaroxaban" },
          { value: "warfarin", label: "Warfarin" },
        ],
        defaultValue: "apixaban",
      },
      { id: "age", label: "Age", type: "number", min: 18, step: 1 },
      { id: "weight", label: "Weight (kg)", type: "number", min: 20, step: 0.1 },
      {
        id: "serumCreatinine",
        label: "Serum creatinine",
        type: "number",
        min: 0.1,
        step: 0.1,
      },
      {
        id: "creatinineUnit",
        label: "Creatinine unit",
        type: "radio",
        options: [
          { value: "umol", label: "umol/L" },
          { value: "mgdl", label: "mg/dL" },
        ],
        defaultValue: "umol",
      },
      {
        id: "sex",
        label: "Sex",
        type: "radio",
        options: [
          { value: "male", label: "Male" },
          { value: "female", label: "Female" },
        ],
        defaultValue: "male",
      },
      {
        id: "highThromboembolicRisk",
        label: "High thromboembolic risk / bridging candidate",
        type: "checkbox",
      },
    ],
    calculate: (values) => {
      const surgeryType = values.surgeryType ?? "elective";
      const drug = values.anticoagulant ?? "apixaban";
      const bleedingRisk = values.bleedingRisk ?? "low";
      const crcl = drug === "warfarin" ? null : calculateCrCl(values);

      if (surgeryType === "emergency") {
        const reversalMap = {
          warfarin: "Vitamin K 2.5 to 5 mg IV plus 4-factor PCC if rapid reversal is needed.",
          dabigatran: "Proceed urgently and consider idarucizumab 5 g IV if clinically indicated.",
          apixaban:
            "Proceed urgently; consider 4-factor PCC when bleeding is life-threatening or uncontrolled.",
          rivaroxaban:
            "Proceed urgently; consider 4-factor PCC when bleeding is life-threatening or uncontrolled.",
          edoxaban:
            "Proceed urgently; consider 4-factor PCC when bleeding is life-threatening or uncontrolled.",
        };

        return {
          tone: tone.danger,
          headline: "Do not delay emergency surgery",
          summary: reversalMap[drug],
          action: "Move to definitive procedure planning with hematology and anesthesia support.",
          metrics: buildMetrics([
            { label: "Urgency", value: "Emergency" },
            { label: "Anticoagulant", value: drug },
          ]),
          supporting: [
            "Prioritize airway, hemodynamics, and source control.",
            `Postoperative restart: ${getRestartWindow(bleedingRisk, drug)}`,
          ],
        };
      }

      if (drug === "warfarin") {
        const inrTarget = bleedingRisk === "high" ? "<= 1.2" : "<= 1.5";

        return {
          tone: surgeryType === "urgent" ? tone.warning : tone.neutral,
          headline:
            surgeryType === "urgent"
              ? "Hold warfarin and assess reversal needs now"
              : "Stop warfarin 5 days before the procedure",
          summary: `Check INR on the day of the procedure and aim for ${inrTarget}.`,
          action: values.highThromboembolicRisk
            ? "Consider LMWH bridging if thromboembolic risk is genuinely high."
            : "Most patients do not need bridging.",
          metrics: buildMetrics([
            { label: "Drug", value: "Warfarin" },
            { label: "INR target", value: inrTarget },
            { label: "Restart", value: "Evening of procedure" },
          ]),
          supporting: [
            "Bridging is most relevant for mechanical mitral valve or recent stroke/TIA.",
            "Coordinate timing with anesthesia if neuraxial procedures are planned.",
          ],
        };
      }

      if (!Number.isFinite(crcl)) {
        return {
          tone: tone.warning,
          headline: "Renal assessment needed",
          summary: "Age, weight, sex, and serum creatinine are required to estimate DOAC hold timing.",
          action: "Enter renal variables or use the creatinine clearance tool first.",
          metrics: [{ label: "Drug", value: drug }],
          supporting: ["Cockcroft-Gault remains the dosing standard for DOAC pathways."],
        };
      }

      const holdWindow = mapPerioperativeHold(drug, bleedingRisk, crcl);
      const restartWindow = getRestartWindow(bleedingRisk, drug);

      return {
        tone:
          surgeryType === "urgent" || bleedingRisk === "high" ? tone.warning : tone.success,
        headline: holdWindow ?? "Review timing with specialist support",
        summary:
          surgeryType === "urgent"
            ? "Urgent procedure: hold the DOAC now, confirm the last dose time, and plan reversal only if clinically necessary."
            : "Elective planning can usually follow standard interruption windows.",
        action: restartWindow,
        metrics: buildMetrics([
          { label: "Drug", value: drug },
          { label: "CrCl", value: `${crcl} mL/min` },
          { label: "Pre-op hold", value: holdWindow },
        ]),
        supporting: [
          `Bleeding risk selected: ${bleedingRisk}.`,
          "Secure hemostasis before resuming treatment.",
        ],
      };
    },
  },
  {
    id: "af-dosing",
    title: "AF Anticoagulant Dosing Guide",
    shortTitle: "AF Dosing",
    type: "algorithm",
    category: "algorithm",
    badge: "Dosing",
    blurb:
      "Estimate stroke risk, identify warfarin-only states, and review renal-adjusted oral anticoagulant options.",
    tags: ["AF", "DOAC", "stroke prevention", "renal"],
    notes: [
      "Designed for non-valvular atrial fibrillation unless a warfarin-only condition is present.",
      "Dose outputs support review; final prescribing should still align with monographs and local policy.",
    ],
    inputs: [
      { id: "age", label: "Age", type: "number", min: 18, step: 1 },
      { id: "weight", label: "Weight (kg)", type: "number", min: 20, step: 0.1 },
      {
        id: "serumCreatinine",
        label: "Serum creatinine",
        type: "number",
        min: 0.1,
        step: 0.1,
      },
      {
        id: "creatinineUnit",
        label: "Creatinine unit",
        type: "radio",
        options: [
          { value: "umol", label: "umol/L" },
          { value: "mgdl", label: "mg/dL" },
        ],
        defaultValue: "umol",
      },
      {
        id: "sex",
        label: "Sex",
        type: "radio",
        options: [
          { value: "male", label: "Male" },
          { value: "female", label: "Female" },
        ],
        defaultValue: "male",
      },
      { id: "femaleSex", label: "Female sex category counts for CHA2DS2-VASc", type: "hidden" },
      { id: "chf", label: "Heart failure history", type: "checkbox" },
      { id: "hypertension", label: "Hypertension history", type: "checkbox" },
      { id: "diabetes", label: "Diabetes mellitus", type: "checkbox" },
      { id: "priorStroke", label: "Previous stroke / TIA / systemic embolism", type: "checkbox" },
      { id: "vascularDisease", label: "Vascular disease / previous MI / PAD / aortic plaque", type: "checkbox" },
      { id: "mechanicalValve", label: "Mechanical valve", type: "checkbox" },
      { id: "lvThrombus", label: "Left ventricular thrombus", type: "checkbox" },
      { id: "rheumaticValveDisease", label: "Rheumatic valvular disease", type: "checkbox" },
      { id: "mitralStenosis", label: "Moderate to severe mitral stenosis", type: "checkbox" },
      { id: "highBleedingRisk", label: "High bleeding risk / HAS-BLED >= 3", type: "checkbox" },
      { id: "verapamil", label: "Concomitant verapamil", type: "checkbox" },
      { id: "amiodarone", label: "Concomitant amiodarone", type: "checkbox" },
      { id: "dronedarone", label: "Concomitant dronedarone", type: "checkbox" },
      { id: "pGpInhibitor", label: "Other strong P-gp inhibitor", type: "checkbox" },
    ],
    calculate: (values) => {
      const mergedValues = {
        ...values,
        femaleSex: values.sex === "female",
      };
      const score = getChadsVascScore(mergedValues);
      const femaleOnly = values.sex === "female" && score === 1;
      const recommendation = getChadsRecommendation(score, femaleOnly);
      const crcl = calculateCrCl(values);
      const age = asNumber(values.age) ?? 0;
      const ageBucket = getAgeBucket(age);

      const warfarinOnly =
        values.mechanicalValve ||
        values.lvThrombus ||
        values.rheumaticValveDisease ||
        values.mitralStenosis;

      const apixabanReductionCount = sum([
        age >= 80 ? 1 : 0,
        (asNumber(values.weight) ?? Infinity) <= 60 ? 1 : 0,
        values.creatinineUnit === "umol"
          ? (asNumber(values.serumCreatinine) ?? 0) >= 133
            ? 1
            : 0
          : (asNumber(values.serumCreatinine) ?? 0) >= 1.5
            ? 1
            : 0,
      ]);

      const apixabanDose =
        crcl === null || crcl < 15
          ? "Avoid / insufficient renal function"
          : apixabanReductionCount >= 2
            ? "2.5 mg twice daily"
            : "5 mg twice daily";

      const dabigatranReduce =
        ageBucket === "80plus" ||
        crcl === null ||
        (crcl >= 30 && crcl <= 49) ||
        values.verapamil ||
        values.highBleedingRisk ||
        ageBucket === "75to79";
      const dabigatranDose =
        crcl === null || crcl < 30
          ? "Avoid when CrCl < 30 mL/min"
          : dabigatranReduce
            ? "110 mg twice daily"
            : "150 mg twice daily";

      const rivaroxabanDose =
        crcl === null || crcl < 15
          ? "Avoid when CrCl < 15 mL/min"
          : crcl <= 49
            ? "15 mg once daily with food"
            : "20 mg once daily with food";

      const edoxabanReduce =
        values.pGpInhibitor ||
        values.dronedarone ||
        (asNumber(values.weight) ?? Infinity) <= 60 ||
        (crcl !== null && crcl >= 15 && crcl <= 50);
      const edoxabanDose =
        crcl === null || crcl < 15
          ? "Avoid when CrCl < 15 mL/min"
          : crcl > 95
            ? "Not preferred when CrCl > 95 mL/min"
            : edoxabanReduce
              ? "30 mg once daily"
              : "60 mg once daily";

      return {
        tone: warfarinOnly ? tone.warning : recommendation.tone,
        headline: warfarinOnly
          ? "Warfarin-only clinical context"
          : recommendation.headline,
        summary: warfarinOnly
          ? "Mechanical valve disease, LV thrombus, rheumatic valve disease, or moderate-severe mitral stenosis should steer therapy away from DOACs."
          : recommendation.summary,
        action: warfarinOnly
          ? "Use warfarin with INR 2.0 to 3.0 unless a specialist pathway indicates otherwise."
          : recommendation.preference,
        metrics: buildMetrics([
          { label: "CHA2DS2-VASc", value: `${score}` },
          { label: "CrCl", value: crcl !== null ? `${crcl} mL/min` : "Need renal data" },
          { label: "Preferred route", value: warfarinOnly ? "Warfarin" : recommendation.preference },
        ]),
        supporting: [
          femaleOnly
            ? "Female sex alone is not treated as a standalone anticoagulation trigger."
            : "Review bleeding risk, frailty, and patient preference before prescribing.",
          "Renal estimates use Cockcroft-Gault because that matches pivotal DOAC studies.",
        ],
        recommendations: [
          { label: "Apixaban", value: apixabanDose },
          { label: "Dabigatran", value: dabigatranDose },
          { label: "Rivaroxaban", value: rivaroxabanDose },
          { label: "Edoxaban", value: edoxabanDose },
          { label: "Warfarin", value: "Target INR 2.0 to 3.0; time in range goal > 65%" },
        ],
      };
    },
  },
  {
    id: "thrombophilia",
    title: "Thrombophilia Testing Triage",
    shortTitle: "Thrombophilia",
    type: "algorithm",
    category: "algorithm",
    badge: "Testing",
    blurb:
      "Decide when testing is worth doing, when it is low-value, and when timing makes results unreliable.",
    tags: ["VTE", "testing", "family history", "unusual site"],
    notes: [
      "Testing is useful only if results could change management, counseling, or family planning.",
      "Avoid clot-based thrombophilia workups during acute thrombosis or active anticoagulation when possible.",
    ],
    inputs: [
      {
        id: "firstVte",
        label: "Is this the first VTE?",
        type: "radio",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
        defaultValue: "yes",
      },
      {
        id: "site",
        label: "VTE location",
        type: "radio",
        options: [
          { value: "usual", label: "Usual site (leg DVT or PE)" },
          { value: "unusual", label: "Unusual site (cerebral or splanchnic)" },
        ],
        defaultValue: "usual",
      },
      {
        id: "provokingFactor",
        label: "Provoking context",
        type: "select",
        options: [
          { value: "unprovoked", label: "Unprovoked" },
          { value: "minor", label: "Minor / weak transient factor" },
          { value: "major", label: "Major transient factor" },
        ],
        defaultValue: "unprovoked",
      },
      { id: "ageUnder50", label: "Age under 50 at first event", type: "checkbox" },
      { id: "familyHistory", label: "First-degree relative with VTE", type: "checkbox" },
      { id: "pregnancyPlanning", label: "Pregnancy-related questions or future pregnancy planning", type: "checkbox" },
      { id: "wouldChangeManagement", label: "Results would change management or counseling", type: "checkbox" },
      { id: "acutePhase", label: "Currently in the acute VTE phase", type: "checkbox" },
      { id: "onAnticoagulation", label: "Currently receiving anticoagulation", type: "checkbox" },
    ],
    calculate: (values) => {
      if (values.firstVte === "no") {
        return {
          tone: tone.success,
          headline: "Routine thrombophilia testing is usually low-value",
          summary: "Recurrent VTE already pushes many patients toward long-term secondary prevention.",
          action: "Avoid routine hereditary thrombophilia panels unless a very specific management question remains.",
          metrics: [{ label: "Context", value: "Recurrent VTE" }],
          supporting: ["Focus on duration, provoking context, and anticoagulation tolerance."],
        };
      }

      if (values.provokingFactor === "major") {
        return {
          tone: tone.success,
          headline: "Testing is generally not recommended",
          summary: "Major transient provoking factors already explain the event well.",
          action: "Reserve testing for exceptional situations where management would genuinely change.",
          metrics: [{ label: "Provoking factor", value: "Major transient" }],
          supporting: ["Examples include major surgery, prolonged hospitalization, or major trauma."],
        };
      }

      if (values.acutePhase || values.onAnticoagulation) {
        return {
          tone: tone.warning,
          headline: "Delay clot-based thrombophilia tests",
          summary: "Protein C, protein S, antithrombin, and lupus anticoagulant results can be misleading during acute thrombosis or active anticoagulation.",
          action: "If safe, test after the acute period and ideally after anticoagulation has been held for an appropriate interval.",
          metrics: buildMetrics([
            { label: "Acute phase", value: values.acutePhase ? "Yes" : "No" },
            { label: "On anticoagulation", value: values.onAnticoagulation ? "Yes" : "No" },
          ]),
          supporting: ["Genetic tests such as factor V Leiden and prothrombin mutation remain stable."],
        };
      }

      const indications = [
        values.provokingFactor === "unprovoked" && values.ageUnder50,
        values.site === "unusual",
        values.provokingFactor === "minor" && values.ageUnder50,
        values.familyHistory,
        values.pregnancyPlanning,
        values.wouldChangeManagement,
      ].filter(Boolean).length;

      if (indications === 0) {
        return {
          tone: tone.neutral,
          headline: "Selective testing only",
          summary: "The current history does not strongly support broad thrombophilia testing.",
          action: "Consider avoiding routine panels unless a new management question emerges.",
          metrics: [{ label: "Indication count", value: "0" }],
          supporting: ["Testing asymptomatic relatives or older patients with clear provoking factors rarely changes care."],
        };
      }

      return {
        tone: tone.warning,
        headline: "Testing can be considered",
        summary: "There is at least one feature that makes testing potentially management-relevant.",
        action: "If proceeding, consider factor V Leiden, prothrombin G20210A, antithrombin, protein C, protein S, and antiphospholipid antibody testing.",
        metrics: buildMetrics([
          { label: "Indication count", value: `${indications}` },
          { label: "Site", value: values.site === "unusual" ? "Unusual site" : "Usual site" },
        ]),
        supporting: [
          "Document how the result would alter duration of anticoagulation, pregnancy planning, or family counseling.",
          "Interpret hereditary panels carefully in older adults and when baseline risk is already high.",
        ],
      };
    },
  },
  {
    id: "vitt",
    title: "VITT Clinical Screen",
    shortTitle: "VITT",
    type: "algorithm",
    category: "algorithm",
    badge: "Acute care",
    blurb:
      "Rapidly classify possible vaccine-induced immune thrombotic thrombocytopenia and highlight immediate management priorities.",
    tags: ["VITT", "platelets", "PF4", "emergency"],
    notes: [
      "This is a support screen for rare suspected cases, not a substitute for urgent hematology review.",
      "When suspicion is real, treatment should not wait for confirmatory PF4 results.",
    ],
    inputs: [
      { id: "symptomatic", label: "Concerning symptoms present", type: "checkbox" },
      { id: "adenoviralVaccine", label: "Adenoviral vector COVID vaccine received", type: "checkbox" },
      { id: "daysSinceVaccine", label: "Days since vaccination", type: "number", min: 0, step: 1 },
      { id: "plateletCount", label: "Platelet count (x10^9/L)", type: "number", min: 1, step: 1 },
      { id: "dDimerMarked", label: "D-dimer markedly elevated", type: "checkbox" },
      { id: "fibrinogenLow", label: "Fibrinogen low or falling", type: "checkbox" },
      { id: "thrombosisConfirmed", label: "Imaging-confirmed arterial or venous thrombosis", type: "checkbox" },
      {
        id: "antiPf4",
        label: "Anti-PF4 ELISA result",
        type: "radio",
        options: [
          { value: "pending", label: "Pending / unavailable" },
          { value: "positive", label: "Positive" },
          { value: "negative", label: "Negative" },
        ],
        defaultValue: "pending",
      },
    ],
    calculate: (values) => {
      const days = asNumber(values.daysSinceVaccine);
      const platelets = asNumber(values.plateletCount);
      const inWindow = Number.isFinite(days) && days >= 4 && days <= 28;
      const thrombocytopenia = Number.isFinite(platelets) && platelets < 150;

      if (!values.symptomatic) {
        return {
          tone: tone.success,
          headline: "Low immediate concern for VITT",
          summary: "The current symptom profile does not fit a typical acute VITT screen.",
          action: "Reassess if new severe headache, abdominal pain, dyspnea, leg symptoms, or bleeding features emerge.",
          metrics: [{ label: "Symptoms", value: "Not concerning" }],
        };
      }

      if (!values.adenoviralVaccine || !inWindow) {
        return {
          tone: tone.success,
          headline: "VITT is unlikely on timing history",
          summary: "Typical VITT occurs 4 to 28 days after adenoviral vector vaccination.",
          action: "Investigate alternative causes of thrombosis, thrombocytopenia, or systemic symptoms.",
          metrics: buildMetrics([
            { label: "Adenoviral vaccine", value: values.adenoviralVaccine ? "Yes" : "No" },
            { label: "Timing", value: Number.isFinite(days) ? `${days} days` : "Not entered" },
          ]),
        };
      }

      if (!thrombocytopenia) {
        return {
          tone: tone.warning,
          headline: "Check or repeat the CBC promptly",
          summary: "A platelet count below 150 x10^9/L is usually part of the syndrome definition.",
          action: "If symptoms are convincing, repeat blood work and continue diagnostic imaging based on presentation.",
          metrics: buildMetrics([
            { label: "Timing", value: `${days} days` },
            { label: "Platelets", value: Number.isFinite(platelets) ? `${platelets}` : "Pending" },
          ]),
        };
      }

      const likelyFeatures = [
        values.thrombosisConfirmed,
        values.dDimerMarked,
        values.fibrinogenLow,
      ].filter(Boolean).length;

      const definite =
        values.thrombosisConfirmed &&
        values.dDimerMarked &&
        values.antiPf4 === "positive";

      return {
        tone: definite ? tone.danger : tone.warning,
        headline: definite ? "Definite or near-definite VITT pattern" : "Probable VITT - treat while confirming",
        summary: definite
          ? "Timing, thrombocytopenia, thrombosis, elevated D-dimer, and PF4 positivity align strongly with VITT."
          : "The syndrome remains plausible even before PF4 confirmation, especially with thrombocytopenia and major coagulation derangement.",
        action:
          "Start non-heparin anticoagulation if safe, give IVIG 1 g/kg daily for 2 days, and involve hematology urgently.",
        metrics: buildMetrics([
          { label: "Timing", value: `${days} days` },
          { label: "Platelets", value: `${platelets}` },
          { label: "Supportive features", value: `${likelyFeatures}/3` },
        ]),
        supporting: [
          "Avoid heparin and avoid platelet transfusion unless bleeding is life-threatening.",
          "Use PF4 ELISA rather than a rapid HIT assay when testing is available.",
        ],
      };
    },
  },
  {
    id: "wells-pe",
    title: "Wells PE Score",
    shortTitle: "Wells PE",
    type: "calculator",
    category: "score",
    badge: "Score",
    blurb: "Estimate PE pre-test probability and decide whether D-dimer or imaging should come next.",
    tags: ["PE", "diagnosis", "D-dimer", "CTPA"],
    notes: ["Best used before imaging when PE is on the differential."],
    inputs: [
      { id: "dvtSigns", label: "Clinical signs of DVT", type: "checkbox" },
      { id: "peLikely", label: "PE is the most likely diagnosis or equally likely", type: "checkbox" },
      { id: "tachycardia", label: "Heart rate > 100 bpm", type: "checkbox" },
      { id: "immobilization", label: "Immobilization >= 3 days or surgery in previous 4 weeks", type: "checkbox" },
      { id: "previousVte", label: "Previous objectively diagnosed PE or DVT", type: "checkbox" },
      { id: "hemoptysis", label: "Hemoptysis", type: "checkbox" },
      { id: "malignancy", label: "Active malignancy or palliative cancer care", type: "checkbox" },
    ],
    calculate: (values) => {
      const score = sum([
        values.dvtSigns ? 3 : 0,
        values.peLikely ? 3 : 0,
        values.tachycardia ? 1.5 : 0,
        values.immobilization ? 1.5 : 0,
        values.previousVte ? 1.5 : 0,
        values.hemoptysis ? 1 : 0,
        values.malignancy ? 1 : 0,
      ]);

      const tier =
        score <= 1 ? "Low" : score <= 6 ? "Moderate" : "High";
      const likely = score > 4;

      return {
        tone: likely ? tone.warning : tone.success,
        headline: likely ? "PE likely" : "PE unlikely",
        summary: likely
          ? "Proceed to definitive imaging unless another pathway is clinically stronger."
          : "High-sensitivity D-dimer is the next step if no exclusion criteria apply.",
        action: likely ? "CTPA is usually indicated." : "A negative D-dimer can safely exclude PE in low-risk patients.",
        metrics: buildMetrics([
          { label: "Score", value: formatScore(score) },
          { label: "Two-tier result", value: likely ? "> 4" : "<= 4" },
          { label: "Three-tier risk", value: tier },
        ]),
      };
    },
  },
  {
    id: "wells-dvt",
    title: "Wells DVT Score",
    shortTitle: "Wells DVT",
    type: "calculator",
    category: "score",
    badge: "Score",
    blurb: "Estimate DVT probability and guide whether D-dimer or compression ultrasound should come first.",
    tags: ["DVT", "ultrasound", "D-dimer"],
    notes: ["Use alongside focused examination and alternative diagnoses."],
    inputs: [
      { id: "activeCancer", label: "Active cancer", type: "checkbox" },
      { id: "bedridden", label: "Bedridden > 3 days or major surgery within 4 weeks", type: "checkbox" },
      { id: "calfSwelling", label: "Calf swelling > 3 cm vs the other leg", type: "checkbox" },
      { id: "collateralVeins", label: "Collateral superficial veins", type: "checkbox" },
      { id: "entireLegSwollen", label: "Entire leg swollen", type: "checkbox" },
      { id: "tenderness", label: "Localized tenderness along the deep venous system", type: "checkbox" },
      { id: "pittingEdema", label: "Pitting edema greater in symptomatic leg", type: "checkbox" },
      { id: "immobilizedLeg", label: "Paralysis, paresis, or recent plaster immobilization", type: "checkbox" },
      { id: "priorDvt", label: "Previously documented DVT", type: "checkbox" },
      { id: "alternativeDiagnosis", label: "Alternative diagnosis as likely or more likely", type: "checkbox" },
    ],
    calculate: (values) => {
      const score = sum([
        values.activeCancer ? 1 : 0,
        values.bedridden ? 1 : 0,
        values.calfSwelling ? 1 : 0,
        values.collateralVeins ? 1 : 0,
        values.entireLegSwollen ? 1 : 0,
        values.tenderness ? 1 : 0,
        values.pittingEdema ? 1 : 0,
        values.immobilizedLeg ? 1 : 0,
        values.priorDvt ? 1 : 0,
        values.alternativeDiagnosis ? -2 : 0,
      ]);

      const tier =
        score <= 0 ? "Low" : score <= 2 ? "Moderate" : "High";
      const likely = score >= 2;

      return {
        tone: likely ? tone.warning : tone.success,
        headline: likely ? "DVT likely" : "DVT unlikely",
        summary: likely
          ? "Compression ultrasonography is the preferred next test."
          : "A high-sensitivity D-dimer can safely exclude DVT when negative.",
        action: likely
          ? "If ultrasound is negative but suspicion remains, repeat imaging or combine with D-dimer."
          : "Escalate to imaging if D-dimer is positive.",
        metrics: buildMetrics([
          { label: "Score", value: `${score}` },
          { label: "Two-tier result", value: likely ? "Likely" : "Unlikely" },
          { label: "Three-tier risk", value: tier },
        ]),
      };
    },
  },
  {
    id: "chads2",
    title: "CHADS2 Stroke Score",
    shortTitle: "CHADS2",
    type: "calculator",
    category: "score",
    badge: "Score",
    blurb: "Classic AF stroke score retained for legacy pathways and quick bedside estimation.",
    tags: ["AF", "stroke prevention"],
    notes: ["CHA2DS2-VASc generally provides better low-risk discrimination."],
    inputs: [
      { id: "chf", label: "Congestive heart failure", type: "checkbox" },
      { id: "hypertension", label: "Hypertension", type: "checkbox" },
      { id: "age75", label: "Age >= 75", type: "checkbox" },
      { id: "diabetes", label: "Diabetes mellitus", type: "checkbox" },
      { id: "priorStroke", label: "Previous stroke or TIA", type: "checkbox" },
    ],
    calculate: (values) => {
      const score = sum([
        values.chf ? 1 : 0,
        values.hypertension ? 1 : 0,
        values.age75 ? 1 : 0,
        values.diabetes ? 1 : 0,
        values.priorStroke ? 2 : 0,
      ]);

      const riskMap = {
        0: "1.9% per year",
        1: "2.8% per year",
        2: "4.0% per year",
        3: "5.9% per year",
        4: "8.5% per year",
        5: "12.5% per year",
        6: "18.2% per year",
      };

      return {
        tone: score >= 2 ? tone.warning : tone.success,
        headline: score >= 2 ? "Oral anticoagulation recommended" : score === 1 ? "Consider oral anticoagulation" : "Low stroke risk",
        summary: `Estimated annual stroke risk: ${riskMap[score] ?? "not available"}.`,
        action: score >= 2 ? "OAC is preferred unless contraindicated." : score === 1 ? "Shared decision-making is appropriate." : "No therapy or aspirin may be considered in legacy pathways.",
        metrics: buildMetrics([
          { label: "Score", value: `${score}` },
          { label: "Risk", value: riskMap[score] },
        ]),
      };
    },
  },
  {
    id: "cha2ds2-vasc",
    title: "CHA2DS2-VASc Stroke Score",
    shortTitle: "CHA2DS2-VASc",
    type: "calculator",
    category: "score",
    badge: "Score",
    blurb: "Estimate thromboembolic risk in atrial fibrillation with the contemporary bedside standard.",
    tags: ["AF", "stroke prevention", "DOAC"],
    notes: ["Female sex alone should not trigger anticoagulation."],
    inputs: [
      { id: "age", label: "Age", type: "number", min: 18, step: 1 },
      {
        id: "sex",
        label: "Sex",
        type: "radio",
        options: [
          { value: "male", label: "Male" },
          { value: "female", label: "Female" },
        ],
        defaultValue: "male",
      },
      { id: "chf", label: "Congestive heart failure", type: "checkbox" },
      { id: "hypertension", label: "Hypertension", type: "checkbox" },
      { id: "diabetes", label: "Diabetes mellitus", type: "checkbox" },
      { id: "priorStroke", label: "Stroke / TIA / thromboembolism history", type: "checkbox" },
      { id: "vascularDisease", label: "Vascular disease", type: "checkbox" },
    ],
    calculate: (values) => {
      const score = getChadsVascScore({
        ...values,
        femaleSex: values.sex === "female",
      });
      const femaleOnly = values.sex === "female" && score === 1;
      const annualRisk = {
        0: "0%",
        1: "1.3%",
        2: "2.2%",
        3: "3.2%",
        4: "4.0%",
        5: "6.7%",
        6: "9.8%",
        7: "9.6%",
        8: "6.7%",
        9: "15.2%",
      };
      const recommendation = getChadsRecommendation(score, femaleOnly);

      return {
        tone: recommendation.tone,
        headline: recommendation.headline,
        summary: `Estimated annual stroke risk: ${annualRisk[score] ?? "not available"}.`,
        action: recommendation.preference,
        metrics: buildMetrics([
          { label: "Score", value: `${score}` },
          { label: "Annual risk", value: annualRisk[score] },
        ]),
        supporting: [
          femaleOnly
            ? "Female sex is a risk modifier, not a lone treatment trigger."
            : "DOACs are usually preferred over warfarin in non-valvular AF.",
        ],
      };
    },
  },
  {
    id: "has-bled",
    title: "HAS-BLED Bleeding Score",
    shortTitle: "HAS-BLED",
    type: "calculator",
    category: "score",
    badge: "Score",
    blurb: "Screen for bleeding risk factors that should be corrected or monitored before and during anticoagulation.",
    tags: ["bleeding", "AF", "risk review"],
    notes: ["A high HAS-BLED score should prompt action, not automatic denial of anticoagulation."],
    inputs: [
      { id: "hypertension", label: "Uncontrolled hypertension (systolic > 160)", type: "checkbox" },
      { id: "renal", label: "Abnormal renal function", type: "checkbox" },
      { id: "liver", label: "Abnormal liver function", type: "checkbox" },
      { id: "stroke", label: "Stroke history", type: "checkbox" },
      { id: "bleeding", label: "Prior major bleeding or predisposition", type: "checkbox" },
      { id: "labileInr", label: "Labile INR / TTR < 60%", type: "checkbox" },
      { id: "elderly", label: "Age >= 65", type: "checkbox" },
      { id: "drugs", label: "Drugs predisposing to bleeding", type: "checkbox" },
      { id: "alcohol", label: "Excess alcohol use", type: "checkbox" },
    ],
    calculate: (values) => {
      const score = sum([
        values.hypertension ? 1 : 0,
        values.renal ? 1 : 0,
        values.liver ? 1 : 0,
        values.stroke ? 1 : 0,
        values.bleeding ? 1 : 0,
        values.labileInr ? 1 : 0,
        values.elderly ? 1 : 0,
        values.drugs ? 1 : 0,
        values.alcohol ? 1 : 0,
      ]);

      const risk =
        score <= 1 ? "Low" : score === 2 ? "Moderate" : score === 3 ? "High" : "Very high";

      return {
        tone: score >= 3 ? tone.warning : tone.success,
        headline: score >= 3 ? "High bleeding risk - review modifiable factors" : "Bleeding risk acceptable for routine review",
        summary: `HAS-BLED ${score} corresponds to a ${risk.toLowerCase()} bleeding risk profile.`,
        action:
          "Correct blood pressure, unnecessary antiplatelet/NSAID use, alcohol excess, and warfarin instability before changing the stroke prevention plan.",
        metrics: buildMetrics([
          { label: "Score", value: `${score}` },
          { label: "Risk tier", value: risk },
        ]),
      };
    },
  },
  {
    id: "perc",
    title: "PERC Rule",
    shortTitle: "PERC",
    type: "calculator",
    category: "score",
    badge: "Rule-out",
    blurb: "Rule out PE without D-dimer only when all criteria are satisfied and pre-test probability is very low.",
    tags: ["PE", "rule out", "ED"],
    notes: ["Apply only when gestalt pre-test probability is low, not when PE is already moderate or high on clinical grounds."],
    inputs: [
      { id: "lowPretest", label: "Clinical pre-test probability <= 15%", type: "checkbox" },
      { id: "age", label: "Age < 50 years", type: "checkbox" },
      { id: "heartRate", label: "Heart rate < 100 bpm", type: "checkbox" },
      { id: "oxygen", label: "Room-air oxygen saturation > 94%", type: "checkbox" },
      { id: "noPriorVte", label: "No prior DVT or PE", type: "checkbox" },
      { id: "noTrauma", label: "No recent trauma or surgery within 4 weeks", type: "checkbox" },
      { id: "noHemoptysis", label: "No hemoptysis", type: "checkbox" },
      { id: "noEstrogen", label: "No exogenous estrogen use", type: "checkbox" },
      { id: "noDvtSigns", label: "No clinical signs of DVT", type: "checkbox" },
    ],
    calculate: (values) => {
      const criteriaMet = [
        values.age,
        values.heartRate,
        values.oxygen,
        values.noPriorVte,
        values.noTrauma,
        values.noHemoptysis,
        values.noEstrogen,
        values.noDvtSigns,
      ].filter(Boolean).length;

      const allMet = criteriaMet === 8;

      return {
        tone: allMet && values.lowPretest ? tone.success : tone.warning,
        headline:
          allMet && values.lowPretest
            ? "PE can be ruled out clinically"
            : "PERC cannot exclude PE here",
        summary:
          allMet && values.lowPretest
            ? "No D-dimer is required when gestalt pre-test probability is low and every PERC criterion is satisfied."
            : "Move to D-dimer or imaging based on Wells score and clinical context.",
        action:
          values.lowPretest
            ? "If any single PERC criterion fails, continue the standard PE workup."
            : "Do not use PERC outside a clearly low-risk pre-test setting.",
        metrics: buildMetrics([
          { label: "Criteria met", value: `${criteriaMet}/8` },
          { label: "Low pre-test", value: values.lowPretest ? "Yes" : "No" },
        ]),
      };
    },
  },
  {
    id: "pesi",
    title: "PESI",
    shortTitle: "PESI",
    type: "calculator",
    category: "score",
    badge: "Severity",
    blurb: "Stratify 30-day PE mortality and support outpatient versus inpatient management planning.",
    tags: ["PE", "risk stratification", "outpatient"],
    notes: ["Risk class is only one part of discharge suitability."],
    inputs: [
      { id: "age", label: "Age", type: "number", min: 18, step: 1 },
      { id: "male", label: "Male sex", type: "checkbox" },
      { id: "cancer", label: "Cancer", type: "checkbox" },
      { id: "heartFailure", label: "Heart failure", type: "checkbox" },
      { id: "chronicLungDisease", label: "Chronic lung disease", type: "checkbox" },
      { id: "tachycardia", label: "Heart rate >= 110 bpm", type: "checkbox" },
      { id: "lowBp", label: "Systolic BP < 100 mmHg", type: "checkbox" },
      { id: "highRespRate", label: "Respiratory rate >= 30/min", type: "checkbox" },
      { id: "lowTemp", label: "Temperature < 36 C", type: "checkbox" },
      { id: "alteredMentalState", label: "Altered mental status", type: "checkbox" },
      { id: "lowSpo2", label: "SpO2 < 90% on room air", type: "checkbox" },
    ],
    calculate: (values) => {
      const age = asNumber(values.age) ?? 0;
      const score = sum([
        age,
        values.male ? 10 : 0,
        values.cancer ? 30 : 0,
        values.heartFailure ? 10 : 0,
        values.chronicLungDisease ? 10 : 0,
        values.tachycardia ? 20 : 0,
        values.lowBp ? 30 : 0,
        values.highRespRate ? 20 : 0,
        values.lowTemp ? 20 : 0,
        values.alteredMentalState ? 60 : 0,
        values.lowSpo2 ? 20 : 0,
      ]);

      let riskClass = "I";
      let mortality = "0 to 1.6%";
      let toneValue = tone.success;

      if (score > 125) {
        riskClass = "V";
        mortality = "10.0 to 24.5%";
        toneValue = tone.danger;
      } else if (score > 105) {
        riskClass = "IV";
        mortality = "4.0 to 11.4%";
        toneValue = tone.warning;
      } else if (score > 85) {
        riskClass = "III";
        mortality = "3.2 to 7.1%";
        toneValue = tone.warning;
      } else if (score > 65) {
        riskClass = "II";
        mortality = "1.7 to 3.5%";
      }

      return {
        tone: toneValue,
        headline:
          riskClass === "I" || riskClass === "II"
            ? "Low-risk PE phenotype"
            : riskClass === "III"
              ? "Intermediate-risk PE phenotype"
              : "High-risk PE phenotype",
        summary: `PESI class ${riskClass} with estimated 30-day mortality ${mortality}.`,
        action:
          riskClass === "I" || riskClass === "II"
            ? "Assess discharge suitability, home support, and follow-up access."
            : riskClass === "III"
              ? "Admit for monitoring and consider RV assessment."
              : "Escalate monitoring and review for reperfusion strategy if unstable.",
        metrics: buildMetrics([
          { label: "Score", value: `${score}` },
          { label: "Class", value: riskClass },
          { label: "30-day mortality", value: mortality },
        ]),
      };
    },
  },
  {
    id: "spesi",
    title: "Simplified PESI",
    shortTitle: "sPESI",
    type: "calculator",
    category: "score",
    badge: "Severity",
    blurb: "Fast binary PE risk tool for early discharge and escalation decisions.",
    tags: ["PE", "risk stratification", "short form"],
    notes: ["Pairs well with troponin and RV assessment in borderline cases."],
    inputs: [
      { id: "age80", label: "Age > 80 years", type: "checkbox" },
      { id: "cancer", label: "History of cancer", type: "checkbox" },
      { id: "cardiopulmonary", label: "Chronic cardiopulmonary disease", type: "checkbox" },
      { id: "tachycardia", label: "Heart rate >= 110 bpm", type: "checkbox" },
      { id: "lowBp", label: "Systolic BP <= 100 mmHg", type: "checkbox" },
      { id: "lowSpo2", label: "SpO2 < 90% on room air", type: "checkbox" },
    ],
    calculate: (values) => {
      const score = sum([
        values.age80 ? 1 : 0,
        values.cancer ? 1 : 0,
        values.cardiopulmonary ? 1 : 0,
        values.tachycardia ? 1 : 0,
        values.lowBp ? 1 : 0,
        values.lowSpo2 ? 1 : 0,
      ]);

      return {
        tone: score === 0 ? tone.success : tone.warning,
        headline: score === 0 ? "Low-risk PE by sPESI" : "High-risk PE by sPESI",
        summary:
          score === 0
            ? "Estimated 30-day mortality is about 1.0%."
            : "Estimated 30-day mortality rises to roughly 10.9%.",
        action:
          score === 0
            ? "If social and clinical factors align, outpatient or early discharge may be reasonable."
            : "Admit and refine risk with troponin, BNP, and RV assessment.",
        metrics: buildMetrics([
          { label: "Score", value: `${score}` },
          { label: "Risk", value: score === 0 ? "Low" : "High" },
        ]),
      };
    },
  },
  {
    id: "timi-ua",
    title: "TIMI UA/NSTEMI",
    shortTitle: "TIMI UA",
    type: "calculator",
    category: "score",
    badge: "ACS",
    blurb: "Estimate 14-day ischemic event risk in unstable angina and NSTEMI.",
    tags: ["ACS", "NSTEMI", "coronary"],
    notes: ["Supports early invasive versus conservative strategy conversations."],
    inputs: [
      { id: "age65", label: "Age >= 65 years", type: "checkbox" },
      { id: "riskFactors", label: "Three or more CAD risk factors", type: "checkbox" },
      { id: "knownCad", label: "Known coronary stenosis >= 50%", type: "checkbox" },
      { id: "asaUse", label: "Aspirin use in the past 7 days", type: "checkbox" },
      { id: "severeAngina", label: "Two or more angina episodes in 24 hours", type: "checkbox" },
      { id: "stDeviation", label: "ST change >= 0.5 mm", type: "checkbox" },
      { id: "positiveMarker", label: "Positive cardiac biomarker", type: "checkbox" },
    ],
    calculate: (values) => {
      const score = sum([
        values.age65 ? 1 : 0,
        values.riskFactors ? 1 : 0,
        values.knownCad ? 1 : 0,
        values.asaUse ? 1 : 0,
        values.severeAngina ? 1 : 0,
        values.stDeviation ? 1 : 0,
        values.positiveMarker ? 1 : 0,
      ]);

      const riskMap = {
        0: "4.7%",
        1: "4.7%",
        2: "8.3%",
        3: "13.2%",
        4: "19.9%",
        5: "26.2%",
        6: "40.9%",
        7: "40.9%",
      };

      return {
        tone: score >= 5 ? tone.danger : score >= 3 ? tone.warning : tone.success,
        headline:
          score >= 5 ? "High ACS event risk" : score >= 3 ? "Moderate ACS event risk" : "Lower ACS event risk",
        summary: `Estimated 14-day event risk: ${riskMap[score]}.`,
        action:
          score >= 5
            ? "Early invasive management is usually appropriate."
            : score >= 3
              ? "Consider angiography within 24 to 72 hours."
              : "Conservative management and stress testing may be reasonable if stable.",
        metrics: buildMetrics([
          { label: "Score", value: `${score}` },
          { label: "14-day risk", value: riskMap[score] },
        ]),
      };
    },
  },
  {
    id: "timi-stemi",
    title: "TIMI STEMI",
    shortTitle: "TIMI STEMI",
    type: "calculator",
    category: "score",
    badge: "ACS",
    blurb: "Estimate 30-day mortality in ST-elevation myocardial infarction.",
    tags: ["STEMI", "mortality", "critical care"],
    notes: ["Supports level-of-care planning after reperfusion has been initiated."],
    inputs: [
      {
        id: "ageGroup",
        label: "Age group",
        type: "radio",
        options: [
          { value: "under65", label: "Under 65" },
          { value: "65to74", label: "65 to 74" },
          { value: "75plus", label: "75 or older" },
        ],
        defaultValue: "under65",
      },
      { id: "dmHtnAngina", label: "Diabetes, hypertension, or prior angina", type: "checkbox" },
      { id: "lowBp", label: "Systolic BP < 100 mmHg", type: "checkbox" },
      { id: "highHr", label: "Heart rate > 100 bpm", type: "checkbox" },
      { id: "killip", label: "Killip class II to IV", type: "checkbox" },
      { id: "lowWeight", label: "Weight < 67 kg", type: "checkbox" },
      { id: "anteriorMi", label: "Anterior ST elevation or LBBB", type: "checkbox" },
      { id: "lateTreatment", label: "Time to treatment > 4 hours", type: "checkbox" },
    ],
    calculate: (values) => {
      const agePoints =
        values.ageGroup === "75plus" ? 3 : values.ageGroup === "65to74" ? 2 : 0;
      const score = sum([
        agePoints,
        values.dmHtnAngina ? 1 : 0,
        values.lowBp ? 3 : 0,
        values.highHr ? 2 : 0,
        values.killip ? 2 : 0,
        values.lowWeight ? 1 : 0,
        values.anteriorMi ? 1 : 0,
        values.lateTreatment ? 1 : 0,
      ]);

      const riskMap = {
        0: "0.8%",
        1: "1.6%",
        2: "2.2%",
        3: "4.4%",
        4: "7.3%",
        5: "12.4%",
        6: "16.1%",
        7: "23.4%",
        8: "26.8%",
      };
      const mortality = score > 8 ? "35.9%" : riskMap[score];

      return {
        tone: score >= 6 ? tone.danger : score >= 4 ? tone.warning : tone.success,
        headline:
          score >= 6 ? "High 30-day STEMI mortality risk" : score >= 4 ? "Moderate STEMI mortality risk" : "Lower STEMI mortality risk",
        summary: `Estimated 30-day mortality: ${mortality}.`,
        action:
          score >= 6
            ? "Use ICU-level monitoring and consider mechanical support if shock develops."
            : score >= 4
              ? "Close hemodynamic monitoring is warranted."
              : "Standard post-reperfusion monitoring is reasonable if otherwise stable.",
        metrics: buildMetrics([
          { label: "Score", value: `${score}` },
          { label: "30-day mortality", value: mortality },
        ]),
      };
    },
  },
  {
    id: "khorana",
    title: "Khorana VTE Score",
    shortTitle: "Khorana",
    type: "calculator",
    category: "score",
    badge: "Cancer",
    blurb: "Estimate ambulatory chemotherapy-associated VTE risk and identify patients who may benefit from thromboprophylaxis.",
    tags: ["cancer", "VTE", "thromboprophylaxis"],
    notes: ["Always balance prophylaxis decisions against bleeding risk and tumour site."],
    inputs: [
      {
        id: "cancerSite",
        label: "Cancer site",
        type: "select",
        options: [
          { value: "other", label: "Other site" },
          { value: "high", label: "High risk: lung, lymphoma, gynecologic, bladder, testicular" },
          { value: "veryHigh", label: "Very high risk: stomach or pancreas" },
        ],
        defaultValue: "other",
      },
      { id: "platelets", label: "Platelet count (x10^9/L)", type: "number", min: 1, step: 1 },
      { id: "hemoglobin", label: "Hemoglobin (g/L)", type: "number", min: 1, step: 1 },
      { id: "esa", label: "Receiving erythropoiesis-stimulating agent", type: "checkbox" },
      { id: "leukocytes", label: "Leukocyte count (x10^9/L)", type: "number", min: 0, step: 0.1 },
      { id: "bmi", label: "BMI (kg/m^2)", type: "number", min: 1, step: 0.1 },
    ],
    calculate: (values) => {
      const platelets = asNumber(values.platelets) ?? 0;
      const hemoglobin = asNumber(values.hemoglobin) ?? Infinity;
      const leukocytes = asNumber(values.leukocytes) ?? 0;
      const bmi = asNumber(values.bmi) ?? 0;
      const siteScore =
        values.cancerSite === "veryHigh" ? 2 : values.cancerSite === "high" ? 1 : 0;

      const score = sum([
        siteScore,
        platelets >= 350 ? 1 : 0,
        hemoglobin < 100 || values.esa ? 1 : 0,
        leukocytes > 11 ? 1 : 0,
        bmi >= 35 ? 1 : 0,
      ]);

      const risk =
        score === 0 ? "Low" : score <= 2 ? "Intermediate" : "High";

      return {
        tone: score >= 3 ? tone.warning : tone.success,
        headline:
          score >= 3
            ? "High ambulatory cancer-associated VTE risk"
            : score >= 1
              ? "Intermediate VTE risk"
              : "Low VTE risk",
        summary:
          score === 0
            ? "Observed short-term VTE rate is roughly 0.3 to 0.8%."
            : score <= 2
              ? "Observed short-term VTE rate is roughly 1.8 to 2.0%."
              : "Observed short-term VTE rate is roughly 6.7 to 7.1%.",
        action:
          score >= 3
            ? "If bleeding risk is acceptable, discuss thromboprophylaxis."
            : score >= 1
              ? "Individualize prophylaxis after reviewing tumour bleeding risk and drug interactions."
              : "Routine prophylaxis is usually not needed in the ambulatory setting.",
        metrics: buildMetrics([
          { label: "Score", value: `${score}` },
          { label: "Risk tier", value: risk },
        ]),
      };
    },
  },
  {
    id: "creatinine-clearance",
    title: "Creatinine Clearance",
    shortTitle: "CrCl",
    type: "calculator",
    category: "renal",
    badge: "Renal",
    blurb: "Calculate Cockcroft-Gault clearance and review common anticoagulant dosing thresholds.",
    tags: ["renal", "DOAC", "Cockcroft-Gault"],
    notes: ["Use actual body weight unless a local policy specifically advises otherwise."],
    inputs: [
      { id: "age", label: "Age", type: "number", min: 18, step: 1 },
      { id: "weight", label: "Weight (kg)", type: "number", min: 20, step: 0.1 },
      {
        id: "serumCreatinine",
        label: "Serum creatinine",
        type: "number",
        min: 0.1,
        step: 0.1,
      },
      {
        id: "creatinineUnit",
        label: "Creatinine unit",
        type: "radio",
        options: [
          { value: "umol", label: "umol/L" },
          { value: "mgdl", label: "mg/dL" },
        ],
        defaultValue: "umol",
      },
      {
        id: "sex",
        label: "Sex",
        type: "radio",
        options: [
          { value: "male", label: "Male" },
          { value: "female", label: "Female" },
        ],
        defaultValue: "male",
      },
    ],
    calculate: (values) => {
      const crcl = calculateCrCl(values);

      if (!Number.isFinite(crcl)) {
        return {
          tone: tone.warning,
          headline: "Enter age, weight, creatinine, and sex",
          summary: "Cockcroft-Gault requires all four fields.",
          action: "Once calculated, use CrCl rather than eGFR when reviewing DOAC pathways.",
        };
      }

      return {
        tone: crcl < 30 ? tone.warning : tone.success,
        headline: `Estimated CrCl: ${crcl} mL/min`,
        summary:
          crcl < 15
            ? "Renal function is below usual DOAC prescribing thresholds."
            : crcl < 30
              ? "Renal impairment will affect several DOAC dosing and perioperative decisions."
              : "Renal function is within the range where standard dosing pathways often apply.",
        action: "Cross-check the specific anticoagulant and indication before prescribing.",
        metrics: buildMetrics([
          { label: "CrCl", value: `${crcl} mL/min` },
          { label: "Renal band", value: crcl < 15 ? "< 15" : crcl < 30 ? "15 to 29" : crcl < 50 ? "30 to 49" : ">= 50" },
        ]),
        recommendations: [
          { label: "Apixaban", value: crcl < 15 ? "Avoid" : "Dose reduction depends on age, weight, and creatinine criteria" },
          { label: "Dabigatran", value: crcl < 30 ? "Avoid" : crcl < 50 ? "Reduced AF dosing usually needed" : "Standard AF dosing usually possible" },
          { label: "Rivaroxaban", value: crcl < 15 ? "Avoid" : crcl < 50 ? "Reduced AF dosing usually needed" : "Standard AF dosing usually possible" },
          { label: "Edoxaban", value: crcl < 15 ? "Avoid" : crcl > 95 ? "Reduced efficacy concern above 95" : crcl <= 50 ? "Reduced dosing usually needed" : "Standard dosing usually possible" },
        ],
      };
    },
  },
  {
    id: "abcd2",
    title: "ABCD2 TIA Score",
    shortTitle: "ABCD2",
    type: "calculator",
    category: "score",
    badge: "Neurology",
    blurb: "Estimate early stroke risk after TIA and guide urgency of investigation.",
    tags: ["TIA", "stroke", "urgency"],
    notes: ["Do not use this score to delay urgent assessment when high-risk features are present."],
    inputs: [
      { id: "age60", label: "Age >= 60", type: "checkbox" },
      { id: "highBp", label: "Initial BP >= 140/90 mmHg", type: "checkbox" },
      {
        id: "clinical",
        label: "Clinical features",
        type: "radio",
        options: [
          { value: "other", label: "Other symptoms" },
          { value: "speech", label: "Speech disturbance without weakness" },
          { value: "weakness", label: "Unilateral weakness" },
        ],
        defaultValue: "other",
      },
      {
        id: "duration",
        label: "Duration",
        type: "radio",
        options: [
          { value: "under10", label: "Under 10 minutes" },
          { value: "10to59", label: "10 to 59 minutes" },
          { value: "60plus", label: "60 minutes or more" },
        ],
        defaultValue: "under10",
      },
      { id: "diabetes", label: "Diabetes mellitus", type: "checkbox" },
    ],
    calculate: (values) => {
      const clinicalPoints =
        values.clinical === "weakness" ? 2 : values.clinical === "speech" ? 1 : 0;
      const durationPoints =
        values.duration === "60plus" ? 2 : values.duration === "10to59" ? 1 : 0;
      const score = sum([
        values.age60 ? 1 : 0,
        values.highBp ? 1 : 0,
        clinicalPoints,
        durationPoints,
        values.diabetes ? 1 : 0,
      ]);

      const risk =
        score <= 3
          ? { label: "Low", twoDay: "1.0%", sevenDay: "1.2%" }
          : score <= 5
            ? { label: "Moderate", twoDay: "4.1%", sevenDay: "5.9%" }
            : { label: "High", twoDay: "8.1%", sevenDay: "11.7%" };

      return {
        tone: score >= 4 ? tone.warning : tone.success,
        headline:
          score >= 6
            ? "High early stroke risk"
            : score >= 4
              ? "Moderate early stroke risk"
              : "Lower early stroke risk",
        summary: `Estimated 2-day stroke risk ${risk.twoDay}; 7-day risk ${risk.sevenDay}.`,
        action:
          score >= 6
            ? "Emergency admission and immediate imaging are usually appropriate."
            : score >= 4
              ? "Arrange urgent same-day or next-day assessment."
              : "Rapid outpatient TIA evaluation is still required.",
        metrics: buildMetrics([
          { label: "Score", value: `${score}` },
          { label: "Risk tier", value: risk.label },
        ]),
      };
    },
  },
];
