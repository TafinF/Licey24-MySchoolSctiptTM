// ==UserScript==
// @name         Get Jornal
// @namespace    http://tampermonkey.net/
// @version      2025-02-02
// @description  try to take over the world!
// @author       You
// @match        https://authedu.mosreg.ru/teacher/study-process/journal/grade
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

let i_predmet = 0
let i_class = 0
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
        setTimeout(setClass, 2000);
    }
}


function setClass() {// кликаем по журналу
    let findElem = ".mo3i0By7o2f2M_Erhktw"
    let targets = document.querySelectorAll(findElem)
    if (targets.length == 0) {
        setTimeout(setClass, 2000);
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
    let tablePoint = document.querySelectorAll('table'); // получаем таблицу журнала
    if (tablePoint.length == 0) {
        setTimeout(getURL, 2000);
    }
    else {
        i_predmet += 1;
        console.log(i_predmet)
        // let strWrite = getHeadTable(tablePoint[0].firstChild)
        // strWrite.unshift(window.location.href)
        // console.log(strWrite)
        // megaArr.push(strWrite)
        // console.log(megaArr)
        console.log(tablePoint)
        console.log(tablePoint[0])
        console.log(tablePoint[0].outerHTML)
        downloadAsFile(tablePoint[0].outerHTML, `${i_class}-${i_predmet}`)
        history.back();
        i_memSave++;
        if (i_memSave==150) {
            alert("150")
            i_memSave = 0
        }
        setTimeout(expandPanel, 2000);
    }
}
function downloadAsFile(data, name = "example") {
    let a = document.createElement("a");
    let file = new Blob([data], { type: 'text/html' });
    a.href = URL.createObjectURL(file);
    a.download = `${name}.html`;
    a.click();
    a.remove()
}
setTimeout(expandPanel, 2000);