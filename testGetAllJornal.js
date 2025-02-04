// ==UserScript==
// @name         Get Jornal
// @namespace    http://tampermonkey.net/
// @version      2025-02-04
// @description  Сохраняет таблицы журналов
// @author       You
// @match        https://authedu.mosreg.ru/teacher/study-process/journal/grade
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

let I_PREDMET = 0
let I_CLASS = 0

if (localStorage.getItem('l24_stor') != null) {
    let sxron = localStorage.getItem('l24_stor').split('-')
    I_PREDMET = parseInt(sxron[0])
    I_CLASS = parseInt(sxron[1])
}
let I_RAM_SAVE = 0 //Ограничитель количества скачиваемых журналов
let FLAG_TimeChangeClassNumber = false

let FLAG_stop_download = true

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms)); // для преостановки программы на время

async function q() {
    while (I_RAM_SAVE <= 100) { // скачиваем пока не будет 100 шт
        if (FLAG_stop_download) {
            return
        }
        let jornal_rows = await find_Elemremt(".JBeaw3_TEokaXcUhqpek") // получаем строки с выпадающим меню классов
        //console.log(jornal_rows);
        jornal_rows[I_CLASS].firstChild.click() // кликаем на нужную строку
        if (FLAG_TimeChangeClassNumber) { // если все классы перебраны
            I_CLASS = I_CLASS + 1 // переходим к следующему классу
            FLAG_TimeChangeClassNumber = false // возвращаем флаг смены класса на место
            I_PREDMET = 0 // выставляем номер выбираемого журнала в 0
        }
        await sleep(500)
        let predmet_list = await find_Elemremt(".mo3i0By7o2f2M_Erhktw") // получаем список всех журналов в данном классе
        //console.log(predmet_list);
        if (predmet_list.length - 1 == I_PREDMET) { // если это последний журнал в списке то ставим флаг для смены класса
            FLAG_TimeChangeClassNumber = true
        }
        predmet_list[I_PREDMET].click() // кликаем на нужный журнал
        I_PREDMET += 1;
        await find_Elemremt("table") // дожидаемся таблицу журнала
        await sleep(2000) // ждём для прогрузки цветов домиков
        let red_home = await find_Elemremt('.d8JBiaXrvL8XVZ58xn9g')
        if (red_home.length>5) {
            await sleep(3000)
        }
        let red_home2 = await find_Elemremt('.d8JBiaXrvL8XVZ58xn9g')
        if (red_home2.length>5) {
            await sleep(15000)
        }
        let tablePoint = document.querySelectorAll('table'); // получаем таблицу журнала
        let data = `<div class="URL">${window.location.href}</div>${tablePoint[0].outerHTML}`
        downloadAsFile(data, `${('00' + I_CLASS).slice(-2)}-${('00' + I_PREDMET).slice(-2)}`) // скачиваем
        history.back();// возвращаемся на страницу выбора журнала
        I_RAM_SAVE++;
        console.log(`Загружено журналов: ${I_RAM_SAVE}`);
        localStorage.setItem('l24_stor', `${I_PREDMET}-${I_CLASS}`);
    }
}

async function find_Elemremt(target_elem_selector) { // находим нужный элемент
    let targets = document.querySelectorAll(target_elem_selector) // получаем элемент по селектору
    while (targets.length == 0) { // продолжнаем пока ненайдём такие элементы
        await sleep(500) // ждём
        targets = document.querySelectorAll(target_elem_selector) // получаем элемент по селектору
        //console.log(targets);
    }
    return targets
}

function downloadAsFile(data, name = "example") { // скачиваем таблицу журнала
    let a = document.createElement("a");
    let file = new Blob([data], { type: 'text/html' });
    a.href = URL.createObjectURL(file);
    a.download = `${name}.html`;
    a.click();
    a.remove()
}

async function setButton() {
    let nav_elem = await find_Elemremt('div>div>div>nav'); // получаем див навигации
    //console.log(nav_elem);
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
     .licey24_but{
    line-height: 0;
    padding: 8px;
    margin-left: -1px;
    border-color: #d6d6df;
    border-style: solid;
    border-width: 1px;
    color: #d5d6da;
    border-radius: 5px;
    }
   .licey24_but:hover {
    background: lightgrey;
    color: black;}`;
    document.head.appendChild(styleEl);
    let di = document.createElement('div');
    let bu = document.createElement('button'); // кнопка
    bu.innerText = "скачивание"
    bu.classList.add('licey24_but');
    bu.addEventListener("click", start_stop_download);
    di.append(bu);
    let bu2 = document.createElement('button'); // кнопка
    bu2.innerText = "задать номер"
    bu2.classList.add('licey24_but');
    bu2.addEventListener("click", defalt_val);
    di.append(bu2);

    nav_elem[0].append(di);
}

function start_stop_download() {
    setTimeout(q, 1000)
    if (FLAG_stop_download) {
        FLAG_stop_download = false
    } else {
        FLAG_stop_download = true
    }
}
function defalt_val() {
    let result = prompt("задание значений:  предмет-класс", "0-0");
    let sxron = result.split('-')
    I_PREDMET = parseInt(sxron[0])
    I_CLASS = parseInt(sxron[1])
    localStorage.setItem('l24_stor', `${I_PREDMET}-${I_CLASS}`);
}
setTimeout(setButton, 2000);