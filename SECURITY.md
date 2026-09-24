# Security

## Supported versions

Report issues against the latest `main` / published `0.x` release.

## Reporting a vulnerability

Please open a **private** GitHub security advisory on this repository when available, or contact the maintainers privately. Do not file public issues for undisclosed vulnerabilities.

## Product notes

This package is intended for **local development only**. Host apps must keep the overlay gated (`DEV_INFO_OVERLAY=1`, development, not on hosted Preview/Production). Do not send secrets, tokens, cookies, or PII into `devInfo.*` payloads.
