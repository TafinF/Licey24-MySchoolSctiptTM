// ==UserScript==
// @name         CheckDZ
// @namespace    http://tampermonkey.net/
// @version      2024-12-03
// @description  try to take over the world!
// @author       You
// @match        https://authedu.mosreg.ru/teacher/study-process/journal/grade/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

let targetArr = [[0, 2], [0, 3], [0, 4], [0, 7], [0, 11], [0, 12], [0, 13], [0, 15], [0, 16], [0, 20], [0, 21], [0, 22], [0, 25], [1, 3], [1, 4], [1, 5], [1, 7], [1, 8], [1, 14], [1, 15], [1, 18], [1, 19], [1, 29], [1, 30], [2, 2], [2, 5], [2, 9], [2, 15], [2, 16], [2, 17], [2, 19], [2, 20], [2, 25], [2, 26], [2, 29], [2, 30], [2, 32], [3, 3], [3, 4], [3, 6], [3, 8], [3, 10], [3, 19], [3, 20], [3, 23], [3, 25], [3, 31], [3, 35], [4, 2], [4, 11], [4, 13], [4, 18], [4, 19], [4, 20], [4, 21], [4, 22], [4, 26], [4, 29], [4, 35], [4, 38], [4, 42], [4, 43], [4, 44], [5, 4], [5, 6], [5, 8], [5, 9], [5, 13], [5, 16], [5, 20], [5, 21], [5, 22], [5, 29], [5, 32], [5, 36], [5, 37], [5, 43], [5, 45], [5, 48], [5, 50], [5, 54], [5, 56], [5, 58], [5, 60], [5, 62], [6, 4], [6, 5], [6, 7], [6, 11], [6, 12], [6, 19], [6, 21], [6, 34], [6, 35], [6, 36], [6, 43], [6, 49], [6, 50], [6, 54], [6, 63], [6, 66], [6, 70], [6, 74], [6, 77], [7, 1], [7, 6], [7, 7], [7, 11], [7, 14], [7, 18], [7, 27], [7, 28], [7, 33], [7, 37], [7, 38], [7, 39], [7, 41], [7, 46], [7, 55], [7, 56], [8, 2], [8, 3], [8, 5], [8, 6], [8, 8], [8, 13], [8, 15], [8, 18], [8, 20], [8, 22], [8, 23], [8, 27], [8, 34], [8, 39], [8, 41], [8, 49], [8, 50], [8, 53], [8, 54], [8, 56], [8, 57], [8, 63], [8, 68], [8, 73], [8, 74], [8, 75], [8, 77], [8, 78], [9, 1], [9, 3], [9, 8], [9, 9], [9, 10], [9, 20], [9, 25], [9, 32], [9, 33], [9, 35], [9, 37], [9, 38], [9, 42], [9, 45], [9, 47], [10, 9], [10, 10], [10, 14], [10, 18], [10, 23], [10, 29], [10, 33], [10, 34], [10, 37], [10, 41], [11, 4], [11, 5], [11, 6], [11, 8], [11, 10], [11, 13]]
let iter = 0
let megaArr = []
let i_memSave = 0;
function calcData(t) {
    let x = [[], [], [], ['25.11.2024'], ['26.11.2024'], ['27.11.2024'], ['28.11.2024'], ['29.11.2024'], ['30.11.2024'], ['01.12.2024'], ['02.12.2024'], ['03.12.2024'], ['04.12.2024'], ['05.12.2024'], ['06.12.2024'], ['07.12.2024'], ['08.12.2024'], ['09.12.2024'], ['10.12.2024'], ['11.12.2024'], ['12.12.2024'], ['13.12.2024'], ['14.12.2024'], ['15.12.2024'], ['16.12.2024'], ['17.12.2024'], ['18.12.2024'], ['19.12.2024'], ['20.12.2024'], ['21.12.2024'], ['22.12.2024'], ['23.12.2024'], ['24.12.2024'], ['25.12.2024'], ['26.12.2024'], ['27.12.2024'], ['28.12.2024'], ['29.12.2024'], ['30.12.2024'], ['31.12.2024']]
    let uot = []
    uot.push(x)
    for (let i = 0; i < t.length; i++) {
        let element = t[i];
        let row = [element[0][0], element[0][1], element[1]]

        for (let i2 = 3; i2 < x.length; i2++) {
            let targetDate = x[i2];
            let fYes = true
            for (let i3 = 2; i3 < element.length; i3++) {
                let colorData = element[i3];
                if (colorData[0] == targetDate) {
                    row.push(colorData[1])
                    fYes = false
                }

            }
            if (fYes) { row.push("") }

        }
        uot.push(row)

    }
    console.log(uot);

}

