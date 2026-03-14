# Perioperative Anticoagulant Management Algorithm

**Type**: Interactive Algorithm
**Scraped**: 2026-03-12

---

## Overview

Interactive decision-support algorithm for perioperative management of patients on anticoagulation therapy. Guides clinicians through when to hold and restart anticoagulants around surgical or invasive procedures.

---

## Step 1: Type of Surgery

Select one:
- **Elective (non-urgent) surgery/procedure**
- **Emergency surgery/procedure < 12 h** (e.g., intracranial bleed, ruptured viscus, cardiac tamponade)
- **Urgent surgery/procedure 12–24 h** (e.g., hip fracture repair, acute cholecystitis)

---

## Step 2: Procedural Bleeding Risk

| Risk Category | Examples |
|---------------|----------|
| **Low** (minor non-dental) | Cataract surgery, minor dermatologic procedures, pacemaker/ICD insertion |
| **Low** (minor dental) | Dental extractions, dental implants, periodontal surgery |
| **Moderate** | Abdominal surgery, thoracic surgery, major orthopedic surgery |
| **High** | Spinal surgery, neurosurgery, major cardiac surgery, major vascular surgery |

---

## Step 3: Anticoagulant Used

Select one:
- **Apixaban**
- **Dabigatran**
- **Edoxaban**
- **Rivaroxaban**
- **Warfarin**

---

## Step 4: Creatinine Clearance (for DOACs)

Required inputs:
- **Age** (years)
- **Weight** (kg)
- **Serum Creatinine** (µmol/L or mg/dL)
- **Sex** (Male/Female)

Calculated using the **Cockcroft-Gault equation**:
```
CrCl = [(140 - Age) × Weight (kg)] / [Serum Cr (µmol/L) × 0.815]
× 0.85 if female
```

---

## DOAC-Specific Perioperative Protocols

### Apixaban & Rivaroxaban

| Bleeding Risk | CrCl ≥ 30 mL/min | CrCl 15–29 mL/min |
|---------------|--------------------|--------------------|
| Low (non-dental) | Hold 24 h before | Hold 48 h before |
| Low (dental) | Hold morning of procedure | Hold morning of procedure |
| Moderate | Hold 48 h before | Hold 72 h before |
| High | Hold 48 h before | Hold 72 h before |

### Dabigatran

| Bleeding Risk | CrCl ≥ 80 | CrCl 50–79 | CrCl 30–49 | CrCl 15–29 |
|---------------|-----------|-----------|-----------|-----------|
| Low (non-dental) | Hold 24 h | Hold 48 h | Hold 48 h | Hold 72 h |
| Low (dental) | Hold morning | Hold morning | Hold morning | Hold morning |
| Moderate | Hold 48 h | Hold 72 h | Hold 96 h | Hold 96 h |
| High | Hold 48 h | Hold 72 h | Hold 96 h | Hold 96 h |

### Edoxaban

| Bleeding Risk | CrCl ≥ 30 mL/min | CrCl 15–29 mL/min |
|---------------|--------------------|--------------------|
| Low (non-dental) | Hold 24 h before | Hold 48 h before |
| Low (dental) | Hold morning of procedure | Hold morning of procedure |
| Moderate | Hold 48 h before | Hold 72 h before |
| High | Hold 48 h before | Hold 72 h before |

### Warfarin

- **Stop warfarin 5 days before procedure**
- **Check INR on day of procedure** — proceed if INR ≤ 1.5 (or ≤ 1.2 for high-bleeding-risk procedures)
- **Bridging with LMWH**: Consider for patients at HIGH thromboembolic risk (mechanical mitral valve, recent stroke/TIA within 3 months, CHADS2 score 5–6)
- **Most patients do NOT require bridging**

---

## Postoperative Restart

| Bleeding Risk | DOAC Restart | Warfarin Restart |
|---------------|-------------|-----------------|
| Low | Evening of procedure or next day | Evening of procedure |
| Moderate | 48–72 h post-procedure | Evening of procedure |
| High | 48–72 h post-procedure | Evening of procedure |

---

## Emergency/Urgent Surgery

### Emergency (< 12 h):
- **Proceed with surgery** — do not delay for anticoagulant reversal unless feasible
- **Warfarin**: Vitamin K 2.5–5 mg IV + 4-factor PCC (Octaplex/Beriplex)
- **Dabigatran**: Idarucizumab (Praxbind) 5 g IV
- **Apixaban/Rivaroxaban/Edoxaban**: 4-factor PCC if life-threatening bleeding

### Urgent (12–24 h):
- Hold DOAC and check timing of last dose
- Consider creatinine clearance for dabigatran
- Reversal agents if needed based on clinical urgency

---

## Key References

- Douketis JD, et al. Perioperative management of antithrombotic therapy. *Chest*. 2012;141(2 Suppl):e326S-e350S.
- Schulman S, et al. Perioperative management of dabigatran. *J Thromb Haemost*. 2015.
