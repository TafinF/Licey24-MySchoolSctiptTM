/**
 * ============================================================================
 * ФАЙЛ: ui.js
 * 
 * Назначение: UI компоненты - стили, кнопки, модальное окно
 * ============================================================================
 */

// ============================================================
// СТИЛИ
// ============================================================

/**
 * Создаёт и добавляет все CSS-стили для скрипта
 * Включает стили для:
 * - Окрашивания оценок (градиенты, сплошные цвета)
 * - Tooltip (динамический, поверх всех элементов)
 * - Кнопок управления
 * - Модального окна настроек
 * @returns {void}
 */
function createStyles() {
    const styleEl = document.createElement('style');
    styleEl.id = 'mscp-styles';
    styleEl.textContent = `
        /* =============================================
           CSS-КЛАССЫ ДЛЯ ОКРАШИВАНИЯ ОЦЕНОК
           ============================================= */
        
        /* Обычные ячейки с оценками - градиентная заливка */
        .mscp-grade-5 {
            background: linear-gradient(225deg, transparent, ${COLORS.GREEN} 70%);
        }
        .mscp-grade-4 {
            background: linear-gradient(225deg, transparent, ${COLORS.BLUE} 70%);
        }
        .mscp-grade-3 {
            background: linear-gradient(225deg, transparent, ${COLORS.YELLOW} 70%);
        }
        .mscp-grade-2 {
            background: linear-gradient(225deg, transparent, ${COLORS.RED} 70%);
        }
        
        /* Цепочка двоек - ярко-красная заливка */
        .mscp-grade-bad {
            background: radial-gradient(circle at right top, white 30%, rgb(255, 0, 0) 70%);
        }
        
        /* Итоговые оценки - сплошной цвет */
        .mscp-final-5 {
            background-color: ${COLORS.GREEN};
        }
        .mscp-final-4 {
            background-color: ${COLORS.BLUE};
        }
        .mscp-final-3 {
            background-color: ${COLORS.YELLOW};
        }
        .mscp-final-2 {
            background-color: ${COLORS.RED};
        }
        
        /* Недостаточно оценок - красная полоса снизу */
        .mscp-insufficient {
            background: linear-gradient(180deg, transparent 70%, ${COLORS.RED});
        }
        
        /* Средний балл */
        .mscp-average-5 {
            background-color: ${COLORS.GREEN};
        }
        .mscp-average-4 {
            background-color: ${COLORS.BLUE};
        }
        .mscp-average-3 {
            background-color: ${COLORS.YELLOW};
        }
        .mscp-average-2 {
            background-color: ${COLORS.RED};
        }
        
        /* Прогресс-бар */
        .mscp-progress {
            /* Динамический градиент задаётся через inline-стиль */
        }
        
        /* Маркер для ячеек "почти достиг" */
        .mscp-average-almost {
            /* Градиент задаётся через inline-стиль */
        }
        
        /* Ячейка с tooltip */
        .mscp-tooltip-trigger {
            cursor: help;
        }
        
        /* =============================================
           ДИНАМИЧЕСКИЙ TOOLTIP (поверх всех элементов)
           ============================================= */
        
        .mscp-tooltip-dynamic {
            position: fixed;
            padding: 8px 12px;
            background: #333;
            color: white;
            font-size: 12px;
            font-weight: normal;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 99999;
            white-space: nowrap;
            pointer-events: none;
            transform: translate(-50%, -100%);
        }
        
        /* Стрелочка tooltip (сверху) */
        .mscp-tooltip-dynamic::after {
            content: '';
            position: absolute;
            bottom: -6px;
            left: 50%;
            transform: translateX(-50%);
            border: 6px solid transparent;
            border-top-color: #333;
        }
        
        /* Стрелочка tooltip (снизу) */
        .mscp-tooltip-dynamic.mscp-tooltip-below {
            transform: translate(-50%, 0);
        }
        
        .mscp-tooltip-dynamic.mscp-tooltip-below::after {
            bottom: auto;
            top: -12px;
            border-top-color: transparent;
            border-bottom-color: #333;
        }
        
        /* =============================================
           СТИЛИ КНОПОК
           ============================================= */
        
        .mscp-button {
            line-height: 0;
            padding: 8px;
            margin-left: -1px;
            border-color: #d6d6df;
            border-style: solid;
            border-width: 1px;
            color: #686A71;
            background: white;
            cursor: pointer;
            transition: background 0.2s ease;
        }
        .mscp-button:hover {
            background: lightgrey;
        }
        .mscp-button:first-child {
            border-radius: 8px 0 0 8px;
        }
        .mscp-button:last-child {
            border-radius: 0 8px 8px 0;
        }
        
        /* =============================================
           СТИЛИ МОДАЛЬНОГО ОКНА
           ============================================= */
        
        .mscp-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: Arial, sans-serif;
        }
        .mscp-modal-window {
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            min-width: 320px;
            max-width: 400px;
            overflow: hidden;
        }
        .mscp-modal-header {
            background-color: #f8f9fa;
            padding: 20px 24px;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .mscp-modal-title {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #333;
        }
        .mscp-close-btn {
            background: none;
            border: none;
            font-size: 28px;
            cursor: pointer;
            color: #6c757d;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        .mscp-close-btn:hover {
            background-color: #e9ecef;
            color: #333;
        }
        .mscp-modal-content {
            padding: 24px;
        }
        .mscp-info-block {
            padding: 12px 16px;
            background-color: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #e9ecef;
            font-size: 13px;
            color: #495057;
            line-height: 1.6;
        }
        .mscp-info-block div {
            padding: 2px 0;
        }
        .mscp-info-label {
            color: #6c757d;
        }
        .mscp-settings-group {
            margin-top: 16px;
        }
        .mscp-settings-title {
            font-size: 13px;
            color: #6c757d;
            margin-bottom: 8px;
            font-weight: 500;
        }
        .mscp-setting-item {
            display: flex;
            align-items: center;
            padding: 4px 0;
        }
        .mscp-checkbox {
            width: 16px;
            height: 16px;
            margin-right: 8px;
            cursor: pointer;
            accent-color: #496be8;
        }
        .mscp-label {
            display: flex;
            align-items: center;
            cursor: pointer;
            font-size: 13px;
            color: #333;
        }
        .mscp-action-buttons {
            margin-top: 12px;
            display: flex;
            gap: 8px;
        }
        .mscp-btn-action {
            flex: 1;
            padding: 8px 12px;
            background-color: #f8f9fa;
            color: #495057;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s ease;
            text-align: center;
        }
        .mscp-btn-action:hover {
            background-color: #e9ecef;
            border-color: #adb5bd;
        }
        .mscp-buttons-section {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding-top: 16px;
            border-top: 1px solid #e9ecef;
        }
        .mscp-btn-primary {
            padding: 10px 24px;
            background-color: #496be8;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        .mscp-btn-primary:hover {
            background-color: #3a5bd0;
            transform: translateY(-1px);
        }
        .mscp-btn-secondary {
            padding: 10px 24px;
            background-color: white;
            color: #495057;
            border: 1px solid #6c757d;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        .mscp-btn-secondary:hover {
            background-color: #f8f9fa;
            border-color: #495057;
        }
    `;
    document.head.appendChild(styleEl);
}

