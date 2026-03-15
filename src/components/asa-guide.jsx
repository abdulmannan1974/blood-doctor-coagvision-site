import { useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileText,
  Heart,
  Info,
  Link2,
  ShieldAlert,
  Syringe,
  Users,
} from "lucide-react";

const indicationSections = [
  {
    title: "Cardiac Indications",
    tone: "cardiac",
    icon: Heart,
    groups: [
      {
        title: "Coronary Artery Disease (CAD)",
        items: [
          "History of acute coronary syndrome (ACS) with and without ST-segment elevation.",
          "Chronic stable angina.",
          "Following percutaneous coronary intervention (PCI) or coronary artery bypass graft (CABG).",
        ],
        subitems: [
          "Use with clopidogrel for elective PCI, or with prasugrel/ticagrelor after ACS-PCI, usually for one year.",
          "Use triple therapy with ASA, clopidogrel, and oral anticoagulation only for the shortest possible duration in patients who also need anticoagulation.",
          "ASA may be considered with rivaroxaban 2.5 mg twice daily in selected CAD or PAD patients to reduce stroke, myocardial infarction, cardiovascular death, and acute limb ischaemia.",
        ],
      },
      {
        title: "Prosthetic Heart Valves",
        items: [
          "ASA 81 mg daily is recommended in addition to VKA in selected high-risk patients with a mechanical valve prosthesis.",
          "ASA 81 mg daily is reasonable in patients with a bioprosthetic aortic or mitral valve who are not taking oral anticoagulation.",
        ],
      },
    ],
  },
  {
    title: "Cerebrovascular Indications",
    tone: "stroke",
    icon: ShieldAlert,
    groups: [
      {
        title: "Stroke and TIA prevention",
        items: [
          "History of non-cardioembolic ischaemic stroke or transient ischaemic attack.",
          "Following carotid endarterectomy.",
        ],
      },
    ],
  },
  {
    title: "Peripheral Arterial Disease",
    tone: "pad",
    icon: Link2,
    groups: [
      {
        title: "PAD",
        items: [
          "Symptomatic peripheral arterial disease with or without prior vascular intervention.",
        ],
      },
    ],
  },
  {
    title: "Other Recognised Indications",
    tone: "other",
    icon: CheckCircle2,
    groups: [
      {
        title: "Secondary prevention of recurrent VTE",
        items: [
          "Consider ASA only when the patient remains at high risk of recurrence after at least 3 to 6 months of anticoagulation and extended anticoagulant therapy is not acceptable.",
        ],
      },
      {
        title: "Thromboprophylaxis after joint arthroplasty",
        items: [
          "Low VTE risk total knee arthroplasty: rivaroxaban 10 mg daily until day 5, then ASA 81 mg daily for another 9 days.",
          "Low VTE risk total hip arthroplasty: rivaroxaban 10 mg daily until day 5, then ASA 81 mg daily to complete 30 days.",
        ],
      },
      {
        title: "Prevention of preeclampsia in pregnancy",
        items: [
          "Moderate- to high-risk patients, started between 12 and 16 weeks gestation and stopped at 36 weeks.",
        ],
      },
    ],
  },
];

const dosingRows = [
  ["Standard antiplatelet dose", "81 mg daily", "Higher doses do not improve efficacy and increase bleeding risk."],
  ["Acute coronary syndrome loading", "162 mg chewed or crushed once", "Then continue 81 mg daily indefinitely."],
  ["Before angioplasty if not already on ASA", "325 mg chewed or crushed once", "Pre-procedure loading dose."],
  ["TIA or non-cardioembolic ischaemic stroke", "81 mg once daily", "Start promptly once appropriate."],
  ["Secondary VTE prevention", "81 mg once daily", "Only if long-term anticoagulation is declined."],
  ["Post-arthroplasty prophylaxis", "81 mg once daily", "After initial rivaroxaban phase."],
  ["Preeclampsia prevention", "81 mg once daily", "Use from 12 to 16 weeks until 36 weeks gestation."],
];

const adverseEffects = [
  { tone: "default", label: "Very common", text: "Bruising and minor bleeding" },
  { tone: "default", label: "Common", text: "Dyspepsia and gastrointestinal upset" },
  { tone: "serious", label: "Serious", text: "Gastrointestinal bleeding" },
  { tone: "serious", label: "Serious", text: "Intracranial bleeding" },
  { tone: "moderate", label: "Hypersensitivity", text: "Allergic reactions" },
  { tone: "moderate", label: "Respiratory", text: "Aspirin-induced asthma, which may be severe" },
];

