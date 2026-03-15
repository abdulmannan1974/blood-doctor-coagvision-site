import { useState } from "react";
import {
  AlertCircle,
  Baby,
  Calendar,
  CheckCircle2,
  FileText,
  HeartPulse,
  Info,
  Orbit,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";

const tabs = [
  ["overview", "Overview"],
  ["bioprosthetic", "Bioprosthetic"],
  ["transcatheter", "Transcatheter"],
  ["mechanical", "Mechanical"],
  ["special", "Special Situations"],
  ["references", "References"],
];

const bioprostheticRows = [
  [
    "Surgical bioprosthetic aortic valve",
    "Warfarin for 3 to 6 months with INR target 2.5, or ASA 81 mg daily.",
    "Long-term ASA 81 mg daily may be considered thereafter if no other indication for anticoagulation exists.",
  ],
  [
    "Surgical bioprosthetic mitral valve",
    "Warfarin for 3 to 6 months with INR target 2.5, or ASA 81 mg daily.",
    "Long-term ASA 81 mg daily may be considered thereafter if no other indication for anticoagulation exists.",
  ],
  [
    "Surgical bioprosthetic tricuspid or pulmonic valve",
    "Warfarin for 3 months with INR target 2.5, or ASA 81 mg daily.",
    "Evidence is lower quality and management should be individualized.",
  ],
  [
    "Surgical valve repair",
    "Aortic repair: ASA for at least 3 months. Mitral repair: ASA or warfarin for 3 months. Tricuspid repair: warfarin for 3 months.",
    "Follow local valve and surgical protocols where available.",
  ],
];

const transcatheterRows = [
  [
    "TAVR without another anticoagulation indication",
    "Single antiplatelet therapy is now generally preferred over dual antiplatelet therapy.",
    "Older guidance suggested DAPT for 3 to 6 months or warfarin for 3 months in selected low-bleeding-risk patients.",
  ],
  [
    "TAVR with atrial fibrillation or another anticoagulation indication",
    "Use long-term oral anticoagulation according to the AF pathway.",
    "Addition of routine antiplatelet therapy is not recommended because it increases bleeding without benefit.",
  ],
  [
    "Transcatheter mitral valve replacement",
    "Three months of anticoagulation, then aspirin alone.",
    "Applies to off-label transcatheter use in selected scenarios.",
  ],
  [
    "Transcatheter tricuspid valve replacement",
    "Optimal therapy remains uncertain.",
    "TRISCEND II used 6 months of warfarin or another anticoagulant plus aspirin, but major bleeding was common.",
  ],
  [
    "Transcatheter pulmonary valve replacement",
    "Aspirin alone is most commonly used and is likely safe.",
    "Randomized data are lacking.",
  ],
  [
    "Transcatheter mitral or tricuspid repair",
    "Either aspirin alone or aspirin plus clopidogrel for 3 to 6 months, then lifelong aspirin.",
    "This follows major device-trial protocols until better comparative data are available.",
  ],
];

const mechanicalRows = [
  [
    "Core treatment",
    "All patients with mechanical heart valves require lifelong warfarin.",
    "Target INR depends on valve type, manufacturer, location, and stroke risk factors.",
  ],
  [
    "Aspirin",
    "ASA 81 mg daily should be added in low-bleeding-risk patients with mechanical aortic or mitral valves.",
    "Use caution in patients with prior gastrointestinal bleeding or other major bleeding risk.",
  ],
  [
    "DOACs",
    "Dabigatran, apixaban, rivaroxaban, and edoxaban are contraindicated.",
    "Randomized trials showed more thrombosis and, in some trials, more bleeding compared with warfarin.",
  ],
  [
    "On-X aortic mechanical valve",
    "Lower INR targets may be reasonable in selected patients after the first 3 months.",
    "This remains controversial and is not endorsed by all major guidelines.",
  ],
];

const mechanicalFacts = [
  "Stroke or valve thrombosis risk is approximately 0.5% per year with mechanical aortic valves.",
  "Stroke or valve thrombosis risk is approximately 0.9% per year with mechanical mitral valves.",
  "Combined aortic and mitral mechanical valves carry approximately 1.2% annual risk despite anticoagulation.",
  "Mechanical mitral valves are more thrombogenic than mechanical aortic valves because flow is more passive across the mitral position.",
];

const specialRows = [
  [
    "Periprocedural management",
    "Elective procedures usually require bridging with UFH or LMWH before surgery and sometimes after surgery.",
    "Do not interrupt warfarin for minor procedures such as cataract surgery, dental procedures, or skin biopsy.",
  ],
  [
    "Pregnancy with mechanical valves",
    "Manage through a multidisciplinary team with expertise in maternal cardiac and thrombosis care.",
    "Therapeutic anticoagulation must continue throughout pregnancy, with individualized warfarin, LMWH, and peri-delivery planning.",
  ],
  [
    "Pediatrics",
    "Children should be managed with paediatric cardiology input and adult recommendations used as a guide.",
    "High-quality paediatric randomized data are lacking.",
  ],
];

const references = [
  "Asgar AW, et al. 2019 Canadian Cardiovascular Society position statement for transcatheter aortic valve implantation. Can J Cardiol. 2019;35:1437-1448.",
  "Brouwer J, et al. Aspirin alone versus dual antiplatelet therapy after transcatheter aortic valve implantation. J Am Heart Assoc. 2021;10:e019604.",
  "Chu MWA, et al. Low-dose vs standard warfarin after mechanical mitral valve replacement. Ann Thorac Surg. 2023;115:929-938.",
  "Collet JP, et al. Apixaban vs standard of care after transcatheter aortic valve implantation: ATLANTIS trial. Eur Heart J. 2022;43:2783-2797.",
  "Dangas GD, et al. A controlled trial of rivaroxaban after transcatheter aortic-valve replacement. N Engl J Med. 2020;382:120-129.",
  "Eikelboom JW, et al. Dabigatran versus warfarin in patients with mechanical heart valves. N Engl J Med. 2013;369:1206-1214.",
  "Guimaraes HP, et al. Rivaroxaban in patients with atrial fibrillation and a bioprosthetic mitral valve. N Engl J Med. 2020;383:2117-2126.",
  "Hahn RT, et al. Transcatheter valve replacement in severe tricuspid regurgitation. N Engl J Med. 2024;392:115-126.",
  "Kovacs MJ, et al. PERIOP2 bridging trial. BMJ. 2021;373:n1205.",
  "Maznyczka A, Pilgrim T. Antithrombotic treatment after transcatheter valve interventions. Clin Ther. 2023:S0149-2918(23)00393-4.",
  "McLintock C. Thromboembolism in pregnancy and mechanical prosthetic heart valves. Best Pract Res Clin Obstet Gynaecol. 2014;28:519-536.",
  "Montalescot G, et al. Apixaban and valve thrombosis after TAVR: ATLANTIS-4D-CT substudy. JACC Cardiovasc Interv. 2022;15:1794-1804.",
  "Nijenhuis VJ, et al. Anticoagulation with or without clopidogrel after TAVI. N Engl J Med. 2020;382:1696-1707.",
  "Otto CM, et al. 2020 ACC/AHA valvular heart disease guideline. Circulation. 2021;143:e72-e227.",
  "Park DW, et al. ADAPT-TAVR randomized clinical trial. Circulation. 2022;146:466-479.",
  "Puskas JD, et al. Anticoagulation and antiplatelet strategies after On-X mechanical aortic valve replacement. J Am Coll Cardiol. 2018;71:2717-2726.",
  "Shim CY, et al. Edoxaban early after surgical bioprosthetic valve implantation or repair. J Thorac Cardiovasc Surg. 2023;165:58-67.e4.",
  "Unverdorben M, et al. Edoxaban versus vitamin K antagonist for atrial fibrillation after TAVR. N Engl J Med. 2021;385:2150-2160.",
  "Vahanian A, et al. 2021 ESC/EACTS valvular heart disease guideline. Eur Heart J. 2022;43:561-632.",
  "Wang TY, et al. Apixaban or warfarin in patients with an On-X mechanical aortic valve. NEJM Evid. 2023;2(7).",
  "Whitlock RP, et al. Antithrombotic and thrombolytic therapy for valvular disease. Chest. 2012;141:e576S-e600S.",
  "Woldendorp K, et al. Subclinical valve thrombosis in TAVI. J Thorac Cardiovasc Surg. 2021;162:1491-1499.e2.",
];

function Dot({ tone }) {
  return <span className={`asa-dot ${tone}`} />;
}

export function HeartValvesGuide() {
  const [tab, setTab] = useState("overview");

  return (
    <section className="asa-guide-shell valves-guide-shell">
      <div className="asa-guide-header">
        <div className="asa-guide-header-top">
          <div className="asa-guide-header-copy">
            <div className="asa-badge-row">
              <span className="asa-badge asa-badge-blue">Clinical Guide</span>
              <span className="asa-badge asa-badge-green">Valve Antithrombotics</span>
              <span className="asa-badge asa-badge-teal">Cardiac Devices</span>
            </div>
            <h2 className="asa-guide-title">Bioprosthetic and Mechanical Heart Valves: Antithrombotic Therapy</h2>
            <div className="asa-guide-meta">
              <span><Calendar size={13} /> Updated 6 February 2026</span>
              <span><FileText size={13} /> Surgical, repaired, and transcatheter valves</span>
            </div>
          </div>
          <div className="asa-guide-icon valves-guide-icon">
            <HeartPulse size={24} />
          </div>
        </div>

        <div className="asa-objective-strip">
          <strong>Objective:</strong> To summarize evidence-based recommendations for antithrombotic drug management in patients with surgical or transcatheter valve replacement or repair.
        </div>
      </div>

      <div className="asa-mechanism-card valves-mechanism-card">
        <div className="asa-mechanism-icon valves-mechanism-icon">
          <Orbit size={18} />
        </div>
        <div>
          <h3>Clinical Background</h3>
          <p>Valve thrombosis and thromboembolism risk varies by prosthesis type, valve position, repair versus replacement strategy, coexisting atrial fibrillation, and patient-specific bleeding risk. Antithrombotic decisions must balance valve protection, systemic embolic risk, and procedural bleeding burden.</p>
        </div>
      </div>

      <div className="asa-tabs">
        <div className="asa-tabs-list" role="tablist" aria-label="Heart valve guide sections">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? "asa-tab-btn active" : "asa-tab-btn"}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" ? (
          <div className="asa-tab-panel">
            <article className="asa-section-card">
              <h3><Dot tone="blue" />High-Yield Clinical Orientation</h3>
              <ul className="asa-ind-list">
                <li>Bioprosthetic valve recommendations are largely based on lower-quality observational evidence, and guideline bodies differ in emphasis.</li>
                <li>Transcatheter valve decisions are increasingly patient-driven because bleeding and thrombotic risk often reflect comorbidity burden more than the device itself.</li>
                <li>Mechanical valves remain highly thrombogenic and require lifelong warfarin, with intensity adjusted by valve type and location.</li>
                <li>Subclinical leaflet thrombosis may be reduced by anticoagulation, but routine screening and routine preventive anticoagulation are not currently recommended.</li>
              </ul>
            </article>

            <div className="asa-alert asa-alert-info">
              <Info size={16} />
              <div>Two important recurring questions should guide decisions: does the patient have another indication for anticoagulation, and is the valve surgical, repaired, or transcatheter?</div>
            </div>
          </div>
        ) : null}

        {tab === "bioprosthetic" ? (
          <div className="asa-tab-panel">
            <article className="asa-section-card">
              <h3><Dot tone="green" />Bioprosthetic Valves and Surgical Repair</h3>
              <table className="asa-dose-table">
                <thead>
                  <tr>
                    <th>Valve situation</th>
                    <th>Suggested regimen</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {bioprostheticRows.map((row) => (
                    <tr key={row[0]}>
                      <td className="dose-highlight">{row[0]}</td>
                      <td>{row[1]}</td>
                      <td>{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>

            <div className="asa-alert asa-alert-teal">
              <CheckCircle2 size={16} />
              <div>When atrial fibrillation or another long-term anticoagulation indication is present, continue long-term anticoagulation rather than relying on antiplatelet therapy alone.</div>
            </div>
          </div>
        ) : null}

        {tab === "transcatheter" ? (
          <div className="asa-tab-panel">
            <article className="asa-section-card">
              <h3><Dot tone="teal" />Transcatheter Valve Strategies</h3>
              <table className="asa-dose-table">
                <thead>
                  <tr>
                    <th>Intervention</th>
                    <th>Typical antithrombotic approach</th>
                    <th>Practice note</th>
                  </tr>
                </thead>
                <tbody>
                  {transcatheterRows.map((row) => (
                    <tr key={row[0]}>
                      <td className="dose-highlight">{row[0]}</td>
                      <td>{row[1]}</td>
                      <td>{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>

            <div className="asa-alert asa-alert-warn">
              <AlertCircle size={16} />
              <div>Earlier TAVR protocols often used dual antiplatelet therapy empirically. More recent evidence supports single antiplatelet therapy in patients without another anticoagulation indication because bleeding rises without clear thrombotic benefit.</div>
            </div>
          </div>
        ) : null}

        {tab === "mechanical" ? (
          <div className="asa-tab-panel">
            <article className="asa-section-card">
              <h3><Dot tone="danger" />Mechanical Valves</h3>
              <table className="asa-dose-table">
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Key recommendation</th>
                    <th>Important qualifier</th>
                  </tr>
                </thead>
                <tbody>
                  {mechanicalRows.map((row) => (
                    <tr key={row[0]}>
                      <td className="dose-highlight">{row[0]}</td>
                      <td>{row[1]}</td>
                      <td>{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>

            <article className="asa-section-card">
              <h3><Dot tone="orange" />Mechanical Valve Risk Points</h3>
              <ul className="asa-ind-list">
                {mechanicalFacts.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>

            <div className="asa-alert asa-alert-danger">
              <ShieldAlert size={16} />
              <div>Direct oral anticoagulants are contraindicated in patients with mechanical heart valves.</div>
            </div>
          </div>
        ) : null}

        {tab === "special" ? (
          <div className="asa-tab-panel">
            <article className="asa-section-card">
              <h3><Dot tone="purple" />Special Situations</h3>
              <table className="asa-dose-table">
                <thead>
                  <tr>
                    <th>Scenario</th>
                    <th>Clinical approach</th>
                    <th>Practical note</th>
                  </tr>
                </thead>
                <tbody>
                  {specialRows.map((row) => (
                    <tr key={row[0]}>
                      <td className="dose-highlight">{row[0]}</td>
                      <td>{row[1]}</td>
                      <td>{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>

            <div className="asa-alert asa-alert-info">
              <Stethoscope size={16} />
              <div>Pregnancy in women with mechanical heart valves requires multidisciplinary planning, therapeutic anticoagulation throughout pregnancy, and a defined peripartum switch to unfractionated heparin before delivery.</div>
            </div>

            <div className="asa-alert asa-alert-teal">
              <Baby size={16} />
              <div>Paediatric valve patients should be co-managed with specialist paediatric cardiology and haematology support whenever possible.</div>
            </div>
          </div>
        ) : null}

        {tab === "references" ? (
          <div className="asa-tab-panel">
            <article className="asa-section-card">
              <h3><Dot tone="gray" />References</h3>
              <ol className="asa-ref-list">
                {references.map((item) => <li key={item}>{item}</li>)}
              </ol>
            </article>
          </div>
        ) : null}
      </div>

      <div className="asa-guide-footer">
        <p><strong>Bioprosthetic and Mechanical Heart Valves: Antithrombotic Therapy</strong> | Updated 6 February 2026</p>
        <p>Use these recommendations alongside valve-specific cardiology input, bleeding-risk assessment, and peri-procedural planning.</p>
      </div>
    </section>
  );
}
