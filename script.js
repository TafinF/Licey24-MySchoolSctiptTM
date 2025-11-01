// ==UserScript==
// @name         My School Color Point
// @namespace    http://tampermonkey.net/
// @version      2025-11-01
// @description  Окрашивает оценки в разные цвета в Моя Школа
// @author       Tafintsev Feodor taf.f11@ya.ru
// @match        https://authedu.mosreg.ru/teacher/study-process/journal/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mosreg.ru
// @grant        none
// ==/UserScript==

class SchoolJournalColorizer {
    constructor() {
        this.CLASS_ADD_NAME = 'lic24color';
        this.IS_MATH_ROUND = false;
        this.WATCH_ELEMENT = null;
        
        this.WRONG_JOURNAL_LIST = [
            'Изобразительное искусство',
            'Музыка',
            'Труд',
            'Физическая культура'
        ];
        
        this.Colors = {
            RED: '#FF9999',
            YELLOW: '#FFFFCC',
            BLUE: '#c2e0ff',
            GREEN: '#CCFFCC'
        };
        
        this.mutationObserver = new MutationObserver(() => this.handleTableMutation());
        this.tableObserver = new MutationObserver(() => this.processJournalTable());
        
        this.outStrColorizeType = '';
        this.outStrTrimesterInfo = '';
        
        this.init();
    }
    
    init() {
        this.insertControlButtons();
    }
    
    /**
     * Определяет тип округления оценок для текущего журнала
     */
    determineRoundingType(journalName) {
        const isMathRound = this.WRONG_JOURNAL_LIST.some(subject => 
            journalName.includes(subject)
        );
        
        this.outStrColorizeType = isMathRound 
            ? 'Выбран метод оценивания по правилам математики (0.5)'
            : 'Выбран метод оценивания по правилам лицея (0.65)';
            
        return isMathRound;
    }
    
    /**
     * Вставляет кнопки управления в интерфейс журнала
     */
    insertControlButtons() {
        const mainSection = document.querySelector('main');
        if (!mainSection) {
            setTimeout(() => this.insertControlButtons(), 1000);
            console.log("Div для кнопки не найден, ждём 1с");
            return;
        }
        
        console.log("Ставим кнопки");
        this.WATCH_ELEMENT = document.querySelectorAll('div>div>div>h6')[1].parentNode;
        
        this.addButtonStyles();
        
        const buttonContainer = this.createButtonContainer();
        this.WATCH_ELEMENT.append(buttonContainer);
        
        this.processJournalTable();
    }
    
    addButtonStyles() {
        const styleEl = document.createElement('style');
        styleEl.innerHTML = `
            .licey24_but {
                line-height: 0;
                padding: 8px;
                margin-left: -1px;
                border-color: #d6d6df;
                border-style: solid;
                border-width: 1px;
                color: #686A71;
                background: white;
                cursor: pointer;
            }
            .licey24_but:hover {
                background: lightgrey;
            }
            .licey24_but:first-child {
                border-radius: 8px 0 0 8px;
            }
            .licey24_but:last-child {
                border-radius: 0 8px 8px 0;
            }
        `;
        document.head.appendChild(styleEl);
    }
    
    createButtonContainer() {
        const container = document.createElement('div');
        container.style.cssText = 'box-shadow: 1px 1px 4px 0px rgba(0, 0, 0, 0.07); border-radius: 8px; display: inline-flex;';
        
        const buttons = [
            {
                icon: this.getPaintIcon(),
                title: 'Перекрасить таблицу',
                action: () => this.processJournalTable(),
                borderRadius: '8px 0 0 8px'
            },
            {
                icon: this.getInfoIcon(),
                title: 'Информация о обработке',
                action: () => this.showInfo(),
                borderRadius: null
            },
            {
                icon: this.getExcelIcon(),
                title: 'Скачать в Excel',
                action: () => this.downloadAsFile(),
                borderRadius: '0 8px 8px 0'
            }
        ];
        
        buttons.forEach(buttonConfig => {
            const button = this.createButton(buttonConfig);
            container.append(button);
        });
        
        return container;
    }
    
    createButton({ icon, title, action, borderRadius }) {
        const button = document.createElement('button');
        button.classList.add('licey24_but');
        button.title = title;
        button.innerHTML = icon;
        button.addEventListener('click', action);
        
        if (borderRadius) {
            button.style.borderRadius = borderRadius;
        }
        
        return button;
    }
    
