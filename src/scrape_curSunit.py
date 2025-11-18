import csv
import json
import re
import time
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE = "https://obs.acibadem.edu.tr/oibs/bologna/"
ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "data" / "outputs"
RAW_DIR = ROOT / "data" / "raw_html"
OUT_DIR.mkdir(parents=True, exist_ok=True)
RAW_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; obs-scraper/1.0)",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
}

def clean_text(t: str) -> str:
    return " ".join((t or "").split())

def get_html(url: str, tag: str) -> str:
    r = requests.get(url, headers=HEADERS, timeout=30)
    if r.status_code != 200:
        raise RuntimeError(f"{tag} GET {r.status_code} for {url}")
    fname = re.sub(r"[^0-9a-zA-Z]+", "_", f"{tag}_{url.replace(BASE,'')}")
    (RAW_DIR / f"{fname}.html").write_text(r.text, encoding="utf-8")
    return r.text

def fetch_program_about(cur_sunit: str, lang="tr") -> dict:
    url = urljoin(BASE, f"progAbout.aspx?lang={lang}&curSunit={cur_sunit}")
    html = get_html(url, f"about_{cur_sunit}")
    soup = BeautifulSoup(html, "lxml")

    top_fields = {}
    for tr in soup.find_all("tr"):
        tds = tr.find_all("td")
        if len(tds) == 2:
            key = clean_text(tds[0].get_text(strip=True))
            val = clean_text(tds[1].get_text(" ", strip=True))
            if key and val:
                top_fields[key] = val

    head_of = top_fields.get("Bölüm Başkanı") or top_fields.get("Program Başkanı") or ""

    if not head_of:
        label_node = soup.find(
            string=lambda s: isinstance(s, str) and "bölüm başkanı" in s.lower()
        )
        if not label_node:
            label_node = soup.find(
                string=lambda s: isinstance(s, str) and "program başkanı" in s.lower()
            )

        if label_node:
            node = label_node.parent
            panel_div = None

            while node and node.name != "body":
                classes = node.get("class") or []
                if node.name == "div" and "panel" in classes and "panel-default" in classes:
                    panel_div = node
                    break
                node = node.parent

            if panel_div:
                td = panel_div.find("td")
                if td:
                    head_of = clean_text(td.get_text(" ", strip=True))

    about_norm = {
        "language": top_fields.get("Dili") or top_fields.get("Dil") or "",
        "duration_years": top_fields.get("Süresi (Yıl)") or "",
        "max_duration_years": top_fields.get("Azami Süresi (Yıl)") or "",
        "quota": top_fields.get("Kontenjanı") or "",
        "internship": top_fields.get("Staj Durumu") or "",
        "degree_title": top_fields.get("Mezuniyet Unvanı") or "",
        "osym_type": top_fields.get("ÖSYM Tipi") or "",
        "head_of_department": head_of or "",
    }

    return {"curSunit": cur_sunit, "source": url, "about": about_norm}

def fetch_program_outcomes(cur_sunit: str, lang="tr"):
    url = urljoin(BASE, f"progCourseMatrix.aspx?lang={lang}&curSunit={cur_sunit}")
    html = get_html(url, f"po_matrix_{cur_sunit}")
    return extract_po_codes_from_matrix(html)

def extract_po_codes_from_matrix(html: str):
    soup = BeautifulSoup(html, "lxml")
    po_codes = []

    for th in soup.find_all("th"):
        txt = clean_text(th.get_text(" ", strip=True))
        found = re.findall(r"\bP\d+\b", txt)
        po_codes.extend(found)

    if not po_codes:
        all_text = soup.get_text(" ")
        po_codes = re.findall(r"\bP\d+\b", all_text)

    unique = sorted({p for p in po_codes}, key=lambda x: int(x[1:]))
    return [{"code": p} for p in unique]


