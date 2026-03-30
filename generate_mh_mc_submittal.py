"""
Generate MH MC Single Plane IR Submittal Package PDF
Eagles Brothers Constructors — Houston, TX
Fixes: Ethan Alvarez, (346) 970-7093 cell, real EBC logo
"""
import os
from datetime import date
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

# ── Colors ──────────────────────────────────────────────────────────────
NAVY        = colors.HexColor("#0a1628")
NAVY_MID    = colors.HexColor("#1e2d46")
AMBER       = colors.HexColor("#e09422")
DARK_GRAY   = colors.HexColor("#3c3c3c")
MED_GRAY    = colors.HexColor("#787878")
LT_GRAY     = colors.HexColor("#c8c8c8")
XLT_GRAY    = colors.HexColor("#f0f0f2")
WHITE       = colors.white
GREEN       = colors.HexColor("#10b981")
RED         = colors.HexColor("#ef4444")
AMBER2      = colors.HexColor("#f59e0b")

STATUS_COLORS = {
    "approved":           (GREEN,  WHITE),
    "submitted":          (AMBER,  WHITE),
    "revise & resubmit":  (colors.HexColor("#f97316"), WHITE),
    "rejected":           (RED,    WHITE),
    "in progress":        (colors.HexColor("#3b82f6"), WHITE),
    "not started":        (colors.HexColor("#64748b"), WHITE),
    "distributed":        (colors.HexColor("#0ea5e9"), WHITE),
}

# ── Project / Company Data ───────────────────────────────────────────────
COMPANY = {
    "name":    "Eagles Brothers Constructors",
    "address": "Houston, TX",
    "phone":   "(346) 970-7093",            # ← cell (fixed)
    "email":   "abner@ebconstructors.com",
    "pm":      "Abner Aguilar",
}

PROJECT = {
    "name":    "MH MC Single Plane IR",
    "address": "921 Gessner Rd, Houston, TX 77024",
    "gc":      "O'Donnell/Snider",
}

GC_CONTACT = {
    "name":  "Ethan Alvarez",               # ← fixed (was Edgar)
    "phone": "",
    "email": "",
    "role":  "Project Manager",
}

TODAY = date.today().strftime("%B %d, %Y")

# ── Submittals ───────────────────────────────────────────────────────────
SUBMITTALS = [
    {
        "number": "MH7-001",
        "spec":   "09 22 16",
        "description": "ClarkDietrich 362S125-18 3-5/8\" Metal Stud — Product Data Sheet",
        "type":   "Product Data",
        "status": "submitted",
        "submitted": "2026-03-05",
        "returned":  "",
        "notes":  "18ga 70ksi. Submitted to O'Donnell/Snider for review.",
    },
    {
        "number": "MH7-002",
        "spec":   "09 22 16",
        "description": "ClarkDietrich 600S125-18 6\" Metal Stud — Product Data Sheet",
        "type":   "Product Data",
        "status": "submitted",
        "submitted": "2026-03-05",
        "returned":  "",
        "notes":  "18ga 70ksi. Submitted to O'Donnell/Snider for review.",
    },
    {
        "number": "MH7-003",
        "spec":   "09 29 00",
        "description": "USG Sheetrock Brand 5/8\" Type X Gypsum Board",
        "type":   "Product Data",
        "status": "submitted",
        "submitted": "2026-03-05",
        "returned":  "",
        "notes":  "",
    },
    {
        "number": "MH7-004",
        "spec":   "09 29 00",
        "description": "National Gypsum Gold Bond Fire-Shield 5/8\" Type X",
        "type":   "Product Data",
        "status": "submitted",
        "submitted": "2026-03-05",
        "returned":  "",
        "notes":  "Alternate to USG Type X submitted concurrently.",
    },
    {
        "number": "MH7-005",
        "spec":   "13 49 00",
        "description": "MarShield Lead-Lined Gypsum Board 5/8\" + 1/16\" Pb — Product Data",
        "type":   "Product Data",
        "status": "submitted",
        "submitted": "2026-03-07",
        "returned":  "",
        "notes":  "Lead-lined GWB for radiation shielding. ASTM C1396 compliant.",
    },
    {
        "number": "MH7-006",
        "spec":   "13 49 00",
        "description": "MarShield Lead Sheet 1/16\" (1.6mm) — Shielding Calculations",
        "type":   "Calculations",
        "status": "submitted",
        "submitted": "2026-03-07",
        "returned":  "",
        "notes":  "Radiation shielding calcs per physicist report. Stamped by EBC.",
    },
    {
        "number": "MH7-007",
        "spec":   "09 22 16",
        "description": "CEMCO TDS 3-5/8\" 20ga Metal Track — Product Data Sheet",
        "type":   "Product Data",
        "status": "submitted",
        "submitted": "2026-03-05",
        "returned":  "",
        "notes":  "",
    },
    {
        "number": "MH7-008",
        "spec":   "09 21 16",
        "description": "USG Durock Brand Cement Board 1/2\" — Product Data",
        "type":   "Product Data",
        "status": "submitted",
        "submitted": "2026-03-17",
        "returned":  "",
        "notes":  "Submitted to GC. Awaiting return.",
    },
    {
        "number": "MH7-009",
        "spec":   "09 91 00",
        "description": "USG Sheetrock All Purpose Joint Compound — Product Data",
        "type":   "Product Data",
        "status": "submitted",
        "submitted": "2026-03-05",
        "returned":  "",
        "notes":  "",
    },
    {
        "number": "MH7-010",
        "spec":   "08 11 13",
        "description": "Hollow Metal Door Frame 3-0x8-0 — Shop Drawings",
        "type":   "Shop Drawings",
        "status": "submitted",
        "submitted": "2026-03-10",
        "returned":  "",
        "notes":  "Lead-lined HM frame. Submitted to O'Donnell/Snider.",
    },
]

