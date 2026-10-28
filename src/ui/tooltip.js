// ============================================================
// TOOLTIP
// ============================================================

/** @type {HTMLElement|null} Текущий активный tooltip */
let activeTooltip = null;

/**
 * Создаёт HTML-элемент badge для оценки
 * @param {string} grade - оценка (2, 3, 4 или 5)
 * @returns {HTMLSpanElement} span элемент с цветным badge
 */
function createGradeBadge(grade) {
    const badge = document.createElement('span');
    badge.className = `mscp-grade-badge mscp-badge-${grade}`;
    badge.textContent = grade;
    return badge;
}

/**
 * Форматирует текст тултипа с цветными badge для оценок
 * @param {string} text - исходный текст (например: 'До "4": 5 или 3, 4')
 * @returns {DocumentFragment} фрагмент с HTML элементами
 */
function formatTooltipContent(text) {
    const fragment = document.createDocumentFragment();

    // Парсим формат: До "X": ... или N пятёрок
    const match = text.match(/До "(\d)": (.+)/);

    if (!match) {
        // Если формат не распознан, возвращаем как есть
        fragment.textContent = text;
        return fragment;
    }

    const targetGrade = match[1];
    const comboText = match[2];

    // "До "
    fragment.appendChild(document.createTextNode('До '));

    // Целевая оценка в badge
    fragment.appendChild(createGradeBadge(targetGrade));

    // ": "
    fragment.appendChild(document.createTextNode(': '));

    // Парсим комбинации
    // Форматы: "5", "4 или 3, 5", "2 пятёрки", "3, 4"
    if (comboText.includes('пятёр')) {
        // Формула "N пятёрок" → "[5] × N"
        const countMatch = comboText.match(/(\d+)\s*пятёр/);
        if (countMatch) {
            fragment.appendChild(createGradeBadge('5'));
            fragment.appendChild(document.createTextNode(' × ' + countMatch[1]));
        } else {
            fragment.appendChild(document.createTextNode(comboText));
        }
    } else {
        // Разбиваем по " или "
        const options = comboText.split(' или ');

        options.forEach((option, optIndex) => {
            if (optIndex > 0) {
                fragment.appendChild(document.createTextNode(' или '));
            }

            // Разбиваем по "," без пробела
            const grades = option.split(',');

            grades.forEach((grade, gradeIndex) => {
                if (gradeIndex > 0) {
                    fragment.appendChild(document.createTextNode(','));
                }
                fragment.appendChild(createGradeBadge(grade.trim()));
            });
        });
    }

    return fragment;
}

/**
 * Показывает tooltip при наведении на ячейку
 * @param {MouseEvent} event - событие наведения мыши
 * @returns {void}
 */
function showTooltip(event) {
    const cell = event.currentTarget;
    const tooltipText = cell.dataset.tooltipText;

    if (!tooltipText) return;

    if (activeTooltip) {
        activeTooltip.remove();
    }

    const tooltip = document.createElement('div');
    tooltip.className = 'mscp-tooltip-dynamic';
    tooltip.appendChild(formatTooltipContent(tooltipText));
    document.body.appendChild(tooltip);

    const rect = cell.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let left = rect.left + rect.width / 2;
    let top = rect.top - 8;

    const halfWidth = tooltipRect.width / 2;

    if (left - halfWidth < 10) {
        left = halfWidth + 10;
    } else if (left + halfWidth > window.innerWidth - 10) {
        left = window.innerWidth - halfWidth - 10;
    }

    if (top < tooltipRect.height + 10) {
        top = rect.bottom + 8;
        tooltip.classList.add('mscp-tooltip-below');
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;

    activeTooltip = tooltip;
}

/**
 * Скрывает tooltip при уходе мыши
 * @param {MouseEvent} event - событие ухода мыши
 * @returns {void}
 */
function hideTooltip(event) {
    if (activeTooltip) {
        activeTooltip.remove();
        activeTooltip = null;
    }
}