def parse_po_from_relation(html: str, allowed_codes=None):
    soup = BeautifulSoup(html, "lxml")
    results = []

    for table in soup.find_all("table"):
        header_cells = None
        for tr in table.find_all("tr"):
            cells = [clean_text(c.get_text(" ", strip=True)) for c in tr.find_all(["th", "td"])]
            lower = " ".join(cells).lower()
            if "ders kodu" in lower and "ders adı" in lower:
                header_cells = cells
                break
        if not header_cells:
            continue

        def find_idx(keyword):
            keyword = keyword.lower()
            for i, h in enumerate(header_cells):
                if keyword in h.lower():
                    return i
            return None

        idx_code = find_idx("ders kodu")
        idx_name = find_idx("ders adı")

        p_cols = []
        for i, h in enumerate(header_cells):
            h_clean = h.replace(" ", "")
            if len(h_clean) >= 2 and h_clean[0].upper() == "P" and h_clean[1].isdigit():
                p_cols.append((h_clean, i))

        if idx_code is None or idx_name is None or not p_cols:
            continue

        collecting = False
        for tr in table.find_all("tr"):
            tds = [clean_text(td.get_text(" ", strip=True)) for td in tr.find_all("td")]
            if not tds:
                continue

            if not collecting:
                tmp = [clean_text(c.get_text(" ", strip=True)) for c in tr.find_all(["th", "td"])]
                if [c.lower() for c in tmp] == [c.lower() for c in header_cells]:
                    collecting = True
                continue

            if len(tds) == 1 and "yarıyıl ders planı" in tds[0].lower():
                continue

            max_idx = max(idx_name, *(idx for _, idx in p_cols))
            if len(tds) <= max_idx:
                continue

            code = tds[idx_code]
            name = tds[idx_name]
            if not code or not name or code.lower() == "ders kodu":
                continue

            if allowed_codes is not None and code not in allowed_codes:
                continue

            row = {
                "course_code": code,
                "course_name": name,
            }

            for p_label, idx in p_cols:
                val = tds[idx] if idx < len(tds) else ""
                row[p_label] = val

            results.append(row)

    return results

def fetch_course_po_matrix(cur_sunit: str, lang="tr", allowed_codes=None):
    url = urljoin(BASE, f"progCourseMatrix.aspx?lang={lang}&curSunit={cur_sunit}")
    html = get_html(url, f"po_matrix_{cur_sunit}")
    return parse_po_from_relation(html, allowed_codes=allowed_codes)

def merge_courses_with_po(courses, po_rows):
    by_code = {c["code"]: c for c in courses}

    for row in po_rows:
        code = row.get("course_code")
        if not code:
            continue

        course = by_code.get(code)
        if not course:
            continue

        po_map = {k: v for k, v in row.items() if k.upper().startswith("P")}
        course["po_map"] = po_map

    return list(by_code.values())

def fetch_course_list(cur_sunit: str, lang="tr"):
    candidates = [
        f"progCourses.aspx?lang={lang}&curSunit={cur_sunit}",
        f"progCourseList.aspx?lang={lang}&curSunit={cur_sunit}",
        f"progCoursePlan.aspx?lang={lang}&curSunit={cur_sunit}",
    ]

    for rel in candidates:
        url = urljoin(BASE, rel)
        print(f"[OPEN] {cur_sunit}: {url}")
        try:
            html = get_html(url, f"courses_raw_{cur_sunit}")
        except RuntimeError as e:
            print(f"[WARN] {cur_sunit}: get_html hata -> {e}")
            continue

        lower = html.lower()
        if "ders kodu" not in lower and "course code" not in lower and "ders adı" not in lower:
            print(f"[INFO] {cur_sunit}: {rel} içinde ders tablosu yok gibi, devam ediyorum.")
            continue

        courses = parse_course_table(html)
        if courses:
            unique = []
            seen = set()
            for c in courses:
                key = (c.get("code"), c.get("name"))
                if key in seen:
                    continue
                seen.add(key)
                unique.append(c)
            return unique

    print(f"[WARN] {cur_sunit}: Hiçbir ders tablosu bulunamadı.")
    return []

