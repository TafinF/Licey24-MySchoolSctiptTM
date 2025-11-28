/**
 * Вставляет кнопки управления в интерфейс журнала
 */
function insertButton() {
    // Если кнопка уже существует, выходим
    if (document.querySelector('.licey24_but')) {
        return;
    }

    // Если главная секция не найдена, пробуем снова через 1 секунду
    const mainSection = document.querySelectorAll('main');
    if (mainSection.length === 0) {
        console.log("Div для кнопки не найден, ждём 1с");
        setTimeout(insertButton, 1000);
        return;
    }

    console.log("Ставим кнопки");

    // Находим родительский элемент для размещения кнопок
    const parentElement = document.querySelector('[data-test-component="undefined-subheaderTitle-titleContainer"]');
    if (!parentElement) {
        setTimeout(insertButton, 1000);
        return;
    }

    // Ищем h6 элемент внутри родительского
    const h6Element = parentElement.querySelector('h6');
    if (!h6Element) {
        setTimeout(insertButton, 1000);
        return;
    }

    WATCH_ELEMENT = h6Element.parentNode;

    // Создаем стили и кнопки
    createButtonStyles();
    createButtons();

    // Автоматически запускаем окрашивание
    getHim();
}

/**
 * Создает и добавляет стили для кнопок
 */
function createButtonStyles() {
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
            transition: background 0.2s ease;
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

/**
 * Создает контейнер с кнопками
 */
function createButtons() {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'box-shadow: 1px 1px 4px 0px rgba(0, 0, 0, 0.07); border-radius: 8px; display: inline-flex;';

    const buttons = [
        {
            html: createBrushIcon(),
            style: '',
            clickHandler: getHim,
            title: 'Принудительная покраска'
        },
        {
            html: createInfoIcon(),
            style: '',
            clickHandler: createModalWindow,
            title: 'Информация о обработке'
        },
        {
            html: createExcelIcon(),
            style: '',
            clickHandler: downloadAsFile,
            title: 'Копировать в Excel'
        }
    ];

    buttons.forEach((buttonConfig, index) => {
        const button = createButton(buttonConfig, index);
        buttonContainer.append(button);
    });

    WATCH_ELEMENT.append(buttonContainer);
}

/**
 * Создает отдельную кнопку
 */
function createButton(config, index) {
    const button = document.createElement('button');
    button.classList.add('licey24_but');
    button.innerHTML = config.html;
    button.title = config.title;
    button.style.cssText = config.style;
    button.addEventListener('click', config.clickHandler);

    return button;
}

/**
 * Создает SVG иконку кисти
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
 * Создает SVG иконку информации
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
 * Создает SVG иконку Excel
 */
function createExcelIcon() {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-earmark-spreadsheet" viewBox="0 0 16 16">
            <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2M9.5 3A1.5 1.5 0 0 0 11 4.5h2V9H3V2a1 1 0 0 1 1-1h5.5zM3 12v-2h2v2zm0 1h2v2H4a1 1 0 0 1-1-1zm3 2v-2h3v2zm4 0v-2h3v1a1 1 0 0 1-1 1zm3-3h-3v-2h3zm-7 0v-2h3v2z"/>
        </svg>
    `;
}