// ============================================================
// SVG ИКОНКИ
// ============================================================

/**
 * Создаёт SVG-иконку кисти (градиентная)
 * @returns {string} HTML-строка с SVG-элементом
 */
function createBrushIcon() {
    return `
        <svg class="bi-brush" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
            <path d="M15.825.12a.5.5 0 0 1 .132.584c-1.53 3.43-4.743 8.17-7.095 10.64a6.1 6.1 0 0 1-2.373 1.534c-.018.227-.06.538-.16.868-.201.659-.667 1.479-1.708 1.74a8.1 8.1 0 0 1-3.078.132 4 4 0 0 1-.562-.135 1.4 1.4 0 0 1-.466-.247.7.7 0 0 1-.204-.288.62.62 0 0 1 .004-.443c.095-.245.316-.38.461-.452.394-.197.625-.453.867-.826.095-.144.184-.297.287-.472l.117-.198c.151-.255.326-.54.546-.848.528-.739 1.201-.925 1.746-.896q.19.012.348.048c.062-.172.142-.38.238-.608.261-.619.658-1.419 1.187-2.069 2.176-2.67 6.18-6.206 9.117-8.104a.5.5 0 0 1 .596.04M4.705 11.912a1.2 1.2 0 0 0-.419-.1c-.246-.013-.573.05-.879.479-.197.275-.355.532-.5.777l-.105.177c-.106.181-.213.362-.32.528a3.4 3.4 0 0 1-.76.861c.69.112 1.736.111 2.657-.12.559-.139.843-.569.993-1.06a3 3 0 0 0 .126-.75zm1.44.026c.12-.04.277-.1.458-.183a5.1 5.1 0 0 0 1.535-1.1c1.9-1.996 4.412-5.57 6.052-8.631-2.59 1.927-5.566 4.66-7.302 6.792-.442.543-.795 1.243-1.042 1.826-.121.288-.214.54-.275.72v.001l.575.575zm-4.973 3.04.007-.005zm3.582-3.043.002.001h-.002z"></path>
            <defs>
                <linearGradient id="MyGradient">
                    <stop offset="0%" stop-color="green" />
                    <stop offset="50%" stop-color="blue" />
                    <stop offset="100%" stop-color="red" />
                </linearGradient>
            </defs>
            <style type="text/css">.bi-brush{fill:url(#MyGradient)}</style>
        </svg>
    `;
}

