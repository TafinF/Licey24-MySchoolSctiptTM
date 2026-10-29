// ============================================================
// МОДАЛЬНОЕ ОКНО: вкладки и секции формы настроек
// ============================================================

/**
 * Вкладки окна настроек. Вкладка показывается, если на этой странице есть что настраивать
 * @type {Array<{id: string, label: string, isAvailable: function(): boolean, build: function(Object): HTMLElement}>}
 */
const SETTINGS_TABS = [
    {
        id: 'journal',
        label: 'Журнал',
        isAvailable: () => isTargetUrl(window.location.href),
        build: createJournalTab
    },
    {
        id: 'schedule',
        label: 'Расписание',
        isAvailable: () => true,
        build: createScheduleTab
    },
    {
        id: 'access',
        label: 'Токен',
        isAvailable: () => true,
        build: createAccessTab
    }
];

/**
 * Создаёт секцию вкладки: заголовок и строки настроек
 * @param {string} title - заголовок секции
 * @param {...HTMLElement} children - содержимое секции
 * @returns {HTMLElement} DOM-элемент секции
 */
function createSection(title, ...children) {
    const section = document.createElement('section');
    section.className = 'mscp-section';

    if (title) {
        const heading = document.createElement('h3');
        heading.className = 'mscp-section-title';
        heading.textContent = title;
        section.appendChild(heading);
    }

    section.append(...children);
    return section;
}

/**
 * Создаёт строку с переключателем: название, пояснение и тумблер справа
 * @param {string} key - ключ настройки (data-key)
 * @param {string} title - название настройки
 * @param {string} description - пояснение мелким шрифтом (может быть пустым)
 * @param {boolean} checked - включена ли настройка
 * @returns {HTMLElement} DOM-элемент строки
 */
function createSwitchRow(key, title, description, checked) {
    const row = document.createElement('label');
    row.className = 'mscp-row';
    row.innerHTML = `
        <span class="mscp-row-text">
            <span class="mscp-row-title">${title}</span>
            ${description ? `<span class="mscp-row-desc">${description}</span>` : ''}
        </span>
        <span class="mscp-switch">
            <input type="checkbox" class="mscp-checkbox" data-key="${key}" ${checked ? 'checked' : ''}>
            <span class="mscp-switch-track"></span>
        </span>
    `;
    return row;
}

/**
 * Создаёт строку с кнопкой действия: название, пояснение и кнопка справа
 * @param {string} title - название действия
 * @param {string} description - пояснение мелким шрифтом
 * @param {string} buttonText - текст кнопки
 * @param {function(HTMLButtonElement): void} onClick - обработчик нажатия, получает кнопку
 * @returns {HTMLElement} DOM-элемент строки
 */
function createActionRow(title, description, buttonText, onClick) {
    const row = document.createElement('div');
    row.className = 'mscp-row mscp-row-static';
    row.innerHTML = `
        <span class="mscp-row-text">
            <span class="mscp-row-title">${title}</span>
            <span class="mscp-row-desc">${description}</span>
        </span>
        <button type="button" class="mscp-btn-action">${buttonText}</button>
    `;

    const button = row.querySelector('button');
    button.addEventListener('click', () => onClick(button));
    return row;
}

/**
 * Создаёт вкладку "Журнал": цветной режим, поведение страницы и действия с журналом
 * @param {Object} currentSettings - текущие настройки
 * @returns {HTMLElement} DOM-элемент вкладки
 */
