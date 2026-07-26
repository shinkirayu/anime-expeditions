"""
ZeusX Auto-Lister -- modern GUI edition (CustomTkinter, black & white).

Manages up to 10 listings, each with its own fields and its own relist interval.
Attaches to a Chrome you started with --remote-debugging-port and logged into,
so it never logs in itself (reCAPTCHA / Google / Cloudflare stay happy).

RUN (or run the built .exe):
  1) Close all Chrome, then:
       & "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" `
           --remote-debugging-port=9222 --user-data-dir="C:\\Users\\Jay\\zeusx-chrome"
  2) Log in at zeusx.com in that Chrome. Leave it open.
  3) Launch this app, fill listings, Start.

BUILD .exe (on Windows):
  pip install playwright customtkinter pyinstaller
  python -m PyInstaller --noconfirm --onefile --windowed --collect-all playwright ^
      --collect-all customtkinter --name ZeusXAutoLister zeusx_lister_gui.py
"""

import os
import json
import time
import base64
import random
import threading
import mimetypes
import traceback
import tkinter as tk

import customtkinter as ctk
from tkinter import filedialog, messagebox

from playwright.sync_api import sync_playwright

# ---------------------------------------------------------------------------
# Files / constants
# ---------------------------------------------------------------------------

APP_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(APP_DIR, "zeusx_config.json")
STATE_FILE = os.path.join(APP_DIR, "zeusx_state.json")

API_BASE = "https://api.zeusx.com"
HOME_URL = "https://zeusx.com/"
PHOTO_TYPE = "OFFER_PHOTO"
DELETE_METHOD = "PUT"
DELETE_URL_TEMPLATE = API_BASE + "/v1/offer/{id}/cancel"
NUM_SLOTS = 10

# Known categories -> (service_category_id, service_category_base_id)
CATEGORIES = [
    ("In-game items", "2", "35"),
    ("Game services", "47", "327"),
]
CAT_LABELS = [c[0] for c in CATEGORIES] + ["Custom…"]

# Monochrome palette
BG = "#0e0e0e"
CARD = "#1a1a1a"
CARD2 = "#222222"
BORDER = "#2e2e2e"
TEXT = "#f4f4f4"
MUTED = "#9a9a9a"
ACCENT = "#ffffff"
OKCOL = "#e8e8e8"
ERRCOL = "#c96b6b"


def cat_label_for(cid, bid):
    for name, c, b in CATEGORIES:
        if str(cid) == c and str(bid) == b:
            return name
    return "Custom…"


def ids_for_label(label):
    for name, c, b in CATEGORIES:
        if name == label:
            return c, b
    return None


# ---------------------------------------------------------------------------
# Config model
# ---------------------------------------------------------------------------

def empty_listing():
    return {
        "enabled": False, "title": "", "image_path": "", "listed_price": "",
        "description": "<p></p>", "service_category_id": "", "service_category_base_id": "",
        "delivery_method": "COORDINATED", "attributes": [], "days": "", "hours": "",
        "quantity": "", "interval_min": "",
    }


def default_config():
    ls = [empty_listing() for _ in range(NUM_SLOTS)]
    ls[0].update({
        "title": "Example (game service)", "listed_price": "1", "description": "<p>example</p>",
        "service_category_id": "47", "service_category_base_id": "327",
        "attributes": [{"base_attribute_id": "84", "base_attribute_value": "2347"},
                       {"base_attribute_id": "83", "base_attribute_value": "2334"}],
    })
    ls[1].update({
        "title": "Example (in-game item)", "listed_price": "1", "description": "<p>example</p>",
        "service_category_id": "2", "service_category_base_id": "35",
        "attributes": [{"base_attribute_id": "7", "base_attribute_value": "60"}],
        "days": "0", "hours": "1",
    })
    return {
        "settings": {"cdp_url": "http://localhost:9222", "currency": "USD",
                     "default_interval_min": 60, "default_jitter_sec": 120, "dry_run": True},
        "listings": ls,
    }


def load_config():
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            cfg = json.load(f)
        cfg.setdefault("settings", default_config()["settings"])
        ls = cfg.setdefault("listings", [])
        while len(ls) < NUM_SLOTS:
            ls.append(empty_listing())
        return cfg
    except Exception:
        return default_config()


def save_config(cfg):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)
    except Exception as e:
        print("save_config:", e)


def load_state():
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_state(state):
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f)
    except Exception:
        pass


