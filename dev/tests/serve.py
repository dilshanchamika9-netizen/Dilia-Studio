"""Test servers for the site. Port 8765: plain files. Port 8766: same files with the real _headers (strict CSP etc., HSTS left out).
Run from anywhere: python3 dev/tests/serve.py  (keeps running)"""
import http.server, socketserver, os, pathlib, threading, functools
ROOT = pathlib.Path(__file__).resolve().parents[2]
H = [l.strip().split(': ', 1) for l in (ROOT / '_headers').read_text().splitlines() if l.startswith('  ')]
PREFIX = '/Dilia-Studio/'   # the live site lives under this path on GitHub Pages; the 404 page links to it absolutely
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, path):
        if path.startswith(PREFIX): path = '/' + path[len(PREFIX):]
        return super().translate_path(path)
    def send_error(self, code, message=None, explain=None):
        if code == 404 and (ROOT / '404.html').exists():   # like GitHub Pages: the site's own 404 page, status 404
            body = (ROOT / '404.html').read_bytes()
            self.send_response(404); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.send_header('Content-Length', str(len(body))); self.end_headers()
            if self.command != 'HEAD': self.wfile.write(body)
            return
        super().send_error(code, message, explain)
class Strict(Quiet):
    def end_headers(self):
        for k, v in H:
            if k != 'Strict-Transport-Security': self.send_header(k, v)
        super().end_headers()
socketserver.ThreadingTCPServer.allow_reuse_address = True
def serve(port, cls): socketserver.ThreadingTCPServer(('127.0.0.1', port), functools.partial(cls, directory=str(ROOT))).serve_forever()
threading.Thread(target=serve, args=(8765, Quiet), daemon=True).start()
serve(8766, Strict)
