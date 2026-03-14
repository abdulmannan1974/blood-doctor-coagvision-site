#!/usr/bin/env python3

from __future__ import annotations

import io
import re
import shutil
from urllib.parse import parse_qs, quote, urlparse
from pathlib import Path

import pdfplumber
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, TextStringObject
from reportlab.lib import colors
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "sanitized-pdfs"
PUBLIC_PDF_DIR = ROOT / "public" / "sanitized-pdfs"
INDEX_FILE = ROOT / "src" / "data" / "pdfIndex.js"

TOP_MARGIN_POINTS = 28
BOTTOM_MARGIN_POINTS = 30
CORNER_BOX_WIDTH = 150
CORNER_BOX_HEIGHT = 72
RECT_PADDING = 2

SEARCH_PATTERNS = [
    re.compile(r"Thrombosis Canada(?: Clinical (?:Guides|Tools))?", re.IGNORECASE),
    re.compile(r"https?://(?:www\.)?thrombosiscanada\.ca[^\s)\]]*", re.IGNORECASE),
    re.compile(r"thrombosiscanada\.ca", re.IGNORECASE),
    re.compile(r"Help sustain trusted thrombosis guidance", re.IGNORECASE),
    re.compile(r"Ongoing expert review and regular updates ensure", re.IGNORECASE),
    re.compile(r"Source:\s*Thrombosis Canada.*", re.IGNORECASE),
]

GUIDE_TARGET_TO_FILE = {
    "ACETYLSALICYLICACID": "Acetylsalicylic_Acid_(ASA).pdf",
    "ANTIPHOSPHOLIPIDANTIBODYSYNDRO": "Thrombophilia_Antiphospholipid_Syndrome.pdf",
    "ANTITHROMBOTICDRUGMANAGEMENTIN": "Anticoagulation_in_Patients_Requiring_Antiplatelet_Therapy.pdf",
    "APIXABAN": "Apixaban_(Eliquis).pdf",
    "CANCERANDTHROMBOSIS": "Cancer_and_Thrombosis.pdf",
    "CENTRALVENOUSCATHETERRELATEDDE": "Central_Venous_Catheter-Related_Deep_Vein_Thrombosis.pdf",
    "CLOPIDOGREL": "Clopidogrel_(Plavix).pdf",
    "COMPARISONOFNEWORALANTICOAGULA": "DOACs_Comparison_And_Frequently-asked_Questions.pdf",
    "DABIGATRAN": "Dabigatran_(Pradaxa).pdf",
    "DEEPVEINTHROMBOSISDIAGNOSIS": "Deep_Vein_Thrombosis_(DVT)_Diagnosis.pdf",
    "DEEPVEINTHROMBOSISTREATMENT": "Deep_Vein_Thrombosis_(DVT)_Treatment.pdf",
    "DEFICIENCIESINPROTEINCPROTEINS": "Thrombophilia_Deficiencies_in_Protein_C_Protein_S_and_Antithrombin.pdf",
    "DURATIONOFANTICOAGULANTTHERAPY": "Venous_Thromboembolism_Duration_of_Treatment.pdf",
    "HEPARININDUCEDTHROMBOCYTOPENIA": "Heparin-Induced_Thrombocytopenia_(HIT).pdf",
    "MANAGEMENTOFBLEEDINGINPATIENTS": "DOACs_Management_of_Bleeding.pdf",
    "PERIOPERATIVEMANAGEMENTOFPATIE": "DOACs_Perioperative_Management.pdf",
    "PERIOPERATIVEMANAGEMENTOFPATIE_1": "Warfarin_Perioperative_Management.pdf",
    "PERIPHERALARTERIALDISEASE": "Peripheral_Arterial_Disease.pdf",
    "POINTOFCAREINRMONITORINGOFWARF": "Warfarin_Point-of-Care_INR_Monitoring.pdf",
    "PRASUGREL": "Prasugrel.pdf",
    "PULMONARYEMBOLISMDIAGNOSISANDM": "Pulmonary_Embolism_(PE)_Diagnosis.pdf",
    "RIVAROXABAN": "Rivaroxaban_(Xarelto).pdf",
    "STROKEPREVENTIONINATRIALFIBRIL": "Stroke_Prevention_in_Atrial_Fibrillation.pdf",
    "THROMBOLYTICTHERAPYINACUTEISCH": "Stroke_Thrombolysis_and_Endovascular_Therapy.pdf",
    "THROMBOPHILIAFACTORVLEIDENANDP": "Thrombophilia_Factor_V_Leiden_and_Prothrombin_Gene_Mutation.pdf",
    "THROMBOPHILIAHOMOCYSTEINEMIAAN": "Thrombophilia_Homocysteinemia_and_Methylene_Tetrahydrofolate_Reductase.pdf",
    "THROMBOPROPHYLAXISAFTERNONORTH": "Thromboprophylaxis_Non-Orthopedic_Surgery.pdf",
    "THROMBOPROPHYLAXISAFTERORTHOPE": "Thromboprophylaxis_Orthopedic_Surgery.pdf",
    "THROMBOPROPHYLAXISINHOSPITALIZ": "Thromboprophylaxis_Hospitalized_Medical_Patients.pdf",
    "THROMBOPROPHYLAXISINPREGNANCY": "Pregnancy_Thromboprophylaxis.pdf",
    "TICAGRELOR": "Ticagrelor_(Brilinta).pdf",
    "TREATMENTOFDEEPVEINTHROMBOSISP": "Deep_Vein_Thrombosis_(DVT)_Treatment.pdf",
    "UNFRACTIONATEDHEPARINANDLOWMOL": "Unfractionated_Heparin_Low_Molecular_Weight_Heparin_and_Fondaparinux.pdf",
    "USEANDINTERPRETATIONOFLABORATO": "DOACs_Coagulation_Tests.pdf",
    "VENACAVAFILTER": "Vena_Cava_Filter.pdf",
    "WARFARIN": "Warfarin.pdf",
}

