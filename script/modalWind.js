/**
 * Создает модальное окно с настройками
 */
function createModalWindow() {
    // Создаем элементы модального окна
    const modalOverlay = document.createElement('div');
    const modalWindow = document.createElement('div');
    const modalHeader = document.createElement('div');
    const modalTitle = document.createElement('h2');
    const closeButton = document.createElement('button');
    const modalContent = document.createElement('div');

    // Создаем элементы для отображения информации
    const infoSection = document.createElement('div');
    const lessonsInfo = document.createElement('div');
    const gradesInfo = document.createElement('div');
    const roundingInfo = document.createElement('div');

    // Создаем настройки с галочками
    const settingsSection = document.createElement('div');
    const setting1Container = document.createElement('div');
    const setting1Label = document.createElement('label');
    const setting1Checkbox = document.createElement('input');
    const setting1Text = document.createElement('span');

    const setting2Container = document.createElement('div');
    const setting2Label = document.createElement('label');
    const setting2Checkbox = document.createElement('input');
    const setting2Text = document.createElement('span');

    const setting3Container = document.createElement('div');
    const setting3Label = document.createElement('label');
    const setting3Checkbox = document.createElement('input');
    const setting3Text = document.createElement('span');

    // Создаем кнопки
    const buttonsSection = document.createElement('div');
    const applyButton = document.createElement('button');
    const cancelButton = document.createElement('button');

    // Загружаем текущие настройки
    const currentSettings = loadSettings();

    // Стили для оверлея
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = '0';
    modalOverlay.style.left = '0';
    modalOverlay.style.width = '100%';
    modalOverlay.style.height = '100%';
    modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.zIndex = '1000';
    modalOverlay.style.fontFamily = 'Arial, sans-serif';

    // Стили для модального окна
    modalWindow.style.backgroundColor = 'white';
    modalWindow.style.borderRadius = '12px';
    modalWindow.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
    modalWindow.style.minWidth = '450px';
    modalWindow.style.maxWidth = '500px';
    modalWindow.style.overflow = 'hidden';
    modalWindow.style.position = 'relative';

    // Стили для заголовка
    modalHeader.style.backgroundColor = '#f8f9fa';
    modalHeader.style.padding = '20px 24px';
    modalHeader.style.borderBottom = '1px solid #e9ecef';
    modalHeader.style.display = 'flex';
    modalHeader.style.justifyContent = 'space-between';
    modalHeader.style.alignItems = 'center';

    modalTitle.textContent = 'Настройки дополнения My School Color Point';
    modalTitle.style.margin = '0';
    modalTitle.style.fontSize = '18px';
    modalTitle.style.fontWeight = '600';
    modalTitle.style.color = '#333';

    // Стили для кнопки закрытия (крестик) - увеличенная версия
    closeButton.innerHTML = '&times;';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '28px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.color = '#6c757d';
    closeButton.style.width = '40px';
    closeButton.style.height = '40px';
    closeButton.style.borderRadius = '50%';
    closeButton.style.display = 'flex';
    closeButton.style.alignItems = 'center';
    closeButton.style.justifyContent = 'center';
    closeButton.style.transition = 'all 0.2s ease';

    closeButton.addEventListener('mouseenter', function () {
        closeButton.style.backgroundColor = '#e9ecef';
        closeButton.style.color = '#333';
    });

    closeButton.addEventListener('mouseleave', function () {
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.color = '#6c757d';
    });

    // Стили для контента
    modalContent.style.padding = '24px';

    // Стили для информационных блоков
    infoSection.style.marginBottom = '24px';

    const infoItemStyle = {
        padding: '12px 16px',
        marginBottom: '8px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef',
        fontSize: '14px',
        color: '#495057'
    };

    Object.assign(lessonsInfo.style, infoItemStyle);
    Object.assign(gradesInfo.style, infoItemStyle);
    Object.assign(roundingInfo.style, infoItemStyle);

    let roundingMethod = JOURNAL_INFO.isMathRound ? "математический (4,5)" : "лицейский (4,65)"
    let gradesRequired = JOURNAL_INFO.isWeNeed3Grades ? "3" : "5"
    lessonsInfo.innerHTML = `<strong>Количество уроков в триместре:</strong> ${JOURNAL_INFO.countLessons}`;
    gradesInfo.innerHTML = `<strong>Необходимо набрать оценок:</strong> ${gradesRequired}`;
    roundingInfo.innerHTML = `<strong>Выбран метод округления:</strong> ${roundingMethod}`;

    infoSection.appendChild(lessonsInfo);
    infoSection.appendChild(gradesInfo);
    infoSection.appendChild(roundingInfo);

    // Стили для секции настроек
    settingsSection.style.marginBottom = '24px';

    const settingContainerStyle = {
        display: 'flex',
        alignItems: 'center',
        padding: '14px 0',
        borderBottom: '1px solid #f1f3f4'
    };

    Object.assign(setting1Container.style, settingContainerStyle);
    Object.assign(setting2Container.style, settingContainerStyle);
    Object.assign(setting3Container.style, settingContainerStyle);

    // Стили для галочек
    setting1Checkbox.type = 'checkbox';
    setting2Checkbox.type = 'checkbox';
    setting3Checkbox.type = 'checkbox';

    const checkboxStyle = {
        width: '18px',
        height: '18px',
        marginRight: '12px',
        cursor: 'pointer',
        accentColor: '#496be8'
    };

    Object.assign(setting1Checkbox.style, checkboxStyle);
    Object.assign(setting2Checkbox.style, checkboxStyle);
    Object.assign(setting3Checkbox.style, checkboxStyle);

    // Устанавливаем состояния чекбоксов из сохраненных настроек
    setting1Checkbox.checked = currentSettings.colorMode || false;
    setting2Checkbox.checked = currentSettings.highlightMode || false;
    setting3Checkbox.checked = currentSettings.hideAverageMark || true;

    // Стили для текста настроек
    setting1Text.textContent = 'Цветной режим (в разработке...)';
    setting2Text.textContent = 'Подсветка пограничных оценок (в разработке...)';
    setting3Text.textContent = 'Выключать средний балл (работает)' ;

    const textStyle = {
        fontSize: '14px',
        color: '#333',
        cursor: 'pointer',
        fontWeight: '500'
    };

    Object.assign(setting1Text.style, textStyle);
    Object.assign(setting2Text.style, textStyle);
    Object.assign(setting3Text.style, textStyle);

    // Собираем настройки
    setting1Label.style.display = 'flex';
    setting1Label.style.alignItems = 'center';
    setting1Label.style.cursor = 'pointer';
    setting1Label.appendChild(setting1Checkbox);
    setting1Label.appendChild(setting1Text);

    setting2Label.style.display = 'flex';
    setting2Label.style.alignItems = 'center';
    setting2Label.style.cursor = 'pointer';
    setting2Label.appendChild(setting2Checkbox);
    setting2Label.appendChild(setting2Text);

    setting3Label.style.display = 'flex';
    setting3Label.style.alignItems = 'center';
    setting3Label.style.cursor = 'pointer';
    setting3Label.appendChild(setting3Checkbox);
    setting3Label.appendChild(setting3Text);

    setting1Container.appendChild(setting1Label);
    setting2Container.appendChild(setting2Label);
    setting3Container.appendChild(setting3Label);

    settingsSection.appendChild(setting1Container);
    settingsSection.appendChild(setting2Container);
    settingsSection.appendChild(setting3Container);

    // Стили для секции кнопок
    buttonsSection.style.display = 'flex';
    buttonsSection.style.justifyContent = 'flex-end';
    buttonsSection.style.gap = '12px';
    buttonsSection.style.paddingTop = '16px';
    buttonsSection.style.borderTop = '1px solid #e9ecef';

    // Стили для кнопки "Применить"
    applyButton.textContent = 'Применить';
    applyButton.style.padding = '10px 24px';
    applyButton.style.backgroundColor = '#496be8';
    applyButton.style.color = 'white';
    applyButton.style.border = 'none';
    applyButton.style.borderRadius = '6px';
    applyButton.style.cursor = 'pointer';
    applyButton.style.fontSize = '14px';
    applyButton.style.fontWeight = '500';
    applyButton.style.transition = 'all 0.2s ease';

    applyButton.addEventListener('mouseenter', function () {
        applyButton.style.backgroundColor = '#3a5bd0';
        applyButton.style.transform = 'translateY(-1px)';
    });

    applyButton.addEventListener('mouseleave', function () {
        applyButton.style.backgroundColor = '#496be8';
        applyButton.style.transform = 'translateY(0)';
    });

    // Стили для кнопки "Отмена"
    cancelButton.textContent = 'Отмена';
    cancelButton.style.padding = '10px 24px';
    cancelButton.style.backgroundColor = 'white';
    cancelButton.style.color = '#495057';
    cancelButton.style.border = '1px solid #6c757d';
    cancelButton.style.borderRadius = '6px';
    cancelButton.style.cursor = 'pointer';
    cancelButton.style.fontSize = '14px';
    cancelButton.style.fontWeight = '500';
    cancelButton.style.transition = 'all 0.2s ease';

    cancelButton.addEventListener('mouseenter', function () {
        cancelButton.style.backgroundColor = '#f8f9fa';
        cancelButton.style.borderColor = '#495057';
    });

    cancelButton.addEventListener('mouseleave', function () {
        cancelButton.style.backgroundColor = 'white';
        cancelButton.style.borderColor = '#6c757d';
    });

    buttonsSection.appendChild(cancelButton);
    buttonsSection.appendChild(applyButton);

    // Собираем модальное окно
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);

    modalContent.appendChild(infoSection);
    modalContent.appendChild(settingsSection);
    modalContent.appendChild(buttonsSection);

    modalWindow.appendChild(modalHeader);
    modalWindow.appendChild(modalContent);
    modalOverlay.appendChild(modalWindow);

    // Обработчики событий
    closeButton.addEventListener('click', function () {
        document.body.removeChild(modalOverlay);
    });

    cancelButton.addEventListener('click', function () {
        document.body.removeChild(modalOverlay);
    });

    applyButton.addEventListener('click', function () {
        // Сохраняем настройки
        const newSettings = {
            colorMode: setting1Checkbox.checked,
            highlightMode: setting2Checkbox.checked,
            hideAverageMark: setting3Checkbox.checked
        };
        
        saveSettings(newSettings);
        
        // Применяем настройки скрытия среднего балла
        if (newSettings.hideAverageMark) {
            setLocalStorageParam();
        }
        
        console.log('Настройки сохранены:', newSettings);
        document.body.removeChild(modalOverlay);
    });

    // Закрытие по клику на оверлей
    modalOverlay.addEventListener('click', function (event) {
        if (event.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
        }
    });

    // Закрытие по Escape
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            if (document.body.contains(modalOverlay)) {
                document.body.removeChild(modalOverlay);
            }
        }
    });

    // Добавляем модальное окно на страницу
    document.body.appendChild(modalOverlay);
}