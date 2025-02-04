from bs4 import BeautifulSoup
import datetime
import locale
import os
from glob import glob

locale.setlocale(
    category=locale.LC_ALL,
    locale="Russian" 
)

def get_color_by_string(input_str): # Определяем цвет домика по классу
    if "EoyGTa_NIo_M5boZkXU0" in input_str:
        return "с" # синий
    elif "ULjoCgrIj4yNfBKVwZYe" in input_str:
        return "р" # рыжий
    elif "d8JBiaXrvL8XVZ58xn9g" in input_str:
        return "к" # красный
    elif "без ДЗ" in input_str:
        return "б" # синий без ДЗ
    else:
        return "н" # серый

def get_home_list(path): # Полуйчаем данные из файла с таблицей
    with open(path, "r", encoding='UTF-8') as f:       
        contents = f.read()   
        soup = BeautifulSoup(contents, 'lxml')
        url = soup.find('div',{"class": "URL"}) # ищем первый див с ссылкой на этот журнал
        rowList = soup.find_all('tr',{"class": "f0eMcueVzidF1N9SAffu"}) # получаем все строки таблицы
        list_mon = [] #  лист для месяцев
        for i in rowList[0].find_all('th'): # Месяцы, ячейки первой строки таблицы
            z = i.find("span").text # Название месяца с ячейки
            l = int(i.get('colspan', 1)) # Сколько столбцов займёт
            for a in range(l): # Вставляем столько столбцов с этим месяцем
                list_mon.append(z)
        list_day = ['']# лист для дней
        list_home_class = ['']# лист для хранения классов домиков
        for i in rowList[2].find_all('th'): # даты с домиками, ячейки третьей строки
            z = i.find("span").text # Число (дата)
            q = i.find('svg')['class'] # классы у домика
            t = i.find('svg').contents[0]['d'][:7] # получаем первые 7 символов пути кривой svg
            if 'M20.354' in t: # если эти символы как у перечёркнутого домика
                q = ['без ДЗ'] # указываем класс. что он без ДЗ. в оригинале уникального класса нет
            l = int(i.get('colspan', 1)) # Сколько столбцов займёт
            # TODO: переделать копирование дней, оно скореее всего вносит ошибки и мешает
            for a in range(l): # Вставляем столько столбцов с этим днём
                list_day.append(z)
                list_home_class.append(q)
        # лист месяцев длинее чем дней, добавляем недостающее для уравнивания длины
        # TODO: может проще обрезать лист месяцев
        list_day.append('')
        list_day.append('')
        list_home_class.append('')
        list_home_class.append('')
        out_list = []# выходной список
        for i in range(len(list_mon)):# перебираем список с месяцами
            try:
                if (list_mon[i]=="Ноябрь" or list_mon[i]=="Декабрь"):
                    year = '2024'
                else:
                    year = '2025' 
                date = datetime.datetime.strptime(f'{list_day[i]}-{list_mon[i]}-{year}',"%d-%B-%Y")# получаем дату из списка дня и месяца
                color = get_color_by_string(''.join(list_home_class[i]))# получаем цвет домика из класса
            except:# если дата не получилась, значит это не уроки а итог, средний балл, назвние и т.д. пишем пустоту
                date = ''
                color = ''

            out_list.append([date,color])# добавляем запись о уроке в выходной лист
        #name_jornal = list_mon[0]# получаем имя журнала из первой строки первой ячейки (там и месяцы)
        out_list[0] = list_mon[0]# записываем имя журнала из первой строки первой ячейки (там и месяцы) в выходной лист
        out_list.insert(0, url.text)# добавляем в начало url этого журнала
        # отрезаем лишние элементы если они есть (есть пусные журналы, там пустых не будет)
        if(len(out_list)>1):
            out_list.pop()
        if(len(out_list)>1):
            out_list.pop()
        return out_list

def date_range(start_date, end_date): # генерируем лист с датам в диапазоне от-до
    for n in range(int((end_date - start_date).days)):
        yield start_date + datetime.timedelta(n)

