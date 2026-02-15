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
 * - Добавляет CSS-стиль для .MSC8WgFhoGMq0svc { height: calc(100vh - 40px) }
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
                height: calc(100vh - 40px);
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Удаляет шапку сайта и устанавливает высоту основного контейнера
 * - Удаляет элементы div._56grJoiM2euP0m-4_cQJ0._3Nr9SercCabAgtlvo50e48
 * - Добавляет CSS-стиль для .MSC8WgFhoGMq0svc { height: 100vh }
 * @returns {void}
 */
function removeHeaderAndSetHeight() {
    removeBannerAndSetHeight();
    
    // Удаление элемента div._56grJoiM2euP0m-4_cQJ0._3Nr9SercCabAgtlvo50e48
    document.querySelectorAll('div._56grJoiM2euP0m-4_cQJ0._3Nr9SercCabAgtlvo50e48').forEach(el => {
        el.remove();
    });

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

// ============================================================
// ПОДСВЕТКА ФОРМ КОНТРОЛЯ
// ============================================================

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
// ОСНОВНЫЕ ФУНКЦИИ ОБРАБОТКИ
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
    highlightControlForms();
    
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
