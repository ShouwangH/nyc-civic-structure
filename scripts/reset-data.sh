#!/bin/bash
set -euo pipefail

COMMIT=${1:-fullgraph}

git checkout "$COMMIT" -- data