NUMERIC_TARGET_TO_FILE = {
    "45": "Warfarin.pdf",
    "89": "DOACs_Comparison_And_Frequently-asked_Questions.pdf",
    "93": "Rivaroxaban_(Xarelto).pdf",
}

CALC_PARAM_TO_TOOL = {
    "perioperativeAnticoagulantAlgorithm": ("perioperative", "algorithms"),
    "anticoagulantDosingInAF": ("af-dosing", "algorithms"),
    "thrombophiliaTestingAlgorithm": ("thrombophilia", "algorithms"),
    "VITT": ("vitt", "algorithms"),
    "wellsPE": ("wells-pe", "scores"),
    "wellsDVT": ("wells-dvt", "scores"),
    "chads2": ("chads2", "scores"),
    "chads2v": ("cha2ds2-vasc", "scores"),
    "hasBled": ("has-bled", "scores"),
    "perc": ("perc", "scores"),
    "pesi": ("pesi", "scores"),
    "simplifiedPesi": ("spesi", "scores"),
    "timiUA": ("timi-ua", "scores"),
    "timiSTEMI": ("timi-stemi", "scores"),
    "khoranaRiskScore": ("khorana", "scores"),
    "creatinineClearance": ("creatinine-clearance", "scores"),
    "abcd2": ("abcd2", "scores"),
}


def draw_overlay(page_width: float, page_height: float, hit_boxes: list[dict[str, float]]) -> io.BytesIO:
    packet = io.BytesIO()
    pdf_canvas = canvas.Canvas(packet, pagesize=(page_width, page_height))
    pdf_canvas.setFillColor(colors.white)

    # Remove exported browser header/footer noise and reserve room where stray barcodes often appear.
    pdf_canvas.rect(0, page_height - TOP_MARGIN_POINTS, page_width, TOP_MARGIN_POINTS, fill=1, stroke=0)
    pdf_canvas.rect(0, 0, page_width, BOTTOM_MARGIN_POINTS, fill=1, stroke=0)
    pdf_canvas.rect(
        max(page_width - CORNER_BOX_WIDTH, 0),
        max(page_height - CORNER_BOX_HEIGHT, 0),
        CORNER_BOX_WIDTH,
        CORNER_BOX_HEIGHT,
        fill=1,
        stroke=0,
    )
    pdf_canvas.rect(
        max(page_width - CORNER_BOX_WIDTH, 0),
        0,
        CORNER_BOX_WIDTH,
        CORNER_BOX_HEIGHT - 16,
        fill=1,
        stroke=0,
    )

    for hit in hit_boxes:
        x0 = max(hit["x0"] - RECT_PADDING, 0)
        x1 = min(hit["x1"] + RECT_PADDING, page_width)
        y0 = max(page_height - hit["bottom"] - RECT_PADDING, 0)
        y1 = min(page_height - hit["top"] + RECT_PADDING, page_height)
        pdf_canvas.rect(x0, y0, max(x1 - x0, 0), max(y1 - y0, 0), fill=1, stroke=0)

    pdf_canvas.save()
    packet.seek(0)
    return packet


