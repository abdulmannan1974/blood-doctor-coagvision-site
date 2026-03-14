# Creatinine Clearance (Cockcroft-Gault Equation)

**Type**: Scoring Calculator
**Scraped**: 2026-03-12

---

## Overview

Calculates creatinine clearance (CrCl) according to the Cockcroft-Gault equation. Essential for DOAC dose adjustment and perioperative anticoagulant management.

---

## Formula

### Cockcroft-Gault Equation:

```
CrCl (mL/min) = [(140 - Age) × Weight (kg)] / [Serum Creatinine (µmol/L) × 0.815]

If FEMALE: multiply result by 0.85
```

### If Serum Creatinine in mg/dL:

```
CrCl (mL/min) = [(140 - Age) × Weight (kg)] / [72 × Serum Creatinine (mg/dL)]

If FEMALE: multiply result by 0.85
```

---

## Required Inputs

| Input | Unit |
|-------|------|
| Age | years |
| Weight | kg |
| Serum Creatinine | µmol/L or mg/dL |
| Sex | Male / Female |

---

## CrCl Thresholds for DOAC Dosing

### Atrial Fibrillation (SPAF)

| DOAC | Full Dose CrCl | Reduced Dose CrCl | Contraindicated |
|------|----------------|-------------------|-----------------|
| **Apixaban** | ≥ 25 mL/min | Dose reduce if ≥ 2 of: age ≥ 80, weight ≤ 60 kg, Cr ≥ 133 µmol/L | < 15 mL/min |
| **Dabigatran** | ≥ 50 mL/min (150 mg BID) | 30–49 mL/min (110 mg BID) | < 30 mL/min |
| **Rivaroxaban** | ≥ 50 mL/min (20 mg) | 15–49 mL/min (15 mg) | < 15 mL/min |
| **Edoxaban** | > 95 mL/min (not recommended*) | 15–50 mL/min (30 mg) | < 15 mL/min |

*Edoxaban has reduced efficacy with CrCl > 95 mL/min

### VTE Treatment

| DOAC | Threshold | Note |
|------|-----------|------|
| **Apixaban** | CrCl ≥ 25 mL/min | No dose adjustment for renal function |
| **Dabigatran** | CrCl ≥ 30 mL/min | — |
| **Rivaroxaban** | CrCl ≥ 15 mL/min | Use with caution 15–30 |
| **Edoxaban** | CrCl 15–95 mL/min | — |

---

## CrCl Thresholds for Perioperative Management

### Dabigatran (most renally dependent DOAC — 80% renal clearance)

| CrCl | Low Bleed Risk | Moderate/High Bleed Risk |
|------|---------------|-------------------------|
| ≥ 80 mL/min | Hold 24 h | Hold 48 h |
| 50–79 mL/min | Hold 48 h | Hold 72 h |
| 30–49 mL/min | Hold 48 h | Hold 96 h |
| 15–29 mL/min | Hold 72 h | Hold 96 h |

### Apixaban, Rivaroxaban, Edoxaban (~25–35% renal clearance)

| CrCl | Low Bleed Risk | Moderate/High Bleed Risk |
|------|---------------|-------------------------|
| ≥ 30 mL/min | Hold 24 h | Hold 48 h |
| 15–29 mL/min | Hold 48 h | Hold 72 h |

---

## Important Notes

- **Cockcroft-Gault** uses **actual body weight** (the equation used in DOAC clinical trials)
- **Do NOT substitute eGFR (CKD-EPI or MDRD)** for CrCl when dosing DOACs — these equations are NOT interchangeable
- In obese patients: some centers use adjusted body weight, but Cockcroft-Gault with actual weight was used in the pivotal trials
- Serum creatinine can underestimate renal impairment in elderly, low-muscle-mass patients

---

## Key References

- Cockcroft DW, Gault MH. Prediction of creatinine clearance from serum creatinine. *Nephron*. 1976;16:31–41.
