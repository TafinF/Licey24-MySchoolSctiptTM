// ============================================================
// ОКРАШИВАНИЕ ЯЧЕЕК
// ============================================================

/**
 * Окрашивает ячейку с оценкой за урок
 * @param {HTMLElement} cell - ячейка для окрашивания
 * @returns {string|null} Оценка или null, если ячейка пустая
 */
function colorGradeCell(cell) {
    if (!cell.hasChildNodes()) return null;

    const grade = cell.firstChild.textContent;
    const className = GRADE_CLASSES[grade];

    if (className) {
        cell.classList.add(className);
        return grade;
    }

    return null;
}

/**
 * Окрашивает ячейку с двойкой в цепочке двоек
 * @param {HTMLElement} cell - ячейка для окрашивания
 * @returns {string|null} '2' или null
 */
function colorBadGradeCell(cell) {
    if (!cell.hasChildNodes()) return null;

    const grade = cell.firstChild.textContent;

    if (grade === '2') {
        cell.classList.add('mscp-grade-bad');
        return grade;
    }

    return null;
}

/**
 * Окрашивает ячейку итоговой оценки
 * @param {HTMLElement} cell - ячейка для окрашивания
 * @param {string[]} allGrades - массив всех оценок в строке
 * @param {boolean} isWeNeed3Grades - нужно ли 3 оценки для аттестации
 * @returns {void}
 */
function colorFinalGradeCell(cell, allGrades, isWeNeed3Grades) {
    const requiredGrades = isWeNeed3Grades ? 3 : 5;

    if (requiredGrades > allGrades.length) {
        cell.classList.add('mscp-insufficient');
        return;
    }

    if (allGrades.at(-1) === '2') {
        cell.classList.add('mscp-insufficient');
        return;
    }

    if (!cell.hasChildNodes()) return;

    const grade = cell.firstChild.textContent;
    const className = GRADE_CLASSES.final[grade];

    if (className) {
        cell.classList.add(className);
    }
}
