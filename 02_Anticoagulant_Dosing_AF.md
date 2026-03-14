# Anticoagulant Dosing in Atrial Fibrillation

**Type**: Interactive Algorithm (powered by Vivomap)
**Scraped**: 2026-03-12

---

## Overview

Interactive decision-support algorithm for selecting and dosing anticoagulants in patients with non-valvular atrial fibrillation (AF) for stroke prevention (SPAF).

---

## Step 1: Risk Stratification

### CHA2DS2-VASc Score Components

| Criterion | Points |
|-----------|--------|
| **C** — Congestive Heart Failure History | +1 |
| **H** — Hypertension History | +1 |
| **A2** — Age ≥ 75 | +2 |
| **D** — Diabetes Mellitus History | +1 |
| **S2** — Previous Stroke or TIA | +2 |
| **V** — History of macrovascular disease (coronary, aortic, or peripheral) | +1 |
| **A** — Age 65–74 | +1 |
| **Sc** — Female Patient | +1 |

### Anticoagulation Decision

| CHA2DS2-VASc Score | Male | Female | Recommendation |
|--------------------|------|--------|----------------|
| 0 (male) / 1 (female) | 0 | 1 | No anticoagulation |
| 1 (male) / 2 (female) | 1 | 2 | Consider anticoagulation |
| ≥ 2 (male) / ≥ 3 (female) | ≥2 | ≥3 | Anticoagulation recommended |

---

## Step 2: Contraindications Check

### Must use Warfarin (NOT DOAC) if:
- Mechanical heart valve
- LV thrombus
- Rheumatic valvular heart disease
- Moderate-severe mitral stenosis

---

## Step 3: DOAC Selection and Dosing

### Apixaban (Eliquis)

| Standard Dose | Reduced Dose |
|---------------|-------------|
| 5 mg BID | 2.5 mg BID |

**Dose reduction criteria** (need ≥ 2 of 3):
- Age ≥ 80 years
- Weight ≤ 60 kg
- Serum creatinine ≥ 133 µmol/L (1.5 mg/dL)

**Contraindicated**: CrCl < 15 mL/min (or on dialysis — limited data)

---

### Dabigatran (Pradaxa)

| Standard Dose | Reduced Dose |
|---------------|-------------|
| 150 mg BID | 110 mg BID |

**Dose reduction to 110 mg BID if ANY**:
- Age ≥ 80 years
- CrCl 30–49 mL/min
- Concomitant verapamil
- High bleeding risk (HAS-BLED ≥ 3)
- Age 75–79 (consider based on risk)

**Contraindicated**: CrCl < 30 mL/min

---

### Rivaroxaban (Xarelto)

| Standard Dose | Reduced Dose |
|---------------|-------------|
| 20 mg once daily (with food) | 15 mg once daily (with food) |

**Dose reduction criteria**:
- CrCl 15–49 mL/min → 15 mg daily

**Contraindicated**: CrCl < 15 mL/min

---

### Edoxaban (Lixiana)

| Standard Dose | Reduced Dose |
|---------------|-------------|
| 60 mg once daily | 30 mg once daily |

**Dose reduction to 30 mg daily if ANY**:
- CrCl 15–50 mL/min
- Weight ≤ 60 kg
- Concomitant use of P-gp inhibitors (except amiodarone and verapamil)

**P-gp inhibitors requiring dose reduction** include:
- Carvedilol, clarithromycin, cyclosporin, erythromycin, itraconazole, ketoconazole, dronedarone, lapatinib, lopinavir, propafenone, quinidine, ranolazine, ritonavir, saquinavir, telaprevir, tipranavir

*Note: Dose reduction is NOT required with concomitant use of verapamil or amiodarone*

**Contraindicated**: CrCl < 15 mL/min

**Not recommended**: CrCl > 95 mL/min (reduced efficacy in RE-LY subanalysis)

---

### Warfarin

| Parameter | Target |
|-----------|--------|
| Target INR | 2.0–3.0 |
| Time in therapeutic range (TTR) | Goal > 65% |

---

## Key Drug Interactions

| Drug | Apixaban | Dabigatran | Rivaroxaban | Edoxaban |
|------|----------|-----------|------------|---------|
| **Strong P-gp + CYP3A4 inhibitors** (ketoconazole, itraconazole, ritonavir) | Avoid | Avoid | Avoid | Reduce dose |
| **Verapamil** | No change | Reduce to 110 mg | No change | No change |
| **Amiodarone** | No change | Consider reduction | No change | No change |
| **Dronedarone** | Avoid | Avoid | Avoid | Reduce dose |

---

## Key References

- CCS/CHRS AF Guidelines (2020 Update).
- Product monographs: Eliquis, Pradaxa, Xarelto, Lixiana.
