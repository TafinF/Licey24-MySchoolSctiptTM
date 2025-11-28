// ==UserScript==
// @name         My School Color Point
// @namespace    http://tampermonkey.net/
// @version      2025-11-18
// @description  Окрашивает оценки в разные цвета в Моя Школа
// @author       Tafintsev Feodor taf.f11@ya.ru
// @match        https://authedu.mosreg.ru/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mosreg.ru
// @grant        none
// ==/UserScript==

/** имя класса для добавления покрашенным элементам*/
const CLASS_ADD_NAME = 'lic24color'
/** ключ локалсторажд для хранния настроек надстройки */
const MAIN_KEY = "MSCP"

let JOURNAL_INFO = {
    isMathRound: false,
    isWeNeed3Grades: false,
    countLessons: 0
}

/** заголовок журнала за которым следим для определения смены таблицы */
let WATCH_ELEMENT;
/** список журналов в которых округление математическое*/
const WRONG_JOURNAL_LIST = [
    'Изобразительное искусство',
    'Музыка',
    'Труд',
    'Физическая культура'
];
/** цвета для ячеек*/
const Colors = {
    RED: ' #FF9999',
    YELLOW: ' #FFFFCC',
    BLUE: ' #c2e0ff',
    GREEN: ' #CCFFCC'
};

/**
 * Определяет тип округления оценок для текущего журнала
 * @param {string} nameJornal - название журнала
 * @returns {boolean} true - математическое округление, false - лицейское
 */
function isMathRoundType(nameJornal) {
    // проверяем есть ли в названии текущего журнала слова из списка журналов в которых применяется математическое округление
    for (let i = 0; i < WRONG_JOURNAL_LIST.length; i++) {
        if (nameJornal.includes(WRONG_JOURNAL_LIST[i])) {
            return true
        }
    }
    return false
}

/** Наблюдатель за изменениями в основном контенте страницы */
let TABLE_observer = new MutationObserver((mutationsList, observer) => {
    getHim()
});

/**
 * Считаем сколько уроков в треместре по заголовку таблицы
 */
function countLessonsInTrimestr(tableHead) {
    const lessons = new Set();
    const lessonCells = tableHead.querySelectorAll('[data-test-component^="scheduleLessonCell"]');

    lessonCells.forEach(cell => {
        const lessonId = cell.getAttribute('data-test-component').split('-')[1];
        lessons.add(lessonId);
    });

    return lessons.size;
}

/**
 * Основная функция поиска и обработки таблицы журнала
 */
function getHim() {
    let tablePoint = document.querySelectorAll('table'); // получаем таблицу журнала
    if (tablePoint.length == 0) {
        setTimeout(getHim, 1000);
        console.log("Таблица ещё не загружена, ждём 1с");
    }
    else {
        console.log('Таблица найдена');
        JOURNAL_INFO.isMathRound = isMathRoundType(WATCH_ELEMENT.textContent)

        JOURNAL_INFO.countLessons = countLessonsInTrimestr(tablePoint[0].firstChild)// количество уроков
        JOURNAL_INFO.isWeNeed3Grades = JOURNAL_INFO.countLessons < 15 // если уроков меньше 15, то для атестации будет достаточно 3-х оценок
        colorizeTable(tablePoint[0].lastChild)
        //StartWatch()
        TABLE_observer.disconnect();
        TABLE_observer.observe(document.querySelector('main'), { childList: true, subtree: true });
    }
}

/**
 * Генерирует градиент для прогресс-бара у имени ученика
 * @param {number} count - количество оценок у ученика
 * @param {boolean} is_we_need_3_grades - нужно ли только 3 оценки для аттестации
 * @returns {string} CSS градиент для прогресс-бара
 */
function genGradPointCount(count, is_we_need_3_grades) {
    if (is_we_need_3_grades) { // если нам нужно только 3 оценки для атестации
        switch (count) {
            case 0:
                return 'linear-gradient(to left,var(--LM-neutrals-day-0))'
            case 1:
                return 'linear-gradient(to left, var(--LM-neutrals-day-0) 66%, #fccfd3 0%)'
            case 2:
                return 'linear-gradient(to left, var(--LM-neutrals-day-0) 33%, #fdd9b5 0%)'
            default:
                return 'linear-gradient(to left,  #CCFFCC)'
        }
    } else { // если нам нужно 5 оценок для атестации
        switch (count) {
            case 0:
                return 'linear-gradient(to left,var(--LM-neutrals-day-0))'
            case 1:
                return 'linear-gradient(to left, var(--LM-neutrals-day-0) 80%, #fccfd3 0%)'
            case 2:
                return 'linear-gradient(to left, var(--LM-neutrals-day-0) 60%, #fccfd3 0%)'
            case 3:
                return 'linear-gradient(to left, var(--LM-neutrals-day-0) 40%, #fccfd3 0%)'
            case 4:
                return 'linear-gradient(to left, var(--LM-neutrals-day-0) 20%, #fdd9b5 0%)'
            default:
                return 'linear-gradient(to left,  #CCFFCC)'
        }
    }
}

