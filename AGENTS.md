# Codex efficiency policy

- Use the configured everyday model and reasoning level for normal implementation work.
- Delegate deterministic checks such as linting, typechecking, builds, unit tests, console scans, file inventories, and basic smoke tests to `gpt-5.6-luna` with `low` reasoning.
- Use `gpt-5.6-terra` with `low` or `medium` reasoning for visual QA, accessibility review, interpreting failures, and targeted debugging.
- Reserve `gpt-5.6-sol` or `gpt-6-astra` for architecture, security-sensitive work, difficult cross-system debugging, or consequential implementation decisions.
- Do not use Fast mode when conserving quota.
- Keep verification proportional to risk and avoid rerunning unchanged checks without a concrete reason.
