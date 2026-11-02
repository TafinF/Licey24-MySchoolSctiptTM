// ============================================================
// ДОПОЛНЕНИЯ: другие userscript сообщают о себе, статус виден во вкладке настроек
// ============================================================

/**
 * Протокол (через события на document, данные строкой JSON: так они проходят из изолированной среды Tampermonkey):
 *   дополнение -> скрипту:  'mscp:addon'          detail = JSON {id, title, status, text, rows:[{label, value}]}
 *                           status: 'ok' | 'warn' | 'error' | 'pending'
 *   скрипт -> дополнению:   'mscp:addons-ready'   (скрипт загрузился, пришлите статус) и
 *                           'mscp:addon-refresh'  detail = id (кнопка «Проверить сейчас»)
 * Скрипт про конкретные дополнения ничего не знает, вкладка «Дополнения» появляется, когда хоть одно прислало статус.
 */

/** @type {Map<string, {id: string, title: string, status: string, text: string, rows: Array<{label: string, value: string}>}>} */
const ADDONS = new Map();

/** Контейнер открытой вкладки «Дополнения» (null, если окно закрыто): при новом статусе он перерисовывается */
let addonsContainer = null;

const ADDON_STATUS_LABEL = { ok: 'Работает', warn: 'Есть замечание', error: 'Ошибка', pending: 'Проверяется' };

/**
 * Принимает статус дополнения. Любые данные чужие: берутся только строки нужной длины
 * @param {CustomEvent} event
 * @returns {void}
 */
function onAddonMessage(event) {
    let data;
    try {
        data = JSON.parse(event.detail);
    } catch (e) {
        return;
    }
    if (!data || typeof data.id !== 'string' || !data.id) return;

    const text = value => String(value ?? '').slice(0, 300);
    ADDONS.set(data.id.slice(0, 40), {
        id: data.id.slice(0, 40),
        title: text(data.title) || data.id,
        status: ADDON_STATUS_LABEL[data.status] ? data.status : 'pending',
        text: text(data.text),
        rows: (Array.isArray(data.rows) ? data.rows : []).slice(0, 12)
            .map(row => ({ label: text(row?.label), value: text(row?.value) }))
    });
    if (addonsContainer?.isConnected) renderAddons(addonsContainer);
}

/**
 * Рисует вкладку «Дополнения»: по секции на каждое дополнение, текст только через textContent
 * @param {HTMLElement} container
 * @returns {void}
 */
function renderAddons(container) {
    const sections = [...ADDONS.values()].map(addon => {
        const status = document.createElement('div');
        status.className = 'mscp-row mscp-row-static';
        const text = document.createElement('span');
        text.className = 'mscp-row-text';
        const title = document.createElement('span');
        title.className = 'mscp-row-title';
        const dot = document.createElement('span');
        dot.className = `mscp-addon-dot mscp-addon-${addon.status}`;
        title.append(dot, ADDON_STATUS_LABEL[addon.status]);
        text.appendChild(title);
        if (addon.text) {
            const desc = document.createElement('span');
            desc.className = 'mscp-row-desc';
            desc.textContent = addon.text;
            text.appendChild(desc);
        }
        const refresh = document.createElement('button');
        refresh.type = 'button';
        refresh.className = 'mscp-btn-action';
        refresh.textContent = 'Проверить сейчас';
        refresh.addEventListener('click', () => {
            refresh.disabled = true;
            document.dispatchEvent(new CustomEvent('mscp:addon-refresh', { detail: addon.id }));
            setTimeout(() => { refresh.disabled = false; }, 2000);
        });
        status.append(text, refresh);

        const rows = addon.rows.map(item => {
            const row = document.createElement('div');
            row.className = 'mscp-row mscp-row-static';
            const label = document.createElement('span');
            label.className = 'mscp-row-title';
            label.textContent = item.label;
            const value = document.createElement('span');
            value.className = 'mscp-row-desc mscp-addon-value';
            value.textContent = item.value;
            row.append(label, value);
            return row;
        });
        return createSection(addon.title, status, ...rows);
    });
    container.replaceChildren(...sections);
}

/**
 * Создаёт вкладку «Дополнения»
 * @returns {HTMLElement} DOM-элемент вкладки
 */
function createAddonsTab() {
    const tab = document.createElement('div');
    addonsContainer = tab;
    renderAddons(tab);
    return tab;
}

document.addEventListener('mscp:addon', onAddonMessage);
// Дополнение могло загрузиться раньше этого скрипта и уже отправить статус: просим прислать ещё раз
document.dispatchEvent(new CustomEvent('mscp:addons-ready'));