function createJournalTab(currentSettings) {
    const tab = document.createElement('div');

    const colorRows = [
        ['colorAccumulation', 'Накопляемость оценок', 'Полоса у имени ученика по числу оценок'],
        ['colorLessonGrades', 'Оценки за уроки', 'Цвет ячейки по оценке'],
        ['colorAverageGrade', 'Средний балл', 'Цвет среднего балла'],
        ['colorBorderlineGrades', 'Пограничные оценки', 'Уголок у оценки, которой не хватает до границы']
    ].map(([key, title, description]) => createSwitchRow(key, title, description, currentSettings[key]));

    const pageRows = [
        createSwitchRow('hideAverageMark', 'Выключать средний балл по теме', 'При каждой загрузке журнала', currentSettings.hideAverageMark),
        createSwitchRow('hideBanner', 'Убрать баннер', 'Если снять галочку, баннер вернётся после перезагрузки страницы', currentSettings.hideBanner)
    ];

    const actionRows = [
        createActionRow('Скачать журнал', 'Сохранить таблицу журнала в файл', 'Скачать', () => downloadAsFile()),
        createActionRow('Убрать шапку сайта', 'Один раз, до перезагрузки страницы', 'Убрать', button => {
            try {
                removeHeaderAndSetHeight();
                button.textContent = 'Убрана';
            } catch (error) {
                console.error('Не удалось убрать шапку:', error);
                button.textContent = 'Не вышло';
            }
            button.disabled = true;
        })
    ];

    tab.append(
        createJournalInfo(),
        createSection('Цветной режим', ...colorRows),
        createSection('Страница', ...pageRows),
        createSection('Действия', ...actionRows)
    );
    return tab;
}

/**
 * Создаёт плитки со сведениями об открытом журнале
 * @returns {HTMLElement} DOM-элемент со сведениями
 */
function createJournalInfo() {
    const stats = document.createElement('div');
    stats.className = 'mscp-stats';

    const rounding = JournalState.isMathRound ? ['4,5', 'математическое'] : ['4,65', 'лицейское'];
    const items = [
        [JournalState.countLessons, 'уроков в триместре'],
        [JournalState.isWeNeed3Grades ? '3' : '5', 'оценок нужно'],
        [rounding[0], `округление ${rounding[1]}`]
    ];

    stats.innerHTML = items
        .map(([value, label]) => `<div class="mscp-stat"><b>${value}</b><span>${label}</span></div>`)
        .join('');
    return stats;
}

/**
 * Создаёт вкладку "Расписание": вид расписания и параметры заменённого вида
 * @param {Object} currentSettings - текущие настройки
 * @returns {HTMLElement} DOM-элемент вкладки
 */
function createScheduleTab(currentSettings) {
    const tab = document.createElement('div');

    const styleSection = createSection('Вид расписания', createScheduleStyleCards(currentSettings));
    const look = createScheduleLookOptions(currentSettings);
    styleSection.appendChild(look);

    // Параметры вида нужны только заменённому расписанию
    const syncLook = () => {
        const isCustom = tab.querySelector('input[name="mscp-schedule-style"]:checked')?.value === 'custom';
        look.hidden = !isCustom;
    };
    tab.addEventListener('change', syncLook);
    tab.appendChild(styleSection);
    syncLook();

    return tab;
}

/**
 * Создаёт вкладку "Токен": токен входа для проекта школьного журнала
 * @returns {HTMLElement} DOM-элемент вкладки
 */
function createAccessTab() {
    const tab = document.createElement('div');

    const row = createActionRow(
        'Токен входа (token.json)',
        'Файл для проекта школьного журнала. Токен даёт доступ к вашей учётной записи: никому его не передавайте и не выкладывайте. '
            + 'Действует около 10 суток, потом нужно скачать новый',
        'Скачать',
        button => {
            const result = downloadToken();
            if (!result.ok) {
                button.textContent = 'Нет токена';
            } else if (result.daysLeft === undefined) {
                button.textContent = 'Скачан';
            } else {
                button.textContent = `Скачан, ещё ${Math.max(0, Math.floor(result.daysLeft))} сут`;
            }
            setTimeout(() => { button.textContent = 'Скачать'; }, 4000);
        }
    );

    tab.appendChild(createSection('Проект «Школьный журнал»', row));
    return tab;
}

/**
 * Создаёт ряд карточек выбора вида расписания: эскиз, название и короткое пояснение
 * @param {Object} currentSettings - текущие настройки
 * @returns {HTMLElement} DOM-элемент с карточками
 */
function createScheduleStyleCards(currentSettings) {
    const cards = document.createElement('div');
    cards.className = 'mscp-options';

    const selected = SCHEDULE_STYLES.some(style => style.value === currentSettings.scheduleStyle)
        ? currentSettings.scheduleStyle
        : DEFAULT_SETTINGS.scheduleStyle;

    SCHEDULE_STYLES.forEach(style => {
        const option = document.createElement('label');
        option.className = 'mscp-option';
        option.innerHTML = `
            <input type="radio" class="mscp-radio" data-key="scheduleStyle" name="mscp-schedule-style" value="${style.value}" ${style.value === selected ? 'checked' : ''}>
            ${createScheduleThumbnail(style.value)}
            <span class="mscp-option-title">${style.label}</span>
            <span class="mscp-row-desc">${style.description}</span>
        `;
        cards.appendChild(option);
    });

    return cards;
}

