"""Снимает скриншоты для docs/INSTRUCTION.md.

Что делает:
- открывает настоящий script.js в Chrome (Playwright) на странице-макете, которая подменяет ответы сайта
  authedu.mosreg.ru: журнал и расписание строятся из выдуманных данных, запросы к API отвечают заглушки;
- в сеть ничего не уходит, реальные ученики и журналы не затрагиваются;
- сохраняет PNG без сжатия в docs/screens/.

Запуск (нужны Chrome и playwright):  python tools/screenshots/shoot.py
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "screens"
SCRIPT = ROOT / "script.js"
HOST = "https://authedu.mosreg.ru"
JOURNAL_URL = f"{HOST}/teacher/study-process/journal/my/1001"
SCHEDULE_URL = f"{HOST}/teacher/account/schedule"

# ---------------------------------------------------------------- выдуманные данные
STUDENTS = [
    # фамилия имя, оценки по урокам ('.' — пусто), итог за период
    ("Абрикосов Аркадий", "5.54.55.45.5.54.5.", "5"),
    ("Белкина Ася", "4.4.54.4.4.5.4.4.5", ""),
    ("Ветров Виктор", "3.2.2.2.3.2.2.2....", ""),
    ("Гусева Галина", "..5.....4.........", ""),
    ("Дроздов Денис", "4.3.4.3.4.3.4.3...", ""),
    ("Ежова Елена", "5.5.5.4.5.5.5.4.5.", "5"),
    ("Жуков Женя", "3.3.4.3.3.4.3.3.4.", "3"),
    ("Зайцева Зоя", "4.4.4.5.4.4.4.4.5.", "4"),
    ("Исаев Игорь", "5.4.5.5.4.5.4.5.5.", "5"),
    ("Кротова Клара", "4.5.4.5.4.5.4.5.4.", ""),
    ("Лисицын Лев", "2.3.2.3.2.3.4.3....", ""),
    ("Маслова Мила", "5.5.5.5.5.5.5.5.5.", "5"),
]
LESSONS = 18
FORMS = ["КомбР"] * LESSONS
for index, form in {3: "Устн", 6: "Опрос", 9: "ЛР", 12: "Докл", 15: "РЗ"}.items():
    FORMS[index] = form
DAYS = ["2", "4", "9", "11", "16", "18", "23", "25", "30", "2", "7", "9", "14", "16", "21", "23", "28", "30"]
TODAY = date.today()
PAST = [2026, 9, 9]  # дата «прошлого урока» для плашки


def lesson_date(i):
    return f"{int(DAYS[i]):02d}.{'09' if i < 9 else '10'}.2026"


def average(marks):
    values = [int(ch) for ch in marks if ch.isdigit()]
    return f"{sum(values) / len(values):.2f}".replace(".", ",") if values else ""


def journal_html():
    head_days = "".join(
        f'<th><div data-test-component="scheduleLessonCell-{2000 + i}-HOMEWORK"><span class="d">{day}</span></div></th>'
        for i, day in enumerate(DAYS))
    head_forms = "".join(
        f'<th><div data-test-component="controlFormContentHeadCell-{2000 + i}_561445"><span>{form}</span></div></th>'
        for i, form in enumerate(FORMS))
    rows = []
    for number, (name, marks, final) in enumerate(STUDENTS, 1):
        cells = []
        for i, ch in enumerate(marks[:LESSONS]):
            inner = f"<span>{ch}</span>" if ch.isdigit() else ""
            cells.append(f'<td><div data-test-component="markCell-{number}_{2000 + i}_561445">{inner}</div></td>')
        final_inner = f"<span>{final}</span>" if final else ""
        cells.append(f'<td><div data-test-component="markCell-{number}_finalResult_1">{final_inner}</div></td>')
        cells.append(f'<td><div data-test-component="markCell-{number}_average"><span>{average(marks)}</span></div></td>')
        rows.append(f'<tr><td class="n">{number}&nbsp; {name}</td>{"".join(cells)}</tr>')
    return PAGE.format(
        title="Журнал Физика 8-А 8 кл. нем.яз. 26/27",
        extra_head="""<style>
        table{border-collapse:collapse;font-size:12px;background:#fff}
        td,th{border:1px solid #e3e6ec;padding:0;height:26px;min-width:30px;text-align:center}
        td.n{text-align:left;padding:0 8px;min-width:190px;white-space:nowrap}
        td div,th div{min-height:26px;line-height:26px}
        th div.fh span{font-size:10px}
        .d{font-weight:600} thead th{background:#f6f7fa;color:#555}
        </style>""",
        body=f"""<table><thead>
          <tr><th class="n" style="text-align:left;padding:0 8px">Список учащихся</th>
              <th colspan="{LESSONS}" style="letter-spacing:.1em">СЕНТЯБРЬ – ОКТЯБРЬ</th><th>Итог</th><th>Ср.</th></tr>
          <tr><th></th>{head_days}<th></th><th></th></tr>
          <tr><th></th>{head_forms}<th></th><th></th></tr>
        </thead><tbody>{"".join(rows)}</tbody></table>""")


def schedule_html():
    return PAGE.format(
        title="Расписание уроков",
        extra_head="<style>.sw{display:flex;align-items:center;gap:8px}.sw button{padding:6px 10px}</style>",
        body="""<header><div class="hdr" style="display:flex;justify-content:space-between">
          <div class="sw"><div><button data-test-component="scheduleHeaderPrevWeek">‹</button></div>
          <span data-test-component="scheduleHeaderPopperDateLeftOn">02 - 08 ноября 2026 года</span><button>›</button></div>
          <div></div></div></header>
          <p style="color:#888;margin-top:60px">Здесь сайт показывает сетку недели. В макете она не нужна: снимается окно «Уроки дня».</p>""")


PAGE = """<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>{title}</title>
<style>
body{{margin:0;font-family:system-ui,"Segoe UI",Arial,sans-serif;background:#f1f3f7;color:#1f2937}}
.app{{padding:14px 18px}}
main>div.top{{display:flex;align-items:center;gap:12px;margin-bottom:12px}}
h6{{margin:0;font-size:18px;font-weight:600}}
[data-test-component="undefined-subheaderTitle-titleContainer"]{{display:flex;align-items:center;gap:8px}}
.mark{{position:fixed;left:0;right:0;bottom:6px;text-align:center;font-size:11px;color:#9aa1ad}}
</style>{extra_head}</head><body><div class="app"><main>
<div class="top"><div data-test-component="undefined-subheaderTitle-titleContainer"><h6>{title}</h6></div></div>
{body}</main></div><div class="mark">Макет страницы с вымышленными данными (не настоящий журнал)</div></body></html>"""


# ---------------------------------------------------------------- заглушки API
GROUP_ID = 1001
STUDENT_IDS = list(range(1, 13))


def api(path, query):
    if path.endswith("/plan/teacher/v1/groups"):
        return [{"id": GROUP_ID, "subject_id": 77, "subject_name": "Физика", "class_unit_name": "8-А", "student_ids": STUDENT_IDS},
                {"id": 1002, "subject_id": 77, "subject_name": "Физика", "class_unit_name": "9-Б", "student_ids": STUDENT_IDS},
                {"id": 1003, "subject_id": 77, "subject_name": "Физика", "class_unit_name": "10-В", "student_ids": STUDENT_IDS}]
    if path.endswith("/plan/teacher/v1/schedule_items"):
        if "ids" in query:  # дата урока для плашки в карточке
            return [{"id": int(query["ids"][0]), "date": PAST}]
        if "group_ids" in query:  # ближайшие уроки групп (срок сдачи)
            nxt = TODAY.toordinal() + 2
            d = date.fromordinal(nxt)
            return [{"id": 9000 + g, "group_id": g, "date": [d.year, d.month, d.day]} for g in (1001, 1002, 1003)]
        return [  # уроки дня
            {"id": 3001, "group_id": 1001, "time": [8, 30], "class_unit_name": "8-А", "subject_name": "Физика", "homeworks_to_give": []},
            {"id": 3002, "group_id": 1002, "time": [10, 30], "class_unit_name": "9-Б", "subject_name": "Физика",
             "homeworks_to_give": [{"id": 51}]},
            {"id": 3003, "group_id": 1003, "time": [12, 30], "class_unit_name": "10-В", "subject_name": "Физика", "homeworks_to_give": []},
        ]
    if path.endswith("/core/teacher/v1/student_profiles"):
        return [{"id": i, "short_name": name} for i, (name, _, _) in enumerate(STUDENTS, 1)]
    if path.endswith("/core/teacher/v1/marks"):
        return [{"student_profile_id": number, "date": lesson_date(i), "schedule_lesson_id": 2000 + i}
                for number, (_, marks, _) in enumerate(STUDENTS, 1) for i, ch in enumerate(marks) if ch.isdigit()]
    if path.endswith("/core/teacher/v1/homeworks"):
        return [{"id": 51, "homework_entries": [{"description": "§ 14, упр. 3"}]}]
    return []


def route_handler(route):
    request = route.request
    url = request.url
    path = re.sub(r"^https://authedu\.mosreg\.ru", "", url).split("?")[0]
    if path.startswith("/api/ej"):
        query = dict((k, v) for k, v in __import__("urllib.parse", fromlist=["parse_qs"]).parse_qs(url.split("?", 1)[1]).items()) \
            if "?" in url else {}
        route.fulfill(status=200, content_type="application/json", body=json.dumps(api(path, query)))
    elif path.startswith("/teacher/study-process/journal/"):
        route.fulfill(status=200, content_type="text/html; charset=utf-8", body=journal_html())
    elif path.startswith("/teacher/account/schedule"):
        route.fulfill(status=200, content_type="text/html; charset=utf-8", body=schedule_html())
    else:
        route.fulfill(status=404, body="")


# ---------------------------------------------------------------- карточки оценки (подмена окон сайта)
FAST_CARD = """
<div class="fake-card" data-test-component="markCellAlteration-5_2003_561445-FastPopup"
     style="position:fixed;left:520px;top:150px;width:300px;background:#fff;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.25);font-size:13px;z-index:50">
 <div style="padding:14px">
  <div style="font-weight:600;margin-bottom:8px">Дроздов Денис</div>
  <div data-test-component="FastSelectControlForm-selectSingleWrapper" style="border:1px solid #ccd;border-radius:6px;padding:7px 10px;margin-bottom:10px">{form}</div>
  <div style="color:#666;margin-bottom:4px">Отметка</div>
  <div style="display:flex;gap:6px;margin-bottom:10px">
    <button data-test-component="FastMarkCard-SimpleMark-5">5</button><button data-test-component="FastMarkCard-SimpleMark-4">4</button>
    <button data-test-component="FastMarkCard-SimpleMark-3">3</button><button data-test-component="FastMarkCard-SimpleMark-2">2</button></div>
  <div data-test-component="markFastCardCommentAreaInput-InputSharedContainerInTextAreaComponent">
   <div><textarea rows="3" name="comment" data-test-component="markFastCardCommentAreaInput-TextAreaTemplateInLmTextAreaComponent-TextareaAutosize"
     placeholder="Комментарий к отметке..." style="width:100%;box-sizing:border-box;border:1px solid #ccd;border-radius:6px;padding:6px"></textarea></div></div>
  <footer style="margin-top:12px"><button data-test-component="FastSave" disabled style="width:100%;padding:8px">Сохранить</button></footer>
 </div></div>"""

ADVANCED_CARD = """
<div class="fake-card" data-test-component="markCellAlteration-5_2003_561445-AdvancedSidePage-sidePage"
     style="position:fixed;right:0;top:0;bottom:0;width:380px;background:#fff;box-shadow:-6px 0 30px rgba(0,0,0,.25);font-size:13px;z-index:50">
 <div>
  <div style="padding:16px;font-size:16px;font-weight:600;border-bottom:1px solid #e5e7eb">Дроздов Денис на 09.09.2026</div>
  <div style="padding:16px">
   <div style="color:#666;margin-bottom:4px">Отметка за</div>
   <div data-test-component="AdvancedtSelectControlForm-selectSingleWrapper" style="border:1px solid #ccd;border-radius:6px;padding:8px 10px;margin-bottom:12px">Устный ответ</div>
   <div style="display:flex;gap:6px;margin-bottom:12px"><button>5</button><button>4</button><button>3</button><button>2</button></div>
   <div style="color:#666;margin-bottom:4px">Комментарий к отметке</div>
   <div data-test-component="AdvancedMarkCard-InputSharedContainerInTextAreaComponent"><div>
    <textarea rows="3" name="comment" data-test-component="AdvancedMarkCard-TextAreaTemplateInLmTextAreaComponent-TextareaAutosize"
      placeholder="Введите комментарий к отметке..." style="width:100%;box-sizing:border-box;border:1px solid #ccd;border-radius:6px;padding:6px"></textarea></div></div>
  </div>
  <footer style="position:absolute;bottom:0;left:0;right:0;padding:14px;display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #e5e7eb">
   <button>Отмена</button><button data-test-component="AdvancedMarkCard-footerSidePage-actionBarPrimaryButton" disabled>Добавить в журнал</button></footer>
 </div></div>"""


def seed(context, settings):
    context.add_cookies([{"name": "aupd_token", "value": "demo-token", "domain": "authedu.mosreg.ru", "path": "/"},
                         {"name": "profile_id", "value": "777", "domain": "authedu.mosreg.ru", "path": "/"}])
    context.add_init_script(f"""
      try {{
        localStorage.setItem('profileInfo', JSON.stringify({{id: 777, school_id: 1}}));
        localStorage.setItem('MES_API_YEAR_ID', '2026');
        localStorage.setItem('MSCP', JSON.stringify({json.dumps(settings, ensure_ascii=False)}));
      }} catch (e) {{}}
    """)
    context.add_init_script(path=str(SCRIPT))


def main():
    if not SCRIPT.exists():
        sys.exit("Нет script.js: сначала ./build.sh")
    OUT.mkdir(parents=True, exist_ok=True)
    shot = lambda page, name, **kw: page.screenshot(path=str(OUT / f"{name}.png"), type="png", **kw)

    base = {"scheduleStyle": "classic", "hideAverageMark": False}
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")

        # ----- журнал: окраска, подсказка, шапка, настройки
        context = browser.new_context(viewport={"width": 1320, "height": 760}, locale="ru-RU", color_scheme="light")
        context.route(re.compile(r"https://authedu\.mosreg\.ru/.*"), route_handler)
        seed(context, {**base, "commentPresets": ["Ответ у доски", "Проверка ДЗ", "Активная работа"], "commentFinishWithButton": True})
        page = context.new_page()
        page.goto(JOURNAL_URL)
        page.wait_for_selector(".mscp-button")
        page.wait_for_timeout(600)
        shot(page, "01-journal")

        row = page.locator("tbody tr").nth(4).locator("td").last
        row.hover()
        page.wait_for_timeout(300)
        shot(page, "02-tooltip", clip={"x": 760, "y": 60, "width": 560, "height": 260})
        page.mouse.move(5, 5)

        shot(page, "03-header-forms", clip={"x": 0, "y": 0, "width": 1320, "height": 150})

        page.locator(".mscp-pick-box button").click()
        page.wait_for_timeout(800)
        shot(page, "04-pick-student")
        page.locator(".mscp-pick-box button").click()
        page.reload()
        page.wait_for_selector(".mscp-button")
        page.wait_for_timeout(400)

        # окна карточек оценки: подставляем «как у сайта»
        page.evaluate("html => document.body.insertAdjacentHTML('beforeend', html)", FAST_CARD.format(form="Комбинированная работа"))
        page.wait_for_timeout(300)
        shot(page, "05-fast-card")
        page.evaluate("document.querySelector('.fake-card').remove()")
        page.evaluate("html => document.body.insertAdjacentHTML('beforeend', html)", FAST_CARD.format(form="Устный ответ"))
        page.wait_for_timeout(800)
        shot(page, "06-fast-card-warning")
        page.evaluate("document.querySelector('.fake-card').remove()")
        page.evaluate("html => document.body.insertAdjacentHTML('beforeend', html)", ADVANCED_CARD)
        page.wait_for_timeout(800)
        shot(page, "07-advanced-card")
        page.evaluate("document.querySelector('.fake-card').remove()")

        # настройки
        page.locator(".mscp-button-box button").click()
        page.wait_for_selector(".mscp-modal-window")
        for tab, name in (("journal", "08-settings-journal"), ("schedule", "09-settings-schedule"),
                          ("comments", "10-settings-comments"), ("access", "11-settings-token")):
            page.locator(f'.mscp-nav-item[data-tab="{tab}"]').click()
            page.wait_for_timeout(200)
            shot(page, name)
            if tab in ("journal", "schedule"):
                page.evaluate("document.querySelector('.mscp-modal-content').scrollTop = 99999")
                page.wait_for_timeout(200)
                shot(page, name + "-2")
        context.close()

        # ----- расписание: окно «Уроки дня»
        context = browser.new_context(viewport={"width": 1100, "height": 760}, locale="ru-RU", color_scheme="light")
        context.route(re.compile(r"https://authedu\.mosreg\.ru/.*"), route_handler)
        seed(context, {**base, "homeworkFillAll": True})
        page = context.new_page()
        page.goto(SCHEDULE_URL)
        page.wait_for_selector(".mscp-homework-box button")
        page.locator(".mscp-homework-box button").click()
        page.wait_for_selector(".mscp-hw-text")
        page.wait_for_timeout(500)
        shot(page, "12-homework-day")
        page.locator(".mscp-hw-alltext").fill("Параграф 15, выучить определения, упр. 4 письменно")
        page.locator(".mscp-hw-fill").click()
        page.wait_for_timeout(300)
        shot(page, "13-homework-fill-all")
        page.locator('.mscp-hw-tab[data-tab="comments"]').click()
        page.wait_for_timeout(300)
        shot(page, "14-homework-comments")
        context.close()
        browser.close()
    print("Готово:", ", ".join(sorted(f.name for f in OUT.glob("*.png"))))


if __name__ == "__main__":
    main()