/**
 * Создаёт SVG-иконку информации (i в круге)
 * @returns {string} HTML-строка с SVG-элементом
 */
function createInfoIcon() {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-info-circle" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
        </svg>
    `;
}

/**
 * Создаёт SVG-иконку таблицы Excel
 * @returns {string} HTML-строка с SVG-элементом
 */
function createExcelIcon() {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-earmark-spreadsheet" viewBox="0 0 16 16">
            <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2M9.5 3A1.5 1.5 0 0 0 11 4.5h2V9H3V2a1 1 0 0 1 1-1h5.5zM3 12v-2h2v2zm0 1h2v2H4a1 1 0 0 1-1-1zm3 2v-2h3v2zm4 0v-2h3v1a1 1 0 0 1-1 1zm3-3h-3v-2h3zm-7 0v-2h3v2z"/>
        </svg>
    `;
}

// ============================================================
// КНОПКИ
// ============================================================

/**
 * Создаёт контейнер с кнопками управления и добавляет в DOM
 * @param {HTMLElement} parentElement - элемент, в который добавляются кнопки
 * @returns {void}
 */
function createButtons(parentElement) {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'box-shadow: 1px 1px 4px 0px rgba(0, 0, 0, 0.07); border-radius: 8px; display: inline-flex;';
    
    const buttons = [
        {
            icon: createBrushIcon(),
            title: 'Принудительная покраска',
            handler: processJournalTable
        },
        {
            icon: createInfoIcon(),
            title: 'Информация о обработке',
            handler: showModal
        },
        {
            icon: createExcelIcon(),
            title: 'Копировать в Excel',
            handler: downloadAsFile
        }
    ];
    
    buttons.forEach(config => {
        const button = document.createElement('button');
        button.className = 'mscp-button';
        button.innerHTML = config.icon;
        button.title = config.title;
        button.addEventListener('click', config.handler);
        buttonContainer.appendChild(button);
    });
    
    parentElement.appendChild(buttonContainer);
}

/**
 * Вставляет кнопки управления в заголовок журнала
 * - Ожидает загрузки DOM-элементов
 * - Создаёт стили и кнопки
 * - Применяет настройки (баннер, средний балл)
 * - Запускает обработку таблицы
 * @returns {void}
 */