/**
 * Перевод оценки в код цвета
 * @param {string} str_point - строка с оценкой
 * @returns {string} Код цвета или null
 */
function Color_selection(str_point) {
    let color = null
    if (str_point == '5') { color = Colors.GREEN }
    else if (str_point == '4') { color = Colors.BLUE }
    else if (str_point == '3') { color = Colors.YELLOW }
    else if (str_point == '2') { color = Colors.RED }
    return color
}

/**
 * Раскрашивает ячейку с оценкой
 * @param {Element} cellNode - ячейка с оценкой
 * @returns {string} Оценка или null
 */
function Color_point_cell(cellNode) {
    if (!cellNode.hasChildNodes()) { return null }// если есть оценка в ячейке (или н-ка)
    let point = cellNode.firstChild.textContent
    let colorCell = Color_selection(point)
    if (colorCell != null) {
        cellNode.style.background = 'linear-gradient(225deg,transparent,' + colorCell + ' 70%)'
        cellNode.classList.add(CLASS_ADD_NAME);
        return point
    }
    return null
}

/**
 * Определяет, является ли данная ячейка итоговой оценкой
 * @param {Element} cellNode - ячейка с оценкой
 * @returns {boolean}
 */
function Is_final_point(cellNode) {
    if (cellNode.hasAttribute('data-test-component')) {
        if (cellNode.getAttribute('data-test-component').includes('finalResult')) {
            return true
        }
    }
    return false
}

/**
 * Раскрашивает ячейку с двойкой в красный цвет
 * @param {Element} cellNode - ячейка с оценкой
 * @returns {string} Оценка или null
 */
function Color_dvoika_cell(cellNode) {
    if (!cellNode.hasChildNodes()) { return null }// если есть оценка в ячейке (или н-ка)
    let point = cellNode.firstChild.textContent
    let colorCell = Color_selection(point)
    if (colorCell != null) {
        cellNode.style.background = 'radial-gradient(circle at right top, white 30%, rgb(255, 0, 0) 70%)'
        cellNode.classList.add(CLASS_ADD_NAME);
        return point
    }
    return null
}

/**
 * Окрашивает ячейку итоговой оценки
 * @param {Element} cellNode - ячейка с оценкой
 * @param {Array} allPoint - массив с всеми оценками в строке
 * @param {boolean} is_we_need_3_grades - для атестации нужно только 3 оценки? если нет то 5
 */
function colorFinalPointSell(cellNode, allPoint, is_we_need_3_grades) {
    let neadPoint = is_we_need_3_grades ? 3 : 5 // определяем сколько нужно оценок для атестации
    if (neadPoint > allPoint.length) { // если оценок меньше, красим в красный низ ячейки
        cellNode.style.background = 'linear-gradient(180deg,transparent 70%, #FF9999)'
        cellNode.classList.add(CLASS_ADD_NAME);
        return
    }
    if (allPoint.at(-1) == '2') { // если последняя оценка 2, красим в красный низ ячейки
        cellNode.style.background = 'linear-gradient(180deg,transparent 70%, #FF9999)'
        cellNode.classList.add(CLASS_ADD_NAME);
        return
    }
    if (!cellNode.hasChildNodes()) { return } // если ячейка пустая не красим
    let point = cellNode.firstChild.textContent // получаем оценку
    let colorCell = Color_selection(point) // получаем код цвета
    if (colorCell != null) { // если код получен, красим
        cellNode.style.backgroundColor = colorCell
        cellNode.classList.add(CLASS_ADD_NAME);
    }
}

/**
 * Окрашивает стандартную строку таблицы с оценками ученика
 * @param {Element} rouNode - строка таблицы
 * @param {boolean} is_need_3_grades - нужно ли только 3 оценки для аттестации
 */
