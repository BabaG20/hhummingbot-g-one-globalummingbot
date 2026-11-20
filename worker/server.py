#!/usr/bin/env python3
"""Authenticated, paper-only HTTP adapter for one Hummingbot installation."""
import hmac, json, math, os, re, subprocess, threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

PAPER_CONNECTORS = {"binance_paper_trade", "kucoin_paper_trade", "kraken_paper_trade", "gate_io_paper_trade"}
PAIR_RE = re.compile(r"^[A-Z0-9]{2,20}-[A-Z0-9]{2,20}$")
NAME_RE = re.compile(r"^[a-zA-Z0-9_-]{1,40}$")
MAX_BODY = 16 * 1024
OUTPUT_LIMIT = 12000
COMMAND_TIMEOUT = {"create": 120, "start": 45, "status": 20, "stop": 60}
STATE_PATH = Path(os.environ.get("WORKER_STATE_PATH", "/home/hummingbot/data/gone_worker_state.json"))
HBOT_BIN = os.environ.get("HBOT_BIN", "hbot")
API_TOKEN = os.environ.get("GONE_WORKER_TOKEN", "")
STATE_LOCK = threading.Lock()

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def validate_payload(data):
    if not isinstance(data, dict): raise ValueError("JSON object required.")
    name = data.get("name", "paper_bot")
    if not isinstance(name, str) or not NAME_RE.fullmatch(name): raise ValueError("Bot name may contain only letters, numbers, _ and - (max 40).")
    exchange = data.get("exchange")
    if not isinstance(exchange, str) or exchange not in PAPER_CONNECTORS: raise ValueError("Only approved Hummingbot paper-trade connectors are allowed.")
    pair = data.get("trading_pair")
    if not isinstance(pair, str) or not PAIR_RE.fullmatch(pair): raise ValueError("Trading pair must look like BTC-USDT.")
    amount = data.get("order_amount")
    bid = data.get("bid_spread")
    ask = data.get("ask_spread")
    refresh = data.get("order_refresh_time", 15)
    for key, value in (("order_amount", amount), ("bid_spread", bid), ("ask_spread", ask)):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(float(value)): raise ValueError(key + " must be a finite number.")
    if amount <= 0 or amount > 1000000: raise ValueError("order_amount must be greater than 0 and at most 1,000,000 base units.")
    if bid < 0 or ask < 0 or bid > 0.05 or ask > 0.05: raise ValueError("Spreads must be decimal fractions between 0 and 0.05 (5%).")
    if isinstance(refresh, bool) or not isinstance(refresh, int) or refresh < 1 or refresh > 86400: raise ValueError("order_refresh_time must be an integer from 1 to 86400 seconds.")
    return {"name": name, "exchange": exchange, "trading_pair": pair, "order_amount": float(amount), "bid_spread": float(bid), "ask_spread": float(ask), "order_refresh_time": refresh, "price_type": "mid"}

def run_hbot(args, action):
    if action not in COMMAND_TIMEOUT: raise ValueError("Unsupported Hummingbot operation.")
    try:
        result = subprocess.run([HBOT_BIN, *args], cwd=os.environ.get("HBOT_HOME", "/home/hummingbot"),
            stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, timeout=COMMAND_TIMEOUT[action], check=False, shell=False,
            env={**os.environ, "PYTHONUNBUFFERED": "1"})
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError("Hummingbot " + action + " timed out.") from exc
    except FileNotFoundError as exc:
        raise RuntimeError("Hummingbot CLI executable was not found in this worker.") from exc
    out = (result.stdout or "")[-OUTPUT_LIMIT:]
    err = (result.stderr or "")[-OUTPUT_LIMIT:]
    if result.returncode != 0:
        raise RuntimeError("Hummingbot " + action + " failed (exit " + str(result.returncode) + "): " + (err or out or "no output"))
    return {"exit_code": result.returncode, "stdout": out, "stderr": err}

def load_state():
    try: return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except FileNotFoundError: return None
    except (OSError, json.JSONDecodeError) as exc: raise RuntimeError("Worker state file is unreadable; manual inspection required.") from exc

def save_state(state):
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    temp = STATE_PATH.with_suffix(".tmp")
    temp.write_text(json.dumps(state, indent=2), encoding="utf-8")
    os.replace(temp, STATE_PATH)

