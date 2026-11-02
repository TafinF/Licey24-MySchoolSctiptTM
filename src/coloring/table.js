// ============================================================
// ОКРАШИВАНИЕ ТАБЛИЦЫ И ФОРМ КОНТРОЛЯ
// ============================================================

/**
 * Окрашивает всю таблицу журнала
 * - Определяет режим отображения (обычный или итоговые отметки)
 * - Очищает предыдущее окрашивание
 * - Применяет окрашивание к каждой строке
 * @param {HTMLTableSectionElement} tableBody - тело таблицы (tbody)
 * @returns {void}
 */
function colorizeTable(tableBody) {
    Utils.clearColoring(tableBody);

    const modeElement = document.querySelector(CONFIG.SELECTORS.MODAL_TRIGGER);
    const modeTitle = modeElement?.getAttribute('data-test-component');
    const isSummaryMode = modeTitle === 'JournalControlPanelView-journalResults';

    const colorizeRow = isSummaryMode ? colorizeSummaryRow : colorizeStandardRow;

    for (const row of tableBody.childNodes) {
        colorizeRow(row);
    }
}

/**
 * Подсвечивает запрещённые для изменения формы контроля в заголовке таблицы
 * - Находит все span элементы с указанным классом в thead
 * - Проверяет текст на соответствие запрещённым формам
 * - Применяет красный цвет к совпадениям
 * @returns {void}
 */
function highlightControlForms() {
    const selector = `thead span${CONFIG.CONTROL_FORMS.SPAN_CLASS}`;
    const spans = document.querySelectorAll(selector);

    spans.forEach(span => {
        const spanText = span.textContent.trim();

        if (CONFIG.CONTROL_FORMS.RESTRICTED.includes(spanText)) {
            span.style.color = COLORS.RESTRICTED_CONTROL;
            span.parentElement.style.background = COLORS.WARNING;
        }
    });
}