function insertButtons() {
    if (document.querySelector('.mscp-button')) return;
    
    const mainSection = document.querySelector(CONFIG.SELECTORS.MAIN_SECTION);
    if (!mainSection) {
        console.log('Контейнер для кнопок не найден, ожидание...');
        setTimeout(insertButtons, 1000);
        return;
    }
    
    const parentElement = document.querySelector(CONFIG.SELECTORS.PARENT_BUTTON_CONTAINER);
    if (!parentElement) {
        setTimeout(insertButtons, 1000);
        return;
    }
    
    const h6Element = parentElement.querySelector('h6');
    if (!h6Element) {
        setTimeout(insertButtons, 1000);
        return;
    }
    
    console.log('Вставляем кнопки управления');
    
    JournalState.watchElement = h6Element.parentNode;
    
    createStyles();
    createButtons(JournalState.watchElement);
    
    // Применяем настройки
    const settings = loadSettings();
    JournalState.settings = settings;
    
    // Удаляем баннер если включено
    if (settings.hideBanner) {
        removeBannerAndSetHeight();
    }
    
    processJournalTable();
}

// ============================================================
// ЭКСПОРТ В EXCEL
// ============================================================

/**
 * Скачивает таблицу журнала как HTML-файл
 * @returns {void}
 */
function downloadAsFile() {
    const table = document.querySelector(CONFIG.SELECTORS.JOURNAL_TABLE);
    if (!table) return;
    
    const link = document.createElement('a');
    const file = new Blob([table.outerHTML], { type: 'text/html' });
    
    link.href = URL.createObjectURL(file);
    link.download = 'journal_export.html';
    link.click();
    link.remove();
}

// ============================================================
// МОДАЛЬНОЕ ОКНО
// ============================================================

/**
 * Создаёт секцию с информацией о журнале
 * @returns {HTMLElement} DOM-элемент с информацией
 */
function createInfoSection() {
    const section = document.createElement('div');
    section.className = 'mscp-info-block';
    
    const roundingMethod = JournalState.isMathRound 
        ? 'математический (4,5)' 
        : 'лицейский (4,65)';
    const gradesRequired = JournalState.isWeNeed3Grades ? '3' : '5';
    
    section.innerHTML = `
        <div><span class="mscp-info-label">Версия:</span> ${VERSION}</div>
        <div><span class="mscp-info-label">Уроков в триместре:</span> ${JournalState.countLessons}</div>
        <div><span class="mscp-info-label">Нужно оценок:</span> ${gradesRequired}</div>
        <div><span class="mscp-info-label">Округление:</span> ${roundingMethod}</div>
    `;
    
    return section;
}

/**
 * Создаёт секцию с настройками (чекбоксы и кнопки действий)
 * @param {Object} currentSettings - текущие настройки
 * @returns {HTMLElement} DOM-элемент с настройками
 */
function createSettingsSection(currentSettings) {
    const section = document.createElement('div');
    section.className = 'mscp-settings-group';
    
    // Секция "Цветной режим для:"
    const colorTitle = document.createElement('div');
    colorTitle.className = 'mscp-settings-title';
    colorTitle.textContent = 'Цветной режим для:';
    section.appendChild(colorTitle);
    
    const colorSettings = [
        { key: 'colorAccumulation', label: 'Накопляемость оценок', checked: currentSettings.colorAccumulation },
        { key: 'colorLessonGrades', label: 'Оценки за уроки', checked: currentSettings.colorLessonGrades },
        { key: 'colorAverageGrade', label: 'Средний балл', checked: currentSettings.colorAverageGrade },
        { key: 'colorBorderlineGrades', label: 'Пограничные оценки', checked: currentSettings.colorBorderlineGrades }
    ];
    
    colorSettings.forEach(setting => {
        const item = document.createElement('div');
        item.className = 'mscp-setting-item';
        item.innerHTML = `
            <label class="mscp-label">
                <input type="checkbox" class="mscp-checkbox" data-key="${setting.key}" ${setting.checked ? 'checked' : ''}>
                <span>${setting.label}</span>
            </label>
        `;
        section.appendChild(item);
    });
    
    // Секция "Дополнительно"
    const extraTitle = document.createElement('div');
    extraTitle.className = 'mscp-settings-title';
    extraTitle.style.marginTop = '12px';
    extraTitle.textContent = 'Дополнительно:';
    section.appendChild(extraTitle);
    
    const extraSettings = [
        { key: 'hideAverageMark', label: 'Выключать средний балл', checked: currentSettings.hideAverageMark },
        { key: 'hideBanner', label: 'Убрать баннер', checked: currentSettings.hideBanner }
    ];
    
    extraSettings.forEach(setting => {
        const item = document.createElement('div');
        item.className = 'mscp-setting-item';
        item.innerHTML = `
            <label class="mscp-label">
                <input type="checkbox" class="mscp-checkbox" data-key="${setting.key}" ${setting.checked ? 'checked' : ''}>
                <span>${setting.label}</span>
            </label>
        `;
        section.appendChild(item);
    });
    
    // Кнопки действий
    const actionButtons = document.createElement('div');
    actionButtons.className = 'mscp-action-buttons';
    actionButtons.innerHTML = `
        <button class="mscp-btn-action" data-action="download">Скачать журнал</button>
        <button class="mscp-btn-action" data-action="removeHeader">Удалить шапку</button>
    `;
    section.appendChild(actionButtons);
    
    // Обработчики кнопок (пока заглушки)
    actionButtons.querySelector('[data-action="download"]').addEventListener('click', () => {
        console.log('Скачать журнал — в разработке');
    });
    actionButtons.querySelector('[data-action="removeHeader"]').addEventListener('click', () => {
        console.log('Удалить шапку — в разработке');
    });
    
    return section;
}