class Handler(BaseHTTPRequestHandler):
    server_version = "GOneHummingbotWorker/0.1"
    def log_message(self, fmt, *args):
        # Avoid logging authorization headers or request bodies.
        print("%s - %s" % (self.client_address[0], fmt % args), flush=True)
    def send_json(self, code, payload):
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(code); self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw))); self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff"); self.end_headers(); self.wfile.write(raw)
    def authorized(self):
        supplied = self.headers.get("Authorization", "")
        expected = "Bearer " + API_TOKEN
        return bool(API_TOKEN) and hmac.compare_digest(supplied.encode(), expected.encode())
    def read_json(self):
        length = self.headers.get("Content-Length", "")
        if not length.isdigit() or int(length) < 1 or int(length) > MAX_BODY: raise ValueError("Invalid or oversized request body.")
        if self.headers.get("Content-Type", "").split(";")[0].strip().lower() != "application/json": raise ValueError("Content-Type must be application/json.")
        data = json.loads(self.rfile.read(int(length)))
        return data
    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health": return self.send_json(200, {"ok": True})
        if not self.authorized(): return self.send_json(401, {"error": "unauthorized"})
        if path == "/v1/status":
            try:
                result = run_hbot(["status", "--json"], "status")
                try: parsed = json.loads(result["stdout"])
                except json.JSONDecodeError: parsed = None
                return self.send_json(200, {"ok": True, "status": parsed, "raw": None if parsed is not None else result["stdout"]})
            except Exception as exc: return self.send_json(502, {"error": str(exc)})
        return self.send_json(404, {"error": "not_found"})
    def do_POST(self):
        if not self.authorized(): return self.send_json(401, {"error": "unauthorized"})
        path = urlparse(self.path).path
        try:
            if path == "/v1/bot/config":
                data = validate_payload(self.read_json())
                with STATE_LOCK:
                    if load_state() is not None: return self.send_json(409, {"error": "This worker already owns a bot config. Use a fresh dedicated worker for another bot."})
                    filename = "conf_gone_" + data["name"] + ".yml"
                    args = ["create", "simple_pmm", "--name", filename]
                    for key in ("exchange", "trading_pair", "order_amount", "bid_spread", "ask_spread", "order_refresh_time", "price_type"): args += ["--set", key + "=" + str(data[key])]
                    result = run_hbot(args, "create")
                    state = {"config": filename, "strategy": "simple_pmm", "paper_only": True, "exchange": data["exchange"], "trading_pair": data["trading_pair"], "created_at": now_iso()}
                    save_state(state)
                return self.send_json(201, {"ok": True, "bot": state, "result": result})
            if path == "/v1/bot/start":
                if self.headers.get("Content-Length", "0") not in ("", "0"): return self.send_json(400, {"error": "This endpoint does not accept a body."})
                with STATE_LOCK:
                    state = load_state()
                    if not state or state.get("paper_only") is not True: return self.send_json(409, {"error": "No worker-owned paper config exists. Create one first."})
                    result = run_hbot(["start", state["config"]], "start")
                return self.send_json(200, {"ok": True, "started_config": state["config"], "result": result})
            if path == "/v1/bot/stop":
                if self.headers.get("Content-Length", "0") not in ("", "0"): return self.send_json(400, {"error": "This endpoint does not accept a body."})
                with STATE_LOCK:
                    state = load_state()
                    if not state or state.get("paper_only") is not True: return self.send_json(409, {"error": "No worker-owned paper bot exists on this installation."})
                    result = run_hbot(["stop"], "stop")
                return self.send_json(200, {"ok": True, "result": result})
            return self.send_json(404, {"error": "not_found"})
        except ValueError as exc: return self.send_json(400, {"error": str(exc)})
        except RuntimeError as exc: return self.send_json(502, {"error": str(exc)})
        except Exception as exc: return self.send_json(500, {"error": "Worker internal error: " + str(exc)})

def main():
    if len(API_TOKEN) < 32: raise SystemExit("GONE_WORKER_TOKEN must be set to a random secret of at least 32 characters.")
    host = os.environ.get("WORKER_HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8080"))
    server = ThreadingHTTPServer((host, port), Handler)
    server.daemon_threads = True
    print("G One Global Hummingbot paper worker listening on %s:%s" % (host, port), flush=True)
    server.serve_forever()

if __name__ == "__main__": main()