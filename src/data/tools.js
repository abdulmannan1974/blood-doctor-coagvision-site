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

  if (patientAge === null || patientWeight === null || creatinine === null || creatinine <= 0) {
    return null;
  }

  const rawValue =
    creatinineUnit === "mgdl"
      ? ((140 - patientAge) * patientWeight) / (72 * creatinine)
      : ((140 - patientAge) * patientWeight) / (creatinine * 0.814);

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

const formatMetricValue = (value, suffix = "") => {
  if (!Number.isFinite(value)) {
    return "Not available";
  }

  return `${Number.isInteger(value) ? value : value.toFixed(1)}${suffix}`;
};

const sentenceCase = (value) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const buildTable = (title, headers, rows) => ({ title, headers, rows });

const formatBleedingRiskLabel = (value) => {
  const labels = {
    low_non_dental: "Low non-dental",
    low_dental: "Low dental",
    moderate: "Moderate",
    high: "High",
  };

  return labels[value] ?? sentenceCase(value ?? "");
};

const getDoacRestartWindow = (bleedingRisk) => {
  if (bleedingRisk === "low_dental") {
    return "Resume later the same day or the following morning once local hemostasis is secure.";
  }

  if (bleedingRisk === "low_non_dental") {
    return "Resume about 24 hours after the procedure if hemostasis is secure.";
  }

  if (bleedingRisk === "moderate") {
    return "Resume after 48 hours if hemostasis is stable.";
  }

  return "Resume after 48 to 72 hours once bleeding risk is controlled and no active bleeding remains.";
};

const getElectiveDoacHoldPlan = (drug, bleedingRisk, crcl) => {
  if (!Number.isFinite(crcl)) {
    return {
      hold: "Renal function is required to determine the interruption interval.",
      leadDays: null,
      rationale: "Use Cockcroft-Gault creatinine clearance before finalizing DOAC timing.",
    };
  }

  if (bleedingRisk === "low_dental") {
    return {
      hold: "Usually omit the morning dose only; local hemostatic measures are often sufficient.",
      leadDays: 0,
      rationale: "Low-risk dental procedures usually need minimal interruption.",
    };
  }

  if (drug === "dabigatran") {
    if (crcl < 30) {
      return {
        hold: "Use specialist advice because dabigatran interruption becomes prolonged when CrCl is below 30 mL/min.",
        leadDays: 4,
        rationale: "Renal clearance strongly affects dabigatran persistence.",
      };
    }

    if (crcl >= 80) {
      return bleedingRisk === "low_non_dental"
        ? {
            hold: "Hold 24 hours before surgery.",
            leadDays: 1,
            rationale: "Good renal clearance allows a short interruption for low-risk procedures.",
          }
        : {
            hold: "Hold 48 hours before surgery.",
            leadDays: 2,
            rationale: "Higher bleeding-risk procedures need a longer washout.",
          };
    }

    if (crcl >= 50) {
      return bleedingRisk === "low_non_dental"
        ? {
            hold: "Hold 48 hours before surgery.",
            leadDays: 2,
            rationale: "Moderately reduced renal clearance prolongs dabigatran effect.",
          }
        : {
            hold: "Hold 72 hours before surgery.",
            leadDays: 3,
            rationale: "High or moderate bleeding-risk procedures need a longer interruption.",
          };
    }

    return bleedingRisk === "low_non_dental"
      ? {
          hold: "Hold 72 hours before surgery.",
          leadDays: 3,
          rationale: "Renal impairment prolongs dabigatran exposure.",
        }
      : {
          hold: "Hold 96 hours before surgery.",
          leadDays: 4,
          rationale: "This provides a safer washout for higher-risk procedures.",
        };
  }

  if (["apixaban", "rivaroxaban", "edoxaban"].includes(drug)) {
    if (crcl < 30) {
      return bleedingRisk === "low_non_dental"
        ? {
            hold: "Hold 48 hours before surgery.",
            leadDays: 2,
            rationale: "Reduced renal clearance supports a longer interruption.",
          }
        : {
            hold: "Hold 72 hours before surgery.",
            leadDays: 3,
            rationale: "Higher bleeding-risk procedures need a longer safety window when renal function is reduced.",
          };
    }

    return bleedingRisk === "low_non_dental"
      ? {
          hold: "Hold 24 hours before surgery.",
          leadDays: 1,
          rationale: "Standard interruption for low-bleeding-risk elective procedures.",
        }
      : {
          hold: "Hold 48 hours before surgery.",
          leadDays: 2,
          rationale: "Higher bleeding-risk procedures need a longer interruption.",
        };
  }

  return {
    hold: "Use specialist advice for this anticoagulant.",
    leadDays: null,
    rationale: "Standard interruption guidance is unavailable.",
  };
};

const getAfThromboembolicRisk = (values) => {
  const chads2 = asNumber(values.chads2) ?? 0;

  if (chads2 >= 5 || values.strokeTiaWithin3Months || values.rheumaticMitralStenosis) {
    return {
      level: "High",
      rationale: "AF thromboembolic risk is high because of CHADS2 5 to 6, very recent stroke/TIA, or rheumatic mitral stenosis.",
    };
  }

  if (chads2 >= 3) {
    return {
      level: "Moderate",
      rationale: "AF thromboembolic risk is moderate because CHADS2 is 3 to 4.",
    };
  }

  return {
    level: "Low",
    rationale: "AF thromboembolic risk is low because CHADS2 is 0 to 2 and no very high-risk feature was selected.",
  };
};

const getVteThromboembolicRisk = (values) => {
  if (values.vteTiming === "within_3_months" || values.severeThrombophilia) {
    return {
      level: "High",
      rationale: "VTE thromboembolic risk is high because the event was within 3 months or severe thrombophilia is present.",
    };
  }

  if (
    values.vteTiming === "between_3_and_12_months" ||
    values.recurrentVte ||
    values.activeCancer
  ) {
    return {
      level: "Moderate",
      rationale: "VTE thromboembolic risk is moderate because of event timing between 3 and 12 months, recurrent VTE, or active cancer.",
    };
  }

  return {
    level: "Low",
    rationale: "VTE thromboembolic risk is low because there was a single VTE more than 12 months ago.",
  };
};

const getMechanicalValveRisk = (values) => {
  if (
    values.valvePosition === "mitral" ||
    values.valveType === "caged_ball" ||
    values.valveType === "tilting_disc" ||
    values.strokeTiaWithin6Months
  ) {
    return {
      level: "High",
      rationale: "Mechanical valve thromboembolic risk is high because of mitral position, older high-risk prosthesis type, or stroke/TIA within 6 months.",
    };
  }

  if (values.valveAtrialFibrillation || values.valveChadsAtLeastOne) {
    return {
      level: "Moderate",
      rationale: "Mechanical valve thromboembolic risk is moderate because of bileaflet aortic valve plus AF or CHADS at least 1.",
    };
  }

  return {
    level: "Low",
    rationale: "Mechanical valve thromboembolic risk is low because this is a bileaflet aortic valve without AF and CHADS equals 0.",
  };
};

const getPerioperativeRiskProfile = (values) => {
  if (values.indication === "atrial_fibrillation") {
    return getAfThromboembolicRisk(values);
  }

  if (values.indication === "dvt_pe") {
    return getVteThromboembolicRisk(values);
  }

  return getMechanicalValveRisk(values);
};

