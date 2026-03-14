# Khorana Risk Score for VTE in Cancer Patients

**Type**: Scoring Calculator
**Scraped**: 2026-03-12

---

## Overview

Predicts risk of venous thromboembolism (VTE) in ambulatory cancer patients receiving chemotherapy. Used to identify patients who may benefit from thromboprophylaxis.

---

## Scoring Criteria

| Criterion | Points |
|-----------|--------|
| **Site of Cancer** | |
| — Very high risk (stomach, pancreas) | **+2** |
| — High risk (lung, lymphoma, gynecologic, bladder, testicular) | **+1** |
| — All other sites | **0** |
| Pre-chemotherapy platelet count ≥ 350 × 10⁹/L | **+1** |
| Hemoglobin < 100 g/L OR use of erythropoiesis-stimulating agents (ESA) | **+1** |
| Pre-chemotherapy leukocyte count > 11 × 10⁹/L | **+1** |
| BMI ≥ 35 kg/m² | **+1** |

**Maximum Score**: 6

---

## Score Interpretation

| Khorana Score | VTE Rate (2.5 months) | Risk Category |
|---------------|----------------------|---------------|
| 0 | 0.3–0.8% | Low |
| 1–2 | 1.8–2.0% | Intermediate |
| ≥ 3 | 6.7–7.1% | High |

---

## Clinical Application

### Low Risk (Score 0):
- Routine thromboprophylaxis NOT recommended
- Standard VTE prevention measures (hydration, mobility)
- Patient education on VTE symptoms

### Intermediate Risk (Score 1–2):
- **Consider thromboprophylaxis** based on individual risk-benefit assessment
- Weigh bleeding risk vs. VTE risk
- Patient preference important

### High Risk (Score ≥ 3):
- **Thromboprophylaxis recommended** (if low bleeding risk):
  - **Rivaroxaban 10 mg daily** (CASSINI trial)
  - **Apixaban 2.5 mg BID** (AVERT trial)
  - Duration: throughout chemotherapy course
- Contraindications to thromboprophylaxis:
  - Active bleeding
  - High bleeding risk tumors (GI, GU)
  - Severe thrombocytopenia (< 50 × 10⁹/L)
  - Significant drug interactions

---

## Limitations

- Developed before widespread DOAC use
- Does not account for cancer-specific biological factors (e.g., tissue factor expression)
- May underestimate risk in certain cancer subtypes (brain tumors, myeloma)
- Does not incorporate CVC-related risk
- Not validated for inpatient use

---

## Key References

- Khorana AA, et al. Development and validation of a predictive model for chemotherapy-associated thrombosis. *Blood*. 2008;111:4902–4907.
- Key NS, et al. VTE in cancer patients: ASCO guideline update. *J Clin Oncol*. 2023.
- Carrier M, et al. (AVERT trial). *NEJM*. 2019;380:711–719.
- Khorana AA, et al. (CASSINI trial). *NEJM*. 2019;380:720–728.
