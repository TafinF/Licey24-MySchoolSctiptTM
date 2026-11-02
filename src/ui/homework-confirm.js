// ============================================================
// ВЫДАЧА ДЗ НА САЙТЕ: диалог "Изменение состава учащихся"
// ============================================================

/** Кнопка "Подтвердить" в диалоге изменения состава учащихся */
const HOMEWORK_CONFIRM_SELECTOR = '[data-test-component="LIHomeworkAlertConfirm-confirm"]';

/**
 * Обрабатывает появившийся диалог "Изменение состава учащихся"
 * - Поднимает диалог над поповером "Выбор учащихся", иначе он оказывается под ним
 * - Если включена настройка, сам нажимает "Подтвердить"
 * Каждый диалог обрабатывается один раз
 * @param {HTMLButtonElement} confirmButton - кнопка "Подтвердить"
 * @returns {void}
 */
function handleHomeworkConfirm(confirmButton) {
    if (confirmButton.dataset.mscpHandled) return;
    confirmButton.dataset.mscpHandled = '1';

    // Диалог лежит прямо в body отдельным контейнером со своим z-index
    let wrapper = confirmButton;
    while (wrapper.parentElement && wrapper.parentElement !== document.body) {
        wrapper = wrapper.parentElement;
    }
    wrapper.style.zIndex = '2000';

    if (loadSettings().homeworkAutoConfirm) {
        setTimeout(() => {
            if (confirmButton.isConnected && !confirmButton.disabled) confirmButton.click();
        }, 0);
    }
}

/**
 * Следит за появлением диалога подтверждения при выдаче домашнего задания
 * @returns {void}
 */
function initHomeworkConfirm() {
    const observer = new MutationObserver(() => {
        const button = document.querySelector(HOMEWORK_CONFIRM_SELECTOR);
        if (button) handleHomeworkConfirm(button);
    });
    observer.observe(document.body, { childList: true, subtree: true });
}
