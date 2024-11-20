// ==UserScript==
// @name         My School Color Point
// @namespace    http://tampermonkey.net/
// @version      2024-11-20
// @description  Окрашивает оценки в разные цвета в Моя Школа
// @author       Tafintsev Feodor taf.f11@ya.ru
// @match        https://authedu.mosreg.ru/teacher/study-process/journal/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mosreg.ru
// @grant        none
// ==/UserScript==
let mutationObserver = new MutationObserver(mutationCallback);

function mutationCallback(mutations) {
    console.log("Возможно, таблица пропала. Запускаем поиск");
    mutationObserver.disconnect();
    setTimeout(getHim, 2000);
};

function getHim() {
    let tablePoint = document.querySelectorAll('table'); // получаем таблицу журнала
    if (tablePoint.length == 0) {
        setTimeout(getHim, 1000);
        console.log("Таблица ещё не загружена, ждём 1с");
    }
    else {
        console.log("Таблица найдена");
        console.log(tablePoint[0]);
        colorizeTable(tablePoint[0].lastChild)
        let watchPoint = document.querySelectorAll('main')[0].firstChild; // получаем таблицу журнала
        mutationObserver.observe(watchPoint, {
            attributes: true,
            characterData: true,
            childList: true,
            subtree: false,
            attributeOldValue: true,
            characterDataOldValue: true
        });
    }
}

function insertButton() {
    let tablePoint = document.querySelectorAll('main');
    if (tablePoint.length == 0) {
        setTimeout(insertButton, 1000);
        console.log("Div для кнопки не ныйден ждём 1с");
    }
    else {
        console.log("Ставим кнопку");
        let targetDiv = tablePoint[0].firstChild.firstChild.firstChild.firstChild.firstChild
        console.log(targetDiv);
        let bu = document.createElement('button');
        bu.style.cssText = 'padding: 6px 10px 10px 10px; background-color: #4c6ef5; border-radius: 8px; color: white; margin-left: 10px;';
        bu.textContent = "Покрасить"
        bu.addEventListener("click", getHim);
        targetDiv.append(bu);
    }
}
function colorizeTable(tableBody) {
    console.log(tableBody);
    let coutLessons = tableBody.childNodes[2].childNodes.length - 3 // колличество уроков
    let needPoint = coutLessons > 15 ? 5 : 3; // сколько будет нужно оценок
    
    console.log("Уроков в триместре:" + coutLessons)
    console.log("Оценок за триметр должнобыть не менее:" + needPoint)
    for (let i = 0; i < tableBody.childNodes.length; i++) {
        let rouNode = tableBody.childNodes[i] //строки таблицы
        if (rouNode.childNodes.length > 2) { // пропускаем пустые строки таблицы, возможно можно только первую
            let pointCount = 0; // количество оценок в строке считать
            let colorVal = ['#FF9999', '#FFFFCC', "#99CCFF", '#CCFFCC'] // варианты цветов

            for (let j = 1; j < rouNode.childNodes.length-1; j++) {// пробегаем по ячейкам с оценками
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
     
            let itogPointItem = rouNode.childNodes[rouNode.childNodes.length-1].firstChild // получаем средний балл
            let point = parseFloat(itogPointItem.firstChild.textContent.replace(",", '.'))// переводим в число
            //красим по правилам округления оценок
            if (point<2.6) {
                itogPointItem.style.backgroundColor = colorVal[0];            
            }
            if (point>=2.6) {
                itogPointItem.style.backgroundColor = colorVal[1];            
            }
            if (point>=3.6) {
                itogPointItem.style.backgroundColor = colorVal[2];            
            }
            if (point>=4.65) {
                itogPointItem.style.backgroundColor = colorVal[3];            
            }
        }
    }
}
window.onload = function () { getHim(); insertButton(); };
