# Simplified PESI (sPESI)

**Type**: Scoring Calculator
**Scraped**: 2026-03-12

---

## Overview

Predicts 30-day outcome of patients with pulmonary embolism with fewer criteria than the original PESI. Simplified to a binary (0 vs ≥ 1) decision tool.

---

## Scoring Criteria

| Criterion | Points |
|-----------|--------|
| Age > 80 years | **+1** |
| History of cancer | **+1** |
| History of chronic cardiopulmonary disease (heart failure or chronic lung disease) | **+1** |
| Heart rate ≥ 110 bpm | **+1** |
| Systolic blood pressure ≤ 100 mmHg | **+1** |
| SpO2 < 90% on room air | **+1** |

**Maximum Score**: 6

---

## Score Interpretation

| sPESI Score | 30-Day Mortality | Risk Level |
|-------------|------------------|------------|
| **0** | 1.0% (95% CI 0.0–2.1%) | Low Risk |
| **≥ 1** | 10.9% (95% CI 8.5–13.2%) | High Risk |

---

## Clinical Application

### sPESI = 0 (Low Risk):
- Consider **outpatient management** or **early discharge**
- DOAC monotherapy (rivaroxaban or apixaban as single-drug approach)
- Ensure:
  - Adequate social support
  - Access to follow-up within 1 week
  - Ability to return if symptoms worsen
  - No other reason for hospitalization

### sPESI ≥ 1 (High Risk):
- **Hospital admission** recommended
- Further risk stratification with:
  - **Troponin** (RV injury marker)
  - **BNP/NT-proBNP** (RV strain marker)
  - **Echocardiography** or **CTPA RV/LV ratio** (RV dysfunction)
- Standard anticoagulation
- If hemodynamically unstable → consider **thrombolysis** or **catheter-directed therapy**

### ESC 2019 Risk Stratification Context:
- sPESI 0 + normal troponin + no RV dysfunction = **Low risk** → early discharge
- sPESI ≥ 1 + elevated troponin + RV dysfunction = **Intermediate-high risk** → ICU monitoring, consider rescue thrombolysis
- Hemodynamic instability (SBP < 90 or vasopressors) = **High risk** regardless of sPESI

---

## Key References

- Jiménez D, et al. Simplification of the Pulmonary Embolism Severity Index for prognostication in patients with acute symptomatic pulmonary embolism. *Arch Intern Med*. 2010;170(15):1383–1389.
