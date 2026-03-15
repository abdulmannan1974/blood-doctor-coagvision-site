import { useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileText,
  Info,
  Luggage,
  Plane,
  ShieldCheck,
  Users,
  Waves,
} from "lucide-react";

const tabs = [
  ["overview", "Overview"],
  ["prevention", "Prevention"],
  ["compression", "Compression"],
  ["medication", "Medication"],
  ["recommendations", "Recommendations"],
  ["references", "References"],
];

const riskFactors = [
  "Obesity with BMI greater than 30.",
  "Hormonal therapy.",
  "Known thrombophilia.",
  "Pregnancy and the postpartum period.",
  "Active cancer.",
  "Recent major surgery or hospitalization.",
  "Advanced age over 40 years.",
  "Extremes of height over 190 cm or under 160 cm.",
  "Prior history of venous thromboembolism.",
  "Window seating may increase risk, especially in passengers with obesity.",
];

const overviewStats = [
  ["Relative risk", "Three-fold increase in VTE risk after long-distance travel compared with no travel exposure."],
  ["Symptomatic VTE", "Approximately 1 in 4,656 person-flights after journeys longer than 4 hours."],
  ["Pulmonary embolism", "0.39 cases per 1 million travellers immediately after air travel, increasing with flights longer than 8 hours."],
  ["Clinical context", "Risk remains lower than several other transient provoking factors such as knee arthroscopy or lower-limb cast immobilization."],
];

const generalMeasures = [
  "Get up and walk every 1 to 2 hours when possible.",
  "Choose an aisle seat to facilitate movement.",
  "Avoid constrictive clothing.",
  "Minimize under-seat baggage that restricts leg room.",
  "Maintain hydration and avoid alcohol during travel.",
];

const compressionPoints = [
  "Graduated compression stockings reduce leg swelling symptoms and may help prevent travel-related DVT.",
  "Randomized trial data suggest roughly 90% reduction in asymptomatic DVT among travellers wearing compression stockings.",
  "Passengers with additional VTE risk factors appeared to benefit most.",
  "The clinical significance of small asymptomatic DVTs detected on screening ultrasound remains uncertain.",
];

const recommendationRows = [
  [
    "Baseline risk travellers",
    "Use frequent ambulation, calf exercises, hydration, and practical mobility measures.",
    "Do not routinely use compression stockings, aspirin, or anticoagulants in travellers without additional risk factors.",
  ],
  [
    "Travellers already on anticoagulation",
    "Continue existing prophylactic or treatment-dose anticoagulation.",
    "No additional VTE prophylaxis is required; monitor usual medication timing around departure.",
  ],
  [
    "Increased-risk travellers",
    "Recommend bilateral below-knee graduated compression stockings.",
    "Use 20 to 30 mmHg stockings for long-distance travel over 4 hours.",
  ],
  [
    "Very high-risk travellers",
    "Consider a single prophylactic anticoagulant dose shortly before travel.",
    "Make an individualized decision after weighing thrombosis risk, bleeding risk, and patient preferences.",
  ],
];

const references = [
  "Cannegieter SC, et al. Travel-related venous thrombosis: results from a large population-based case control study (MEGA Study). PLoS Med. 2006;3:1258-1265.",
  "Cesarone MR, et al. Venous thrombosis from air travel: The LONFLIT3 study. Angiology. 2002;53:1-6.",
  "Chandra D, et al. Meta-analysis: travel and risk for venous thromboembolism. Ann Intern Med. 2009;151:180-190.",
  "Clarke MJ, et al. Compression stockings for preventing deep vein thrombosis in airline passengers. Cochrane Database Syst Rev. 2021;4:CD004002.",
  "Czuprynska J, Arya R. Travel and thrombosis. Br J Haematol. 2020;188:833-843.",
  "Karsanji DJ, et al. The risk and prevention of venous thromboembolism in the pregnant traveller. J Travel Med. 2020;27:1-8.",
  "Koh CH. Commercial air travel for passengers with cardiovascular disease. Curr Probl Cardiol. 2021;46:100782.",
  "Kuipers S, et al. The absolute risk of venous thromboembolism after air travel. PLoS Med. 2007;4:1508-1514.",
  "Kuipers S, et al. The incidence of venous thromboembolism in commercial airline pilots. J Thromb Haemost. 2014;12:1260-1265.",
  "Perez-Rodriguez E, et al. Incidence of air travel-related pulmonary embolism at Madrid-Barajas airport. Arch Intern Med. 2003;163:2766-2770.",
  "Schunemann HJ, et al. American Society of Hematology 2018 guidelines for management of venous thromboembolism. Blood Adv. 2018;2:3198-3225.",
  "Van Adrichem R, et al. Thromboprophylaxis after knee arthroscopy and lower-leg casting. N Engl J Med. 2017;376:515-525.",
];

function Dot({ tone }) {
  return <span className={`asa-dot ${tone}`} />;
}

