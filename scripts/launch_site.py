#!/usr/bin/env python3

from __future__ import annotations

import contextlib
import http.server
import os
import socket
import socketserver
import subprocess
import threading
import time
import webbrowser
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = ROOT / "dist"
DOCS_DIR = ROOT / "docs"
NODE_MODULES = ROOT / "node_modules"
VITE_BIN = ROOT / "node_modules" / "vite" / "bin" / "vite.js"
HOST = "127.0.0.1"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:
        return


class ReusableTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


def pick_port(start: int = 4173, stop: int = 4199) -> int:
    for port in range(start, stop + 1):
        with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
            sock.settimeout(0.2)
            if sock.connect_ex((HOST, port)) != 0:
                return port
    raise RuntimeError("No free local port found between 4173 and 4199.")


def wait_for_server(port: int, timeout: float = 5.0) -> bool:
    start_time = time.time()
    while time.time() - start_time < timeout:
        with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
            sock.settimeout(0.2)
            if sock.connect_ex((HOST, port)) == 0:
                return True
        time.sleep(0.1)
    return False


def try_launch_vite(port: int) -> subprocess.Popen[str] | None:
    if not NODE_MODULES.exists() or not VITE_BIN.exists():
        return None

    process = subprocess.Popen(
        [
            "node",
            str(VITE_BIN),
            "--host",
            HOST,
            "--port",
            str(port),
            "--strictPort",
        ],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    if wait_for_server(port, timeout=20.0):
        return process

    process.terminate()
    try:
        process.wait(timeout=5.0)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5.0)
    return None


def main() -> None:
    port = pick_port()
    vite_process = try_launch_vite(port)
    server = None
    site_dir = None

    if vite_process is None:
        site_dir = DIST_DIR if DIST_DIR.exists() else DOCS_DIR

        if not site_dir.exists():
            raise SystemExit(f"Built site not found: {site_dir}")

        handler = lambda *args, **kwargs: QuietHandler(*args, directory=str(site_dir), **kwargs)
        server = ReusableTCPServer((HOST, port), handler)

        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()

        if not wait_for_server(port):
            server.shutdown()
            raise SystemExit("The local web server did not start in time.")

    url = f"http://{HOST}:{port}/"
    print("")
    print("Blood Doctor CoagVision is now running.")
    print(f"Open: {url}")
    if vite_process is not None:
        print("Serving latest source via Vite dev server.")
    else:
        print(f"Serving files from: {site_dir}")
    print("")
    print("Keep this window open while you use the website.")
    print("Press Control+C when you want to stop the local server.")
    print("")

    opened = False
    if os.name == "posix" and Path("/usr/bin/open").exists():
        try:
            subprocess.Popen(["open", url], cwd=ROOT)
            opened = True
        except OSError:
            opened = False

    if not opened:
        webbrowser.open(url)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping local server...")
    finally:
        if server is not None:
            server.shutdown()
            server.server_close()
        if vite_process is not None:
            vite_process.terminate()
            try:
                vite_process.wait(timeout=5.0)
            except subprocess.TimeoutExpired:
                vite_process.kill()
                vite_process.wait(timeout=5.0)


if __name__ == "__main__":
    main()