const buildWarfarinElectiveSchedule = ({ bridging, bleedingRisk, inr }) => [
  ["Day -5", "Stop warfarin."],
  [
    "Day -3 to -1",
    bridging
      ? "Start therapeutic LMWH bridging once INR falls below the therapeutic range; continue until 24 hours before surgery."
      : "No routine bridging is required.",
  ],
  [
    "Day -1",
    Number.isFinite(inr) && inr > 1.5
      ? "Repeat INR before surgery; if still above 1.5, use local reversal policy."
      : "Check INR before surgery and confirm the target has been met.",
  ],
  [
    "Day 0",
    bleedingRisk === "high"
      ? "Proceed only when INR is 1.5 or lower and hemostatic planning is complete."
      : "Proceed when INR is 1.5 or lower.",
  ],
  ["Day 0 evening", "Restart warfarin if hemostasis is secure."],
  [
    "Day +1 onward",
    bridging
      ? "Restart LMWH 24 to 72 hours after surgery depending on bleeding risk, and continue until INR is therapeutic."
      : "Monitor hemostasis and resume routine anticoagulation follow-up.",
  ],
];

const buildDoacSchedule = ({ holdPlan, restartWindow, surgeryType }) => {
  if (surgeryType !== "elective") {
    return [
      ["Now", "Stop the DOAC, document the last dose time, and check coagulation support tests."],
      ["Before procedure", "Use calibrated assay if available; if significant drug effect is likely, follow the reversal pathway."],
      ["After hemostasis", restartWindow],
    ];
  }

  const rows = [];

  if (Number.isFinite(holdPlan.leadDays) && holdPlan.leadDays > 1) {
    rows.push([`Day -${holdPlan.leadDays}`, holdPlan.hold]);
  } else if (holdPlan.leadDays === 1) {
    rows.push(["Day -1", holdPlan.hold]);
  } else {
    rows.push(["Day 0 morning", holdPlan.hold]);
  }

  rows.push(["Day 0", "Proceed to surgery once the planned interruption interval has elapsed."]);
  rows.push(["Postoperative", restartWindow]);
  return rows;
};

const getStrokeRiskInterpretation = (cha2ds2Vasc, sex) => {
  if (sex === "female" && cha2ds2Vasc === 1) {
    return "Female sex alone does not justify anticoagulation.";
  }

  if ((sex === "male" && cha2ds2Vasc === 0) || (sex === "female" && cha2ds2Vasc <= 1)) {
    return "Low stroke risk: anticoagulation is not routinely indicated by score alone.";
  }

  if ((sex === "male" && cha2ds2Vasc === 1) || (sex === "female" && cha2ds2Vasc === 2)) {
    return "Intermediate stroke risk: shared decision-making is appropriate.";
  }

  return "Stroke prevention with anticoagulation is generally recommended.";
};

