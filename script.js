// ==UserScript==
// @name         My School Color Point
// @namespace    http://tampermonkey.net/
// @version      2024-11-15
// @description  Окрашивает оценки в разные цвета в Моя Школа
// @author       Tafintsev Feodor taf.f11@ya.ru
// @match        https://authedu.mosreg.ru/teacher/study-process/journal/my/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mosreg.ru
// @grant        none
// ==/UserScript==
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
    }
}
function colorizeTable(tableBody){
        console.log(tableBody);
        for (let i = 0; i < tableBody.childNodes.length; i++) {
            let rouNode = tableBody.childNodes[i] //строки таблицы
            if (rouNode.childNodes.length > 2) { // пропускаем пустые строки таблицы, возможно можно только первую
                let pointCount = 0; // количество оценок в строке считать
                for (let j = 0; j < rouNode.childNodes.length; j++) {// пробегаем по ячейкам
                    let cellNode = rouNode.childNodes[j].firstChild
                    if (j == rouNode.childNodes.length - 1) { // последний столбец со средним баллом
                        if (pointCount > 4) { cellNode.style.backgroundColor = '#CCFFCC'; }
                        else { cellNode.style.backgroundColor = '#FF9999'; }
                    }
                    if (cellNode.hasChildNodes()) {// если есть оценка в ячейке (или н-ка)
                        let colorVal = ['#FF9999', '#FFFFCC', "#99CCFF",'#CCFFCC'] // варианты цветов
                        let point = cellNode.firstChild.textContent
                        if (['2','3','4','5'].includes(point)) { // проверяем оценка это или "Н"
                            cellNode.style.backgroundColor = colorVal[point-2] // ставим диву в ячейке цвет из массива по значению оценки -2 чтобы в индекс превратить
                            pointCount = pointCount + 1; // прибавляем счётчик количества оценок
                            console.log(point);  
                        }

                    }
                }
            }
        }
}
window.onload = function () {getHim();};
