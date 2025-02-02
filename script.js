// ==UserScript==
// @name         Test My School Color Point
// @namespace    http://tampermonkey.net/
// @version      2025-02-02
// @description  Окрашивает оценки в разные цвета в Моя Школа
// @author       Tafintsev Feodor taf.f11@ya.ru
// @match        https://authedu.mosreg.ru/teacher/study-process/journal/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mosreg.ru
// @grant        none
// ==/UserScript==

let OUT_STR_COLORIZE_TYPE; // строка для отображения типа выбранного округления
let OUT_STR_TRIMESTR_INFO; // строка с информайией о количестве уроков в триместре и нужном количестве оценок для атестации
let WATCH_ELEMENT;
let WRONG_JOURNAL_LIST = [// список журналов в которых округление математическое
    'Изобразительное искусство',
    'Музыка',
    'Труд',
    'Физическая культура'
];
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
        let f = isMathRoundType(WATCH_ELEMENT.textContent)
        colorizeTable(tablePoint[0].lastChild, f)
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
        bu3.addEventListener("click",downloadAsFile );
        di.append(bu3);
        WATCH_ELEMENT.append(di);
        getHim();
    }
}
function colorizeTable(tableBody, isMathRound = false) {
    //console.log(tableBody);
    let coutLessons = tableBody.childNodes[2].childNodes.length - 3 // количество уроков
    let needPoint = coutLessons > 15 ? 5 : 3; // сколько будет нужно оценок
    OUT_STR_TRIMESTR_INFO = `Уроков в триместре: ${coutLessons}\nОценок за триметр должнобыть не менее: ${needPoint}`
    console.log(OUT_STR_TRIMESTR_INFO);

    for (let i = 0; i < tableBody.childNodes.length; i++) {
        let rouNode = tableBody.childNodes[i] //строки таблицы
        if (rouNode.childNodes.length > 2) { // пропускаем пустые строки таблицы, возможно можно только первую
            let pointCount = 0; // количество оценок в строке считать
            let colorVal = ['#FF9999', '#FFFFCC', "#99CCFF", '#CCFFCC'] // варианты цветов

            for (let j = 1; j < rouNode.childNodes.length - 1; j++) {// пробегаем по ячейкам с оценками
                let cellNode = rouNode.childNodes[j].firstChild
                if (cellNode.hasChildNodes()) {// если есть оценка в ячейке (или н-ка)
                    let point = cellNode.firstChild.textContent
                    if (['2', '3', '4', '5'].includes(point)) { // проверяем оценка это или "Н"
                        cellNode.style.backgroundColor = colorVal[point - 2] // ставим диву в ячейке цвет из массива по значению оценки -2 чтобы в индекс превратить
                        pointCount = pointCount + 1; // прибавляем счётчик количества оценок
                    }
                }
            }
            let countPIndicSpan = rouNode.childNodes[0].firstChild.querySelector('div>div>span') // получаем номер ученика
            if (pointCount >= needPoint) { countPIndicSpan.style.backgroundColor = '#CCFFCC'; } // красим в зависимости от колличетва оценок
            else { countPIndicSpan.style.backgroundColor = '#FF9999'; }

            let itogPointItem = rouNode.childNodes[rouNode.childNodes.length - 1].firstChild // получаем средний балл
            let point = parseFloat(itogPointItem.firstChild.textContent.replace(",", '.'))// переводим в число

            if (isMathRound) {
                //красим по правилам округления математики
                if (point >= 4.5) {
                    itogPointItem.style.backgroundColor = colorVal[3];
                    continue
                }
                if (point >= 3.5) {
                    itogPointItem.style.backgroundColor = colorVal[2];
                    continue
                }
                if (point >= 2.5) {
                    itogPointItem.style.backgroundColor = colorVal[1];
                    continue
                }
                if (point < 2.5) {
                    itogPointItem.style.backgroundColor = colorVal[0];
                    continue
                }

            } else {
                //красим по правилам округления оценок лицея
                if (point >= 4.65) {
                    itogPointItem.style.backgroundColor = colorVal[3];
                    continue
                }
                if (point >= 3.6) {
                    itogPointItem.style.backgroundColor = colorVal[2];
                    continue
                }
                if (point >= 2.6) {
                    itogPointItem.style.backgroundColor = colorVal[1];
                    continue
                }
                if (point < 2.6) {
                    itogPointItem.style.backgroundColor = colorVal[0];
                    continue
                }
            }

        }
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
