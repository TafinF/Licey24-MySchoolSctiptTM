// ==UserScript==
// @name         My School Color Point
// @namespace    http://tampermonkey.net/
// @version      2026-10-29_19-18-04
// @description  Окрашивает оценки в разные цвета в Моя Школа
// @author       Tafintsev Feodor taf.f11@ya.ru
// @match        https://authedu.mosreg.ru/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mosreg.ru
// @updateURL    https://raw.githubusercontent.com/TafinF/Licey24-MySchoolSctiptTM/refs/heads/main/script.js
// @downloadURL  https://raw.githubusercontent.com/TafinF/Licey24-MySchoolSctiptTM/refs/heads/main/script.js
// @grant        none
// ==/UserScript==

(function () {

// ============================================================
// КОНФИГУРАЦИЯ: константы, цвета, настройки по умолчанию
// ============================================================

/**
 * Версия скрипта
 * Используется в Tampermonkey и отображается в меню настроек
 * Подставляется автоматически при сборке (build.sh)
 */
const VERSION = '2026-10-29_19-18-04';

/**
 * Основная конфигурация скрипта
 * Содержит все настраиваемые параметры в одном месте
 */
const CONFIG = {
    /** Префикс для всех CSS-классов окрашивания */
    CLASS_PREFIX: 'mscp',

    /** Ключ для хранения настроек в localStorage */
    STORAGE_KEY: 'MSCP',

    /**
     * Список предметов с математическим округлением (вместо лицейского)
     * Математическое: 4.5 → 5, Лицейское: 4.65 → 5
     */
    MATH_ROUND_SUBJECTS: [
        'Изобразительное искусство',
        'Музыка',
        'Труд',
        'Физическая культура'
    ],

    /** CSS-селекторы для поиска элементов на странице */
    SELECTORS: {
        MODAL_TRIGGER: '.FDJEFXkDpWhBLZDxnInU.hGtB0oSuryeRiAS2J57Y.Qp8HUr00NXY26hlHOZwb.cbtxLJutW4h15oSu11WO.IfMLW0irD86BmgWhT8FP.C0qHlb4C7fAcYrnlODD0.false.NxJu2UTTgygYiAOvhTvC.IFkWdTtYw_C_ncCuZmUF.Cb3mMUc4RqGu4myaBrNy',
        PARENT_BUTTON_CONTAINER: '[data-test-component="undefined-subheaderTitle-titleContainer"]',
        /** Кнопка открытия штатной панели настроек журнала */
        SETTINGS_BUTTON: '[data-test-component="JournalLayersPopupSettings"]',
        /** Переключатели "Дополнительно" в панели настроек (по порядку: по теме, по периоду, выбывшие) */
        SETTINGS_TOGGLE: 'input[data-test-component="settingsSidePageToggleGridSettings"]',
        /** Кнопка "Сохранить" в панели настроек */
        SETTINGS_SAVE: 'button[data-test-component="settingsSidePage"]',
        /** Кнопка закрытия панели настроек */
        SETTINGS_CLOSE: 'button[data-test-component="settingsSidePage-iconButtonInPopover-iconButtonComponent"]',
        MAIN_SECTION: 'main',
        JOURNAL_TABLE: 'table',
        LESSON_CELL: '[data-test-component^="scheduleLessonCell"]',
        /** Карточка урока в недельном расписании */
        SCHEDULE_CARD: '[data-test-component^="scheduleDay-"][data-test-component*="-Card-"]',
        /** Кнопка "предыдущая неделя" в шапке расписания */
        SCHEDULE_WEEK_PREV: '[data-test-component="scheduleHeaderPrevWeek"]',
        /** Подпись выбранной недели в шапке расписания ("26 - 01 ноября 2026 года") */
        SCHEDULE_WEEK_LABEL: '[data-test-component="scheduleHeaderPopperDateLeftOn"]',
        /** Кнопка календаря в верхней белой полосе сайта */
        CALENDAR_BUTTON: 'button[data-test-component="appBarCalendarToggle"]'
    },

    /** URL-паттерн страницы расписания уроков */
    SCHEDULE_URL_PATTERN: /^https:\/\/authedu\.mosreg\.ru\/teacher\/account\/schedule/,

    /** Расписание коллег: ключи localStorage и время жизни кеша */
    COLLEAGUES: {
        /** Кеш списка учителей и недель расписания */
        CACHE_KEY: 'MSCP_colleagues',
        /** Закреплённые учителя и последний выбранный (при сбросе кеша остаются) */
        FAVORITES_KEY: 'MSCP_colleagues_favorites',
        /** Список учителей обновляется раз в неделю */
        TEACHERS_TTL_MS: 7 * 24 * 60 * 60 * 1000,
        /** Текущая и будущие недели обновляются раз в несколько часов (прошедшие — никогда) */
        WEEK_TTL_MS: 6 * 60 * 60 * 1000,
        /** Сколько недель держать в кеше */
        MAX_WEEKS: 80
    },

    /** Заготовки комментариев для карточки выставления оценки */
    COMMENT_PRESETS: ['Ответ теории', 'Решение задач', 'Проверка ДЗ'],

    /** URL-паттерн для страниц журнала */
    URL_PATTERN: /^https:\/\/authedu\.mosreg\.ru\/teacher\/study-process\/journal\/(?:grade|my)\/[0-9]+(\?.*)?$/,

    /**
     * Время начала уроков по школьному звонку: первый элемент — 1-й урок, второй — 2-й и так далее
     * Номер в карточке сайта не годится: он считает уроки учителя внутри дня, а не школьные.
     * Урок с другим временем получает номер ближайшего по времени начала
     */
    LESSON_STARTS: ['08:30', '09:30', '10:30', '11:35', '12:30', '13:35', '14:30', '15:25'],

    /**
     * Настройки подсветки форм контроля
     */
    CONTROL_FORMS: {
        /** CSS-класс для поиска span элементов в thead */
        SPAN_CLASS: '.DSXOGdoSiFGKohRuaDDx.ebIBbAN3ZomwnCMWP167._ELGiVRWaoZZRQLlT7eO.LqxH9tRjFX8eUgojIkc1.p2N_yf8k6HEnunN8Zt12.E8taxZlPjqlq_tc1djmu.uikwDrsLuFZMfBupkv7A',
        /** Запрещённые для изменения формы контроля */
        RESTRICTED: ['Диалог', 'Докл', 'УчЗ']
    }
};

/**
 * Цветовая палитра для оценок
 * Каждый цвет соответствует определённой оценке
 */
const COLORS = {
    /** Отлично (5) - зелёный */
    GREEN: '#CCFFCC',
    /** Хорошо (4) - голубой */
    BLUE: '#c2e0ff',
    /** Удовлетворительно (3) - жёлтый */
    YELLOW: '#FFFFCC',
    /** Неудовлетворительно (2) - красный */
    RED: '#FF9999',
    /** Предупреждающий (недостаточно оценок) - оранжевый */
    WARNING: '#fdd9b5',
    /** Опасный (критично мало оценок) - розовый */
    DANGER: '#fccfd3',
    /** Базовый цвет фона */
    DEFAULT_BG: '#ffffff',
    /** Цвет уголка "почти достиг" - жёлтый/оранжевый */
    CORNER: '#ffceff',
    /** Цвет уголка при несоответствии среднего балла - серый */
    CORNER_MISMATCH: '#cccccc',
    /** Цвет подсветки запрещённых форм контроля - красный */
    RESTRICTED_CONTROL: '#ff0000'
};

/**
 * Пороговые значения для определения цвета итоговой оценки
 * Зависят от метода округления (математический или лицейский)
 */
const GRADE_THRESHOLDS = {
    /** Математическое округление (стандартное) */
    MATH_ROUND: {
        FIVE: 4.5,   // >= 4.5 → 5
        FOUR: 3.5,   // >= 3.5 → 4
        THREE: 2.5   // >= 2.5 → 3
    },
    /** Лицейское округление (более строгие требования) */
    LYCEUM_ROUND: {
        FIVE: 4.65,  // >= 4.65 → 5
        FOUR: 3.6,   // >= 3.6 → 4
        THREE: 2.6   // >= 2.6 → 3
    }
};

/**
 * Карта CSS-классов для оценок
 * Используется для быстрого добавления/удаления классов
 */
const GRADE_CLASSES = {
    // Обычные ячейки с оценками (градиент)
    '5': 'mscp-grade-5',
    '4': 'mscp-grade-4',
    '3': 'mscp-grade-3',
    '2': 'mscp-grade-2',
    // Итоговые оценки (сплошной цвет)
    final: {
        '5': 'mscp-final-5',
        '4': 'mscp-final-4',
        '3': 'mscp-final-3',
        '2': 'mscp-final-2'
    },
    // Средний балл
    average: {
        '5': 'mscp-average-5',
        '4': 'mscp-average-4',
        '3': 'mscp-average-3',
        '2': 'mscp-average-2'
    }
};

/**
 * Карта цветов для оценок (для использования в CSS и расчётах)
 */
const GRADE_COLORS = {
    '5': COLORS.GREEN,
    '4': COLORS.BLUE,
    '3': COLORS.YELLOW,
    '2': COLORS.RED
};

/**
 * Комбинации оценок для проверки
 * Упорядочены по приоритету: меньше оценок → минимальные оценки
 */
const GRADE_COMBOS = {
    /** Комбинации из 1 оценки (от меньшей к большей) */
    single: [
        { grades: [3], label: '3' },
        { grades: [4], label: '4' },
        { grades: [5], label: '5' }
    ],
    /** Комбинации из 2 оценок (от меньшей суммы к большей) */
    double: [
        { grades: [3, 3], label: '3, 3', sum: 6 },
        { grades: [3, 4], label: '3, 4', sum: 7 },
        { grades: [4, 4], label: '4, 4', sum: 8 },
        { grades: [3, 5], label: '3, 5', sum: 8 },
        { grades: [4, 5], label: '4, 5', sum: 9 },
        { grades: [5, 5], label: '5, 5', sum: 10 }
    ]
};

/**
 * Настройки по умолчанию
 * Используются при первом запуске или отсутствии сохранённых настроек
 */
const DEFAULT_SETTINGS = {
    /** Цветной режим для: окрашивание накопляемости оценок (прогресс-бар) */
    colorAccumulation: true,
    /** Цветной режим для: окрашивание оценок за уроки */
    colorLessonGrades: true,
    /** Цветной режим для: окрашивание среднего балла */
    colorAverageGrade: true,
    /** Цветной режим для: окрашивание пограничных оценок (уголок) */
    colorBorderlineGrades: true,
    /** Выключать средний балл при загрузке страницы */
    hideAverageMark: true,
    /** Убрать баннер на странице */
    hideBanner: false,
    /** Вид расписания уроков: classic — сайта, compact — сжатое, custom — заменённое своим */
    scheduleStyle: 'custom',
    /** Пометка предмета в заменённом расписании: color — цвет, label — подпись, both — и то и другое, none — никак */
    scheduleSubjectMark: 'color',
    /** Цветной прямоугольник у класса в заменённом расписании */
    scheduleClassColor: true,
    /** Время начала и конца урока на карточке в заменённом расписании */
    scheduleShowTime: true,
    /** Выбор ученика для ответа: biased — предвзято (по оценкам и давности), random — все равновероятны */
    pickMode: 'biased'
};

/** Способы выбора ученика для ответа */
const PICK_MODES = [
    { value: 'biased', label: 'Предвзято' },
    { value: 'random', label: 'Случайно' }
];

/** Способы пометить предмет в заменённом расписании */
const SCHEDULE_SUBJECT_MARKS = [
    { value: 'color', label: 'Цвет' },
    { value: 'label', label: 'Подпись' },
    { value: 'both', label: 'Цвет и подпись' },
    { value: 'none', label: 'Не помечать' }
];

/** Виды расписания уроков для окна настроек */
const SCHEDULE_STYLES = [
    {
        value: 'classic',
        label: 'Классическое',
        description: 'Как на сайте'
    },
    {
        value: 'compact',
        label: 'Компактное',
        description: 'Сжато до размера окна, без тем'
    },
    {
        value: 'custom',
        label: 'Заменённое',
        description: 'Своя сетка по номерам уроков; клик открывает журнал'
    }
];


// ============================================================
// СОСТОЯНИЕ ПРИЛОЖЕНИЯ
// ============================================================

/**
 * Объект состояния текущего журнала
 * Инкапсулирует все данные о просматриваемом журнале
 * @type {Object}
 */
const JournalState = {
    /** @type {boolean} Используется ли математическое округление */
    isMathRound: false,

    /** @type {boolean} Достаточно ли 3 оценок для аттестации (при < 15 уроках) */
    isWeNeed3Grades: false,

    /** @type {number} Количество уроков в триместре */
    countLessons: 0,

    /** @type {HTMLElement|null} Элемент-заголовок за которым ведётся наблюдение */
    watchElement: null,

    /** @type {Object|null} Текущие настройки */
    settings: null,

    /**
     * Сбрасывает состояние к начальным значениям
     * @returns {void}
     */
    reset() {
        this.isMathRound = false;
        this.isWeNeed3Grades = false;
        this.countLessons = 0;
        this.settings = null;
    },

    /**
     * Обновляет состояние на основе данных журнала
     * @param {HTMLTableSectionElement} tableHead - заголовок таблицы
     * @param {string} journalName - название журнала (предмета)
     * @returns {void}
     */
    update(tableHead, journalName) {
        this.isMathRound = checkIsMathRound(journalName);
        this.countLessons = countLessonsInTrimester(tableHead);
        this.isWeNeed3Grades = this.countLessons < 15;
        this.settings = loadSettings();
    }
};

/** @type {MutationObserver|null} Наблюдатель за изменениями DOM */
let tableObserver = null;

/** @type {HTMLElement|null} Элемент <main>, за которым следит tableObserver */
let observedMain = null;

/** @type {string|null} Снимок таблицы, по которому выполнено последнее окрашивание */
let lastTableSignature = null;

/** @type {number} Идентификатор запланированной перекраски (0 — не запланирована) */
let recolorFrame = 0;


// ============================================================
// УТИЛИТЫ
// ============================================================

/**
 * Объект с вспомогательными методами
 */
const Utils = {
    /**
     * Ожидает появления элемента на странице
     * @param {string} selector - CSS-селектор элемента
     * @param {Function} callback - функция, вызываемая при обнаружении элемента
     * @param {number} [interval=1000] - интервал проверки в мс
     * @returns {void}
     */
    waitForElement(selector, callback, interval = 1000) {
        const element = document.querySelector(selector);
        if (element) {
            callback(element);
        } else {
            setTimeout(() => this.waitForElement(selector, callback, interval), interval);
        }
    },

    /**
     * Ждёт, пока функция проверки вернёт истинное значение
     * @param {Function} check - функция проверки, возвращает найденное значение или null
     * @param {number} [timeout=10000] - сколько ждать в мс
     * @param {number} [interval=50] - интервал проверки в мс
     * @returns {Promise<*>} Значение, которое вернула check
     */
    waitUntil(check, timeout = 10000, interval = 50) {
        return new Promise((resolve, reject) => {
            const startedAt = Date.now();
            const tick = () => {
                const value = check();
                if (value) return resolve(value);
                if (Date.now() - startedAt > timeout) return reject(new Error('Превышено время ожидания'));
                setTimeout(tick, interval);
            };
            tick();
        });
    },

    /**
     * Удаляет все CSS-классы окрашивания с элементов в контейнере
     * @param {HTMLElement} container - контейнер для очистки
     * @returns {void}
     */
    clearColoring(container) {
        const coloredElements = container.querySelectorAll('[class*="mscp-"]');

        coloredElements.forEach(element => {
            const classesToRemove = [...element.classList].filter(
                className => className.startsWith(CONFIG.CLASS_PREFIX + '-')
            );

            if (classesToRemove.length > 0) {
                element.classList.remove(...classesToRemove);
            }

            element.style.removeProperty('background');
        });
    },

    /**
     * Парсит строку с оценкой в число
     * @param {string} text - строка с оценкой (например, "4,5")
     * @returns {number} Числовое значение оценки
     */
    parseGrade(text) {
        return parseFloat(text.replace(',', '.'));
    },

    /**
     * Проверяет, имеет ли ячейка атрибут data-test-component с определённым значением
     * @param {HTMLElement} cell - ячейка для проверки
     * @param {string} value - значение для поиска в атрибуте
     * @returns {boolean} true, если атрибут содержит значение
     */
    hasTestAttribute(cell, value) {
        const attr = cell.getAttribute('data-test-component');
        return attr && attr.includes(value);
    }
};


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


// ============================================================
// ОЧИСТКА СТРАНИЦЫ: баннер и шапка сайта
// ============================================================

/**
 * Удаляет первый найденный элемент баннера, если на странице присутствуют элементы только одного из указанных классов.
 * Если найдены элементы двух и более разных классов – ничего не делает.
 * Если нет ни одного элемента из указанных классов – ничего не делает.
 * После удаления добавляет CSS-стиль для .MSC8WgFhoGMq0svc { height: calc(100vh - 40px) }.
 *
 * @param {string[]} [classNames=['WC-Banner-content', 'WC-Banner-link']] - Массив имён классов (без точки),
 *        которые проверяются на наличие на странице. По умолчанию – ['WC-Banner-content', 'WC-Banner-link'].
 * @returns {void}
 */
function removeBannerAndSetHeight(classNames = ['WC-Banner-content', 'WC-Banner-link']) {
    // Определяем, какие классы из списка реально присутствуют на странице
    const presentClasses = classNames.filter(className => {
        return document.querySelector(`.${className}`) !== null;
    });

    // Если найдено 0 или 2+ классов – ничего не делаем
    if (presentClasses.length !== 1) {
        return;
    }

    // Единственный класс, элементы которого нужно удалить
    const targetClass = presentClasses[0];

    // Удаляем элемент этого класса
    document.querySelector(`.${targetClass}`).remove();

    // Добавляем стиль для высоты, если его ещё нет
    const styleId = 'mscp-banner-override';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .MSC8WgFhoGMq0svc {
                height: calc(100vh - 40px);
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Удаляет шапку сайта и устанавливает высоту основного контейнера
 * - Удаляет элементы #root > div > div._56grJoiM2euP0m-4_cQJ0
 * - Добавляет CSS-стиль для .MSC8WgFhoGMq0svc { height: 100vh }
 * @returns {void}
 */
function removeHeaderAndSetHeight() {
    removeBannerAndSetHeight();

    // Удаление элемента #root > div > div._56grJoiM2euP0m-4_cQJ0
    let el = document.querySelector('#root > div > div._56grJoiM2euP0m-4_cQJ0');
    el.remove();


    // Установка нужной высоты для класса .MSC8WgFhoGMq0svc
    const style = document.createElement('style');
    style.id = 'mscp-header-override';

    // Проверяем, не добавлен ли уже стиль
    if (!document.getElementById('mscp-header-override')) {
        style.textContent = `
            .MSC8WgFhoGMq0svc {
                height: calc(100vh);
            }
        `;
        document.head.appendChild(style);
    }
}


// ============================================================
// ОЦЕНКИ: округление, подсчёт уроков, сбор оценок из строки
// ============================================================

/**
 * Проверяет, используется ли математическое округление для предмета
 * @param {string} subjectName - название предмета
 * @returns {boolean} true, если используется математическое округление
 */
function checkIsMathRound(subjectName) {
    return CONFIG.MATH_ROUND_SUBJECTS.some(subject =>
        subjectName.includes(subject)
    );
}

/**
 * Подсчитывает количество уникальных уроков в триместре
 * @param {HTMLTableSectionElement} tableHead - заголовок таблицы журнала
 * @returns {number} Количество уроков
 */
function countLessonsInTrimester(tableHead) {
    const lessons = new Set();
    const lessonCells = tableHead.querySelectorAll(CONFIG.SELECTORS.LESSON_CELL);

    lessonCells.forEach(cell => {
        const lessonId = cell.getAttribute('data-test-component').split('-')[1];
        lessons.add(lessonId);
    });

    return lessons.size;
}

/**
 * Определяет текущую итоговую оценку по среднему баллу
 * @param {number} averageGrade - средний балл
 * @param {boolean} isMathRound - использовать математическое округление
 * @returns {string} Оценка: '5', '4', '3' или '2'
 */
function getCurrentGrade(averageGrade, isMathRound) {
    const thresholds = isMathRound
        ? GRADE_THRESHOLDS.MATH_ROUND
        : GRADE_THRESHOLDS.LYCEUM_ROUND;

    if (averageGrade >= thresholds.FIVE) return '5';
    if (averageGrade >= thresholds.FOUR) return '4';
    if (averageGrade >= thresholds.THREE) return '3';
    return '2';
}

/**
 * Определяет CSS-класс для ячейки среднего балла
 * @param {number} averageGrade - средний балл
 * @param {boolean} isMathRound - использовать математическое округление
 * @returns {string} CSS-класс (например, 'mscp-average-5')
 */
function getAverageClass(averageGrade, isMathRound) {
    const grade = getCurrentGrade(averageGrade, isMathRound);
    return GRADE_CLASSES.average[grade];
}

/**
 * Собирает данные об оценках из строки таблицы
 * @param {HTMLTableRowElement} row - строка таблицы
 * @returns {Object} Объект с данными: { grades: string[], sum: number, count: number }
 */
function collectGradesFromRow(row) {
    const grades = [];
    let sum = 0;
    let count = 0;

    for (let j = 1; j < row.childNodes.length - 1; j++) {
        const cell = row.childNodes[j].firstChild;

        if (isFinalGradeCell(cell)) continue;
        if (!cell.hasChildNodes()) continue;

        const gradeText = cell.firstChild.textContent;
        const grade = parseInt(gradeText);

        if (!isNaN(grade) && grade >= 2 && grade <= 5) {
            grades.push(gradeText);
            sum += grade;
            count++;
        }
    }

    return { grades, sum, count };
}

/**
 * Проверяет, является ли ячейка итоговой оценкой за период
 * @param {HTMLElement} cell - ячейка для проверки
 * @returns {boolean} true, если это итоговая оценка
 */
function isFinalGradeCell(cell) {
    return Utils.hasTestAttribute(cell, 'finalResult');
}

/**
 * Проверяет, является ли ячейка годовой оценкой
 * @param {HTMLElement} cell - ячейка для проверки
 * @returns {boolean} true, если это годовая оценка
 */
function isYearGradeCell(cell) {
    return Utils.hasTestAttribute(cell, 'yearResult');
}


// ============================================================
// КОМБИНАЦИИ ОЦЕНОК И ГРАДИЕНТ НАКОПЛЯЕМОСТИ
// ============================================================

/**
 * Вычисляет, сколько пятёрок нужно для достижения порога
 * @param {number} sum - текущая сумма оценок
 * @param {number} count - текущее количество оценок
 * @param {number} threshold - пороговое значение среднего балла
 * @returns {number|null} Количество пятёрок или null, если порог уже достигнут
 */
function calcFivesNeeded(sum, count, threshold) {
    const numerator = threshold * count - sum;
    const denominator = 5 - threshold;

    if (numerator <= 0) return null;

    return Math.ceil(numerator / denominator);
}

/**
 * Проверяет, достигнет ли комбинация оценок порога
 * @param {number} sum - текущая сумма оценок
 * @param {number} count - текущее количество оценок
 * @param {number[]} comboGrades - массив оценок в комбинации
 * @param {number} threshold - пороговое значение среднего балла
 * @returns {boolean} true, если комбинация достигает порога
 */
function checkComboReachesThreshold(sum, count, comboGrades, threshold) {
    const comboSum = comboGrades.reduce((a, b) => a + b, 0);
    const newSum = sum + comboSum;
    const newCount = count + comboGrades.length;
    const newAverage = newSum / newCount;

    return newAverage >= threshold;
}

/**
 * Вычисляет сумму оценок в комбинации
 * @param {number[]} comboGrades - массив оценок
 * @returns {number} Сумма оценок
 */
function getComboSum(comboGrades) {
    return comboGrades.reduce((a, b) => a + b, 0);
}

/**
 * Проверяет, содержится ли оценка из singleCombo в doubleCombo
 * @param {number[]} singleGrades - массив из одной оценки
 * @param {number[]} doubleGrades - массив из двух оценок
 * @returns {boolean} true, если single-оценка есть в double-комбинации
 */
function isSingleContainedInDouble(singleGrades, doubleGrades) {
    return doubleGrades.includes(singleGrades[0]);
}

/**
 * Находит лучшие комбинации для достижения следующей оценки
 * Приоритет: меньше оценок → меньше сумма → меньше оценки
 * Если single-оценка содержится в double — показываем только single
 * @param {number} sum - текущая сумма оценок
 * @param {number} count - текущее количество оценок
 * @param {string} targetGrade - целевая оценка ('5', '4' или '3')
 * @param {boolean} isMathRound - использовать математическое округление
 * @returns {Object} { label: string, isFormula: boolean, comboSize: number }
 */
function findBestCombo(sum, count, targetGrade, isMathRound) {
    const thresholds = isMathRound
        ? GRADE_THRESHOLDS.MATH_ROUND
        : GRADE_THRESHOLDS.LYCEUM_ROUND;

    let threshold;
    switch (targetGrade) {
        case '5': threshold = thresholds.FIVE; break;
        case '4': threshold = thresholds.FOUR; break;
        case '3': threshold = thresholds.THREE; break;
        default: return { label: '', isFormula: false, comboSize: 0 };
    }

    // Ищем подходящие комбинации из 1 оценки (идут по возрастанию: 3, 4, 5)
    let bestSingle = null;
    for (const combo of GRADE_COMBOS.single) {
        if (checkComboReachesThreshold(sum, count, combo.grades, threshold)) {
            bestSingle = combo;
            break;
        }
    }

    // Ищем ВСЕ подходящие комбинации из 2 оценок и берём с минимальной суммой
    let bestDouble = null;
    let bestDoubleSum = Infinity;

    for (const combo of GRADE_COMBOS.double) {
        if (checkComboReachesThreshold(sum, count, combo.grades, threshold)) {
            const comboSum = getComboSum(combo.grades);
            if (comboSum < bestDoubleSum) {
                bestDouble = combo;
                bestDoubleSum = comboSum;
            }
        }
    }

    // Формируем результат
    if (!bestSingle && !bestDouble) {
        const fivesNeeded = calcFivesNeeded(sum, count, threshold);
        if (fivesNeeded === null) {
            return { label: '', isFormula: false, comboSize: 0 };
        }
        return {
            label: fivesNeeded === 1 ? '1 пятёрка' : `${fivesNeeded} пятёрок`,
            isFormula: true,
            comboSize: fivesNeeded
        };
    }

    if (bestSingle && bestDouble) {
        // Если single-оценка содержится в double — показываем только single
        if (isSingleContainedInDouble(bestSingle.grades, bestDouble.grades)) {
            return { label: bestSingle.label, isFormula: false, comboSize: 1 };
        }
        // Иначе показываем оба варианта
        return {
            label: `${bestSingle.label} или ${bestDouble.label}`,
            isFormula: false,
            comboSize: 1
        };
    }

    if (bestSingle) {
        return { label: bestSingle.label, isFormula: false, comboSize: 1 };
    }

    return { label: bestDouble.label, isFormula: false, comboSize: 2 };
}

/**
 * Генерирует CSS-градиент для прогресс-бара накопляемости оценок
 * @param {number} gradeCount - количество оценок
 * @param {boolean} isWeNeed3Grades - нужно ли 3 оценки (вместо 5)
 * @returns {string} CSS-строка с gradient
 */
function generateProgressGradient(gradeCount, isWeNeed3Grades) {
    const defaultColor = COLORS.DEFAULT_BG;

    if (isWeNeed3Grades) {
        const gradients = {
            0: `linear-gradient(to left, ${defaultColor})`,
            1: `linear-gradient(to left, ${defaultColor} 66%, ${COLORS.DANGER} 0%)`,
            2: `linear-gradient(to left, ${defaultColor} 33%, ${COLORS.WARNING} 0%)`
        };
        return gradients[gradeCount] || `linear-gradient(to left, ${COLORS.GREEN})`;
    }

    const gradients = {
        0: `linear-gradient(to left, ${defaultColor})`,
        1: `linear-gradient(to left, ${defaultColor} 80%, ${COLORS.DANGER} 0%)`,
        2: `linear-gradient(to left, ${defaultColor} 60%, ${COLORS.DANGER} 0%)`,
        3: `linear-gradient(to left, ${defaultColor} 40%, ${COLORS.DANGER} 0%)`,
        4: `linear-gradient(to left, ${defaultColor} 20%, ${COLORS.WARNING} 0%)`
    };
    return gradients[gradeCount] || `linear-gradient(to left, ${COLORS.GREEN})`;
}


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


// ============================================================
// ОКРАШИВАНИЕ СТРОК ТАБЛИЦЫ
// ============================================================

/**
 * Окрашивает стандартную строку таблицы с оценками ученика
 * @param {HTMLTableRowElement} row - строка таблицы
 * @returns {void}
 */
function colorizeStandardRow(row) {
    if (row.childNodes.length < 2) return;

    const gradesData = collectGradesFromRow(row);
    const allGrades = gradesData.grades;
    const settings = JournalState.settings;

    let consecutiveTwos = [];

    for (let j = 1; j < row.childNodes.length - 1; j++) {
        const cell = row.childNodes[j].firstChild;

        if (isFinalGradeCell(cell)) {
            colorFinalGradeCell(cell, allGrades, JournalState.isWeNeed3Grades);

            // Прогресс-бар — только если включено colorAccumulation
            if (settings.colorAccumulation) {
                row.firstChild.style.background = generateProgressGradient(
                    allGrades.length,
                    JournalState.isWeNeed3Grades
                );
                row.firstChild.classList.add('mscp-progress');
            }
            continue;
        }

        // Окрашивание оценок за уроки — только если включено colorLessonGrades
        if (settings.colorLessonGrades) {
            const currentGrade = colorGradeCell(cell);

            if (currentGrade) {
                if (currentGrade === '2') {
                    consecutiveTwos.push(cell);

                    if (consecutiveTwos.length >= 3) {
                        consecutiveTwos.forEach(colorBadGradeCell);
                    }
                } else {
                    consecutiveTwos = [];
                }
            }
        }
    }

    colorizeAverageCell(row, gradesData);
}

/**
 * Окрашивает ячейку среднего балла с учётом настроек
 * - Определяет текущую оценку
 * - Вычисляет комбинации для повышения
 * - Добавляет уголок "почти достиг" при необходимости
 * - Устанавливает tooltip с информацией
 * @param {HTMLTableRowElement} row - строка таблицы
 * @param {Object} gradesData - данные об оценках { grades, sum, count }
 * @returns {void}
 */
function colorizeAverageCell(row, gradesData) {
    const averageCell = row.childNodes[row.childNodes.length - 1].firstChild;
    const displayedAverage = Utils.parseGrade(averageCell.firstChild.textContent);
    const settings = JournalState.settings;

    const currentGrade = getCurrentGrade(displayedAverage, JournalState.isMathRound);

    // Вычисляем средний балл по оценкам
    const calculatedAverage = gradesData.count > 0 ? gradesData.sum / gradesData.count : 0;

    // Проверяем соответствие отображаемого и вычисленного среднего
    const averageMatches = Math.abs(displayedAverage - calculatedAverage) < 0.01;

    const nextGradeMap = { '2': '3', '3': '4', '4': '5' };
    const nextGrade = nextGradeMap[currentGrade];

    let comboResult = null;
    if (nextGrade && gradesData.count > 0) {
        comboResult = findBestCombo(
            gradesData.sum,
            gradesData.count,
            nextGrade,
            JournalState.isMathRound
        );
    }

    // Окрашивание среднего балла
    if (settings.colorAverageGrade) {
        if (comboResult && comboResult.label && settings.colorBorderlineGrades && comboResult.comboSize <= 2 && !comboResult.isFormula) {
            const currentColor = GRADE_COLORS[currentGrade];
            // Выбираем цвет уголка в зависимости от соответствия среднего
            const cornerColor = averageMatches ? COLORS.CORNER : COLORS.CORNER_MISMATCH;

            averageCell.parentNode.style.background =
                `linear-gradient(135deg, ${currentColor} 78%, ${cornerColor} 78%)`;
            averageCell.parentNode.classList.add('mscp-average-almost');
        } else {
            const className = getAverageClass(displayedAverage, JournalState.isMathRound);
            averageCell.parentNode.classList.add(className);
        }
    }

    // Tooltip показываем всегда, если есть комбинация
    if (comboResult && comboResult.label) {
        averageCell.parentNode.dataset.tooltipText = `До "${nextGrade}": ${comboResult.label}`;
        averageCell.parentNode.dataset.comboSize = comboResult.comboSize;
        averageCell.parentNode.dataset.isFormula = comboResult.isFormula ? '1' : '0';
        averageCell.parentNode.classList.add('mscp-tooltip-trigger');

        averageCell.parentNode.addEventListener('mouseenter', showTooltip);
        averageCell.parentNode.addEventListener('mouseleave', hideTooltip);
    }
}

/**
 * Окрашивает строку с итоговыми оценками (четвертные/годовые)
 * @param {HTMLTableRowElement} row - строка таблицы
 * @returns {void}
 */
function colorizeSummaryRow(row) {
    if (row.childNodes.length < 2) return;

    const finalGrades = [];

    for (let j = 1; j < row.childNodes.length - 1; j++) {
        const cell = row.childNodes[j].firstChild;

        if (isFinalGradeCell(cell)) {
            if (!cell.hasChildNodes()) continue;

            const grade = cell.firstChild.textContent;
            const className = GRADE_CLASSES.final[grade];

            if (className) {
                cell.classList.add(className);
                finalGrades.push(grade);
            }
        }

        if (isYearGradeCell(cell)) {
            if (!cell.hasChildNodes()) continue;

            const grade = cell.firstChild.textContent;
            const className = GRADE_CLASSES.final[grade];

            if (className) {
                cell.classList.add(className);
                //finalGrades.push(grade);
            }
        }
    }

    if (finalGrades.length >= 3) {
        const average = finalGrades.reduce((sum, g) => sum + Number(g), 0) / 3;
        const className = getAverageClass(average, true);

        const averageCell = row.childNodes[row.childNodes.length - 1].firstChild;
        averageCell.parentNode.classList.add(className);
    }
}


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


// ============================================================
// СТИЛИ
// ============================================================

/**
 * Создаёт и добавляет все CSS-стили для скрипта
 * Включает стили для:
 * - Окрашивания оценок (градиенты, сплошные цвета)
 * - Tooltip (динамический, поверх всех элементов)
 * - Кнопок управления
 * - Модального окна настроек
 * @returns {void}
 */
function createStyles() {
    if (document.getElementById('mscp-styles')) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'mscp-styles';
    styleEl.textContent = `
        /* =============================================
           CSS-КЛАССЫ ДЛЯ ОКРАШИВАНИЯ ОЦЕНОК
           ============================================= */

        /* Обычные ячейки с оценками - градиентная заливка */
        .mscp-grade-5 {
            background: linear-gradient(225deg, transparent, ${COLORS.GREEN} 70%);
        }
        .mscp-grade-4 {
            background: linear-gradient(225deg, transparent, ${COLORS.BLUE} 70%);
        }
        .mscp-grade-3 {
            background: linear-gradient(225deg, transparent, ${COLORS.YELLOW} 70%);
        }
        .mscp-grade-2 {
            background: linear-gradient(225deg, transparent, ${COLORS.RED} 70%);
        }

        /* Цепочка двоек - ярко-красная заливка */
        .mscp-grade-bad {
            background: radial-gradient(circle at right top, white 30%, rgb(255, 0, 0) 70%);
        }

        /* Итоговые оценки - сплошной цвет */
        .mscp-final-5 {
            background-color: ${COLORS.GREEN} !important;
        }
        .mscp-final-4 {
            background-color: ${COLORS.BLUE} !important;
        }
        .mscp-final-3 {
            background-color: ${COLORS.YELLOW} !important;
        }
        .mscp-final-2 {
            background-color: ${COLORS.RED} !important;
        }

        /* Недостаточно оценок - красная полоса снизу */
        .mscp-insufficient {
            background: linear-gradient(180deg, transparent 70%, ${COLORS.RED});
        }

        /* Средний балл */
        .mscp-average-5 {
            background-color: ${COLORS.GREEN};
        }
        .mscp-average-4 {
            background-color: ${COLORS.BLUE};
        }
        .mscp-average-3 {
            background-color: ${COLORS.YELLOW};
        }
        .mscp-average-2 {
            background-color: ${COLORS.RED};
        }

        /* Прогресс-бар */
        .mscp-progress {
            /* Динамический градиент задаётся через inline-стиль */
        }

        /* Маркер для ячеек "почти достиг" */
        .mscp-average-almost {
            /* Градиент задаётся через inline-стиль */
        }

        /* Ячейка с tooltip */
        .mscp-tooltip-trigger {
            cursor: help;
        }

        /* =============================================
           ДИНАМИЧЕСКИЙ TOOLTIP (поверх всех элементов)
           ============================================= */

        .mscp-tooltip-dynamic {
            position: fixed;
            padding: 8px 12px;
            background: white;
            color: #333;
            font-size: 13px;
            font-weight: normal;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
            z-index: 99999;
            white-space: nowrap;
            pointer-events: none;
            transform: translate(-50%, -100%);
            border: 1px solid rgba(0, 0, 0, 0.08);
        }

        /* Стрелочка tooltip (сверху) */
        .mscp-tooltip-dynamic::after {
            content: '';
            position: absolute;
            bottom: -7px;
            left: 50%;
            transform: translateX(-50%);
            border: 7px solid transparent;
            border-top-color: white;
        }

        /* Стрелочка tooltip (снизу) */
        .mscp-tooltip-dynamic.mscp-tooltip-below {
            transform: translate(-50%, 0);
        }

        .mscp-tooltip-dynamic.mscp-tooltip-below::after {
            bottom: auto;
            top: -14px;
            border-top-color: transparent;
            border-bottom-color: white;
        }

        /* Цветные badge для оценок в tooltip */
        .mscp-grade-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 18px;
            height: 18px;
            padding: 0 5px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 700;
            margin: 0 1px;
            vertical-align: middle;
        }

        .mscp-grade-badge.mscp-badge-5 {
            background-color: ${COLORS.GREEN};
            color: #0d3d0d;
        }

        .mscp-grade-badge.mscp-badge-4 {
            background-color: ${COLORS.BLUE};
            color: #0d2d4d;
        }

        .mscp-grade-badge.mscp-badge-3 {
            background-color: ${COLORS.YELLOW};
            color: #4d4d0d;
        }

        .mscp-grade-badge.mscp-badge-2 {
            background-color: ${COLORS.RED};
            color: #4d0d0d;
        }

        /* =============================================
           СТИЛИ КНОПОК
           ============================================= */

        .mscp-button {
            line-height: 0;
            padding: 8px;
            border-color: #d6d6df;
            border-style: solid;
            border-width: 1px;
            color: #686A71;
            background: white;
            cursor: pointer;
            transition: background 0.2s ease;
            border-radius: 8px;
        }
        .mscp-button:hover {
            background: #ececec;
        }

        /* =============================================
           СТИЛИ ОКНА НАСТРОЕК
           ============================================= */

        .mscp-modal-overlay {
            position: fixed;
            inset: 0;
            background-color: rgba(15, 23, 42, 0.55);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
        }
        .mscp-modal-window {
            display: flex;
            flex-direction: column;
            width: 720px;
            max-width: calc(100vw - 32px);
            max-height: calc(100vh - 48px);
            background-color: white;
            border-radius: 14px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            color: #1f2937;
        }
        /* С вкладками высота постоянная, чтобы окно не прыгало при переключении */
        .mscp-modal-window.mscp-has-nav {
            height: min(580px, calc(100vh - 48px));
        }
        .mscp-modal-header {
            flex: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 18px 14px 24px;
            border-bottom: 1px solid #e5e7eb;
        }
        .mscp-modal-title {
            margin: 0;
            font-size: 17px;
            font-weight: 600;
            color: #111827;
        }
        .mscp-modal-version {
            margin-left: 10px;
            font-size: 12px;
            font-weight: 400;
            color: #9ca3af;
        }
        .mscp-close-btn {
            background: none;
            border: none;
            font-size: 26px;
            line-height: 1;
            cursor: pointer;
            color: #6b7280;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s ease;
        }
        .mscp-close-btn:hover {
            background-color: #eef0f4;
            color: #111827;
        }

        .mscp-modal-body {
            flex: 1;
            display: flex;
            min-height: 0;
        }
        .mscp-modal-nav {
            flex: none;
            width: 180px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 2px;
            background-color: #f8f9fb;
            border-right: 1px solid #e5e7eb;
        }
        .mscp-modal-nav[hidden] {
            display: none;
        }
        .mscp-nav-item {
            text-align: left;
            padding: 9px 12px;
            border: none;
            border-radius: 8px;
            background: none;
            font: inherit;
            font-size: 14px;
            color: #4b5563;
            cursor: pointer;
        }
        .mscp-nav-item:hover {
            background-color: #eef0f4;
        }
        .mscp-nav-item.mscp-active {
            background-color: #e4e9fc;
            color: #2f4bc4;
            font-weight: 600;
        }
        .mscp-modal-content {
            flex: 1;
            min-width: 0;
            overflow-y: auto;
            padding: 20px 24px 8px;
        }

        .mscp-section {
            margin-bottom: 22px;
        }
        .mscp-section-title {
            margin: 0 0 4px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: #6b7280;
        }

        /* Строка настройки: название и пояснение слева, тумблер или кнопка справа */
        .mscp-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 10px 0;
            border-bottom: 1px solid #f0f1f4;
            cursor: pointer;
        }
        .mscp-row:last-child {
            border-bottom: none;
        }
        .mscp-row-static {
            cursor: default;
        }
        .mscp-row-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
        }
        .mscp-row-title {
            font-size: 14px;
            color: #1f2937;
        }
        .mscp-row-desc {
            font-size: 12px;
            line-height: 1.35;
            color: #6b7280;
        }

        .mscp-switch {
            position: relative;
            flex: none;
            width: 38px;
            height: 22px;
        }
        .mscp-switch input {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            opacity: 0;
            cursor: pointer;
            z-index: 1;
        }
        .mscp-switch-track {
            position: absolute;
            inset: 0;
            border-radius: 11px;
            background-color: #cbd0d9;
            transition: background-color 0.2s ease;
        }
        .mscp-switch-track::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background-color: white;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
            transition: transform 0.2s ease;
        }
        .mscp-switch input:checked + .mscp-switch-track {
            background-color: #496be8;
        }
        .mscp-switch input:checked + .mscp-switch-track::after {
            transform: translateX(16px);
        }
        .mscp-switch input:focus-visible + .mscp-switch-track {
            outline: 2px solid #9db0f5;
            outline-offset: 2px;
        }

        /* Сведения о журнале */
        .mscp-stats {
            display: flex;
            gap: 10px;
            margin-bottom: 22px;
        }
        .mscp-stat {
            flex: 1;
            padding: 10px 12px;
            background-color: #f8f9fb;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
        }
        .mscp-stat b {
            display: block;
            font-size: 18px;
            font-weight: 600;
            color: #111827;
        }
        .mscp-stat span {
            font-size: 12px;
            color: #6b7280;
        }

        .mscp-btn-action {
            flex: none;
            padding: 7px 16px;
            background-color: white;
            color: #374151;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            cursor: pointer;
            font: inherit;
            font-size: 13px;
            font-weight: 500;
            transition: background-color 0.2s ease;
        }
        .mscp-btn-action:hover:not(:disabled) {
            background-color: #f3f4f6;
        }
        .mscp-btn-action:disabled {
            color: #9ca3af;
            cursor: default;
        }

        /* Карточки выбора вида расписания */
        .mscp-options {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-top: 8px;
        }
        .mscp-option {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 10px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            cursor: pointer;
            transition: border-color 0.2s ease, background-color 0.2s ease;
        }
        .mscp-option:hover {
            border-color: #c7d0f5;
        }
        .mscp-option:has(input:checked) {
            border-color: #496be8;
            background-color: #f5f7ff;
        }
        .mscp-option input {
            position: absolute;
            opacity: 0;
            inset: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            cursor: pointer;
        }
        .mscp-thumb {
            width: 100%;
            height: auto;
            margin-bottom: 4px;
            background-color: #f3f4f6;
            border-radius: 8px;
        }
        .mscp-option-title {
            font-size: 14px;
            font-weight: 600;
            color: #111827;
        }

        /* Параметры заменённого расписания */
        .mscp-subpanel {
            margin-top: 16px;
            padding: 2px 16px 10px;
            background-color: #f8f9fb;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
        }
        .mscp-subpanel[hidden] {
            display: none;
        }
        .mscp-subpanel .mscp-row {
            border-bottom-color: #e9ebf0;
        }
        .mscp-hint {
            padding-top: 8px;
        }

        /* Переключатель из нескольких кнопок */
        .mscp-seg {
            flex: none;
            display: inline-flex;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            overflow: hidden;
            background-color: white;
        }
        .mscp-seg label {
            position: relative;
            padding: 6px 12px;
            font-size: 13px;
            color: #374151;
            cursor: pointer;
            white-space: nowrap;
        }
        .mscp-seg label + label {
            border-left: 1px solid #d1d5db;
        }
        .mscp-seg label:has(input:checked) {
            background-color: #496be8;
            color: white;
        }
        .mscp-seg input {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            opacity: 0;
            cursor: pointer;
        }

        @media (max-width: 600px) {
            .mscp-modal-body {
                flex-direction: column;
            }
            .mscp-modal-nav {
                width: auto;
                flex-direction: row;
                border-right: none;
                border-bottom: 1px solid #e5e7eb;
            }
            .mscp-options {
                grid-template-columns: 1fr;
            }
        }
    `;
    document.head.appendChild(styleEl);
}


// ============================================================
// БЫСТРЫЕ КОММЕНТАРИИ В КАРТОЧКЕ ОЦЕНКИ
// ============================================================

/**
 * Записывает текст в textarea так, чтобы React увидел изменение
 * @param {HTMLTextAreaElement} textarea - поле комментария
 * @param {string} text - новый текст
 * @returns {void}
 */
function setTextareaValue(textarea, text) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(textarea, text);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Добавляет кнопки быстрых комментариев под поле комментария в карточке оценки
 * Повторный вызов для того же поля ничего не делает
 * @param {HTMLTextAreaElement} textarea - поле комментария
 * @returns {void}
 */
function addCommentButtons(textarea) {
    const container = textarea.closest('[data-test-component$="InputSharedContainerInTextAreaComponent"]');
    if (!container || container.nextElementSibling?.classList.contains('mscp-comment-presets')) return;

    if (!document.getElementById('mscp-comment-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'mscp-comment-styles';
        styleEl.textContent = `
            .mscp-comment-presets {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-top: 8px;
            }
            .mscp-comment-presets button {
                padding: 4px 10px;
                border: 1px solid #c9ced6;
                border-radius: 6px;
                background: #fff;
                font-size: 12px;
                cursor: pointer;
            }
            .mscp-comment-presets button:hover {
                background: #eef2ff;
            }
        `;
        document.head.appendChild(styleEl);
    }

    const panel = document.createElement('div');
    panel.className = 'mscp-comment-presets';
    CONFIG.COMMENT_PRESETS.forEach(text => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.addEventListener('click', () => {
            setTextareaValue(textarea, text);
            textarea.focus();
        });
        panel.appendChild(button);
    });
    container.after(panel);
}

/**
 * Следит за появлением карточки выставления оценки и добавляет в неё кнопки комментариев
 * Карточка создаётся заново при каждом клике по ячейке журнала
 * @returns {void}
 */
function initCommentPresets() {
    const observer = new MutationObserver(() => {
        document.querySelectorAll('textarea[name="comment"][data-test-component^="markFastCard"]')
            .forEach(addCommentButtons);
    });
    observer.observe(document.body, { childList: true, subtree: true });
}


// ============================================================
// КОМПАКТНОЕ РАСПИСАНИЕ
// ============================================================

/**
 * Сокращает название журнала до "Предмет Класс"
 * "Физика 9-В 9 кл. нем.яз. 26/27" → "Физика 9-В"
 * @param {string} name - полное название журнала
 * @returns {string} Короткое название (если формат не узнан, название без изменений)
 */
function shortenJournalName(name) {
    const match = /^(\S+)\s+(\d{1,2}\s*-\s*\S+)/.exec(name.trim());
    return match ? `${match[1]} ${match[2].replace(/\s+/g, '')}` : name.trim();
}

/**
 * Компактное расписание: страница сайта сжимается так, чтобы целиком помещаться в окно
 * - Убирает шкалу времени: уроки выстраиваются в строки по времени начала
 * - Высота строк и размер содержимого подгоняются под размер окна и ширину столбцов
 * - Название журнала сокращается, тема урока скрывается
 * - Остаются время, кабинет и значки урока и домашнего задания
 * Стили действуют только пока на <body> есть класс mscp-compact
 */
const ScheduleCompact = {
    /** @type {MutationObserver|null} Следит за перерисовкой расписания */
    observer: null,

    /** @type {number} Идентификатор запланированного пересчёта (0 — не запланирован) */
    frame: 0,

    /** @type {HTMLElement|null} Колонка со шкалой времени (кэш) */
    axis: null,

    /**
     * Включает компактное расписание
     * @returns {void}
     */
    start() {
        if (this.observer) return;

        this.addStyles();
        document.body.classList.add('mscp-compact');

        this.observer = new MutationObserver(() => this.schedule());
        this.observer.observe(document.body, { childList: true, subtree: true });
        window.addEventListener('resize', this.onResize);

        this.schedule();
    },

    /**
     * Выключает компактное расписание (стили перестают действовать)
     * @returns {void}
     */
    stop() {
        if (!this.observer) return;

        this.observer.disconnect();
        this.observer = null;
        window.removeEventListener('resize', this.onResize);
        document.body.classList.remove('mscp-compact');
    },

    /** Обработчик изменения размера окна */
    onResize: () => ScheduleCompact.schedule(),

    /**
     * Откладывает пересчёт до следующего кадра
     * @returns {void}
     */
    schedule() {
        if (this.frame) return;

        this.frame = requestAnimationFrame(() => {
            this.frame = 0;
            this.apply();
        });
    },

    /**
     * Находит колонку со шкалой времени (подписи 07:00, 08:00, ...)
     * @returns {HTMLElement|null}
     */
    findAxis() {
        if (this.axis?.isConnected) return this.axis;

        const label = [...document.querySelectorAll('main div')].find(
            element => element.childElementCount === 0 && /^\d{2}:00$/.test(element.textContent.trim())
        );

        for (let element = label; element && element.tagName !== 'MAIN'; element = element.parentElement) {
            if (getComputedStyle(element).position === 'sticky' && element.nextElementSibling) {
                this.axis = element;
                return element;
            }
        }

        return null;
    },

    /**
     * Расставляет уроки по строкам, подгоняет размеры под окно
     * @returns {void}
     */
    apply() {
        const axis = this.findAxis();
        const grid = axis?.nextElementSibling;
        if (!grid) return;

        axis.classList.add('mscp-sch-axis');
        grid.classList.add('mscp-sch-grid');
        grid.parentElement.previousElementSibling?.classList.add('mscp-sch-head');

        const scroller = grid.closest('main');
        const content = [...(scroller?.children ?? [])].find(child => child.contains(grid));
        content?.classList.add('mscp-sch-content');

        // Строка таблицы = время начала урока: в одной строке не бывает уроков с разным началом
        const entries = [];
        for (const day of grid.children) {
            day.classList.add('mscp-sch-day');
            entries.push(...this.collectDay(day));
        }

        const rowKeys = [...new Set(entries.map(entry => entry.key))].sort((a, b) => a - b);
        for (const { slot, card, key } of entries) {
            slot.classList.add('mscp-sch-slot');
            slot.style.setProperty('--mscp-row', rowKeys.indexOf(key) + 1);
            this.decorateCard(card);
        }

        const rows = Math.max(rowKeys.length, 1);
        const top = grid.getBoundingClientRect().top + (scroller?.scrollTop ?? 0);
        const height = Math.max(window.innerHeight - top - 8, rows * 48);
        const columnWidth = grid.firstElementChild?.getBoundingClientRect().width || 190;

        // Масштаб содержимого (1 = шрифт 12px/14px): карточка должна помещаться в строку и в столбец.
        // Числа — размер содержимого при масштабе 1: ширина (с кабинетом / без) и высота
        // (название и значки друг под другом / на одной линии)
        const rowHeight = height / rows;
        const stackedWithRoom = Math.min(columnWidth / 170, rowHeight / 78);
        const sharedWithRoom = Math.min(columnWidth / 170, rowHeight / 56);
        const stackedNoRoom = Math.min(columnWidth / 112, rowHeight / 78);
        const withRoom = Math.max(stackedWithRoom, sharedWithRoom);

        // В узких столбцах кабинет (он одинаков у всех уроков) уступает место более крупному тексту
        const hideRoom = stackedNoRoom > withRoom * 1.15;
        const scale = Math.min(Math.max(hideRoom ? stackedNoRoom : withRoom, 0.6), 1.8);

        grid.classList.toggle('mscp-sch-hide-room', hideRoom);
        grid.style.setProperty('--mscp-rows', rows);
        grid.style.setProperty('--mscp-grid-h', `${Math.floor(height)}px`);
        grid.style.setProperty('--mscp-u', scale.toFixed(3));
    },

    /**
     * Собирает уроки одного дня и определяет ключ строки для каждого
     * Ключ — время начала в минутах, умноженное на 10. Второй урок дня с тем же
     * началом получает ключ на единицу больше, чтобы карточки не накладывались
     * @param {HTMLElement} day - колонка дня
     * @returns {Array<{slot: HTMLElement, card: HTMLElement, key: number}>}
     */
    collectDay(day) {
        const slots = [...day.children]
            .filter(child => child.querySelector(CONFIG.SELECTORS.SCHEDULE_CARD))
            .sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top));

        const seenStarts = new Map();

        return slots.map(slot => {
            const card = slot.querySelector(CONFIG.SELECTORS.SCHEDULE_CARD);
            const time = /(\d{1,2}):(\d{2})/.exec(card.textContent);

            // Без времени в карточке ставим урок после всех остальных, в порядке сверху вниз
            const start = time ? Number(time[1]) * 60 + Number(time[2]) : 1e5 + parseFloat(slot.style.top);
            const duplicates = seenStarts.get(start) ?? 0;
            seenStarts.set(start, duplicates + 1);

            return { slot, card, key: start * 10 + duplicates };
        });
    },

    /**
     * Помечает части карточки урока классами для CSS и сокращает название
     * Сам DOM сайта не меняется: название подменяется через атрибут и ::after
     * @param {HTMLElement} card - карточка урока
     * @returns {void}
     */
    decorateCard(card) {
        const root = card.firstElementChild;
        const body = root?.children[1];
        const nameBox = body?.firstElementChild;
        const nameSpan = nameBox?.firstElementChild;
        if (!nameSpan) return;

        root.classList.add('mscp-sch-root');
        body.classList.add('mscp-sch-body');
        nameBox.classList.add('mscp-sch-namebox');
        nameSpan.classList.add('mscp-sch-name');
        nameSpan.dataset.mscpShort = shortenJournalName(nameSpan.textContent);
        nameSpan.title = nameSpan.textContent.trim();

        for (const child of nameBox.children) {
            if (child !== nameSpan && child.tagName === 'SPAN') {
                child.classList.add('mscp-sch-hide');
            }
        }

        // Значки урока и ДЗ: сайт показывает либо блок под названием, либо блок внутри него
        const hasBadges = element => element.querySelector('[data-test-component$="badgeStatus"]');
        const outerIcons = [...root.children].slice(2).filter(hasBadges);
        const innerIcons = [...nameBox.children].filter(child => child.tagName === 'DIV' && hasBadges(child));

        if (outerIcons.length) {
            outerIcons[0].classList.add('mscp-sch-icons');
            innerIcons.forEach(icons => icons.classList.add('mscp-sch-hide'));
        } else {
            innerIcons.forEach(icons => {
                icons.classList.remove('mscp-sch-hide');
                icons.classList.add('mscp-sch-icons-inline');
            });
        }
    },

    /**
     * Добавляет стили компактного расписания
     * @returns {void}
     */
    addStyles() {
        if (document.getElementById('mscp-compact-styles')) return;

        const styleEl = document.createElement('style');
        styleEl.id = 'mscp-compact-styles';
        styleEl.textContent = `
            /* Шкала времени не нужна: уроки стоят по строкам времени начала.
               Колонку оставляем пустой, чтобы шапка с днями недели не съехала */
            body.mscp-compact .mscp-sch-axis {
                visibility: hidden;
                height: 0 !important;
                overflow: hidden;
            }
            body.mscp-compact .mscp-sch-grid {
                height: auto !important;
                overflow: hidden !important;
            }
            body.mscp-compact .mscp-sch-content {
                height: auto !important;
                min-height: 0 !important;
            }
            /* Подвал страницы ("Пользовательское соглашение") не даёт расписанию поместиться в окно.
               Он перерисовывается сайтом и теряет классы, поэтому скрываем по структуре */
            body.mscp-compact .mscp-sch-content > :not(:has(.mscp-sch-grid)) {
                display: none !important;
            }

            /* Семь дней делят ширину поровну (у сайта у каждого минимум 194px и обрезается воскресенье) */
            body.mscp-compact .mscp-sch-head > :not(:first-child),
            body.mscp-compact .mscp-sch-day {
                flex: 1 1 0 !important;
                min-width: 0 !important;
                width: auto !important;
            }

            /* Колонка дня: строки по числу уроков, вся высота окна */
            body.mscp-compact .mscp-sch-day {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr);
                grid-template-rows: repeat(var(--mscp-rows, 1), minmax(0, 1fr));
                height: var(--mscp-grid-h, auto) !important;
            }
            body.mscp-compact .mscp-sch-day > :not(.mscp-sch-slot) {
                display: none !important;
            }
            body.mscp-compact .mscp-sch-slot {
                position: static !important;
                height: auto !important;
                min-height: 0;
                padding: 0 2px 2px !important;
                grid-row: var(--mscp-row);
                grid-column: 1;
            }
            body.mscp-compact .mscp-sch-slot > div,
            body.mscp-compact .mscp-sch-slot > div > [data-test-component] {
                height: 100% !important;
                box-sizing: border-box;
            }

            /* Содержимое карточки. Размеры считаются от --mscp-u (масштаб, см. apply).
               Свойство zoom не используется: в сетке с zoom Chrome неверно считает выравнивание
               и на широких экранах название уезжало вниз */
            body.mscp-compact .mscp-sch-root {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) auto;
                grid-template-rows: auto minmax(0, 1fr);
                height: 100% !important;
            }

            /* Серая полоска со временем и кабинетом прижата к верху */
            body.mscp-compact .mscp-sch-root > :nth-child(1) {
                grid-column: 1 / -1;
                padding: calc(3px * var(--mscp-u, 1)) calc(6px * var(--mscp-u, 1)) calc(2px * var(--mscp-u, 1)) !important;
            }
            body.mscp-compact .mscp-sch-root > :nth-child(1) * {
                font-size: calc(12px * var(--mscp-u, 1)) !important;
                line-height: 1.3 !important;
            }
            body.mscp-compact .mscp-sch-hide-room .mscp-sch-root > :nth-child(1) > :nth-child(2) {
                display: none !important;
            }
            body.mscp-compact .mscp-sch-body,
            body.mscp-compact .mscp-sch-namebox {
                display: block !important;
                flex: none !important;
                height: auto !important;
                overflow: visible !important;
                min-width: 0;
                margin: 0 !important;
                padding: 0 !important;
            }
            /* Название сразу под серой полоской, с отступом от стенки карточки */
            body.mscp-compact .mscp-sch-body {
                grid-column: 1 / -1;
                grid-row: 2;
                align-self: start;
                padding: calc(6px * var(--mscp-u, 1)) calc(6px * var(--mscp-u, 1)) 0 !important;
            }
            /* Значки внизу справа */
            body.mscp-compact .mscp-sch-icons {
                display: block !important;
                grid-column: 2;
                grid-row: 2;
                align-self: end;
                margin: 0 calc(6px * var(--mscp-u, 1)) calc(5px * var(--mscp-u, 1)) 0 !important;
                height: auto !important;
                min-height: 0 !important;
                padding: 0 !important;
            }

            /* Значки урока и ДЗ. Обёртки сайта добавляют лишние отступы (блок получался вдвое выше значков) */
            body.mscp-compact :is(.mscp-sch-icons, .mscp-sch-icons-inline) :is(div, button) {
                margin: 0 !important;
                padding: 0 !important;
                min-height: 0 !important;
                gap: calc(4px * var(--mscp-u, 1));
            }
            body.mscp-compact :is(.mscp-sch-icons, .mscp-sch-icons-inline) [data-test-component$="badgeStatus"] {
                width: calc(21px * var(--mscp-u, 1)) !important;
                height: calc(21px * var(--mscp-u, 1)) !important;
                padding: calc(3px * var(--mscp-u, 1)) !important;
                box-sizing: border-box;
            }
            body.mscp-compact :is(.mscp-sch-icons, .mscp-sch-icons-inline) svg {
                width: calc(15px * var(--mscp-u, 1)) !important;
                height: calc(15px * var(--mscp-u, 1)) !important;
                min-width: 0 !important;
                min-height: 0 !important;
            }
            body.mscp-compact .mscp-sch-icons-inline {
                display: block !important;
            }
            body.mscp-compact .mscp-sch-hide {
                display: none !important;
            }

            /* Короткое название вместо полного */
            body.mscp-compact .mscp-sch-name {
                display: block !important;
                height: auto !important;
                max-height: none !important;
                font-size: 0 !important;
                line-height: 0 !important;
                -webkit-line-clamp: unset !important;
            }
            body.mscp-compact .mscp-sch-name::after {
                content: attr(data-mscp-short);
                display: block;
                font-size: calc(14px * var(--mscp-u, 1));
                line-height: calc(20px * var(--mscp-u, 1));
                font-weight: 600;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        `;
        document.head.appendChild(styleEl);
    }
};


// ============================================================
// РАСПИСАНИЕ: чтение данных урока из карточки сайта
// ============================================================

/** Цвета предметов: полоска слева на карточке и пометка в легенде */
const SCHEDULE_SUBJECT_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#14b8a6', '#ec4899', '#84cc16', '#f97316', '#64748b'];

/**
 * Определяет номер урока по времени начала и школьному звонку (CONFIG.LESSON_STARTS)
 * @param {number} hours - часы начала урока
 * @param {number} minutes - минуты начала урока
 * @returns {number} номер урока от 1; для нестандартного времени — номер ближайшего по звонку
 */
function lessonNumberFromStart(hours, minutes) {
    const at = hours * 60 + minutes;
    let best = 0;
    let bestDiff = Infinity;

    CONFIG.LESSON_STARTS.forEach((time, index) => {
        const [startHours, startMinutes] = time.split(':').map(Number);
        const diff = Math.abs(startHours * 60 + startMinutes - at);

        if (diff < bestDiff) {
            best = index;
            bestDiff = diff;
        }
    });

    return best + 1;
}

/**
 * Подсказки к значкам "У" (оценки в журнале) и "ДЗ" на карточке урока по статусу из lessonStatusFromColor()
 * Статус comment есть только у "У": оценок нет, но на уроке стоит комментарий
 */
const BADGE_HINTS = {
    journal: {
        done: 'Оценки выставлены',
        late: 'Нет ни одной оценки',
        wait: 'Оценок пока нет, срок ещё не вышел',
        comment: 'Оценок нет, но есть комментарий'
    },
    homework: { done: 'ДЗ выдано', late: 'ДЗ не выдано', wait: 'ДЗ пока не выдано, срок ещё не вышел' }
};

/**
 * Определяет статус значка урока или ДЗ по цвету иконки на сайте
 * @param {string} color - цвет в формате "rgb(r, g, b)"
 * @returns {'done'|'late'|'wait'} зелёный — заполнено, красный — не заполнено, серый — ещё нет
 */
function lessonStatusFromColor(color) {
    const [red, green] = (color.match(/\d+/g) ?? []).map(Number);
    if (green > red + 40) return 'done';
    if (red > green + 60) return 'late';
    return 'wait';
}

/**
 * Подбирает цвет класса: один и тот же класс всегда получает один и тот же цвет
 * Оттенки берутся шагом "золотого угла" от номера класса, поэтому соседние классы (7-А, 7-Б) заметно различаются
 * @param {string} className - класс в виде "10-А"
 * @returns {string} цвет для CSS; пустая строка, если класс не распознан
 */
function classColor(className) {
    const match = /^(\d{1,2})-(.)/u.exec(className);
    if (!match) return '';

    const index = Number(match[1]) * 40 + match[2].toUpperCase().codePointAt(0) % 40;
    return `hsl(${Math.round(index * 137.508) % 360} 65% 42%)`;
}

/**
 * Читает данные урока из карточки сайта
 * Название журнала бывает "Физика 9-В 9 кл. нем.яз. 26/27" и "Алгебра и начала анализа 10-А":
 * класс ищется по шаблону "10-А", предмет — всё, что стоит до него
 * @param {HTMLElement} card - карточка урока сайта
 * @returns {{start: string, end: string, className: string, subject: string, fullName: string,
 *            journal: string, homework: string, isCurrent: boolean}}
 */
function parseLessonCard(card) {
    const time = /^\d+\.\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/.exec(card.textContent.trim());
    const fullName = card.firstElementChild?.children[1]?.firstElementChild?.firstElementChild?.textContent.trim() ?? '';

    const classMatch = /(?:^|\s)(\d{1,2}\s*-\s*[А-ЯЁA-Z])(?=\s|$)/iu.exec(fullName);
    const className = classMatch ? classMatch[1].replace(/\s+/g, '') : '';
    let subject = classMatch ? fullName.slice(0, classMatch.index).trim() : fullName;
    if (!subject && classMatch) {
        subject = fullName.slice(classMatch.index + classMatch[0].length).trim();
    }

    const statusOf = kind => {
        const badge = card.querySelector(`[data-test-component$="${kind}-badgeStatus"]`);
        const target = badge?.querySelector('svg') ?? badge;
        return target ? lessonStatusFromColor(getComputedStyle(target).color) : 'wait';
    };

    // Идущий сейчас урок сайт обводит синей рамкой
    const [red, green, blue] = (getComputedStyle(card.parentElement).borderTopColor.match(/\d+/g) ?? []).map(Number);

    return {
        start: time?.[1] ?? '',
        end: time?.[2] ?? '',
        className,
        subject,
        fullName,
        journal: statusOf('Book'),
        homework: statusOf('Home'),
        isCurrent: blue > red + 60 && blue > green + 20
    };
}


// ============================================================
// СВОЁ РАСПИСАНИЕ
// ============================================================

/**
 * Своё недельное расписание на странице "Расписание уроков"
 * - Карточки сайта остаются в DOM скрытыми, поверх каждой рисуется своя: время (начало и конец),
 *   класс и два статуса (урок и домашнее задание цветом сайта: зелёный / красный / серый)
 * - Название предмета обозначается цветом полоски; если предмет один, оно скрыто
 * - Строки сетки = номера уроков, подписанные слева; номер, которого нет всю неделю, остаётся узким пропуском.
 *   Размеры подгоняются под окно и ширину столбцов
 * - Клик по карточке нажимает "К журналу" в меню оригинальной карточки
 * Стили действуют только пока на <body> есть класс mscp-schedule
 */
const ScheduleLayout = {
    /** @type {MutationObserver|null} Следит за перерисовкой расписания */
    observer: null,

    /** @type {number} Идентификатор запланированного пересчёта (0 — не запланирован) */
    frame: 0,

    /** Номер для уроков, у которых в карточке не нашёлся номер: они идут после всех остальных */
    UNNUMBERED: 1000,

    /** Высота пропуска вместо номера, которого нет всю неделю, в долях высоты строки урока */
    GAP_WEIGHT: 0.3,

    /** @type {HTMLElement|null} Колонка со шкалой времени (кэш) */
    axis: null,

    /** @type {boolean} Идёт ли сейчас открытие журнала через меню сайта */
    isOpening: false,

    /** @type {{showColor: boolean, showLabel: boolean, classColor: boolean, showTime: boolean}} Что показывать на карточках (из настроек) */
    options: { showColor: true, showLabel: false, classColor: true, showTime: true },

    /**
     * Читает из настроек, как помечать предметы и классы
     * @returns {void}
     */
    configure() {
        const settings = loadSettings();
        this.options = {
            showColor: settings.scheduleSubjectMark !== 'label' && settings.scheduleSubjectMark !== 'none',
            showLabel: settings.scheduleSubjectMark === 'label' || settings.scheduleSubjectMark === 'both',
            classColor: settings.scheduleClassColor !== false,
            showTime: settings.scheduleShowTime !== false
        };
    },

    /**
     * Включает своё расписание; если оно уже включено, только применяет новые настройки
     * @returns {void}
     */
    start() {
        this.configure();

        if (this.observer) {
            this.schedule();
            return;
        }

        this.addStyles();
        document.body.classList.add('mscp-schedule');

        this.observer = new MutationObserver(() => this.schedule());
        this.observer.observe(document.body, { childList: true, subtree: true });
        window.addEventListener('resize', this.onResize);

        this.schedule();
    },

    /**
     * Выключает своё расписание (стили перестают действовать, расписание сайта снова видно)
     * @returns {void}
     */
    stop() {
        if (!this.observer) return;

        this.observer.disconnect();
        this.observer = null;
        window.removeEventListener('resize', this.onResize);
        document.body.classList.remove('mscp-schedule');
        document.querySelector(CONFIG.SELECTORS.CALENDAR_BUTTON)?.style.removeProperty('--mscp-cal-top');
        document.querySelector('.mscp-sch-header')?.classList.remove('mscp-sch-header');

        // Свои карточки вне режима не стилизованы: убираем
        this.axis = null;
        document.querySelectorAll('.mscp-card, .mscp-sch-rows').forEach(element => element.remove());
    },

    /** Обработчик изменения размера окна */
    onResize: () => ScheduleLayout.schedule(),

    /**
     * Откладывает пересчёт до следующего кадра
     * @returns {void}
     */
    schedule() {
        if (this.frame) return;

        this.frame = requestAnimationFrame(() => {
            this.frame = 0;
            this.apply();
        });
    },

    /**
     * Находит колонку со шкалой времени (подписи 07:00, 08:00, ...)
     * @returns {HTMLElement|null}
     */
    findAxis() {
        if (this.axis?.isConnected) return this.axis;

        const label = [...document.querySelectorAll('main div')].find(
            element => element.childElementCount === 0 && /^\d{2}:00$/.test(element.textContent.trim())
        );

        for (let element = label; element && element.tagName !== 'MAIN'; element = element.parentElement) {
            if (getComputedStyle(element).position === 'sticky' && element.nextElementSibling) {
                this.axis = element;
                return element;
            }
        }

        return null;
    },

    /**
     * Строит расписание: разметка сетки, карточки, легенда, размеры
     * @returns {void}
     */
    apply() {
        const axis = this.findAxis();
        const grid = axis?.nextElementSibling;
        if (!grid) return;

        axis.classList.add('mscp-sch-axis');
        grid.classList.add('mscp-sch-grid');
        grid.parentElement.previousElementSibling?.classList.add('mscp-sch-head');

        const scroller = grid.closest('main');
        const content = [...(scroller?.children ?? [])].find(child => child.contains(grid));
        content?.classList.add('mscp-sch-content');

        const dates = this.weekDates();
        const entries = [];
        let dayIndex = 0;
        for (const day of grid.children) {
            day.classList.add('mscp-sch-day');
            const dayEntries = this.collectDay(day);
            dayEntries.forEach(entry => { entry.date = dates[dayIndex] ?? ''; });
            entries.push(...dayEntries);
            dayIndex++;
        }

        for (const entry of entries) {
            entry.data = parseLessonCard(entry.card);

            // Оценок нет, но есть комментарий: значок "У" оранжевый
            if (entry.date && entry.data.journal !== 'done') {
                const start = entry.data.start.padStart(5, '0');
                if (ScheduleComments.count(dates[0], dates[dates.length - 1], entry.date, start, entry.data.className)) {
                    entry.data.journal = 'comment';
                }
            }
        }

        // Предметы: цвет полоски на карточке; если предмет один, название не нужно
        const subjects = [...new Set(entries.map(entry => entry.data.subject).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'ru'));
        const useColors = this.options.showColor && subjects.length > 1;
        const colorOf = subject => SCHEDULE_SUBJECT_COLORS[subjects.indexOf(subject) % SCHEDULE_SUBJECT_COLORS.length];

        // Строка таблицы = номер урока; номер, которого нет ни в один день недели, остаётся узким пропуском
        const rows = this.buildRows(entries);
        for (const { slot, data, number, copy } of entries) {
            slot.classList.add('mscp-sch-slot');
            slot.style.setProperty('--mscp-row', rows.start.get(number) + copy);
            this.renderCard(slot, data, useColors && data.subject ? colorOf(data.subject) : '');
        }

        this.renderRowLabels(axis, rows.labels);

        this.placeCalendarButton();

        const top = grid.getBoundingClientRect().top + (scroller?.scrollTop ?? 0);
        const height = Math.max(window.innerHeight - top - 8, rows.weight * 48);
        const columnWidth = grid.firstElementChild?.getBoundingClientRect().width || 190;

        // Масштаб содержимого (1 = класс 19px, время 12px): карточка помещается в строку и в столбец.
        // Числа — размер содержимого при масштабе 1: ширина (прямоугольник класса добавляет отступы)
        // и высота (подпись предмета и время добавляют по строке)
        const needWidth = this.options.classColor ? 142 : 132;
        const needHeight = 37 + (this.options.showLabel ? 14 : 0) + (this.options.showTime ? 15 : 0);
        const scale = Math.min(Math.max(Math.min(columnWidth / needWidth, (height / rows.weight) / needHeight), 0.6), 1.6);

        // Колонка номеров уроков (бывшая шкала времени) строится по той же сетке, что и дни
        for (const element of [grid, axis]) {
            element.style.setProperty('--mscp-tpl', rows.template);
            element.style.setProperty('--mscp-grid-h', `${Math.floor(height)}px`);
            element.style.setProperty('--mscp-u', scale.toFixed(3));
        }
        // Длинное название предмета переносится на вторую строку, если в карточке остаётся место
        grid.style.setProperty('--mscp-lines', (height / rows.weight) / scale >= needHeight + 14 ? 2 : 1);
    },

    /**
     * Даты показанной недели по подписям колонок ("26 окт", "27 окт", ...)
     * Год в подписи не указан: берётся тот, при котором дата ближе всего к сегодняшнему дню
     * @returns {string[]} семь дней ГГГГ-ММ-ДД; пустой массив, если подписи не распознаны
     */
    weekDates() {
        const head = document.querySelector('.mscp-sch-head');
        const months = ['янв', 'фев', 'мар', 'апр', 'ма[яй]', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
        const today = new Date();

        const dates = [...(head?.children ?? [])].map(cell => {
            const match = /(\d{1,2})\s+([а-яё]+)/i.exec(cell.textContent);
            const month = match ? months.findIndex(name => new RegExp(`^${name}`, 'i').test(match[2])) : -1;
            if (month < 0) return '';

            const nearest = [-1, 0, 1]
                .map(shift => new Date(today.getFullYear() + shift, month, Number(match[1])))
                .sort((a, b) => Math.abs(a - today) - Math.abs(b - today))[0];
            return ColleagueApi.isoDate(nearest);
        }).filter(Boolean);

        return dates.length === 7 ? dates : [];
    },

    /**
     * Собирает уроки одного дня и определяет номер урока для каждого
     * Номер определяется по времени начала и школьному звонку (CONFIG.LESSON_STARTS). Второй урок дня с тем же
     * номером (например, деление класса на группы) получает copy = 1 и встаёт в следующую строку
     * @param {HTMLElement} day - колонка дня
     * @returns {Array<{slot: HTMLElement, card: HTMLElement, number: number, copy: number}>}
     */
    collectDay(day) {
        const slots = [...day.children]
            .filter(child => child.querySelector(CONFIG.SELECTORS.SCHEDULE_CARD))
            .sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top));

        const seenNumbers = new Map();

        return slots.map(slot => {
            const card = slot.querySelector(CONFIG.SELECTORS.SCHEDULE_CARD);
            // Время начала из "2. 09:30 - 10:15"; число перед точкой сайт считает внутри дня, его не берём
            const match = /^\d+\.\s*(\d{1,2}):(\d{2})/.exec(card.textContent.trim());

            // Без времени в карточке урок идёт после всех остальных, в порядке сверху вниз
            const number = match ? lessonNumberFromStart(Number(match[1]), Number(match[2])) : this.UNNUMBERED;
            const copy = seenNumbers.get(number) ?? 0;
            seenNumbers.set(number, copy + 1);

            return { slot, card, number, copy };
        });
    },

    /**
     * Раскладывает номера уроков по строкам сетки
     * От первого до последнего номера недели идут все номера подряд: если какого-то урока нет
     * ни в один день, под него остаётся узкая пустая строка, а следующие уроки не сдвигаются
     * @param {Array<{number: number, copy: number}>} entries - уроки недели
     * @returns {{template: string, start: Map<number, number>, labels: Array<{number: number|string, row: number, span: number}>, weight: number}}
     *          template — значение grid-template-rows, start — первая строка каждого номера,
     *          labels — подписи колонки номеров, weight — высота в «строках урока» (пропуск считается долей)
     */
    buildRows(entries) {
        // Сколько строк нужно номеру: максимум уроков с этим номером в один день
        const copies = new Map();
        for (const { number, copy } of entries) {
            copies.set(number, Math.max(copies.get(number) ?? 0, copy + 1));
        }

        const numbers = [...copies.keys()].filter(number => number !== this.UNNUMBERED);
        const order = [];
        for (let number = Math.min(...numbers); number <= Math.max(...numbers); number++) {
            order.push(number);
        }
        if (copies.has(this.UNNUMBERED)) order.push(this.UNNUMBERED);

        const tracks = [];
        const start = new Map();
        const labels = [];
        let weight = 0;

        for (const number of order) {
            if (!copies.has(number)) {
                tracks.push(`minmax(0, ${this.GAP_WEIGHT}fr)`);
                weight += this.GAP_WEIGHT;
                continue;
            }

            const span = copies.get(number);
            start.set(number, tracks.length + 1);
            labels.push({ number: number === this.UNNUMBERED ? '' : number, row: tracks.length + 1, span });
            for (let i = 0; i < span; i++) tracks.push('minmax(0, 1fr)');
            weight += span;
        }

        return {
            template: tracks.join(' ') || 'minmax(0, 1fr)',
            start,
            labels,
            weight: Math.max(weight, 1)
        };
    },

    /**
     * Рисует в колонке слева номера уроков (пересоздаёт только если набор подписей изменился)
     * Оригинальные подписи часов сайта скрыты стилем, наша колонка добавляется внутрь той же колонки
     * @param {HTMLElement} axis - колонка шкалы времени сайта
     * @param {Array<{number: number|string, row: number, span: number}>} labels - подписи
     * @returns {void}
     */
    renderRowLabels(axis, labels) {
        const signature = JSON.stringify(labels);
        let box = axis.querySelector(':scope > .mscp-sch-rows');
        if (box?.dataset.signature === signature) return;

        box?.remove();
        box = document.createElement('div');
        box.className = 'mscp-sch-rows';
        box.dataset.signature = signature;

        for (const { number, row, span } of labels) {
            const label = document.createElement('div');
            label.className = 'mscp-row-label';
            label.style.gridRow = `${row} / span ${span}`;
            label.textContent = number;
            box.append(label);
        }

        axis.append(box);
    },

    /**
     * Рисует свою карточку внутри ячейки сетки (пересоздаёт только если данные изменились)
     * @param {HTMLElement} slot - ячейка сетки с оригинальной карточкой сайта
     * @param {Object} data - данные урока (см. parseLessonCard)
     * @param {string} color - цвет полоски предмета, пустая строка — без полоски
     * @returns {void}
     */
    renderCard(slot, data, color) {
        // Подпись предмета нужна, только если класс показан отдельно: иначе предмет уже стоит на его месте
        const label = this.options.showLabel && data.className ? data.subject : '';
        const classBox = this.options.classColor ? classColor(data.className) : '';
        const showTime = this.options.showTime;
        const signature = JSON.stringify([data, color, label, classBox, showTime]);
        let element = slot.querySelector(':scope > .mscp-card');
        if (element?.dataset.signature === signature) return;

        element?.remove();

        const create = (tag, className, text = '') => {
            const node = document.createElement(tag);
            node.className = className;
            node.textContent = text;
            return node;
        };

        element = create('div', 'mscp-card');
        element.dataset.signature = signature;
        element.classList.toggle('mscp-card-plain', !color);
        element.classList.toggle('mscp-card-now', data.isCurrent);
        if (color) element.style.setProperty('--mscp-c', color);
        element.title = `${data.fullName}\nКлик — открыть урок в журнале`;

        const head = create('div', 'mscp-card-head');
        const classElement = create('span', 'mscp-card-class', data.className || data.subject);
        if (classBox) {
            classElement.classList.add('mscp-card-chip');
            classElement.style.setProperty('--mscp-k', classBox);
        }
        head.append(classElement);

        const badges = create('span', 'mscp-card-badges');
        const journalBadge = create('span', `mscp-badge mscp-badge-${data.journal}`, 'У');
        journalBadge.title = BADGE_HINTS.journal[data.journal];
        const homeworkBadge = create('span', `mscp-badge mscp-badge-${data.homework}`, 'ДЗ');
        homeworkBadge.title = BADGE_HINTS.homework[data.homework];
        badges.append(journalBadge, homeworkBadge);
        head.append(badges);

        element.append(head);
        if (label) element.append(create('div', 'mscp-card-subject', label));
        if (showTime) element.append(create('div', 'mscp-card-time', `${data.start}–${data.end}`));
        element.addEventListener('click', () => this.openJournal(slot));

        slot.append(element);
    },

    /**
     * Ставит кнопку календаря сайта в правый край строки "Расписание уроков" и сужает эту строку
     * Верхняя белая полоса (aside с названием школы) скрыта стилем. Сама кнопка остаётся в DOM сайта
     * (у неё остаются обработчики), поэтому не переносится, а прикрепляется поверх строки
     * @returns {void}
     */
    placeCalendarButton() {
        const prev = document.querySelector(CONFIG.SELECTORS.SCHEDULE_WEEK_PREV);
        const button = document.querySelector(CONFIG.SELECTORS.CALENDAR_BUTTON);
        if (!prev || !button) return;

        prev.closest('header')?.classList.add('mscp-sch-header');

        const row = document.querySelector('[data-test-component="scheduleHeaderSettingsView"]') ?? prev;
        const rect = row.getBoundingClientRect();
        button.style.setProperty('--mscp-cal-top', `${Math.round(rect.top + (rect.height - 28) / 2)}px`);
    },

    /**
     * Открывает урок в журнале: нажимает оригинальную карточку и в её меню кнопку "К журналу"
     * Меню на это время скрыто, чтобы не мигало
     * @param {HTMLElement} slot - ячейка сетки с оригинальной карточкой сайта
     * @returns {Promise<void>}
     */
    async openJournal(slot) {
        if (this.isOpening) return;
        this.isOpening = true;
        document.body.classList.add('mscp-sch-silent');

        try {
            const original = slot.querySelector(CONFIG.SELECTORS.SCHEDULE_CARD);
            (original?.querySelector('span') ?? original)?.click();

            const button = await Utils.waitUntil(() => [...document.querySelectorAll('body > .base-Popper-root button')]
                .find(candidate => candidate.textContent.trim() === 'К журналу'), 3000);
            button.click();
        } catch (error) {
            console.error('Не удалось открыть журнал урока:', error);
        } finally {
            setTimeout(() => {
                document.body.classList.remove('mscp-sch-silent');
                this.isOpening = false;
            }, 800);
        }
    },

    /**
     * Добавляет стили своего расписания
     * @returns {void}
     */
    addStyles() {
        if (document.getElementById('mscp-schedule-styles')) return;

        const u = 'var(--mscp-u, 1)';
        const cal = CONFIG.SELECTORS.CALENDAR_BUTTON;
        const styleEl = document.createElement('style');
        styleEl.id = 'mscp-schedule-styles';
        styleEl.textContent = `
            /* Шкала времени не нужна: уроки стоят по номерам. Колонка остаётся (шапка с днями недели
               не должна съехать), но вместо часов в ней наши номера уроков на одной сетке с днями */
            body.mscp-schedule .mscp-sch-axis {
                height: var(--mscp-grid-h, 0) !important;
                overflow: hidden;
            }
            body.mscp-schedule .mscp-sch-axis > :not(.mscp-sch-rows) {
                display: none !important;
            }
            body.mscp-schedule .mscp-sch-rows {
                display: grid;
                grid-template-columns: minmax(0, 1fr);
                grid-template-rows: var(--mscp-tpl, minmax(0, 1fr));
                height: 100%;
            }
            body.mscp-schedule .mscp-row-label {
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: calc(18px * ${u});
                font-weight: 700;
                color: #9ca3af;
            }
            body.mscp-schedule .mscp-sch-grid {
                height: auto !important;
                overflow: hidden !important;
            }
            body.mscp-schedule .mscp-sch-content {
                height: auto !important;
                min-height: 0 !important;
            }
            /* Подвал страницы ("Пользовательское соглашение") не даёт расписанию поместиться в окно.
               Он перерисовывается сайтом и теряет классы, поэтому скрываем по структуре */
            body.mscp-schedule .mscp-sch-content > :not(:has(.mscp-sch-grid)) {
                display: none !important;
            }

            /* Семь дней делят ширину поровну (у сайта у каждого минимум 194px и обрезается воскресенье) */
            body.mscp-schedule .mscp-sch-head > :not(:first-child),
            body.mscp-schedule .mscp-sch-day {
                flex: 1 1 0 !important;
                min-width: 0 !important;
                width: auto !important;
            }

            /* Колонка дня: строки по номерам уроков (с узкими пропусками), вся высота окна */
            body.mscp-schedule .mscp-sch-day {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr);
                grid-template-rows: var(--mscp-tpl, minmax(0, 1fr));
                height: var(--mscp-grid-h, auto) !important;
            }
            body.mscp-schedule .mscp-sch-day > :not(.mscp-sch-slot) {
                display: none !important;
            }
            body.mscp-schedule .mscp-sch-slot {
                position: static !important;
                height: auto !important;
                min-height: 0;
                padding: 0 2px 2px !important;
                grid-row: var(--mscp-row);
                grid-column: 1;
            }
            /* Оригинальная карточка сайта остаётся в DOM (её меню нужно для "К журналу"), но не видна */
            body.mscp-schedule .mscp-sch-slot > :not(.mscp-card) {
                display: none !important;
            }

            /* Своя карточка */
            body.mscp-schedule .mscp-card {
                box-sizing: border-box;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding: calc(4px * ${u}) calc(6px * ${u}) calc(4px * ${u}) calc(8px * ${u});
                background: #fff;
                border: 1px solid #e5e7eb;
                border-left: calc(4px * ${u}) solid var(--mscp-c, #e5e7eb);
                border-radius: calc(6px * ${u});
                overflow: hidden;
                cursor: pointer;
            }
            body.mscp-schedule .mscp-card-plain {
                border-left-width: 1px;
            }
            body.mscp-schedule .mscp-card:hover {
                border-color: #9ca3af;
                border-left-color: var(--mscp-c, #9ca3af);
            }
            /* Рамка текущего урока внутри карточки: снаружи её закрывали бы соседние карточки (зазор между ними 2px) */
            body.mscp-schedule .mscp-card-now {
                border-color: #3b6cf0;
                border-left-color: var(--mscp-c, #3b6cf0);
                box-shadow: inset 0 0 0 1px #3b6cf0;
            }
            body.mscp-schedule .mscp-card-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: calc(4px * ${u});
            }
            body.mscp-schedule .mscp-card-class {
                font-size: calc(19px * ${u});
                line-height: 1.1;
                font-weight: 700;
                color: #111827;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            /* Цветной прямоугольник у класса */
            body.mscp-schedule .mscp-card-chip {
                padding: calc(1px * ${u}) calc(5px * ${u});
                border-radius: calc(4px * ${u});
                background: var(--mscp-k);
                color: #fff;
            }
            body.mscp-schedule .mscp-card-subject {
                font-size: calc(11px * ${u});
                line-height: 1.2;
                color: #374151;
                overflow: hidden;
                word-break: break-word;
                display: -webkit-box;
                -webkit-box-orient: vertical;
                -webkit-line-clamp: var(--mscp-lines, 1);
            }
            body.mscp-schedule .mscp-card-time {
                font-size: calc(12px * ${u});
                line-height: 1.2;
                color: #6b7280;
                white-space: nowrap;
            }
            body.mscp-schedule .mscp-card-badges {
                display: flex;
                gap: calc(3px * ${u});
                flex: none;
            }

            /* Статусы в цветах значков сайта: зелёный, красный, серый */
            body.mscp-schedule .mscp-badge {
                font-size: calc(11px * ${u});
                font-weight: 600;
                line-height: 1;
                padding: calc(3px * ${u}) calc(5px * ${u});
                border-radius: calc(5px * ${u});
            }
            body.mscp-schedule .mscp-badge-done {
                background: rgba(22, 207, 3, 0.21);
                color: #005e15;
            }
            body.mscp-schedule .mscp-badge-late {
                background: rgba(255, 19, 19, 0.11);
                color: #a60000;
            }
            body.mscp-schedule .mscp-badge-wait {
                background: rgba(11, 33, 66, 0.09);
                color: #44506d;
            }
            body.mscp-schedule .mscp-badge-comment {
                background: rgba(14, 165, 233, 0.22);
                color: #0b5b86;
            }

            /* Верхняя белая полоса с названием школы не нужна; кнопка календаря уходит в строку расписания */
            body.mscp-schedule aside:has(${cal}) {
                height: 0 !important;
                min-height: 0 !important;
                padding: 0 !important;
                border: 0 !important;
                overflow: visible !important;
                /* Выше строки шапки расписания (у неё тоже z-index 2 и белый фон): иначе она закрывает кнопку */
                z-index: 3 !important;
            }
            body.mscp-schedule aside:has(${cal}) *:not(${cal}):not(:has(${cal})):not(${cal} *) {
                display: none !important;
            }
            body.mscp-schedule ${cal} {
                position: fixed !important;
                top: var(--mscp-cal-top, 130px) !important;
                right: 12px !important;
                z-index: 20;
            }
            /* Строка "Расписание уроков" ниже; справа остаётся место под кнопку календаря */
            body.mscp-schedule .mscp-sch-header > div {
                padding-top: 6px !important;
                padding-bottom: 6px !important;
                padding-right: 52px !important;
            }

            /* Меню оригинальной карточки скрыто, пока оно нужно только для кнопки "К журналу" */
            body.mscp-sch-silent > .base-Popper-root {
                visibility: hidden !important;
            }
        `;
        document.head.appendChild(styleEl);
    }
};


// ============================================================
// РАСПИСАНИЕ КОЛЛЕГ: запросы к API сайта и кеш в localStorage
// ============================================================

/**
 * Получает списки учителей и классов школы и недельное расписание любого учителя или класса
 * - Вход берётся у самого сайта: токен из cookie, год и школа из его localStorage, пароли не нужны
 * - Всё полученное кладётся в localStorage (ключ CONFIG.COLLEAGUES.CACHE_KEY), чтобы не гонять лишние запросы:
 *   списки учителей и классов живут неделю, текущая и будущие недели — несколько часов, прошедшие недели не меняются
 * - Если сайт не ответил, а в кеше есть устаревшие данные, отдаются они с пометкой stale
 * - Закреплённые учителя и классы, последний выбор и режим лежат отдельным ключом: сброс кеша их не трогает
 */
const ColleagueApi = {
    /** @type {{teachers: ?{key: string, at: number, list: Array}, classes: ?{key: string, at: number, list: Array}, weeks: Object}|null} Кеш в памяти, зеркало localStorage */
    store: null,

    /**
     * Читает значение cookie
     * @param {string} name - имя cookie
     * @returns {string} значение; пустая строка, если cookie нет
     */
    readCookie(name) {
        const part = document.cookie.split('; ').find(item => item.startsWith(`${name}=`));
        return part ? decodeURIComponent(part.slice(name.length + 1)) : '';
    },

    /**
     * Читает JSON из localStorage сайта
     * @param {string} key - ключ
     * @returns {*} значение; null, если ключа нет или он не JSON
     */
    readSiteValue(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch (error) {
            return null;
        }
    },

    /**
     * Данные текущего входа: токен, учебный год, школа и профиль учителя
     * @returns {{token: string, year: number, school: number, profile: number}|null} null, если вход не определён
     */
    session() {
        const info = this.readSiteValue('profileInfo');
        const year = Number(this.readSiteValue('MES_API_YEAR_ID') ?? this.readSiteValue('currentAcademicYear')?.id);
        const profile = Number(info?.id ?? this.readCookie('profile_id'));
        const token = this.readCookie('aupd_token');

        if (!token || !year || !info?.school_id || !profile) return null;
        return { token, year, school: info.school_id, profile };
    },

    /**
     * GET-запрос к API сайта
     * @param {string} path - путь после /api/ej
     * @param {Object} params - параметры запроса
     * @returns {Promise<Array>} тело ответа
     * @throws {Error} с полем status (0 — вход не определён, иначе код ответа сайта)
     */
    async get(path, params) {
        const session = this.session();
        if (!session) throw Object.assign(new Error('Не удалось определить вход'), { status: 0 });

        const response = await fetch(`/api/ej${path}?${new URLSearchParams(params)}`, {
            headers: {
                'Auth-Token': session.token,
                'Profile-Id': String(session.profile),
                'x-mes-subsystem': 'teacherweb',
                Accept: 'application/json'
            }
        });
        if (!response.ok) throw Object.assign(new Error(`Сайт ответил ${response.status}`), { status: response.status });

        return response.json();
    },

    /**
     * Понятное сообщение об ошибке запроса
     * @param {Error} error - ошибка из get()
     * @returns {string}
     */
    describeError(error) {
        if (error.status === 0) return 'Не удалось определить вход. Обновите страницу.';
        if (error.status === 401) return 'Вход устарел. Обновите страницу или войдите заново.';
        if (error.status === 403) return 'У вашей учётной записи нет доступа к расписанию этого учителя.';
        return `Не удалось получить данные: ${error.message}`;
    },

    // ---------- даты ----------

    /**
     * Дата в виде ГГГГ-ММ-ДД по местному времени (toISOString сдвигает день по UTC)
     * @param {Date} date
     * @returns {string}
     */
    isoDate(date) {
        const pad = value => String(value).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    },

    /**
     * Прибавляет дни, время обнуляется
     * @param {Date} date
     * @param {number} days
     * @returns {Date}
     */
    addDays(date, days) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
    },

    /**
     * Понедельник недели, в которую входит дата
     * @param {Date} date
     * @returns {Date}
     */
    weekStart(date) {
        return this.addDays(date, -((date.getDay() + 6) % 7));
    },

    // ---------- кеш ----------

    /**
     * Кеш из памяти; при первом обращении читается из localStorage
     * @returns {{teachers: ?Object, classes: ?Object, weeks: Object}}
     */
    load() {
        if (this.store) return this.store;

        let saved = null;
        try {
            saved = JSON.parse(localStorage.getItem(CONFIG.COLLEAGUES.CACHE_KEY));
        } catch (error) {
            console.error('Ошибка чтения кеша расписаний:', error);
        }

        this.store = { teachers: saved?.teachers ?? null, classes: saved?.classes ?? null, weeks: saved?.weeks ?? {} };
        return this.store;
    },

    /**
     * Сохраняет кеш; лишние старые недели удаляются, при нехватке места убирается половина недель
     * @returns {void}
     */
    save() {
        const weeks = this.store.weeks;
        const keys = Object.keys(weeks).sort((a, b) => weeks[a].at - weeks[b].at);
        keys.slice(0, Math.max(0, keys.length - CONFIG.COLLEAGUES.MAX_WEEKS)).forEach(key => delete weeks[key]);

        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                localStorage.setItem(CONFIG.COLLEAGUES.CACHE_KEY, JSON.stringify(this.store));
                return;
            } catch (error) {
                const oldest = Object.keys(weeks).sort((a, b) => weeks[a].at - weeks[b].at);
                oldest.slice(0, Math.ceil(oldest.length / 2)).forEach(key => delete weeks[key]);
            }
        }
    },

    /**
     * Полностью очищает кеш расписаний (закреплённые учителя и классы остаются)
     * @returns {void}
     */
    clear() {
        this.store = { teachers: null, classes: null, weeks: {} };
        try {
            localStorage.removeItem(CONFIG.COLLEAGUES.CACHE_KEY);
        } catch (error) {
            console.error('Ошибка очистки кеша расписаний:', error);
        }
    },

    /**
     * Закреплённые и последние выбранные учитель и класс, последний открытый режим
     * @returns {{ids: number[], last: ?number, classIds: number[], lastClass: ?number, mode: string}}
     *          ids и last — учителя, classIds и lastClass — классы, mode — 'teachers' или 'classes'
     */
    loadFavorites() {
        try {
            const saved = JSON.parse(localStorage.getItem(CONFIG.COLLEAGUES.FAVORITES_KEY));
            return {
                ids: saved?.ids ?? [],
                last: saved?.last ?? null,
                classIds: saved?.classIds ?? [],
                lastClass: saved?.lastClass ?? null,
                mode: saved?.mode === 'classes' ? 'classes' : 'teachers'
            };
        } catch (error) {
            return { ids: [], last: null, classIds: [], lastClass: null, mode: 'teachers' };
        }
    },

    /**
     * @param {{ids: number[], last: ?number, classIds: number[], lastClass: ?number, mode: string}} favorites
     * @returns {void}
     */
    saveFavorites(favorites) {
        try {
            localStorage.setItem(CONFIG.COLLEAGUES.FAVORITES_KEY, JSON.stringify(favorites));
        } catch (error) {
            console.error('Ошибка сохранения списка учителей:', error);
        }
    },

    // ---------- данные ----------

    /**
     * Список из кеша, если он свежий, иначе запрос; при неудаче — устаревший список из кеша
     * @param {'teachers'|'classes'} slot - какой список
     * @param {function(number, number): Promise<Array>} fetchList - запрос списка, получает учебный год и школу
     * @param {boolean} force - игнорировать кеш
     * @returns {Promise<{list: Array, at: number, stale: boolean}>}
     */
    async getList(slot, fetchList, force) {
        const { year, school } = this.session() ?? {};
        const key = `${school}-${year}`;
        const cached = this.load()[slot];
        const usable = cached?.key === key ? cached : null;

        if (usable && !force && Date.now() - usable.at < CONFIG.COLLEAGUES.TEACHERS_TTL_MS) {
            return { list: usable.list, at: usable.at, stale: false };
        }

        try {
            const list = await fetchList(year, school);
            const store = this.load();
            store[slot] = { key, at: Date.now(), list };
            this.save();
            return { list, at: store[slot].at, stale: false };
        } catch (error) {
            if (usable) return { list: usable.list, at: usable.at, stale: true };
            throw error;
        }
    },

    /**
     * Список учителей школы (по 100 на страницу)
     * @param {boolean} [force=false] - игнорировать кеш
     * @returns {Promise<{list: Array<{id: number, name: string, subjects: string}>, at: number, stale: boolean}>}
     */
    getTeachers(force = false) {
        return this.getList('teachers', async (year, school) => {
            const profiles = [];
            for (let page = 1; page <= 20; page++) {
                const data = await this.get('/core/teacher/v1/teacher_profiles', {
                    academic_year_id: year, school_id: school, per_page: 100, page
                });
                profiles.push(...data);
                if (data.length < 100) break;
            }

            return profiles
                .filter(profile => !profile.deleted && !profile.virtual)
                .map(profile => ({
                    id: profile.id,
                    name: profile.name,
                    subjects: (profile.subjects ?? []).map(subject => subject.name).slice(0, 3).join(', ')
                }))
                .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
        }, force);
    },

    /**
     * Список классов школы, по параллелям
     * @param {boolean} [force=false] - игнорировать кеш
     * @returns {Promise<{list: Array<{id: number, name: string, level: number, hint: string}>, at: number, stale: boolean}>}
     */
    getClasses(force = false) {
        return this.getList('classes', async (year, school) => {
            const units = await this.get('/core/teacher/v1/class_units', {
                academic_year_id: year, school_id: school, per_page: 200
            });

            return units
                .map(unit => ({
                    id: unit.id,
                    name: unit.name,
                    level: Number.parseInt(unit.name, 10) || unit.class_level_id || 0,
                    hint: unit.student_count ? `${unit.student_count} уч.` : ''
                }))
                .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'ru'));
        }, force);
    },

    /**
     * Уроки учителя или класса за неделю по дням и номерам уроков школьного звонка
     * Отменённые уроки и уроки, перенесённые на другую дату, не берутся: сайт отдаёт их на старом месте
     * @param {{type: 'teacher'|'class', id: number}} owner - чьё расписание: учителя или класса
     * @param {Date} monday - понедельник нужной недели
     * @param {boolean} [force=false] - игнорировать кеш
     * @returns {Promise<{days: Object<string, Array<[number, string, string, string, string]>>, at: number, stale: boolean, fromCache: boolean}>}
     *          days: {ГГГГ-ММ-ДД: [[номер урока, время начала, класс, предмет, учитель], ...]}
     */
    async getWeek(owner, monday, force = false) {
        const isClass = owner.type === 'class';
        const from = this.isoDate(monday);
        const to = this.isoDate(this.addDays(monday, 6));
        // Ключ учителя без приставки: недели, сохранённые до появления классов, остаются в силе
        const key = `${isClass ? 'c' : ''}${owner.id}|${from}`;
        const cached = this.load().weeks[key];

        // Прошедшая неделя не меняется, остальные устаревают
        const isPast = to < this.isoDate(new Date());
        const isFresh = cached && (isPast || Date.now() - cached.at < CONFIG.COLLEAGUES.WEEK_TTL_MS);
        if (isFresh && !force) return { days: cached.days, at: cached.at, stale: false, fromCache: true };

        try {
            const items = [];
            for (let page = 1; page <= 5; page++) {
                const data = await this.get('/plan/teacher/v1/schedule_items', {
                    academic_year_id: this.session()?.year,
                    ...(isClass ? { class_unit_id: owner.id } : { teacher_id: owner.id }),
                    from, to, with_group_class_subject_info: true, per_page: 300, page
                });
                items.push(...data);
                if (data.length < 300) break;
            }

            const days = this.compactWeek(items);
            this.load().weeks[key] = { at: Date.now(), days };
            this.save();
            return { days, at: this.load().weeks[key].at, stale: false, fromCache: false };
        } catch (error) {
            if (cached) return { days: cached.days, at: cached.at, stale: true, fromCache: true };
            throw error;
        }
    },

    /**
     * "Байч Екатерина Юрьевна" → "Байч Е.Ю."
     * @param {?string} fullName - ФИО полностью
     * @returns {string} пустая строка, если имени нет
     */
    shortName(fullName) {
        const [surname, ...rest] = (fullName ?? '').trim().split(/\s+/);
        return [surname, rest.map(part => `${part[0]}.`).join('')].filter(Boolean).join(' ');
    },

    /**
     * Сворачивает ответ сайта в короткий вид для кеша
     * Номер урока считается по времени начала: поле lesson_number в ответе не школьный номер
     * @param {Array} items - записи schedule_items
     * @returns {Object<string, Array<[number, string, string, string, string]>>}
     */
    compactWeek(items) {
        const pad = value => String(value).padStart(2, '0');
        const days = {};

        items.forEach(item => {
            if (item.cancelled || item.transferred_to_date) return;

            const [year, month, day] = item.date;
            const [hours, minutes] = item.time;
            const iso = `${year}-${pad(month)}-${pad(day)}`;

            (days[iso] ??= []).push([
                lessonNumberFromStart(hours, minutes),
                `${pad(hours)}:${pad(minutes)}`,
                item.class_unit_name ?? '',
                item.subject_name ?? '',
                this.shortName(item.teacher_name)
            ]);
        });

        Object.values(days).forEach(lessons => lessons.sort((a, b) => a[1].localeCompare(b[1])));
        return days;
    }
};


