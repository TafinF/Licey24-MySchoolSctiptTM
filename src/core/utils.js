// ============================================================
// УТИЛИТЫ
// ============================================================

/**
 * Объект с вспомогательными методами
 */
const Utils = {
    /**
     * Ожидает появления элемента на странице
     * @param {string} selector - CSS-селектор элемента
     * @param {Function} callback - функция, вызываемая при обнаружении элемента
     * @param {number} [interval=1000] - интервал проверки в мс
     * @returns {void}
     */
    waitForElement(selector, callback, interval = 1000) {
        const element = document.querySelector(selector);
        if (element) {
            callback(element);
        } else {
            setTimeout(() => this.waitForElement(selector, callback, interval), interval);
        }
    },

    /**
     * Ждёт, пока функция проверки вернёт истинное значение
     * @param {Function} check - функция проверки, возвращает найденное значение или null
     * @param {number} [timeout=10000] - сколько ждать в мс
     * @param {number} [interval=50] - интервал проверки в мс
     * @returns {Promise<*>} Значение, которое вернула check
     */
    waitUntil(check, timeout = 10000, interval = 50) {
        return new Promise((resolve, reject) => {
            const startedAt = Date.now();
            const tick = () => {
                const value = check();
                if (value) return resolve(value);
                if (Date.now() - startedAt > timeout) return reject(new Error('Превышено время ожидания'));
                setTimeout(tick, interval);
            };
            tick();
        });
    },

    /**
     * Удаляет все CSS-классы окрашивания с элементов в контейнере
     * @param {HTMLElement} container - контейнер для очистки
     * @returns {void}
     */
    clearColoring(container) {
        const coloredElements = container.querySelectorAll('[class*="mscp-"]');

        coloredElements.forEach(element => {
            const classesToRemove = [...element.classList].filter(
                className => className.startsWith(CONFIG.CLASS_PREFIX + '-')
            );

            if (classesToRemove.length > 0) {
                element.classList.remove(...classesToRemove);
            }

            element.style.removeProperty('background');
        });
    },

    /**
     * Парсит строку с оценкой в число
     * @param {string} text - строка с оценкой (например, "4,5")
     * @returns {number} Числовое значение оценки
     */
    parseGrade(text) {
        return parseFloat(text.replace(',', '.'));
    },

    /**
     * Проверяет, имеет ли ячейка атрибут data-test-component с определённым значением
     * @param {HTMLElement} cell - ячейка для проверки
     * @param {string} value - значение для поиска в атрибуте
     * @returns {boolean} true, если атрибут содержит значение
     */
    hasTestAttribute(cell, value) {
        const attr = cell.getAttribute('data-test-component');
        return attr && attr.includes(value);
    }
};

/**
 * Ищет класс в названии журнала или карточки урока: "7-А", "10-М" или "7 НДО".
 * Названия бывают с учителем и повтором класса: "Физика 7 НДО Дятлов Игорь Семенович 7 НДО".
 * @param {string} text - название журнала или карточки
 * @returns {{index: number, length: number, name: string}|null} позиция в тексте и нормализованное имя класса
 */
function findJournalClass(text) {
    const match = /(\d{1,2}\s*-\s*[А-ЯЁA-Z]|\d{1,2}\s+НДО)(?=\s|$)/iu.exec(text);
    if (!match) return null;

    return {
        index: match.index,
        length: match[0].length,
        name: match[1].replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ')
    };
}