function expandPanel() {// получуаем выпадающий список журналов
    let findElem = ".JBeaw3_TEokaXcUhqpek"
    let targets = document.querySelectorAll(findElem)
    if (targets.length == 0) {
        setTimeout(expandPanel, 2000);
        console.log(findElem + " ещё не загружен, ждём 2с");
    }
    else {
        console.log(findElem + " найден");
        //console.log(targets[i_class]);


        let i_class = targetArr[iter][0]
        console.log(i_class);
        targets[i_class].firstChild.click()
        setTimeout(setClass, 2000);
    }
}

function setClass() {// кликаем по журналу
    let findElem = ".mo3i0By7o2f2M_Erhktw"
    let targets = document.querySelectorAll(findElem)
    if (targets.length == 0) {
        setTimeout(setClass, 2000);
        console.log(findElem + " ещё не загружен, ждём 2с");
    }
    else {
        console.log(findElem + " найден");
        console.log(targets);
        let i_predmet = targetArr[iter][1]
        console.log(i_predmet - 1);
        targets[i_predmet - 1].click()
        setTimeout(getURL, 2000);
    }
}

function getURL() {
    let tablePoint = document.querySelectorAll('table'); // получаем таблицу журнала
    if (tablePoint.length == 0) {
        setTimeout(getURL, 2000);
    }
    else {
        iter += 1;
        console.log(iter)
        let strWrite = getHeadTable(tablePoint[0].firstChild)
        //strWrite.unshift(window.location.href)
        // console.log(strWrite)
        megaArr.push(strWrite)
        console.log(megaArr)
        history.back();
        i_memSave++;
        if (i_memSave == 100) {
            let input = prompt();
            if (input == "0") {
                calcData(megaArr)
                return
            }
            //alert("150")
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
        let monfName = monfBloc.querySelector('div>span').textContent // получаем из блока название месяца и добавлем в строку таблицы
        while (countRepeat != 0) { //заполяем название месяцев
            rouArr1.push(monfName)
            countRepeat--;
        }
        // strOut += "\t".repeat(countRepeat)// добавляем в строку нужное колличество пропусков ячеек
    }

    let rouArr2 = [["name", "0"]]
    let triRou = tableHead.childNodes[2] // третья строка
    for (let i = 0; i < triRou.childNodes.length; i++) {
        let dateBloc = triRou.childNodes[i]
        let countRouSpan = parseInt(dateBloc.rowSpan)
        if (countRouSpan > 1) {
            rouArr2.push(["-", '-'])
        } else {
            let svgPic = dateBloc.querySelector('div>svg')
            let svgColor = getComputedStyle(svgPic).fill
            let date = dateBloc.querySelector('div>span').textContent
            if (date == "") {
                date = dateBloc.querySelectorAll('div>span')[1].textContent
            }
            rouArr2.push([date, svgColor])
        }
    }

    let newArr = [targetArr[iter], rouArr1[0]]
    for (let index = 1; index < rouArr2.length; index++) {
        let v
        switch (rouArr1[index]) {
            case "Ноябрь":
                v = "11"
                break;
            case "Декабрь":
                v = "12"
                break;
            case "Январь":
                v = "1"
                break;
            case "Февраль":
                v = "2"
                break;

            default:
                v = "0"
                break;
        }
        if (rouArr2[index][0] != "-") {
            newArr.push([rouArr2[index][0].toString().padStart(2, '0') + "." + v.padStart(2, '0') + ".2024", rouArr2[index][1]])
        }


    }
    console.log([rouArr1, rouArr2]);
    // console.log(newArr);
    return newArr
}

setTimeout(expandPanel, 1000);