// ============================================================
// РАСПИСАНИЕ КОЛЛЕГ И КЛАССОВ: окно с выбором и сеткой недели
// ============================================================

/**
 * Окно "Расписание коллег"
 * - Вверху слева переключатель "Учителя | Классы", ниже список с поиском и закреплением; справа сетка недели:
 *   дни и номера уроков школьного звонка
 * - У учителя в занятой ячейке класс и предмет, у класса — предмет и учитель (подгруппы идут друг под другом);
 *   свободное время зелёное
 * - Режим "Свободны вместе со мной" берёт ваше расписание и выделяет часы, свободные у обоих
 * - Открывается на неделе, которая выбрана на странице расписания; дальше недели листаются в самом окне
 * - Свободно = нет урока в расписании; внеурочка, дежурства и совещания в нём не учитываются
 */
const Colleagues = {
    /** Дней в сетке: понедельник — суббота */
    DAYS: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],

    /** Месяцы в родительном падеже: так их пишет шапка расписания */
    MONTHS: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],

    /** @type {HTMLElement|null} Оверлей открытого окна */
    overlay: null,

    /** @type {Function|null} Обработчик Escape открытого окна */
    onKeydown: null,

    /** Что сейчас выбрано и загружено; пересоздаётся при каждом открытии */
    state: null,

    /** @type {number} Номер последней загрузки: ответ более ранней игнорируется */
    loadId: 0,

    /**
     * Понедельник недели, открытой на странице расписания
     * @returns {Date} при неудаче разбора — понедельник текущей недели
     */
    pageMonday() {
        const text = document.querySelector(CONFIG.SELECTORS.SCHEDULE_WEEK_LABEL)?.textContent ?? '';
        const match = /(\d{1,2})\s+([а-яё]+)\s+(\d{4})/iu.exec(text);
        const month = match ? this.MONTHS.indexOf(match[2].toLowerCase()) : -1;

        const date = month >= 0 ? new Date(Number(match[3]), month, Number(match[1])) : new Date();
        return ColleagueApi.weekStart(date);
    },

    // ---------- выбор ----------

    /**
     * Открыт ли режим классов
     * @returns {boolean}
     */
    isClasses() {
        return this.state.mode === 'classes';
    },

    /**
     * Список текущего режима
     * @returns {Array}
     */
    items() {
        return this.isClasses() ? this.state.classes : this.state.teachers;
    },

    /**
     * Выбранные учитель или класс текущего режима
     * @returns {?number}
     */
    currentId() {
        return this.isClasses() ? this.state.classId : this.state.teacherId;
    },

    /**
     * Запоминает выбор: в окне и в закреплённых
     * @param {?number} id - учитель или класс текущего режима
     * @returns {void}
     */
    setCurrent(id) {
        const { state } = this;
        if (this.isClasses()) {
            state.classId = id;
            state.favorites.lastClass = id;
        } else {
            state.teacherId = id;
            state.favorites.last = id;
        }
        ColleagueApi.saveFavorites(state.favorites);
    },

    /**
     * Закреплённые текущего режима
     * @returns {number[]}
     */
    pinned() {
        return this.isClasses() ? this.state.favorites.classIds : this.state.favorites.ids;
    },

    /**
     * Чьё расписание запрашивать
     * @returns {{type: 'teacher'|'class', id: number}}
     */
    owner() {
        return { type: this.isClasses() ? 'class' : 'teacher', id: this.currentId() };
    },

    // ---------- открытие и загрузка ----------

    /**
     * Открывает окно
     * @returns {void}
     */
    open() {
        if (this.overlay) return;

        createStyles();
        this.addStyles();

        const favorites = ColleagueApi.loadFavorites();
        this.state = {
            mode: favorites.mode,
            teachers: [],
            classes: [],
            favorites,
            teacherId: favorites.last,
            classId: favorites.lastClass,
            monday: this.pageMonday(),
            together: false,
            filter: '',
            week: null,
            mine: null,
            loading: true,
            error: '',
            note: ''
        };

        this.overlay = document.createElement('div');
        this.overlay.className = 'mscp-modal-overlay';
        this.overlay.innerHTML = `
            <div class="mscp-col-window">
                <div class="mscp-modal-header">
                    <h2 class="mscp-modal-title">Расписание коллег и классов</h2>
                    <button class="mscp-close-btn">&times;</button>
                </div>
                <div class="mscp-col-body">
                    <div class="mscp-col-side">
                        <div class="mscp-col-modes"></div>
                        <input type="search" class="mscp-col-search">
                        <div class="mscp-col-list"></div>
                    </div>
                    <div class="mscp-col-main">
                        <div class="mscp-col-toolbar"></div>
                        <div class="mscp-col-grid"></div>
                    </div>
                </div>
                <div class="mscp-col-footer"></div>
            </div>
        `;

        this.overlay.querySelector('.mscp-close-btn').addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', event => {
            if (event.target === this.overlay) this.close();
        });
        this.overlay.querySelector('.mscp-col-search').addEventListener('input', event => {
            this.state.filter = event.target.value;
            this.renderList();
        });

        this.onKeydown = event => {
            if (event.key === 'Escape') this.close();
        };
        document.addEventListener('keydown', this.onKeydown);

        document.body.appendChild(this.overlay);
        this.render();
        this.loadList();
    },

    /**
     * Закрывает окно
     * @returns {void}
     */
    close() {
        document.removeEventListener('keydown', this.onKeydown);
        this.overlay?.remove();
        this.overlay = null;
        this.loadId++;
    },

    /**
     * Загружает список текущего режима и, если выбор уже был, его неделю
     * @returns {Promise<void>}
     */
    async loadList() {
        const { state } = this;
        const mode = state.mode;

        state.loading = true;
        state.error = '';
        state.note = '';

        try {
            const result = mode === 'classes' ? await ColleagueApi.getClasses() : await ColleagueApi.getTeachers();
            if (!this.overlay || state.mode !== mode) return;

            state[mode] = result.list;
            if (result.stale) state.note = `Список ${mode === 'classes' ? 'классов' : 'учителей'} взят из кеша: сайт не ответил.`;
            if (!result.list.some(item => item.id === this.currentId())) this.setCurrent(null);
        } catch (error) {
            if (!this.overlay || state.mode !== mode) return;
            state.error = ColleagueApi.describeError(error);
        }

        state.loading = false;
        this.render();
        if (this.currentId()) this.loadWeek();
    },

    /**
     * Загружает неделю выбранного учителя или класса (и вашу, если включён режим "вместе со мной")
     * @param {boolean} [force=false] - игнорировать кеш
     * @returns {Promise<void>}
     */
    async loadWeek(force = false) {
        const { state } = this;
        const id = ++this.loadId;
        const myId = ColleagueApi.session()?.profile;

        state.loading = true;
        state.error = '';
        this.renderGrid();

        try {
            // Свою неделю незачем брать, когда смотрим на себя
            const needMine = state.together && myId && !(!this.isClasses() && myId === this.currentId());
            const [week, mine] = await Promise.all([
                ColleagueApi.getWeek(this.owner(), state.monday, force),
                needMine ? ColleagueApi.getWeek({ type: 'teacher', id: myId }, state.monday, force) : null
            ]);
            if (id !== this.loadId) return;

            state.week = week;
            state.mine = mine;
        } catch (error) {
            if (id !== this.loadId) return;
            state.week = null;
            state.mine = null;
            state.error = ColleagueApi.describeError(error);
        }

        state.loading = false;
        this.render();
    },

    /**
     * Переключает режим: учителя или классы
     * @param {'teachers'|'classes'} mode
     * @returns {void}
     */
    setMode(mode) {
        const { state } = this;
        if (state.mode === mode) return;

        state.mode = mode;
        state.favorites.mode = mode;
        ColleagueApi.saveFavorites(state.favorites);

        state.filter = '';
        state.week = null;
        state.mine = null;
        state.error = '';
        this.loadId++;

        if (this.items().length) {
            state.loading = false;
            this.render();
            if (this.currentId()) this.loadWeek();
        } else {
            state.loading = true;
            this.render();
            this.loadList();
        }
    },

    /**
     * Выбирает учителя или класс
     * @param {number} id
     * @returns {void}
     */
    select(id) {
        this.setCurrent(id);
        this.renderList();
        this.loadWeek();
    },

    /**
     * Закрепляет учителя или класс вверху списка или снимает закрепление
     * @param {number} id
     * @returns {void}
     */
    toggleFavorite(id) {
        const ids = this.pinned();
        const index = ids.indexOf(id);

        if (index >= 0) ids.splice(index, 1);
        else ids.push(id);

        ColleagueApi.saveFavorites(this.state.favorites);
        this.renderList();
    },

    /**
     * Сдвигает неделю
     * @param {number} weeks - на сколько недель (отрицательное — назад)
     * @returns {void}
     */
    shiftWeek(weeks) {
        this.state.monday = ColleagueApi.addDays(this.state.monday, weeks * 7);
        if (this.currentId()) this.loadWeek();
        else this.renderToolbar();
    },

    // ---------- отрисовка ----------

    /**
     * Создаёт элемент
     * @param {string} tag - тег
     * @param {string} [className] - класс
     * @param {string} [text] - текст
     * @returns {HTMLElement}
     */
    el(tag, className = '', text = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text) element.textContent = text;
        return element;
    },

    /**
     * Перерисовывает всё окно
     * @returns {void}
     */
    render() {
        if (!this.overlay) return;

        this.renderModes();
        this.renderList();
        this.renderToolbar();
        this.renderGrid();
        this.renderFooter();
    },

    /**
     * Переключатель режимов и подсказка в поле поиска
     * @returns {void}
     */
    renderModes() {
        const box = this.overlay?.querySelector('.mscp-col-modes');
        if (!box) return;

        const buttons = [['teachers', 'Учителя'], ['classes', 'Классы']].map(([mode, label]) => {
            const button = this.el('button', `mscp-col-mode${this.state.mode === mode ? ' mscp-col-active-mode' : ''}`, label);
            button.addEventListener('click', () => this.setMode(mode));
            return button;
        });

        box.replaceChildren(...buttons);

        const search = this.overlay.querySelector('.mscp-col-search');
        search.placeholder = this.isClasses() ? 'Поиск класса' : 'Поиск учителя';
        search.value = this.state.filter;
    },

    /**
     * Список: закреплённые сверху, фильтр по поиску; классы разбиты по параллелям
     * @returns {void}
     */
    renderList() {
        const list = this.overlay?.querySelector('.mscp-col-list');
        if (!list) return;

        const isClasses = this.isClasses();
        const { filter, loading } = this.state;
        const currentId = this.currentId();
        const pinnedIds = this.pinned();
        const normalize = text => text.toLowerCase().replace(/ё/g, 'е');
        const query = normalize(filter.trim());
        const isPinned = id => pinnedIds.includes(id);

        const shown = this.items()
            .filter(item => !query || normalize(`${item.name} ${item.subjects ?? ''}`).includes(query))
            .sort((a, b) => Number(isPinned(b.id)) - Number(isPinned(a.id)));

        const children = [];
        let group = null;
        shown.forEach(item => {
            if (isClasses) {
                const heading = isPinned(item.id) ? 'Закреплённые' : `${item.level}-е классы`;
                if (heading !== group) {
                    group = heading;
                    children.push(this.el('div', 'mscp-col-group', heading));
                }
            }

            const row = this.el('div', `mscp-col-item${item.id === currentId ? ' mscp-col-active' : ''}`);
            const star = this.el('button', `mscp-col-star${isPinned(item.id) ? ' mscp-col-pinned' : ''}`, '★');
            star.title = isPinned(item.id) ? 'Убрать из закреплённых' : 'Закрепить вверху списка';
            star.addEventListener('click', event => {
                event.stopPropagation();
                this.toggleFavorite(item.id);
            });

            const text = this.el('div', 'mscp-col-name');
            text.append(this.el('div', '', item.name), this.el('div', 'mscp-col-subjects', isClasses ? item.hint : item.subjects));
            row.append(text, star);
            row.addEventListener('click', () => this.select(item.id));
            children.push(row);
        });

        if (!shown.length && !loading) {
            children.push(this.el('div', 'mscp-col-empty', this.items().length ? 'Ничего не нашлось' : 'Список пуст'));
        }

        list.replaceChildren(...children);
    },

    /**
     * Панель над сеткой: кто выбран, переключатель недель, режим "вместе со мной", обновление
     * @returns {void}
     */
    renderToolbar() {
        const toolbar = this.overlay?.querySelector('.mscp-col-toolbar');
        if (!toolbar) return;

        const { monday, together } = this.state;
        const currentId = this.currentId();
        const isClasses = this.isClasses();
        const sunday = ColleagueApi.addDays(monday, 6);
        const format = date => date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });

        const prev = this.el('button', 'mscp-btn-action mscp-col-week', '‹');
        const next = this.el('button', 'mscp-btn-action mscp-col-week', '›');
        prev.title = 'Предыдущая неделя';
        next.title = 'Следующая неделя';
        prev.addEventListener('click', () => this.shiftWeek(-1));
        next.addEventListener('click', () => this.shiftWeek(1));

        const label = this.el('div', 'mscp-col-period', `${format(monday)} – ${format(sunday)}.${sunday.getFullYear()}`);

        const selected = this.items().find(item => item.id === currentId);
        const title = selected ? (isClasses ? `Класс ${selected.name}` : selected.name)
            : (isClasses ? 'Выберите класс в списке' : 'Выберите учителя в списке');
        const who = this.el('div', 'mscp-col-who', title);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'mscp-checkbox';
        checkbox.checked = together;
        checkbox.addEventListener('change', () => {
            this.state.together = checkbox.checked;
            if (this.currentId()) this.loadWeek();
        });
        const togetherLabel = this.el('label', 'mscp-label');
        togetherLabel.append(checkbox, 'Свободны вместе со мной');

        const refresh = this.el('button', 'mscp-btn-action mscp-col-refresh', 'Обновить');
        refresh.title = 'Запросить неделю у сайта, не глядя в кеш';
        refresh.disabled = !currentId;
        refresh.addEventListener('click', () => this.loadWeek(true));

        toolbar.replaceChildren(who, prev, label, next, togetherLabel, refresh);
    },

    /**
     * Сетка недели
     * @returns {void}
     */
    renderGrid() {
        const grid = this.overlay?.querySelector('.mscp-col-grid');
        if (!grid) return;

        const { loading, error, week, mine, monday } = this.state;
        const isClasses = this.isClasses();

        if (error) return grid.replaceChildren(this.el('div', 'mscp-col-message mscp-col-error', error));
        if (loading) return grid.replaceChildren(this.el('div', 'mscp-col-message', 'Загрузка…'));
        if (!this.currentId() || !week) {
            return grid.replaceChildren(this.el('div', 'mscp-col-message',
                isClasses ? 'Выберите класс в списке слева.' : 'Выберите учителя в списке слева.'));
        }

        const dates = this.DAYS.map((_, index) => ColleagueApi.addDays(monday, index));
        const today = ColleagueApi.isoDate(new Date());

        // Строк не меньше, чем номеров в школьном звонке; больше — если у кого-то есть поздние уроки
        let rows = CONFIG.LESSON_STARTS.length;
        [week, mine].forEach(source => Object.values(source?.days ?? {}).forEach(lessons => {
            lessons.forEach(lesson => { rows = Math.max(rows, lesson[0]); });
        }));

        const table = this.el('table', 'mscp-col-table');
        const head = table.createTHead().insertRow();
        head.insertCell().className = 'mscp-col-corner';
        dates.forEach((date, index) => {
            const cell = head.insertCell();
            cell.className = `mscp-col-day${ColleagueApi.isoDate(date) === today ? ' mscp-col-today' : ''}`;
            cell.textContent = `${this.DAYS[index]} ${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
        });

        const body = table.createTBody();
        for (let number = 1; number <= rows; number++) {
            const row = body.insertRow();
            const label = row.insertCell();
            label.className = 'mscp-col-number';
            label.append(this.el('b', '', String(number)), this.el('span', '', CONFIG.LESSON_STARTS[number - 1] ?? ''));

            dates.forEach(date => {
                const iso = ColleagueApi.isoDate(date);
                const theirs = (week.days[iso] ?? []).filter(lesson => lesson[0] === number);
                const mineHere = (mine?.days[iso] ?? []).filter(lesson => lesson[0] === number);
                row.append(this.renderCell(theirs, mineHere, Boolean(mine)));
            });
        }

        grid.replaceChildren(table);
    },

    /**
     * Ячейка сетки
     * @param {Array} theirs - уроки выбранного учителя или класса в этот час
     * @param {Array} mineHere - ваши уроки в этот час
     * @param {boolean} together - включён ли режим "вместе со мной"
     * @returns {HTMLElement}
     */
    renderCell(theirs, mineHere, together) {
        const cell = this.el('td');
        const isClasses = this.isClasses();

        if (theirs.length) {
            cell.className = 'mscp-col-busy';
            theirs.forEach(([, , className, subject, teacher]) => {
                const card = this.el('div', 'mscp-col-lesson');
                card.style.borderLeftColor = this.subjectColor(subject);

                if (isClasses) {
                    // У класса важно, какой предмет и кто ведёт; подгруппы — отдельные карточки друг под другом
                    card.append(this.el('span', 'mscp-col-subject-main', subject), this.el('span', 'mscp-col-teacher', teacher));
                    card.title = [subject, teacher].filter(Boolean).join(' — ');
                } else {
                    // У метагрупп (потоков) названия класса нет
                    if (className) {
                        const chip = this.el('span', 'mscp-col-class', className);
                        chip.style.background = classColor(className) || '#868e96';
                        card.append(chip);
                    }
                    card.append(this.el('span', 'mscp-col-subject', subject));
                    card.title = `${className} ${subject}`.trim();
                }

                cell.append(card);
            });
        } else if (together && mineHere.length) {
            cell.className = 'mscp-col-mine';
            cell.textContent = `у вас: ${mineHere.map(lesson => lesson[2]).filter(Boolean).join(', ') || 'урок'}`;
        } else {
            cell.className = together ? 'mscp-col-both' : 'mscp-col-free';
            cell.textContent = together ? '✓' : '';
        }

        return cell;
    },

    /**
     * Цвет предмета для полоски на карточке: один предмет — один цвет
     * @param {string} subject - название предмета
     * @returns {string}
     */
    subjectColor(subject) {
        let hash = 0;
        for (const char of subject) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
        return SCHEDULE_SUBJECT_COLORS[hash % SCHEDULE_SUBJECT_COLORS.length];
    },

    /**
     * Нижняя строка: откуда данные, подсказка и сброс кеша
     * @returns {void}
     */
    renderFooter() {
        const footer = this.overlay?.querySelector('.mscp-col-footer');
        if (!footer) return;

        const { week, note, together } = this.state;
        const parts = [];

        if (week) {
            const time = new Date(week.at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            parts.push(week.stale ? `Сайт не ответил, показаны данные из кеша от ${time}.`
                : week.fromCache ? `Из кеша, обновлено ${time}.` : `Загружено с сайта ${time}.`);
        }
        if (note) parts.push(note);

        if (this.isClasses()) {
            parts.push(together
                ? '✓ — свободны и вы, и класс. Свободно значит «нет урока в расписании».'
                : 'Зелёное — у класса нет урока в расписании.');
        } else {
            parts.push(together
                ? '✓ — свободны оба. Свободно значит «нет урока в расписании».'
                : 'Зелёное — у коллеги нет урока в расписании: внеурочка и дежурства не учитываются.');
        }

        const clear = this.el('button', 'mscp-btn-action mscp-col-clear', 'Сбросить кеш');
        clear.title = 'Удалить сохранённые списки и расписания. Закреплённые останутся.';
        clear.addEventListener('click', () => {
            ColleagueApi.clear();
            this.state.teachers = [];
            this.state.classes = [];
            this.state.week = null;
            this.state.mine = null;
            this.render();
            this.loadList();
        });

        footer.replaceChildren(this.el('div', 'mscp-col-hint', parts.join(' ')), clear);
    },

    // ---------- стили ----------

    /**
     * Добавляет стили окна (один раз)
     * @returns {void}
     */
    addStyles() {
        if (document.getElementById('mscp-colleagues-styles')) return;

        const style = document.createElement('style');
        style.id = 'mscp-colleagues-styles';
        style.textContent = `
            .mscp-col-window {
                display: flex;
                flex-direction: column;
                width: min(1100px, 96vw);
                height: min(720px, 92vh);
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                overflow: hidden;
            }
            .mscp-col-body {
                flex: 1;
                display: flex;
                min-height: 0;
            }
            .mscp-col-side {
                width: 260px;
                flex: none;
                display: flex;
                flex-direction: column;
                border-right: 1px solid #e9ecef;
                background: #f8f9fa;
            }
            .mscp-col-modes {
                display: flex;
                margin: 12px 12px 0;
                padding: 2px;
                background: #e9ecef;
                border-radius: 8px;
            }
            .mscp-col-mode {
                flex: 1;
                padding: 6px 0;
                border: none;
                border-radius: 6px;
                background: none;
                color: #495057;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
            }
            .mscp-col-active-mode {
                background: white;
                color: #333;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
            }
            .mscp-col-search {
                margin: 10px 12px;
                padding: 8px 10px;
                border: 1px solid #ced4da;
                border-radius: 6px;
                font-size: 13px;
            }
            .mscp-col-list {
                flex: 1;
                overflow-y: auto;
                padding: 0 6px 12px;
            }
            .mscp-col-group {
                padding: 8px 8px 2px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                color: #868e96;
            }
            .mscp-col-item {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 8px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                color: #333;
            }
            .mscp-col-item:hover {
                background: #e9ecef;
            }
            .mscp-col-active, .mscp-col-active:hover {
                background: #dbe4ff;
            }
            .mscp-col-name {
                flex: 1;
                min-width: 0;
            }
            .mscp-col-subjects {
                font-size: 11px;
                color: #868e96;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .mscp-col-star {
                border: none;
                background: none;
                cursor: pointer;
                font-size: 16px;
                color: #ced4da;
                line-height: 1;
            }
            .mscp-col-star:hover { color: #f59f00; }
            .mscp-col-pinned { color: #f59f00; }
            .mscp-col-empty {
                padding: 12px;
                font-size: 13px;
                color: #868e96;
            }
            .mscp-col-main {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
            }
            .mscp-col-toolbar {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
                padding: 10px 14px;
                border-bottom: 1px solid #e9ecef;
            }
            .mscp-col-who {
                flex: 1 1 100%;
                font-size: 15px;
                font-weight: 600;
                color: #333;
            }
            .mscp-col-week {
                flex: none !important;
                width: 32px;
                padding: 4px 0 !important;
                font-size: 16px !important;
            }
            .mscp-col-period {
                font-size: 13px;
                color: #495057;
                min-width: 120px;
                text-align: center;
            }
            .mscp-col-refresh, .mscp-col-clear {
                flex: none !important;
                padding: 6px 12px !important;
            }
            .mscp-col-refresh:disabled { opacity: 0.5; cursor: default; }
            .mscp-col-grid {
                flex: 1;
                overflow: auto;
                padding: 10px 14px;
            }
            .mscp-col-message {
                padding: 40px 0;
                text-align: center;
                color: #868e96;
                font-size: 14px;
            }
            .mscp-col-error { color: #c92a2a; }
            .mscp-col-table {
                width: 100%;
                table-layout: fixed;
                border-collapse: separate;
                border-spacing: 4px;
                font-size: 12px;
            }
            .mscp-col-table td, .mscp-col-table th {
                padding: 0;
                vertical-align: middle;
            }
            .mscp-col-corner, .mscp-col-number { width: 56px; }
            .mscp-col-day {
                padding: 4px 0 !important;
                text-align: center;
                font-weight: 600;
                color: #495057;
            }
            .mscp-col-today { color: #496be8; }
            .mscp-col-number {
                text-align: center;
                color: #868e96;
            }
            .mscp-col-number b {
                display: block;
                font-size: 14px;
                color: #495057;
            }
            .mscp-col-table tbody td {
                height: 50px;
                border-radius: 6px;
                text-align: center;
            }
            .mscp-col-free { background: #e6f6ea; }
            .mscp-col-both { background: #8fd3a3; color: #1b5e30; font-size: 16px; font-weight: 700; }
            .mscp-col-mine { background: #f1f3f5; color: #868e96; font-size: 11px; }
            .mscp-col-busy {
                background: white;
                border: 1px solid #dee2e6;
                text-align: left !important;
            }
            .mscp-col-lesson {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 2px;
                padding: 3px 6px;
                border-left: 4px solid #496be8;
                color: #333;
            }
            .mscp-col-lesson + .mscp-col-lesson {
                border-top: 1px solid #f1f3f5;
            }
            .mscp-col-class {
                flex: none;
                padding: 1px 5px;
                border-radius: 4px;
                color: white;
                font-weight: 600;
            }
            .mscp-col-subject, .mscp-col-subject-main, .mscp-col-teacher {
                max-width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .mscp-col-subject { font-size: 11px; }
            .mscp-col-subject-main {
                font-weight: 600;
                display: -webkit-box;
                -webkit-box-orient: vertical;
                -webkit-line-clamp: 2;
                white-space: normal;
                line-height: 1.2;
            }
            .mscp-col-teacher { font-size: 11px; color: #868e96; }
            .mscp-col-footer {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 16px;
                border-top: 1px solid #e9ecef;
                background: #f8f9fa;
            }
            .mscp-col-hint {
                flex: 1;
                font-size: 12px;
                color: #6c757d;
                line-height: 1.4;
            }
            @media (max-width: 760px) {
                .mscp-col-body { flex-direction: column; }
                .mscp-col-side { width: auto; max-height: 30%; border-right: none; border-bottom: 1px solid #e9ecef; }
            }
        `;
        document.head.appendChild(style);
    }
};


// ============================================================
// ДЗ НА ДЕНЬ: запросы к API сайта
// ============================================================

/**
 * Запросы окна "ДЗ на день": уроки дня, ближайшие уроки групп, выдача ДЗ
 * - Вход берётся у самого сайта (ColleagueApi.session()): токен из cookie, пароли не нужны
 * - Предмет и состав группы берутся из списка групп учителя: для выдачи ДЗ сайту нужны subject_id и student_ids
 * - Выдача — тот же POST, что делает интерфейс сайта; повторный PUT после него не нужен (так сделано и в проекте журнала)
 */
const HomeworkApi = {
    /** Сколько дней вперёд искать следующий урок группы для срока сдачи */
    NEXT_LESSON_DAYS: 21,

    /** @type {Map<number, Object>|null} Группы учителя по id; хранятся, пока открыта страница */
    groups: null,

    /**
     * Дата ГГГГ-ММ-ДД в формате сайта для записи (ДД.ММ.ГГГГ)
     * @param {string} iso
     * @returns {string}
     */
    siteDate(iso) {
        const [year, month, day] = iso.split('-');
        return `${day}.${month}.${year}`;
    },

    /**
     * Дата из ответа сайта [год, месяц, день] в виде ГГГГ-ММ-ДД
     * @param {number[]} date
     * @returns {string}
     */
    itemDate(date) {
        const pad = value => String(value).padStart(2, '0');
        return `${date[0]}-${pad(date[1])}-${pad(date[2])}`;
    },

    /**
     * Запись на сайт: JSON-запрос с теми же заголовками, что у ColleagueApi.get()
     * @param {string} path - путь после /api/ej
     * @param {Object} body - тело запроса
     * @returns {Promise<Object>} тело ответа
     * @throws {Error} с полем status (0 — вход не определён) и message — текстом ошибки сайта, если он есть
     */
    async post(path, body) {
        const session = ColleagueApi.session();
        if (!session) throw Object.assign(new Error('Не удалось определить вход'), { status: 0 });

        const response = await fetch(`/api/ej${path}`, {
            method: 'POST',
            headers: {
                'Auth-Token': session.token,
                'Profile-Id': String(session.profile),
                'x-mes-subsystem': 'teacherweb',
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            // Сайт пишет причину отказа в тело ответа, например "Дата выдачи домашнего задания не может быть раньше текущей даты"
            const reason = await response.text().then(text => {
                try {
                    const data = JSON.parse(text);
                    return data.message ?? data.errors?.join?.('; ') ?? data.error ?? '';
                } catch (error) {
                    return '';
                }
            }).catch(() => '');
            throw Object.assign(new Error(reason || `Сайт ответил ${response.status}`), { status: response.status });
        }

        return response.json();
    },

    /**
     * Группы учителя (предмет и состав)
     * @returns {Promise<Map<number, Object>>}
     */
    async getGroups() {
        if (this.groups) return this.groups;

        const session = ColleagueApi.session();
        const list = await ColleagueApi.get('/plan/teacher/v1/groups', {
            academic_year_id: session?.year, school_id: session?.school, teacher_ids: session?.profile
        });

        this.groups = new Map(list.map(group => [group.id, group]));
        return this.groups;
    },

    /**
     * Уроки учителя за день по времени начала; отменённые и перенесённые на другую дату не берутся
     * @param {string} iso - день в виде ГГГГ-ММ-ДД
     * @returns {Promise<Array<{id: number, groupId: number, time: string, className: string, subject: string,
     *          subjectId: ?number, studentIds: number[], existingIds: number[], ready: boolean}>>}
     *          ready — false, если группы нет в списке групп учителя: выдать ДЗ без состава нельзя
     */
    async getDay(iso) {
        const session = ColleagueApi.session();
        const [items, groups] = await Promise.all([
            ColleagueApi.get('/plan/teacher/v1/schedule_items', {
                academic_year_id: session?.year, teacher_id: session?.profile, from: iso, to: iso,
                with_lesson_info: true, with_group_class_subject_info: true, per_page: 300, page: 1
            }),
            this.getGroups()
        ]);

        const pad = value => String(value).padStart(2, '0');
        return items
            .filter(item => !item.cancelled && !item.transferred_to_date)
            .map(item => {
                const group = groups.get(item.group_id);
                return {
                    id: item.id,
                    groupId: item.group_id,
                    time: `${pad(item.time[0])}:${pad(item.time[1])}`,
                    className: item.class_unit_name ?? group?.class_unit_name ?? '',
                    subject: item.subject_name ?? group?.subject_name ?? '',
                    subjectId: group?.subject_id ?? item.subject_id ?? null,
                    studentIds: group?.student_ids ?? [],
                    existingIds: (item.homeworks_to_give ?? []).map(homework => homework.id),
                    ready: Boolean(group?.subject_id ?? item.subject_id) && Boolean(group?.student_ids?.length)
                };
            })
            .sort((a, b) => a.time.localeCompare(b.time));
    },

    /**
     * Тексты уже выданных ДЗ
     * @param {number[]} ids - id ДЗ
     * @returns {Promise<Object<number, string>>} {id ДЗ: текст}; пусто, если сайт не ответил (это справка, не ошибка)
     */
    async getTexts(ids) {
        if (!ids.length) return {};

        try {
            const homeworks = await ColleagueApi.get('/core/teacher/v1/homeworks', { ids: ids.join(','), with_entries: true });
            return Object.fromEntries(homeworks.map(homework => [
                homework.id,
                (homework.homework_entries ?? []).map(entry => entry.description).filter(Boolean).join(' / ')
            ]));
        } catch (error) {
            console.error('Не удалось получить тексты выданных ДЗ:', error);
            return {};
        }
    },

    /**
     * Ближайший урок после дня у каждой группы: по умолчанию к нему назначается срок сдачи
     * @param {number[]} groupIds
     * @param {string} iso - день в виде ГГГГ-ММ-ДД
     * @returns {Promise<Object<number, string>>} {id группы: ГГГГ-ММ-ДД}; группы без урока в ближайшие недели не попадают
     */
    async getNextDates(groupIds, iso) {
        if (!groupIds.length) return {};

        const [year, month, day] = iso.split('-').map(Number);
        const start = new Date(year, month - 1, day);
        const next = {};

        try {
            const items = await ColleagueApi.get('/plan/teacher/v1/schedule_items', {
                academic_year_id: ColleagueApi.session()?.year, group_ids: groupIds.join(','),
                from: ColleagueApi.isoDate(ColleagueApi.addDays(start, 1)),
                to: ColleagueApi.isoDate(ColleagueApi.addDays(start, this.NEXT_LESSON_DAYS)),
                per_page: 300, page: 1
            });

            items.filter(item => !item.cancelled && !item.transferred_to_date).forEach(item => {
                const date = this.itemDate(item.date);
                if (!next[item.group_id] || date < next[item.group_id]) next[item.group_id] = date;
            });
        } catch (error) {
            console.error('Не удалось найти следующие уроки групп:', error);
        }

        return next;
    },

    /**
     * Сколько оценок стоит на каждом уроке дня; удалённые оценки не считаются
     * @param {number[]} groupIds
     * @param {string} iso - день в виде ГГГГ-ММ-ДД
     * @returns {Promise<Object<number, number>>} {id урока: число оценок}; уроки без оценок не попадают
     * @throws {Error} если сайт не ответил: тогда "нет оценок" утверждать нельзя
     */
    async getMarkCounts(groupIds, iso) {
        if (!groupIds.length) return {};

        const date = this.siteDate(iso);
        const perPage = 300;
        const counts = {};

        for (let page = 1; ; page++) {
            const marks = await ColleagueApi.get('/core/teacher/v1/marks', {
                group_ids: groupIds.join(','), lesson_date_from: date, lesson_date_to: date,
                with_non_numeric_entries: true, per_page: perPage, page
            });

            marks.filter(mark => !mark.deleted_by).forEach(mark => {
                counts[mark.schedule_lesson_id] = (counts[mark.schedule_lesson_id] ?? 0) + 1;
            });
            if (marks.length < perPage) return counts;
        }
    },

    /**
     * Сколько комментариев к ученикам уже стоит на каждом уроке
     * @param {number[]} lessonIds
     * @returns {Promise<Object<number, number>>} {id урока: число комментариев}
     * @throws {Error} если сайт не ответил
     */
    async getCommentCounts(lessonIds) {
        const chunk = 50;
        const counts = {};

        for (let start = 0; start < lessonIds.length; start += chunk) {
            const comments = await ColleagueApi.get('/core/teacher/v1/lesson_comments', {
                schedule_lesson_ids: lessonIds.slice(start, start + chunk).join(','), page: 1, per_page: 1000
            });
            comments.forEach(comment => {
                counts[comment.schedule_lesson_id] = (counts[comment.schedule_lesson_id] ?? 0) + 1;
            });
        }

        return counts;
    },

    /**
     * Фамилия и имя ученика для сообщения о результате; справка, поэтому сбой не ошибка
     * @param {Object} lesson - урок из getDay()
     * @param {number} studentId
     * @returns {Promise<string>} "Фамилия Имя" или пустая строка
     */
    async getStudentName(lesson, studentId) {
        try {
            const profiles = await ColleagueApi.get('/core/teacher/v1/student_profiles', {
                academic_year_id: ColleagueApi.session()?.year, group_ids: lesson.groupId,
                with_groups: true, per_page: 150, page: 1
            });
            return profiles.find(profile => profile.id === studentId)?.short_name ?? '';
        } catch (error) {
            console.error('Не удалось получить имя ученика:', error);
            return '';
        }
    },

    /**
     * Ставит комментарий ученику на уроке
     * @param {Object} lesson - урок из getDay()
     * @param {number} studentId
     * @param {string} text - текст комментария
     * @returns {Promise<Object>} созданный комментарий
     */
    createComment(lesson, studentId, text) {
        return this.post('/core/teacher/v1/lesson_comments', {
            comment: text,
            student_id: studentId,
            schedule_lesson_id: lesson.id,
            teacher_id: ColleagueApi.session()?.profile,
            subject_id: lesson.subjectId
        });
    },

    /**
     * Выдаёт ДЗ на уроке
     * @param {Object} lesson - урок из getDay()
     * @param {string} text - текст ДЗ
     * @param {string} assignedIso - день урока, ГГГГ-ММ-ДД
     * @param {string} dueIso - срок сдачи, ГГГГ-ММ-ДД
     * @param {number} duration - ожидаемое время выполнения, минут
     * @returns {Promise<Object>} созданное ДЗ
     */
    createHomework(lesson, text, assignedIso, dueIso, duration) {
        return this.post('/core/teacher/v1/homeworks', {
            group_id: lesson.groupId,
            teacher_id: ColleagueApi.session()?.profile,
            date_assigned_on: this.siteDate(assignedIso),
            date_prepared_for: this.siteDate(dueIso),
            subject_id: lesson.subjectId,
            homework_entries: [{
                description: text,
                duration,
                student_ids: lesson.studentIds,
                attachment_ids: [],
                attachments: [],
                scripts: null
            }]
        });
    }
};


// ============================================================
// РАСПИСАНИЕ: комментарии к урокам недели
// ============================================================

/**
 * Сколько комментариев к ученикам стоит на уроках показанной недели
 * Нужно значку "У": урок без оценок, но с комментарием помечается оранжевым.
 * - Карточка сайта не хранит id урока, поэтому урок находится по дню, времени начала и классу
 * - Неделя грузится один раз и обновляется не чаще раза в TTL; пока данных нет, комментариев считается ноль
 * - Сбой запроса не ломает расписание: комментарии просто не показываются до следующего обновления
 */
const ScheduleComments = {
    /** Через сколько миллисекунд загруженную неделю можно запросить заново */
    TTL: 60000,

    /** @type {Map<string, {loadedAt: number, counts: Map<string, number>}>} Недели по ключу "с|по" */
    weeks: new Map(),

    /**
     * Ключ урока в карточке недели
     * @param {string} iso - день в виде ГГГГ-ММ-ДД
     * @param {string} start - время начала "ЧЧ:ММ"
     * @param {string} className - класс в виде "10-А"
     * @returns {string}
     */
    key(iso, start, className) {
        return `${iso}|${start}|${className}`;
    },

    /**
     * Число комментариев на уроке; при необходимости запускает загрузку недели
     * @param {string} from - первый день недели, ГГГГ-ММ-ДД
     * @param {string} to - последний день недели, ГГГГ-ММ-ДД
     * @param {string} iso - день урока
     * @param {string} start - время начала "ЧЧ:ММ"
     * @param {string} className - класс в виде "10-А"
     * @returns {number} 0, если урок не найден или неделя ещё не загружена
     */
    count(from, to, iso, start, className) {
        const week = this.load(from, to);
        return week.counts.get(this.key(iso, start, className)) ?? 0;
    },

    /**
     * Возвращает загруженную неделю и, если она устарела, запускает обновление
     * @param {string} from
     * @param {string} to
     * @returns {{loadedAt: number, counts: Map<string, number>}}
     */
    load(from, to) {
        const id = `${from}|${to}`;
        let week = this.weeks.get(id);

        if (!week) {
            week = { loadedAt: 0, counts: new Map(), loading: false };
            this.weeks.set(id, week);
        }

        if (!week.loading && Date.now() - week.loadedAt > this.TTL) {
            week.loading = true;
            this.request(from, to)
                .then(counts => { week.counts = counts; })
                .catch(error => console.error('Не удалось загрузить комментарии к урокам недели:', error))
                .finally(() => {
                    week.loading = false;
                    week.loadedAt = Date.now();
                    ScheduleLayout.schedule();
                });
        }

        return week;
    },

    /**
     * Запрашивает уроки недели и комментарии к ним
     * @param {string} from
     * @param {string} to
     * @returns {Promise<Map<string, number>>} {ключ урока: число комментариев}, только уроки с комментариями
     */
    async request(from, to) {
        const session = ColleagueApi.session();
        const items = await ColleagueApi.get('/plan/teacher/v1/schedule_items', {
            academic_year_id: session?.year, teacher_id: session?.profile, from, to, with_group_class_subject_info: true, per_page: 300, page: 1
        });

        const byId = new Map(items.map(item => [item.id, item]));
        const found = await HomeworkApi.getCommentCounts([...byId.keys()]);
        const counts = new Map();

        for (const [lessonId, count] of Object.entries(found)) {
            const item = byId.get(Number(lessonId));
            if (!item) continue;

            const pad = value => String(value).padStart(2, '0');
            const key = this.key(HomeworkApi.itemDate(item.date), `${pad(item.time[0])}:${pad(item.time[1])}`, item.class_unit_name ?? '');
            counts.set(key, (counts.get(key) ?? 0) + count);
        }

        return counts;
    },

    /**
     * Сбрасывает загруженные недели: после новых комментариев значки обновятся при ближайшей перерисовке
     * @returns {void}
     */
    reset() {
        this.weeks.clear();
        ScheduleLayout.schedule();
    }
};


// ============================================================
// ДЗ НА ДЕНЬ: окно со списком уроков дня и полями для домашнего задания
// ============================================================

/**
 * Окно "ДЗ на день"
 * - Показывает уроки выбранного дня (по умолчанию сегодня): время, класс, предмет и поле для текста ДЗ
 * - Срок сдачи — ближайший следующий урок этой группы, время выполнения — DEFAULT_DURATION; изменить их в окне нельзя
 * - "Выдать" отправляет ДЗ только по урокам с заполненным текстом, по одному запросу на урок, и показывает результат у каждого
 * - Сайт не принимает выдачу задним числом, поэтому листать назад раньше сегодняшнего дня нельзя (на обеих вкладках)
 * - Уже выданное на уроке ДЗ показывается справкой и не перезаписывается: новый текст создаёт ещё одно ДЗ
 * - Вкладка "Комментарии": на каждый отмеченный урок без оценок ставится один комментарий случайному ученику группы
 */
const HomeworkDay = {
    /** Срок выполнения по умолчанию, минут */
    DEFAULT_DURATION: 15,

    /** Комментарий по умолчанию: невидимый символ (U+3164), сайт принимает его как текст */
    DEFAULT_COMMENT: 'ㅤ',

    /** @type {HTMLElement|null} Оверлей открытого окна */
    overlay: null,

    /** @type {Function|null} Обработчик Escape открытого окна */
    onKeydown: null,

    /** Что сейчас выбрано и загружено; пересоздаётся при каждом открытии */
    state: null,

    /** @type {number} Номер последней загрузки: ответ более ранней игнорируется */
    loadId: 0,

    /**
     * Открывает окно
     * @returns {void}
     */
    open() {
        if (this.overlay) return;

        createStyles();
        this.addStyles();

        this.state = {
            iso: ColleagueApi.isoDate(new Date()), tab: 'homework', commentText: this.DEFAULT_COMMENT,
            lessons: [], loading: true, sending: false, error: ''
        };

        this.overlay = document.createElement('div');
        this.overlay.className = 'mscp-modal-overlay';
        this.overlay.innerHTML = `
            <div class="mscp-hw-window">
                <div class="mscp-modal-header">
                    <h2 class="mscp-modal-title">Уроки дня</h2>
                    <button class="mscp-close-btn">&times;</button>
                </div>
                <div class="mscp-hw-tabs">
                    <button class="mscp-hw-tab" data-tab="homework">Домашнее задание</button>
                    <button class="mscp-hw-tab" data-tab="comments">Комментарии</button>
                </div>
                <div class="mscp-hw-toolbar">
                    <button class="mscp-hw-nav mscp-hw-prev" data-step="-1" title="Предыдущий день">&lsaquo;</button>
                    <input type="date" class="mscp-hw-date">
                    <button class="mscp-hw-nav" data-step="1" title="Следующий день">&rsaquo;</button>
                    <span class="mscp-hw-weekday"></span>
                </div>
                <div class="mscp-hw-commentbar">
                    <label for="mscp-hw-comment">Комментарий (по умолчанию — невидимый символ):</label>
                    <input type="text" id="mscp-hw-comment" class="mscp-hw-comment" placeholder="Текст комментария">
                </div>
                <div class="mscp-hw-list"></div>
                <div class="mscp-hw-footer">
                    <span class="mscp-hw-summary"></span>
                    <button class="mscp-hw-send"></button>
                </div>
            </div>
        `;

        const dateInput = this.overlay.querySelector('.mscp-hw-date');
        dateInput.value = this.state.iso;
        dateInput.addEventListener('change', () => {
            if (dateInput.value && this.canGoTo(dateInput.value)) this.setDay(dateInput.value);
            else dateInput.value = this.state.iso;
        });
        this.overlay.querySelectorAll('.mscp-hw-tab').forEach(button => {
            button.addEventListener('click', () => this.setTab(button.dataset.tab));
        });
        const commentInput = this.overlay.querySelector('.mscp-hw-comment');
        commentInput.value = this.state.commentText;
        commentInput.addEventListener('input', () => {
            this.state.commentText = commentInput.value;
            this.renderFooter();
        });
        this.overlay.querySelectorAll('.mscp-hw-nav').forEach(button => {
            button.addEventListener('click', () => this.shiftDay(Number(button.dataset.step)));
        });
        this.overlay.querySelector('.mscp-close-btn').addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', event => {
            if (event.target === this.overlay) this.close();
        });
        this.overlay.querySelector('.mscp-hw-send').addEventListener('click', () => {
            if (this.state.tab === 'comments') this.sendComments();
            else this.send();
        });

        this.onKeydown = event => {
            if (event.key === 'Escape') this.close();
        };
        document.addEventListener('keydown', this.onKeydown);

        document.body.appendChild(this.overlay);
        this.load();
    },

    /**
     * Закрывает окно; введённый, но не отправленный текст пропадает
     * @returns {void}
     */
    close() {
        document.removeEventListener('keydown', this.onKeydown);
        this.overlay?.remove();
        this.overlay = null;
        this.loadId++;
    },

    /**
     * Переходит на другой день
     * @param {string} iso - день в виде ГГГГ-ММ-ДД
     * @returns {void}
     */
    setDay(iso) {
        if (this.state.sending || !this.canGoTo(iso)) return;

        this.state.iso = iso;
        this.overlay.querySelector('.mscp-hw-date').value = iso;
        this.load();
    },

    /**
     * Можно ли открыть день: не раньше сегодняшнего
     * @param {string} iso - день в виде ГГГГ-ММ-ДД
     * @returns {boolean}
     */
    canGoTo(iso) {
        return iso >= ColleagueApi.isoDate(new Date());
    },

    /**
     * Переключает вкладку; день и загруженные уроки остаются теми же
     * @param {string} tab - 'homework' или 'comments'
     * @returns {void}
     */
    setTab(tab) {
        if (this.state.sending || this.state.tab === tab) return;

        this.state.tab = tab;
        this.render();
    },

    /**
     * Сдвигает день на несколько дней
     * @param {number} step - на сколько дней
     * @returns {void}
     */
    shiftDay(step) {
        const [year, month, day] = this.state.iso.split('-').map(Number);
        this.setDay(ColleagueApi.isoDate(ColleagueApi.addDays(new Date(year, month - 1, day), step)));
    },

    /**
     * Загружает уроки дня, тексты выданных ДЗ и сроки по умолчанию
     * @returns {Promise<void>}
     */
    async load() {
        const state = this.state;
        const id = ++this.loadId;
        const iso = state.iso;

        state.loading = true;
        state.error = '';
        state.lessons = [];
        this.render();

        try {
            const lessons = await HomeworkApi.getDay(iso);
            const groupIds = [...new Set(lessons.map(lesson => lesson.groupId))];
            // Без ответа сайта число оценок/комментариев неизвестно (null): урок без оценок по нему не объявляется
            const [texts, next, marks, comments] = await Promise.all([
                HomeworkApi.getTexts(lessons.flatMap(lesson => lesson.existingIds)),
                HomeworkApi.getNextDates(groupIds, iso),
                HomeworkApi.getMarkCounts(groupIds, iso).catch(() => null),
                HomeworkApi.getCommentCounts(lessons.map(lesson => lesson.id)).catch(() => null)
            ]);
            if (id !== this.loadId) return;

            state.lessons = lessons.map(lesson => {
                const marksCount = marks ? marks[lesson.id] ?? 0 : null;
                const commentsCount = comments ? comments[lesson.id] ?? 0 : null;
                return {
                    ...lesson,
                    existing: lesson.existingIds.map(homeworkId => texts[homeworkId]).filter(Boolean),
                    existingCount: lesson.existingIds.length,
                    text: '',
                    due: next[lesson.groupId] ?? '',
                    status: '',
                    message: '',
                    marksCount,
                    commentsCount,
                    // Отмечаются уроки без оценок и без комментариев: повторный запуск не плодит комментарии
                    pick: marksCount === 0 && commentsCount === 0 && lesson.ready,
                    commentStatus: '',
                    commentMessage: ''
                };
            });
        } catch (error) {
            if (id !== this.loadId) return;
            state.error = ColleagueApi.describeError(error);
        }

        state.loading = false;
        this.render();
    },

    /**
     * Можно ли выдавать ДЗ в выбранный день: сайт не принимает дату выдачи раньше сегодняшней
     * @returns {boolean}
     */
    canAssign() {
        return this.state.iso >= ColleagueApi.isoDate(new Date());
    },

    /**
     * Уроки, по которым введён текст и которые ещё не выданы в этом окне; без следующего урока группы срока сдачи нет
     * @returns {Array}
     */
    pending() {
        return this.state.lessons.filter(lesson => lesson.ready && lesson.due && lesson.text.trim() && lesson.status !== 'ok');
    },

    /**
     * Перерисовывает окно: день недели, список уроков, подвал
     * @returns {void}
     */
    render() {
        if (!this.overlay) return;

        const { iso, loading, error, lessons, tab } = this.state;
        const [year, month, day] = iso.split('-').map(Number);
        this.overlay.querySelector('.mscp-hw-weekday').textContent =
            new Date(year, month - 1, day).toLocaleDateString('ru-RU', { weekday: 'long' });

        const today = ColleagueApi.isoDate(new Date());
        const dateInput = this.overlay.querySelector('.mscp-hw-date');
        dateInput.min = today;
        this.overlay.querySelector('.mscp-hw-prev').disabled = iso <= today;
        this.overlay.querySelectorAll('.mscp-hw-tab').forEach(button => {
            button.classList.toggle('mscp-hw-tab-active', button.dataset.tab === tab);
        });
        this.overlay.querySelector('.mscp-hw-commentbar').hidden = tab !== 'comments';

        const list = this.overlay.querySelector('.mscp-hw-list');
        list.replaceChildren();

        if (loading || error || !lessons.length) {
            const note = document.createElement('div');
            note.className = error ? 'mscp-hw-empty mscp-hw-error' : 'mscp-hw-empty';
            note.textContent = loading ? 'Загрузка...' : error || 'В этот день у вас нет уроков.';
            list.append(note);
        } else {
            lessons.forEach(lesson => list.append(tab === 'comments' ? this.renderCommentLesson(lesson) : this.renderLesson(lesson)));
        }

        this.renderFooter();
    },

    /**
     * Строка урока на вкладке комментариев: галочка, время, название и сколько оценок/комментариев уже есть
     * @param {Object} lesson - урок из load()
     * @returns {HTMLElement}
     */
    renderCommentLesson(lesson) {
        const row = document.createElement('label');
        row.className = 'mscp-hw-lesson mscp-hw-commentrow';

        const check = document.createElement('input');
        check.type = 'checkbox';
        check.checked = lesson.pick;
        check.disabled = this.state.sending || !lesson.ready || lesson.marksCount === null;
        check.addEventListener('change', () => {
            lesson.pick = check.checked;
            this.renderFooter();
        });

        const time = document.createElement('span');
        time.className = 'mscp-hw-time';
        time.textContent = lesson.time;
        const title = document.createElement('span');
        title.className = 'mscp-hw-title';
        title.textContent = `${lesson.className} ${lesson.subject}`.trim();

        const marks = document.createElement('span');
        marks.className = lesson.marksCount === 0 ? 'mscp-hw-badge mscp-hw-badge-none' : 'mscp-hw-badge';
        marks.textContent = lesson.marksCount === null ? 'оценки: не удалось узнать' : `оценок: ${lesson.marksCount}`;

        const comments = document.createElement('span');
        comments.className = 'mscp-hw-badge';
        comments.textContent = lesson.commentsCount === null ? 'комментарии: не удалось узнать' : `комментариев: ${lesson.commentsCount}`;

        const status = document.createElement('span');
        status.className = `mscp-hw-status ${lesson.commentStatus ? `mscp-hw-${lesson.commentStatus}` : ''}`;
        status.textContent = lesson.commentMessage;

        row.append(check, time, title, marks, comments, status);
        return row;
    },

    /**
     * Уроки, отмеченные для комментария и ещё не получившие его в этом окне
     * @returns {Array}
     */
    pendingComments() {
        return this.state.lessons.filter(lesson => lesson.pick && lesson.ready && lesson.commentStatus !== 'ok');
    },

    /**
     * Карточка одного урока
     * @param {Object} lesson - урок из load()
     * @returns {HTMLElement}
     */
    renderLesson(lesson) {
        const row = document.createElement('div');
        row.className = 'mscp-hw-lesson';

        const head = document.createElement('div');
        head.className = 'mscp-hw-head';
        const time = document.createElement('span');
        time.className = 'mscp-hw-time';
        time.textContent = lesson.time;
        const title = document.createElement('span');
        title.className = 'mscp-hw-title';
        title.textContent = `${lesson.className} ${lesson.subject}`.trim();
        head.append(time, title);

        if (lesson.existingCount) {
            const badge = document.createElement('span');
            badge.className = 'mscp-hw-badge';
            badge.textContent = `ДЗ уже есть: ${lesson.existingCount}`;
            badge.title = lesson.existing.join('\n\n');
            head.append(badge);
        }

        const status = document.createElement('span');
        status.className = `mscp-hw-status ${lesson.status ? `mscp-hw-${lesson.status}` : ''}`;
        status.textContent = lesson.message;
        head.append(status);
        row.append(head);

        if (!lesson.ready) {
            const warning = document.createElement('div');
            warning.className = 'mscp-hw-hint';
            warning.textContent = 'Нет данных о группе или учениках: выдайте ДЗ на этот урок в журнале.';
            row.append(warning);
            return row;
        }

        const text = document.createElement('textarea');
        text.className = 'mscp-hw-text';
        text.rows = 2;
        text.placeholder = 'Текст домашнего задания (пусто — не выдавать)';
        text.value = lesson.text;
        text.disabled = this.state.sending || !lesson.due;
        text.addEventListener('input', () => {
            lesson.text = text.value;
            if (lesson.status === 'error') {
                lesson.status = '';
                lesson.message = '';
                status.className = 'mscp-hw-status';
                status.textContent = '';
            }
            this.renderFooter();
        });

        const due = document.createElement('div');
        due.className = 'mscp-hw-hint';
        due.textContent = lesson.due
            ? `Срок сдачи — следующий урок: ${HomeworkApi.siteDate(lesson.due).slice(0, 5)}`
            : 'Следующий урок группы в ближайшие недели не найден: выдайте ДЗ в журнале.';

        row.append(text, due);
        return row;
    },

    /**
     * Подвал: сколько уроков будет выдано и доступна ли кнопка
     * @returns {void}
     */
    renderFooter() {
        if (!this.overlay) return;

        if (this.state.tab === 'comments') {
            this.renderCommentFooter();
            return;
        }

        const { sending, lessons } = this.state;
        const pending = this.pending();
        const canAssign = this.canAssign();

        let summary = 'Заполните ДЗ хотя бы по одному уроку.';
        if (!canAssign) summary = 'Сайт не принимает выдачу ДЗ за прошедшие дни.';
        else if (sending) summary = 'Отправка...';
        else if (pending.length) summary = `Будет выдано ДЗ: ${pending.length}`;
        else if (lessons.some(lesson => lesson.status === 'ok')) summary = 'Готово. Можно выдать ещё.';

        this.overlay.querySelector('.mscp-hw-summary').textContent = summary;
        const send = this.overlay.querySelector('.mscp-hw-send');
        send.textContent = 'Выдать ДЗ';
        send.disabled = sending || !canAssign || !pending.length;
    },

    /**
     * Подвал вкладки комментариев: сколько будет поставлено и доступна ли кнопка
     * @returns {void}
     */
    renderCommentFooter() {
        const { sending, lessons, commentText } = this.state;
        const pending = this.pendingComments();
        const hasText = commentText.length > 0;

        let summary = 'Отметьте уроки, на которые нужен комментарий.';
        if (!hasText) summary = 'Введите текст комментария.';
        else if (sending) summary = 'Отправка...';
        else if (pending.length) summary = `Будет поставлено комментариев: ${pending.length}`;
        else if (lessons.some(lesson => lesson.commentStatus === 'ok')) summary = 'Готово.';
        else if (lessons.length && lessons.every(lesson => lesson.marksCount !== 0)) summary = 'На всех уроках дня уже есть оценки.';

        this.overlay.querySelector('.mscp-hw-summary').textContent = summary;
        const send = this.overlay.querySelector('.mscp-hw-send');
        send.textContent = 'Поставить комментарии';
        send.disabled = sending || !hasText || !pending.length;
    },

    /**
     * Отправляет ДЗ по заполненным урокам по очереди; ошибка одного урока не останавливает остальные
     * Вход, который перестал определяться, обрывает отправку: дальше запросы всё равно не пройдут
     * @returns {Promise<void>}
     */
    async send() {
        const state = this.state;
        if (state.sending) return;

        const queue = this.pending();
        if (!queue.length) return;

        state.sending = true;
        queue.forEach(lesson => {
            lesson.status = 'wait';
            lesson.message = 'в очереди';
        });
        this.render();

        for (const lesson of queue) {
            if (!this.overlay) return;

            lesson.message = 'отправка...';
            this.render();

            try {
                const created = await HomeworkApi.createHomework(lesson, lesson.text.trim(), state.iso, lesson.due, this.DEFAULT_DURATION);
                lesson.status = 'ok';
                lesson.message = 'выдано';
                lesson.existing.push(lesson.text.trim());
                lesson.existingCount++;
                if (created?.id) lesson.existingIds.push(created.id);
                lesson.text = '';
            } catch (error) {
                lesson.status = 'error';
                lesson.message = error.status === 401 || error.status === 0 ? ColleagueApi.describeError(error) : error.message;
                if (error.status === 401 || error.status === 0) break;
            }
        }

        queue.filter(lesson => lesson.status === 'wait').forEach(lesson => {
            lesson.status = '';
            lesson.message = '';
        });

        state.sending = false;
        this.render();
    },

    /**
     * Ставит комментарий случайному ученику группы на каждом отмеченном уроке, по одному запросу за раз
     * Текст берётся как введён, без обрезки пробелов: так можно поставить "пустой" комментарий
     * Вход, который перестал определяться, обрывает отправку, как в send()
     * @returns {Promise<void>}
     */
    async sendComments() {
        const state = this.state;
        if (state.sending || !state.commentText) return;

        const queue = this.pendingComments();
        if (!queue.length) return;

        const text = state.commentText;
        state.sending = true;
        queue.forEach(lesson => {
            lesson.commentStatus = 'wait';
            lesson.commentMessage = 'в очереди';
        });
        this.render();

        for (const lesson of queue) {
            if (!this.overlay) return;

            lesson.commentMessage = 'отправка...';
            this.render();

            try {
                const studentId = lesson.studentIds[Math.floor(Math.random() * lesson.studentIds.length)];
                await HomeworkApi.createComment(lesson, studentId, text);
                const name = await HomeworkApi.getStudentName(lesson, studentId);
                lesson.commentStatus = 'ok';
                lesson.commentMessage = name ? `поставлен: ${name}` : 'поставлен';
                lesson.commentsCount++;
                lesson.pick = false;
            } catch (error) {
                lesson.commentStatus = 'error';
                lesson.commentMessage = error.status === 401 || error.status === 0 ? ColleagueApi.describeError(error) : error.message;
                if (error.status === 401 || error.status === 0) break;
            }
        }

        queue.filter(lesson => lesson.commentStatus === 'wait').forEach(lesson => {
            lesson.commentStatus = '';
            lesson.commentMessage = '';
        });

        state.sending = false;
        this.render();
        // Значки "У" в расписании за окном должны сразу показать новые комментарии
        if (queue.some(lesson => lesson.commentStatus === 'ok')) ScheduleComments.reset();
    },

    /**
     * Добавляет стили окна один раз
     * @returns {void}
     */
    addStyles() {
        if (document.getElementById('mscp-homework-styles')) return;

        const style = document.createElement('style');
        style.id = 'mscp-homework-styles';
        style.textContent = `
            .mscp-hw-window {
                display: flex;
                flex-direction: column;
                width: min(760px, 96vw);
                height: min(720px, 92vh);
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                overflow: hidden;
            }
            .mscp-hw-tabs {
                flex: none;
                display: flex;
                gap: 4px;
                padding: 8px 18px 0;
                border-bottom: 1px solid #e9ecef;
            }
            .mscp-hw-tab {
                padding: 7px 14px;
                border: none;
                border-bottom: 2px solid transparent;
                background: none;
                font-size: 14px;
                color: #868e96;
                cursor: pointer;
            }
            .mscp-hw-tab:hover { color: #212529; }
            .mscp-hw-tab-active { color: #3b5bdb; border-bottom-color: #3b5bdb; font-weight: 600; }
            .mscp-hw-commentbar {
                flex: none;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 18px;
                border-bottom: 1px solid #e9ecef;
                font-size: 13px;
                color: #495057;
            }
            .mscp-hw-commentbar[hidden] { display: none; }
            .mscp-hw-comment {
                flex: 1;
                padding: 6px 10px;
                border: 1px solid #ced4da;
                border-radius: 6px;
                font: inherit;
                font-size: 13px;
            }
            .mscp-hw-commentrow {
                display: flex;
                align-items: baseline;
                gap: 10px;
                font-size: 14px;
                cursor: pointer;
            }
            .mscp-hw-badge-none { background: #fff5f5; color: #c92a2a; }
            .mscp-hw-toolbar {
                flex: none;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 18px;
                border-bottom: 1px solid #e9ecef;
                background: #f8f9fa;
            }
            .mscp-hw-nav {
                width: 32px;
                height: 32px;
                border: 1px solid #ced4da;
                border-radius: 6px;
                background: white;
                font-size: 20px;
                line-height: 1;
                cursor: pointer;
            }
            .mscp-hw-nav:hover { background: #ececec; }
            .mscp-hw-nav:disabled { opacity: 0.4; cursor: default; background: white; }
            .mscp-hw-date {
                padding: 5px 8px;
                border: 1px solid #ced4da;
                border-radius: 6px;
                font-size: 13px;
            }
            .mscp-hw-weekday {
                font-size: 13px;
                color: #868e96;
                text-transform: capitalize;
            }
            .mscp-hw-list {
                flex: 1;
                overflow-y: auto;
                padding: 12px 18px;
            }
            .mscp-hw-empty {
                padding: 40px 0;
                text-align: center;
                color: #868e96;
                font-size: 14px;
            }
            .mscp-hw-error { color: #c92a2a; }
            .mscp-hw-lesson {
                padding: 10px 0 12px;
                border-bottom: 1px solid #f1f3f5;
            }
            .mscp-hw-head {
                display: flex;
                align-items: baseline;
                gap: 10px;
                margin-bottom: 6px;
                font-size: 14px;
            }
            .mscp-hw-time { color: #868e96; font-variant-numeric: tabular-nums; }
            .mscp-hw-title { font-weight: 600; color: #212529; }
            .mscp-hw-badge {
                padding: 1px 8px;
                border-radius: 10px;
                background: #e7f5ff;
                color: #1864ab;
                font-size: 11px;
                cursor: help;
            }
            .mscp-hw-status { margin-left: auto; font-size: 12px; color: #868e96; }
            .mscp-hw-ok { color: #2b8a3e; font-weight: 600; }
            .mscp-hw-error.mscp-hw-status { color: #c92a2a; text-align: right; }
            .mscp-hw-text {
                box-sizing: border-box;
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #ced4da;
                border-radius: 6px;
                font: inherit;
                font-size: 13px;
                resize: vertical;
            }
            .mscp-hw-hint { margin-top: 6px; font-size: 12px; color: #868e96; }
            .mscp-hw-footer {
                flex: none;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 12px 18px;
                border-top: 1px solid #e9ecef;
            }
            .mscp-hw-summary { font-size: 13px; color: #495057; }
            .mscp-hw-send {
                padding: 8px 18px;
                border: none;
                border-radius: 8px;
                background: #3b5bdb;
                color: white;
                font-size: 14px;
                cursor: pointer;
            }
            .mscp-hw-send:hover:not(:disabled) { background: #364fc7; }
            .mscp-hw-send:disabled { background: #adb5bd; cursor: default; }
        `;
        document.head.appendChild(style);
    }
};


// ============================================================
// СТРАНИЦА РАСПИСАНИЯ
// ============================================================

/**
 * Управляет страницей "Расписание уроков"
 * - Ставит кнопки расписания коллег и настроек справа от переключателя недель
 * - Включает вид расписания, выбранный в настройках: классический (без изменений),
 *   компактный (ScheduleCompact) или заменённый (ScheduleLayout)
 */
const SchedulePage = {
    /** @type {MutationObserver|null} Следит за перерисовкой шапки, чтобы вернуть кнопку на место */
    observer: null,

    /**
     * Запускает страницу; если уже запущена, только применяет вид расписания из настроек
     * @returns {void}
     */
    start() {
        if (!this.observer) {
            createStyles();
            this.observer = new MutationObserver(() => this.insertButton());
            this.observer.observe(document.body, { childList: true, subtree: true });
        }

        this.insertButton();
        this.applyStyle();
    },

    /**
     * Останавливает всё: кнопка убирается, расписание сайта возвращается к виду по умолчанию
     * @returns {void}
     */
    stop() {
        if (!this.observer) return;

        this.observer.disconnect();
        this.observer = null;
        ScheduleLayout.stop();
        ScheduleCompact.stop();
        document.querySelector('.mscp-button-box')?.remove();
        document.querySelector('.mscp-colleagues-box')?.remove();
        Colleagues.close();
        HomeworkDay.close();
        document.querySelector('.mscp-homework-box')?.remove();
    },

    /**
     * Включает вид расписания из настроек и выключает остальные
     * @returns {void}
     */
    applyStyle() {
        const style = loadSettings().scheduleStyle;

        if (style === 'compact') {
            ScheduleLayout.stop();
            ScheduleCompact.start();
        } else if (style === 'classic') {
            ScheduleLayout.stop();
            ScheduleCompact.stop();
        } else {
            ScheduleCompact.stop();
            ScheduleLayout.start();
        }
    },

    /**
     * Ставит кнопку настроек сразу после блока переключения недель
     * @returns {void}
     */
    insertButton() {
        if (document.querySelector('.mscp-button-box')) return;

        // Блок переключения недель: три кнопки (назад, период, вперёд) в цепочке обёрток с одним потомком.
        // Кнопка кладётся в самую внешнюю из них: рядом с ней строка шапки разносит блоки по краям
        let weekSwitch = document.querySelector(CONFIG.SELECTORS.SCHEDULE_WEEK_PREV)?.parentElement;
        while (weekSwitch?.parentElement?.childElementCount === 1) {
            weekSwitch = weekSwitch.parentElement;
        }
        if (!weekSwitch?.parentElement) return;

        const colleagues = createColleaguesButton();
        colleagues.style.marginLeft = '8px';
        const homework = createHomeworkButton();
        homework.style.marginLeft = '8px';
        const button = createSettingsButton();
        button.style.marginLeft = '8px';
        weekSwitch.append(colleagues, homework, button);
    }
};


// ============================================================
// SVG ИКОНКИ
// ============================================================

/**
 * Создаёт SVG-иконку расписания коллег (два человека)
 * @returns {string} HTML-строка с SVG-элементом
 */
function createColleaguesIcon() {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#909090" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="8" r="3.5"></circle>
            <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"></path>
            <path d="M15.5 4.7a3.5 3.5 0 0 1 0 6.6"></path>
            <path d="M18 14.3c2.2.7 3.5 2.6 3.5 5.7"></path>
        </svg>
    `;
}

/**
 * Создаёт SVG-иконку домашнего задания на день (тетрадный лист с карандашом)
 * @returns {string} HTML-строка с SVG-элементом
 */
function createHomeworkIcon() {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#909090" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"></path>
            <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"></path>
        </svg>
    `;
}

/**
 * Создаёт SVG-иконку выбора ученика для ответа (игральная кость)
 * @returns {string} HTML-строка с SVG-элементом
 */
function createPickIcon() {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#909090" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3"></rect>
            <circle cx="8.5" cy="8.5" r="1" fill="#909090"></circle>
            <circle cx="15.5" cy="8.5" r="1" fill="#909090"></circle>
            <circle cx="12" cy="12" r="1" fill="#909090"></circle>
            <circle cx="8.5" cy="15.5" r="1" fill="#909090"></circle>
            <circle cx="15.5" cy="15.5" r="1" fill="#909090"></circle>
        </svg>
    `;
}

/**
 * Создаёт SVG-иконку настроек (шестерёнка с кистью)
 * @returns {string} HTML-строка с SVG-элементом
 */
function createSettingsIcon() {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20" version="1.1" viewBox="0 0 32 32">
            <defs>
                <linearGradient id="mscp-gradient" x1="6.0911" x2="25.908" y1="26.626" y2="5.3748" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#ff0063" offset="0"></stop>
                    <stop stop-color="#fdff00" offset=".32325"></stop>
                    <stop stop-color="#0c0aff" offset=".35364"></stop>
                    <stop stop-color="#0200ff" offset=".51622"></stop>
                    <stop offset=".52463"></stop>
                </linearGradient>
            </defs>
            <g transform="matrix(1.1018 0 0 1.2006 -1.6207 -3.2015)">
                <g transform="matrix(1.3333 0 0 1.3333 3.7785e-5 4e-7)" fill="#909090">
                    <path d="m10 2c-0.55228 0-1 0.44772-1 1v1.5818c-0.69525 0.2814-1.3415 0.65745-1.9229 1.1119l-1.3713-0.79172c-0.22968-0.13261-0.50264-0.16855-0.75882-0.09991-0.25618 0.06865-0.47459 0.23625-0.6072 0.46593l-2 3.4641c-0.27614 0.47829-0.11227 1.0899 0.36602 1.366l1.3708 0.7914c-0.05051 0.3633-0.07657 0.7341-0.07657 1.1105s0.02606 0.7471 0.07657 1.1105l-1.3708 0.7914c-0.22969 0.1326-0.39728 0.351-0.46593 0.6072-0.06864 0.2562-0.03271 0.5291 0.0999 0.7588l2 3.4641c0.13261 0.2297 0.35103 0.3973 0.60721 0.466 0.25618 0.0686 0.52913 0.0327 0.75882-0.0999l1.3713-0.7918c0.5814 0.4544 1.2277 0.8305 1.9229 1.1119v1.5818c0 0.5523 0.44772 1 1 1h4c0.5522 0 1-0.4477 1-1v-1.5818c0.6952-0.2814 1.3415-0.6575 1.9229-1.1119l1.3713 0.7918c0.2297 0.1326 0.5026 0.1685 0.7588 0.0999 0.2562-0.0687 0.4746-0.2363 0.6072-0.4659l2-3.4641c0.1326-0.2297 0.1686-0.5027 0.0999-0.7589-0.0686-0.2561-0.2362-0.4746-0.4659-0.6072l-1.3708-0.7914c0.0505-0.3633 0.0766-0.7341 0.0766-1.1105s-0.0261-0.7472-0.0766-1.1105l1.3708-0.7914c0.4783-0.27619 0.6422-0.88778 0.366-1.3661l-2-3.4641c-0.1326-0.22969-0.351-0.39728-0.6072-0.46593-0.2562-0.06864-0.5291-0.03271-0.7588 0.0999l-1.3713 0.79174c-0.5814-0.45442-1.2277-0.83046-1.9229-1.1119v-1.5818c0-0.55228-0.4478-1-1-1zm1 3.2899v-1.2899h2v1.2899c0 0.44242 0.2907 0.83225 0.7147 0.95845 0.9111 0.27116 1.7328 0.75367 2.4076 1.392 0.3213 0.30395 0.8041 0.3607 1.1872 0.13955l1.1187-0.64589 1 1.732-1.1173 0.64507c-0.3828 0.22098-0.5751 0.66703-0.473 1.097 0.1058 0.4457 0.1621 0.9116 0.1621 1.3919s-0.0563 0.9462-0.1621 1.3919c-0.1021 0.43 0.0902 0.876 0.473 1.097l1.1173 0.6451-1 1.732-1.1188-0.6459c-0.383-0.2211-0.8658-0.1644-1.1872 0.1396-0.6747 0.6383-1.4964 1.1208-2.4075 1.3919-0.424 0.1262-0.7147 0.5161-0.7147 0.9585v1.2899h-2v-1.2899c0-0.4424-0.2908-0.8323-0.7148-0.9585-0.91111-0.2711-1.7327-0.7536-2.4075-1.3919-0.32132-0.304-0.80415-0.3607-1.1872-0.1396l-1.1187 0.6459-1-1.732 1.1173-0.6451c0.38275-0.221 0.57504-0.667 0.47296-1.097-0.1058-0.4457-0.16204-0.9116-0.16204-1.3919s0.05623-0.9462 0.16204-1.3919c0.10208-0.43-0.09022-0.87603-0.47296-1.097l-1.1173-0.64506 1-1.732 1.1187 0.64588c0.38305 0.22115 0.86587 0.16439 1.1872-0.13956 0.67479-0.63831 1.4964-1.1208 2.4075-1.392 0.424-0.1262 0.7148-0.51603 0.7148-0.95845zm-1 6.7101c0-1.1046 0.89542-2 2-2s2 0.8954 2 2-0.8954 2-2 2-2-0.8954-2-2zm2-4c-2.2092 0-4 1.7909-4 4 0 2.2091 1.7909 4 4 4 2.2091 0 4-1.7909 4-4 0-2.2091-1.7909-4-4-4z" clip-rule="evenodd" fill="#909090" fill-rule="evenodd"></path>
                </g>
                <path d="m27.555 8.42c-1.355 1.647-5.07 6.195-8.021 9.81l-3.747-3.804c3.389-3.016 7.584-6.744 9.1-8.079 2.697-2.377 5.062-3.791 5.576-3.213 0.322 0.32-0.533 2.396-2.908 5.286zm-8.676 10.61c-1.143 1.399-2.127 2.604-2.729 3.343l-4.436-4.323c0.719-0.64 1.916-1.705 3.304-2.939zm-3.39 4.153v-0.012c-2.575 9.88-14.018 4.2-14.018 4.2s4.801 0.605 4.801-3.873c0-4.341 4.412-4.733 4.683-4.753l4.543 4.427c0 1e-3 -9e-3 0.011-9e-3 0.011z" fill="url(#mscp-gradient)" style="mix-blend-mode:normal"></path>
            </g>
        </svg>
    `;
}


// ============================================================
// КНОПКИ
// ============================================================

/**
 * Создаёт кнопки журнала (выбор ученика и настройки) и добавляет в DOM
 * @param {HTMLElement} parentElement - элемент, в который добавляется кнопка
 * @returns {void}
 */
function createButtons(parentElement) {
    const pick = createPickButton();
    pick.style.marginRight = '8px';
    parentElement.append(pick, createSettingsButton());
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
 * Создаёт кнопку выбора ученика для ответа
 * @returns {HTMLElement} контейнер с кнопкой
 */
function createPickButton() {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'mscp-pick-box';
    buttonContainer.style.cssText = 'box-shadow: 1px 1px 4px 0px rgba(0, 0, 0, 0.07); border-radius: 8px; display: inline-flex;';

    const button = document.createElement('button');
    button.className = 'mscp-button';
    button.innerHTML = createPickIcon();
    button.title = 'Выбрать ученика для ответа. Повторное нажатие снимает подсветку, названный ученик сегодня больше не выпадет';
    button.addEventListener('click', () => StudentPicker.pick(button));
    buttonContainer.appendChild(button);

    return buttonContainer;
}

/**
 * Создаёт кнопку расписания коллег и классов
 * @returns {HTMLElement} контейнер с кнопкой
 */
function createColleaguesButton() {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'mscp-colleagues-box';
    buttonContainer.style.cssText = 'box-shadow: 1px 1px 4px 0px rgba(0, 0, 0, 0.07); border-radius: 8px; display: inline-flex;';

    const button = document.createElement('button');
    button.className = 'mscp-button';
    button.innerHTML = createColleaguesIcon();
    button.title = 'Расписание коллег и классов';
    button.addEventListener('click', () => Colleagues.open());
    buttonContainer.appendChild(button);

    return buttonContainer;
}

/**
 * Создаёт кнопку окна "ДЗ и комментарии"
 * @returns {HTMLElement} контейнер с кнопкой
 */
function createHomeworkButton() {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'mscp-homework-box';
    buttonContainer.style.cssText = 'box-shadow: 1px 1px 4px 0px rgba(0, 0, 0, 0.07); border-radius: 8px; display: inline-flex;';

    const button = document.createElement('button');
    button.className = 'mscp-button';
    button.innerHTML = createHomeworkIcon();
    button.title = 'ДЗ и комментарии на уроки дня';
    button.addEventListener('click', () => HomeworkDay.open());
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


// ============================================================
// ЭКСПОРТ: журнал и токен входа
// ============================================================

/**
 * Скачивает токен входа в формате token.json проекта школьного журнала:
 * {"aupd_token": "...", "profile_id": "..."}
 * Токен и профиль берутся из cookie, куда их кладёт сайт после входа
 * @returns {{ok: boolean, daysLeft?: number}} ok — false, если cookie с токеном нет; daysLeft — сколько суток он ещё действует
 */
function downloadToken() {
    const token = ColleagueApi.readCookie('aupd_token');
    const profile = ColleagueApi.readCookie('profile_id');
    if (!token || !profile) return { ok: false };

    const link = document.createElement('a');
    const file = new Blob([JSON.stringify({ aupd_token: token, profile_id: profile }, null, 2)], { type: 'application/json' });

    link.href = URL.createObjectURL(file);
    link.download = 'token.json';
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);

    // Срок жизни — в самом токене (JWT, поле exp в секундах)
    let daysLeft;
    try {
        const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        daysLeft = (JSON.parse(atob(payload)).exp * 1000 - Date.now()) / 86400000;
    } catch (error) {
        console.error('Не удалось прочитать срок токена:', error);
    }

    return { ok: true, daysLeft };
}

/**
 * Скачивает таблицу журнала как HTML-файл
 * @returns {void}
 */
function downloadAsFile() {
    const table = document.querySelector(CONFIG.SELECTORS.JOURNAL_TABLE);
    if (!table) return;

    const link = document.createElement('a');
    const file = new Blob([table.outerHTML], { type: 'text/html' });

    link.href = URL.createObjectURL(file);
    link.download = 'journal_export.html';
    link.click();
    link.remove();
}


// ============================================================
// МОДАЛЬНОЕ ОКНО: вкладки и секции формы настроек
// ============================================================

/**
 * Вкладки окна настроек. Вкладка показывается, если на этой странице есть что настраивать
 * @type {Array<{id: string, label: string, isAvailable: function(): boolean, build: function(Object): HTMLElement}>}
 */
const SETTINGS_TABS = [
    {
        id: 'journal',
        label: 'Журнал',
        isAvailable: () => isTargetUrl(window.location.href),
        build: createJournalTab
    },
    {
        id: 'schedule',
        label: 'Расписание',
        isAvailable: () => true,
        build: createScheduleTab
    },
    {
        id: 'access',
        label: 'Токен',
        isAvailable: () => true,
        build: createAccessTab
    }
];

/**
 * Создаёт секцию вкладки: заголовок и строки настроек
 * @param {string} title - заголовок секции
 * @param {...HTMLElement} children - содержимое секции
 * @returns {HTMLElement} DOM-элемент секции
 */
function createSection(title, ...children) {
    const section = document.createElement('section');
    section.className = 'mscp-section';

    if (title) {
        const heading = document.createElement('h3');
        heading.className = 'mscp-section-title';
        heading.textContent = title;
        section.appendChild(heading);
    }

    section.append(...children);
    return section;
}

/**
 * Создаёт строку с переключателем: название, пояснение и тумблер справа
 * @param {string} key - ключ настройки (data-key)
 * @param {string} title - название настройки
 * @param {string} description - пояснение мелким шрифтом (может быть пустым)
 * @param {boolean} checked - включена ли настройка
 * @returns {HTMLElement} DOM-элемент строки
 */
function createSwitchRow(key, title, description, checked) {
    const row = document.createElement('label');
    row.className = 'mscp-row';
    row.innerHTML = `
        <span class="mscp-row-text">
            <span class="mscp-row-title">${title}</span>
            ${description ? `<span class="mscp-row-desc">${description}</span>` : ''}
        </span>
        <span class="mscp-switch">
            <input type="checkbox" class="mscp-checkbox" data-key="${key}" ${checked ? 'checked' : ''}>
            <span class="mscp-switch-track"></span>
        </span>
    `;
    return row;
}

/**
 * Создаёт строку с кнопкой действия: название, пояснение и кнопка справа
 * @param {string} title - название действия
 * @param {string} description - пояснение мелким шрифтом
 * @param {string} buttonText - текст кнопки
 * @param {function(HTMLButtonElement): void} onClick - обработчик нажатия, получает кнопку
 * @returns {HTMLElement} DOM-элемент строки
 */
function createActionRow(title, description, buttonText, onClick) {
    const row = document.createElement('div');
    row.className = 'mscp-row mscp-row-static';
    row.innerHTML = `
        <span class="mscp-row-text">
            <span class="mscp-row-title">${title}</span>
            <span class="mscp-row-desc">${description}</span>
        </span>
        <button type="button" class="mscp-btn-action">${buttonText}</button>
    `;

    const button = row.querySelector('button');
    button.addEventListener('click', () => onClick(button));
    return row;
}

/**
 * Создаёт вкладку "Журнал": цветной режим, поведение страницы и действия с журналом
 * @param {Object} currentSettings - текущие настройки
 * @returns {HTMLElement} DOM-элемент вкладки
 */
function createJournalTab(currentSettings) {
    const tab = document.createElement('div');

    const colorRows = [
        ['colorAccumulation', 'Накопляемость оценок', 'Полоса у имени ученика по числу оценок'],
        ['colorLessonGrades', 'Оценки за уроки', 'Цвет ячейки по оценке'],
        ['colorAverageGrade', 'Средний балл', 'Цвет среднего балла'],
        ['colorBorderlineGrades', 'Пограничные оценки', 'Уголок у оценки, которой не хватает до границы']
    ].map(([key, title, description]) => createSwitchRow(key, title, description, currentSettings[key]));

    const pageRows = [
        createSwitchRow('hideAverageMark', 'Выключать средний балл по теме', 'При каждой загрузке журнала', currentSettings.hideAverageMark),
        createSwitchRow('hideBanner', 'Убрать баннер', 'Если снять галочку, баннер вернётся после перезагрузки страницы', currentSettings.hideBanner)
    ];

    const actionRows = [
        createActionRow('Скачать журнал', 'Сохранить таблицу журнала в файл', 'Скачать', () => downloadAsFile()),
        createActionRow('Убрать шапку сайта', 'Один раз, до перезагрузки страницы', 'Убрать', button => {
            try {
                removeHeaderAndSetHeight();
                button.textContent = 'Убрана';
            } catch (error) {
                console.error('Не удалось убрать шапку:', error);
                button.textContent = 'Не вышло';
            }
            button.disabled = true;
        })
    ];

    tab.append(
        createJournalInfo(),
        createSection('Вызов к доске', createPickModeRow(currentSettings)),
        createSection('Цветной режим', ...colorRows),
        createSection('Страница', ...pageRows),
        createSection('Действия', ...actionRows)
    );
    return tab;
}

/**
 * Создаёт строку выбора способа вызова ученика к доске
 * @param {Object} currentSettings - текущие настройки
 * @returns {HTMLElement} DOM-элемент строки
 */
function createPickModeRow(currentSettings) {
    const selected = PICK_MODES.some(mode => mode.value === currentSettings.pickMode)
        ? currentSettings.pickMode
        : DEFAULT_SETTINGS.pickMode;

    const modes = PICK_MODES.map(mode => `
        <label>
            <input type="radio" class="mscp-radio" data-key="pickMode" name="mscp-pick-mode" value="${mode.value}" ${mode.value === selected ? 'checked' : ''}>
            <span>${mode.label}</span>
        </label>
    `).join('');

    const row = document.createElement('div');
    row.className = 'mscp-row mscp-row-static';
    row.innerHTML = `
        <span class="mscp-row-text">
            <span class="mscp-row-title">Выбор ученика для ответа</span>
            <span class="mscp-row-desc">Предвзято: чем меньше оценок и чем давнее последняя, тем вероятнее; кто отвечал на последнем уроке, выпадает редко. Случайно: у всех присутствующих шансы равны. За день один и тот же ученик не выпадает дважды</span>
        </span>
        <span class="mscp-seg">${modes}</span>
    `;
    return row;
}

/**
 * Создаёт плитки со сведениями об открытом журнале
 * @returns {HTMLElement} DOM-элемент со сведениями
 */
function createJournalInfo() {
    const stats = document.createElement('div');
    stats.className = 'mscp-stats';

    const rounding = JournalState.isMathRound ? ['4,5', 'математическое'] : ['4,65', 'лицейское'];
    const items = [
        [JournalState.countLessons, 'уроков в триместре'],
        [JournalState.isWeNeed3Grades ? '3' : '5', 'оценок нужно'],
        [rounding[0], `округление ${rounding[1]}`]
    ];

    stats.innerHTML = items
        .map(([value, label]) => `<div class="mscp-stat"><b>${value}</b><span>${label}</span></div>`)
        .join('');
    return stats;
}

/**
 * Создаёт вкладку "Расписание": вид расписания и параметры заменённого вида
 * @param {Object} currentSettings - текущие настройки
 * @returns {HTMLElement} DOM-элемент вкладки
 */
function createScheduleTab(currentSettings) {
    const tab = document.createElement('div');

    const styleSection = createSection('Вид расписания', createScheduleStyleCards(currentSettings));
    const look = createScheduleLookOptions(currentSettings);
    styleSection.appendChild(look);

    // Параметры вида нужны только заменённому расписанию
    const syncLook = () => {
        const isCustom = tab.querySelector('input[name="mscp-schedule-style"]:checked')?.value === 'custom';
        look.hidden = !isCustom;
    };
    tab.addEventListener('change', syncLook);
    tab.appendChild(styleSection);
    syncLook();

    return tab;
}

/**
 * Создаёт вкладку "Токен": токен входа для проекта школьного журнала
 * @returns {HTMLElement} DOM-элемент вкладки
 */
function createAccessTab() {
    const tab = document.createElement('div');

    const row = createActionRow(
        'Токен входа (token.json)',
        'Файл для проекта школьного журнала. Токен даёт доступ к вашей учётной записи: никому его не передавайте и не выкладывайте. '
            + 'Действует около 10 суток, потом нужно скачать новый',
        'Скачать',
        button => {
            const result = downloadToken();
            if (!result.ok) {
                button.textContent = 'Нет токена';
            } else if (result.daysLeft === undefined) {
                button.textContent = 'Скачан';
            } else {
                button.textContent = `Скачан, ещё ${Math.max(0, Math.floor(result.daysLeft))} сут`;
            }
            setTimeout(() => { button.textContent = 'Скачать'; }, 4000);
        }
    );

    tab.appendChild(createSection('Проект «Школьный журнал»', row));
    return tab;
}

/**
 * Создаёт ряд карточек выбора вида расписания: эскиз, название и короткое пояснение
 * @param {Object} currentSettings - текущие настройки
 * @returns {HTMLElement} DOM-элемент с карточками
 */
function createScheduleStyleCards(currentSettings) {
    const cards = document.createElement('div');
    cards.className = 'mscp-options';

    const selected = SCHEDULE_STYLES.some(style => style.value === currentSettings.scheduleStyle)
        ? currentSettings.scheduleStyle
        : DEFAULT_SETTINGS.scheduleStyle;

    SCHEDULE_STYLES.forEach(style => {
        const option = document.createElement('label');
        option.className = 'mscp-option';
        option.innerHTML = `
            <input type="radio" class="mscp-radio" data-key="scheduleStyle" name="mscp-schedule-style" value="${style.value}" ${style.value === selected ? 'checked' : ''}>
            ${createScheduleThumbnail(style.value)}
            <span class="mscp-option-title">${style.label}</span>
            <span class="mscp-row-desc">${style.description}</span>
        `;
        cards.appendChild(option);
    });

    return cards;
}

/**
 * Рисует эскиз вида расписания для карточки выбора
 * @param {string} style - вид расписания: classic, compact или custom
 * @returns {string} HTML-строка с SVG-элементом
 */
function createScheduleThumbnail(style) {
    const columns = 5;
    const rects = [];

    for (let column = 0; column < columns; column++) {
        const x = 8 + column * 40;

        if (style === 'classic') {
            // Высокие карточки в сетке со шкалой времени
            const top = 10 + (column % 2) * 14;
            rects.push(`<rect x="${x}" y="${top}" width="34" height="28" rx="3" fill="#d1d5db"/>`);
            rects.push(`<rect x="${x}" y="${top + 34}" width="34" height="28" rx="3" fill="#d1d5db"/>`);
        } else if (style === 'compact') {
            // Много низких строк, уместившихся в окно
            for (let row = 0; row < 6; row++) {
                if ((row + column) % 4 === 3) continue;
                rects.push(`<rect x="${x}" y="${8 + row * 13}" width="34" height="10" rx="2" fill="#9ca3af"/>`);
            }
        } else {
            // Цветные карточки по номерам уроков
            const colors = ['#8b5cf6', '#3b82f6', '#14b8a6', '#f59e0b', '#ec4899'];
            for (let row = 0; row < 4; row++) {
                if ((row * 2 + column) % 5 === 4) continue;
                rects.push(`<rect x="${x}" y="${8 + row * 17}" width="34" height="14" rx="3" fill="${colors[(row + column) % colors.length]}"/>`);
            }
        }
    }

    return `<svg class="mscp-thumb" viewBox="0 0 208 76" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${rects.join('')}</svg>`;
}

/**
 * Создаёт параметры заменённого расписания: как помечать предмет, цвет класса и время на карточке
 * @param {Object} currentSettings - текущие настройки
 * @returns {HTMLElement} DOM-элемент с параметрами
 */
function createScheduleLookOptions(currentSettings) {
    const look = document.createElement('div');
    look.className = 'mscp-subpanel';

    const selected = SCHEDULE_SUBJECT_MARKS.some(mark => mark.value === currentSettings.scheduleSubjectMark)
        ? currentSettings.scheduleSubjectMark
        : DEFAULT_SETTINGS.scheduleSubjectMark;

    const marks = SCHEDULE_SUBJECT_MARKS.map(mark => `
        <label>
            <input type="radio" class="mscp-radio" data-key="scheduleSubjectMark" name="mscp-subject-mark" value="${mark.value}" ${mark.value === selected ? 'checked' : ''}>
            <span>${mark.label}</span>
        </label>
    `).join('');

    const markRow = document.createElement('div');
    markRow.className = 'mscp-row mscp-row-static';
    markRow.innerHTML = `
        <span class="mscp-row-text">
            <span class="mscp-row-title">Предмет на карточке</span>
            <span class="mscp-row-desc">Цвет — полоска слева. Подпись — название предмета. Если предмет один, он не помечается</span>
        </span>
        <span class="mscp-seg">${marks}</span>
    `;

    look.append(
        markRow,
        createSwitchRow('scheduleClassColor', 'Цвет класса', 'У одинаковых классов одинаковый цвет', currentSettings.scheduleClassColor !== false),
        createSwitchRow('scheduleShowTime', 'Время урока', 'Начало и конец урока на карточке', currentSettings.scheduleShowTime !== false)
    );

    const hint = document.createElement('div');
    hint.className = 'mscp-row-desc mscp-hint';
    hint.textContent = 'Значки У (оценки) и ДЗ на карточке урока: зелёный — есть, красный — нет, серый — срок ещё не вышел; голубое У — оценок нет, но есть комментарий. Подробнее — подсказка при наведении.';
    look.appendChild(hint);

    return look;
}


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


// ============================================================
// ВЫБОР УЧЕНИКА ДЛЯ ОТВЕТА
// ============================================================

/**
 * Выбор ученика к доске на странице журнала группы
 * - Кнопка выбирает ученика и подсвечивает его строку в журнале; других окон нет
 * - Данные берутся из API сайта: ученики группы, их оценки за учебный год и отметки "Н" на сегодня
 * - Предвзятый режим: чем меньше у ученика оценок и чем давнее последняя, тем вероятнее его выбор;
 *   кто получил оценку на последнем уроке (или уже отвечал сегодня), выбирается редко, но не исключён
 * - Случайный режим: все присутствующие равновероятны; отсутствующие сегодня не выбираются в обоих режимах
 * - За день можно выбирать много раз, но одного ученика дважды нельзя: названные хранятся по группе и дню
 * - Нажатие на кнопку при подсвеченной строке снимает подсветку (ученик остаётся названным), следующее выбирает нового
 * - Состояние дня хранится в localStorage, поэтому не пропадает при перезагрузке страницы
 */
const StudentPicker = {
    /** Ключ localStorage с выбором дня */
    STORAGE_KEY: 'MSCP_pick',

    /** Оценка не старше стольких дней учитывается в давности: дальше давность перестаёт расти */
    MAX_DAYS: 60,

    /** Через столько дней без оценок вес давности удваивается */
    RECENCY_DAYS: 14,

    /** Во сколько раз реже выбирается ученик, получивший оценку на последнем уроке */
    RECENT_FACTOR: 0.1,

    /** Столько оценок уменьшает вес вдвое: вес оценок = 1 / (1 + оценок / MARKS_HALF) */
    MARKS_HALF: 2,

    /** @type {boolean} Идёт ли сейчас загрузка данных для выбора */
    busy: false,

    /**
     * Номер группы из адреса журнала
     * @returns {number|null}
     */
    groupId() {
        const match = /\/journal\/(?:grade|my)\/(\d+)/.exec(window.location.pathname);
        return match ? Number(match[1]) : null;
    },

    /**
     * Дата из ответа сайта ДД.ММ.ГГГГ
     * @param {string} text
     * @returns {Date}
     */
    parseDate(text) {
        const [day, month, year] = text.split('.').map(Number);
        return new Date(year, month - 1, day);
    },

    /**
     * Состояние выбора этой группы за сегодня
     * @returns {{group: number, date: string, picked: number[], active: ?{name: string, why: string}}}
     *          picked — id названных учеников, active — тот, чья строка подсвечена сейчас
     */
    dayState() {
        const empty = { group: this.groupId(), date: ColleagueApi.isoDate(new Date()), picked: [], active: null };

        try {
            const saved = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || 'null');
            return saved?.group === empty.group && saved.date === empty.date ? { ...empty, ...saved } : empty;
        } catch (error) {
            return empty;
        }
    },

    /**
     * Запоминает состояние дня
     * @param {Object} state - см. dayState()
     * @returns {void}
     */
    saveState(state) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error('Не удалось сохранить выбор ученика:', error);
        }
    },

    /**
     * Загружает учеников группы с числом оценок и давностью последней
     * @param {number} groupId
     * @returns {Promise<Array<{id: number, name: string, marks: number, last: ?Date, days: ?number,
     *          recent: boolean, absent: boolean}>>}
     */
    async loadStudents(groupId) {
        const session = ColleagueApi.session();
        const today = new Date();
        const todayText = HomeworkApi.siteDate(ColleagueApi.isoDate(today));
        const startYear = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;

        const [profiles, marks, absences] = await Promise.all([
            ColleagueApi.get('/core/teacher/v1/student_profiles', {
                academic_year_id: session?.year, group_ids: groupId, with_groups: true, per_page: 150, page: 1
            }),
            this.loadMarks(groupId, `01.09.${startYear}`, `31.08.${startYear + 1}`),
            // Отметки "Н" справочные: без них выбор всё равно работает, просто без исключения отсутствующих
            ColleagueApi.get('/core/teacher/v1/attendances', {
                group_ids: groupId, academic_year_id: session?.year, start_at: todayText, stop_at: todayText, page: 1, per_page: 1000
            }).catch(error => {
                console.error('Не удалось получить отметки о пропусках:', error);
                return [];
            })
        ]);

        const byStudent = new Map();
        const dates = new Set();
        marks.filter(mark => !mark.deleted_by).forEach(mark => {
            const date = this.parseDate(mark.date);
            const entry = byStudent.get(mark.student_profile_id) ?? { count: 0, last: null, dates: new Set() };
            entry.count++;
            if (!entry.last || date > entry.last) entry.last = date;
            entry.dates.add(mark.date);
            byStudent.set(mark.student_profile_id, entry);
            dates.add(mark.date);
        });

        // Последний урок с оценками; если он сегодняшний, то и предыдущий: сегодня уже отвечавшие тоже не первые кандидаты
        const recentDates = [...dates]
            .sort((a, b) => this.parseDate(b) - this.parseDate(a))
            .slice(0, dates.has(todayText) ? 2 : 1);
        const absent = new Set(absences.filter(item => item.date === todayText).map(item => item.student_profile_id));

        return profiles
            .filter(profile => !profile.deleted && !profile.transferred)
            .map(profile => {
                const entry = byStudent.get(profile.id);
                return {
                    id: profile.id,
                    name: profile.short_name,
                    marks: entry?.count ?? 0,
                    last: entry?.last ?? null,
                    days: entry?.last ? Math.max(0, Math.round((today - entry.last) / 86400000)) : null,
                    recent: recentDates.some(date => entry?.dates.has(date)),
                    absent: absent.has(profile.id)
                };
            });
    },

    /**
     * Оценки группы за период, все страницы
     * @param {number} groupId
     * @param {string} from - ДД.ММ.ГГГГ
     * @param {string} to - ДД.ММ.ГГГГ
     * @returns {Promise<Object[]>}
     */
    async loadMarks(groupId, from, to) {
        const perPage = 300;
        const all = [];

        for (let page = 1; ; page++) {
            const marks = await ColleagueApi.get('/core/teacher/v1/marks', {
                group_ids: groupId, lesson_date_from: from, lesson_date_to: to, per_page: perPage, page
            });
            all.push(...marks);
            if (marks.length < perPage) return all;
        }
    },

    /**
     * Вес ученика при выборе
     * @param {Object} student - ученик из loadStudents()
     * @param {'biased'|'random'} mode
     * @returns {number}
     */
    weight(student, mode) {
        if (mode !== 'biased') return 1;

        const fewMarks = 1 / (1 + student.marks / this.MARKS_HALF);
        const days = student.days === null ? this.MAX_DAYS : Math.min(student.days, this.MAX_DAYS);
        const longAgo = 1 + days / this.RECENCY_DAYS;
        return fewMarks * longAgo * (student.recent ? this.RECENT_FACTOR : 1);
    },

    /**
     * Выбирает ученика по весам среди присутствующих, ещё не названных сегодня
     * @param {Array} students - ученики из loadStudents()
     * @param {'biased'|'random'} mode
     * @param {number[]} picked - id уже названных сегодня
     * @returns {Object|null} null, если выбирать не из кого
     */
    choose(students, mode, picked) {
        const pool = students.filter(student => !student.absent && !picked.includes(student.id));
        if (!pool.length) return null;

        const weights = pool.map(student => this.weight(student, mode));
        let point = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);

        for (let i = 0; i < pool.length; i++) {
            point -= weights[i];
            if (point < 0) return pool[i];
        }
        return pool[pool.length - 1];
    },

    /**
     * Пояснение к выбору: сколько оценок и как давно последняя
     * @param {Object} student
     * @returns {string}
     */
    describe(student) {
        const parts = [student.marks ? `оценок: ${student.marks}` : 'оценок ещё нет'];
        if (student.last) {
            const date = HomeworkApi.siteDate(ColleagueApi.isoDate(student.last)).slice(0, 5);
            parts.push(`последняя — ${date}` + (student.days ? ` (${student.days} дн. назад)` : ' (сегодня)'));
        }
        if (student.recent) parts.push('отвечал на последнем уроке');
        return parts.join(', ');
    },

    /**
     * Обработчик кнопки: если строка подсвечена, снимает подсветку (ученик остаётся названным),
     * иначе выбирает нового ученика, ещё не названного сегодня, и подсвечивает его строку
     * @param {HTMLButtonElement} button - нажатая кнопка
     * @returns {Promise<void>}
     */
    async pick(button) {
        if (this.busy) return;

        const state = this.dayState();
        if (state.active) {
            state.active = null;
            this.saveState(state);
            this.applyHighlight();
            return;
        }

        const groupId = this.groupId();
        if (!groupId) return;

        this.busy = true;
        button.disabled = true;

        try {
            const student = this.choose(await this.loadStudents(groupId), loadSettings().pickMode, state.picked);
            if (!student) {
                this.toast('Все присутствующие ученики уже были названы сегодня.');
                return;
            }

            state.picked.push(student.id);
            state.active = { name: student.name, why: this.describe(student) };
            this.saveState(state);
            this.applyHighlight(true);
        } catch (error) {
            console.error('Не удалось выбрать ученика:', error);
            this.toast(`Не удалось выбрать ученика: ${ColleagueApi.describeError(error)}`);
        } finally {
            this.busy = false;
            button.disabled = false;
        }
    },

    /**
     * Подсвечивает строку выбранного ученика и убирает подсветку с остальных
     * Вызывается и при перерисовке таблицы журнала, чтобы подсветка не пропадала
     * @param {boolean} [scroll=false] - прокрутить строку в видимую область
     * @returns {void}
     */
    applyHighlight(scroll = false) {
        const saved = this.dayState().active;
        const body = document.querySelector(CONFIG.SELECTORS.JOURNAL_TABLE)?.lastChild;
        if (!body?.rows) return;

        this.addStyles();
        let found = null;

        for (const row of body.rows) {
            const isPicked = Boolean(saved) && (row.cells[0]?.textContent ?? '').includes(saved.name);
            if (isPicked) found = row;

            if (isPicked) {
                row.dataset.mscpPicked = 'true';
                row.title = `Отвечает: ${saved.name}\n${saved.why}`;
                // Слой рамки позиционируется относительно ячейки: обычным (static) ячейкам нужен relative
                for (const cell of row.cells) {
                    if (!cell.dataset.mscpRel && getComputedStyle(cell).position === 'static') {
                        cell.style.position = 'relative';
                        cell.dataset.mscpRel = 'true';
                    }
                }
            } else if (row.dataset.mscpPicked) {
                delete row.dataset.mscpPicked;
                row.removeAttribute('title');
                for (const cell of row.cells) {
                    if (cell.dataset.mscpRel) {
                        cell.style.removeProperty('position');
                        delete cell.dataset.mscpRel;
                    }
                }
            }
        }

        if (scroll && saved && !found) this.toast(`Выбран ${saved.name}, но в таблице журнала его нет.`);
        if (scroll) found?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    },

    /**
     * Короткое сообщение внизу экрана; нужно только для ошибок, выбор показывается в самой таблице
     * @param {string} text
     * @returns {void}
     */
    toast(text) {
        this.addStyles();
        document.querySelector('.mscp-pick-toast')?.remove();

        const toast = document.createElement('div');
        toast.className = 'mscp-pick-toast';
        toast.textContent = text;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    },

    /**
     * Добавляет стили подсветки один раз
     * @returns {void}
     */
    addStyles() {
        if (document.getElementById('mscp-pick-styles')) return;

        const style = document.createElement('style');
        style.id = 'mscp-pick-styles';
        style.textContent = `
            /* Светло-зелёная полоса по всей строке в духе подсветки строки при наведении на сайте: слой поверх
               каждой ячейки, потому что у цветных ячеек внутри есть блоки со своим фоном */
            tr[data-mscp-picked="true"] > td::after {
                content: '';
                position: absolute;
                inset: 0;
                box-sizing: border-box;
                background: rgba(64, 192, 87, 0.14);
                border-top: 1px solid rgba(47, 158, 68, 0.85);
                border-bottom: 1px solid rgba(47, 158, 68, 0.85);
                pointer-events: none;
                z-index: 5;
            }
            .mscp-pick-toast {
                position: fixed;
                left: 50%;
                bottom: 24px;
                transform: translateX(-50%);
                padding: 10px 16px;
                border-radius: 8px;
                background: #343a40;
                color: white;
                font: 14px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
                z-index: 1100;
            }
        `;
        document.head.appendChild(style);
    }
};


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


})();