const getChads2Score = (values) => {
  const age = asNumber(values.age) ?? 0;
  return sum([
    values.chf ? 1 : 0,
    values.hypertension ? 1 : 0,
    age >= 75 ? 1 : 0,
    values.diabetes ? 1 : 0,
    values.priorStroke ? 2 : 0,
  ]);
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
    title: "Perioperative Anticoagulant Management Algorithm",
    shortTitle: "Perioperative",
    type: "algorithm",
    category: "algorithm",
    badge: "Pathway",
    blurb:
      "Multi-step perioperative anticoagulant interruption, reversal, bridging, and restart planning.",
    tags: ["DOAC", "warfarin", "surgery", "bleeding"],
    notes: [
      "Use with local reversal policy, anesthesia guidance, and procedure-specific hemostatic planning.",
      "Outputs are organized as a structured perioperative decision summary with stepwise day-by-day instructions.",
    ],
    inputs: [
      {
        id: "surgeryType",
        label: "Surgery type",
        type: "radio",
        options: [
          { value: "elective", label: "Elective" },
          { value: "urgent", label: "Urgent surgery or procedure within 12 to 24 hours" },
          { value: "emergency", label: "Emergency surgery or procedure within 12 hours" },
        ],
        defaultValue: "elective",
      },
      {
        id: "bleedingRisk",
        label: "Procedural bleeding risk",
        type: "select",
        options: [
          { value: "low_non_dental", label: "Low non-dental" },
          { value: "low_dental", label: "Low dental" },
          { value: "moderate", label: "Moderate" },
          { value: "high", label: "High" },
        ],
        defaultValue: "low_non_dental",
      },
      {
        id: "anticoagulant",
        label: "Anticoagulant used",
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
      { id: "inr", label: "INR value", type: "number", min: 0.8, step: 0.1 },
      {
        id: "drugLevelStatus",
        label: "Drug level availability",
        type: "radio",
        options: [
          { value: "available", label: "Drug level available" },
          { value: "not_available", label: "Drug level not available" },
        ],
        defaultValue: "not_available",
      },
      { id: "drugLevel", label: "Drug level (ng/mL)", type: "number", min: 0, step: 1 },
      { id: "hoursSinceLastDose", label: "Hours since last dose", type: "number", min: 0, step: 1 },
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
        id: "indication",
        label: "Indication for anticoagulation",
        type: "radio",
        options: [
          { value: "atrial_fibrillation", label: "Atrial fibrillation" },
          { value: "dvt_pe", label: "DVT or PE" },
          { value: "mechanical_valve", label: "Mechanical valve" },
        ],
        defaultValue: "atrial_fibrillation",
      },
      { id: "chads2", label: "CHADS2 score", type: "number", min: 0, max: 6, step: 1 },
      { id: "strokeTiaWithin3Months", label: "Stroke or TIA within 3 months", type: "checkbox" },
      { id: "rheumaticMitralStenosis", label: "Rheumatic mitral stenosis", type: "checkbox" },
      {
        id: "vteTiming",
        label: "Most recent DVT or PE timing",
        type: "select",
        options: [
          { value: "within_3_months", label: "Within 3 months" },
          { value: "between_3_and_12_months", label: "Between 3 and 12 months" },
          { value: "over_12_months", label: "Single VTE more than 12 months ago" },
        ],
        defaultValue: "over_12_months",
      },
      { id: "recurrentVte", label: "Recurrent VTE", type: "checkbox" },
      { id: "activeCancer", label: "Active cancer", type: "checkbox" },
      { id: "severeThrombophilia", label: "Known severe thrombophilia", type: "checkbox" },
      {
        id: "valvePosition",
        label: "Mechanical valve position",
        type: "radio",
        options: [
          { value: "aortic", label: "Aortic" },
          { value: "mitral", label: "Mitral" },
        ],
        defaultValue: "aortic",
      },
      {
        id: "valveType",
        label: "Mechanical valve prosthesis type",
        type: "select",
        options: [
          { value: "bileaflet", label: "Bileaflet" },
          { value: "caged_ball", label: "Caged ball" },
          { value: "tilting_disc", label: "Tilting disc" },
        ],
        defaultValue: "bileaflet",
      },
      { id: "valveAtrialFibrillation", label: "Mechanical valve plus atrial fibrillation", type: "checkbox" },
      { id: "valveChadsAtLeastOne", label: "Mechanical valve plus CHADS at least 1", type: "checkbox" },
      { id: "strokeTiaWithin6Months", label: "Stroke or TIA within 6 months", type: "checkbox" },
      {
        id: "immediateReversal",
        label: "Immediate reversal is needed now",
        type: "checkbox",
      },
    ],
    calculate: (values) => {
      const surgeryType = values.surgeryType ?? "elective";
      const drug = values.anticoagulant ?? "apixaban";
      const bleedingRisk = values.bleedingRisk ?? "low_non_dental";
      const inr = asNumber(values.inr);
      const drugLevel = asNumber(values.drugLevel);
      const crcl = calculateCrCl(values);
      const thromboembolicRisk = getPerioperativeRiskProfile(values);
      const bridgingNeeded = drug === "warfarin" && thromboembolicRisk.level === "High";
      const doacRestart = getDoacRestartWindow(bleedingRisk);
      const summaryRows = [
        ["Bleeding risk", formatBleedingRiskLabel(bleedingRisk)],
        ["Anticoagulant", sentenceCase(drug)],
        ["Creatinine clearance", formatMetricValue(crcl, " mL/min")],
        ["Indication for antithrombotic", sentenceCase(values.indication ?? "atrial_fibrillation")],
        ["Thromboembolic risk", thromboembolicRisk.level],
      ];

      if (surgeryType !== "elective") {
        const immediateActions = [
          "Refer urgently for procedural or surgical intervention.",
          "Check hemoglobin concentration and platelet count to guide transfusion support.",
          "Give red cell transfusion for symptomatic anemia.",
          "Give platelet transfusion for thrombocytopenia below 50 x10⁹/L or when antiplatelet therapy materially affects hemostasis.",
          "Discontinue the anticoagulant immediately.",
        ];

        if (drug === "warfarin") {
          const needsPcc = values.immediateReversal || (Number.isFinite(inr) && inr > 1.5);
          return {
            tone: tone.danger,
            headline: "Urgent or emergency warfarin reversal",
            summary:
              "Stabilize the patient, discontinue warfarin, and use INR-guided reversal before surgery whenever time allows.",
            action:
              "Give vitamin K 10 mg IV and repeat the INR. If the INR remains above 1.5, or if immediate reversal is required, proceed to PCC unless contraindicated.",
            metrics: buildMetrics([
              { label: "Surgery type", value: sentenceCase(surgeryType) },
              { label: "Anticoagulant", value: "Warfarin" },
              { label: "INR", value: Number.isFinite(inr) ? formatScore(inr) : "Enter INR" },
              { label: "Creatinine clearance", value: formatMetricValue(crcl, " mL/min") },
            ]),
            recommendations: [
              { label: "Immediate hold", value: "Stop warfarin now." },
              { label: "Vitamin K", value: "10 mg IV; repeat INR before surgery." },
              {
                label: "PCC strategy",
                value: needsPcc
                  ? "Use 4-factor PCC based on INR and weight. If INR or weight is unknown and PCC cannot be delayed, give PCC 2000 units IV."
                  : "No PCC is needed if INR is already 1.5 or lower.",
              },
              {
                label: "Fallback",
                value: "If PCC is unavailable or contraindicated, use FFP 10 to 15 mL/kg, about 3 to 4 units.",
              },
              { label: "Target", value: "Repeat INR 15 minutes after PCC infusion and aim for INR 1.5 or lower." },
            ],
            tables: [
              buildTable("Summary", ["Item", "Value"], summaryRows),
              buildTable("Immediate management", ["Step", "Recommendation"], immediateActions.map((item, index) => [`${index + 1}`, item])),
              buildTable("Warfarin reversal", ["Decision point", "Recommendation"], [
                ["INR 1.5 or lower after vitamin K", "No further reversal is required; proceed to surgery."],
                ["INR remains above 1.5", "Consider PCC and repeat INR 15 minutes after infusion; target INR is 1.5 or lower."],
                ["PCC administration", "OCTAPLEX: 1 mL/min then maximum 2 to 3 mL/min. BERIPLEX: 1 mL/min then maximum 8 mL/min."],
              ]),
            ],
            supporting: [
              "PCC is contraindicated in heparin-induced thrombocytopenia.",
              "Explain the small but real thrombotic risk of PCC, generally below 2 percent.",
              thromboembolicRisk.rationale,
            ],
          };
        }

        if (drug === "dabigatran") {
          const significantLevel =
            values.drugLevelStatus === "available" && Number.isFinite(drugLevel) && drugLevel >= 30;
          return {
            tone: tone.danger,
            headline: "Urgent or emergency dabigatran reversal",
            summary:
              "Use a dilute thrombin time or Hemoclot assay if available. Reverse clinically significant dabigatran effect before surgery whenever possible.",
            action:
              significantLevel || values.drugLevelStatus === "not_available"
                ? "Give idarucizumab 2.5 g IV bolus, then repeat 2.5 g IV within 15 minutes for a total of 5 g."
                : "No reversal is needed if the dabigatran level is below 30 to 50 ng/mL and the clinical picture is reassuring.",
            metrics: buildMetrics([
              { label: "Urgency", value: sentenceCase(surgeryType) },
              { label: "Anticoagulant", value: "Dabigatran" },
              { label: "CrCl", value: formatMetricValue(crcl, " mL/min") },
              { label: "Drug level", value: Number.isFinite(drugLevel) ? `${drugLevel} ng/mL` : "Not available" },
            ]),
            recommendations: [
              { label: "Immediate hold", value: "Stop dabigatran now." },
              {
                label: "Primary reversal",
                value: "Idarucizumab 5 g IV total when level is 30 to 50 ng/mL or higher, or when assay data are unavailable but significant drug levels are suspected.",
              },
              { label: "Fallback", value: "If idarucizumab is unavailable, use PCC 50 units/kg with a maximum of 3000 units, or FEIBA 2000 units." },
              { label: "Adjunct", value: "Consider hemodialysis if feasible; about 65 percent of dabigatran can be removed over 4 hours." },
              { label: "Post-op restart", value: doacRestart },
            ],
            tables: [
              buildTable("Summary", ["Item", "Value"], summaryRows),
              buildTable("Immediate management", ["Step", "Recommendation"], immediateActions.map((item, index) => [`${index + 1}`, item])),
              buildTable("Dabigatran reversal", ["Situation", "Recommendation"], [
                ["Level below 30 to 50 ng/mL", "No reversal is usually required."],
                ["Level 30 to 50 ng/mL or higher", "Give idarucizumab 5 g IV total."],
                ["Assay unavailable", "Estimate from last dose, timing, and CrCl; reverse if significant residual drug is likely."],
              ]),
            ],
            supporting: [thromboembolicRisk.rationale],
          };
        }

        return {
          tone: tone.danger,
          headline: "Urgent or emergency factor Xa inhibitor reversal",
          summary:
            "Use a calibrated anti-Xa assay if available. If clinically significant apixaban, rivaroxaban, or edoxaban exposure is suspected, proceed with non-specific reversal.",
          action:
            "Stop the anticoagulant now. If clinically significant residual drug is suspected, use PCC 50 units/kg up to a maximum of 3000 units.",
          metrics: buildMetrics([
            { label: "Urgency", value: sentenceCase(surgeryType) },
            { label: "Anticoagulant", value: sentenceCase(drug) },
            { label: "CrCl", value: formatMetricValue(crcl, " mL/min") },
            { label: "Drug level", value: Number.isFinite(drugLevel) ? `${drugLevel} ng/mL` : "Not available" },
          ]),
          recommendations: [
            { label: "Immediate hold", value: `Stop ${sentenceCase(drug)} now.` },
            { label: "Assay", value: `Use a ${sentenceCase(drug)}-calibrated anti-Xa assay if it is available.` },
            { label: "Reversal", value: "Use PCC 50 units/kg up to 3000 units when significant residual drug is suspected." },
            { label: "Post-op restart", value: doacRestart },
          ],
          tables: [
            buildTable("Summary", ["Item", "Value"], summaryRows),
            buildTable("Immediate management", ["Step", "Recommendation"], immediateActions.map((item, index) => [`${index + 1}`, item])),
            buildTable("Factor Xa inhibitor reversal", ["Situation", "Recommendation"], [
              ["Assay available", "Use the calibrated anti-Xa result to estimate residual drug effect."],
              ["Assay unavailable", "Estimate from dose timing, regimen, and creatinine clearance."],
              ["Significant level suspected", "Use PCC 50 units/kg up to 3000 units."],
            ]),
          ],
          supporting: [
            "No specific reversal agent is included in this protocol for apixaban, rivaroxaban, or edoxaban.",
            thromboembolicRisk.rationale,
          ],
        };
      }

      if (drug === "warfarin") {
        const inrTargetMet = Number.isFinite(inr) && inr <= 1.5;
        const schedule = buildWarfarinElectiveSchedule({
          bridging: bridgingNeeded,
          bleedingRisk,
          inr,
        });

        return {
          tone: bleedingRisk === "high" || bridgingNeeded ? tone.warning : tone.success,
          headline: "Elective perioperative warfarin plan",
          summary:
            bleedingRisk === "high"
              ? "Use a full preoperative interruption plan and confirm INR is 1.5 or lower before surgery."
              : "Stop warfarin 5 to 6 days before surgery and check the INR before the procedure.",
          action: bridgingNeeded
            ? "Bridging anticoagulation is warranted because thromboembolic risk is high."
            : "Bridging is not routinely required for this warfarin interruption plan.",
          metrics: buildMetrics([
            { label: "Anticoagulant", value: "Warfarin" },
            { label: "Bleeding risk", value: formatBleedingRiskLabel(bleedingRisk) },
            { label: "Thromboembolic risk", value: thromboembolicRisk.level },
            { label: "INR", value: Number.isFinite(inr) ? formatScore(inr) : "Enter INR" },
            { label: "Creatinine clearance", value: formatMetricValue(crcl, " mL/min") },
          ]),
          recommendations: [
            { label: "Pre-op hold", value: "Stop warfarin 5 to 6 days before surgery." },
            {
              label: "Bridging",
              value: bridgingNeeded
                ? "Therapeutic LMWH bridging is recommended for high thromboembolic risk."
                : "No LMWH bridging is routinely recommended.",
            },
            {
              label: "INR checkpoint",
              value: inrTargetMet
                ? "INR is already 1.5 or lower and no additional reversal is usually required."
                : "Check INR the day before surgery. If INR remains above 1.4 to 1.5, administer vitamin K according to the perioperative protocol.",
            },
            { label: "Post-op restart", value: "Restart warfarin as soon as the patient is drinking fluids and if further operative intervention is not anticipated." },
          ],
          tables: [
            buildTable("Summary", ["Item", "Value"], summaryRows),
            buildTable("Day-by-day perioperative schedule", ["Day", "Instructions"], schedule),
          ],
          supporting: [
            thromboembolicRisk.rationale,
            bridgingNeeded
              ? "Resume therapeutic-dose LMWH 24 to 48 hours after surgery when hemostasis is secure, and discontinue LMWH once the INR is therapeutic."
              : "Resume the anticoagulant the following day after low-risk procedures if hemostasis is secure.",
          ],
        };
      }

      const holdPlan = getElectiveDoacHoldPlan(drug, bleedingRisk, crcl);
      const restartWindow = getDoacRestartWindow(bleedingRisk);

      return {
        tone: bleedingRisk === "high" ? tone.warning : tone.success,
        headline: "Elective perioperative DOAC plan",
        summary: holdPlan.rationale,
        action: `Hold ${sentenceCase(drug)} according to bleeding risk and renal function, then ${restartWindow.toLowerCase()}`,
        metrics: buildMetrics([
          { label: "Anticoagulant", value: sentenceCase(drug) },
          { label: "CrCl", value: formatMetricValue(crcl, " mL/min") },
          { label: "Bleeding risk", value: formatBleedingRiskLabel(bleedingRisk) },
          { label: "Thromboembolic risk", value: thromboembolicRisk.level },
        ]),
        recommendations: [
          { label: "Pre-op hold", value: holdPlan.hold },
          { label: "Bridging", value: "LMWH bridging is not routinely recommended for DOAC interruption." },
          { label: "Post-op restart", value: restartWindow },
        ],
        tables: [
          buildTable("Summary", ["Item", "Value"], summaryRows),
          buildTable("Day-by-day perioperative schedule", ["Day", "Instructions"], buildDoacSchedule({ holdPlan, restartWindow, surgeryType })),
        ],
        supporting: [
          "If assay data are unavailable, estimate residual DOAC effect from dosing schedule, timing of the last dose, and creatinine clearance.",
          "Stop DOAC on the day of intervention and restart the following day only for lower bleeding risk procedures with secure hemostasis.",
          thromboembolicRisk.rationale,
        ],
      };
    },
  },
  {
    id: "af-dosing",
    title: "Anticoagulant Dosing in Atrial Fibrillation",
    shortTitle: "AF Dosing",
    type: "algorithm",
    category: "algorithm",
    badge: "Dosing",
    blurb:
      "Estimate stroke risk, identify warfarin-only states, and review renal-adjusted oral anticoagulant options.",
    tags: ["AF", "DOAC", "stroke prevention", "renal"],
    notes: [
      "Designed for atrial fibrillation with explicit warfarin-only exceptions.",
      "Outputs follow the Version 22 recommendation structure with drug-specific renal notes and reassessment prompts.",
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
      { id: "chf", label: "Congestive heart failure history", type: "checkbox" },
      { id: "hypertension", label: "Hypertension history", type: "checkbox" },
      { id: "diabetes", label: "Diabetes mellitus", type: "checkbox" },
      { id: "priorStroke", label: "Previous stroke or TIA", type: "checkbox" },
      { id: "vascularDisease", label: "Macrovascular disease: coronary, aortic, or peripheral", type: "checkbox" },
      { id: "warfarinOnlyIndication", label: "Patient has another indication for warfarin therapy", type: "checkbox" },
      { id: "pGpInhibitor", label: "Concomitant use of P-gp inhibitors except amiodarone and verapamil", type: "checkbox" },
    ],
    calculate: (values) => {
      const mergedValues = { ...values, femaleSex: values.sex === "female" };
      const cha2ds2Vasc = getChadsVascScore(mergedValues);
      const chads2 = getChads2Score(values);
      const crcl = calculateCrCl(values);
      const age = asNumber(values.age) ?? 0;
      const serumCreatinine = asNumber(values.serumCreatinine) ?? 0;
      const weight = asNumber(values.weight) ?? 0;
      const strokeInterpretation = getStrokeRiskInterpretation(cha2ds2Vasc, values.sex);
      const warfarinOnly = Boolean(values.warfarinOnlyIndication);

      const apixabanReductionCount = sum([
        age >= 80 ? 1 : 0,
        weight > 0 && weight <= 60 ? 1 : 0,
        values.creatinineUnit === "umol"
          ? serumCreatinine >= 133
            ? 1
            : 0
          : serumCreatinine >= 1.5
            ? 1
            : 0,
      ]);

      const recommendedRows = [];
      const restrictedRows = [];

      const pushRecommended = (drugName, dose, note) => {
        recommendedRows.push([drugName, dose, note]);
      };

      const pushRestricted = (drugName, status, reason) => {
        restrictedRows.push([drugName, status, reason]);
      };

      if (warfarinOnly) {
        pushRecommended("Warfarin", "INR 2 to 3", "Use warfarin because another indication such as a mechanical valve or LV thrombus is present.");
        pushRestricted("Apixaban", "Generally not recommended", "Another indication for warfarin is present.");
        pushRestricted("Dabigatran", "Generally not recommended", "Another indication for warfarin is present.");
        pushRestricted("Rivaroxaban", "Generally not recommended", "Another indication for warfarin is present.");
        pushRestricted("Edoxaban", "Generally not recommended", "Another indication for warfarin is present.");
      } else if (crcl === null) {
        pushRestricted("All agents", "Cannot dose yet", "Age, weight, sex, and serum creatinine are required to calculate Cockcroft-Gault creatinine clearance.");
      } else if (crcl < 15) {
        pushRecommended("Warfarin", "INR 2 to 3", "Supported option when creatinine clearance is below 15 mL/min.");
        pushRestricted("Dabigatran", "Contraindicated", "CrCl is below 15 mL/min.");
        pushRestricted("Apixaban", "Not recommended", "Insufficient clinical data when CrCl is below 15 mL/min.");
        pushRestricted("Edoxaban", "Not recommended", "CrCl is below 15 mL/min.");
        pushRestricted("Rivaroxaban", "Not recommended", "CrCl is below 15 mL/min.");
      } else if (crcl <= 24) {
        pushRecommended("Warfarin", "INR 2 to 3", "Supported option for severe renal impairment.");
        pushRestricted("Dabigatran", "Contraindicated", "CrCl is 15 to 24 mL/min.");
        pushRestricted("Apixaban", "No dosing recommendation", "Insufficient clinical data at this creatinine clearance.");
        pushRestricted("Edoxaban", "Not recommended", "CrCl is 15 to 24 mL/min.");
        pushRestricted("Rivaroxaban", "Not recommended", "CrCl is 15 to 24 mL/min.");
      } else {
        pushRecommended(
          "Apixaban",
          apixabanReductionCount >= 2 ? "2.5 mg twice daily" : "5 mg twice daily",
          apixabanReductionCount >= 2
            ? "Dose reduction because at least two of the following are present: age 80 or more, weight 60 kg or less, serum creatinine 133 µmol/L or more."
            : "Standard dose."
        );

        if (crcl < 30) {
          pushRestricted("Dabigatran", "Contraindicated", "CrCl is below 30 mL/min.");
        } else {
          pushRecommended(
            "Dabigatran",
            age >= 80 || values.pGpInhibitor ? "110 mg twice daily" : "150 mg twice daily",
            age >= 80 || values.pGpInhibitor
              ? "Use 110 mg twice daily because age is at least 80 years or a relevant P-gp inhibitor is present."
              : "150 mg twice daily is standard; 110 mg twice daily can be considered if bleeding risk is higher."
          );
        }

        pushRecommended(
          "Rivaroxaban",
          crcl >= 50 ? "20 mg once daily" : "15 mg once daily",
          crcl >= 50 ? "Standard once-daily dose." : "Renal-adjusted dose."
        );

        const edoxabanReduced = crcl <= 50 || weight <= 60 || values.pGpInhibitor;
        pushRecommended(
          "Edoxaban",
          edoxabanReduced ? "30 mg once daily" : "60 mg once daily",
          edoxabanReduced
            ? "Dose reduction because of creatinine clearance 50 mL/min or lower, weight 60 kg or less, or P-gp inhibitor use."
            : "Standard once-daily dose."
        );

        pushRecommended("Warfarin", "INR 2 to 3", "Use when DOACs are unsuitable or patient preference favors INR-based therapy.");
      }

      return {
        tone: warfarinOnly ? tone.warning : cha2ds2Vasc >= 2 ? tone.warning : tone.success,
        headline: warfarinOnly ? "Warfarin-led strategy" : "Recommendations",
        summary: strokeInterpretation,
        action: warfarinOnly
          ? "Prescribe warfarin rather than a DOAC unless a specialist pathway says otherwise."
          : "Review all applicable anticoagulant options below, then balance stroke prevention against bleeding risk and patient preference.",
        metrics: buildMetrics([
          { label: "Creatinine clearance", value: formatMetricValue(crcl, " mL/min") },
          { label: "CHA2DS2-VASc", value: `${cha2ds2Vasc}` },
          { label: "CHADS Score", value: `${chads2}` },
          { label: "Preferred route", value: warfarinOnly ? "Warfarin" : "DOAC or warfarin" },
        ]),
        recommendations: [
          { label: "Stroke interpretation", value: strokeInterpretation },
          { label: "Primary recommendation", value: warfarinOnly ? "Warfarin" : recommendedRows[0]?.[0] ?? "Enter renal data" },
          {
            label: "Other recommendations",
            value:
              "Creatinine clearance should be checked yearly if creatinine clearance is 50 mL/min or more and every 6 months if below 50 mL/min, with drug selection and dose reassessed accordingly.",
          },
          {
            label: "Guideline preference",
            value:
              "A novel oral anticoagulant is generally preferred over warfarin when there is no separate indication for warfarin.",
          },
        ],
        tables: [
          buildTable("Recommended anticoagulants", ["Drug", "Dose", "Clinical note"], recommendedRows),
          buildTable("Contraindicated or not recommended", ["Drug", "Status", "Reason"], restrictedRows.length ? restrictedRows : [["None", "None", "No additional contraindication was triggered by the current inputs."]]),
        ],
        supporting: [
          "Creatinine clearance uses Cockcroft-Gault, which is the renal estimate used in major DOAC trials.",
          "If another warfarin indication exists, DOACs are generally not recommended in this tool.",
          "Concomitant use of potent P-gp or specific CYP inhibitors or inducers may impact anticoagulant levels. Consult the product monograph for specific recommendations.",
          "Including but not limited to carvedilol, clarithromycin, cyclosporin, erythromycin, itraconazole, ketoconazole, dronedarone, lapatinib, lopinavir, propafenone, quinidine, ranolazine, ritonavir, saquinavir, telaprevir, and tipranavir.",
          "Dose reduction of edoxaban is not required with concomitant use of verapamil or amiodarone.",
          "CHA2DS2-VASc may be relatively insensitive or unspecific to predict stroke risk.",
          "If age is the only risk factor, there is a graded increase in stroke risk from age 65 to 75.",
          "Females may not have a higher risk of stroke independent of other risk factors.",
          "The risk stratification does not incorporate the severity of risk factors such as poorly controlled versus well controlled hypertension.",
        ],
      };
    },
  },
  {
    id: "thrombophilia",
    title: "Thrombophilia Testing Algorithm",
    shortTitle: "Thrombophilia",
    type: "algorithm",
    category: "algorithm",
    badge: "Testing",
    blurb:
      "Decide when testing is worth doing, when it is low-value, and when timing makes results unreliable.",
    tags: ["VTE", "testing", "family history", "unusual site"],
    notes: [
      "Only consider thrombophilia testing if the result could change management.",
      "The output now emphasizes targeted testing, interruption timing, and acquired thrombophilia prompts.",
    ],
    inputs: [
      { id: "concomitantArterialDisease", label: "Concomitant arterial disease", type: "checkbox" },
      { id: "ageUnder50", label: "Young age under 50 years", type: "checkbox" },
      { id: "strongFamilyHistory", label: "Strong family history in first-degree relatives before 50 years", type: "checkbox" },
      { id: "cbcAbnormalities", label: "CBC abnormalities: anemia, thrombocytopenia, thrombocytosis, or polycythemia", type: "checkbox" },
      { id: "autoimmuneDisease", label: "Autoimmune disease", type: "checkbox" },
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
        id: "vteSite",
        label: "VTE location",
        type: "radio",
        options: [
          { value: "usual", label: "Usual site (leg DVT or PE)" },
          { value: "unusual", label: "Unusual site (cerebral or splanchnic)" },
        ],
        defaultValue: "usual",
      },
      {
        id: "provocation",
        label: "Provoked or unprovoked?",
        type: "radio",
        options: [
          { value: "provoked", label: "Provoked" },
          { value: "unprovoked", label: "Unprovoked" },
        ],
        defaultValue: "unprovoked",
      },
      { id: "onAnticoagulation", label: "Currently on anticoagulants", type: "checkbox" },
      {
        id: "anticoagulantClass",
        label: "Current anticoagulant class",
        type: "select",
        options: [
          { value: "none", label: "None" },
          { value: "warfarin", label: "Warfarin" },
          { value: "doac", label: "DOAC" },
          { value: "ufh_lmwh", label: "UFH or LMWH" },
        ],
        defaultValue: "none",
      },
      { id: "recurrentUnprovokedVte", label: "Recurrent unprovoked VTE", type: "checkbox" },
      { id: "recurrentDespiteAnticoagulation", label: "Recurrent VTE despite adequate anticoagulation", type: "checkbox" },
      { id: "recurrentPregnancyLoss", label: "Recurrent pregnancy loss", type: "checkbox" },
      { id: "hemolysis", label: "Evidence of hemolysis", type: "checkbox" },
      { id: "leucopenia", label: "Leucopenia", type: "checkbox" },
      { id: "recentHeparinExposure", label: "Recent heparin exposure within 5 to 10 days", type: "checkbox" },
      { id: "plateletFallFiftyPercent", label: "Platelet count has fallen by more than 50 percent", type: "checkbox" },
      { id: "confirmedThrombosis", label: "Confirmed thrombosis or high thrombosis risk", type: "checkbox" },
      { id: "noAlternativeCause", label: "No alternative cause for thrombocytopenia", type: "checkbox" },
      { id: "managementWouldChange", label: "Testing would change management", type: "checkbox" },
    ],
    calculate: (values) => {
      const triggerCount = [
        values.concomitantArterialDisease,
        values.ageUnder50,
        values.strongFamilyHistory,
        values.cbcAbnormalities,
        values.autoimmuneDisease,
        values.vteSite === "unusual",
      ].filter(Boolean).length;

      const apsSuggested =
        values.recurrentUnprovokedVte ||
        values.recurrentDespiteAnticoagulation ||
        values.autoimmuneDisease ||
        values.recurrentPregnancyLoss;
      const mpnSuggested = values.cbcAbnormalities;
      const pnhSuggested =
        values.ageUnder50 && (values.vteSite === "unusual" || values.recurrentUnprovokedVte) &&
        (values.hemolysis || values.cbcAbnormalities || values.leucopenia);
      const hitSuggested =
        values.recentHeparinExposure &&
        values.plateletFallFiftyPercent &&
        values.confirmedThrombosis &&
        values.noAlternativeCause;

      const interruptionRows = [
        ["Warfarin", "Interrupt for at least 1 week before clot-based testing."],
        ["DOAC", "Interrupt for at least 2 days; use 4 days for dabigatran if CrCl is below 50 mL/min."],
        ["UFH or LMWH", "Interrupt for at least 24 hours before clot-based testing."],
      ];
      const patientSummaryRows = [
        ["Is this the patient's first VTE?", values.firstVte === "yes" ? "Yes" : "No"],
        ["Where is the VTE?", values.vteSite === "unusual" ? "Unusual site" : "Usual site"],
        ["Is the VTE provoked or unprovoked?", sentenceCase(values.provocation ?? "unprovoked")],
      ];

      if (!values.managementWouldChange) {
        return {
          tone: tone.success,
          headline: "Thrombophilia testing is not required for most patients",
          summary: "Only consider thrombophilia testing if the result will change management, counseling, family planning, or future pregnancy planning.",
          action: "Avoid ordering broad panels when the result would not change treatment decisions.",
          metrics: buildMetrics([
            { label: "Specialist triggers", value: `${triggerCount}` },
            { label: "On anticoagulation", value: values.onAnticoagulation ? "Yes" : "No" },
          ]),
          tables: [
            buildTable("Patient summary", ["Question", "Answer"], patientSummaryRows),
            buildTable("Tests that can be done during anticoagulation", ["Test", "Comment"], [
              ["Factor V Leiden mutation", "DNA-based test; anticoagulants do not interfere."],
              ["Prothrombin gene mutation", "DNA-based test; anticoagulants do not interfere."],
              ["JAK2 mutation", "Useful when MPN is suspected."],
              ["PNH flow cytometry", "Can be performed during anticoagulation."],
            ]),
            buildTable("Anticoagulant interruption rules", ["Anticoagulant", "Interruption"], interruptionRows),
          ],
          supporting: [
            "Consider testing if one or more of the following are present: concomitant arterial disease, age under 50 years, strong family history, CBC abnormalities, or autoimmune disease.",
            "Consider APS testing especially in arterial or recurrent events or recurrent pregnancy loss; if abnormal, repeat at 12 weeks and refer.",
            "Anticoagulants can interfere with many thrombophilia tests, so timing matters.",
          ],
        };
      }

      return {
        tone: tone.warning,
        headline: "Thrombophilia testing is not required for most patients",
        summary:
          triggerCount > 0
            ? "At least one specialist trigger is present. Consider thrombophilia testing with specialist input and focus on results that could alter management."
            : "The history is not strongly suggestive, so any testing should be tightly targeted to the clinical question.",
        action:
          values.onAnticoagulation && values.anticoagulantClass !== "none"
            ? `Pause clot-based testing until ${values.anticoagulantClass === "warfarin" ? "warfarin has been stopped for at least 1 week" : values.anticoagulantClass === "doac" ? "the DOAC has been stopped for at least 2 days" : "UFH or LMWH has been stopped for at least 24 hours"}.`
            : "Proceed only with tests that will change anticoagulant duration, counseling, pregnancy planning, or workup for an acquired thrombophilia.",
        metrics: buildMetrics([
          { label: "Specialist triggers", value: `${triggerCount}` },
          { label: "First VTE", value: values.firstVte === "yes" ? "Yes" : "No" },
          { label: "Site", value: values.vteSite === "unusual" ? "Unusual" : "Usual" },
          { label: "Provocation", value: sentenceCase(values.provocation) },
        ]),
        recommendations: [
          { label: "Testing stance", value: "Only consider thrombophilia testing if the results will change management." },
          { label: "APS testing", value: apsSuggested ? "Suggested" : "Not specifically triggered" },
          { label: "MPN testing", value: mpnSuggested ? "Suggested" : "Not specifically triggered" },
          { label: "PNH testing", value: pnhSuggested ? "Suggested" : "Not specifically triggered" },
          { label: "HIT testing", value: hitSuggested ? "Suggested" : "Not specifically triggered" },
        ],
        tables: [
          buildTable("Patient summary", ["Question", "Answer"], patientSummaryRows),
          buildTable("Tests that can be done during anticoagulation", ["Test", "Comment"], [
            ["Factor V Leiden mutation", "DNA-based test; anticoagulants do not interfere."],
            ["Prothrombin gene mutation", "DNA-based test; anticoagulants do not interfere."],
            ["JAK2 mutation", "Order when MPN is suspected from CBC or blood film findings."],
            ["PNH flow cytometry", "Can be performed during anticoagulation."],
          ]),
          buildTable("Anticoagulant interruption rules", ["Anticoagulant", "Interruption"], interruptionRows),
          buildTable("Condition-specific testing prompts", ["Condition", "When to think about testing"], [
            ["MPN", "Raised platelets, hematocrit, or white count; or blood film changes such as teardrop cells, nucleated red cells, or pancytopenia."],
            ["APS", "Recurrent unprovoked VTE, recurrent VTE despite anticoagulation, autoimmune disease, or recurrent pregnancy loss."],
            ["PNH", "Age under 50 with unusual or recurrent unprovoked thrombosis plus hemolysis, anemia, thrombocytopenia, or leucopenia."],
            ["HIT", "Recent heparin exposure, platelet fall greater than 50 percent, thrombosis, and no alternative cause for thrombocytopenia."],
          ]),
        ],
        supporting: [
          "Interpret clot-based assays only after the relevant anticoagulant interruption interval has been observed.",
          "Acquired thrombophilia pathways often matter more than inherited thrombophilia panels in atypical presentations.",
          values.firstVte === "no"
            ? "For recurrent VTE or PE management, follow the acute management algorithms as well as the testing pathway."
            : "This pathway is most useful when deciding whether a first VTE warrants further thrombophilia evaluation.",
        ],
      };
    },
  },
  {
    id: "vitt",
    title: "Diagnosing, Ruling Out and Managing VITT",
    shortTitle: "VITT",
    type: "algorithm",
    category: "algorithm",
    badge: "Acute care",
    blurb:
      "Rapidly classify possible vaccine-induced immune thrombotic thrombocytopenia and highlight immediate management priorities.",
    tags: ["VITT", "platelets", "PF4", "emergency"],
    notes: [
      "Use this only for suspected vaccine-induced immune thrombotic thrombocytopenia within the recognized post-vaccination window.",
      "The output emphasizes presumptive diagnosis, urgent hematology review, and non-heparin anticoagulation.",
    ],
    inputs: [
      { id: "daysSinceVaccination", label: "Days since vaccination", type: "number", min: 0, step: 1 },
      { id: "severeHeadache", label: "Persistent and severe headache", type: "checkbox" },
      { id: "focalNeurology", label: "Focal neurological symptoms, seizures, or blurred or double vision", type: "checkbox" },
      { id: "chestPainDyspnea", label: "Shortness of breath or chest pain", type: "checkbox" },
      { id: "abdominalPain", label: "Abdominal pain", type: "checkbox" },
      { id: "legPainSwelling", label: "Swelling and redness in a limb", type: "checkbox" },
      { id: "limbIschemia", label: "Pallor and coldness in a limb", type: "checkbox" },
      { id: "plateletCount", label: "Platelet count (x10^9/L)", type: "number", min: 1, step: 1 },
      { id: "dDimerMarked", label: "D-dimer markedly elevated", type: "checkbox" },
      { id: "fibrinogenLow", label: "Fibrinogen low or falling", type: "checkbox" },
      { id: "thrombosisConfirmed", label: "Imaging-confirmed arterial or venous thrombosis", type: "checkbox" },
      {
        id: "pf4Elisa",
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
      const days = asNumber(values.daysSinceVaccination);
      const platelets = asNumber(values.plateletCount);
      const symptomCount = [
        values.severeHeadache,
        values.focalNeurology,
        values.chestPainDyspnea,
        values.abdominalPain,
        values.legPainSwelling,
        values.limbIschemia,
      ].filter(Boolean).length;
      const inWindow = Number.isFinite(days) && days >= 4 && days <= 28;
      const thrombocytopenia = Number.isFinite(platelets) && platelets < 150;
      const probable =
        inWindow &&
        symptomCount > 0 &&
        thrombocytopenia &&
        (values.thrombosisConfirmed || values.dDimerMarked || values.fibrinogenLow);
      const definite = probable && values.pf4Elisa === "positive";

      if (symptomCount === 0) {
        return {
          tone: tone.success,
          headline: "No VITT work-up needed",
          summary: "No high-risk symptom cluster has been selected.",
          action: "Reassess promptly if severe headache, focal neurological symptoms, chest pain, dyspnea, abdominal pain, or limb ischemic symptoms develop after vaccination.",
          metrics: buildMetrics([{ label: "Symptoms selected", value: "0" }]),
        };
      }

      if (!inWindow) {
        return {
          tone: tone.success,
          headline: "VITT unlikely",
          summary: "The timing is outside the typical 4 to 28 day window after vaccination.",
          action: "Investigate alternative explanations for thrombosis, thrombocytopenia, or systemic symptoms.",
          metrics: buildMetrics([
            { label: "Timing", value: Number.isFinite(days) ? `${days} days` : "Not entered" },
            { label: "Symptoms selected", value: `${symptomCount}` },
          ]),
        };
      }

      if (!thrombocytopenia) {
        return {
          tone: tone.warning,
          headline: "VITT less likely",
          summary: "The symptom pattern is concerning, but thrombocytopenia below 150 x10^9/L has not yet been shown.",
          action: "Order CBC, D-dimer, fibrinogen, and targeted imaging based on symptoms. Repeat the CBC if symptoms continue to evolve.",
          metrics: buildMetrics([
            { label: "Timing", value: `${days} days` },
            { label: "Platelets", value: Number.isFinite(platelets) ? `${platelets}` : "Pending" },
          ]),
          tables: [
            buildTable("Urgent work-up", ["Investigation", "Purpose"], [
              ["CBC and platelet count", "Confirm whether thrombocytopenia is evolving."],
              ["D-dimer", "Marked elevation supports the diagnosis."],
              ["Fibrinogen", "Low or falling fibrinogen supports consumptive coagulopathy."],
              ["Targeted imaging", "Investigate cerebral, splanchnic, pulmonary, or limb thrombosis according to symptoms."],
              ["PF4 ELISA", "Preferred assay when VITT is suspected."],
            ]),
          ],
        };
      }

      return {
        tone: definite ? tone.danger : tone.warning,
        headline: definite ? "Presumptive or confirmed VITT" : probable ? "Presumptive diagnosis of VITT" : "Possible VITT: urgent work-up needed",
        summary: definite
          ? "Timing, thrombocytopenia, thrombosis, coagulation abnormalities, and PF4 positivity align strongly with VITT."
          : probable
            ? "Proceed to hematology for HIT-style PF4 testing and treat presumptive VITT without waiting for confirmatory results."
            : "There is enough concern to complete a VITT work-up urgently, but the syndrome is not yet fully established.",
        action:
          probable || definite
            ? "Avoid heparin, avoid platelet transfusion, start a direct oral anti-Xa inhibitor if safe, give IVIG 1 g/kg daily for at least 2 days, and involve hematology urgently."
            : "Order CBC, D-dimer, fibrinogen, PF4 ELISA, and symptom-directed imaging urgently.",
        metrics: buildMetrics([
          { label: "Timing", value: `${days} days` },
          { label: "Platelets", value: `${platelets}` },
          {
            label: "Supportive features",
            value: `${[values.thrombosisConfirmed, values.dDimerMarked, values.fibrinogenLow].filter(Boolean).length}/3`,
          },
        ]),
        recommendations: [
          { label: "PF4 ELISA", value: values.pf4Elisa === "positive" ? "Positive" : values.pf4Elisa === "negative" ? "Negative" : "Pending" },
          { label: "Heparin", value: probable || definite ? "Do not use heparin." : "Avoid heparin until VITT is reasonably excluded." },
          { label: "Platelet transfusion", value: "Do not give platelet transfusion unless bleeding is life-threatening." },
          { label: "First-line anticoagulants", value: "Direct oral anti-Xa inhibitors such as rivaroxaban, apixaban, or edoxaban." },
        ],
        tables: [
          buildTable("Urgent work-up", ["Investigation", "Purpose"], [
            ["CBC and platelet count", "Confirm thrombocytopenia."],
            ["D-dimer", "Marked elevation supports VITT."],
            ["Fibrinogen", "Low or falling fibrinogen supports consumptive coagulopathy."],
            ["Targeted imaging", "Look for cerebral, splanchnic, pulmonary, or limb thrombosis based on symptoms."],
            ["PF4 ELISA", "Preferred confirmatory assay; do not rely on rapid HIT tests."],
          ]),
          buildTable("Immediate treatment steps", ["Step", "Recommendation"], [
            ["Anticoagulation", "Use a non-heparin anticoagulant if bleeding risk allows; direct oral anti-Xa inhibitors are first line in this protocol."],
            ["Immune therapy", "Give IVIG 1 g/kg daily for at least 2 days, especially for severe or life-threatening thrombosis."],
            ["Transfusion", "Avoid platelet transfusion unless bleeding is life-threatening."],
            ["Specialist review", "Discuss urgently with hematology and the relevant acute specialty."],
          ]),
        ],
        supporting: [
          "Send PF4 ELISA testing before treatment if possible, but do not delay treatment while waiting for results.",
          "All suspected adverse events following immunization, including presumptive and confirmed VITT, should be reported through the provincial AEFI pathway.",
          "Pai M, Grill A, Ivers N, et al. Vaccine-induced prothrombotic immune thrombocytopenia VIPIT following AstraZeneca COVID-19 vaccination. Science Briefs of the Ontario COVID-19 Science Advisory Table. 2021;1(17).",
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
    blurb: "Estimates stroke risk in patients with atrial fibrillation by the CHADS2 criteria.",
    tags: ["AF", "stroke prevention"],
    notes: ["Use this for classic CHADS2-based risk stratification in atrial fibrillation."],
    inputs: [
      { id: "congestiveHeardFailure", label: "Congestive Heart Failure history?", type: "checkbox" },
      { id: "hypertension", label: "Hypertension history?", type: "checkbox" },
      { id: "ageOver75", label: "Age ≥ 75?", type: "checkbox" },
      { id: "diabetese", label: "Diabetes Mellitus history?", type: "checkbox" },
      { id: "strokeOrTIA", label: "Previous stroke or TIA?", type: "checkbox" },
    ],
    calculate: (values) => {
      const score = sum([
        values.congestiveHeardFailure ? 1 : 0,
        values.hypertension ? 1 : 0,
        values.ageOver75 ? 1 : 0,
        values.diabetese ? 1 : 0,
        values.strokeOrTIA ? 2 : 0,
      ]);

      const scoreTextMap = {
        0: "Low risk of thromboembolic event. 1.9% risk of event per year if no anticoagulation.",
        1: "Intermediate risk of thromboembolic event. 2.8% risk of event per year if no anticoagulation.",
        2: "Intermediate risk of thromboembolic event. 4.0% risk of event per year if no anticoagulation.",
        3: "High risk of thromboembolic event. 5.9% risk of event per year if no anticoagulation.",
        4: "High risk of thromboembolic event. 8.5% risk of event per year if no anticoagulation.",
        5: "High risk of thromboembolic event. 12.5% risk of event per year if no anticoagulation.",
        6: "High risk of thromboembolic event. 18.2% risk of event per year if no anticoagulation.",
      };

      return {
        tone: score >= 3 ? tone.danger : score >= 1 ? tone.warning : tone.success,
        headline: `Score ${score}`,
        summary: scoreTextMap[score] ?? "Risk description not available.",
        metrics: buildMetrics([
          { label: "Score", value: `${score}` },
          { label: "Annual thromboembolic risk", value: scoreTextMap[score]?.match(/([0-9.]+%)/)?.[1] ?? "Not available" },
        ]),
        recommendations: [
          {
            label: "Footnote",
            value:
              "The adjusted stroke rate was the expected stroke rate per 100 person-years derived from the multivariable model assuming that aspirin was not taken.",
          },
        ],
        supporting: [
          "CHA2DS2-VASc score may be relatively insensitive or unspecific to predict risk of stroke.",
          "If age is the only risk factor, there is a graded increase in stroke risk from age 65 to 75.",
          "Females may not have a higher risk of stroke, independent of risk factors.",
          "The risk stratification does not incorporate the severity of the risk factors, such as poorly controlled versus well controlled hypertension.",
        ],
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
    blurb: "Calculates stroke risk for patients with atrial fibrillation, possibly better than the CHADS2 score.",
    tags: ["AF", "stroke prevention", "DOAC"],
    notes: ["Use the score together with clinical judgement rather than as a single treatment trigger."],
    inputs: [
      {
        id: "chads2vascAge",
        label: "Age",
        type: "radio",
        options: [
          { value: "under_65", label: "< 65" },
          { value: "65_74", label: "65-74" },
          { value: "75_plus", label: "≥ 75" },
        ],
        defaultValue: "under_65",
      },
      { id: "chads2vascHeart", label: "Congestive Heart Failure History", type: "checkbox" },
      { id: "chads2vascHyper", label: "Hypertension History", type: "checkbox" },
      { id: "chads2vascStroke", label: "Stroke/TIA/Thromboembolism History", type: "checkbox" },
      { id: "chads2vascVascHist", label: "Vascular Disease History? — previous MI, peripheral arterial disease or aortic plaque", type: "checkbox" },
      { id: "chads2vascDiabetes", label: "Diabetes Mellitus", type: "checkbox" },
      { id: "chads2vascFemale", label: "Female Patient", type: "checkbox" },
    ],
    calculate: (values) => {
      const agePoints =
        values.chads2vascAge === "75_plus" ? 2 : values.chads2vascAge === "65_74" ? 1 : 0;
      const score = sum([
        values.chads2vascHeart ? 1 : 0,
        values.chads2vascHyper ? 1 : 0,
        values.chads2vascStroke ? 2 : 0,
        values.chads2vascVascHist ? 1 : 0,
        values.chads2vascDiabetes ? 1 : 0,
        values.chads2vascFemale ? 1 : 0,
        agePoints,
      ]);

      const interpretation =
        score === 0 && !values.chads2vascFemale
          ? "Very low risk — anticoagulation generally not recommended."
          : score === 1 && values.chads2vascFemale && values.chads2vascAge === "under_65" &&
              !values.chads2vascHeart &&
              !values.chads2vascHyper &&
              !values.chads2vascStroke &&
              !values.chads2vascVascHist &&
              !values.chads2vascDiabetes
            ? "Low risk."
            : score === 1
              ? "Low to intermediate stroke risk."
              : score >= 2
                ? "Stroke prevention with anticoagulation is usually recommended."
                : "Risk interpretation requires clinical judgement.";

      return {
        tone: score >= 2 ? tone.warning : tone.success,
        headline: `Score ${score}`,
        summary: interpretation,
        metrics: buildMetrics([
          { label: "Score", value: `${score}` },
          {
            label: "Age band",
            value:
              values.chads2vascAge === "75_plus"
                ? "≥ 75"
                : values.chads2vascAge === "65_74"
                  ? "65-74"
                  : "< 65",
          },
        ]),
        recommendations: [
          {
            label: "Limitations",
            value:
              "Use this score with caution because it may be relatively insensitive or unspecific to predict stroke risk.",
          },
        ],
        supporting: [
          "If age is the only risk factor, there is a graded increase in stroke risk from age 65 to 75.",
          "Females may not have a higher risk of stroke, independent of risk factors.",
          "The risk stratification does not incorporate the severity of the risk factors, such as poorly controlled versus well controlled hypertension.",
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