def build_offer(l):
    offer = {
        "service_category_id": str(l.get("service_category_id", "")), "tags": [],
        "delivery_method": l.get("delivery_method") or "COORDINATED", "is_account_linked": False,
        "uploaded_photos": [], "service_category_base_id": str(l.get("service_category_base_id", "")),
        "offer_base_attribute_value": l.get("attributes", []), "title": l.get("title", ""),
        "listed_price": str(l.get("listed_price", "")), "description": l.get("description") or "<p></p>",
        "agreeTerm": True, "quantity": None, "removing_photo_ids": [], "photos": [],
    }
    q = str(l.get("quantity", "")).strip()
    if q:
        try:
            qn = int(q)
        except ValueError:
            qn = 0
        if qn > 1:
            # ZeusX requires this flag before quantity can exceed 1
            offer["has_multiple_stock"] = True
            offer["quantity"] = qn
        # qn <= 1 -> leave quantity at default (single stock)
    days, hours = str(l.get("days", "")).strip(), str(l.get("hours", "")).strip()
    if days or hours:
        offer["days"] = int(days or 0)
        offer["hours"] = int(hours or 0)
    return offer


# ---------------------------------------------------------------------------
# Browser-side orchestrator
# ---------------------------------------------------------------------------

ORCHESTRATE_JS = r"""
async (cfg) => {
    const { apiBase, currency, fileName, photoType, imageB64, imageMime, hasImage,
            offer, token, dryRun, deleteOfferId, deleteMethod, deleteUrl, deleteBody } = cfg;
    const out = { stage: "start" };
    const allStrings = (v, acc) => {
        if (typeof v === "string") acc.push(v);
        else if (Array.isArray(v)) v.forEach(x => allStrings(x, acc));
        else if (v && typeof v === "object") Object.values(v).forEach(x => allStrings(x, acc));
        return acc;
    };
    try {
        if (!token) return { ...out, ok: false, error: "no captured token" };
        const H = { "content-type": "application/json", "accept": "application/json, text/plain, */*",
                    "zeusx-currency": currency, "authorization": "Bearer " + token };

        out.stage = "cancel-old";
        if (deleteOfferId && !dryRun) {
            try {
                const opts = { method: deleteMethod || "PUT", headers: H, credentials: "include" };
                if (deleteBody) opts.body = JSON.stringify(deleteBody);
                const d = await fetch(deleteUrl, opts);
                out.deleteStatus = d.status; out.deleteOk = d.ok;
            } catch (e) { out.deleteError = String(e); }
        }

        let photoId = null, photoUrl = null;
        if (hasImage) {
            out.stage = "request-upload-urls";
            let r = await fetch(apiBase + "/v1/upload/request-upload-urls", {
                method: "POST", headers: H, credentials: "include",
                body: JSON.stringify({ files: [{ file_name: fileName }], type: photoType }) });
            const upJson = await r.json().catch(() => null);
            if (!r.ok) return { ...out, ok: false, status: r.status, body: upJson };
            const s3url = allStrings(upJson, []).find(s => s.includes("amazonaws") || s.includes("X-Amz-"));
            if (!s3url) return { ...out, ok: false, error: "no S3 url", body: upJson };
            const m = s3url.match(/\/([^\/?]+\.[a-z0-9]+)\?/i);
            photoUrl = m ? m[1] : null;
            photoId = photoUrl ? photoUrl.replace(/\.[^.]+$/, "") : null;
            if (!photoId) return { ...out, ok: false, error: "no photo_id", body: upJson };
            out.stage = "s3-put";
            const bytes = Uint8Array.from(atob(imageB64), c => c.charCodeAt(0));
            const s3 = await fetch(s3url, { method: "PUT", body: bytes, headers: { "content-type": imageMime } });
            if (!s3.ok) return { ...out, ok: false, status: s3.status, error: "S3 upload failed" };
        }

        if (dryRun) return { ...out, ok: true, stage: "dry-run", photoId };

        out.stage = "create-offer";
        const offerPayload = JSON.parse(JSON.stringify(offer));
        offerPayload.uploaded_photos = hasImage ? [{ photo_id: photoId, photo_url: photoUrl, file_name: fileName }] : [];
        const c = await fetch(apiBase + "/v1/offer/create-offer", {
            method: "POST", headers: H, credentials: "include",
            body: JSON.stringify({ offer: offerPayload }) });
        const body = await c.json().catch(() => null);
        const pick = (o) => {
            if (!o || typeof o !== "object") return null;
            if (o.data && o.data.id !== undefined) return o.data.id;
            if (o.data && o.data.offer_id !== undefined) return o.data.offer_id;
            if (o.offer && o.offer.id !== undefined) return o.offer.id;
            if (o.id !== undefined) return o.id;
            if (o.offer_id !== undefined) return o.offer_id;
            return null;
        };
        return { ...out, ok: c.ok, status: c.status, stage: "create-offer", photoId, newOfferId: pick(body), body };
    } catch (e) { return { ...out, ok: false, error: String(e) }; }
}
"""


