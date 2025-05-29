// ==UserScript==
// @name         Test My School Color Point 3
// @namespace    http://tampermonkey.net/
// @version      2025-02-02
// @description  Окрашивает оценки в разные цвета в Моя Школа
// @author       Tafintsev Feodor taf.f11@ya.ru
// @match        https://authedu.mosreg.ru/teacher/study-process/journal/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mosreg.ru
// @grant        none
// ==/UserScript==

let CLASS_ADD_NAME = 'lic24color' //имя класса для добавления покрашенным элементам
let OUT_STR_COLORIZE_TYPE; // строка для отображения типа выбранного округления
let OUT_STR_TRIMESTR_INFO; // строка с информайией о количестве уроков в триместре и нужном количестве оценок для атестации
let IS_MATH_ROUND = false;
let WATCH_ELEMENT; // заголовок журнала за которым следим для определения смены таблицы
let WRONG_JOURNAL_LIST = [// список журналов в которых округление математическое
    'Изобразительное искусство',
    'Музыка',
    'Труд',
    'Физическая культура'
];
const Colors = { // цвета ячеек
    RED: ' #FF9999',
    YELLOW: ' #FFFFCC',
    BLUE: ' #99CCFF',
    GREEN: ' #CCFFCC'
};

let MUTATION_OBSERVER = new MutationObserver(mutationCallback);

function mutationCallback() {
    console.log("Возможно, таблица пропала. Запускаем поиск");
    MUTATION_OBSERVER.disconnect();
    setTimeout(getHim, 2000);
};

function isMathRoundType(nameJornal) { //определяет нужно ли применять математическое округление или использовать Лицейское
    // проверяем есть ли в названии текущего журнала слова из списка журналов в которых применяется математическое округление
    for (let i = 0; i < WRONG_JOURNAL_LIST.length; i++) {
        if (nameJornal.includes(WRONG_JOURNAL_LIST[i])) {
            OUT_STR_COLORIZE_TYPE = 'Выбран метод оценивания по правилам математики (0.5)'
            console.log(OUT_STR_COLORIZE_TYPE);
            return true
        }
    }
    OUT_STR_COLORIZE_TYPE = 'Выбран метод оценивания по правилам лицея (0.65)'
    console.log(OUT_STR_COLORIZE_TYPE);
    return false
}
function StartWatch() { //начинает следить за изменением элемента с названием журнала
    MUTATION_OBSERVER.observe(WATCH_ELEMENT, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
        attributeOldValue: true,
        characterDataOldValue: true
    });
}

function getHim() { // поиск таблицы журнала
    let tablePoint = document.querySelectorAll('table'); // получаем таблицу журнала
    if (tablePoint.length == 0) {
        setTimeout(getHim, 1000);
        console.log("Таблица ещё не загружена, ждём 1с");
    }
    else {
        console.log('Таблица найдена');
        IS_MATH_ROUND = isMathRoundType(WATCH_ELEMENT.textContent)
        colorizeTable(tablePoint[0].lastChild)
        StartWatch()
    }
}

