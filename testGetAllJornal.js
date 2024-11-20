// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      2024-11-20
// @description  try to take over the world!
// @author       You
// @match        https://authedu.mosreg.ru/teacher/study-process/journal/grade/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

let iter = 0
let urlsList = ""
function expandPanel() {// получуаем выпадающий список журналов
    let findElem = ".JBeaw3_TEokaXcUhqpek"
    let targets = document.querySelectorAll(findElem)
    if (targets.length == 0) {
        setTimeout(expandPanel, 2000);
        console.log(findElem+"ещё не загружен, ждём 1с");
    }
    else {
        let n = 1
        console.log(findElem +"найден");
        console.log(targets[n]);
        targets[n].firstChild.click()
         setTimeout(setClass, 2000);
    }}


function setClass() {// кликаем по журналу
    let findElem = ".mo3i0By7o2f2M_Erhktw"
let targets = document.querySelectorAll(findElem)
    if (targets.length == 0) {
        setTimeout(setClass, 2000);
        console.log(findElem+"ещё не загружен, ждём 1с");
    }
    else {
        console.log(findElem +"найден");
        console.log(targets[iter]);
        targets[iter].click()
    setTimeout(getURL, 2000);
    }
}
function getURL() {
    let tablePoint = document.querySelectorAll('table'); // получаем таблицу журнала
    if (tablePoint.length == 0) {
    setTimeout(getURL, 2000);}
    else{
        iter+=1;
        console.log(iter)
        urlsList+=window.location.href+'\n'
        console.log(urlsList)
        history.back();

        setTimeout(expandPanel, 2000);}
    }


setTimeout(expandPanel, 1000);