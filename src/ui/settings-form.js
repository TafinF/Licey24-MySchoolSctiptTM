// ============================================================
// МОДАЛЬНОЕ ОКНО: секции формы настроек
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

    // Сведения о журнале есть только на странице журнала
    const journalInfo = isTargetUrl(window.location.href) ? `
        <div><span class="mscp-info-label">Уроков в триместре:</span> ${JournalState.countLessons}</div>
        <div><span class="mscp-info-label">Нужно оценок:</span> ${gradesRequired}</div>
        <div><span class="mscp-info-label">Округление:</span> ${roundingMethod}</div>
    ` : '';

    section.innerHTML = `
        <div><span class="mscp-info-label">Версия:</span> ${VERSION}</div>
        ${journalInfo}
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

    // Настройки журнала нужны только на странице журнала
    if (isTargetUrl(window.location.href)) {
        appendJournalSettings(section, currentSettings);
    }

    section.appendChild(createScheduleStyleGroup(currentSettings));

    return section;
}

/**
 * Добавляет в секцию настройки журнала: чекбоксы окрашивания, дополнительные и кнопки действий
 * @param {HTMLElement} section - секция настроек
 * @param {Object} currentSettings - текущие настройки
 * @returns {void}
 */
function appendJournalSettings(section, currentSettings) {
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
}

/**
 * Создаёт группу переключателя вида расписания уроков (по одному описанию к каждому виду)
 * @param {Object} currentSettings - текущие настройки
 * @returns {HTMLElement} DOM-элемент с переключателем
 */
function createScheduleStyleGroup(currentSettings) {
    const group = document.createElement('div');
    group.className = 'mscp-schedule-style';
    group.dataset.key = 'scheduleStyle';

    const title = document.createElement('div');
    title.className = 'mscp-settings-title';
    title.style.marginTop = '12px';
    title.textContent = 'Расписание уроков:';
    group.appendChild(title);

    const selected = SCHEDULE_STYLES.some(style => style.value === currentSettings.scheduleStyle)
        ? currentSettings.scheduleStyle
        : DEFAULT_SETTINGS.scheduleStyle;

    SCHEDULE_STYLES.forEach(style => {
        const item = document.createElement('div');
        item.className = 'mscp-setting-item mscp-style-item';
        item.innerHTML = `
            <label class="mscp-label">
                <input type="radio" class="mscp-radio" data-key="scheduleStyle" name="mscp-schedule-style" value="${style.value}" ${style.value === selected ? 'checked' : ''}>
                <span>${style.label}</span>
            </label>
            <div class="mscp-style-description">${style.description}</div>
        `;
        group.appendChild(item);
    });

    const look = createScheduleLookOptions(currentSettings);
    group.appendChild(look);

    // Параметры вида нужны только заменённому расписанию
    const syncLook = () => {
        const isCustom = group.querySelector('input[name="mscp-schedule-style"]:checked')?.value === 'custom';
        look.classList.toggle('mscp-look-off', !isCustom);
        look.querySelectorAll('input').forEach(input => { input.disabled = !isCustom; });
    };
    group.addEventListener('change', syncLook);
    syncLook();

    return group;
}

/**
 * Создаёт параметры заменённого расписания: как помечать предмет и красить ли классы
 * @param {Object} currentSettings - текущие настройки
 * @returns {HTMLElement} DOM-элемент с параметрами
 */
function createScheduleLookOptions(currentSettings) {
    const look = document.createElement('div');
    look.className = 'mscp-look';

    const selected = SCHEDULE_SUBJECT_MARKS.some(mark => mark.value === currentSettings.scheduleSubjectMark)
        ? currentSettings.scheduleSubjectMark
        : DEFAULT_SETTINGS.scheduleSubjectMark;

    const marks = SCHEDULE_SUBJECT_MARKS.map(mark => `
        <label class="mscp-label">
            <input type="radio" class="mscp-radio" data-key="scheduleSubjectMark" name="mscp-subject-mark" value="${mark.value}" ${mark.value === selected ? 'checked' : ''}>
            <span>${mark.label}</span>
        </label>
    `).join('');

    look.innerHTML = `
        <div class="mscp-look-title">Предмет в заменённом расписании:</div>
        <div class="mscp-look-row">${marks}</div>
        <div class="mscp-style-description mscp-look-note">Цвет: полоска слева и легенда. Подпись: название предмета на карточке. Если предмет один, цвет не нужен и не показывается.</div>
        <div class="mscp-setting-item">
            <label class="mscp-label">
                <input type="checkbox" class="mscp-checkbox" data-key="scheduleClassColor" ${currentSettings.scheduleClassColor !== false ? 'checked' : ''}>
                <span>Цвет класса: у одинаковых классов одинаковый цвет</span>
            </label>
        </div>
    `;

    return look;
}