const timelineSteps = [
  ["4 to 7 days before procedure", "If interruption is clinically appropriate, stop ASA 4 to 7 days before the procedure. Do not routinely stop in patients at high thrombotic risk.", "blue"],
  ["Day of procedure", "Proceed with the procedure and confirm the bleeding control plan.", "gray"],
  ["Within 48 hours after procedure", "Restart ASA as soon as haemostasis is secure and there is no significant bleeding.", "green"],
];

const relatedGuides = [
  "Mechanical and Bioprosthetic Heart Valves: Anticoagulant Therapy",
  "Perioperative Management of Antiplatelet Therapy",
  "Peripheral Arterial Disease",
  "Stroke: Secondary Prevention",
  "Thromboprophylaxis: Orthopedic Surgery",
  "Venous Thromboembolism: Duration of Treatment",
  "Duration of Dual Antiplatelet Therapy in Coronary Artery Disease",
];

const references = [
  "Anderson D, et al. Aspirin or rivaroxaban for VTE prophylaxis after hip or knee arthroplasty. N Engl J Med. 2018;378:699-707.",
  "Bainey KR, et al. 2023 Canadian Cardiovascular Society and Canadian Association of Interventional Cardiology focused update of the guidelines for the use of antiplatelet therapy. Can J Cardiol. 2024;40:160-181.",
  "Bowman W, et al. Effects of aspirin for primary prevention in persons with diabetes mellitus. N Engl J Med. 2018;379:1529-1539.",
  "Duley L, et al. Antiplatelet agents for preventing pre-eclampsia and its complications. Cochrane Database Syst Rev. 2019;10.",
  "Douketis JD, et al. Perioperative management of antithrombotic therapy. CHEST. 2022;126:e207-e243.",
  "Eikelboom JW, et al. Antiplatelet drugs: antithrombotic therapy and prevention of thrombosis, 9th edition. Chest. 2012;141:e89S-e119S.",
  "Eikelboom JW, et al. Rivaroxaban with or without aspirin in stable cardiovascular disease. N Engl J Med. 2017;377:1319-1330.",
  "Gaziano JM, et al. Use of aspirin to reduce risk of initial vascular events in patients at moderate risk of cardiovascular disease. Lancet. 2018;392:1036-1046.",
  "Lopes RD, et al. Antithrombotic therapy after acute coronary syndrome or PCI in atrial fibrillation. N Engl J Med. 2019;380:1509-1524.",
  "Mehta SR, et al. 2018 Canadian Cardiovascular Society and Canadian Association of Interventional Cardiology focused update of the guidelines for the use of antiplatelet therapy. Can J Cardiol. 2018;34:214-233.",
  "Monagle P, et al. Antithrombotic therapy in neonates and children: antithrombotic therapy and prevention of thrombosis, 9th edition. Chest. 2012;141:e737S-e801S.",
  "Nishimura R, et al. 2017 AHA and ACC focused update of the valvular heart disease guideline. Circulation. 2017;135:e1159-e1195.",
  "Rolnik DL, et al. Aspirin versus placebo in pregnancies at high risk for preterm preeclampsia. N Engl J Med. 2017;377:613-622.",
  "Wein T, et al. Canadian Stroke Best Practice Recommendations, seventh edition: Acetylsalicylic acid for prevention of vascular events. CMAJ. 2020;192:E302-E311.",
  "Weitz JI, et al. Rivaroxaban or aspirin for extended treatment of venous thromboembolism. N Engl J Med. 2017;376:1211-1222.",
  "Yasuda S, et al. Antithrombotic therapy for atrial fibrillation with stable coronary disease. N Engl J Med. 2019;381:1103-1113.",
  "Yusuf S, et al. Polypill with or without aspirin in persons without cardiovascular disease. N Engl J Med. 2021;384:216-228.",
];

const tabs = [
  ["indications", "Indications"],
  ["dosing", "Dosing"],
  ["adverse", "Adverse Effects"],
  ["periprocedural", "Peri-procedural"],
  ["special", "Special Considerations"],
  ["pediatrics", "Pediatrics"],
  ["references", "References"],
];

function Dot({ tone }) {
  return <span className={`asa-dot ${tone}`} />;
}

