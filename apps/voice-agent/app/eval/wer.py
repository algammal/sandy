"""Word Error Rate — standard Levenshtein edit distance over word sequences.
Small enough to write directly rather than add a dependency for it."""

from __future__ import annotations

import re


def _normalize(text: str) -> list[str]:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s']", "", text)
    return text.split()


def word_error_rate(reference: str, hypothesis: str) -> float:
    ref = _normalize(reference)
    hyp = _normalize(hypothesis)
    if not ref:
        return 0.0 if not hyp else 1.0

    # Standard DP edit distance (substitution/insertion/deletion all cost 1).
    dp = [[0] * (len(hyp) + 1) for _ in range(len(ref) + 1)]
    for i in range(len(ref) + 1):
        dp[i][0] = i
    for j in range(len(hyp) + 1):
        dp[0][j] = j
    for i in range(1, len(ref) + 1):
        for j in range(1, len(hyp) + 1):
            if ref[i - 1] == hyp[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])

    return dp[len(ref)][len(hyp)] / len(ref)
