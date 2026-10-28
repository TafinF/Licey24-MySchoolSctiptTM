// ============================================================
// ОБРАБОТКА ЖУРНАЛА: наблюдатель и перекраска
// ============================================================

/**
 * Основная функция обработки таблицы журнала
 * - Ожидает появления таблицы
 * - Обновляет состояние журнала
 * - Запускает окрашивание
 * - Подсвечивает запрещённые формы контроля
 * - Устанавливает наблюдателя за изменениями
 * @returns {void}
 */
function processJournalTable(force = false) {
    ensureTableObserver();

    const table = document.querySelector(CONFIG.SELECTORS.JOURNAL_TABLE);
    if (!table?.lastChild || !JournalState.watchElement) return;

    // Сайт постоянно меняет DOM (например, при наведении на ячейку),
    // перекрашиваем только если изменилось содержимое таблицы
    const signature = getTableSignature(table);
    if (!force && signature === lastTableSignature) return;

    try {
        JournalState.update(
            table.firstChild,
            JournalState.watchElement.textContent
        );

        colorizeTable(table.lastChild);
        highlightControlForms();
        lastTableSignature = signature;
    } catch (error) {
        // Таблица ещё не догрузилась — повторим при следующем изменении DOM
        console.error('Ошибка окрашивания таблицы:', error);
    }
}

/**
 * Возвращает снимок содержимого тела таблицы: число строк и весь текст
 * Меняется при загрузке данных, смене периода, выставлении и правке оценок
 * @param {HTMLTableElement} table - таблица журнала
 * @returns {string} Снимок содержимого
 */
function getTableSignature(table) {
    return `${table.lastChild.childNodes.length}|${table.lastChild.textContent}`;
}

/**
 * Откладывает перекраску до следующего кадра
 * Много изменений DOM подряд приводят к одной перекраске
 * @returns {void}
 */
function scheduleRecolor() {
    if (recolorFrame) return;

    recolorFrame = requestAnimationFrame(() => {
        recolorFrame = 0;
        processJournalTable();
    });
}

/**
 * Подключает наблюдателя к <main>, если он ещё не подключён к текущему элементу
 * Следит за появлением узлов и за заменой текста в ячейках
 * @returns {void}
 */
function ensureTableObserver() {
    const mainSection = document.querySelector(CONFIG.SELECTORS.MAIN_SECTION);
    if (!mainSection || mainSection === observedMain) return;

    tableObserver?.disconnect();
    observedMain = mainSection;
    tableObserver = new MutationObserver(scheduleRecolor);
    tableObserver.observe(mainSection, { childList: true, subtree: true, characterData: true });
}
