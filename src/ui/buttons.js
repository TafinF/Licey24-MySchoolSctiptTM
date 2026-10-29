// ============================================================
// КНОПКИ
// ============================================================

/**
 * Создаёт кнопку настроек и добавляет в DOM
 * @param {HTMLElement} parentElement - элемент, в который добавляется кнопка
 * @returns {void}
 */
function createButtons(parentElement) {
    parentElement.appendChild(createSettingsButton());
}

/**
 * Создаёт кнопку настроек дополнения
 * @returns {HTMLElement} контейнер с кнопкой
 */
function createSettingsButton() {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'mscp-button-box';
    buttonContainer.style.cssText = 'box-shadow: 1px 1px 4px 0px rgba(0, 0, 0, 0.07); border-radius: 8px; display: inline-flex;';

    const button = document.createElement('button');
    button.className = 'mscp-button';
    button.innerHTML = createSettingsIcon();
    button.title = 'Настройки дополнения';
    button.addEventListener('click', showModal);
    buttonContainer.appendChild(button);

    return buttonContainer;
}

/**
 * Создаёт кнопку расписания коллег
 * @returns {HTMLElement} контейнер с кнопкой
 */
function createColleaguesButton() {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'mscp-colleagues-box';
    buttonContainer.style.cssText = 'box-shadow: 1px 1px 4px 0px rgba(0, 0, 0, 0.07); border-radius: 8px; display: inline-flex;';

    const button = document.createElement('button');
    button.className = 'mscp-button';
    button.innerHTML = createColleaguesIcon();
    button.title = 'Расписание коллег';
    button.addEventListener('click', () => Colleagues.open());
    buttonContainer.appendChild(button);

    return buttonContainer;
}

/**
 * Вставляет кнопки управления в заголовок журнала
 * - Ожидает загрузки DOM-элементов
 * - Создаёт стили и кнопки
 * - Применяет настройки (баннер, средний балл)
 * - Запускает обработку таблицы
 * Не ждёт сам: если элементы страницы ещё не готовы, сразу возвращает false
 * @returns {boolean} true, если кнопки уже есть на странице или были вставлены
 */
function insertButtons() {
    if (document.querySelector('.mscp-button')) return true;

    if (!document.querySelector(CONFIG.SELECTORS.MAIN_SECTION)) return false;

    const parentElement = document.querySelector(CONFIG.SELECTORS.PARENT_BUTTON_CONTAINER);
    const h6Element = parentElement?.querySelector('h6');
    if (!h6Element) return false;

    console.log('Вставляем кнопки управления');

    JournalState.watchElement = h6Element.parentNode;

    createStyles();
    createButtons(JournalState.watchElement);

    // Применяем настройки
    const settings = loadSettings();
    JournalState.settings = settings;

    // Удаляем баннер если включено
    if (settings.hideBanner) {
        removeBannerAndSetHeight();
    }

    processJournalTable(true);
    return true;
}
