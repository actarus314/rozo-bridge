#!/usr/bin/env python3
"""Lanceur local de la version web du Rozo Bridge.

Sert ce dossier en http (obligatoire : les wallets et l'import du bundle
walletkit.js ne marchent pas en file://), ouvre le navigateur, et **s'arrête
tout seul quand tu fermes la page**.

Usage :  ./serve.py        (ou  python3 serve.py  [port])

Arrêt auto : la page envoie un battement toutes les 5 s + un beacon à la
fermeture (pagehide). Le serveur coupe ~5 s après la fermeture réelle, mais
survit à un refresh et aux onglets mis en arrière-plan. Ctrl+C pour couper à la main.
"""
import http.server, socketserver, threading, time, os, sys, webbrowser

DIR   = os.path.dirname(os.path.abspath(__file__))
PAGE  = "rozo-bridge.html"
PORT  = int(sys.argv[1]) if len(sys.argv) > 1 else 8787
IDLE  = 120   # backstop : coupe si aucun battement depuis 120 s (crash/veille)
BYE   = 5     # coupe 5 s après un pagehide si aucun battement ne revient (= refresh annule)
BOOT  = 60    # coupe si aucune page ne s'est connectée dans les 60 s

# injecté avant </body> uniquement quand servi par CE lanceur → le HTML reste propre
BEAT = (b"<script>(function(){var h=function(){fetch('/__hb',{cache:'no-store'})"
        b".catch(function(){})};h();setInterval(h,5000);addEventListener('pagehide',"
        b"function(){try{navigator.sendBeacon('/__bye','1')}catch(e){}});})();</script>")

state = {"last": time.time(), "armed": False, "bye": 0.0, "start": time.time()}
lock  = threading.Lock()

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=DIR, **k)

    def _hb(self):
        with lock:
            state["last"] = time.time(); state["armed"] = True; state["bye"] = 0.0
        self.send_response(204); self.end_headers()

    def do_GET(self):
        if self.path.startswith("/__hb"): return self._hb()
        if self.path.startswith("/__bye"):
            with lock: state["bye"] = time.time()
            self.send_response(204); self.end_headers(); return
        # injecter le heartbeat dans les pages .html, servir le reste normalement
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
        self.send_response(404); self.end_headers()

    def log_message(self, fmt, *args):  # silence les battements, garde les vraies requêtes
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
                print("\n⏹  Aucune page ouverte — arrêt."); os._exit(0)
            continue
        if s["bye"] and now - s["bye"] > BYE and now - s["last"] > BYE:
            print("\n⏹  Page fermée — arrêt du serveur."); os._exit(0)
        if now - s["last"] > IDLE:
            print("\n⏹  Inactif — arrêt du serveur."); os._exit(0)

def main():
    global PORT
    for _ in range(20):  # port occupé → essaie le suivant
        try:
            httpd = socketserver.ThreadingTCPServer(("127.0.0.1", PORT), H)
            break
        except OSError:
            PORT += 1
    else:
        print("Aucun port libre."); return
    url = f"http://localhost:{PORT}/{PAGE}"
    threading.Thread(target=watchdog, daemon=True).start()
    threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    print(f"▶  Rozo Bridge servi sur  {url}")
    print("   (s'arrête seul à la fermeture de la page · Ctrl+C pour forcer)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n⏹  Arrêt manuel.")

if __name__ == "__main__":
    main()
