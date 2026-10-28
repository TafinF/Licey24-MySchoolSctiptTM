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
