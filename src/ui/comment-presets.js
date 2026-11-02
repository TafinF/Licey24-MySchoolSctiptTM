// ============================================================
// БЫСТРЫЕ КОММЕНТАРИИ В КАРТОЧКЕ ОЦЕНКИ
// ============================================================

/**
 * Записывает текст в textarea так, чтобы React увидел изменение
 * @param {HTMLTextAreaElement} textarea - поле комментария
 * @param {string} text - новый текст
 * @returns {void}
 */
function setTextareaValue(textarea, text) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(textarea, text);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Достаёт из настроек список быстрых комментариев: только непустые строки
 * @param {Object} settings - настройки
 * @returns {string[]} Список комментариев
 */
function getCommentPresets(settings) {
    if (!Array.isArray(settings.commentPresets)) return [];
    return settings.commentPresets
        .filter(text => typeof text === 'string')
        .map(text => text.trim())
        .filter(Boolean);
}

/**
 * Сохраняет оценку в открытой карточке, если кнопка "Сохранить" уже доступна
 * Она недоступна, пока в карточке не выбрана оценка, — тогда ничего не происходит
 * @param {HTMLTextAreaElement} textarea - поле комментария этой карточки
 * @returns {void}
 */
function saveFastCard(textarea) {
    const popup = textarea.closest('[data-test-component$="-FastPopup"]');
    const saveButton = popup?.querySelector('[data-test-component="FastSave"]');
    if (saveButton && !saveButton.disabled) saveButton.click();
}

/**
 * Добавляет кнопки быстрых комментариев под поле комментария в карточке оценки
 * Повторный вызов для того же поля ничего не делает
 * Если своих комментариев нет, кнопок нет
 * @param {HTMLTextAreaElement} textarea - поле комментария
 * @returns {void}
 */
function addCommentButtons(textarea) {
    const container = textarea.closest('[data-test-component$="InputSharedContainerInTextAreaComponent"]');
    if (!container || container.dataset.mscpPresets) return;
    container.dataset.mscpPresets = '1';

    const presets = getCommentPresets(loadSettings());
    if (!presets.length) return;

    if (!document.getElementById('mscp-comment-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'mscp-comment-styles';
        styleEl.textContent = `
            .mscp-comment-presets {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-top: 8px;
            }
            .mscp-comment-presets button {
                padding: 4px 10px;
                border: 1px solid #c9ced6;
                border-radius: 6px;
                background: #fff;
                font-size: 12px;
                cursor: pointer;
            }
            .mscp-comment-presets button:hover {
                background: #eef2ff;
            }
        `;
        document.head.appendChild(styleEl);
    }

    const panel = document.createElement('div');
    panel.className = 'mscp-comment-presets';
    presets.forEach(text => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.addEventListener('click', () => {
            setTextareaValue(textarea, text);
            textarea.focus();
            // Настройку читаем в момент нажатия, чтобы она действовала без перезагрузки
            if (loadSettings().commentFinishWithButton) {
                setTimeout(() => saveFastCard(textarea), 0);
            }
        });
        panel.appendChild(button);
    });
    container.after(panel);
}

/**
 * Следит за появлением карточки выставления оценки и добавляет в неё кнопки комментариев
 * Карточка создаётся заново при каждом клике по ячейке журнала
 * @returns {void}
 */
function initCommentPresets() {
    const observer = new MutationObserver(() => {
        document.querySelectorAll('textarea[name="comment"][data-test-component^="markFastCard"]')
            .forEach(addCommentButtons);
    });
    observer.observe(document.body, { childList: true, subtree: true });
}