export function TravelThrombosisGuide() {
  const [tab, setTab] = useState("overview");

  return (
    <section className="asa-guide-shell travel-guide-shell">
      <div className="asa-guide-header">
        <div className="asa-guide-header-top">
          <div className="asa-guide-header-copy">
            <div className="asa-badge-row">
              <span className="asa-badge asa-badge-blue">Clinical Guide</span>
              <span className="asa-badge asa-badge-teal">Travel Medicine</span>
              <span className="asa-badge asa-badge-green">VTE Prevention</span>
            </div>
            <h2 className="asa-guide-title">Air Travel-related Thrombosis</h2>
            <div className="asa-guide-meta">
              <span><Calendar size={13} /> Updated 6 February 2026</span>
              <span><FileText size={13} /> Long-distance travel risk reduction guide</span>
            </div>
          </div>
          <div className="asa-guide-icon travel-guide-icon">
            <Plane size={24} />
          </div>
        </div>

        <div className="asa-objective-strip">
          <strong>Objective:</strong> To summarize the available literature on venous thromboembolism risk during air travel and provide preventive recommendations for long-distance journeys.
        </div>
      </div>

      <div className="asa-mechanism-card travel-mechanism-card">
        <div className="asa-mechanism-icon travel-mechanism-icon">
          <Waves size={18} />
        </div>
        <div>
          <h3>Clinical Background</h3>
          <p>Travel-related thrombosis is likely multifactorial, with contributions from immobility and venous stasis, cabin hypobaric conditions, dehydration, and passenger-specific thrombotic risk factors.</p>
        </div>
      </div>

      <div className="asa-tabs">
        <div className="asa-tabs-list" role="tablist" aria-label="Air travel thrombosis guide sections">
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
              <h3><Dot tone="blue" />Risk Overview</h3>
              <table className="asa-dose-table">
                <thead>
                  <tr>
                    <th>Measure</th>
                    <th>Clinical meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewStats.map((row) => (
                    <tr key={row[0]}>
                      <td className="dose-highlight">{row[0]}</td>
                      <td>{row[1]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>

            <article className="asa-section-card">
              <h3><Dot tone="green" />Key Risk Factors</h3>
              <ul className="asa-ind-list">
                {riskFactors.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
          </div>
        ) : null}

        {tab === "prevention" ? (
          <div className="asa-tab-panel">
            <article className="asa-section-card">
              <h3><Dot tone="teal" />General Preventive Measures</h3>
              <div className="travel-card-grid">
                {generalMeasures.map((item) => (
                  <div key={item} className="travel-tip-card">
                    <div className="travel-tip-icon"><CheckCircle2 size={16} /></div>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </article>

            <div className="asa-alert asa-alert-info">
              <Info size={16} />
              <div>General preventive measures are widely accepted despite limited direct interventional trial evidence.</div>
            </div>
          </div>
        ) : null}

        {tab === "compression" ? (
          <div className="asa-tab-panel">
            <article className="asa-section-card">
              <h3><Dot tone="purple" />Compression Stockings</h3>
              <ul className="asa-ind-list">
                {compressionPoints.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>

            <div className="asa-alert asa-alert-teal">
              <ShieldCheck size={16} />
              <div>For long-distance travellers at increased VTE risk, bilateral below-knee graduated compression stockings of 20 to 30 mmHg are recommended.</div>
            </div>
          </div>
        ) : null}

        {tab === "medication" ? (
          <div className="asa-tab-panel">
            <article className="asa-section-card">
              <h3><Dot tone="orange" />Aspirin and Anticoagulants</h3>
              <p className="asa-section-copy">
                Routine use of aspirin or anticoagulants for travel-related prophylaxis is not recommended for most travellers. Evidence is limited, and the clinical significance of prevented asymptomatic DVT remains uncertain.
              </p>
              <div className="asa-alert asa-alert-warn">
                <AlertCircle size={16} />
                <div>A short course of prophylactic anticoagulation may be considered only in very high-risk travellers after individualized assessment. DOAC prophylaxis for this setting has not been adequately studied.</div>
              </div>
              <div className="asa-alert asa-alert-danger">
                <Luggage size={16} />
                <div>DOACs should not be used for short-term travel prophylaxis in pregnant or breastfeeding patients.</div>
              </div>
            </article>
          </div>
        ) : null}

        {tab === "recommendations" ? (
          <div className="asa-tab-panel">
            <article className="asa-section-card">
              <h3><Dot tone="green" />Practical Recommendations</h3>
              <table className="asa-dose-table">
                <thead>
                  <tr>
                    <th>Traveller profile</th>
                    <th>Recommended approach</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendationRows.map((row) => (
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
              <Users size={16} />
              <div>For travellers already receiving prophylactic or treatment-dose anticoagulation for another indication, no extra travel prophylaxis is required beyond usual dosing discipline.</div>
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
        <p><strong>Air Travel-related Thrombosis</strong> | Updated 6 February 2026</p>
        <p>Use these recommendations with clinical judgement and tailor advice to thrombosis risk, bleeding risk, and journey duration.</p>
      </div>
    </section>
  );
}
