#!/bin/bash
# ============================================================================
# Скрипт сборки всех файлов в один Userscript для Tampermonkey
# ============================================================================
# Запуск: bash build.sh
# Результат: dist/myschool-color-point.user.js
# ============================================================================

# Создаём директорию для вывода
mkdir -p dist

# Генерируем версию в формате YYYY-MM-DD_HH-MM-SS
VERSION=$(date '+%Y-%m-%d_%H-%M-%S')
echo "📦 Версия: $VERSION"

# Создаём временный header
cat > /tmp/header.tmp << EOF
// ==UserScript==
// @name         My School Color Point
// @namespace    http://tampermonkey.net/
// @version      $VERSION
// @description  Окрашивает оценки в разные цвета в Моя Школа
// @author       Tafintsev Feodor taf.f11@ya.ru
// @match        https://authedu.mosreg.ru/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mosreg.ru
// @grant        none
// ==/UserScript==

EOF

# Подставляем версию в config.js и объединяем все файлы
cat /tmp/header.tmp \
    <(sed "s/%%VERSION%%/$VERSION/g" src/config.js) \
    src/coloring.js \
    src/ui.js \
    src/main.user.js \
    > dist/myschool-color-point.user.js

# Удаляем временные файлы
rm /tmp/header.tmp

echo "✅ Сборка завершена: dist/myschool-color-point.user.js"
echo "📄 Размер: $(wc -l < dist/myschool-color-point.user.js) строк"
