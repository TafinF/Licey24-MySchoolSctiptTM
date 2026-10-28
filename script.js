// ==UserScript==
// @name         My School Color Point
// @namespace    http://tampermonkey.net/
// @version      2026-10-28_16-27-54
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
const VERSION = '2026-10-28_16-27-54';

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
        SCHEDULE_WEEK_PREV: '[data-test-component="scheduleHeaderPrevWeek"]'
    },

    /** URL-паттерн страницы расписания уроков */
    SCHEDULE_URL_PATTERN: /^https:\/\/authedu\.mosreg\.ru\/teacher\/account\/schedule/,

    /** Заготовки комментариев для карточки выставления оценки */
    COMMENT_PRESETS: ['Ответ теории', 'Решение задач', 'Проверка ДЗ'],

    /** URL-паттерн для страниц журнала */
    URL_PATTERN: /^https:\/\/authedu\.mosreg\.ru\/teacher\/study-process\/journal\/(?:grade|my)\/[0-9]+(\?.*)?$/,

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
    /** Пометка предмета в заменённом расписании: color — цвет, label — подпись, both — и то и другое */
    scheduleSubjectMark: 'color',
    /** Цветной прямоугольник у класса в заменённом расписании */
    scheduleClassColor: true
};

/** Способы пометить предмет в заменённом расписании */
const SCHEDULE_SUBJECT_MARKS = [
    { value: 'color', label: 'Цвет' },
    { value: 'label', label: 'Подпись' },
    { value: 'both', label: 'Цвет и подпись' }
];

