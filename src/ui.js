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
            background: white;
            color: #333;
            font-size: 13px;
            font-weight: normal;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
            z-index: 99999;
            white-space: nowrap;
            pointer-events: none;
            transform: translate(-50%, -100%);
            border: 1px solid rgba(0, 0, 0, 0.08);
        }
        
        /* Стрелочка tooltip (сверху) */
        .mscp-tooltip-dynamic::after {
            content: '';
            position: absolute;
            bottom: -7px;
            left: 50%;
            transform: translateX(-50%);
            border: 7px solid transparent;
            border-top-color: white;
        }
        
        /* Стрелочка tooltip (снизу) */
        .mscp-tooltip-dynamic.mscp-tooltip-below {
            transform: translate(-50%, 0);
        }
        
        .mscp-tooltip-dynamic.mscp-tooltip-below::after {
            bottom: auto;
            top: -14px;
            border-top-color: transparent;
            border-bottom-color: white;
        }
        
        /* Цветные badge для оценок в tooltip */
        .mscp-grade-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 18px;
            height: 18px;
            padding: 0 5px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 700;
            margin: 0 1px;
            vertical-align: middle;
        }
        
        .mscp-grade-badge.mscp-badge-5 {
            background-color: ${COLORS.GREEN};
            color: #0d3d0d;
        }
        
        .mscp-grade-badge.mscp-badge-4 {
            background-color: ${COLORS.BLUE};
            color: #0d2d4d;
        }
        
        .mscp-grade-badge.mscp-badge-3 {
            background-color: ${COLORS.YELLOW};
            color: #4d4d0d;
        }
        
        .mscp-grade-badge.mscp-badge-2 {
            background-color: ${COLORS.RED};
            color: #4d0d0d;
        }
        
        /* =============================================
           СТИЛИ КНОПОК
           ============================================= */
        
        .mscp-button {
            line-height: 0;
            padding: 8px;
            border-color: #d6d6df;
            border-style: solid;
            border-width: 1px;
            color: #686A71;
            background: white;
            cursor: pointer;
            transition: background 0.2s ease;
            border-radius: 8px;
        }
        .mscp-button:hover {
            background: #ececec;
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
 * Создаёт SVG-иконку настроек (шестерёнка с кистью)
 * @returns {string} HTML-строка с SVG-элементом
 */
function createSettingsIcon() {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20" version="1.1" viewBox="0 0 32 32">
            <defs>
                <linearGradient id="mscp-gradient" x1="6.0911" x2="25.908" y1="26.626" y2="5.3748" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#ff0063" offset="0"></stop>
                    <stop stop-color="#fdff00" offset=".32325"></stop>
                    <stop stop-color="#0c0aff" offset=".35364"></stop>
                    <stop stop-color="#0200ff" offset=".51622"></stop>
                    <stop offset=".52463"></stop>
                </linearGradient>
            </defs>
            <g transform="matrix(1.1018 0 0 1.2006 -1.6207 -3.2015)">
                <g transform="matrix(1.3333 0 0 1.3333 3.7785e-5 4e-7)" fill="#909090">
                    <path d="m10 2c-0.55228 0-1 0.44772-1 1v1.5818c-0.69525 0.2814-1.3415 0.65745-1.9229 1.1119l-1.3713-0.79172c-0.22968-0.13261-0.50264-0.16855-0.75882-0.09991-0.25618 0.06865-0.47459 0.23625-0.6072 0.46593l-2 3.4641c-0.27614 0.47829-0.11227 1.0899 0.36602 1.366l1.3708 0.7914c-0.05051 0.3633-0.07657 0.7341-0.07657 1.1105s0.02606 0.7471 0.07657 1.1105l-1.3708 0.7914c-0.22969 0.1326-0.39728 0.351-0.46593 0.6072-0.06864 0.2562-0.03271 0.5291 0.0999 0.7588l2 3.4641c0.13261 0.2297 0.35103 0.3973 0.60721 0.466 0.25618 0.0686 0.52913 0.0327 0.75882-0.0999l1.3713-0.7918c0.5814 0.4544 1.2277 0.8305 1.9229 1.1119v1.5818c0 0.5523 0.44772 1 1 1h4c0.5522 0 1-0.4477 1-1v-1.5818c0.6952-0.2814 1.3415-0.6575 1.9229-1.1119l1.3713 0.7918c0.2297 0.1326 0.5026 0.1685 0.7588 0.0999 0.2562-0.0687 0.4746-0.2363 0.6072-0.4659l2-3.4641c0.1326-0.2297 0.1686-0.5027 0.0999-0.7589-0.0686-0.2561-0.2362-0.4746-0.4659-0.6072l-1.3708-0.7914c0.0505-0.3633 0.0766-0.7341 0.0766-1.1105s-0.0261-0.7472-0.0766-1.1105l1.3708-0.7914c0.4783-0.27619 0.6422-0.88778 0.366-1.3661l-2-3.4641c-0.1326-0.22969-0.351-0.39728-0.6072-0.46593-0.2562-0.06864-0.5291-0.03271-0.7588 0.0999l-1.3713 0.79174c-0.5814-0.45442-1.2277-0.83046-1.9229-1.1119v-1.5818c0-0.55228-0.4478-1-1-1zm1 3.2899v-1.2899h2v1.2899c0 0.44242 0.2907 0.83225 0.7147 0.95845 0.9111 0.27116 1.7328 0.75367 2.4076 1.392 0.3213 0.30395 0.8041 0.3607 1.1872 0.13955l1.1187-0.64589 1 1.732-1.1173 0.64507c-0.3828 0.22098-0.5751 0.66703-0.473 1.097 0.1058 0.4457 0.1621 0.9116 0.1621 1.3919s-0.0563 0.9462-0.1621 1.3919c-0.1021 0.43 0.0902 0.876 0.473 1.097l1.1173 0.6451-1 1.732-1.1188-0.6459c-0.383-0.2211-0.8658-0.1644-1.1872 0.1396-0.6747 0.6383-1.4964 1.1208-2.4075 1.3919-0.424 0.1262-0.7147 0.5161-0.7147 0.9585v1.2899h-2v-1.2899c0-0.4424-0.2908-0.8323-0.7148-0.9585-0.91111-0.2711-1.7327-0.7536-2.4075-1.3919-0.32132-0.304-0.80415-0.3607-1.1872-0.1396l-1.1187 0.6459-1-1.732 1.1173-0.6451c0.38275-0.221 0.57504-0.667 0.47296-1.097-0.1058-0.4457-0.16204-0.9116-0.16204-1.3919s0.05623-0.9462 0.16204-1.3919c0.10208-0.43-0.09022-0.87603-0.47296-1.097l-1.1173-0.64506 1-1.732 1.1187 0.64588c0.38305 0.22115 0.86587 0.16439 1.1872-0.13956 0.67479-0.63831 1.4964-1.1208 2.4075-1.392 0.424-0.1262 0.7148-0.51603 0.7148-0.95845zm-1 6.7101c0-1.1046 0.89542-2 2-2s2 0.8954 2 2-0.8954 2-2 2-2-0.8954-2-2zm2-4c-2.2092 0-4 1.7909-4 4 0 2.2091 1.7909 4 4 4 2.2091 0 4-1.7909 4-4 0-2.2091-1.7909-4-4-4z" clip-rule="evenodd" fill="#909090" fill-rule="evenodd"></path>
                </g>
                <path d="m27.555 8.42c-1.355 1.647-5.07 6.195-8.021 9.81l-3.747-3.804c3.389-3.016 7.584-6.744 9.1-8.079 2.697-2.377 5.062-3.791 5.576-3.213 0.322 0.32-0.533 2.396-2.908 5.286zm-8.676 10.61c-1.143 1.399-2.127 2.604-2.729 3.343l-4.436-4.323c0.719-0.64 1.916-1.705 3.304-2.939zm-3.39 4.153v-0.012c-2.575 9.88-14.018 4.2-14.018 4.2s4.801 0.605 4.801-3.873c0-4.341 4.412-4.733 4.683-4.753l4.543 4.427c0 1e-3 -9e-3 0.011-9e-3 0.011z" fill="url(#mscp-gradient)" style="mix-blend-mode:normal"></path>
            </g>
        </svg>
    `;
}

// ============================================================
// КНОПКИ
// ============================================================

/**
 * Создаёт кнопку настроек и добавляет в DOM
 * @param {HTMLElement} parentElement - элемент, в который добавляется кнопка
 * @returns {void}
 */
function createButtons(parentElement) {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'box-shadow: 1px 1px 4px 0px rgba(0, 0, 0, 0.07); border-radius: 8px; display: inline-flex;';
    
    const button = document.createElement('button');
    button.className = 'mscp-button';
    button.innerHTML = createSettingsIcon();
    button.title = 'Настройки покраса';
    button.addEventListener('click', showModal);
    buttonContainer.appendChild(button);
    
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
    
    // Обработчики кнопок
    actionButtons.querySelector('[data-action="download"]').addEventListener('click', () => {
        downloadAsFile();
    });
    actionButtons.querySelector('[data-action="removeHeader"]').addEventListener('click', () => {
        removeHeaderAndSetHeight();
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
