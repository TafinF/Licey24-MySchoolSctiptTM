// ============================================================
// ТОЧКА ВХОДА: мониторинг URL и инициализация
// ============================================================

/**
 * Проверяет, соответствует ли URL целевой странице журнала
 * @param {string} url - URL для проверки
 * @returns {boolean} true, если URL соответствует странице журнала
 */
function isTargetUrl(url) {
    return CONFIG.URL_PATTERN.test(url);
}

/**
 * Инициализирует скрипт на странице журнала
 * - Выводит сообщение о версии
 * - Сбрасывает состояние журнала
 * - Вставляет кнопки сразу, а если страница ещё не готова — при первом подходящем изменении DOM
 * - Применяет настройку скрытия среднего балла
 * @returns {void}
 */
function initOnJournalPage() {
    console.log(`My School Color Point v${VERSION} — Инициализация...`);
    JournalState.reset();
    lastTableSignature = null;
    applyHideAverageMarkSetting();

    pageReadyObserver?.disconnect();

    if (insertButtons()) return;

    pageReadyObserver = new MutationObserver(() => {
        if (!isTargetUrl(window.location.href) || insertButtons()) {
            pageReadyObserver.disconnect();
        }
    });
    pageReadyObserver.observe(document.body, { childList: true, subtree: true });
}

/** @type {MutationObserver|null} Ждёт появления элементов страницы для вставки кнопок */
let pageReadyObserver = null;

/**
 * Запускает мониторинг URL для SPA-навигации
 *
 * Поскольку "Моя Школа" — SPA-приложение, навигация происходит без перезагрузки страницы.
 * Эта функция:
 * - Проверяет текущий URL при загрузке
 * - Перехватывает history.pushState и history.replaceState
 * - Отслеживает popstate (навигация браузера)
 * - Отслеживает клики по ссылкам
 *
 * При каждом изменении URL проверяет, соответствует ли он странице журнала,
 * и если да — инициализирует скрипт.
 * @returns {void}
 */
function initUrlMonitor() {
    let currentUrl = window.location.href;

    // Проверяем текущий URL при загрузке
    if (isTargetUrl(currentUrl)) {
        initOnJournalPage();
    }
    syncScheduleLayout(currentUrl);

    // Перехватываем history API для отслеживания навигации
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
        originalPushState.apply(this, args);
        handleUrlChange();
    };

    history.replaceState = function(...args) {
        originalReplaceState.apply(this, args);
        handleUrlChange();
    };

    // Отслеживаем навигацию браузера
    window.addEventListener('popstate', handleUrlChange);

    // Дополнительно отслеживаем клики по ссылкам
    document.addEventListener('click', (event) => {
        const link = event.target.closest('a');
        if (link?.href) {
            setTimeout(handleUrlChange, 100);
        }
    });

    /**
     * Обрабатывает изменение URL
     * Сравнивает пути без учёта query-параметров
     */
    function handleUrlChange() {
        const newUrl = window.location.href;

        // Сравниваем без учёта query-параметров
        const currentPath = currentUrl.split('?')[0];
        const newPath = newUrl.split('?')[0];

        if (newPath !== currentPath) {
            currentUrl = newUrl;
            // Сначала расписание: его кнопка настроек не должна мешать вставке кнопки журнала
            syncScheduleLayout(newUrl);
            if (isTargetUrl(newUrl)) {
                initOnJournalPage();
            }
        }
    }
}

/**
 * Запускает выбранный вид расписания на странице расписания и всё останавливает на остальных
 * @param {string} url - текущий URL
 * @returns {void}
 */
function syncScheduleLayout(url) {
    if (CONFIG.SCHEDULE_URL_PATTERN.test(url)) {
        SchedulePage.start();
    } else {
        SchedulePage.stop();
    }
}

/**
 * Точка входа скрипта
 * Запускает мониторинг URL после загрузки DOM
 */
(function main() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initUrlMonitor();
            initCommentPresets();
        });
    } else {
        initUrlMonitor();
        initCommentPresets();
    }
})();
