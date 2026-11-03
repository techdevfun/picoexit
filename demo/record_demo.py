#!/usr/bin/env python3
"""Record a REAL picoexit demo session inside `script` (util-linux).

Everything the terminal shows is produced by actually running the
commands; this driver only types them slowly, like a human.
"""
import os
import pty
import random
import select
import struct
import subprocess
import termios
import time
import fcntl

BASE = os.path.expanduser("~/workspace/github-repo-factory/picoexit-build/demo")
BUILD = os.path.expanduser("~/workspace/github-repo-factory/picoexit-build")
ROWS, COLS = 34, 96
TYPESCRIPT = os.path.join(BASE, "typescript.raw")
TIMING = os.path.join(BASE, "timing.raw")

COMMANDS = [
    ("node dist/src/cli.js audit fixtures/sample-site", 0.8, 2.5),
    ('echo "exit code: $?"', 0.8, 1.2),
    ("node dist/src/cli.js migrate fixtures/sample-site --to tailwind --dry-run | head -32", 0.8, 2.5),
    ("exit", 0.8, 0.0),
]


def main():
    for f in (TYPESCRIPT, TIMING):
        if os.path.exists(f):
            os.unlink(f)
    master, slave = pty.openpty()
    winsz = struct.pack("HHHH", ROWS, COLS, 0, 0)
    fcntl.ioctl(slave, termios.TIOCSWINSZ, winsz)
    env = dict(os.environ)
    env["TERM"] = "xterm-256color"
    proc = subprocess.Popen(
        ["script", "-q", "-T", TIMING, "-c",
         "bash --rcfile " + os.path.join(BASE, "demo-bashrc") + " -i",
         TYPESCRIPT],
        stdin=slave, stdout=slave, stderr=slave, env=env, cwd=BUILD,
        close_fds=True,
    )
    os.close(slave)

    def drain(timeout=0.05):
        end = time.time() + timeout
        while time.time() < end:
            r, _, _ = select.select([master], [], [],
                                    max(0.0, end - time.time()))
            if not r:
                break
            try:
                data = os.read(master, 65536)
            except OSError:
                return False
            if not data:
                return False
        return True

    drain(1.0)  # let the first prompt appear
    rng = random.Random(20261103)
    for cmd, pre_delay, post_delay in COMMANDS:
        time.sleep(pre_delay)
        for ch in cmd:
            os.write(master, ch.encode())
            drain(0.001)
            time.sleep(rng.uniform(0.018, 0.045))
        os.write(master, b"\n")
        drain(0.05)
        quiet_deadline = time.time() + post_delay + 4.0
        while time.time() < quiet_deadline:
            alive = drain(0.15)
            if not alive:
                break
            try:
                mtime = os.stat(TYPESCRIPT).st_mtime
            except OSError:
                mtime = time.time()
            if time.time() - mtime > post_delay:
                break
    drain(1.0)
    try:
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        proc.kill()
    print("script exit:", proc.returncode)
    print("typescript bytes:", os.path.getsize(TYPESCRIPT))
    print("timing bytes:", os.path.getsize(TIMING))


if __name__ == "__main__":
    main()