/** Виды расписания уроков для окна настроек */
const SCHEDULE_STYLES = [
    {
        value: 'classic',
        label: 'Классическое',
        description: 'Расписание сайта без изменений.'
    },
    {
        value: 'compact',
        label: 'Компактное',
        description: 'Расписание сайта сжато до размера окна: уроки по строкам времени начала, '
            + 'название журнала сокращено, тема скрыта, остаются время, кабинет и значки урока и ДЗ.'
    },
    {
        value: 'custom',
        label: 'Заменённое',
        description: 'Своя сетка: на карточке класс, время начала и конца и два статуса (урок и ДЗ). '
            + 'Предметы помечены цветом, названия в легенде. Клик по карточке открывает урок в журнале.'
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
           СТИЛИ МОДАЛЬНОГО ОКНА
           ============================================= */

        .mscp-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: Arial, sans-serif;
        }
        .mscp-modal-window {
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            min-width: 320px;
            max-width: 400px;
            overflow: hidden;
        }
        .mscp-modal-header {
            background-color: #f8f9fa;
            padding: 20px 24px;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .mscp-modal-title {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #333;
        }
        .mscp-close-btn {
            background: none;
            border: none;
            font-size: 28px;
            cursor: pointer;
            color: #6c757d;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        .mscp-close-btn:hover {
            background-color: #e9ecef;
            color: #333;
        }
        .mscp-modal-content {
            padding: 24px;
        }
        .mscp-info-block {
            padding: 12px 16px;
            background-color: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #e9ecef;
            font-size: 13px;
            color: #495057;
            line-height: 1.6;
        }
        .mscp-info-block div {
            padding: 2px 0;
        }
        .mscp-info-label {
            color: #6c757d;
        }
        .mscp-settings-group {
            margin-top: 16px;
        }
        .mscp-settings-title {
            font-size: 13px;
            color: #6c757d;
            margin-bottom: 8px;
            font-weight: 500;
        }
        .mscp-setting-item {
            display: flex;
            align-items: center;
            padding: 4px 0;
        }
        .mscp-checkbox {
            width: 16px;
            height: 16px;
            margin-right: 8px;
            cursor: pointer;
            accent-color: #496be8;
        }
        .mscp-radio {
            width: 16px;
            height: 16px;
            margin-right: 8px;
            cursor: pointer;
            accent-color: #496be8;
        }
        .mscp-style-item {
            display: block;
        }
        .mscp-style-description {
            margin: 1px 0 0 24px;
            font-size: 12px;
            line-height: 1.35;
            color: #6c757d;
        }
        .mscp-look {
            margin: 8px 0 0 24px;
            padding: 8px 12px;
            border: 1px solid #e9ecef;
            border-radius: 8px;
        }
        .mscp-look-off {
            opacity: 0.45;
        }
        .mscp-look-title {
            font-size: 12px;
            color: #6c757d;
            margin-bottom: 4px;
        }
        .mscp-look-row {
            display: flex;
            flex-wrap: wrap;
            gap: 2px 14px;
            padding: 2px 0;
        }
        .mscp-look-note {
            margin: 2px 0 4px;
        }
        .mscp-label {
            display: flex;
            align-items: center;
            cursor: pointer;
            font-size: 13px;
            color: #333;
        }
        .mscp-action-buttons {
            margin-top: 12px;
            display: flex;
            gap: 8px;
        }
        .mscp-btn-action {
            flex: 1;
            padding: 8px 12px;
            background-color: #f8f9fa;
            color: #495057;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s ease;
            text-align: center;
        }
        .mscp-btn-action:hover {
            background-color: #e9ecef;
            border-color: #adb5bd;
        }
        .mscp-buttons-section {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding-top: 16px;
            border-top: 1px solid #e9ecef;
        }
        .mscp-btn-primary {
            padding: 10px 24px;
            background-color: #496be8;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        .mscp-btn-primary:hover {
            background-color: #3a5bd0;
            transform: translateY(-1px);
        }
        .mscp-btn-secondary {
            padding: 10px 24px;
            background-color: white;
            color: #495057;
            border: 1px solid #6c757d;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        .mscp-btn-secondary:hover {
            background-color: #f8f9fa;
            border-color: #495057;
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
 * - Название предмета выносится в легенду и обозначается цветом полоски; если предмет один, оно скрыто
 * - Строки сетки = время начала урока, размеры подгоняются под окно и ширину столбцов
 * - Клик по карточке нажимает "К журналу" в меню оригинальной карточки
 * Стили действуют только пока на <body> есть класс mscp-schedule
 */
const ScheduleLayout = {
    /** @type {MutationObserver|null} Следит за перерисовкой расписания */
    observer: null,

    /** @type {number} Идентификатор запланированного пересчёта (0 — не запланирован) */
    frame: 0,

    /** @type {HTMLElement|null} Колонка со шкалой времени (кэш) */
    axis: null,

    /** @type {boolean} Идёт ли сейчас открытие журнала через меню сайта */
    isOpening: false,

    /** @type {{showColor: boolean, showLabel: boolean, classColor: boolean}} Что показывать на карточках (из настроек) */
    options: { showColor: true, showLabel: false, classColor: true },

    /**
     * Читает из настроек, как помечать предметы и классы
     * @returns {void}
     */
    configure() {
        const settings = loadSettings();
        this.options = {
            showColor: settings.scheduleSubjectMark !== 'label',
            showLabel: settings.scheduleSubjectMark === 'label' || settings.scheduleSubjectMark === 'both',
            classColor: settings.scheduleClassColor !== false
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

        // Свои карточки и легенда вне режима не стилизованы: убираем
        this.axis = null;
        document.querySelectorAll('.mscp-card, #mscp-sch-legend').forEach(element => element.remove());
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

        const entries = [];
        for (const day of grid.children) {
            day.classList.add('mscp-sch-day');
            entries.push(...this.collectDay(day));
        }

        for (const entry of entries) {
            entry.data = parseLessonCard(entry.card);
        }

        // Предметы: цвет полоски на карточке и запись в легенде; если предмет один, название не нужно
        const subjects = [...new Set(entries.map(entry => entry.data.subject).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'ru'));
        const useColors = this.options.showColor && subjects.length > 1;
        const colorOf = subject => SCHEDULE_SUBJECT_COLORS[subjects.indexOf(subject) % SCHEDULE_SUBJECT_COLORS.length];

        // Строка таблицы = время начала урока: в одной строке не бывает уроков с разным началом
        const rowKeys = [...new Set(entries.map(entry => entry.key))].sort((a, b) => a - b);
        for (const { slot, data, key } of entries) {
            slot.classList.add('mscp-sch-slot');
            slot.style.setProperty('--mscp-row', rowKeys.indexOf(key) + 1);
            this.renderCard(slot, data, useColors && data.subject ? colorOf(data.subject) : '');
        }

        if (content) {
            this.renderLegend(content, grid, useColors ? subjects.map(subject => ({ subject, color: colorOf(subject) })) : []);
        }

        const rows = Math.max(rowKeys.length, 1);
        const top = grid.getBoundingClientRect().top + (scroller?.scrollTop ?? 0);
        const height = Math.max(window.innerHeight - top - 8, rows * 48);
        const columnWidth = grid.firstElementChild?.getBoundingClientRect().width || 190;

        // Масштаб содержимого (1 = класс 19px, время 12px): карточка помещается в строку и в столбец.
        // Числа — размер содержимого при масштабе 1: ширина (прямоугольник класса добавляет отступы)
        // и высота (подпись предмета добавляет строку)
        const needWidth = this.options.classColor ? 142 : 132;
        const needHeight = this.options.showLabel ? 66 : 52;
        const scale = Math.min(Math.max(Math.min(columnWidth / needWidth, (height / rows) / needHeight), 0.6), 1.6);

        grid.style.setProperty('--mscp-rows', rows);
        grid.style.setProperty('--mscp-grid-h', `${Math.floor(height)}px`);
        grid.style.setProperty('--mscp-u', scale.toFixed(3));
        // Длинное название предмета переносится на вторую строку, если в карточке остаётся место
        grid.style.setProperty('--mscp-lines', (height / rows) / scale >= needHeight + 14 ? 2 : 1);
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
        const signature = JSON.stringify([data, color, label, classBox]);
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
        badges.append(
            create('span', `mscp-badge mscp-badge-${data.journal}`, 'У'),
            create('span', `mscp-badge mscp-badge-${data.homework}`, 'ДЗ')
        );
        head.append(badges);

        element.append(head);
        if (label) element.append(create('div', 'mscp-card-subject', label));
        element.append(create('div', 'mscp-card-time', `${data.start}–${data.end}`));
        element.addEventListener('click', () => this.openJournal(slot));

        slot.append(element);
    },

    /**
     * Рисует легенду: цвета предметов и что значат значки
     * @param {HTMLElement} content - контейнер страницы
     * @param {HTMLElement} grid - сетка расписания (легенда встаёт перед ней)
     * @param {Array<{subject: string, color: string}>} items - предметы с цветами (пусто, если предмет один)
     * @returns {void}
     */
    renderLegend(content, grid, items) {
        const anchor = [...content.children].find(child => child.contains(grid));
        let legend = document.getElementById('mscp-sch-legend');
        const signature = JSON.stringify(items);

        if (legend?.dataset.signature === signature && legend.parentElement === content) return;

        legend?.remove();
        legend = document.createElement('div');
        legend.id = 'mscp-sch-legend';
        legend.dataset.signature = signature;

        for (const { subject, color } of items) {
            const item = document.createElement('span');
            item.className = 'mscp-legend-item';
            const swatch = document.createElement('i');
            swatch.style.background = color;
            item.append(swatch, subject);
            legend.append(item);
        }

        const key = document.createElement('span');
        key.className = 'mscp-legend-key';
        key.append('У — урок, ДЗ — домашнее задание:');
        for (const [status, text] of [['done', 'заполнено'], ['late', 'не заполнено'], ['wait', 'ещё нет']]) {
            const badge = document.createElement('span');
            badge.className = `mscp-badge mscp-badge-${status}`;
            badge.textContent = text;
            key.append(badge);
        }
        legend.append(key);

        content.insertBefore(legend, anchor);
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
        const styleEl = document.createElement('style');
        styleEl.id = 'mscp-schedule-styles';
        styleEl.textContent = `
            /* Шкала времени не нужна: уроки стоят по строкам времени начала.
               Колонку оставляем пустой, чтобы шапка с днями недели не съехала */
            body.mscp-schedule .mscp-sch-axis {
                visibility: hidden;
                height: 0 !important;
                overflow: hidden;
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
            body.mscp-schedule .mscp-sch-content > :not(:has(.mscp-sch-grid)):not(#mscp-sch-legend) {
                display: none !important;
            }

            /* Семь дней делят ширину поровну (у сайта у каждого минимум 194px и обрезается воскресенье) */
            body.mscp-schedule .mscp-sch-head > :not(:first-child),
            body.mscp-schedule .mscp-sch-day {
                flex: 1 1 0 !important;
                min-width: 0 !important;
                width: auto !important;
            }

            /* Колонка дня: строки по числу разных времён начала, вся высота окна */
            body.mscp-schedule .mscp-sch-day {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr);
                grid-template-rows: repeat(var(--mscp-rows, 1), minmax(0, 1fr));
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
            body.mscp-schedule .mscp-card-now {
                box-shadow: 0 0 0 2px #3b6cf0;
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

            /* Легенда над сеткой */
            #mscp-sch-legend {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 4px 14px;
                padding: 6px 12px;
                font-size: 12px;
                color: #4b5563;
            }
            #mscp-sch-legend .mscp-legend-item {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            #mscp-sch-legend .mscp-legend-item i {
                width: 10px;
                height: 10px;
                border-radius: 3px;
            }
            #mscp-sch-legend .mscp-legend-key {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-left: auto;
            }
            #mscp-sch-legend .mscp-badge {
                font-size: 11px;
                padding: 3px 6px;
                border-radius: 5px;
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
// СТРАНИЦА РАСПИСАНИЯ
// ============================================================

/**
 * Управляет страницей "Расписание уроков"
 * - Ставит кнопку настроек справа от переключателя недель
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

        const button = createSettingsButton();
        button.style.marginLeft = '8px';
        weekSwitch.append(button);
    }
};


// ============================================================
// SVG ИКОНКИ
// ============================================================

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
// ЭКСПОРТ ЖУРНАЛА
// ============================================================

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
// МОДАЛЬНОЕ ОКНО: секции формы настроек
// ============================================================

/**
 * Создаёт секцию с информацией о журнале
 * @returns {HTMLElement} DOM-элемент с информацией
 */
function createInfoSection() {
    const section = document.createElement('div');
    section.className = 'mscp-info-block';

    const roundingMethod = JournalState.isMathRound
        ? 'математический (4,5)'
        : 'лицейский (4,65)';
    const gradesRequired = JournalState.isWeNeed3Grades ? '3' : '5';

    // Сведения о журнале есть только на странице журнала
    const journalInfo = isTargetUrl(window.location.href) ? `
        <div><span class="mscp-info-label">Уроков в триместре:</span> ${JournalState.countLessons}</div>
        <div><span class="mscp-info-label">Нужно оценок:</span> ${gradesRequired}</div>
        <div><span class="mscp-info-label">Округление:</span> ${roundingMethod}</div>
    ` : '';

    section.innerHTML = `
        <div><span class="mscp-info-label">Версия:</span> ${VERSION}</div>
        ${journalInfo}
    `;

    return section;
}

/**
 * Создаёт секцию с настройками (чекбоксы и кнопки действий)
 * @param {Object} currentSettings - текущие настройки
 * @returns {HTMLElement} DOM-элемент с настройками
 */
function createSettingsSection(currentSettings) {
    const section = document.createElement('div');
    section.className = 'mscp-settings-group';

    // Настройки журнала нужны только на странице журнала
    if (isTargetUrl(window.location.href)) {
        appendJournalSettings(section, currentSettings);
    }

    section.appendChild(createScheduleStyleGroup(currentSettings));

    return section;
}

/**
 * Добавляет в секцию настройки журнала: чекбоксы окрашивания, дополнительные и кнопки действий
 * @param {HTMLElement} section - секция настроек
 * @param {Object} currentSettings - текущие настройки
 * @returns {void}
 */
function appendJournalSettings(section, currentSettings) {
    // Секция "Цветной режим для:"
    const colorTitle = document.createElement('div');
    colorTitle.className = 'mscp-settings-title';
    colorTitle.textContent = 'Цветной режим для:';
    section.appendChild(colorTitle);

    const colorSettings = [
        { key: 'colorAccumulation', label: 'Накопляемость оценок', checked: currentSettings.colorAccumulation },
        { key: 'colorLessonGrades', label: 'Оценки за уроки', checked: currentSettings.colorLessonGrades },
        { key: 'colorAverageGrade', label: 'Средний балл', checked: currentSettings.colorAverageGrade },
        { key: 'colorBorderlineGrades', label: 'Пограничные оценки', checked: currentSettings.colorBorderlineGrades }
    ];

    colorSettings.forEach(setting => {
        const item = document.createElement('div');
        item.className = 'mscp-setting-item';
        item.innerHTML = `
            <label class="mscp-label">
                <input type="checkbox" class="mscp-checkbox" data-key="${setting.key}" ${setting.checked ? 'checked' : ''}>
                <span>${setting.label}</span>
            </label>
        `;
        section.appendChild(item);
    });

    // Секция "Дополнительно"
    const extraTitle = document.createElement('div');
    extraTitle.className = 'mscp-settings-title';
    extraTitle.style.marginTop = '12px';
    extraTitle.textContent = 'Дополнительно:';
    section.appendChild(extraTitle);

    const extraSettings = [
        { key: 'hideAverageMark', label: 'Выключать средний балл', checked: currentSettings.hideAverageMark },
        { key: 'hideBanner', label: 'Убрать баннер', checked: currentSettings.hideBanner }
    ];

    extraSettings.forEach(setting => {
        const item = document.createElement('div');
        item.className = 'mscp-setting-item';
        item.innerHTML = `
            <label class="mscp-label">
                <input type="checkbox" class="mscp-checkbox" data-key="${setting.key}" ${setting.checked ? 'checked' : ''}>
                <span>${setting.label}</span>
            </label>
        `;
        section.appendChild(item);
    });

    // Кнопки действий
    const actionButtons = document.createElement('div');
    actionButtons.className = 'mscp-action-buttons';
    actionButtons.innerHTML = `
        <button class="mscp-btn-action" data-action="download">Скачать журнал</button>
        <button class="mscp-btn-action" data-action="removeHeader">Удалить шапку</button>
    `;
    section.appendChild(actionButtons);

    // Обработчики кнопок
    actionButtons.querySelector('[data-action="download"]').addEventListener('click', () => {
        downloadAsFile();
    });
    actionButtons.querySelector('[data-action="removeHeader"]').addEventListener('click', () => {
        removeHeaderAndSetHeight();
    });
}

/**
 * Создаёт группу переключателя вида расписания уроков (по одному описанию к каждому виду)
 * @param {Object} currentSettings - текущие настройки
 * @returns {HTMLElement} DOM-элемент с переключателем
 */
function createScheduleStyleGroup(currentSettings) {
    const group = document.createElement('div');
    group.className = 'mscp-schedule-style';
    group.dataset.key = 'scheduleStyle';

    const title = document.createElement('div');
    title.className = 'mscp-settings-title';
    title.style.marginTop = '12px';
    title.textContent = 'Расписание уроков:';
    group.appendChild(title);

    const selected = SCHEDULE_STYLES.some(style => style.value === currentSettings.scheduleStyle)
        ? currentSettings.scheduleStyle
        : DEFAULT_SETTINGS.scheduleStyle;

    SCHEDULE_STYLES.forEach(style => {
        const item = document.createElement('div');
        item.className = 'mscp-setting-item mscp-style-item';
        item.innerHTML = `
            <label class="mscp-label">
                <input type="radio" class="mscp-radio" data-key="scheduleStyle" name="mscp-schedule-style" value="${style.value}" ${style.value === selected ? 'checked' : ''}>
                <span>${style.label}</span>
            </label>
            <div class="mscp-style-description">${style.description}</div>
        `;
        group.appendChild(item);
    });

    const look = createScheduleLookOptions(currentSettings);
    group.appendChild(look);

    // Параметры вида нужны только заменённому расписанию
    const syncLook = () => {
        const isCustom = group.querySelector('input[name="mscp-schedule-style"]:checked')?.value === 'custom';
        look.classList.toggle('mscp-look-off', !isCustom);
        look.querySelectorAll('input').forEach(input => { input.disabled = !isCustom; });
    };
    group.addEventListener('change', syncLook);
    syncLook();

    return group;
}

/**
 * Создаёт параметры заменённого расписания: как помечать предмет и красить ли классы
 * @param {Object} currentSettings - текущие настройки
 * @returns {HTMLElement} DOM-элемент с параметрами
 */
function createScheduleLookOptions(currentSettings) {
    const look = document.createElement('div');
    look.className = 'mscp-look';

    const selected = SCHEDULE_SUBJECT_MARKS.some(mark => mark.value === currentSettings.scheduleSubjectMark)
        ? currentSettings.scheduleSubjectMark
        : DEFAULT_SETTINGS.scheduleSubjectMark;

    const marks = SCHEDULE_SUBJECT_MARKS.map(mark => `
        <label class="mscp-label">
            <input type="radio" class="mscp-radio" data-key="scheduleSubjectMark" name="mscp-subject-mark" value="${mark.value}" ${mark.value === selected ? 'checked' : ''}>
            <span>${mark.label}</span>
        </label>
    `).join('');

    look.innerHTML = `
        <div class="mscp-look-title">Предмет в заменённом расписании:</div>
        <div class="mscp-look-row">${marks}</div>
        <div class="mscp-style-description mscp-look-note">Цвет: полоска слева и легенда. Подпись: название предмета на карточке. Если предмет один, цвет не нужен и не показывается.</div>
        <div class="mscp-setting-item">
            <label class="mscp-label">
                <input type="checkbox" class="mscp-checkbox" data-key="scheduleClassColor" ${currentSettings.scheduleClassColor !== false ? 'checked' : ''}>
                <span>Цвет класса: у одинаковых классов одинаковый цвет</span>
            </label>
        </div>
    `;

    return look;
}


// ============================================================
// МОДАЛЬНОЕ ОКНО: кнопки и показ
// ============================================================

/**
 * Создаёт секцию с кнопками "Отмена" и "Применить"
 * @param {HTMLElement} modalOverlay - оверлей модального окна
 * @param {HTMLElement} settingsSection - секция с настройками (для чтения чекбоксов)
 * @returns {HTMLElement} DOM-элемент с кнопками
 */
function createModalButtons(modalOverlay, settingsSection) {
    const section = document.createElement('div');
    section.className = 'mscp-buttons-section';

    const cancelButton = document.createElement('button');
    cancelButton.className = 'mscp-btn-secondary';
    cancelButton.textContent = 'Отмена';
    cancelButton.addEventListener('click', () => modalOverlay.remove());

    const applyButton = document.createElement('button');
    applyButton.className = 'mscp-btn-primary';
    applyButton.textContent = 'Применить';
    applyButton.addEventListener('click', () => {
        // Скрытые на этой странице настройки сохраняют прежнее значение
        const newSettings = loadSettings();
        settingsSection.querySelectorAll('.mscp-checkbox').forEach(checkbox => {
            newSettings[checkbox.dataset.key] = checkbox.checked;
        });

        settingsSection.querySelectorAll('.mscp-radio:checked').forEach(radio => {
            newSettings[radio.dataset.key] = radio.value;
        });

        saveSettings(newSettings);

        if (isTargetUrl(window.location.href)) {
            JournalState.settings = newSettings;

            // Применяем настройки скрытия среднего балла
            if (newSettings.hideAverageMark) {
                applyHideAverageMarkSetting();
            }

            // Применяем настройку удаления баннера
            if (newSettings.hideBanner) {
                removeBannerAndSetHeight();
            }

            // Перерисовываем таблицу с новыми настройками
            processJournalTable(true);
        }

        // Вид расписания меняется сразу
        syncScheduleLayout(window.location.href);

        console.log('Настройки сохранены:', newSettings);
        modalOverlay.remove();
    });

    section.appendChild(cancelButton);
    section.appendChild(applyButton);

    return section;
}

/**
 * Показывает модальное окно с настройками
 * - Загружает текущие настройки
 * - Создаёт DOM-структуру окна
 * - Добавляет обработчики закрытия (крестик, оверлей, Escape)
 * @returns {void}
 */
function showModal() {
    const currentSettings = loadSettings();

    const overlay = document.createElement('div');
    overlay.className = 'mscp-modal-overlay';

    const window = document.createElement('div');
    window.className = 'mscp-modal-window';

    const header = document.createElement('div');
    header.className = 'mscp-modal-header';
    header.innerHTML = `
        <h2 class="mscp-modal-title">Настройки дополнения My School Color Point</h2>
        <button class="mscp-close-btn">&times;</button>
    `;

    const content = document.createElement('div');
    content.className = 'mscp-modal-content';

    const infoSection = createInfoSection();
    const settingsSection = createSettingsSection(currentSettings);
    const buttonsSection = createModalButtons(overlay, settingsSection);

    content.append(infoSection, settingsSection, buttonsSection);
    window.append(header, content);
    overlay.appendChild(window);

    header.querySelector('.mscp-close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    const handleEscape = (e) => {
        if (e.key === 'Escape' && document.body.contains(overlay)) {
            overlay.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    document.body.appendChild(overlay);
}


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
