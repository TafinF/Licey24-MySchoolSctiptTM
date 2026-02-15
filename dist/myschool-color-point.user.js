// ==UserScript==
// @name         My School Color Point
// @namespace    http://tampermonkey.net/
// @version      2026-02-14_19-39-30
// @description  Окрашивает оценки в разные цвета в Моя Школа
// @author       Tafintsev Feodor taf.f11@ya.ru
// @match        https://authedu.mosreg.ru/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mosreg.ru
// @grant        none
// ==/UserScript==

/**
 * ============================================================================
 * ФАЙЛ: config.js
 * 
 * Назначение: Все константы и конфигурация скрипта
 * ============================================================================
 */

/**
 * Версия скрипта
 * Используется в Tampermonkey и отображается в меню настроек
 * Подставляется автоматически при сборке из build.sh
 */
const VERSION = '2026-02-14_19-39-30';

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
        MAIN_SECTION: 'main',
        JOURNAL_TABLE: 'table',
        LESSON_CELL: '[data-test-component^="scheduleLessonCell"]'
    },
    
    /** URL-паттерн для страниц журнала */
    URL_PATTERN: /^https:\/\/authedu\.mosreg\.ru\/teacher\/study-process\/journal\/(?:grade|my)\/[0-9]+(\?.*)?$/
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
    CORNER_MISMATCH: '#cccccc'
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
    hideBanner: false
};
/**
 * ============================================================================
 * ФАЙЛ: coloring.js
 * 
 * Назначение: Логика окрашивания, расчёты оценок и утилиты
 * ============================================================================
 */

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
// РАБОТА С НАСТРОЙКАМИ
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
 * Устанавливает параметры в localStorage для скрытия среднего балла
 * Модифицирует journalSettings.additionalGridSettings
 * @returns {void}
 */
function applyHideAverageMarkSetting() {
    const settings = loadSettings();
    
    if (!settings.hideAverageMark) return;
    
    try {
        const journalSettings = JSON.parse(localStorage.getItem('journalSettings') || 'null');
        
        if (journalSettings && journalSettings.additionalGridSettings) {
            journalSettings.additionalGridSettings.isShowAverageMarkTest = false;
            journalSettings.additionalGridSettings.isShowAverageMarkTopic = false;
            localStorage.setItem('journalSettings', JSON.stringify(journalSettings));
        }
    } catch (error) {
        console.error('Ошибка применения настроек скрытия:', error);
    }
}

/**
 * Удаляет баннер госуслуг и устанавливает высоту основного контейнера
 * - Удаляет элементы a.WC-Banner-link
 * - Добавляет CSS-стиль для .MSC8WgFhoGMq0svc { height: 100vh }
 * @returns {void}
 */
function removeBannerAndSetHeight() {
    // Удаление элемента a.WC-Banner-link
    document.querySelectorAll('a.WC-Banner-link').forEach(el => {
        el.remove();
    });

    // Установка нужной высоты для класса .MSC8WgFhoGMq0svc
    const style = document.createElement('style');
    style.id = 'mscp-banner-override';
    
    // Проверяем, не добавлен ли уже стиль
    if (!document.getElementById('mscp-banner-override')) {
        style.textContent = `
            .MSC8WgFhoGMq0svc {
                height: calc(100vh - 0px);
            }
        `;
        document.head.appendChild(style);
    }
}

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
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

// ============================================================
// РАСЧЁТ КОМБИНАЦИЙ ОЦЕНОК
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

// ============================================================
// ГЕНЕРАЦИЯ ГРАДИЕНТОВ
// ============================================================

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
// ПРОВЕРКИ ЯЧЕЕК
// ============================================================

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
// ФУНКЦИИ ОКРАШИВАНИЯ ЯЧЕЕК
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
                finalGrades.push(grade);
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
// ОСНОВНЫЕ ФУНКЦИИ ОБРАБОТКИ
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
    const modeTitle = modeElement?.getAttribute('title');
    const isSummaryMode = modeTitle === 'Режим отображения итоговых отметок';
    
    const colorizeRow = isSummaryMode ? colorizeSummaryRow : colorizeStandardRow;
    
    for (const row of tableBody.childNodes) {
        colorizeRow(row);
    }
}

/**
 * Основная функция обработки таблицы журнала
 * - Ожидает появления таблицы
 * - Обновляет состояние журнала
 * - Запускает окрашивание
 * - Устанавливает наблюдателя за изменениями
 * @returns {void}
 */
function processJournalTable() {
    const tables = document.querySelectorAll(CONFIG.SELECTORS.JOURNAL_TABLE);
    
    if (tables.length === 0) {
        console.log('Таблица ещё не загружена, ожидание...');
        setTimeout(processJournalTable, 1000);
        return;
    }
    
    console.log('Таблица найдена, начинаем обработку');
    
    const table = tables[0];
    
    JournalState.update(
        table.firstChild, 
        JournalState.watchElement.textContent
    );
    
    colorizeTable(table.lastChild);
    
    if (tableObserver) {
        tableObserver.disconnect();
    }
    
    tableObserver = new MutationObserver(() => processJournalTable());
    tableObserver.observe(
        document.querySelector(CONFIG.SELECTORS.MAIN_SECTION), 
        { childList: true, subtree: true }
    );
}

