// ============================================================
// МОДАЛЬНОЕ ОКНО: кнопки и показ
// ============================================================

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
        // Скрытые на этой странице настройки сохраняют прежнее значение
        const newSettings = loadSettings();
        settingsSection.querySelectorAll('.mscp-checkbox').forEach(checkbox => {
            newSettings[checkbox.dataset.key] = checkbox.checked;
        });

        settingsSection.querySelectorAll('.mscp-radio:checked').forEach(radio => {
            newSettings[radio.dataset.key] = radio.value;
        });

        saveSettings(newSettings);

        if (isTargetUrl(window.location.href)) {
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
            processJournalTable(true);
        }

        // Вид расписания меняется сразу
        syncScheduleLayout(window.location.href);

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
