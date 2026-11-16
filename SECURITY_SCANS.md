# Security scans with limited usage

Use a Standard scan for an initial review and Review changes for later commits,
pull requests, or working-tree changes. Use Deep scan only when repeated
independent audits are wanted. Generate and verify patches one accepted finding
at a time after reviewing the evidence; another deep scan is not required.

## One-time setup for each developer

After cloning or pulling this repository, use Python 3.11 or newer from the
repository root (on macOS/Linux the command may be `python3`):

```sh
python scripts/configure-security-scans.py
python scripts/configure-security-scans.py --check
```

The installer reads the committed `codex-security.low-usage.toml` and installs
its limits into `~/.codex/codex-security/config.toml`. If `CODEX_HOME` is set, it
uses `$CODEX_HOME/codex-security/config.toml`. It preserves unrelated settings,
backs up an existing config before changing it, verifies the installed values,
and starts no scan. Restore an existing config by copying the printed `.bak`
file back to the printed config path with no concurrent config edits in progress.
If no config existed, remove the newly installed file to return to defaults.

The installed plugin also supports `CODEX_SECURITY_DEEP_SCAN_CONFIG_PATH` as an
explicit config-path override; the installer honors it when set in its environment.
Run setup in an environment matching the desktop app, especially when using
custom paths. The printed path must match the one the app uses.

**Committing or pulling the repository profile does not automatically install it.**
Each developer runs setup once, then reruns it after a shared-profile update.
These are per-user defaults for new deep scans of any repository on that machine.
They do not modify scans already running or configure standalone CLI project
YAML settings. The shared files contain no credentials or account data.

## Start a scan in the desktop plugin

1. Install the Codex Security plugin. Version 0.1.19+ supports the time limit;
   this setup was checked against installed version 0.1.32.
2. Complete the one-time setup above before starting a new deep scan.
3. Open Security > Scans > + Scan, select the intended checkout and scope, and
   leave Deep scan off for a Standard scan. Enable it only for repeated audits.
4. Click Start scan. A new deep scan resolves its runtime limits from the
   installed per-user TOML; the repository copy alone is not automatically read.

| Shared deep-scan setting | Value | Effect |
| --- | --- | --- |
| `workers` | 1 | One independent audit worker at a time |
| `subagents` | 0 | No subagents within each worker |
| `stop_after_no_new` | 2 | Stop after two consecutive completed audits add no findings |
| `max_discovery_runs` | 2 | At most two independent audit runs |
| `max_time_hours` | 1 | Limit worker execution to one hour |

These settings reduce potential usage; **they are not a hard token, credit, or
billing cap**. A scan can still exhaust an allowance. Aggregation and reporting
need additional time and usage. Lower limits can leave coverage incomplete or
miss findings; report those gaps explicitly. Standard scans, change reviews, and
patch generation do not use this `[deep_scan]` budget.

Run one scan at a time and retain usage for reporting and fixes. When the deep
scan's time limit expires, it stops unfinished workers and aggregates completed
results. Confirm finalization succeeded and `report.md` exists before calling a
scan complete. If interrupted, inspect the existing saved scan before starting
another: continue the same active scan when resumable; for a terminal failure,
retain the exact error and saved findings, distinguish pending candidates, and
report incomplete coverage. Do not treat missing findings as a clean audit.

## References

- [Official desktop deep-scan runtime settings](https://learn.chatgpt.com/docs/security/plugin/deep-scans#configure-deep-scan-runtime)
- [Official interruption and failure guidance](https://learn.chatgpt.com/docs/security/plugin/deep-scans#handle-an-interruption-or-failure)
- [Generate, review, apply, and verify a patch](https://learn.chatgpt.com/docs/security/plugin/fix-findings)
