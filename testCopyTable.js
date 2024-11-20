// ==UserScript==
// @name         My School Color Point
// @namespace    http://tampermonkey.net/
// @version      000
// @description  Окрашивает оценки в разные цвета в Моя Школа
// @author       Tafintsev Feodor taf.f11@ya.ru
// @match        https://authedu.mosreg.ru/teacher/study-process/journal/*
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
        // console.log(tablePoint[0]);
        let strWrite = getHeadTable(tablePoint[0].firstChild)
        strWrite += colorizeTable(tablePoint[0].lastChild)
        navigator.clipboard.writeText(strWrite)
    }
}
function colorizeTable(tableBody) {
    // console.log(tableBody);
    //tableBody.childNodes.length
    let strOutTable = ""
    for (let i = 1; i < tableBody.childNodes.length; i++) { // проходим строки тела таблицы (tr). Пропускаем первую
        let strPartOut = "" // эта строка таблицы в виде строки текста
        let rouNode = tableBody.childNodes[i] //текущая строка таблицы
        let pointCount = 0; // количество оценок в строке считать
        let spanNameList = rouNode.firstChild.querySelectorAll('div>div>div>span')   // получаем имя и номер из первой ячейки строки
        strPartOut += spanNameList[0].textContent + "\t"
        strPartOut += spanNameList[1].textContent + "\t"
        for (let j = 1; j < rouNode.childNodes.length-1; j++) {// пробегаем по ячейкам оценок текущей строки
            let cellNode = rouNode.childNodes[j].firstChild // див внутри текущей ячейки
            if (cellNode.hasChildNodes()) {// если есть оценка в ячейке (или н-ка)
                let point = cellNode.firstChild.textContent
                strPartOut += point
                if (['2', '3', '4', '5'].includes(point)) {
                    pointCount++;
                }

            }
            strPartOut += "\t"
        }
        strPartOut += rouNode.lastChild.querySelector('div>span').textContent + "\t" // средний бал из последней ячеки
        strPartOut += pointCount + "\t" // колличество оценок
        strOutTable+=strPartOut + "\n"
    }
    return strOutTable
    navigator.clipboard.writeText(strOutTable)
}
function getHeadTable(tableHead) {

    let firstRou = tableHead.childNodes[0] //первая строка
    let targetSpanList = firstRou.querySelectorAll('th>div>div>div>div>div>span')// получаем лист span с именем учителяи и названием предмета
    let predmetName = targetSpanList[0].textContent // название предмета
    let ychitelName = targetSpanList[1].textContent // имя учителя
    let strOut = predmetName + "\t\t" // строка для хранения таблицы. Добавляем имя предмета и пропуск одной ячейки
    for (let i = 1; i < firstRou.childNodes.length-1; i++) { // проходим названия месяцев, все узлы строки кроме первого и последнего
        let monfBloc = firstRou.childNodes[i] // блок с названием месяца
        let countRepeat = parseInt( monfBloc.colSpan) // сколько ячеек нужно отступить после названия месяца
        strOut += monfBloc.querySelector('div>span').textContent // получаем из блока название месяца и добавлем в строку таблицы
        strOut += "\t".repeat(countRepeat)// добавляем в строку нужное колличество пропусков ячеек
    }
    strOut+= "ср.балл\tкол-во оценок\n"// последние заголовки и перенос строки

    strOut+= ychitelName+"\t\t" // имя учителя и пропуск ячейки
    let secondRou = tableHead.childNodes[1] // вторя строка
    for (let i = 0; i < secondRou.childNodes.length-1; i++) { // проходим все названия тем кроме последней, там "итог"
        let temBloc = secondRou.childNodes[i] //блок с названием месяца
        let countRepeat = parseInt( temBloc.colSpan) // сколько ячеек нужно отступить после названия темы
        strOut += temBloc.querySelectorAll('div>span')[1].textContent // получаем из блока название темы и добавляем в таблицу
        strOut += "\t".repeat(countRepeat)
    }
    strOut+="Итог\n\t\t"

    let triRou = tableHead.childNodes[2] // третья строка
    for (let i = 0; i < triRou.childNodes.length; i++) {
        let dateBloc = triRou.childNodes[i]
        let countRepeat = parseInt( dateBloc.colSpan)
        strOut += dateBloc.querySelector('div>span').textContent
        strOut += "\t".repeat(countRepeat)
    }
    strOut+="\n"

    strOut+="№\tСписок класса\t"
    let chetRou = tableHead.childNodes[3] // четверт строка
    for (let i = 0; i < chetRou.childNodes.length; i++) {
        let dateBloc = chetRou.childNodes[i]
        strOut += dateBloc.querySelector('div>span').textContent + "\t"
    }
    strOut+="\n"
    return strOut
    

}
window.onload = function () { getHim(); };
