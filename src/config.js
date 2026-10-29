// ============================================================
// КОНФИГУРАЦИЯ: константы, цвета, настройки по умолчанию
// ============================================================

/**
 * Версия скрипта
 * Используется в Tampermonkey и отображается в меню настроек
 * Подставляется автоматически при сборке (build.sh)
 */
const VERSION = '__VERSION__';

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
