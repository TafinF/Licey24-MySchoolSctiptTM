#!/usr/bin/env bash
# Собирает модули из src/ в один userscript для Tampermonkey.
#
#   ./build.sh          -> script.js        (релиз, его берёт Tampermonkey по ссылке из README)
#   ./build.sh --test   -> dist/script.test.js  (имя скрипта с пометкой "test", в git не попадает)
#
# Порядок модулей задаётся в src/modules.list, шапка userscript — в src/header.txt.
# Метки __VERSION__ и __NAME__ подставляются при сборке.
set -euo pipefail

cd "$(dirname "$0")"

NAME="My School Color Point"
OUT="script.js"

if [[ "${1:-}" == "--test" ]]; then
    NAME="$NAME - test"
    OUT="dist/script.test.js"
    mkdir -p dist
fi

VERSION="$(date +%Y-%m-%d_%H-%M-%S)"

{
    if [[ "$OUT" == "script.js" ]]; then
        cat src/header.txt
    else
        # Тестовая сборка не должна обновляться релизом, поэтому без @updateURL и @downloadURL
        grep -v -e '@updateURL' -e '@downloadURL' src/header.txt
    fi
    printf '\n(function () {\n'

    while IFS= read -r module; do
        module="${module%$'\r'}"
        [[ -z "$module" || "$module" == \#* ]] && continue
        [[ -f "src/$module" ]] || { echo "Нет файла src/$module (см. src/modules.list)" >&2; exit 1; }
        printf '\n'
        cat "src/$module"
        printf '\n'
    done < src/modules.list

    printf '\n})();\n'
} | sed -e "s/__NAME__/$NAME/" -e "s/__VERSION__/$VERSION/" > "$OUT"

echo "Собрано: $OUT (версия $VERSION, $(wc -l < "$OUT") строк)"
