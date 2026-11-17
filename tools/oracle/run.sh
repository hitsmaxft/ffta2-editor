#!/usr/bin/env bash
# Regenerate the Java oracle payloads used by the TS byte-consistency tests.
#
# Requirements:
#   - JDK 25 (set JAVA_HOME or JAVA25_HOME)
#   - `mvn -DskipTests compile` has been run once
#   - data/extracted-original/files and data/extracted/files are present
#
# Outputs:
#   data/compare/oracle_full_pc.{idx,bin}                       container-only save
#   data/compare/oracle_acc_{pc.idx,pc.bin,arm9.bin,overlay11.bin}  full controller save
set -euo pipefail
cd "$(dirname "$0")/../.."

if [ -n "${JAVA25_HOME:-}" ]; then
  JAVA_HOME="$JAVA25_HOME"
elif [ -x "$HOME/Library/Java/JavaVirtualMachines/openjdk-25.jdk/Contents/Home/bin/java" ]; then
  JAVA_HOME="$HOME/Library/Java/JavaVirtualMachines/openjdk-25.jdk/Contents/Home"
else
  JAVA_HOME="${JAVA_HOME:-}"
fi
if [ -z "$JAVA_HOME" ] || [ ! -x "$JAVA_HOME/bin/java" ]; then
  echo "JDK 25 not found; set JAVA25_HOME" >&2
  exit 1
fi
JAVAC="$JAVA_HOME/bin/javac"
JAVA="$JAVA_HOME/bin/java"

JFX_JARS="$(find "$HOME/.m2/repository/org/openjfx" -path '*25.0.3*' -name '*.jar' | tr '\n' ':')"
CP="target/classes:${JFX_JARS}"

mkdir -p target/oracle data/compare
"$JAVAC" -cp "$CP" -d target/oracle tools/oracle/FullSaveOracle.java tools/oracle/AcceptanceOracle.java
"$JAVA" --enable-native-access=ALL-UNNAMED -cp "target/oracle:$CP" FullSaveOracle data/extracted-original/files data/compare
"$JAVA" --enable-native-access=ALL-UNNAMED -cp "target/oracle:$CP" AcceptanceOracle data/extracted/files data/compare

echo "Oracle payloads written to data/compare/"