def build_pdf_route(file_name: str) -> str:
    stem = Path(file_name).stem
    return f"../?pdf={quote(stem)}#pdfs"


def rewrite_annotation_uri(uri: str) -> str | None:
    if not uri:
        return None

    if uri.startswith("javascript:openLinkedGuide('"):
        target = uri.split("javascript:openLinkedGuide('", 1)[1].split("')", 1)[0]
        file_name = GUIDE_TARGET_TO_FILE.get(target) or NUMERIC_TARGET_TO_FILE.get(target)
        if file_name:
            return build_pdf_route(file_name)
        return f"../?search={quote(target)}#guides"

    if uri.startswith("file:///"):
        parsed = urlparse(uri)
        query = parse_qs(parsed.query)
        calc_value = query.get("calc", [None])[0]
        guide_value = query.get("guideID", [None])[0]

        if calc_value and calc_value in CALC_PARAM_TO_TOOL:
            tool_id, page_id = CALC_PARAM_TO_TOOL[calc_value]
            return f"../?tool={quote(tool_id)}#{page_id}"

        if guide_value:
            file_name = NUMERIC_TARGET_TO_FILE.get(guide_value)
            if file_name:
                return build_pdf_route(file_name)
            return f"../?search={quote(guide_value)}#guides"

        if parsed.path.lower().endswith(".pdf"):
            return f"../?search={quote(Path(parsed.path).stem)}#pdfs"

        return "../#guides"

    return uri


def sanitize_pdf(pdf_path: Path) -> tuple[int, Path]:
    reader = PdfReader(str(pdf_path))
    writer = PdfWriter()
    redaction_count = 0

    with pdfplumber.open(str(pdf_path)) as plumber_doc:
        for page_index, page in enumerate(reader.pages):
            plumber_page = plumber_doc.pages[page_index]
            hit_boxes: list[dict[str, float]] = []

            annots = page.get("/Annots") or []
            for annot_ref in annots:
                annot = annot_ref.get_object()
                action = annot.get("/A")
                if not action or "/URI" not in action:
                    continue

                rewritten_uri = rewrite_annotation_uri(str(action.get("/URI")))
                if rewritten_uri:
                    action[NameObject("/URI")] = TextStringObject(rewritten_uri)

            for pattern in SEARCH_PATTERNS:
                for hit in plumber_page.search(pattern):
                    hit_boxes.append(
                        {
                            "x0": hit["x0"],
                            "x1": hit["x1"],
                            "top": hit["top"],
                            "bottom": hit["bottom"],
                        }
                    )

            overlay_stream = draw_overlay(
                float(page.mediabox.width),
                float(page.mediabox.height),
                hit_boxes,
            )
            overlay_pdf = PdfReader(overlay_stream)
            page.merge_page(overlay_pdf.pages[0])
            writer.add_page(page)
            redaction_count += len(hit_boxes)

    OUTPUT_DIR.mkdir(exist_ok=True)
    output_path = OUTPUT_DIR / pdf_path.name
    with output_path.open("wb") as file_handle:
        writer.write(file_handle)

    return redaction_count, output_path


def main() -> None:
    pdf_paths = sorted(
        path
        for path in ROOT.glob("*.pdf")
        if path.name not in {"Thumbs.db"}
    )

    if not pdf_paths:
        print("No PDF files found.")
        return

    total_hits = 0
    public_files: list[str] = []
    for pdf_path in pdf_paths:
        redactions, output_path = sanitize_pdf(pdf_path)
        total_hits += redactions
        PUBLIC_PDF_DIR.mkdir(parents=True, exist_ok=True)
        public_output_path = PUBLIC_PDF_DIR / pdf_path.name
        shutil.copy2(output_path, public_output_path)
        public_files.append(pdf_path.name)
        print(f"sanitized {pdf_path.name} -> {output_path.relative_to(ROOT)} ({redactions} masked hits)")

    INDEX_FILE.write_text(
        "export const pdfFiles = [\n"
        + "".join(f'  "{file_name}",\n' for file_name in public_files)
        + "];\n",
        encoding="utf-8",
    )

    print(f"Completed sanitization for {len(pdf_paths)} PDFs with {total_hits} masked branding hits.")


if __name__ == "__main__":
    main()