/**
 * Рисует эскиз вида расписания для карточки выбора
 * @param {string} style - вид расписания: classic, compact или custom
 * @returns {string} HTML-строка с SVG-элементом
 */
function createScheduleThumbnail(style) {
    const columns = 5;
    const rects = [];

    for (let column = 0; column < columns; column++) {
        const x = 8 + column * 40;

        if (style === 'classic') {
            // Высокие карточки в сетке со шкалой времени
            const top = 10 + (column % 2) * 14;
            rects.push(`<rect x="${x}" y="${top}" width="34" height="28" rx="3" fill="#d1d5db"/>`);
            rects.push(`<rect x="${x}" y="${top + 34}" width="34" height="28" rx="3" fill="#d1d5db"/>`);
        } else if (style === 'compact') {
            // Много низких строк, уместившихся в окно
            for (let row = 0; row < 6; row++) {
                if ((row + column) % 4 === 3) continue;
                rects.push(`<rect x="${x}" y="${8 + row * 13}" width="34" height="10" rx="2" fill="#9ca3af"/>`);
            }
        } else {
            // Цветные карточки по номерам уроков
            const colors = ['#8b5cf6', '#3b82f6', '#14b8a6', '#f59e0b', '#ec4899'];
            for (let row = 0; row < 4; row++) {
                if ((row * 2 + column) % 5 === 4) continue;
                rects.push(`<rect x="${x}" y="${8 + row * 17}" width="34" height="14" rx="3" fill="${colors[(row + column) % colors.length]}"/>`);
            }
        }
    }

    return `<svg class="mscp-thumb" viewBox="0 0 208 76" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${rects.join('')}</svg>`;
}

/**
 * Создаёт параметры заменённого расписания: как помечать предмет, цвет класса и время на карточке
 * @param {Object} currentSettings - текущие настройки
 * @returns {HTMLElement} DOM-элемент с параметрами
 */
function createScheduleLookOptions(currentSettings) {
    const look = document.createElement('div');
    look.className = 'mscp-subpanel';

    const selected = SCHEDULE_SUBJECT_MARKS.some(mark => mark.value === currentSettings.scheduleSubjectMark)
        ? currentSettings.scheduleSubjectMark
        : DEFAULT_SETTINGS.scheduleSubjectMark;

    const marks = SCHEDULE_SUBJECT_MARKS.map(mark => `
        <label>
            <input type="radio" class="mscp-radio" data-key="scheduleSubjectMark" name="mscp-subject-mark" value="${mark.value}" ${mark.value === selected ? 'checked' : ''}>
            <span>${mark.label}</span>
        </label>
    `).join('');

    const markRow = document.createElement('div');
    markRow.className = 'mscp-row mscp-row-static';
    markRow.innerHTML = `
        <span class="mscp-row-text">
            <span class="mscp-row-title">Предмет на карточке</span>
            <span class="mscp-row-desc">Цвет — полоска слева. Подпись — название предмета. Если предмет один, он не помечается</span>
        </span>
        <span class="mscp-seg">${marks}</span>
    `;

    look.append(
        markRow,
        createSwitchRow('scheduleClassColor', 'Цвет класса', 'У одинаковых классов одинаковый цвет', currentSettings.scheduleClassColor !== false),
        createSwitchRow('scheduleShowTime', 'Время урока', 'Начало и конец урока на карточке', currentSettings.scheduleShowTime !== false)
    );

    const hint = document.createElement('div');
    hint.className = 'mscp-row-desc mscp-hint';
    hint.textContent = 'Значки У (оценки) и ДЗ на карточке урока: зелёный — есть, красный — нет, серый — срок ещё не вышел; голубое У — оценок нет, но есть комментарий. Подробнее — подсказка при наведении.';
    look.appendChild(hint);

    return look;
}