function colorizeStandartRow(rouNode, is_need_3_grades) {
    /** массив всех оценок*/
    let pointList = []
    let dvoiki = []
    if (rouNode.childNodes.length < 2) { return }// пропускаем пустые строки таблицы, возможно можно только первую

    for (let j = 1; j < rouNode.childNodes.length - 1; j++) {// пробегаем по ячейкам с оценками
        let cellNode = rouNode.childNodes[j].firstChild //ячейка строки
        if (Is_final_point(cellNode)) { // занимаемся последней ячейкой с итоговой оценкой, и первой с именем/прогресбаром
            colorFinalPointSell(cellNode, pointList, is_need_3_grades)
            rouNode.firstChild.style.background = genGradPointCount(pointList.length, is_need_3_grades) // красим имя в прогресбар по количеству оценок
            rouNode.firstChild.classList.add(CLASS_ADD_NAME);
            continue
        }
        let currentPoint = Color_point_cell(cellNode) // красим ячейку и получаем ту оценку которая там была

        if (currentPoint != null) {
            //если оценка 2 добавляем в массив
            if (currentPoint == '2') {
                dvoiki.push(cellNode);
                if (dvoiki.length >= 3) { // если двоек 3 подряд то красим все в красный
                    dvoiki.forEach(Color_dvoika_cell)
                }
            }
            else {// если двойки подряд кончились то обнуляем списко
                dvoiki = []
            }
            pointList.push(currentPoint)// если получили, записываем в массив
        }
    }
    let itogPointItem = rouNode.childNodes[rouNode.childNodes.length - 1].firstChild // получаем средний балл
    let point = parseFloat(itogPointItem.firstChild.textContent.replace(",", '.'))// переводим в число
    let color // определям цвет по правилам округления
    if (JOURNAL_INFO.isMathRound) {
        if (point >= 4.5) { color = Colors.GREEN }
        else if (point >= 3.5) { color = Colors.BLUE }
        else if (point >= 2.5) { color = Colors.YELLOW }
        else if (point < 2.5) { color = Colors.RED }

    } else {
        if (point >= 4.65) { color = Colors.GREEN }
        else if (point >= 3.6) { color = Colors.BLUE }
        else if (point >= 2.6) { color = Colors.YELLOW }
        else if (point < 2.6) { color = Colors.RED }
    }
    itogPointItem.parentNode.style.backgroundColor = color // красим среднийи бал
    itogPointItem.parentNode.classList.add(CLASS_ADD_NAME);
}

/**
 * Окрашивает строку с итоговыми оценками (годовые/четвертные)
 * @param {Element} rouNode - строка таблицы
 */
function colorizeItoRow(rouNode) {
    /** массив всех оценок*/
    let pointList = []
    if (rouNode.childNodes.length < 2) { return }// пропускаем пустые строки таблицы, возможно можно только первую

    for (let j = 1; j < rouNode.childNodes.length - 1; j++) {// пробегаем по ячейкам с оценками
        let cellNode = rouNode.childNodes[j].firstChild //ячейка строки
        if (Is_final_point(cellNode)) { // занимаемся последней ячейкой с итоговой оценкой, и первой с именем/прогресбаром
            if (!cellNode.hasChildNodes()) { continue }// если есть оценка в ячейке (или н-ка)
            let point = cellNode.firstChild.textContent
            let colorCell = Color_selection(point)
            if (colorCell != null) {
                cellNode.style.backgroundColor = colorCell
                cellNode.classList.add(CLASS_ADD_NAME);
                pointList.push(point)
            }
        }
        if (cellNode.hasAttribute('data-test-component')) {
            if (cellNode.getAttribute('data-test-component').includes('yearResult')) {
                if (!cellNode.hasChildNodes()) { continue }// если есть оценка в ячейке (или н-ка)
                let point = cellNode.firstChild.textContent
                let colorCell = Color_selection(point)
                if (colorCell != null) {
                    cellNode.style.backgroundColor = colorCell
                    cellNode.classList.add(CLASS_ADD_NAME);
                    pointList.push(point)
                }
            }
        }

    }
    let itogPointItem = rouNode.childNodes[rouNode.childNodes.length - 1].firstChild // получаем средний балл
    let point = (Number(pointList[0]) + Number(pointList[1]) + Number(pointList[2])) / 3
    let color // определям цвет по правилам округления
    if (point >= 4.5) { color = Colors.GREEN }
    else if (point >= 3.5) { color = Colors.BLUE }
    else if (point >= 2.5) { color = Colors.YELLOW }
    else if (point < 2.5) { color = Colors.RED }

    itogPointItem.parentNode.style.backgroundColor = color // красим среднийи бал
    itogPointItem.parentNode.classList.add(CLASS_ADD_NAME);
}

/**
 * Основная функция окрашивания таблицы журнала
 * @param {Element} tableBody - тело таблицы (tbody)
 */
