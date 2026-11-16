"""Start the local app with a Gemini credential held only in process memory."""

import getpass
import os
from pathlib import Path
import runpy
import socket
import sys
import warnings

from gemini_backend import GeminiBackend


def main():
    # Check the canonical listener before asking the user for a secret.
    try:
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 8766))
    except OSError:
        print("Port 8766 is already in use. Stop the existing preview, then run this command again.")
        return 1
    if not os.environ.get("GEMINI_API_KEY", "").strip():
        if not sys.stdin.isatty():
            print("Run in an interactive terminal for hidden key entry, or set GEMINI_API_KEY privately.")
            return 1
        try:
            # Refuse getpass's fallback to visibly echoing credentials.
            with warnings.catch_warnings():
                warnings.simplefilter("error", getpass.GetPassWarning)
                key = getpass.getpass("Gemini API key (hidden; not saved): ").strip()
        except (EOFError, KeyboardInterrupt, getpass.GetPassWarning):
            print("\nKey entry cancelled. No server started.")
            return 1
        if not key:
            print("No key supplied. No server started.")
            return 1
        os.environ["GEMINI_API_KEY"] = key
    try:
        GeminiBackend.from_environment()
    except ValueError as exc:
        print(str(exc))
        return 1
    os.environ["HOST"] = "127.0.0.1"
    os.environ["PORT"] = "8766"
    root = Path(__file__).resolve().parent
    print("Starting Pretium Labs on http://127.0.0.1:8766/index.html with local Gemini endpoints.")
    print("Chat text is sent to Google. The app does not save the key or conversations.")
    try:
        runpy.run_path(str(root / "server.py"), run_name="__main__")
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