PW, PH = letter  # 612 x 792 pt
ML = MR = 18 * mm


def make_pdf(out_path, logo_path=None):
    from reportlab.pdfgen import canvas as pdfcanvas
    from reportlab.lib.utils import ImageReader
    import io

    c = pdfcanvas.Canvas(out_path, pagesize=letter)
    cw = PW - 2 * ML  # content width

    def draw_page1():
        # ── Navy header band ──────────────────────────────────────────
        c.setFillColor(NAVY)
        c.rect(0, PH - 44*mm, PW, 44*mm, fill=1, stroke=0)

        # Logo or company name text
        if logo_path and os.path.exists(logo_path):
            logo_h = 18 * mm
            logo_w = logo_h * (500 / 149)  # aspect 3.36:1
            try:
                c.drawImage(logo_path, ML, PH - 44*mm + 5*mm,
                            width=logo_w, height=logo_h,
                            mask="auto", preserveAspectRatio=True)
                # Tagline below logo
                c.setFillColor(colors.HexColor("#b4c3d7"))
                c.setFont("Helvetica", 7)
                c.drawString(ML, PH - 44*mm + 3.5*mm,
                             "DRYWALL  ·  FRAMING  ·  INTERIOR CONSTRUCTION")
            except Exception:
                _draw_header_text(c)
        else:
            _draw_header_text(c)

        # Right-side contact info
        right_x = PW - MR
        c.setFillColor(colors.HexColor("#c8d2e1"))
        c.setFont("Helvetica", 8)
        for i, txt in enumerate([
            COMPANY["pm"],
            COMPANY["email"],
            COMPANY["phone"],
            "Houston, TX",
        ]):
            c.drawRightString(right_x, PH - 13*mm - i * 6*mm, txt)

        # Amber accent stripe
        c.setFillColor(AMBER)
        c.rect(0, PH - 47.5*mm, PW, 3.5*mm, fill=1, stroke=0)

        # ── "SUBMITTAL PACKAGE" title band ───────────────────────────
        y = PH - 64*mm
        c.setFillColor(NAVY_MID)
        c.rect(ML, y, cw, 14*mm, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(ML + 5*mm, y + 4.5*mm, "SUBMITTAL PACKAGE")
        c.setFillColor(AMBER2)
        c.setFont("Helvetica", 8)
        c.drawRightString(PW - MR - 2*mm, y + 4.5*mm, TODAY)

        # ── Project Info Block ───────────────────────────────────────
        y -= 22 * mm
        rows = [
            ("Project",             PROJECT["name"]),
            ("Address",             PROJECT["address"]),
            ("General Contractor",  PROJECT["gc"]),
            ("GC Contact",          GC_CONTACT["name"]),
            ("GC Phone",            GC_CONTACT["phone"] or "—"),
            ("GC Email",            GC_CONTACT["email"] or "—"),
        ]
        lblw = 52 * mm
        rowh = 8 * mm
        for i, (lbl, val) in enumerate(rows):
            row_y = y - (i + 1) * rowh
            if i % 2 == 0:
                c.setFillColor(XLT_GRAY)
                c.rect(ML, row_y, cw, rowh, fill=1, stroke=0)
            c.setFillColor(NAVY_MID)
            c.setFont("Helvetica-Bold", 9)
            c.drawString(ML + 3*mm, row_y + 2.5*mm, lbl)
            c.setFillColor(DARK_GRAY)
            c.setFont("Helvetica", 9)
            c.drawString(ML + lblw, row_y + 2.5*mm, val)

        y -= (len(rows) + 1) * rowh + 2*mm

        # Amber separator
        c.setStrokeColor(AMBER)
        c.setLineWidth(1.5)
        c.line(ML, y, PW - MR, y)
        y -= 8 * mm

        # ── Subcontractor block ──────────────────────────────────────
        c.setFillColor(NAVY)
        c.rect(ML, y - 7*mm, cw, 7*mm, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(ML + 3*mm, y - 4.5*mm, "SUBMITTED BY")
        y -= 7*mm + 3*mm

        sub_rows = [
            ("Company",  COMPANY["name"]),
            ("Contact",  COMPANY["pm"]),
            ("Email",    COMPANY["email"]),
            ("Phone",    COMPANY["phone"]),
            ("Location", COMPANY["address"]),
        ]
        for i, (lbl, val) in enumerate(sub_rows):
            row_y = y - (i + 1) * rowh
            if i % 2 == 0:
                c.setFillColor(XLT_GRAY)
                c.rect(ML, row_y, cw, rowh, fill=1, stroke=0)
            c.setFillColor(NAVY_MID)
            c.setFont("Helvetica-Bold", 9)
            c.drawString(ML + 3*mm, row_y + 2.5*mm, lbl)
            c.setFillColor(DARK_GRAY)
            c.setFont("Helvetica", 9)
            c.drawString(ML + lblw, row_y + 2.5*mm, val)

        y -= (len(sub_rows) + 1) * rowh + 4*mm

        # ── Table of Contents ────────────────────────────────────────
        if y < 60 * mm:  # not enough room, start new page
            c.showPage()
            y = PH - 20*mm

        c.setFillColor(NAVY)
        c.rect(ML, y - 7*mm, cw, 7*mm, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(ML + 3*mm, y - 4.5*mm, "TABLE OF CONTENTS")
        y -= 7*mm + 3*mm

        # TOC header
        c.setFillColor(NAVY_MID)
        c.rect(ML, y - 6.5*mm, cw, 6.5*mm, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 8)
        for txt, x in [("#", 2), ("Spec", 10), ("Description", 28),
                       ("Type", 110), ("Status", 140)]:
            c.drawString(ML + x*mm, y - 4.5*mm, txt)
        y -= 6.5*mm

        toc_row_h = 6 * mm
        for i, s in enumerate(SUBMITTALS):
            if y - toc_row_h < 20*mm:
                draw_footer(c, "Cover Sheet")
                c.showPage()
                y = PH - 20*mm

            row_y = y - toc_row_h
            if i % 2 == 0:
                c.setFillColor(XLT_GRAY)
                c.rect(ML, row_y, cw, toc_row_h, fill=1, stroke=0)

            c.setFillColor(DARK_GRAY)
            c.setFont("Helvetica", 8)
            c.drawString(ML + 2*mm,   row_y + 1.5*mm, str(s["number"]))
            c.drawString(ML + 10*mm,  row_y + 1.5*mm, s["spec"])

            desc = s["description"]
            if len(desc) > 55:
                desc = desc[:52] + "..."
            c.drawString(ML + 28*mm, row_y + 1.5*mm, desc)
            c.drawString(ML + 110*mm, row_y + 1.5*mm, s["type"])

            # Status badge
            bg, fg = STATUS_COLORS.get(s["status"].lower(), (MED_GRAY, WHITE))
            st_label = s["status"].title()
            c.setFillColor(bg)
            c.roundRect(ML + 140*mm, row_y + 0.5*mm, 30*mm, 5*mm, 2, fill=1, stroke=0)
            c.setFillColor(fg)
            c.setFont("Helvetica-Bold", 7)
            c.drawCentredString(ML + 155*mm, row_y + 1.8*mm, st_label)

            y -= toc_row_h

        y -= 6*mm

        # ── Summary stats ────────────────────────────────────────────
        if y - 14*mm < 20*mm:
            draw_footer(c, "Cover Sheet")
            c.showPage()
            y = PH - 20*mm

        total    = len(SUBMITTALS)
        approved = sum(1 for s in SUBMITTALS if s["status"] == "approved")
        pending  = sum(1 for s in SUBMITTALS if s["status"] != "approved")
        action   = sum(1 for s in SUBMITTALS if s["status"] in ("revise & resubmit", "rejected"))

        c.setFillColor(XLT_GRAY)
        c.rect(ML, y - 14*mm, cw, 14*mm, fill=1, stroke=0)
        sy = y - 9*mm
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(NAVY_MID)
        c.drawString(ML + 5*mm,  sy, f"Total: {total}")
        c.setFillColor(GREEN)
        c.drawString(ML + 38*mm, sy, f"Approved: {approved}")
        c.setFillColor(colors.HexColor("#b46e00"))
        c.drawString(ML + 80*mm, sy, f"Pending: {pending}")
        if action:
            c.setFillColor(RED)
            c.drawString(ML + 120*mm, sy, f"Action Required: {action}")

        draw_footer(c, "Cover Sheet")

    def _draw_header_text(cv):
        cv.setFillColor(WHITE)
        cv.setFont("Helvetica-Bold", 20)
        cv.drawString(ML, PH - 15*mm, COMPANY["name"].upper())
        cv.setFillColor(colors.HexColor("#c8d2e1"))
        cv.setFont("Helvetica", 8)
        cv.drawString(ML, PH - 21*mm, "DRYWALL  ·  FRAMING  ·  INTERIOR CONSTRUCTION")

    def draw_footer(cv, label):
        page_num = cv.getPageNumber()
        cv.setFillColor(LT_GRAY)
        cv.setStrokeColor(LT_GRAY)
        cv.setLineWidth(0.5)
        cv.line(ML, 12*mm, PW - MR, 12*mm)
        cv.setFillColor(MED_GRAY)
        cv.setFont("Helvetica", 7)
        footer_text = (f"{COMPANY['name']}  |  {label}  |  "
                       f"Page {page_num}  |  Generated {TODAY}")
        cv.drawCentredString(PW / 2, 7*mm, footer_text)

    def draw_log_page():
        # Page header
        c.setFillColor(NAVY)
        c.rect(0, PH - 14*mm, PW, 14*mm, fill=1, stroke=0)
        c.setFillColor(AMBER)
        c.rect(0, PH - 16.5*mm, PW, 2.5*mm, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(ML, PH - 10*mm, f"SUBMITTAL LOG — {PROJECT['name']}")

        y = PH - 22*mm

        # Detail table header
        def draw_tbl_header(yy):
            c.setFillColor(NAVY_MID)
            c.rect(ML, yy - 7*mm, cw, 7*mm, fill=1, stroke=0)
            c.setFillColor(WHITE)
            c.setFont("Helvetica-Bold", 7.5)
            cols = {"num": 1, "spec": 9, "desc": 28, "type": 93,
                    "status": 119, "sub": 151, "ret": 170}
            for txt, col in [("#", "num"), ("Spec", "spec"), ("Description", "desc"),
                              ("Type", "type"), ("Status", "status"),
                              ("Submitted", "sub"), ("Returned", "ret")]:
                c.drawString(ML + cols[col]*mm, yy - 4.8*mm, txt)
            return yy - 7*mm

        y = draw_tbl_header(y)
        row_h = 10 * mm

        for i, s in enumerate(SUBMITTALS):
            if y - row_h < 22*mm:
                draw_footer(c, f"Submittal Log — page {c.getPageNumber()}")
                c.showPage()
                # Mini header
                c.setFillColor(NAVY)
                c.rect(0, PH - 10*mm, PW, 10*mm, fill=1, stroke=0)
                c.setFillColor(AMBER)
                c.rect(0, PH - 12*mm, PW, 2*mm, fill=1, stroke=0)
                c.setFillColor(WHITE)
                c.setFont("Helvetica-Bold", 9)
                c.drawString(ML, PH - 7.5*mm,
                             f"SUBMITTAL LOG (cont.) — {PROJECT['name']}")
                y = PH - 16*mm
                y = draw_tbl_header(y)

            row_y = y - row_h
            if i % 2 == 0:
                c.setFillColor(XLT_GRAY)
                c.rect(ML, row_y, cw, row_h, fill=1, stroke=0)

            c.setFont("Helvetica", 8)
            c.setFillColor(DARK_GRAY)
            cols = {"num": 1, "spec": 9, "desc": 28, "type": 93,
                    "status": 119, "sub": 151, "ret": 170}

            c.drawString(ML + cols["num"]*mm, row_y + 3*mm, str(s["number"]))
            c.drawString(ML + cols["spec"]*mm, row_y + 3*mm, s["spec"])

            desc = s["description"]
            if c.stringWidth(desc, "Helvetica", 8) > 60*mm:
                desc = desc[:43] + "..."
            c.drawString(ML + cols["desc"]*mm, row_y + 3*mm, desc)
            c.drawString(ML + cols["type"]*mm, row_y + 3*mm, s["type"])

            # Status badge
            bg, fg = STATUS_COLORS.get(s["status"].lower(), (MED_GRAY, WHITE))
            st_label = s["status"].title()
            c.setFillColor(bg)
            c.roundRect(ML + cols["status"]*mm, row_y + 1.5*mm, 26*mm, 6*mm, 1.5, fill=1, stroke=0)
            c.setFillColor(fg)
            c.setFont("Helvetica-Bold", 7)
            c.drawCentredString(ML + cols["status"]*mm + 13*mm, row_y + 3.2*mm, st_label)

            c.setFont("Helvetica", 8)
            c.setFillColor(DARK_GRAY)
            c.drawString(ML + cols["sub"]*mm, row_y + 3*mm, s["submitted"] or "—")
            c.drawString(ML + cols["ret"]*mm, row_y + 3*mm, s["returned"] or "—")

            y -= row_h

            # Notes row
            if s.get("notes"):
                note_h = 6 * mm
                c.setFillColor(colors.HexColor("#fafafa"))
                c.rect(ML, y - note_h, cw, note_h, fill=1, stroke=0)
                c.setFont("Helvetica-Oblique", 7)
                c.setFillColor(MED_GRAY)
                c.drawString(ML + 5*mm, y - note_h + 1.5*mm, "Notes: " + s["notes"])
                y -= note_h

            # Row separator
            c.setStrokeColor(LT_GRAY)
            c.setLineWidth(0.3)
            c.line(ML, y, PW - MR, y)

        draw_footer(c, f"Submittal Log — {len(SUBMITTALS)} items")

    # ── Generate pages ──────────────────────────────────────────────────
    draw_page1()
    c.showPage()
    draw_log_page()
    c.save()
    print(f"PDF saved: {out_path}")


if __name__ == "__main__":
    repo_dir = os.path.dirname(os.path.abspath(__file__))
    logo = os.path.join(repo_dir, "public", "logo-ebc-white.png")
    desktop = os.path.join(os.path.expanduser("~"), "Desktop")
    out_v2 = os.path.join(desktop, "MH_MC_Single_Plane_IR_Submittal_Package_v2.pdf")
    make_pdf(out_v2, logo_path=logo)
    print(f"Saved: {out_v2}")