function colorizeTable(tableBody) {
    // Удаляем предыдущее окрашивание
    let oldColorElem = tableBody.querySelectorAll('.' + CLASS_ADD_NAME);
    oldColorElem.forEach(element => {
        element.style.removeProperty("background-color");
        element.style.removeProperty('background');
        element.classList.remove(CLASS_ADD_NAME)
    });

    // Проверяем режим отображения (итоговые отметки или обычный)
    let elements = document.querySelector('.FDJEFXkDpWhBLZDxnInU.hGtB0oSuryeRiAS2J57Y.Qp8HUr00NXY26hlHOZwb.cbtxLJutW4h15oSu11WO.IfMLW0irD86BmgWhT8FP.C0qHlb4C7fAcYrnlODD0.false.NxJu2UTTgygYiAOvhTvC.IFkWdTtYw_C_ncCuZmUF.Cb3mMUc4RqGu4myaBrNy');
    let titl = elements.getAttribute('title');
    if (titl == 'Режим отображения итоговых отметок') {
        for (let i = 0; i < tableBody.childNodes.length; i++) { // проходим по строкам таблицу
            colorizeItoRow(tableBody.childNodes[i])
        }
        return
    }

    // Окрашиваем все строки таблицы
    for (let i = 0; i < tableBody.childNodes.length; i++) { // проходим по строкам таблицу
        colorizeStandartRow(tableBody.childNodes[i], JOURNAL_INFO.isWeNeed3Grades)
    }
}

/**
 * Скачивает таблицу журнала как HTML файл
 */
function downloadAsFile() {
    let tablePoint = document.querySelectorAll('table')[0]; // получаем таблицу журнала
    let a = document.createElement("a");
    let file = new Blob([tablePoint.outerHTML], { type: 'text/html' });
    a.href = URL.createObjectURL(file);
    a.download = `ex.html`;
    a.click();
    a.remove()
}

/**
 * Загружает настройки из localStorage
 * @returns {Object} Объект с настройками
 */
function loadSettings() {
    try {
        const settings = localStorage.getItem(MAIN_KEY);
        return settings ? JSON.parse(settings) : {};
    } catch (error) {
        console.error('Ошибка загрузки настроек:', error);
        return {};
    }
}

/**
 * Сохраняет настройки в localStorage
 * @param {Object} settings - Объект с настройками для сохранения
 */
function saveSettings(settings) {
    try {
        localStorage.setItem(MAIN_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Ошибка сохранения настроек:', error);
    }
}

function isTargetUrl(url) {
    const pattern = /^https:\/\/authedu\.mosreg\.ru\/teacher\/study-process\/journal\/(?:grade|my)\/[0-9]+(\?.*)?$/;
    return pattern.test(url);
}

function start() {
    console.log('URL совпал с шаблоном! Запускаем функцию start()');
    setTimeout(insertButton, 1000);
    setLocalStorageParam();
    //insertButton();
}

/**
 * Устанавливает параметры в localStorage для скрытия среднего балла
 */
function setLocalStorageParam() {
    const settings = loadSettings();

    // тут нужно проверить флаг в локалсторадж. Если настройка выключена, то выходим из функции
    if (!settings.hideAverageMark) {
        return;
    }

    // Получаем текущие настройки из localStorage
    const journalSettings = JSON.parse(localStorage.getItem('journalSettings'));

    // Проверяем, что настройки существуют и есть секция additionalGridSettings
    if (journalSettings && journalSettings.additionalGridSettings) {
        // Изменяем нужные значения в additionalGridSettings
        journalSettings.additionalGridSettings.isShowAverageMarkTest = false;
        journalSettings.additionalGridSettings.isShowAverageMarkTopic = false;

        // Сохраняем обратно в localStorage
        localStorage.setItem('journalSettings', JSON.stringify(journalSettings));
    }
}

function initUrlMonitor() {
    let currentUrl = window.location.href;

    // Проверяем текущий URL при загрузке
    if (isTargetUrl(currentUrl)) {
        start();
    }

    // Отслеживаем события навигации
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
        originalPushState.apply(this, args);
        handleUrlChange();
    };

    history.replaceState = function (...args) {
        originalReplaceState.apply(this, args);
        handleUrlChange();
    };

    window.addEventListener('popstate', handleUrlChange);

    // Дополнительно: отслеживаем клики по ссылкам
    document.addEventListener('click', (event) => {
        const link = event.target.closest('a');
        if (link && link.href) {
            setTimeout(handleUrlChange, 100);
        }
    });

    function handleUrlChange() {
        const newUrl = window.location.href;

        // Сравниваем URL без учета параметров
        const currentUrlWithoutParams = currentUrl.split('?')[0];
        const newUrlWithoutParams = newUrl.split('?')[0];

        if (newUrlWithoutParams !== currentUrlWithoutParams) {
            currentUrl = newUrl;
            if (isTargetUrl(newUrl)) {
                start();
            }
        }
    }
}

// Запускаем мониторинг
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUrlMonitor);
} else {
    initUrlMonitor();
}