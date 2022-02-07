#!/usr/bin/env sh
#
#
set -u -e -o pipefail

mkdir -p tmp/spec

deno run \
  --allow-net=deno.land,raw.githubusercontent.com \
  --allow-read="./,tmp/spec" \
  --allow-write="tmp/spec" \
  spec/main.ts
