import argparse
import base64
import json
import sys

try:
    import requests  # type: ignore
except Exception as e:
    print(json.dumps({"error": f"requests not available: {e}"}))
    sys.exit(1)

MONTHS_EN = [
    "january","february","march","april","may","june",
    "july","august","september","october","november","december"
]

def build_pdf_url(year: int, month: int) -> str:
    mi = month - 1
    nexti = (mi + 1) % 12
    label = f"{MONTHS_EN[mi]}-{MONTHS_EN[nexti]}-{year}-mwb/"
    return f"https://www.jw.org/en/library/jw-meeting-workbook/{label}?output=pdf"

def fetch_pdf(url: str) -> bytes:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/pdf,*/*",
        "Referer": "https://www.jw.org/",
        "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
    }
    last_err = None
    for i in range(3):
        try:
            r = requests.get(url, headers=headers, allow_redirects=True, timeout=30)
            r.raise_for_status()
            return r.content
        except Exception as e:
            last_err = e
    raise last_err or Exception("fetch_pdf failed")

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--url", default="")
    p.add_argument("--year", type=int, default=2025)
    p.add_argument("--month", type=int, default=11)
    args = p.parse_args()

    try:
        url = args.url or build_pdf_url(args.year, args.month)
        data = fetch_pdf(url)
        b64 = base64.b64encode(data).decode("ascii")
        print(json.dumps({"ok": True, "bytes": len(data), "base64": b64}))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))
        sys.exit(2)

if __name__ == "__main__":
    main()