// ============================================================
// TOOLTIP
// ============================================================

/** @type {HTMLElement|null} Текущий активный tooltip */
let activeTooltip = null;

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
    tooltip.textContent = tooltipText;
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
/**
 * ============================================================================
 * ФАЙЛ: ui.js
 * 
 * Назначение: UI компоненты - стили, кнопки, модальное окно
 * ============================================================================
 */

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
            background-color: ${COLORS.GREEN};
        }
        .mscp-final-4 {
            background-color: ${COLORS.BLUE};
        }
        .mscp-final-3 {
            background-color: ${COLORS.YELLOW};
        }
        .mscp-final-2 {
            background-color: ${COLORS.RED};
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
            background: #333;
            color: white;
            font-size: 12px;
            font-weight: normal;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 99999;
            white-space: nowrap;
            pointer-events: none;
            transform: translate(-50%, -100%);
        }
        
        /* Стрелочка tooltip (сверху) */
        .mscp-tooltip-dynamic::after {
            content: '';
            position: absolute;
            bottom: -6px;
            left: 50%;
            transform: translateX(-50%);
            border: 6px solid transparent;
            border-top-color: #333;
        }
        
        /* Стрелочка tooltip (снизу) */
        .mscp-tooltip-dynamic.mscp-tooltip-below {
            transform: translate(-50%, 0);
        }
        
        .mscp-tooltip-dynamic.mscp-tooltip-below::after {
            bottom: auto;
            top: -12px;
            border-top-color: transparent;
            border-bottom-color: #333;
        }
        
        /* =============================================
           СТИЛИ КНОПОК
           ============================================= */
        
        .mscp-button {
            line-height: 0;
            padding: 8px;
            margin-left: -1px;
            border-color: #d6d6df;
            border-style: solid;
            border-width: 1px;
            color: #686A71;
            background: white;
            cursor: pointer;
            transition: background 0.2s ease;
        }
        .mscp-button:hover {
            background: lightgrey;
        }
        .mscp-button:first-child {
            border-radius: 8px 0 0 8px;
        }
        .mscp-button:last-child {
            border-radius: 0 8px 8px 0;
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
// SVG ИКОНКИ
// ============================================================

/**
 * Создаёт SVG-иконку кисти (градиентная)
 * @returns {string} HTML-строка с SVG-элементом
 */
function createBrushIcon() {
    return `
        <svg class="bi-brush" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
            <path d="M15.825.12a.5.5 0 0 1 .132.584c-1.53 3.43-4.743 8.17-7.095 10.64a6.1 6.1 0 0 1-2.373 1.534c-.018.227-.06.538-.16.868-.201.659-.667 1.479-1.708 1.74a8.1 8.1 0 0 1-3.078.132 4 4 0 0 1-.562-.135 1.4 1.4 0 0 1-.466-.247.7.7 0 0 1-.204-.288.62.62 0 0 1 .004-.443c.095-.245.316-.38.461-.452.394-.197.625-.453.867-.826.095-.144.184-.297.287-.472l.117-.198c.151-.255.326-.54.546-.848.528-.739 1.201-.925 1.746-.896q.19.012.348.048c.062-.172.142-.38.238-.608.261-.619.658-1.419 1.187-2.069 2.176-2.67 6.18-6.206 9.117-8.104a.5.5 0 0 1 .596.04M4.705 11.912a1.2 1.2 0 0 0-.419-.1c-.246-.013-.573.05-.879.479-.197.275-.355.532-.5.777l-.105.177c-.106.181-.213.362-.32.528a3.4 3.4 0 0 1-.76.861c.69.112 1.736.111 2.657-.12.559-.139.843-.569.993-1.06a3 3 0 0 0 .126-.75zm1.44.026c.12-.04.277-.1.458-.183a5.1 5.1 0 0 0 1.535-1.1c1.9-1.996 4.412-5.57 6.052-8.631-2.59 1.927-5.566 4.66-7.302 6.792-.442.543-.795 1.243-1.042 1.826-.121.288-.214.54-.275.72v.001l.575.575zm-4.973 3.04.007-.005zm3.582-3.043.002.001h-.002z"></path>
            <defs>
                <linearGradient id="MyGradient">
                    <stop offset="0%" stop-color="green" />
                    <stop offset="50%" stop-color="blue" />
                    <stop offset="100%" stop-color="red" />
                </linearGradient>
            </defs>
            <style type="text/css">.bi-brush{fill:url(#MyGradient)}</style>
        </svg>
    `;
}

/**
 * Создаёт SVG-иконку информации (i в круге)
 * @returns {string} HTML-строка с SVG-элементом
 */
function createInfoIcon() {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-info-circle" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
        </svg>
    `;
}

/**
 * Создаёт SVG-иконку таблицы Excel
 * @returns {string} HTML-строка с SVG-элементом
 */
function createExcelIcon() {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-earmark-spreadsheet" viewBox="0 0 16 16">
            <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2M9.5 3A1.5 1.5 0 0 0 11 4.5h2V9H3V2a1 1 0 0 1 1-1h5.5zM3 12v-2h2v2zm0 1h2v2H4a1 1 0 0 1-1-1zm3 2v-2h3v2zm4 0v-2h3v1a1 1 0 0 1-1 1zm3-3h-3v-2h3zm-7 0v-2h3v2z"/>
        </svg>
    `;
}

// ============================================================
// КНОПКИ
// ============================================================

/**
 * Создаёт контейнер с кнопками управления и добавляет в DOM
 * @param {HTMLElement} parentElement - элемент, в который добавляются кнопки
 * @returns {void}
 */
function createButtons(parentElement) {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'box-shadow: 1px 1px 4px 0px rgba(0, 0, 0, 0.07); border-radius: 8px; display: inline-flex;';
    
    const buttons = [
        {
            icon: createBrushIcon(),
            title: 'Принудительная покраска',
            handler: processJournalTable
        },
        {
            icon: createInfoIcon(),
            title: 'Информация о обработке',
            handler: showModal
        },
        {
            icon: createExcelIcon(),
            title: 'Копировать в Excel',
            handler: downloadAsFile
        }
    ];
    
    buttons.forEach(config => {
        const button = document.createElement('button');
        button.className = 'mscp-button';
        button.innerHTML = config.icon;
        button.title = config.title;
        button.addEventListener('click', config.handler);
        buttonContainer.appendChild(button);
    });
    
    parentElement.appendChild(buttonContainer);
}

/**
 * Вставляет кнопки управления в заголовок журнала
 * - Ожидает загрузки DOM-элементов
 * - Создаёт стили и кнопки
 * - Применяет настройки (баннер, средний балл)
 * - Запускает обработку таблицы
 * @returns {void}
 */
function insertButtons() {
    if (document.querySelector('.mscp-button')) return;
    
    const mainSection = document.querySelector(CONFIG.SELECTORS.MAIN_SECTION);
    if (!mainSection) {
        console.log('Контейнер для кнопок не найден, ожидание...');
        setTimeout(insertButtons, 1000);
        return;
    }
    
    const parentElement = document.querySelector(CONFIG.SELECTORS.PARENT_BUTTON_CONTAINER);
    if (!parentElement) {
        setTimeout(insertButtons, 1000);
        return;
    }
    
    const h6Element = parentElement.querySelector('h6');
    if (!h6Element) {
        setTimeout(insertButtons, 1000);
        return;
    }
    
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
    
    processJournalTable();
}

// ============================================================
// ЭКСПОРТ В EXCEL
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
// МОДАЛЬНОЕ ОКНО
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
    
    section.innerHTML = `
        <div><span class="mscp-info-label">Версия:</span> ${VERSION}</div>
        <div><span class="mscp-info-label">Уроков в триместре:</span> ${JournalState.countLessons}</div>
        <div><span class="mscp-info-label">Нужно оценок:</span> ${gradesRequired}</div>
        <div><span class="mscp-info-label">Округление:</span> ${roundingMethod}</div>
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
    
    // Обработчики кнопок (пока заглушки)
    actionButtons.querySelector('[data-action="download"]').addEventListener('click', () => {
        console.log('Скачать журнал — в разработке');
    });
    actionButtons.querySelector('[data-action="removeHeader"]').addEventListener('click', () => {
        console.log('Удалить шапку — в разработке');
    });
    
    return section;
}

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
        const newSettings = {};
        settingsSection.querySelectorAll('.mscp-checkbox').forEach(checkbox => {
            newSettings[checkbox.dataset.key] = checkbox.checked;
        });
        
        saveSettings(newSettings);
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
        processJournalTable();
        
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
/**
 * ============================================================================
 * ФАЙЛ: main.user.js
 * 
 * Назначение: Точка входа + инициализация скрипта
 * 
 * Структура проекта:
 * - config.js    — константы и конфигурация
 * - coloring.js  — логика окрашивания и расчёты
 * - ui.js        — компоненты интерфейса
 * - main.user.js — точка входа (этот файл)
 * ============================================================================
 */

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
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
 * - Запускает вставку кнопок (с задержкой 1с)
 * - Применяет настройку скрытия среднего балла
 * @returns {void}
 */
function initOnJournalPage() {
    console.log(`My School Color Point v${VERSION} — Инициализация...`);
    JournalState.reset();
    setTimeout(insertButtons, 1000);
    applyHideAverageMarkSetting();
}

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
            if (isTargetUrl(newUrl)) {
                initOnJournalPage();
            }
        }
    }
}

/**
 * Точка входа скрипта
 * Запускает мониторинг URL после загрузки DOM
 */
(function main() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUrlMonitor);
    } else {
        initUrlMonitor();
    }
})();