export function AsaGuide() {
  const [tab, setTab] = useState("indications");

  return (
    <section className="asa-guide-shell">
      <div className="asa-guide-header">
        <div className="asa-guide-header-top">
          <div className="asa-guide-header-copy">
            <div className="asa-badge-row">
              <span className="asa-badge asa-badge-blue">Clinical Guide</span>
              <span className="asa-badge asa-badge-teal">Antiplatelet Therapy</span>
              <span className="asa-badge asa-badge-gray">v105</span>
            </div>
            <h2 className="asa-guide-title">Acetylsalicylic Acid (ASA)</h2>
            <div className="asa-guide-meta">
              <span><Calendar size={13} /> Updated 5 February 2026</span>
              <span><FileText size={13} /> Enteric-coated ASA unless otherwise stated</span>
            </div>
          </div>
          <div className="asa-guide-icon">
            <Heart size={24} />
          </div>
        </div>

        <div className="asa-objective-strip">
          <strong>Objective:</strong> To provide information on the use of acetylsalicylic acid in the prevention of vascular thromboembolic events.
        </div>
      </div>

      <div className="asa-mechanism-card">
        <div className="asa-mechanism-icon">
          <Syringe size={18} />
        </div>
        <div>
          <h3>Mechanism of Action</h3>
          <p>ASA irreversibly inhibits platelet aggregation by inhibiting thromboxane A2 synthesis through cyclooxygenase inhibition. The antiplatelet effect lasts for the lifetime of the platelet.</p>
        </div>
      </div>

      <div className="asa-tabs">
        <div className="asa-tabs-list" role="tablist" aria-label="ASA guide sections">
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

        {tab === "indications" ? (
          <div className="asa-tab-panel">
            {indicationSections.map((section) => {
              const Icon = section.icon;
              return (
                <article key={section.title} className="asa-section-card">
                  <h3><Dot tone={section.tone} />{section.title}</h3>
                  {section.groups.map((group) => (
                    <div key={group.title} className="asa-ind-group">
                      <div className="asa-ind-group-label">
                        <span className={`asa-ind-icon ${section.tone}`}><Icon size={14} /></span>
                        {group.title}
                      </div>
                      <ul className="asa-ind-list">
                        {group.items.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                      {group.subitems?.length ? (
                        <ul className="asa-ind-list asa-sub-list">
                          {group.subitems.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </article>
              );
            })}

            <div className="asa-alert asa-alert-warn">
              <AlertCircle size={16} />
              <div>
                <strong>Primary prevention:</strong> ASA is not routinely recommended for primary prevention of a first vascular event, whether or not vascular risk factors are present. The net benefit in asymptomatic atherosclerosis remains uncertain.
              </div>
            </div>
          </div>
        ) : null}

        {tab === "dosing" ? (
          <div className="asa-tab-panel">
            <article className="asa-section-card">
              <h3><Dot tone="blue" />Dosing Summary</h3>
              <table className="asa-dose-table">
                <thead>
                  <tr>
                    <th>Indication or situation</th>
                    <th>Dose and route</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {dosingRows.map((row) => (
                    <tr key={row[0]}>
                      <td>{row[0]}</td>
                      <td className="dose-highlight">{row[1]}</td>
                      <td>{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>

            <div className="asa-alert asa-alert-warn">
              <AlertCircle size={16} />
              <div>
                <strong>GI bleeding risk:</strong> For patients with prior or high-risk gastrointestinal bleeding, consider a proton pump inhibitor, an H2 antagonist, or an alternative antiplatelet agent such as clopidogrel.
              </div>
            </div>
          </div>
        ) : null}

        {tab === "adverse" ? (
          <div className="asa-tab-panel">
            <article className="asa-section-card">
              <h3><Dot tone="danger" />Adverse Effects Profile</h3>
              <div className="asa-ae-grid">
                {adverseEffects.map((item) => (
                  <div key={`${item.label}-${item.text}`} className={`asa-ae-card ${item.tone}`}>
                    <div className="asa-ae-card-label">{item.label}</div>
                    <div className="asa-ae-card-text">{item.text}</div>
                  </div>
                ))}
              </div>
            </article>

            <div className="asa-alert asa-alert-danger">
              <ShieldAlert size={16} />
              <div>
                <strong>Avoid or use with caution in:</strong> asthma or nasal polyps, high bleeding risk, recent major bleeding, severe thrombocytopenia, and familial or acquired bleeding disorders.
              </div>
            </div>

            <div className="asa-alert asa-alert-warn">
              <AlertCircle size={16} />
              <div>
                <strong>NSAID interaction:</strong> Patients taking ASA for vascular protection should avoid traditional NSAIDs. If an anti-inflammatory is required, a COX-2 inhibitor is preferred.
              </div>
            </div>
          </div>
        ) : null}

        {tab === "periprocedural" ? (
          <div className="asa-tab-panel">
            <article className="asa-section-card">
              <h3><Dot tone="purple" />Peri-procedural Management</h3>
              <div className="asa-alert asa-alert-info">
                <Info size={16} />
                <div>Balance thrombotic risk and bleeding risk for every procedure. Specialist input is advised for higher-risk patients, especially those on dual antiplatelet therapy.</div>
              </div>
              <p className="asa-section-copy">
                In general, ASA should be continued, especially in high thrombotic risk patients or when the procedure carries low bleeding risk. Interrupt only when bleeding risk is high and thrombotic risk is low.
              </p>

              <div className="asa-timeline">
                {timelineSteps.map((step) => (
                  <div key={step[0]} className="asa-timeline-step">
                    <div className={`asa-timeline-dot ${step[2]}`} />
                    <div className="asa-timeline-label">{step[0]}</div>
                    <div className="asa-timeline-desc">{step[1]}</div>
                  </div>
                ))}
              </div>
            </article>

            <div className="asa-alert asa-alert-teal">
              <CheckCircle2 size={16} />
              <div>Use the perioperative antiplatelet guide for detailed interruption, dual antiplatelet therapy, and restart decisions.</div>
            </div>
          </div>
        ) : null}

        {tab === "special" ? (
          <div className="asa-tab-panel">
            <article className="asa-section-card">
              <h3><Dot tone="orange" />Concomitant Anticoagulation</h3>
              <p className="asa-section-copy">Concomitant use of therapeutic anticoagulation and ASA is discouraged and should only be considered in carefully selected low-bleeding-risk patients.</p>
              <ul className="asa-ind-list">
                <li>Very recent ACS or PCI with a coronary stent, for the shortest possible duration.</li>
                <li>High-risk prosthetic heart valve scenarios.</li>
                <li>Proven TIA or ischaemic stroke while on therapeutic anticoagulation alone.</li>
                <li>High-risk thrombophilia with breakthrough thrombosis despite therapeutic anticoagulation.</li>
              </ul>
              <div className="asa-alert asa-alert-danger">
                <ShieldAlert size={16} />
                <div>In most other patients, stop ASA once anticoagulation is started. Discuss combined therapy with thrombosis or cardiology specialists first.</div>
              </div>
            </article>

            <article className="asa-section-card">
              <h3><Dot tone="danger" />Cautions and Contraindications</h3>
              <ul className="asa-ind-list">
                <li>Asthma or nasal polyps.</li>
                <li>High bleeding risk or recent major bleeding.</li>
                <li>Severe thrombocytopenia.</li>
                <li>Familial or acquired bleeding disorders.</li>
                <li>Concomitant traditional NSAID use.</li>
              </ul>
            </article>
          </div>
        ) : null}

        {tab === "pediatrics" ? (
          <div className="asa-tab-panel">
            <article className="asa-section-card">
              <h3><Dot tone="teal" />Pediatric Use</h3>
              <div className="asa-alert asa-alert-teal">
                <Users size={16} />
                <div>When possible, involve a paediatrician with expertise in thromboembolism when considering ASA for antiplatelet therapy in children.</div>
              </div>
              <p className="asa-section-copy">If a specialist paediatric thrombosis clinician is not available, combine local neonatology or paediatric care with adult haematology support and remote input from an experienced paediatric haematologist.</p>
            </article>
          </div>
        ) : null}

        {tab === "references" ? (
          <div className="asa-tab-panel">
            <article className="asa-section-card">
              <h3><Dot tone="gray" />Related Clinical Guides</h3>
              <ul className="asa-related-list">
                {relatedGuides.map((item) => (
                  <li key={item}><Link2 size={14} /><span>{item}</span></li>
                ))}
              </ul>
            </article>

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
        <p><strong>Acetylsalicylic Acid (ASA)</strong> | Updated 5 February 2026 | Version 105</p>
        <p>The information here is not a substitute for clinical judgement. Always seek appropriate specialist input when needed.</p>
      </div>
    </section>
  );
}
