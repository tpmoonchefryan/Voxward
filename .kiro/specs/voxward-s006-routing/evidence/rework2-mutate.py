#!/usr/bin/env python3
"""Mutation check: undo one part of the B3 fix at a time and count the failing tests of test/moderation-engine.

Usage: python3 mutate.py <apps/server dir> <scratch dir>
The fixed normalize.ts is restored at the end and compared with the copy taken at the start.
"""
import json
import os
import shutil
import subprocess
import sys

server, scratch = sys.argv[1], sys.argv[2]
target = os.path.join(server, "src/modules/moderation-engine/rules/normalize.ts")
backup = os.path.join(scratch, "normalize.mutation-backup.ts")
shutil.copy(target, backup)
original = open(backup, encoding="utf-8").read()
assert "const INVISIBLE" in original, "normalize.ts is not the fixed version"

mutations = {
    "M1 sound marks no longer attach to the kana before them": (r"\u309B\u309C\uFF9E\uFF9F]$/u;", r"]$/u;"),
    "M2 invisible characters are not removed before composition": (
        r"const INVISIBLE = /\p{Cf}|(?=\p{M})\p{Default_Ignorable_Code_Point}/gu;",
        r"const INVISIBLE = /(?!)/gu;",
    ),
    "M3 U+309B and U+309C are not mapped to combining marks": (
        r"const SPACING_SOUND_MARK = /[\u309B\u309C]/gu;",
        r"const SPACING_SOUND_MARK = /(?!)/gu;",
    ),
    "M4 only \\p{Cf} is removed (default-ignorable marks stay)": (
        r"/\p{Cf}|(?=\p{M})\p{Default_Ignorable_Code_Point}/gu",
        r"/\p{Cf}/gu",
    ),
    "M5 the source end of an attached character is not updated": ("      previous.srcEnd = end;\n", ""),
    "M6 only U+FF9E attaches, not U+FF9F": (r"\u309B\u309C\uFF9E\uFF9F]$/u;", r"\u309B\u309C\uFF9E]$/u;"),
}

out = os.path.join(scratch, "mutation.json")
try:
    for name, (old, new) in mutations.items():
        assert old in original, name
        with open(target, "w", encoding="utf-8") as handle:
            handle.write(original.replace(old, new, 1))
        subprocess.run(
            ["pnpm", "exec", "vitest", "run", "test/moderation-engine", "--reporter=json", f"--outputFile={out}"],
            cwd=server,
            capture_output=True,
            env={**os.environ, "CI": "1"},
        )
        report = json.load(open(out))
        per_file = {}
        for file in report["testResults"]:
            failed = sum(1 for test in file["assertionResults"] if test["status"] == "failed")
            if failed:
                per_file[file["name"].split("/")[-1]] = failed
        print(f"{name}: {report['numFailedTests']} of {report['numTotalTests']} fail {per_file}")
finally:
    shutil.copy(backup, target)
print("restored:", open(target, encoding="utf-8").read() == original)