def split_class(text = 'Иностранный (немецкий) язык 1-М'): # разделяем название предмета и класс
    sp_t = text.split('-')# для большинства журналов литера от буквы отделена -
    if len(sp_t)==2:# если получилось 2 куска текста, значит это этот слуяай
        sp_t[1] = sp_t[0][-1] + sp_t[1]# переносим цифру класса к букве
        sp_t[0] = sp_t[0][:-1]# удаляем цифру
        if sp_t[0][-1] != ' ': # если далее опять идёт цифра значит это 10 или 11 класс, перемещаем ещё цифру
            sp_t[1] = sp_t[0][-1] + sp_t[1]
            sp_t[0] = sp_t[0][:-1]
        return sp_t
    # отдельные случаи
    if '7 НДО Дубовая' in text:
        sp_t = text.split('7 НДО Дубовая')
        return  [sp_t[0],'7 НДО Дубовая']
    if 'Немецкий язык' in text:
        return  [text[:len(text)-3],text[:-3]]
    if 'Физическая культура' in text:
        return  [text[:len(text)-2],text[:-2]]
    if 'Геометрия 10А общие уроки' in text:
        return  ['Геометрия ','10А общие уроки']
    if 'Русская словесность 10А общий урок' in text:
        return  ['Русская словесность ','10А общий урок']
    pass

# Устанавливаем начальную и конечную даты
start_date = datetime.datetime(2024, 11, 23)
end_date = datetime.datetime(2025, 2, 16)

# создаём список из всех дат и добавляем в его начало заголовки
dates = list(date_range(start_date, end_date))
dates.insert(0, 'Ссылка')
dates.insert(0, 'Класс')
dates.insert(0, 'Название журнала')
dates.insert(0, 'Имя файла')

# Указываем путь к папке, где нужно искать файлы
folder_path = r'C:\Users\Учитель\Documents\0Code\Licey24-MySchoolSctiptTM\jornal'
folder_path = r'C:\Users\Учитель\Documents\0Code\Licey24-MySchoolSctiptTM\1'

# Получаем список всех файлов с расширением .html в данной папке
html_files = glob(os.path.join(folder_path, '*.html'))

out_table = []# общая таблица всех классов
out_table.append(dates)
# Перебираем найденные файлы и обрабатываем
for file in html_files:
    relative_path = os.path.relpath(file, folder_path)# относительный пути он же имя файла
    data_jornal = get_home_list(file)# данные из этого файла
    newRow  = []# будущая строка таблицы
    for day in dates:# перебираем все даты
        f = True # флаг наличия урока в эту дату
        for i in data_jornal: # перебираем все уроки в журнале
            if day==i[0]:# если дата строки таблицы и дата в журнале совпала, тоесть в этот день есть урок этого журнала
                newRow.append(i[1])# добавляем обозначение цвета домика
                f= False # ставим флаг, что нашли такую дату
                break
        if f: # если не нашли такой даты в журнале, ставим точку
           newRow.append('.')
    cut_jornal_name =  data_jornal[1].split('УП')[0]# отрезаем лишнее от названия журнала
    split_jornal_name = split_class(cut_jornal_name)# разделяем название журнала на класс и предмет
    newRow[3] = data_jornal[0] # добавляем url
    newRow[2] = split_jornal_name[1] # добаляем номер класса
    newRow[1] = split_jornal_name[0] # добаляем название предмета
    newRow[0] = relative_path # добавляем название файла сохранения
    out_table.append(newRow) # добаляем строку в таблицу
            

def save_array_to_file(array, filename):
    out_str  = ''
    for i in array:
        array_str = '\t'.join(map(str, i))  # Преобразуем каждый элемент в строку и объединяем их через \t
        out_str = out_str + array_str + "\n" # добаляем строку в итоговую строку через перенос строки
    
    # Сохраняем выходную строку в файл
    with open(filename, 'w', encoding='UTF-8') as file:
        file.write(out_str)


save_array_to_file(out_table,'out.txt')  # записываем выходную строку в файл