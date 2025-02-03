from bs4 import BeautifulSoup
import datetime
import locale
import os
from glob import glob

locale.setlocale(
    category=locale.LC_ALL,
    locale="Russian" 
)



#datetime.datetime.strptime('Ноябрь-2013',"%B-%Y")
# синий -  MV57GCYYcPhOHkSQsK9F EoyGTa_NIo_M5boZkXU0
# рыжий -   MV57GCYYcPhOHkSQsK9F ULjoCgrIj4yNfBKVwZYe
# красный -    MV57GCYYcPhOHkSQsK9F d8JBiaXrvL8XVZ58xn9g
# серый  -     MV57GCYYcPhOHkSQsK9F
def get_color_by_string(input_str):
    if "EoyGTa_NIo_M5boZkXU0" in input_str:
        return "с"
    elif "ULjoCgrIj4yNfBKVwZYe" in input_str:
        return "р"
    elif "d8JBiaXrvL8XVZ58xn9g" in input_str:
        return "к"
    else:
        return "н"

def get_home_list(path):
    with open(path, "r", encoding='UTF-8') as f:       
        contents = f.read()   
        soup = BeautifulSoup(contents, 'lxml')
        rowList = soup.find_all('tr',{"class": "f0eMcueVzidF1N9SAffu"})
        list_mon = []
        for i in rowList[0].find_all('th'): # Месяцы
            z = i.find("span").text # Название месяца
            l = int(i.get('colspan', 1)) # Сколько столбцов займёт
            for q in range(l): # Вставляем стокль столбцов с этим месяцем
                list_mon.append(z)
        list_day = ['']
        list_home_class = ['']
        for i in rowList[2].find_all('th'): # даты с домиками
            z = i.find("span").text # Число
            q = i.find('svg')['class'] # классы у домика
            l = int(i.get('colspan', 1)) # Сколько столбцов займёт
            for a in range(l): # Вставляем стокль столбцов с этим днём
                list_day.append(z)
                list_home_class.append(q)
        list_day.append('')
        list_day.append('')
        list_home_class.append('')
        list_home_class.append('')
        out_list = []
        for i in range(len(list_mon)):
            try:
                if (list_mon[i]=="Ноябрь" or list_mon[i]=="Декабрь"):
                    year = '2024'
                else:
                    year = '2025' 
                date = datetime.datetime.strptime(f'{list_day[i]}-{list_mon[i]}-{year}',"%d-%B-%Y")
                color = get_color_by_string(''.join(list_home_class[i]))
            except:
                date = ''
                color = ''

            out_list.append([date,color])
        name_jornal = ' '.join(list_mon[0].split())
        out_list[0] = name_jornal
        if(len(out_list)>1):
            out_list.pop()
        if(len(out_list)>1):
            out_list.pop()
        return out_list

def date_range(start_date, end_date):
    for n in range(int((end_date - start_date).days)):
        yield start_date + datetime.timedelta(n)

# Устанавливаем начальную и конечную даты
start_date = datetime.datetime(2024, 1, 23)
end_date = datetime.datetime(2025, 2, 16)

# Создаем генератор для получения списка дат
dates = list(date_range(start_date, end_date))
dates.insert(0, 'Название журнала')
dates.insert(0, 'Имя файла сохранения')
# Указываем путь к папке, где нужно искать файлы
folder_path = r'C:\Users\Учитель\Documents\0Code\Licey24-JornalParser\Licey24-JornalParser\jornal'
folder_path = r'C:\Users\Учитель\Documents\0Code\Licey24-JornalParser\Licey24-JornalParser\1'

# Получаем список всех файлов с расширением .html в данной папке
html_files = glob(os.path.join(folder_path, '*.html'))

out_table = []
out_table.append(dates)
# Перебираем найденные файлы и обрабатываем
for file in html_files:
    relative_path = os.path.relpath(file, folder_path)
    data_jornal = get_home_list(file)
    newRow  = []
    for day in dates:
        f = True
        for i in data_jornal:
            if day==i[0]:
                newRow.append(i[1])
                f= False
                break
        if f:
           newRow.append('.')
    cut_jornal_name =  data_jornal[0].split('УП')[0]
    newRow[1] = cut_jornal_name
    newRow[0] = relative_path
    out_table.append(newRow)
            

def save_array_to_file(array, filename):
    # Соединяем элементы массива в строку через табуляцию
    out_str  = ''
    for i in array:
        array_str = '\t'.join(map(str, i))  # Преобразуем каждый элемент в строку и объединяем их через \t
        out_str = out_str + array_str + "\n"
    
    # Сохраняем строку в файл
    with open(filename, 'w', encoding='UTF-8') as file:
        file.write(out_str)

save_array_to_file(out_table,'out.txt')