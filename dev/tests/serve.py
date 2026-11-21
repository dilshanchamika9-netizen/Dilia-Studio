"""Test servers for the site. Port 8765: plain files. Port 8766: same files with the real _headers (strict CSP etc., HSTS left out).
Run from anywhere: python3 dev/tests/serve.py  (keeps running)"""
import http.server, socketserver, os, pathlib, threading, functools
ROOT = pathlib.Path(__file__).resolve().parents[2]
H = [l.strip().split(': ', 1) for l in (ROOT / '_headers').read_text().splitlines() if l.startswith('  ')]
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
class Strict(Quiet):
    def end_headers(self):
        for k, v in H:
            if k != 'Strict-Transport-Security': self.send_header(k, v)
        super().end_headers()
socketserver.ThreadingTCPServer.allow_reuse_address = True
def serve(port, cls): socketserver.ThreadingTCPServer(('127.0.0.1', port), functools.partial(cls, directory=str(ROOT))).serve_forever()
threading.Thread(target=serve, args=(8765, Quiet), daemon=True).start()
serve(8766, Strict)
