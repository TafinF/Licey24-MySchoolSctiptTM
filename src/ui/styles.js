// ============================================================
// СТИЛИ
// ============================================================

/**
 * Создаёт и добавляет все CSS-стили для скрипта
 * Включает стили для:
 * - Окрашивания оценок (градиенты, сплошные цвета)
 * - Tooltip (динамический, поверх всех элементов)
 * - Кнопок управления
 * - Модального окна настроек
 * @returns {void}
 */
function createStyles() {
    if (document.getElementById('mscp-styles')) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'mscp-styles';
    styleEl.textContent = `
        /* =============================================
           CSS-КЛАССЫ ДЛЯ ОКРАШИВАНИЯ ОЦЕНОК
           ============================================= */

        /* Обычные ячейки с оценками - градиентная заливка */
        .mscp-grade-5 {
            background: linear-gradient(225deg, transparent, ${COLORS.GREEN} 70%);
        }
        .mscp-grade-4 {
            background: linear-gradient(225deg, transparent, ${COLORS.BLUE} 70%);
        }
        .mscp-grade-3 {
            background: linear-gradient(225deg, transparent, ${COLORS.YELLOW} 70%);
        }
        .mscp-grade-2 {
            background: linear-gradient(225deg, transparent, ${COLORS.RED} 70%);
        }

        /* Цепочка двоек - ярко-красная заливка */
        .mscp-grade-bad {
            background: radial-gradient(circle at right top, white 30%, rgb(255, 0, 0) 70%);
        }

        /* Итоговые оценки - сплошной цвет */
        .mscp-final-5 {
            background-color: ${COLORS.GREEN} !important;
        }
        .mscp-final-4 {
            background-color: ${COLORS.BLUE} !important;
        }
        .mscp-final-3 {
            background-color: ${COLORS.YELLOW} !important;
        }
        .mscp-final-2 {
            background-color: ${COLORS.RED} !important;
        }

        /* Недостаточно оценок - красная полоса снизу */
        .mscp-insufficient {
            background: linear-gradient(180deg, transparent 70%, ${COLORS.RED});
        }

        /* Средний балл */
        .mscp-average-5 {
            background-color: ${COLORS.GREEN};
        }
        .mscp-average-4 {
            background-color: ${COLORS.BLUE};
        }
        .mscp-average-3 {
            background-color: ${COLORS.YELLOW};
        }
        .mscp-average-2 {
            background-color: ${COLORS.RED};
        }

        /* Прогресс-бар */
        .mscp-progress {
            /* Динамический градиент задаётся через inline-стиль */
        }

        /* Маркер для ячеек "почти достиг" */
        .mscp-average-almost {
            /* Градиент задаётся через inline-стиль */
        }

        /* Ячейка с tooltip */
        .mscp-tooltip-trigger {
            cursor: help;
        }

        /* =============================================
           ДИНАМИЧЕСКИЙ TOOLTIP (поверх всех элементов)
           ============================================= */

        .mscp-tooltip-dynamic {
            position: fixed;
            padding: 8px 12px;
            background: white;
            color: #333;
            font-size: 13px;
            font-weight: normal;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
            z-index: 99999;
            white-space: nowrap;
            pointer-events: none;
            transform: translate(-50%, -100%);
            border: 1px solid rgba(0, 0, 0, 0.08);
        }

        /* Стрелочка tooltip (сверху) */
        .mscp-tooltip-dynamic::after {
            content: '';
            position: absolute;
            bottom: -7px;
            left: 50%;
            transform: translateX(-50%);
            border: 7px solid transparent;
            border-top-color: white;
        }

        /* Стрелочка tooltip (снизу) */
        .mscp-tooltip-dynamic.mscp-tooltip-below {
            transform: translate(-50%, 0);
        }

        .mscp-tooltip-dynamic.mscp-tooltip-below::after {
            bottom: auto;
            top: -14px;
            border-top-color: transparent;
            border-bottom-color: white;
        }

        /* Цветные badge для оценок в tooltip */
        .mscp-grade-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 18px;
            height: 18px;
            padding: 0 5px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 700;
            margin: 0 1px;
            vertical-align: middle;
        }

        .mscp-grade-badge.mscp-badge-5 {
            background-color: ${COLORS.GREEN};
            color: #0d3d0d;
        }

        .mscp-grade-badge.mscp-badge-4 {
            background-color: ${COLORS.BLUE};
            color: #0d2d4d;
        }

        .mscp-grade-badge.mscp-badge-3 {
            background-color: ${COLORS.YELLOW};
            color: #4d4d0d;
        }

        .mscp-grade-badge.mscp-badge-2 {
            background-color: ${COLORS.RED};
            color: #4d0d0d;
        }

        /* =============================================
           СТИЛИ КНОПОК
           ============================================= */

        .mscp-button {
            line-height: 0;
            padding: 8px;
            border-color: #d6d6df;
            border-style: solid;
            border-width: 1px;
            color: #686A71;
            background: white;
            cursor: pointer;
            transition: background 0.2s ease;
            border-radius: 8px;
        }
        .mscp-button:hover {
            background: #ececec;
        }

        /* =============================================
           СТИЛИ ОКНА НАСТРОЕК
           ============================================= */

        .mscp-modal-overlay {
            position: fixed;
            inset: 0;
            background-color: rgba(15, 23, 42, 0.55);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
        }
        .mscp-modal-window {
            display: flex;
            flex-direction: column;
            width: 720px;
            max-width: calc(100vw - 32px);
            max-height: calc(100vh - 48px);
            background-color: white;
            border-radius: 14px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            color: #1f2937;
        }
        /* С вкладками высота постоянная, чтобы окно не прыгало при переключении */
        .mscp-modal-window.mscp-has-nav {
            height: min(580px, calc(100vh - 48px));
        }
        .mscp-modal-header {
            flex: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 18px 14px 24px;
            border-bottom: 1px solid #e5e7eb;
        }
        .mscp-modal-title {
            margin: 0;
            font-size: 17px;
            font-weight: 600;
            color: #111827;
        }
        .mscp-modal-version {
            margin-left: 10px;
            font-size: 12px;
            font-weight: 400;
            color: #9ca3af;
        }
        .mscp-close-btn {
            background: none;
            border: none;
            font-size: 26px;
            line-height: 1;
            cursor: pointer;
            color: #6b7280;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s ease;
        }
        .mscp-close-btn:hover {
            background-color: #eef0f4;
            color: #111827;
        }

        .mscp-modal-body {
            flex: 1;
            display: flex;
            min-height: 0;
        }
        .mscp-modal-nav {
            flex: none;
            width: 180px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 2px;
            background-color: #f8f9fb;
            border-right: 1px solid #e5e7eb;
        }
        .mscp-modal-nav[hidden] {
            display: none;
        }
        .mscp-nav-item {
            text-align: left;
            padding: 9px 12px;
            border: none;
            border-radius: 8px;
            background: none;
            font: inherit;
            font-size: 14px;
            color: #4b5563;
            cursor: pointer;
        }
        .mscp-nav-item:hover {
            background-color: #eef0f4;
        }
        .mscp-nav-item.mscp-active {
            background-color: #e4e9fc;
            color: #2f4bc4;
            font-weight: 600;
        }
        .mscp-modal-content {
            flex: 1;
            min-width: 0;
            overflow-y: auto;
            padding: 20px 24px 8px;
        }

        .mscp-section {
            margin-bottom: 22px;
        }
        .mscp-section-title {
            margin: 0 0 4px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: #6b7280;
        }

        /* Строка настройки: название и пояснение слева, тумблер или кнопка справа */
        .mscp-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 10px 0;
            border-bottom: 1px solid #f0f1f4;
            cursor: pointer;
        }
        .mscp-row:last-child {
            border-bottom: none;
        }
        .mscp-row-static {
            cursor: default;
        }
        .mscp-row-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
        }
        .mscp-row-title {
            font-size: 14px;
            color: #1f2937;
        }
        .mscp-row-desc {
            font-size: 12px;
            line-height: 1.35;
            color: #6b7280;
        }

        .mscp-switch {
            position: relative;
            flex: none;
            width: 38px;
            height: 22px;
        }
        .mscp-switch input {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            opacity: 0;
            cursor: pointer;
            z-index: 1;
        }
        .mscp-switch-track {
            position: absolute;
            inset: 0;
            border-radius: 11px;
            background-color: #cbd0d9;
            transition: background-color 0.2s ease;
        }
        .mscp-switch-track::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background-color: white;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
            transition: transform 0.2s ease;
        }
        .mscp-switch input:checked + .mscp-switch-track {
            background-color: #496be8;
        }
        .mscp-switch input:checked + .mscp-switch-track::after {
            transform: translateX(16px);
        }
        .mscp-switch input:focus-visible + .mscp-switch-track {
            outline: 2px solid #9db0f5;
            outline-offset: 2px;
        }

        /* Сведения о журнале */
        .mscp-stats {
            display: flex;
            gap: 10px;
            margin-bottom: 22px;
        }
        .mscp-stat {
            flex: 1;
            padding: 10px 12px;
            background-color: #f8f9fb;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
        }
        .mscp-stat b {
            display: block;
            font-size: 18px;
            font-weight: 600;
            color: #111827;
        }
        .mscp-stat span {
            font-size: 12px;
            color: #6b7280;
        }

        .mscp-btn-action {
            flex: none;
            padding: 7px 16px;
            background-color: white;
            color: #374151;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            cursor: pointer;
            font: inherit;
            font-size: 13px;
            font-weight: 500;
            transition: background-color 0.2s ease;
        }
        .mscp-btn-action:hover:not(:disabled) {
            background-color: #f3f4f6;
        }
        .mscp-btn-action:disabled {
            color: #9ca3af;
            cursor: default;
        }

        /* Карточки выбора вида расписания */
        .mscp-options {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-top: 8px;
        }
        .mscp-option {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 10px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            cursor: pointer;
            transition: border-color 0.2s ease, background-color 0.2s ease;
        }
        .mscp-option:hover {
            border-color: #c7d0f5;
        }
        .mscp-option:has(input:checked) {
            border-color: #496be8;
            background-color: #f5f7ff;
        }
        .mscp-option input {
            position: absolute;
            opacity: 0;
            inset: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            cursor: pointer;
        }
        .mscp-thumb {
            width: 100%;
            height: auto;
            margin-bottom: 4px;
            background-color: #f3f4f6;
            border-radius: 8px;
        }
        .mscp-option-title {
            font-size: 14px;
            font-weight: 600;
            color: #111827;
        }

        /* Параметры заменённого расписания */
        .mscp-subpanel {
            margin-top: 16px;
            padding: 2px 16px 10px;
            background-color: #f8f9fb;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
        }
        .mscp-subpanel[hidden] {
            display: none;
        }
        .mscp-subpanel .mscp-row {
            border-bottom-color: #e9ebf0;
        }
        .mscp-hint {
            padding-top: 8px;
        }

        /* Переключатель из нескольких кнопок */
        .mscp-seg {
            flex: none;
            display: inline-flex;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            overflow: hidden;
            background-color: white;
        }
        .mscp-seg label {
            position: relative;
            padding: 6px 12px;
            font-size: 13px;
            color: #374151;
            cursor: pointer;
            white-space: nowrap;
        }
        .mscp-seg label + label {
            border-left: 1px solid #d1d5db;
        }
        .mscp-seg label:has(input:checked) {
            background-color: #496be8;
            color: white;
        }
        .mscp-seg input {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            opacity: 0;
            cursor: pointer;
        }

        @media (max-width: 600px) {
            .mscp-modal-body {
                flex-direction: column;
            }
            .mscp-modal-nav {
                width: auto;
                flex-direction: row;
                border-right: none;
                border-bottom: 1px solid #e5e7eb;
            }
            .mscp-options {
                grid-template-columns: 1fr;
            }
        }
    `;
    document.head.appendChild(styleEl);
}