    getPaintIcon() {
        return `<svg class="bi-brush" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
            <path d="M15.825.12a.5.5 0 0 1 .132.584c-1.53 3.43-4.743 8.17-7.095 10.64a6.1 6.1 0 0 1-2.373 1.534c-.018.227-.06.538-.16.868-.201.659-.667 1.479-1.708 1.74a8.1 8.1 0 0 1-3.078.132 4 4 0 0 1-.562-.135 1.4 1.4 0 0 1-.466-.247.7.7 0 0 1-.204-.288.62.62 0 0 1 .004-.443c.095-.245.316-.38.461-.452.394-.197.625-.453.867-.826.095-.144.184-.297.287-.472l.117-.198c.151-.255.326-.54.546-.848.528-.739 1.201-.925 1.746-.896q.19.012.348.048c.062-.172.142-.38.238-.608.261-.619.658-1.419 1.187-2.069 2.176-2.67 6.18-6.206 9.117-8.104a.5.5 0 0 1 .596.04M4.705 11.912a1.2 1.2 0 0 0-.419-.1c-.246-.013-.573.05-.879.479-.197.275-.355.532-.5.777l-.105.177c-.106.181-.213.362-.32.528a3.4 3.4 0 0 1-.76.861c.69.112 1.736.111 2.657-.12.559-.139.843-.569.993-1.06a3 3 0 0 0 .126-.75zm1.44.026c.12-.04.277-.1.458-.183a5.1 5.1 0 0 0 1.535-1.1c1.9-1.996 4.412-5.57 6.052-8.631-2.59 1.927-5.566 4.66-7.302 6.792-.442.543-.795 1.243-1.042 1.826-.121.288-.214.54-.275.72v.001l.575.575zm-4.973 3.04.007-.005zm3.582-3.043.002.001h-.002z">
            </path>
            <defs>
                <linearGradient id="MyGradient">
                    <stop offset="0%" stop-color="green" />
                    <stop offset="50%" stop-color="blue" />
                    <stop offset="100%" stop-color="red" />
                </linearGradient>
            </defs>
            <style type="text/css">.bi-brush{fill:url(#MyGradient)}</style>
        </svg>`;
    }
    
    getInfoIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-info-circle" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
        </svg>`;
    }
    
    getExcelIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-earmark-spreadsheet" viewBox="0 0 16 16">
            <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2M9.5 3A1.5 1.5 0 0 0 11 4.5h2V9H3V2a1 1 0 0 1 1-1h5.5zM3 12v-2h2v2zm0 1h2v2H4a1 1 0 0 1-1-1zm3 2v-2h3v2zm4 0v-2h3v1a1 1 0 0 1-1 1zm3-3h-3v-2h3zm-7 0v-2h3v2z"/>
        </svg>`;
    }
    
    /**
     * Обработчик мутаций DOM для отслеживания пропадания таблицы
     */
    handleTableMutation() {
        console.log("Возможно, таблица пропала. Запускаем поиск");
        this.mutationObserver.disconnect();
        setTimeout(() => this.processJournalTable(), 2000);
    }
    
    /**
     * Основная функция поиска и обработки таблицы журнала
     */
    processJournalTable() {
        const tables = document.querySelectorAll('table');
        if (tables.length === 0) {
            setTimeout(() => this.processJournalTable(), 1000);
            console.log("Таблица ещё не загружена, ждём 1с");
            return;
        }
        
        console.log('Таблица найдена');
        this.IS_MATH_ROUND = this.determineRoundingType(this.WATCH_ELEMENT.textContent);
        this.colorizeTable(tables[0].lastChild);
        this.startWatching();
        
        this.tableObserver.disconnect();
        this.tableObserver.observe(document.querySelector('main'), { 
            childList: true, 
            subtree: true 
        });
    }
    
    startWatching() {
        if (!this.WATCH_ELEMENT) return;
        
        this.mutationObserver.observe(this.WATCH_ELEMENT, {
            attributes: true,
            characterData: true,
            childList: true,
            subtree: true,
            attributeOldValue: true,
            characterDataOldValue: true
        });
    }
    
    /**
     * Генерирует градиент для прогресс-бара у имени ученика
     */
    generateProgressGradient(count, needsOnlyThreeGrades) {
        const maxGrades = needsOnlyThreeGrades ? 3 : 5;
        
        if (count === 0) {
            return 'linear-gradient(to left, var(--LM-neutrals-day-0))';
        }
        
        if (count >= maxGrades) {
            return 'linear-gradient(to left, #CCFFCC)';
        }
        
        const percentage = 100 - (count / maxGrades * 100);
        const warningColor = count === maxGrades - 1 ? '#fdd9b5' : '#fccfd3';
        
        return `linear-gradient(to left, var(--LM-neutrals-day-0) ${percentage}%, ${warningColor} 0%)`;
    }
    
    /**
     * Получает цвет для оценки
     */
    getColorForGrade(grade) {
        const colorMap = {
            '5': this.Colors.GREEN,
            '4': this.Colors.BLUE,
            '3': this.Colors.YELLOW,
            '2': this.Colors.RED
        };
        return colorMap[grade] || null;
    }
    
    /**
     * Окрашивает ячейку с оценкой
     */
    colorGradeCell(cellNode) {
        if (!cellNode.hasChildNodes()) return null;
        
        const grade = cellNode.firstChild.textContent;
        const color = this.getColorForGrade(grade);
        
        if (color) {
            cellNode.style.background = `linear-gradient(225deg, transparent, ${color} 70%)`;
            cellNode.classList.add(this.CLASS_ADD_NAME);
            return grade;
        }
        
        return null;
    }
    
    /**
     * Определяет, является ли ячейка итоговой оценкой
     */
    isFinalGradeCell(cellNode) {
        return cellNode.hasAttribute('data-test-component') && 
               cellNode.getAttribute('data-test-component').includes('finalResult');
    }
    
    /**
     * Определяет, является ли ячейка годовой оценкой
     */
    isYearGradeCell(cellNode) {
        return cellNode.hasAttribute('data-test-component') && 
               cellNode.getAttribute('data-test-component').includes('yearResult');
    }
    
    /**
     * Окрашивает ячейку с двойкой в красный цвет
     */
    colorFailingGradeCell(cellNode) {
        if (!cellNode.hasChildNodes()) return null;
        
        const grade = cellNode.firstChild.textContent;
        if (grade === '2') {
            cellNode.style.backgroundColor = '#ff0000';
            cellNode.classList.add(this.CLASS_ADD_NAME);
            return grade;
        }
        
        return null;
    }
    
    /**
     * Окрашивает ячейку итоговой оценки
     */
    colorFinalGradeCell(cellNode, allGrades, needsOnlyThreeGrades) {
        const requiredGrades = needsOnlyThreeGrades ? 3 : 5;
        
        if (requiredGrades > allGrades.length || allGrades.at(-1) === '2') {
            cellNode.style.background = 'linear-gradient(180deg, transparent 70%, #FF9999)';
            cellNode.classList.add(this.CLASS_ADD_NAME);
            return;
        }
        
        if (!cellNode.hasChildNodes()) return;
        
        const grade = cellNode.firstChild.textContent;
        const color = this.getColorForGrade(grade);
        
        if (color) {
            cellNode.style.backgroundColor = color;
            cellNode.classList.add(this.CLASS_ADD_NAME);
        }
    }
    
    /**
     * Окрашивает стандартную строку таблицы с оценками ученика
     */
    colorizeStudentRow(rowNode, needsOnlyThreeGrades) {
        if (rowNode.childNodes.length < 2) return;
        
        const grades = [];
        let consecutiveFailingGrades = [];
        
        for (let j = 1; j < rowNode.childNodes.length - 1; j++) {
            const cellNode = rowNode.childNodes[j].firstChild;
            
            if (this.isFinalGradeCell(cellNode)) {
                this.colorFinalGradeCell(cellNode, grades, needsOnlyThreeGrades);
                rowNode.firstChild.style.background = this.generateProgressGradient(
                    grades.length, 
                    needsOnlyThreeGrades
                );
                rowNode.firstChild.classList.add(this.CLASS_ADD_NAME);
                continue;
            }
            
            const currentGrade = this.colorGradeCell(cellNode);
            
            if (currentGrade) {
                if (currentGrade === '2') {
                    consecutiveFailingGrades.push(cellNode);
                    if (consecutiveFailingGrades.length >= 3) {
                        consecutiveFailingGrades.forEach(cell => this.colorFailingGradeCell(cell));
                    }
                } else {
                    consecutiveFailingGrades = [];
                }
                grades.push(currentGrade);
            }
        }
        
        this.colorAverageGradeCell(rowNode);
    }
    
    /**
     * Окрашивает ячейку со средним баллом
     */
    colorAverageGradeCell(rowNode) {
        const averageCell = rowNode.childNodes[rowNode.childNodes.length - 1].firstChild;
        const averageGrade = parseFloat(averageCell.firstChild.textContent.replace(",", '.'));
        
        let color;
        if (this.IS_MATH_ROUND) {
            if (averageGrade >= 4.5) color = this.Colors.GREEN;
            else if (averageGrade >= 3.5) color = this.Colors.BLUE;
            else if (averageGrade >= 2.5) color = this.Colors.YELLOW;
            else color = this.Colors.RED;
        } else {
            if (averageGrade >= 4.65) color = this.Colors.GREEN;
            else if (averageGrade >= 3.6) color = this.Colors.BLUE;
            else if (averageGrade >= 2.6) color = this.Colors.YELLOW;
            else color = this.Colors.RED;
        }
        
        averageCell.parentNode.style.backgroundColor = color;
        averageCell.parentNode.classList.add(this.CLASS_ADD_NAME);
    }
    
    /**
     * Окрашивает строку с итоговыми оценками (годовые/четвертные)
     */
    colorizeSummaryRow(rowNode) {
        if (rowNode.childNodes.length < 2) return;
        
        const grades = [];
        
        for (let j = 1; j < rowNode.childNodes.length - 1; j++) {
            const cellNode = rowNode.childNodes[j].firstChild;
            
            if ((this.isFinalGradeCell(cellNode) || this.isYearGradeCell(cellNode)) && 
                cellNode.hasChildNodes()) {
                const grade = cellNode.firstChild.textContent;
                const color = this.getColorForGrade(grade);
                
                if (color) {
                    cellNode.style.backgroundColor = color;
                    cellNode.classList.add(this.CLASS_ADD_NAME);
                    grades.push(grade);
                }
            }
        }
        
        if (grades.length >= 3) {
            this.colorYearAverageCell(rowNode, grades);
        }
    }
    
    /**
     * Окрашивает ячейку со среднегодовым баллом
     */
    colorYearAverageCell(rowNode, grades) {
        const averageCell = rowNode.childNodes[rowNode.childNodes.length - 1].firstChild;
        const averageGrade = grades.reduce((sum, grade) => sum + Number(grade), 0) / grades.length;
        
        let color;
        if (averageGrade >= 4.5) color = this.Colors.GREEN;
        else if (averageGrade >= 3.5) color = this.Colors.BLUE;
        else if (averageGrade >= 2.5) color = this.Colors.YELLOW;
        else color = this.Colors.RED;
        
        averageCell.parentNode.style.backgroundColor = color;
        averageCell.parentNode.classList.add(this.CLASS_ADD_NAME);
    }
    
    /**
     * Основная функция окрашивания таблицы журнала
     */
    colorizeTable(tableBody) {
        this.clearPreviousColoring(tableBody);
        
        if (this.isSummaryViewMode()) {
            this.colorizeSummaryView(tableBody);
            return;
        }
        
        this.colorizeStandardView(tableBody);
    }
    
    /**
     * Очищает предыдущее окрашивание
     */
    clearPreviousColoring(tableBody) {
        const coloredElements = tableBody.querySelectorAll(`.${this.CLASS_ADD_NAME}`);
        coloredElements.forEach(element => {
            element.style.removeProperty("background-color");
            element.style.removeProperty('background');
            element.classList.remove(this.CLASS_ADD_NAME);
        });
    }
    
    /**
     * Проверяет, активен ли режим отображения итоговых отметок
     */
    isSummaryViewMode() {
        const element = document.querySelector('.FDJEFXkDpWhBLZDxnInU.hGtB0oSuryeRiAS2J57Y.Qp8HUr00NXY26hlHOZwb.cbtxLJutW4h15oSu11WO.IfMLW0irD86BmgWhT8FP.C0qHlb4C7fAcYrnlODD0.false.NxJu2UTTgygYiAOvhTvC.IFkWdTtYw_C_ncCuZmUF.Cb3mMUc4RqGu4myaBrNy');
        return element?.getAttribute('title') === 'Режим отображения итоговых отметок';
    }
    
    /**
     * Окрашивает таблицу в режиме итоговых оценок
     */
    colorizeSummaryView(tableBody) {
        for (let i = 0; i < tableBody.childNodes.length; i++) {
            this.colorizeSummaryRow(tableBody.childNodes[i]);
        }
    }
    
    /**
     * Окрашивает таблицу в стандартном режиме
     */
    colorizeStandardView(tableBody) {
        const lessonsCount = tableBody.childNodes[2].childNodes.length - 3;
        const needsOnlyThreeGrades = lessonsCount < 15;
        
        this.outStrTrimesterInfo = `Уроков в триместре: ${lessonsCount}\nОценок за триметр должно быть не менее: ${needsOnlyThreeGrades ? 3 : 5}`;
        console.log(this.outStrTrimesterInfo);
        
        for (let i = 0; i < tableBody.childNodes.length; i++) {
            this.colorizeStudentRow(tableBody.childNodes[i], needsOnlyThreeGrades);
        }
    }
    
    /**
     * Показывает информацию об обработке
     */
    showInfo() {
        alert(`${this.outStrColorizeType}\n${this.outStrTrimesterInfo}`);
    }
    
    /**
     * Скачивает таблицу журнала как HTML файл
     */
    downloadAsFile() {
        const table = document.querySelectorAll('table')[0];
        const blob = new Blob([table.outerHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = url;
        link.download = `journal_export.html`;
        link.click();
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
        link.remove();
    }
}

// Инициализация скрипта
new SchoolJournalColorizer();