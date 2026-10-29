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
    shortenJournalTitle();

    const table = document.querySelector(CONFIG.SELECTORS.JOURNAL_TABLE);
    if (!table?.lastChild || !JournalState.watchElement) return;

    // Сайт постоянно меняет DOM (например, при наведении на ячейку),
    // перекрашиваем только если изменилось содержимое таблицы
    const signature = getTableSignature(table);
    if (!force && signature === lastTableSignature) {
        StudentPicker.applyHighlight();
        return;
    }

    try {
        JournalState.update(
            table.firstChild,
            JournalState.watchElement.textContent
        );

        colorizeTable(table.lastChild);
        highlightControlForms();
        StudentPicker.applyHighlight();
        lastTableSignature = signature;
    } catch (error) {
        // Таблица ещё не догрузилась — повторим при следующем изменении DOM
        console.error('Ошибка окрашивания таблицы:', error);
    }
}

/**
 * Короткое название журнала: без слова "Журнал" в начале и всего, что идёт после класса
 * "Журнал Физика 11-А 11А нем.яз. 26/27" → "Физика 11-А"
 * Если до класса предмета нет (название вида "11-А Физика") или класс не найден, название не меняется
 * @param {string} title - название журнала с сайта
 * @returns {string} короткое название
 */
function shortJournalTitle(title) {
    const withoutWord = title.replace(/^\s*Журнал\s+/iu, '');
    const classMatch = /(?:^|\s)(\d{1,2}\s*-\s*[А-ЯЁA-Z])(?=\s|$)/iu.exec(withoutWord);
    if (!classMatch) return title;

    const subject = withoutWord.slice(0, classMatch.index).trim();
    return subject ? `${subject} ${classMatch[1].replace(/\s+/g, '')}` : title;
}

/**
 * Сокращает название журнала в заголовке страницы; полное остаётся во всплывающей подсказке
 * Название — один текстовый узел: меняется только его текст, чтобы сайт мог обновить его сам
 * @returns {void}
 */
function shortenJournalTitle() {
    const heading = JournalState.watchElement?.querySelector('h6');
    const node = heading?.firstChild;
    if (heading?.childNodes.length !== 1 || node.nodeType !== Node.TEXT_NODE) return;

    const full = node.nodeValue;
    const short = shortJournalTitle(full);
    if (short === full) return;

    node.nodeValue = short;
    heading.title = full;
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
