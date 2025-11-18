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
 * Вставляет кнопки управления в интерфейс журнала
 */
function insertButton() {
    // Если кнопка уже существует, выходим
    if (document.querySelector('.licey24_but')) {
        return;
    }

    // Если главная секция не найдена, пробуем снова через 1 секунду
    const mainSection = document.querySelectorAll('main');
    if (mainSection.length === 0) {
        console.log("Div для кнопки не найден, ждём 1с");
        setTimeout(insertButton, 1000);
        return;
    }

    console.log("Ставим кнопки");
    
    // Находим родительский элемент для размещения кнопок
    const parentElement = document.querySelector('[data-test-component="undefined-subheaderTitle-titleContainer"]');
    if (!parentElement) {
        setTimeout(insertButton, 1000);
        return;
    }

    // Ищем h6 элемент внутри родительского
    const h6Element = parentElement.querySelector('h6');
    if (!h6Element) {
        setTimeout(insertButton, 1000);
        return;
    }

    WATCH_ELEMENT = h6Element.parentNode;

    // Создаем стили и кнопки
    createButtonStyles();
    createButtons();

    // Автоматически запускаем окрашивание
    getHim();
}

/**
 * Создает и добавляет стили для кнопок
 */
function createButtonStyles() {
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        .licey24_but {
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
        .licey24_but:hover {
            background: lightgrey;
        }
        .licey24_but:first-child {
            border-radius: 8px 0 0 8px;
        }
        .licey24_but:last-child {
            border-radius: 0 8px 8px 0;
        }
    `;
    document.head.appendChild(styleEl);
}

/**
 * Создает контейнер с кнопками
 */
function createButtons() {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'box-shadow: 1px 1px 4px 0px rgba(0, 0, 0, 0.07); border-radius: 8px; display: inline-flex;';
    
    const buttons = [
        {
            html: createBrushIcon(),
            style: '',
            clickHandler: getHim,
            title: 'Принудительная покраска'
        },
        {
            html: createInfoIcon(),
            style: '',
            clickHandler: createModalWindow,
            title: 'Информация о обработке'
        },
        {
            html: createExcelIcon(),
            style: '',
            clickHandler: downloadAsFile,
            title: 'Копировать в Excel'
        }
    ];

    buttons.forEach((buttonConfig, index) => {
        const button = createButton(buttonConfig, index);
        buttonContainer.append(button);
    });

    WATCH_ELEMENT.append(buttonContainer);
}

/**
 * Создает отдельную кнопку
 */
function createButton(config, index) {
    const button = document.createElement('button');
    button.classList.add('licey24_but');
    button.innerHTML = config.html;
    button.title = config.title;
    button.style.cssText = config.style;
    button.addEventListener('click', config.clickHandler);
    
    return button;
}

/**
 * Создает SVG иконку кисти
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
 * Создает SVG иконку информации
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
 * Создает SVG иконку Excel
 */
function createExcelIcon() {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-earmark-spreadsheet" viewBox="0 0 16 16">
            <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2M9.5 3A1.5 1.5 0 0 0 11 4.5h2V9H3V2a1 1 0 0 1 1-1h5.5zM3 12v-2h2v2zm0 1h2v2H4a1 1 0 0 1-1-1zm3 2v-2h3v2zm4 0v-2h3v1a1 1 0 0 1-1 1zm3-3h-3v-2h3zm-7 0v-2h3v2z"/>
        </svg>
    `;
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
function createModalWindow() {
    // Создаем элементы модального окна
    const modalOverlay = document.createElement('div');
    const modalWindow = document.createElement('div');
    const modalHeader = document.createElement('div');
    const modalTitle = document.createElement('h2');
    const closeButton = document.createElement('button');
    const modalContent = document.createElement('div');

    // Создаем элементы для отображения информации
    const infoSection = document.createElement('div');
    const lessonsInfo = document.createElement('div');
    const gradesInfo = document.createElement('div');
    const roundingInfo = document.createElement('div');

    // Создаем настройки с галочками
    const settingsSection = document.createElement('div');
    const setting1Container = document.createElement('div');
    const setting1Label = document.createElement('label');
    const setting1Checkbox = document.createElement('input');
    const setting1Text = document.createElement('span');

    const setting2Container = document.createElement('div');
    const setting2Label = document.createElement('label');
    const setting2Checkbox = document.createElement('input');
    const setting2Text = document.createElement('span');

    // Создаем кнопки
    const buttonsSection = document.createElement('div');
    const applyButton = document.createElement('button');
    const cancelButton = document.createElement('button');

    // Стили для оверлея
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = '0';
    modalOverlay.style.left = '0';
    modalOverlay.style.width = '100%';
    modalOverlay.style.height = '100%';
    modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.zIndex = '1000';
    modalOverlay.style.fontFamily = 'Arial, sans-serif';

    // Стили для модального окна
    modalWindow.style.backgroundColor = 'white';
    modalWindow.style.borderRadius = '12px';
    modalWindow.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
    modalWindow.style.minWidth = '450px';
    modalWindow.style.maxWidth = '500px';
    modalWindow.style.overflow = 'hidden';
    modalWindow.style.position = 'relative';

    // Стили для заголовка
    modalHeader.style.backgroundColor = '#f8f9fa';
    modalHeader.style.padding = '20px 24px';
    modalHeader.style.borderBottom = '1px solid #e9ecef';
    modalHeader.style.display = 'flex';
    modalHeader.style.justifyContent = 'space-between';
    modalHeader.style.alignItems = 'center';

    modalTitle.textContent = 'Настройки дополнения My School Color Point';
    modalTitle.style.margin = '0';
    modalTitle.style.fontSize = '18px';
    modalTitle.style.fontWeight = '600';
    modalTitle.style.color = '#333';

    // Стили для кнопки закрытия (крестик) - увеличенная версия
    closeButton.innerHTML = '&times;';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '28px'; // Увеличили размер
    closeButton.style.cursor = 'pointer';
    closeButton.style.color = '#6c757d';
    closeButton.style.width = '40px'; // Увеличили размер
    closeButton.style.height = '40px'; // Увеличили размер
    closeButton.style.borderRadius = '50%';
    closeButton.style.display = 'flex';
    closeButton.style.alignItems = 'center';
    closeButton.style.justifyContent = 'center';
    closeButton.style.transition = 'all 0.2s ease';

    closeButton.addEventListener('mouseenter', function () {
        closeButton.style.backgroundColor = '#e9ecef';
        closeButton.style.color = '#333';
    });

    closeButton.addEventListener('mouseleave', function () {
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.color = '#6c757d';
    });

    // Стили для контента
    modalContent.style.padding = '24px';

    // Стили для информационных блоков
    infoSection.style.marginBottom = '24px';

    const infoItemStyle = {
        padding: '12px 16px',
        marginBottom: '8px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef',
        fontSize: '14px',
        color: '#495057'
    };

    Object.assign(lessonsInfo.style, infoItemStyle);
    Object.assign(gradesInfo.style, infoItemStyle);
    Object.assign(roundingInfo.style, infoItemStyle);

    let roundingMethod = JOURNAL_INFO.isMathRound ? "математический (4,5)" : "лицейский (4,65)"
    let gradesRequired = JOURNAL_INFO.isWeNeed3Grades ? "3" : "5"
    lessonsInfo.innerHTML = `<strong>Количество уроков в триместре:</strong> ${JOURNAL_INFO.countLessons}`;
    gradesInfo.innerHTML = `<strong>Необходимо набрать оценок:</strong> ${gradesRequired}`;
    roundingInfo.innerHTML = `<strong>Выбран метод округления:</strong> ${roundingMethod}`;

    infoSection.appendChild(lessonsInfo);
    infoSection.appendChild(gradesInfo);
    infoSection.appendChild(roundingInfo);

    // Стили для секции настроек
    settingsSection.style.marginBottom = '24px';

    const settingContainerStyle = {
        display: 'flex',
        alignItems: 'center',
        padding: '14px 0',
        borderBottom: '1px solid #f1f3f4'
    };

    Object.assign(setting1Container.style, settingContainerStyle);
    Object.assign(setting2Container.style, settingContainerStyle);

    // Стили для галочек
    setting1Checkbox.type = 'checkbox';
    setting2Checkbox.type = 'checkbox';

    const checkboxStyle = {
        width: '18px',
        height: '18px',
        marginRight: '12px',
        cursor: 'pointer',
        accentColor: '#496be8'
    };

    Object.assign(setting1Checkbox.style, checkboxStyle);
    Object.assign(setting2Checkbox.style, checkboxStyle);

    // Стили для текста настроек
    setting1Text.textContent = 'Цветной режим (в разарботке...)';
    setting2Text.textContent = 'Подсветка пограничных оценок (в разарботке...)';

    const textStyle = {
        fontSize: '14px',
        color: '#333',
        cursor: 'pointer',
        fontWeight: '500'
    };

    Object.assign(setting1Text.style, textStyle);
    Object.assign(setting2Text.style, textStyle);

    // Собираем настройки
    setting1Label.style.display = 'flex';
    setting1Label.style.alignItems = 'center';
    setting1Label.style.cursor = 'pointer';
    setting1Label.appendChild(setting1Checkbox);
    setting1Label.appendChild(setting1Text);

    setting2Label.style.display = 'flex';
    setting2Label.style.alignItems = 'center';
    setting2Label.style.cursor = 'pointer';
    setting2Label.appendChild(setting2Checkbox);
    setting2Label.appendChild(setting2Text);

    setting1Container.appendChild(setting1Label);
    setting2Container.appendChild(setting2Label);

    settingsSection.appendChild(setting1Container);
    settingsSection.appendChild(setting2Container);

    // Стили для секции кнопок
    buttonsSection.style.display = 'flex';
    buttonsSection.style.justifyContent = 'flex-end';
    buttonsSection.style.gap = '12px';
    buttonsSection.style.paddingTop = '16px';
    buttonsSection.style.borderTop = '1px solid #e9ecef';

    // Стили для кнопки "Применить"
    applyButton.textContent = 'Применить';
    applyButton.style.padding = '10px 24px';
    applyButton.style.backgroundColor = '#496be8';
    applyButton.style.color = 'white';
    applyButton.style.border = 'none';
    applyButton.style.borderRadius = '6px';
    applyButton.style.cursor = 'pointer';
    applyButton.style.fontSize = '14px';
    applyButton.style.fontWeight = '500';
    applyButton.style.transition = 'all 0.2s ease';

    applyButton.addEventListener('mouseenter', function () {
        applyButton.style.backgroundColor = '#3a5bd0';
        applyButton.style.transform = 'translateY(-1px)';
    });

    applyButton.addEventListener('mouseleave', function () {
        applyButton.style.backgroundColor = '#496be8';
        applyButton.style.transform = 'translateY(0)';
    });

    // Стили для кнопки "Отмена"
    cancelButton.textContent = 'Отмена';
    cancelButton.style.padding = '10px 24px';
    cancelButton.style.backgroundColor = 'white';
    cancelButton.style.color = '#495057';
    cancelButton.style.border = '1px solid #6c757d';
    cancelButton.style.borderRadius = '6px';
    cancelButton.style.cursor = 'pointer';
    cancelButton.style.fontSize = '14px';
    cancelButton.style.fontWeight = '500';
    cancelButton.style.transition = 'all 0.2s ease';

    cancelButton.addEventListener('mouseenter', function () {
        cancelButton.style.backgroundColor = '#f8f9fa';
        cancelButton.style.borderColor = '#495057';
    });

    cancelButton.addEventListener('mouseleave', function () {
        cancelButton.style.backgroundColor = 'white';
        cancelButton.style.borderColor = '#6c757d';
    });

    buttonsSection.appendChild(cancelButton);
    buttonsSection.appendChild(applyButton);

    // Собираем модальное окно
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);

    modalContent.appendChild(infoSection);
    modalContent.appendChild(settingsSection);
    modalContent.appendChild(buttonsSection);

    modalWindow.appendChild(modalHeader);
    modalWindow.appendChild(modalContent);
    modalOverlay.appendChild(modalWindow);

    // Обработчики событий
    closeButton.addEventListener('click', function () {
        document.body.removeChild(modalOverlay);
    });

    cancelButton.addEventListener('click', function () {
        document.body.removeChild(modalOverlay);
    });

    applyButton.addEventListener('click', function () {
        const colorMode = setting1Checkbox.checked ? 'включен' : 'выключен';
        const highlightMode = setting2Checkbox.checked ? 'включена' : 'выключена';
        console.log(`Цветной режим: ${colorMode}`);
        console.log(`Подсветка пограничных оценок: ${highlightMode}`);
        // Здесь можно добавить логику применения настроек
        document.body.removeChild(modalOverlay);
    });

    // Закрытие по клику на оверлей
    modalOverlay.addEventListener('click', function (event) {
        if (event.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
        }
    });

    // Закрытие по Escape
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            if (document.body.contains(modalOverlay)) {
                document.body.removeChild(modalOverlay);
            }
        }
    });

    // Добавляем модальное окно на страницу
    document.body.appendChild(modalOverlay);
}

function isTargetUrl(url) {
    const pattern = /^https:\/\/authedu\.mosreg\.ru\/teacher\/study-process\/journal\/(?:grade|my)\/[0-9]+(\?.*)?$/;
    return pattern.test(url);
}

function start() {
    console.log('URL совпал с шаблоном! Запускаем функцию start()');
    setTimeout(insertButton, 1000);
    //insertButton();
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

    history.pushState = function(...args) {
        originalPushState.apply(this, args);
        handleUrlChange();
    };

    history.replaceState = function(...args) {
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