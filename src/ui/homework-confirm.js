// ============================================================
// ВЫДАЧА ДЗ НА САЙТЕ: диалоги подтверждения
// ============================================================

/**
 * Диалоги подтверждения при выдаче домашнего задания
 * - selector: кнопка "Подтвердить" диалога
 * - setting: настройка, включающая автоподтверждение
 */
const HOMEWORK_CONFIRM_DIALOGS = [
    {
        /** "Изменение состава учащихся" при выборе "Выборочно" */
        selector: '[data-test-component="LIHomeworkAlertConfirm-confirm"]',
        setting: 'homeworkAutoConfirm'
    },
    {
        /** "Выдача домашнего задания ученикам" после кнопки "Выдать задание" */
        selector: '[data-test-component="HTManagerFooterAlertConfirmAddingHomeTask-confirm"]',
        setting: 'homeworkAutoIssue'
    }
];

/**
 * Обрабатывает появившийся диалог подтверждения
 * - Поднимает диалог над остальными окнами (поповер "Выбор учащихся" иначе перекрывает его)
 * - Если включена настройка, сам нажимает "Подтвердить"
 * Каждый диалог обрабатывается один раз
 * @param {HTMLButtonElement} confirmButton - кнопка "Подтвердить"
 * @param {string} setting - ключ настройки автоподтверждения
 * @returns {void}
 */
function handleHomeworkConfirm(confirmButton, setting) {
    if (confirmButton.dataset.mscpHandled) return;
    confirmButton.dataset.mscpHandled = '1';

    // Диалог лежит прямо в body отдельным контейнером со своим z-index
    let wrapper = confirmButton;
    while (wrapper.parentElement && wrapper.parentElement !== document.body) {
        wrapper = wrapper.parentElement;
    }
    wrapper.style.zIndex = '2000';

    if (loadSettings()[setting]) {
        setTimeout(() => {
            if (confirmButton.isConnected && !confirmButton.disabled) confirmButton.click();
        }, 0);
    }
}

/** Кнопка "Открыть описание" в окне прикрепления материалов к домашнему заданию */
const HOMEWORK_OPEN_DESCRIPTION_SELECTOR = '[data-test-component="Footer.homework_creation"]';

/**
 * Нажимает "Открыть описание" в окне прикрепления материалов, если включена настройка
 * Каждая кнопка нажимается один раз
 * @param {HTMLButtonElement} button - кнопка "Открыть описание"
 * @returns {void}
 */
function handleHomeworkDescription(button) {
    if (button.dataset.mscpHandled) return;
    button.dataset.mscpHandled = '1';

    if (loadSettings().homeworkAutoDescription) {
        setTimeout(() => {
            if (button.isConnected && !button.disabled) button.click();
        }, 0);
    }
}

/**
 * Следит за появлением диалогов и окна материалов при выдаче домашнего задания
 * @returns {void}
 */
function initHomeworkConfirm() {
    const observer = new MutationObserver(() => {
        const descriptionButton = document.querySelector(HOMEWORK_OPEN_DESCRIPTION_SELECTOR);
        if (descriptionButton) handleHomeworkDescription(descriptionButton);

        HOMEWORK_CONFIRM_DIALOGS.forEach(({ selector, setting }) => {
            const button = document.querySelector(selector);
            if (button) handleHomeworkConfirm(button, setting);
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
}