# ---------------------------------------------------------------------------
# Worker
# ---------------------------------------------------------------------------

class Worker(threading.Thread):
    def __init__(self, cfg, log_fn, stop_event, shared):
        super().__init__(daemon=True)
        self.cfg, self.log, self.stop_event, self.shared = cfg, log_fn, stop_event, shared
        self.captured = {"token": None}
        self.state = load_state()
        self.page = None
        s = cfg["settings"]
        self.currency = s.get("currency", "USD")
        self.dry_run = bool(s.get("dry_run", False))
        self.default_interval = int(s.get("default_interval_min", 60))
        self.default_jitter = int(s.get("default_jitter_sec", 120))
        self.cdp_url = s.get("cdp_url", "http://localhost:9222")

    def _on_request(self, req):
        try:
            if "api.zeusx.com" in req.url:
                auth = req.headers.get("authorization")
                if auth and auth.lower().startswith("bearer "):
                    self.captured["token"] = auth.split(" ", 1)[1]
        except Exception:
            pass

    def _attach(self, ctx):
        for pg in ctx.pages:
            pg.on("request", self._on_request)
        ctx.on("page", lambda pg: pg.on("request", self._on_request))

    def refresh_token(self, timeout=20):
        try:
            self.page.goto(HOME_URL, wait_until="domcontentloaded")
        except Exception:
            pass
        deadline = time.time() + timeout
        while time.time() < deadline and not self.captured["token"]:
            if self.stop_event.is_set():
                return None
            self.page.wait_for_timeout(500)
        return self.captured["token"]

    def interval_sec(self, l):
        iv = l.get("interval_min")
        return (int(iv) if str(iv).strip() else self.default_interval) * 60

    def do_listing(self, idx, l):
        title = l.get("title") or f"slot {idx+1}"
        has_image = bool(l.get("image_path"))
        image_b64, mime, file_name = "", "image/jpeg", ""
        if has_image:
            path = l["image_path"]
            try:
                with open(path, "rb") as f:
                    image_b64 = base64.b64encode(f.read()).decode("ascii")
            except FileNotFoundError:
                self.log(f"[{title}] image not found: {path}")
                return ("error", "image not found")
            mime = mimetypes.guess_type(path)[0] or "image/jpeg"
            file_name = os.path.basename(path)

        prev_id = self.state.get(str(idx))
        payload = {
            "apiBase": API_BASE, "currency": self.currency, "fileName": file_name,
            "photoType": PHOTO_TYPE, "imageB64": image_b64, "imageMime": mime,
            "hasImage": has_image, "offer": build_offer(l), "token": self.captured["token"],
            "dryRun": self.dry_run, "deleteOfferId": prev_id, "deleteMethod": DELETE_METHOD,
            "deleteUrl": DELETE_URL_TEMPLATE.format(id=prev_id) if prev_id else None, "deleteBody": None,
        }
        res = self.page.evaluate(ORCHESTRATE_JS, payload)
        if res.get("status") in (401, 403):
            self.log(f"[{title}] session expired -- refreshing & retrying")
            if self.refresh_token():
                payload["token"] = self.captured["token"]
                res = self.page.evaluate(ORCHESTRATE_JS, payload)

        if res.get("deleteStatus") is not None:
            self.log(f"[{title}] cancelled old {prev_id} (status {res['deleteStatus']})")

        if res.get("ok"):
            nid = res.get("newOfferId")
            if nid:
                self.state[str(idx)] = nid
                save_state(self.state)
            self.log(f"[{title}] OK [{res.get('stage')}] newOffer={nid}")
            return ("listed", f"newOffer={nid}")
        else:
            self.log(f"[{title}] FAIL at {res.get('stage')} status={res.get('status')} "
                     f"err={res.get('error')} body={res.get('body')}")
            return ("error", f"{res.get('stage')} {res.get('status') or res.get('error')}")

    def run(self):
        try:
            with sync_playwright() as p:
                try:
                    browser = p.chromium.connect_over_cdp(self.cdp_url)
                except Exception as e:
                    self.log(f"Couldn't connect to Chrome at {self.cdp_url}. Start it with "
                             f"--remote-debugging-port and log in first. ({e})")
                    return
                ctx = browser.contexts[0] if browser.contexts else browser.new_context()
                self._attach(ctx)
                self.page = ctx.pages[0] if ctx.pages else ctx.new_page()

                if not self.refresh_token():
                    self.log("Couldn't capture an auth token. Log in, then Start again.")
                    return
                self.log(f"Token captured. Running (DRY_RUN={self.dry_run}).")

                enabled = [(i, l) for i, l in enumerate(self.cfg["listings"]) if l.get("enabled")]
                if not enabled:
                    self.log("No listings enabled.")
                    return

                self.shared["running"] = True
                next_due = {}
                for n, (i, l) in enumerate(enabled):
                    next_due[i] = time.time() + n * 3
                    self.shared["slots"][i] = {
                        "title": l.get("title") or f"slot {i+1}", "state": "scheduled",
                        "next_due": next_due[i], "interval": self.interval_sec(l), "last": "",
                    }

                while not self.stop_event.is_set():
                    if self.stop_event.wait(1):
                        break
                    now = time.time()
                    due = [(i, l) for (i, l) in enabled if next_due[i] <= now]
                    if due:
                        self.refresh_token()
                        for i, l in due:
                            if self.stop_event.is_set():
                                break
                            self.shared["slots"][i]["state"] = "posting"
                            try:
                                outcome, msg = self.do_listing(i, l)
                            except Exception as e:
                                outcome, msg = "error", str(e)
                                self.log(f"[slot {i+1}] error: {e}")
                            iv = self.interval_sec(l)
                            next_due[i] = time.time() + max(30, iv + random.uniform(-self.default_jitter, self.default_jitter))
                            sl = self.shared["slots"][i]
                            sl["state"], sl["last"] = outcome, msg
                            sl["next_due"], sl["interval"] = next_due[i], iv
                            time.sleep(random.uniform(2, 5))
        except Exception:
            self.log("Worker crashed:\n" + traceback.format_exc())
        finally:
            self.shared["running"] = False
            for sl in self.shared["slots"].values():
                sl["state"] = "stopped"
            self.log("Stopped. Your Chrome stays open.")


