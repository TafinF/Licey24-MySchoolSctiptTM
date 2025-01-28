// ==UserScript==
// @name         New Userscript2
// @namespace    http://tampermonkey.net/
// @version      2024-11-20
// @description  try to take over the world!
// @author       You
// @match        https://authedu.mosreg.ru/teacher/study-process/journal/grade/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

let i_predmet = 4
let i_class = 10
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
        let strWrite = getHeadTable(tablePoint[0].firstChild)
        strWrite.unshift(window.location.href)
        console.log(strWrite)
        megaArr.push(strWrite)
        console.log(megaArr)
        history.back();
        i_memSave++;
        if (i_memSave==150) {
            alert("150")
            i_memSave = 0
        }
        setTimeout(expandPanel, 2000);
    }
}
function getHeadTable(tableHead) {

    let rouArr1 = []
    // первая строка состоит из блока с названием предмета и именем учителя, затем названия месяцев, последний элемент это средний балл
    let firstRou = tableHead.childNodes[0] //первая строка
    let targetSpanList = firstRou.querySelectorAll('th>div>div>div>div>div>span')// получаем лист span с именем учителяи и названием предмета
    let predmetName = targetSpanList[0].textContent // название предмета
    // let ychitelName = targetSpanList[1].textContent // имя учителя
    rouArr1.push(predmetName)
    // let strOut = predmetName + "\t\t" // строка для хранения таблицы. Добавляем имя предмета и пропуск одной ячейки
    for (let i = 1; i < firstRou.childNodes.length - 1; i++) { // проходим названия месяцев, все узлы строки кроме первого и последнего
        let monfBloc = firstRou.childNodes[i] // блок с названием месяца
        let countRepeat = parseInt(monfBloc.colSpan) // сколько ячеек нужно отступить после названия месяца
        let monfName =  monfBloc.querySelector('div>span').textContent // получаем из блока название месяца и добавлем в строку таблицы
        while (countRepeat != 0) { //заполяем название месяцев
            rouArr1.push(monfName)
            countRepeat--;
          }
        // strOut += "\t".repeat(countRepeat)// добавляем в строку нужное колличество пропусков ячеек
    }

    let rouArr2 = ["name"]
    let triRou = tableHead.childNodes[2] // третья строка
    for (let i = 0; i < triRou.childNodes.length; i++) {
        let dateBloc = triRou.childNodes[i]
        let countRouSpan = parseInt(dateBloc.rowSpan)
        if (countRouSpan>1) {
            rouArr2.push("-")
        } else {
            let date = dateBloc.querySelector('div>span').textContent
            if (date=="") {
                date = dateBloc.querySelectorAll('div>span')[1].textContent
            }
            rouArr2.push(date)
        }
   }

    let newArr = [i_class, i_predmet, rouArr1[0]]
    for (let index = 1; index < rouArr2.length; index++) {
        let v
        switch (rouArr1[index]) {
            case "Ноябрь":
              v=  "11"
                break;
            case "Декабрь":
              v=  "12"
                break;
            case "Январь":
              v=  "1"
                break;
            case "Февраль":
              v=  "2"
                break;

            default:
                v="0"
                break;
        }
        if (rouArr2[index] !="-") {
            newArr.push( rouArr2[index].toString().padStart(2, '0') + "."+ v.padStart(2, '0')+".2024")
        }


    }
    console.log([rouArr1,rouArr2]);
    // console.log(newArr);
    return newArr
}

setTimeout(expandPanel, 1000);