/**
 * Создаёт секцию с кнопками "Отмена" и "Применить"
 * @param {HTMLElement} modalOverlay - оверлей модального окна
 * @param {HTMLElement} settingsSection - секция с настройками (для чтения чекбоксов)
 * @returns {HTMLElement} DOM-элемент с кнопками
 */
function createModalButtons(modalOverlay, settingsSection) {
    const section = document.createElement('div');
    section.className = 'mscp-buttons-section';
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'mscp-btn-secondary';
    cancelButton.textContent = 'Отмена';
    cancelButton.addEventListener('click', () => modalOverlay.remove());
    
    const applyButton = document.createElement('button');
    applyButton.className = 'mscp-btn-primary';
    applyButton.textContent = 'Применить';
    applyButton.addEventListener('click', () => {
        const newSettings = {};
        settingsSection.querySelectorAll('.mscp-checkbox').forEach(checkbox => {
            newSettings[checkbox.dataset.key] = checkbox.checked;
        });
        
        saveSettings(newSettings);
        JournalState.settings = newSettings;
        
        // Применяем настройки скрытия среднего балла
        if (newSettings.hideAverageMark) {
            applyHideAverageMarkSetting();
        }
        
        // Применяем настройку удаления баннера
        if (newSettings.hideBanner) {
            removeBannerAndSetHeight();
        }
        
        // Перерисовываем таблицу с новыми настройками
        processJournalTable();
        
        console.log('Настройки сохранены:', newSettings);
        modalOverlay.remove();
    });
    
    section.appendChild(cancelButton);
    section.appendChild(applyButton);
    
    return section;
}

/**
 * Показывает модальное окно с настройками
 * - Загружает текущие настройки
 * - Создаёт DOM-структуру окна
 * - Добавляет обработчики закрытия (крестик, оверлей, Escape)
 * @returns {void}
 */
function showModal() {
    const currentSettings = loadSettings();
    
    const overlay = document.createElement('div');
    overlay.className = 'mscp-modal-overlay';
    
    const window = document.createElement('div');
    window.className = 'mscp-modal-window';
    
    const header = document.createElement('div');
    header.className = 'mscp-modal-header';
    header.innerHTML = `
        <h2 class="mscp-modal-title">Настройки дополнения My School Color Point</h2>
        <button class="mscp-close-btn">&times;</button>
    `;
    
    const content = document.createElement('div');
    content.className = 'mscp-modal-content';
    
    const infoSection = createInfoSection();
    const settingsSection = createSettingsSection(currentSettings);
    const buttonsSection = createModalButtons(overlay, settingsSection);
    
    content.append(infoSection, settingsSection, buttonsSection);
    window.append(header, content);
    overlay.appendChild(window);
    
    header.querySelector('.mscp-close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    
    const handleEscape = (e) => {
        if (e.key === 'Escape' && document.body.contains(overlay)) {
            overlay.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    document.body.appendChild(overlay);
}
