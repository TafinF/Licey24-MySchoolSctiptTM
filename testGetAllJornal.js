// ==UserScript==
// @name         Get Jornal
// @namespace    http://tampermonkey.net/
// @version      2025-02-03
// @description  Сохраняет таблицы журналов
// @author       You
// @match        https://authedu.mosreg.ru/teacher/study-process/journal/grade
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

let i_predmet = 16
let i_class = 7
let urlsList = ""
let copyTable = ""
let megaArr = []
let i_memSave = 0
let flagTimeChangeClassNumber = false

function expandPanel() {// получуаем выпадающий список журналов
    let findElem = ".JBeaw3_TEokaXcUhqpek"
    let targets = document.querySelectorAll(findElem)
    if (targets.length == 0) {
        setTimeout(expandPanel, 2000);
        console.log(findElem + "ещё не загружен, ждём 1с");
    }
    else {
        if (flagTimeChangeClassNumber) {
            i_class = i_class + 1
            flagTimeChangeClassNumber = false
            i_predmet = 0
        }
        console.log(findElem + " найден");
        console.log(targets[i_class]);
        targets[i_class].firstChild.click()
        setTimeout(setClass, 500);
    }
}


function setClass() {// кликаем по журналу
    let findElem = ".mo3i0By7o2f2M_Erhktw"
    let targets = document.querySelectorAll(findElem)
    if (targets.length == 0) {
        setTimeout(setClass, 1000);
        console.log(findElem + "ещё не загружен, ждём 1с");
    }
    else {
        if (targets.length-1 == i_predmet) {
            flagTimeChangeClassNumber = true
        }
        console.log(findElem + "найден");
        console.log(targets[i_predmet]);
        targets[i_predmet].click()
        setTimeout(getURL, 2000);
    }
}
function getURL() {
    let tablePoint = document.querySelectorAll('table'); // находим таблицу журнала
    if (tablePoint.length == 0) {
        setTimeout(getURL, 2000);
    }
    else {
        i_predmet += 1;
        console.log(i_predmet)
        setTimeout(getTable, 1000);
}
function getTable(){// получаем таблицу журнала
    let tablePoint = document.querySelectorAll('table');
    downloadAsFile(tablePoint[0].outerHTML, `${('00'+i_class).slice(-2)}-${('00'+i_predmet).slice(-2)}`)
        history.back();
        i_memSave++;
        if (i_memSave==100) {
            alert("100")
            i_memSave = 0
        }
        setTimeout(expandPanel, 1000);
    }}
function downloadAsFile(data, name = "example") { // скачиваем таблицу журнала
    let a = document.createElement("a");
    let file = new Blob([data], { type: 'text/html' });
    a.href = URL.createObjectURL(file);
    a.download = `${name}.html`;
    a.click();
    a.remove()
}
setTimeout(expandPanel, 2000);