function insertButton() { // вставка кнопок управления
    let mainSection = document.querySelectorAll('main');
    if (mainSection.length == 0) {
        setTimeout(insertButton, 1000);
        console.log("Div для кнопки не найден, ждём 1с");
    }
    else {
        console.log("Ставим кнопки");
        WATCH_ELEMENT = document.querySelectorAll('div>div>div>h6')[1].parentNode; // получаем див подписи текущего журнала
        // console.log(watchPoint);
        const styleEl = document.createElement('style');
        styleEl.innerHTML = `
        .licey24_but{
        line-height: 0;
        padding: 8px;
        margin-left: -1px;
        border-color: #d6d6df;
        border-style: solid;
        border-width: 1px;
        color: #686A71;
        }
       .licey24_but:hover {
        background: lightgrey;}`;
        document.head.appendChild(styleEl);
        let di = document.createElement('div');
        di.style.cssText = 'box-shadow: 1px 1px 4px 0px rgba(0, 0, 0, 0.07); border-radius: 8px;';
        let bu = document.createElement('button'); // кнопка принудительной покраски
        bu.style.cssText = 'border-radius: 8px 0 0 8px;';
        bu.classList.add('licey24_but');
        bu.innerHTML = ' <svg class="bi-brush" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"> <path d="M15.825.12a.5.5 0 0 1 .132.584c-1.53 3.43-4.743 8.17-7.095 10.64a6.1 6.1 0 0 1-2.373 1.534c-.018.227-.06.538-.16.868-.201.659-.667 1.479-1.708 1.74a8.1 8.1 0 0 1-3.078.132 4 4 0 0 1-.562-.135 1.4 1.4 0 0 1-.466-.247.7.7 0 0 1-.204-.288.62.62 0 0 1 .004-.443c.095-.245.316-.38.461-.452.394-.197.625-.453.867-.826.095-.144.184-.297.287-.472l.117-.198c.151-.255.326-.54.546-.848.528-.739 1.201-.925 1.746-.896q.19.012.348.048c.062-.172.142-.38.238-.608.261-.619.658-1.419 1.187-2.069 2.176-2.67 6.18-6.206 9.117-8.104a.5.5 0 0 1 .596.04M4.705 11.912a1.2 1.2 0 0 0-.419-.1c-.246-.013-.573.05-.879.479-.197.275-.355.532-.5.777l-.105.177c-.106.181-.213.362-.32.528a3.4 3.4 0 0 1-.76.861c.69.112 1.736.111 2.657-.12.559-.139.843-.569.993-1.06a3 3 0 0 0 .126-.75zm1.44.026c.12-.04.277-.1.458-.183a5.1 5.1 0 0 0 1.535-1.1c1.9-1.996 4.412-5.57 6.052-8.631-2.59 1.927-5.566 4.66-7.302 6.792-.442.543-.795 1.243-1.042 1.826-.121.288-.214.54-.275.72v.001l.575.575zm-4.973 3.04.007-.005zm3.582-3.043.002.001h-.002z"> </path> <defs> <linearGradient id="MyGradient"> <stop offset="0%" stop-color="green" /> <stop offset="50%" stop-color="blue" /> <stop offset="100%" stop-color="red" /> </linearGradient> </defs> <style type="text/css"> .bi-brush{fill:url(#MyGradient)} </style> </svg> '
        bu.addEventListener("click", getHim);
        di.append(bu);
        let bu2 = document.createElement('button'); // кнопка вывода информации о обработке
        //bu2.style.cssText = 'border-radius: 0 8px 8px 0;';
        bu2.classList.add('licey24_but');
        bu2.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-info-circle" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/></svg>'
        bu2.addEventListener("click", () => alert(`${OUT_STR_COLORIZE_TYPE}\n${OUT_STR_TRIMESTR_INFO}`));
        di.append(bu2);
        let bu3 = document.createElement('button'); // кнопка копирования в эксель
        bu3.style.cssText = 'border-radius: 0 8px 8px 0;';
        bu3.classList.add('licey24_but');
        bu3.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-earmark-spreadsheet" viewBox="0 0 16 16"><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2M9.5 3A1.5 1.5 0 0 0 11 4.5h2V9H3V2a1 1 0 0 1 1-1h5.5zM3 12v-2h2v2zm0 1h2v2H4a1 1 0 0 1-1-1zm3 2v-2h3v2zm4 0v-2h3v1a1 1 0 0 1-1 1zm3-3h-3v-2h3zm-7 0v-2h3v2z"/></svg>'
        bu3.addEventListener("click", downloadAsFile);
        di.append(bu3);
        WATCH_ELEMENT.append(di);
        getHim();
    }
}
function genGradPointCount(count, is_we_need_3_grades) { // возвращает строку с настройками градиента для заполнения програсбара у имени ученика по количеству оценок у него
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
 * перевод оценки в код цвета.
 * @param {string} str_point - строка с оценкой.
 * @returns {string} Код цвета или null.
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
 * Раскрашивает ячейку с оценкой.
 * @param {element} cellNode - ячейка с оценкой.
 * @returns {string} Оценка или null.
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
 * Определяет, является ли данная ячейка итоговой оценкой.
 * @param {element} cellNode - ячейка с оценкой.
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
 * Окрашивает ячейку итоговой оценки.
 * @param {element} cellNode - ячейка с оценкой.
 * @param {list} allPoint - массив с всеми оценками в строке.
 * @param {boolean} is_we_need_3_grades - для атестации нужно только 3 оценки? если нет то 5.
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
function colorizeStandartRow(rouNode, is_need_3_grades) {
    /** массив всех оценок*/
    let pointList = []
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
        if (currentPoint != null) { pointList.push(currentPoint) } // если получили, записываем в массив
    }
    let itogPointItem = rouNode.childNodes[rouNode.childNodes.length - 1].firstChild // получаем средний балл
    let point = parseFloat(itogPointItem.firstChild.textContent.replace(",", '.'))// переводим в число
    let color // определям цвет по правилам округления
    if (IS_MATH_ROUND) {
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
// градиент с индикатором для ср. бала linear-gradient(to right, lime 15%, var(--LM-neutrals-day-300) 15% 17%, cyan 12% 100%)
function colorizeTable(tableBody) {
    let oldColorElem = tableBody.querySelectorAll('.' + CLASS_ADD_NAME);
    oldColorElem.forEach(element => {
        element.style.removeProperty("background-color");
        element.style.removeProperty('background');
        element.classList.remove(CLASS_ADD_NAME)
    });
    let elements = document.querySelector('.FDJEFXkDpWhBLZDxnInU.hGtB0oSuryeRiAS2J57Y.Qp8HUr00NXY26hlHOZwb.cbtxLJutW4h15oSu11WO.IfMLW0irD86BmgWhT8FP.C0qHlb4C7fAcYrnlODD0.false.NxJu2UTTgygYiAOvhTvC.IFkWdTtYw_C_ncCuZmUF.Cb3mMUc4RqGu4myaBrNy');
    let titl = elements.getAttribute('title');
    if (titl == 'Режим отображения итоговых отметок') {
        for (let i = 0; i < tableBody.childNodes.length; i++) { // проходим по строкам таблицу
            colorizeItoRow(tableBody.childNodes[i])
        }
        return
    }

    let coutLessons = tableBody.childNodes[2].childNodes.length - 3 // количество уроков
    let is_need_3_grades = coutLessons < 15 // если уроков меньше 15, то для атестации будет достаточно 3-х оценок
    OUT_STR_TRIMESTR_INFO = `Уроков в триместре: ${coutLessons}\nОценок за триметр должнобыть не менее: ${is_need_3_grades ? 3 : 5}` // уведомляем в консоль
    console.log(OUT_STR_TRIMESTR_INFO);

    for (let i = 0; i < tableBody.childNodes.length; i++) { // проходим по строкам таблицу
        colorizeStandartRow(tableBody.childNodes[i], is_need_3_grades)
    }
}
function downloadAsFile() {
    let tablePoint = document.querySelectorAll('table')[0]; // получаем таблицу журнала
    let a = document.createElement("a");
    let file = new Blob([tablePoint.outerHTML], { type: 'text/html' });
    a.href = URL.createObjectURL(file);
    a.download = `ex.html`;
    a.click();
    a.remove()
}
window.onload = function () { insertButton(); };



// // Создаем наблюдатель изменений DOM-элементов
// const observer = new MutationObserver((mutationsList, observer) => {
//     for (const mutation of mutationsList) {
//         if (mutation.type === 'childList') {
//             // Проверяем наличие новых узлов с нужными классами
//             let newNodes = Array.from(mutation.addedNodes);
//             newNodes.forEach(node => {
//                 if (node.classList.contains('zGtSdhndEVAwp_Wmlido') && node.classList.contains('MuiPopper-root')) {
//                     let atr = node.getAttribute('data-test-component')
//                     if (atr.includes('markCellAlteration')) {
//                         console.log(`панелька появилась`, node);
//                     }


//                     // Можно добавить дополнительные действия при появлении элемента
//                 }
//             });
//         }
//     }
// });

// // Конфигурация наблюдения — проверяем новые узлы
// observer.observe(document.body, { childList: true });