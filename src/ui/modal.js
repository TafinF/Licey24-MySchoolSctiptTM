// ============================================================
// МОДАЛЬНОЕ ОКНО: применение настроек и показ
// ============================================================

/**
 * Применяет изменённую настройку сразу, без кнопки "Применить"
 * - Журнал: перекрашивает таблицу, выключает средний балл, убирает баннер
 * - Расписание: пересобирает выбранный вид
 * @param {Object} settings - сохранённые настройки
 * @param {string} key - ключ изменённой настройки
 * @returns {void}
 */
function applySettings(settings, key) {
    if (key.startsWith('schedule')) {
        syncScheduleLayout(window.location.href);
        return;
    }

    if (!isTargetUrl(window.location.href)) return;

    JournalState.settings = settings;

    if (key === 'hideAverageMark' && settings.hideAverageMark) {
        applyHideAverageMarkSetting();
    }

    if (key === 'hideBanner' && settings.hideBanner) {
        removeBannerAndSetHeight();
    }

    processJournalTable(true);
}

/**
 * Показывает модальное окно с настройками
 * - Слева вкладки (если на странице больше одной), справа содержимое выбранной вкладки
 * - Любое изменение сохраняется и применяется сразу
 * - Закрывается крестиком, кликом по оверлею и Escape
 * @returns {void}
 */
function showModal() {
    const currentSettings = loadSettings();
    const tabs = SETTINGS_TABS.filter(tab => tab.isAvailable());

    const overlay = document.createElement('div');
    overlay.className = 'mscp-modal-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'mscp-modal-window';

    const header = document.createElement('div');
    header.className = 'mscp-modal-header';
    header.innerHTML = `
        <h2 class="mscp-modal-title">My School Color Point<span class="mscp-modal-version">${VERSION}</span></h2>
        <button type="button" class="mscp-close-btn" title="Закрыть">&times;</button>
    `;

    const body = document.createElement('div');
    body.className = 'mscp-modal-body';

    const nav = document.createElement('nav');
    nav.className = 'mscp-modal-nav';
    nav.hidden = tabs.length < 2;
    dialog.classList.toggle('mscp-has-nav', !nav.hidden);

    const content = document.createElement('div');
    content.className = 'mscp-modal-content';

    const showTab = tab => {
        content.replaceChildren(tab.build(currentSettings));
        content.scrollTop = 0;
        nav.querySelectorAll('.mscp-nav-item').forEach(item => {
            item.classList.toggle('mscp-active', item.dataset.tab === tab.id);
        });
    };

    tabs.forEach(tab => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'mscp-nav-item';
        item.dataset.tab = tab.id;
        item.textContent = tab.label;
        item.addEventListener('click', () => showTab(tab));
        nav.appendChild(item);
    });

    // Изменение любого поля: сохранить и применить
    content.addEventListener('change', event => {
        const input = event.target;
        const key = input.dataset?.key;
        if (!key) return;

        const settings = loadSettings();
        settings[key] = input.type === 'checkbox' ? input.checked : input.value;
        saveSettings(settings);
        Object.assign(currentSettings, settings);
        applySettings(settings, key);
    });

    body.append(nav, content);
    dialog.append(header, body);
    overlay.appendChild(dialog);

    const close = () => {
        overlay.remove();
        document.removeEventListener('keydown', handleEscape);
    };
    const handleEscape = event => {
        if (event.key === 'Escape') close();
    };

    header.querySelector('.mscp-close-btn').addEventListener('click', close);
    overlay.addEventListener('click', event => {
        if (event.target === overlay) close();
    });
    document.addEventListener('keydown', handleEscape);

    showTab(tabs[0]);
    document.body.appendChild(overlay);
}
