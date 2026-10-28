// ============================================================
// ОЧИСТКА СТРАНИЦЫ: баннер и шапка сайта
// ============================================================

/**
 * Удаляет первый найденный элемент баннера, если на странице присутствуют элементы только одного из указанных классов.
 * Если найдены элементы двух и более разных классов – ничего не делает.
 * Если нет ни одного элемента из указанных классов – ничего не делает.
 * После удаления добавляет CSS-стиль для .MSC8WgFhoGMq0svc { height: calc(100vh - 40px) }.
 *
 * @param {string[]} [classNames=['WC-Banner-content', 'WC-Banner-link']] - Массив имён классов (без точки),
 *        которые проверяются на наличие на странице. По умолчанию – ['WC-Banner-content', 'WC-Banner-link'].
 * @returns {void}
 */
function removeBannerAndSetHeight(classNames = ['WC-Banner-content', 'WC-Banner-link']) {
    // Определяем, какие классы из списка реально присутствуют на странице
    const presentClasses = classNames.filter(className => {
        return document.querySelector(`.${className}`) !== null;
    });

    // Если найдено 0 или 2+ классов – ничего не делаем
    if (presentClasses.length !== 1) {
        return;
    }

    // Единственный класс, элементы которого нужно удалить
    const targetClass = presentClasses[0];

    // Удаляем элемент этого класса
    document.querySelector(`.${targetClass}`).remove();

    // Добавляем стиль для высоты, если его ещё нет
    const styleId = 'mscp-banner-override';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .MSC8WgFhoGMq0svc {
                height: calc(100vh - 40px);
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Удаляет шапку сайта и устанавливает высоту основного контейнера
 * - Удаляет элементы #root > div > div._56grJoiM2euP0m-4_cQJ0
 * - Добавляет CSS-стиль для .MSC8WgFhoGMq0svc { height: 100vh }
 * @returns {void}
 */
function removeHeaderAndSetHeight() {
    removeBannerAndSetHeight();

    // Удаление элемента #root > div > div._56grJoiM2euP0m-4_cQJ0
    let el = document.querySelector('#root > div > div._56grJoiM2euP0m-4_cQJ0');
    el.remove();


    // Установка нужной высоты для класса .MSC8WgFhoGMq0svc
    const style = document.createElement('style');
    style.id = 'mscp-header-override';

    // Проверяем, не добавлен ли уже стиль
    if (!document.getElementById('mscp-header-override')) {
        style.textContent = `
            .MSC8WgFhoGMq0svc {
                height: calc(100vh);
            }
        `;
        document.head.appendChild(style);
    }
}