def parse_course_table(html: str):
    soup = BeautifulSoup(html, "lxml")
    all_courses = []

    for table in soup.find_all("table"):
        header_cells = None
        header_tr = None

        for tr in table.find_all("tr"):
            cells = [clean_text(c.get_text(" ", strip=True)) for c in tr.find_all(["th", "td"])]
            lower = [c.lower() for c in cells]

            if any("ders kodu" in x for x in lower) and any(
                ("ders adı" in x) or ("dersin adı" in x) or ("course name" in x) for x in lower
            ):
                header_cells = lower
                header_tr = tr
                break

        if not header_cells:
            continue

        name_keys = {"ders adı", "dersin adı", "course name", "name"}
        code_keys = {"ders kodu", "kod", "course code", "code"}
        ects_keys = {"akts", "ects", "ects/akts"}
        term_keys = {"yarıyıl", "semester", "dönem"}
        status_keys = {"z/s", "zorunlu/seçmeli", "zorunlu / seçmeli", "status", "type"}

        def find_idx(keys):
            for i, h in enumerate(header_cells):
                for k in keys:
                    if k in h:
                        return i
            return None

        idx_code = find_idx(code_keys)
        idx_name = find_idx(name_keys)
        idx_ects = find_idx(ects_keys)
        idx_term = find_idx(term_keys)
        idx_status = find_idx(status_keys)

        if idx_code is None or idx_name is None:
            continue

        collecting = False
        current_term = ""

        for tr in table.find_all("tr"):
            cells = [clean_text(c.get_text(" ", strip=True)) for c in tr.find_all(["th", "td"])]
            if not cells:
                continue

            lower = [c.lower() for c in cells]
            row_text = " ".join(lower)

            if "yarıyıl" in row_text:
                m = re.search(r"\d+", row_text)
                if m:
                    current_term = m.group(0)
                else:
                    current_term = row_text
                continue

            if not collecting:
                if lower == header_cells:
                    collecting = True
                continue

            tds = [clean_text(td.get_text(" ", strip=True)) for td in tr.find_all("td")]
            if not tds:
                continue

            code = tds[idx_code] if idx_code is not None and idx_code < len(tds) else ""
            name = tds[idx_name] if idx_name is not None and idx_name < len(tds) else ""
            ects = tds[idx_ects] if idx_ects is not None and idx_ects < len(tds) else ""

            term = ""
            if idx_term is not None and idx_term < len(tds):
                term = tds[idx_term]
            elif current_term:
                term = current_term

            status = ""
            if idx_status is not None and idx_status < len(tds):
                status = tds[idx_status]

            if not code and not name:
                continue
            if code.lower() == "ders kodu":
                continue

            status_norm = status.lower()

            is_elective = (
                ("seçmeli" in status_norm)
                or ("elective" in status_norm)
                or status_norm in {"s", "e"}
            )

            if is_elective:
                continue

            all_courses.append({
                "term": term,
                "code": code,
                "name": name,
                "ects": ects,
                "status": status,
            })

    return all_courses


def build_department_bundle(cur_sunit: str, lang: str = "tr") -> dict:
    about = fetch_program_about(cur_sunit, lang=lang)

    courses = fetch_course_list(cur_sunit, lang=lang)

    compulsory_codes = {c["code"] for c in courses}

    po_matrix = fetch_course_po_matrix(
        cur_sunit,
        lang=lang,
        allowed_codes=compulsory_codes,
    )

    return {
        "curSunit": cur_sunit,
        "about": about["about"],
        "courses": courses,
        "course_program_matrix": po_matrix,
    }

def save_department_bundle(bundle: dict):
    cur = bundle["curSunit"]
    courses = bundle.get("courses", [])

    jpath = OUT_DIR / f"department_{cur}.json"
    jpath.write_text(
        json.dumps(bundle, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print("✅ Department JSON ->", jpath)

    cpath = OUT_DIR / f"courses_{cur}.csv"
    fieldnames = ["term", "code", "name", "ects", "status"]

    with cpath.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for row in courses:
            clean_row = {key: row.get(key, "") for key in fieldnames}
            writer.writerow(clean_row)

    print("✅ Courses CSV      ->", cpath)

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="OBS/Bologna bölüm scraper (tek bölüm JSON + ders CSV)"
    )
    parser.add_argument(
        "--dept",
        action="append",
        help="curSunit id (birden fazla kez yazabilirsin: --dept 6166 --dept 6170)",
    )
    parser.add_argument("--lang", default="tr", help="Sayfa dili (varsayılan: tr)")
    args = parser.parse_args()

    if not args.dept:
        print("Kullanım: python src/scrape_curSunit.py --dept 6166")
        raise SystemExit(1)

    ids = list(dict.fromkeys(args.dept))
    for cs in ids:
        try:
            bundle = build_department_bundle(cs, lang=args.lang)
            save_department_bundle(bundle)
            time.sleep(0.3)
        except Exception as e:
            print(f"[WARN] {cs}: {e}")