# ---------------------------------------------------------------------------
# GUI helpers
# ---------------------------------------------------------------------------

def attrs_to_text(attrs):
    return ", ".join(f"{a.get('base_attribute_id')}={a.get('base_attribute_value')}" for a in attrs)


def text_to_attrs(text):
    out = []
    for part in text.split(","):
        part = part.strip()
        if part and "=" in part:
            k, v = part.split("=", 1)
            out.append({"base_attribute_id": k.strip(), "base_attribute_value": v.strip()})
    return out


def fmt_countdown(seconds):
    seconds = max(0, int(seconds))
    m, s = divmod(seconds, 60)
    h, m = divmod(m, 60)
    return f"{h:d}:{m:02d}:{s:02d}" if h else f"{m:d}:{s:02d}"


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("dark-blue")


class App(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("ZeusX Auto-Lister")
        self.geometry("940x700")
        self.configure(fg_color=BG)

        self.cfg = load_config()
        self.worker = None
        self.stop_event = None
        self.shared = {"running": False, "slots": {}}
        self.log_lines = []
        self.cur_idx = 0
        self._pulse_on = False

        self.f_title = ctk.CTkFont(size=20, weight="bold")
        self.f_h = ctk.CTkFont(size=14, weight="bold")
        self.f_n = ctk.CTkFont(size=13)
        self.f_mono = ctk.CTkFont(family="Consolas", size=12)

        self._build_header()
        self.tabs = ctk.CTkTabview(self, fg_color=CARD, segmented_button_fg_color=CARD,
                                   segmented_button_selected_color=ACCENT,
                                   segmented_button_selected_hover_color="#dddddd",
                                   text_color=TEXT, segmented_button_unselected_color=CARD)
        self.tabs.pack(fill="both", expand=True, padx=14, pady=(0, 10))
        for name in ("Listings", "Status", "Settings", "Log"):
            self.tabs.add(name)
        try:
            self.tabs._segmented_button.configure(text_color=TEXT)
        except Exception:
            pass

        self._build_listings(self.tabs.tab("Listings"))
        self._build_status(self.tabs.tab("Status"))
        self._build_settings(self.tabs.tab("Settings"))
        self._build_log(self.tabs.tab("Log"))

        self._select_slot(0)
        self.after(250, self._tick)
        self.protocol("WM_DELETE_WINDOW", self._on_close)

    # ----- header / controls -----
    def _build_header(self):
        bar = ctk.CTkFrame(self, fg_color=BG)
        bar.pack(fill="x", padx=14, pady=(14, 8))
        ctk.CTkLabel(bar, text="ZeusX  Auto-Lister", font=self.f_title, text_color=TEXT).pack(side="left")

        self.live_dot = ctk.CTkLabel(bar, text="●", text_color=MUTED, font=self.f_h)
        self.live_dot.pack(side="left", padx=(14, 4))
        self.live_lbl = ctk.CTkLabel(bar, text="Idle", text_color=MUTED, font=self.f_n)
        self.live_lbl.pack(side="left")

        self.stop_btn = ctk.CTkButton(bar, text="Stop", width=90, command=self._stop, state="disabled",
                                      fg_color=CARD2, hover_color="#333333", text_color=TEXT, border_width=1,
                                      border_color=BORDER)
        self.stop_btn.pack(side="right")
        self.start_btn = ctk.CTkButton(bar, text="Start", width=110, command=self._start,
                                       fg_color=ACCENT, hover_color="#dddddd", text_color="#000000")
        self.start_btn.pack(side="right", padx=8)

    # ----- Listings -----
    def _build_listings(self, parent):
        parent.configure(fg_color=CARD)
        left = ctk.CTkScrollableFrame(parent, width=240, fg_color=CARD, label_text="Slots",
                                      label_text_color=MUTED)
        left.pack(side="left", fill="y", padx=(10, 6), pady=10)
        self.slot_btns = []
        for i in range(NUM_SLOTS):
            b = ctk.CTkButton(left, text=f"{i+1}.  (empty)", anchor="w", height=34,
                              fg_color=CARD2, hover_color="#2c2c2c", text_color=TEXT,
                              command=lambda i=i: self._select_slot(i))
            b.pack(fill="x", pady=3)
            self.slot_btns.append(b)

        right = ctk.CTkScrollableFrame(parent, fg_color=CARD)
        right.pack(side="left", fill="both", expand=True, padx=(6, 10), pady=10)
        right.columnconfigure(1, weight=1)

        self.v = {k: tk.StringVar() for k in (
            "title", "image_path", "listed_price", "service_category_id",
            "service_category_base_id", "delivery_method", "attributes",
            "days", "hours", "quantity", "interval_min")}
        self.v_enabled = tk.BooleanVar()
        self.v_cat = tk.StringVar(value=CAT_LABELS[0])

        r = 0
        ctk.CTkSwitch(right, text="Enabled", variable=self.v_enabled, onvalue=True, offvalue=False,
                      progress_color=ACCENT, text_color=TEXT).grid(row=r, column=0, columnspan=3, sticky="w", pady=(4, 10), padx=6)
        r += 1

        def lbl(text, row):
            ctk.CTkLabel(right, text=text, text_color=MUTED, font=self.f_n).grid(row=row, column=0, sticky="e", padx=8, pady=5)

        def entry(key, row, width=260):
            e = ctk.CTkEntry(right, textvariable=self.v[key], width=width, fg_color=CARD2,
                             border_color=BORDER, text_color=TEXT)
            e.grid(row=row, column=1, columnspan=2, sticky="we", pady=5, padx=(0, 8))
            return e

        lbl("Title", r); entry("title", r); r += 1

        lbl("Category", r)
        self.cat_menu = ctk.CTkOptionMenu(right, variable=self.v_cat, values=CAT_LABELS,
                                          command=self._on_cat_change, fg_color=CARD2,
                                          button_color="#333333", button_hover_color="#3d3d3d", text_color=TEXT)
        self.cat_menu.grid(row=r, column=1, columnspan=2, sticky="w", pady=5); r += 1

        lbl("Category ID", r)
        self.cat_id_entry = entry("service_category_id", r, 120); r += 1
        lbl("Base ID", r)
        self.cat_base_entry = entry("service_category_base_id", r, 120); r += 1

        lbl("Image", r)
        ctk.CTkEntry(right, textvariable=self.v["image_path"], fg_color=CARD2, border_color=BORDER,
                     text_color=TEXT).grid(row=r, column=1, sticky="we", pady=5)
        ctk.CTkButton(right, text="Browse", width=80, command=self._browse, fg_color=CARD2,
                      hover_color="#333333", text_color=TEXT, border_width=1, border_color=BORDER
                      ).grid(row=r, column=2, sticky="w", padx=8); r += 1

        lbl("Price", r); entry("listed_price", r, 120); r += 1
        lbl("Attributes (id=value, …)", r); entry("attributes", r); r += 1
        lbl("Days (duration only)", r); entry("days", r, 100); r += 1
        lbl("Hours (duration only)", r); entry("hours", r, 100); r += 1
        lbl("Quantity (>1 = multi-stock)", r); entry("quantity", r, 100); r += 1
        lbl("Interval min (blank = default)", r); entry("interval_min", r, 100); r += 1
        lbl("Delivery method", r); entry("delivery_method", r, 200); r += 1

        lbl("Description", r)
        self.desc_text = ctk.CTkTextbox(right, height=80, fg_color=CARD2, border_color=BORDER,
                                        text_color=TEXT, border_width=1)
        self.desc_text.grid(row=r, column=1, columnspan=2, sticky="we", pady=5, padx=(0, 8)); r += 1

        btns = ctk.CTkFrame(right, fg_color=CARD)
        btns.grid(row=r, column=0, columnspan=3, sticky="w", pady=12, padx=6)
        ctk.CTkButton(btns, text="Apply to slot", command=self._apply_slot, fg_color=ACCENT,
                      hover_color="#dddddd", text_color="#000000").pack(side="left")
        ctk.CTkButton(btns, text="Clear slot", command=self._clear_slot, fg_color=CARD2,
                      hover_color="#333333", text_color=TEXT, border_width=1, border_color=BORDER
                      ).pack(side="left", padx=8)

    def _on_cat_change(self, label):
        if label == "Custom…":
            self.cat_id_entry.configure(state="normal")
            self.cat_base_entry.configure(state="normal")
        else:
            cid, bid = ids_for_label(label)
            self.v["service_category_id"].set(cid)
            self.v["service_category_base_id"].set(bid)
            self.cat_id_entry.configure(state="disabled")
            self.cat_base_entry.configure(state="disabled")

    def _refresh_slot_buttons(self):
        for i, b in enumerate(self.slot_btns):
            l = self.cfg["listings"][i]
            dot = "●" if l.get("enabled") else "○"
            name = l.get("title") or "(empty)"
            b.configure(text=f"{dot}  {i+1}.  {name}",
                        fg_color=(ACCENT if i == self.cur_idx else CARD2),
                        text_color=("#000000" if i == self.cur_idx else TEXT))

    def _select_slot(self, idx):
        self.cur_idx = idx
        l = self.cfg["listings"][idx]
        self.v_enabled.set(bool(l.get("enabled")))
        for k in self.v:
            self.v[k].set(str(l.get(k, "")))
        self.v["attributes"].set(attrs_to_text(l.get("attributes", [])))
        self.v_cat.set(cat_label_for(l.get("service_category_id"), l.get("service_category_base_id")))
        self._on_cat_change(self.v_cat.get())
        self.desc_text.delete("1.0", "end")
        self.desc_text.insert("1.0", l.get("description", ""))
        self._refresh_slot_buttons()

    def _collect_slot(self):
        l = empty_listing()
        l["enabled"] = self.v_enabled.get()
        for k in self.v:
            l[k] = self.v[k].get().strip()
        l["attributes"] = text_to_attrs(self.v["attributes"].get())
        l["description"] = self.desc_text.get("1.0", "end").strip()
        if not l["delivery_method"]:
            l["delivery_method"] = "COORDINATED"
        return l

    def _apply_slot(self):
        self.cfg["listings"][self.cur_idx] = self._collect_slot()
        save_config(self.cfg)
        self._refresh_slot_buttons()
        self._set_status(f"Saved slot {self.cur_idx+1}")

    def _clear_slot(self):
        self.cfg["listings"][self.cur_idx] = empty_listing()
        save_config(self.cfg)
        self._select_slot(self.cur_idx)

    def _browse(self):
        path = filedialog.askopenfilename(title="Choose image",
                                          filetypes=[("Images", "*.jpg *.jpeg *.png *.webp"), ("All files", "*.*")])
        if path:
            self.v["image_path"].set(path)

    # ----- Status -----
    def _build_status(self, parent):
        parent.configure(fg_color=CARD)
        head = ctk.CTkFrame(parent, fg_color=CARD)
        head.pack(fill="x", padx=12, pady=(12, 4))
        ctk.CTkLabel(head, text="Running slots", font=self.f_h, text_color=TEXT).pack(side="left")

        self.status_wrap = ctk.CTkScrollableFrame(parent, fg_color=CARD)
        self.status_wrap.pack(fill="both", expand=True, padx=12, pady=10)
        self.status_rows = {}
        for i in range(NUM_SLOTS):
            row = ctk.CTkFrame(self.status_wrap, fg_color=CARD2, corner_radius=10)
            row.pack(fill="x", pady=5)
            row.columnconfigure(1, weight=1)
            dot = ctk.CTkLabel(row, text="○", text_color=MUTED, font=self.f_h, width=20)
            dot.grid(row=0, column=0, rowspan=2, padx=(12, 6), pady=10)
            title = ctk.CTkLabel(row, text=f"Slot {i+1}", text_color=TEXT, font=self.f_n, anchor="w")
            title.grid(row=0, column=1, sticky="w", pady=(8, 0))
            state = ctk.CTkLabel(row, text="disabled", text_color=MUTED, font=self.f_n, anchor="w")
            state.grid(row=1, column=1, sticky="w", pady=(0, 8))
            count = ctk.CTkLabel(row, text="", text_color=TEXT, font=self.f_mono, width=90)
            count.grid(row=0, column=2, rowspan=2, padx=12)
            bar = ctk.CTkProgressBar(row, width=160, progress_color=ACCENT, fg_color="#333333")
            bar.set(0)
            bar.grid(row=0, column=3, rowspan=2, padx=(0, 14))
            self.status_rows[i] = {"frame": row, "dot": dot, "title": title,
                                   "state": state, "count": count, "bar": bar}

    def _refresh_status(self):
        now = time.time()
        for i in range(NUM_SLOTS):
            l = self.cfg["listings"][i]
            row = self.status_rows[i]
            sh = self.shared["slots"].get(i)
            row["title"].configure(text=l.get("title") or f"Slot {i+1}")
            if not sh:
                row["dot"].configure(text="○", text_color=MUTED)
                row["state"].configure(text="enabled, not running" if l.get("enabled") else "disabled", text_color=MUTED)
                row["count"].configure(text="")
                row["bar"].set(0)
                continue
            st = sh.get("state", "")
            if st == "posting":
                row["dot"].configure(text="●", text_color=ACCENT)
                row["state"].configure(text="posting…", text_color=TEXT)
                row["count"].configure(text="now")
                row["bar"].set(1)
            elif st in ("scheduled", "listed", "error"):
                listed = st != "error"
                row["dot"].configure(text="●", text_color=(OKCOL if listed else ERRCOL))
                label = "listed — relists in" if listed else "error — retries in"
                row["state"].configure(text=label, text_color=(MUTED if listed else ERRCOL))
                remaining = sh.get("next_due", now) - now
                row["count"].configure(text=fmt_countdown(remaining))
                iv = max(1, sh.get("interval", 1))
                row["bar"].set(min(1.0, max(0.0, 1 - remaining / iv)))
            elif st == "stopped":
                row["dot"].configure(text="○", text_color=MUTED)
                row["state"].configure(text="stopped", text_color=MUTED)
                row["count"].configure(text="")
                row["bar"].set(0)

    # ----- Settings -----
    def _build_settings(self, parent):
        parent.configure(fg_color=CARD)
        s = self.cfg["settings"]
        self.sv = {
            "cdp_url": tk.StringVar(value=s.get("cdp_url", "http://localhost:9222")),
            "currency": tk.StringVar(value=s.get("currency", "USD")),
            "default_interval_min": tk.StringVar(value=str(s.get("default_interval_min", 60))),
            "default_jitter_sec": tk.StringVar(value=str(s.get("default_jitter_sec", 120))),
        }
        self.sv_dry = tk.BooleanVar(value=bool(s.get("dry_run", True)))
        frm = ctk.CTkFrame(parent, fg_color=CARD)
        frm.pack(fill="x", padx=20, pady=20)
        frm.columnconfigure(1, weight=1)

        def srow(r, label, key, width=260):
            ctk.CTkLabel(frm, text=label, text_color=MUTED, font=self.f_n).grid(row=r, column=0, sticky="e", padx=10, pady=8)
            ctk.CTkEntry(frm, textvariable=self.sv[key], width=width, fg_color=CARD2,
                         border_color=BORDER, text_color=TEXT).grid(row=r, column=1, sticky="w", pady=8)

        srow(0, "Chrome debug URL", "cdp_url")
        srow(1, "Currency", "currency", 100)
        srow(2, "Default interval (minutes)", "default_interval_min", 100)
        srow(3, "Jitter (± seconds)", "default_jitter_sec", 100)
        ctk.CTkSwitch(frm, text="Dry run (upload + auth, but do NOT post or cancel)",
                      variable=self.sv_dry, onvalue=True, offvalue=False, progress_color=ACCENT,
                      text_color=TEXT).grid(row=4, column=0, columnspan=2, sticky="w", pady=12, padx=10)
        ctk.CTkButton(frm, text="Save settings", command=self._save_settings, fg_color=ACCENT,
                      hover_color="#dddddd", text_color="#000000").grid(row=5, column=0, sticky="w", padx=10, pady=8)
        ctk.CTkLabel(frm, text="A listing's own interval overrides this default. Leave it blank to use the default.",
                     text_color=MUTED, font=self.f_n, justify="left").grid(row=6, column=0, columnspan=2, sticky="w", padx=10, pady=(4, 0))

    def _save_settings(self):
        s = self.cfg["settings"]
        s["cdp_url"] = self.sv["cdp_url"].get().strip() or "http://localhost:9222"
        s["currency"] = self.sv["currency"].get().strip() or "USD"
        for key, default in (("default_interval_min", 60), ("default_jitter_sec", 120)):
            try:
                s[key] = int(self.sv[key].get())
            except ValueError:
                s[key] = default
        s["dry_run"] = self.sv_dry.get()
        save_config(self.cfg)
        self._set_status("Settings saved")

    # ----- Log -----
    def _build_log(self, parent):
        parent.configure(fg_color=CARD)
        self.log_box = ctk.CTkTextbox(parent, fg_color="#0c0c0c", text_color="#d8d8d8",
                                      font=self.f_mono, border_width=0)
        self.log_box.pack(fill="both", expand=True, padx=10, pady=10)
        self.log_box.configure(state="disabled")

    # ----- shared glue -----
    def log(self, msg):
        self.log_lines.append(time.strftime("%H:%M:%S  ") + str(msg))

    def _set_status(self, text):
        self.live_lbl.configure(text=text)

    def _tick(self):
        if self.log_lines:
            self.log_box.configure(state="normal")
            for line in self.log_lines:
                self.log_box.insert("end", line + "\n")
            self.log_lines.clear()
            self.log_box.see("end")
            self.log_box.configure(state="disabled")
        self._refresh_status()
        running = self.shared.get("running")
        if running:
            self._pulse_on = not self._pulse_on
            self.live_dot.configure(text_color=(ACCENT if self._pulse_on else "#555555"))
            self.live_lbl.configure(text="Running")
        else:
            self.live_dot.configure(text_color=MUTED)
        if self.worker and not self.worker.is_alive():
            self.start_btn.configure(state="normal")
            self.stop_btn.configure(state="disabled")
            if not self.shared.get("running"):
                self.live_lbl.configure(text="Stopped")
            self.worker = None
        self.after(500, self._tick)

    def _start(self):
        self._apply_slot()
        self._save_settings()
        if not any(l.get("enabled") for l in self.cfg["listings"]):
            messagebox.showwarning("Nothing enabled", "Enable at least one listing slot first.")
            return
        self.shared = {"running": False, "slots": {}}
        self.stop_event = threading.Event()
        self.worker = Worker(json.loads(json.dumps(self.cfg)), self.log, self.stop_event, self.shared)
        self.worker.start()
        self.start_btn.configure(state="disabled")
        self.stop_btn.configure(state="normal")
        self._set_status("Starting…")

    def _stop(self):
        if self.stop_event:
            self.stop_event.set()
        self.stop_btn.configure(state="disabled")
        self._set_status("Stopping…")

    def _on_close(self):
        if self.stop_event:
            self.stop_event.set()
        self.destroy()


if __name__ == "__main__":
    App().mainloop()