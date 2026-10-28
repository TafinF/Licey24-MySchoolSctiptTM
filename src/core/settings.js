// ============================================================
// НАСТРОЙКИ: хранение и применение (средний балл по теме)
// ============================================================

/**
 * Загружает настройки из localStorage
 * Объединяет с DEFAULT_SETTINGS для заполнения отсутствующих полей
 * @returns {Object} Объект с настройками
 */
function loadSettings() {
    try {
        const settings = localStorage.getItem(CONFIG.STORAGE_KEY);
        const savedSettings = settings ? JSON.parse(settings) : {};
        return { ...DEFAULT_SETTINGS, ...savedSettings };
    } catch (error) {
        console.error('Ошибка загрузки настроек:', error);
        return { ...DEFAULT_SETTINGS };
    }
}

/**
 * Сохраняет настройки в localStorage
 * @param {Object} settings - объект с настройками для сохранения
 * @returns {void}
 */
function saveSettings(settings) {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Ошибка сохранения настроек:', error);
    }
}

/**
 * Выключает средний балл по теме
 * - Меняет journalSettings.additionalGridSettings в localStorage (учтётся при следующей загрузке)
 * - Если средний балл сейчас показан, выключает его через штатную панель настроек,
 *   потому что сайт читает localStorage только при загрузке страницы
 * @returns {void}
 */
function applyHideAverageMarkSetting() {
    const settings = loadSettings();

    if (!settings.hideAverageMark) return;

    try {
        const journalSettings = JSON.parse(localStorage.getItem('journalSettings') || 'null');
        const gridSettings = journalSettings?.additionalGridSettings;

        if (!gridSettings) return;

        const wasTopicShown = gridSettings.isShowAverageMarkTopic;

        gridSettings.isShowAverageMarkTest = false;
        gridSettings.isShowAverageMarkTopic = false;
        localStorage.setItem('journalSettings', JSON.stringify(journalSettings));

        if (wasTopicShown) {
            hideAverageMarkTopicInUi();
        }
    } catch (error) {
        console.error('Ошибка применения настроек скрытия:', error);
    }
}

/** @type {boolean} Идёт ли сейчас выключение среднего балла через панель настроек */
let isHidingAverageMarkInUi = false;

/**
 * Выключает "Средний балл по теме" через штатную панель настроек журнала
 * Панель на это время скрывается, чтобы не мигала на экране
 * @returns {Promise<void>}
 */
async function hideAverageMarkTopicInUi() {
    if (isHidingAverageMarkInUi) return;
    isHidingAverageMarkInUi = true;

    const styleId = 'mscp-silent-settings';
    if (!document.getElementById(styleId)) {
        const styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = `
            body.mscp-silent-settings > div[data-test-component="settingsSidePage"] {
                visibility: hidden !important;
            }
        `;
        document.head.appendChild(styleEl);
    }

    document.body.classList.add('mscp-silent-settings');

    try {
        const openButton = await Utils.waitUntil(
            () => document.querySelector(CONFIG.SELECTORS.SETTINGS_BUTTON)
        );
        openButton.click();

        const toggles = await Utils.waitUntil(() => {
            const found = document.querySelectorAll(CONFIG.SELECTORS.SETTINGS_TOGGLE);
            return found.length ? [...found] : null;
        });
        const topicToggle = toggles.find(
            toggle => toggle.closest('label')?.textContent.includes('по теме')
        ) ?? toggles[0];

        if (topicToggle.checked) {
            topicToggle.click();
            document.querySelector(CONFIG.SELECTORS.SETTINGS_SAVE).click();
        } else {
            document.querySelector(CONFIG.SELECTORS.SETTINGS_CLOSE)?.click();
        }

        // Ждём, пока панель закроется, и только потом показываем её контейнер обратно
        await Utils.waitUntil(() => !document.querySelector(CONFIG.SELECTORS.SETTINGS_TOGGLE), 3000);
    } catch (error) {
        console.error('Не удалось выключить средний балл по теме:', error);
    } finally {
        document.body.classList.remove('mscp-silent-settings');
        isHidingAverageMarkInUi = false;
    }
}
