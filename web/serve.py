#!/usr/bin/env python3
"""Local launcher for the Rozo Bridge web version.

Serves this folder over http (required: wallets and the walletkit.js
bundle import don't work over file://), opens the browser, and **stops
by itself when you close the page**.

Usage:  ./serve.py        (or  python3 serve.py  [port])

Auto-stop: the page sends a heartbeat every 5 s + a beacon on close
(pagehide). The server shuts down ~5 s after the page actually closes, but
survives a refresh and tabs put in the background. Ctrl+C to stop manually.
"""
import http.server, socketserver, threading, time, os, sys, webbrowser, json

DIR   = os.path.dirname(os.path.abspath(__file__))
PAGE  = "rozo-bridge.html"
LOG   = os.path.join(DIR, "..", "data", "intent-log.jsonl")   # passive log of real S2B intents → repo/data/ (gitignored, persists on disk/NAS)
PORT  = int(sys.argv[1]) if len(sys.argv) > 1 else 8787
IDLE  = 120   # backstop: stops if no heartbeat for 120 s (crash/sleep)
BYE   = 5     # stops 5 s after a pagehide if no heartbeat comes back (= refresh cancels it)
BOOT  = 60    # stops if no page has connected within 60 s

# injected before </body> only when served by THIS launcher → the HTML stays clean
BEAT = (b"<script>(function(){var h=function(){fetch('/__hb',{cache:'no-store'})"
        b".catch(function(){})};h();setInterval(h,5000);addEventListener('pagehide',"
        b"function(){try{navigator.sendBeacon('/__bye','1')}catch(e){}});})();</script>")

state = {"last": time.time(), "armed": False, "bye": 0.0, "start": time.time()}
lock  = threading.Lock()

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=DIR, **k)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        super().end_headers()

    def _hb(self):
        with lock:
            state["last"] = time.time(); state["armed"] = True; state["bye"] = 0.0
        self.send_response(204); self.end_headers()

    def do_GET(self):
        if self.path.startswith("/__hb"): return self._hb()
        if self.path.startswith("/__bye"):
            with lock: state["bye"] = time.time()
            self.send_response(204); self.end_headers(); return
        if self.path.startswith("/__log"):   # returns the raw JSONL (the Dispersion tab parses it line by line); 404 if absent
            try:
                with open(LOG, "rb") as f: data = f.read()
            except OSError:
                self.send_response(404); self.end_headers(); return
            self.send_response(200)
            self.send_header("Content-Type", "application/x-ndjson; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers(); self.wfile.write(data); return
        # ponytail: block dotfiles/.bak from the static fallback — loopback-only, defense-in-depth
        base = os.path.basename(self.translate_path(self.path).rstrip("/"))
        if base.startswith(".") or base.endswith((".bak", "~")):
            self.send_response(404); self.end_headers(); return
        # inject the heartbeat into .html pages, serve the rest normally
        path = self.translate_path(self.path)
        if path.endswith(".html") and os.path.isfile(path):
            data = open(path, "rb").read()
            data = data.replace(b"</body>", BEAT + b"</body>", 1) if b"</body>" in data else data + BEAT
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers(); self.wfile.write(data); return
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith("/__bye"):
            with lock: state["bye"] = time.time()
            self.send_response(204); self.end_headers(); return
        if self.path.startswith("/__log"):   # append one validated JSON line; create data/ on demand
            origin = self.headers.get("Origin")   # cross-origin drive-by writes always carry Origin; same-origin fetches often don't
            if origin and origin not in (f"http://localhost:{PORT}", f"http://127.0.0.1:{PORT}"):
                self.send_response(403); self.end_headers(); return
            cl = self.headers.get("Content-Length")
            try:
                n = int(cl)
            except (TypeError, ValueError):
                n = -1
            if n < 0 or n > 8192:   # cap body size before reading it
                self.send_response(413); self.end_headers(); return
            body = self.rfile.read(n) if n > 0 else b""
            try:
                rec = json.loads(body)
            except Exception:
                self.send_response(400); self.end_headers(); return
            with lock:   # ThreadingTCPServer: serialize the append with the existing lock
                os.makedirs(os.path.dirname(LOG), exist_ok=True)
                with open(LOG, "a", encoding="utf-8") as f:
                    f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            self.send_response(204); self.end_headers(); return
        self.send_response(404); self.end_headers()

    def log_message(self, fmt, *args):  # silences heartbeats, keeps real requests
        try: line = fmt % args
        except Exception: line = " ".join(str(a) for a in args)
        if "/__hb" in line or "/__bye" in line: return
        sys.stderr.write("  " + line + "\n")

def watchdog():
    while True:
        time.sleep(1)
        now = time.time()
        with lock: s = dict(state)
        if not s["armed"]:
            if now - s["start"] > BOOT:
                print("\n⏹  No page open — stopping."); os._exit(0)
            continue
        if s["bye"] and now - s["bye"] > BYE and now - s["last"] > BYE:
            print("\n⏹  Page closed — stopping the server."); os._exit(0)
        if now - s["last"] > IDLE:
            print("\n⏹  Idle — stopping the server."); os._exit(0)

def main():
    global PORT
    for _ in range(20):  # port taken → try the next one
        try:
            httpd = socketserver.ThreadingTCPServer(("127.0.0.1", PORT), H)
            break
        except OSError:
            PORT += 1
    else:
        print("No free port available."); return
    url = f"http://localhost:{PORT}/{PAGE}"
    threading.Thread(target=watchdog, daemon=True).start()
    threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    print(f"▶  Rozo Bridge served at  {url}")
    print("   (stops by itself when the page closes · Ctrl+C to force)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n⏹  Manual stop.")

if __name__ == "__main__":
    main()
