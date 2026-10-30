export const ROLES = {
  "scanner": {
    "name": "🧠 Нетранер NetWatch",
    "team": "city",
    "description": "Щоночі зчитує сторону гравця. Керівник Арасаки маскує свою фракцію.",
    "action": "scan",
    "frequency": "нічна"
  },
  "medic": {
    "name": "🚑 Медик Trauma Team",
    "team": "city",
    "description": "Захищає одну людину від атаки вночі. Одну ціль не можна лікувати двічі поспіль.",
    "action": "heal",
    "frequency": "нічна"
  },
  "jammer": {
    "name": "📵 Глушник сигналу",
    "team": "city",
    "description": "Блокує нічну особисту здібність, але не загальний вибір цілі Арасаки.",
    "action": "jam",
    "frequency": "нічна"
  },
  "tracker": {
    "name": "📷 Детектив NCPD",
    "team": "city",
    "description": "Бачить, хто навідувався до вибраної людини вночі.",
    "action": "watch",
    "frequency": "нічна"
  },
  "crypto": {
    "name": "🔗 Брейнданс-криміналіст",
    "team": "city",
    "description": "Порівнює видиму фракцію двох інших гравців.",
    "action": "compare",
    "frequency": "нічна"
  },
  "samurai": {
    "name": "🗡️ Вуличний кіберсамурай",
    "team": "city",
    "description": "Вбудована броня витримує першу атаку, якщо немає пробою.",
    "action": null,
    "frequency": "пасивна"
  },
  "armorer": {
    "name": "🦾 Ріпердок",
    "team": "city",
    "description": "Раз за матч встановлює іншій людині або собі броню проти однієї атаки.",
    "action": "install",
    "frequency": "разова"
  },
  "reporter": {
    "name": "📡 Репортерка Найт-Сіті",
    "team": "city",
    "description": "Раз за матч публікує, чи була ціль активною вночі.",
    "action": "leak",
    "frequency": "разова"
  },
  "drone": {
    "name": "🛸 Оператор Militech",
    "team": "city",
    "description": "Стежить за тим, до кого ходила вибрана людина.",
    "action": "follow",
    "frequency": "нічна"
  },
  "collector": {
    "name": "🌡️ Сканер імплантів",
    "team": "city",
    "description": "Дізнається цифровий слід цілі від 0 до 4.",
    "action": "heat",
    "frequency": "нічна"
  },
  "courier": {
    "name": "🥷 Кур’єр-перевізник",
    "team": "city",
    "description": "Ховає нічні візити вибраного гравця й зменшує його слід.",
    "action": "cloak",
    "frequency": "нічна"
  },
  "bodyguard": {
    "name": "🛡️ Соло-охоронець",
    "team": "city",
    "description": "Приймає удар замість іншої цілі, якщо атаку не пробито.",
    "action": "cover",
    "frequency": "нічна"
  },
  "maxtac": {
    "name": "🚨 Оперативник MaxTac",
    "team": "city",
    "description": "Щоночі стежить за підозрюваним: визначає кіберпсиха та зупиняє його психозну атаку.",
    "action": "suppress",
    "frequency": "нічна"
  },
  "fixer": {
    "name": "💰 Фіксер Післяжиття",
    "team": "city",
    "description": "Раз за матч оголошує винагороду за голову: ціль отримає один додатковий голос на найближчому суді.",
    "action": "bounty",
    "frequency": "разова"
  },
  "militech": {
    "name": "🎯 Штурмовик Militech",
    "team": "city",
    "description": "Раз за матч здійснює рейд: усуває агента Арасаки, але якщо ціль невинна — видає власний цифровий слід.",
    "action": "raid",
    "frequency": "разова"
  },
  "braindance": {
    "name": "💿 Редактор брейндансу",
    "team": "city",
    "description": "Щоночі бачить тип особистої дії цілі, але не її точну мішень.",
    "action": "memory",
    "frequency": "нічна"
  },
  "maelstrom": {
    "name": "⚙️ Механік Мальстрому",
    "team": "city",
    "description": "Раз за матч руйнує броню цілі й піднімає її цифровий слід до 4.",
    "action": "overload",
    "frequency": "разова"
  },
  "architect": {
    "name": "👔 Директор Арасаки",
    "team": "syn",
    "description": "Приховує свою фракцію від перевірок і вирішує нічию голосів агентів за нічну жертву.",
    "action": null,
    "frequency": "пасивна"
  },
  "forger": {
    "name": "🎭 Корпоративний фальсифікатор",
    "team": "syn",
    "description": "Раз за матч підставляє будь-яку людину в публічному мережевому сліді.",
    "action": "forge",
    "frequency": "разова"
  },
  "stunner": {
    "name": "⚡ Агент Black ICE",
    "team": "syn",
    "description": "Раз за матч блокує особисту нічну здібність одного гравця.",
    "action": "stun",
    "frequency": "разова"
  },
  "breaker": {
    "name": "🔪 Ліквідатор Арасаки",
    "team": "syn",
    "description": "Раз за матч забезпечує пробій нічної атаки корпорації крізь усі захисти.",
    "action": "pierce",
    "frequency": "разова"
  },
  "counterintel": {
    "name": "🕶️ Контррозвідка Арасаки",
    "team": "syn",
    "description": "Щоночі таємно дізнається справжню роль одного гравця.",
    "action": "intercept",
    "frequency": "нічна"
  },
  "blackout": {
    "name": "🖥️ Вірусний архітектор Арасаки",
    "team": "syn",
    "description": "Раз за матч глушить усі камери, дрони й брейнданс-спостереження вночі.",
    "action": "blackout",
    "frequency": "разова"
  },
  "soulkiller": {
    "name": "🧿 Оператор Soulkiller",
    "team": "syn",
    "description": "Раз за матч стирає всі нічні результати перевірок обраного гравця.",
    "action": "soulkill",
    "frequency": "разова"
  },
  "glitch": {
    "name": "👹 Кіберпсих Берсерк",
    "team": "glitch",
    "description": "Накопичує психоз. За 2 одиниці робить окрему нічну атаку, яка проходить крізь броню, але не лікування. Дві власні ліквідації — особиста перемога.",
    "action": "rampage",
    "frequency": "психоз"
  },
  "phantom": {
    "name": "👻 Кіберпсих Фантом",
    "team": "glitch",
    "description": "Накопичує психоз. За 2 одиниці безшумно атакує вночі. Броня та лікування рятують ціль. Дві власні ліквідації — перемога.",
    "action": "ghoststrike",
    "frequency": "психоз"
  }
};
export const MARKET = {
  "smoke": {
    "name": "🌫️ Димова прошивка",
    "price": 2,
    "description": "Ховає твої візити, цифровий слід −2"
  },
  "plate": {
    "name": "🦾 Бронепластина",
    "price": 3,
    "description": "Особиста броня від однієї атаки"
  },
  "tag": {
    "name": "📍 Підставна мітка",
    "price": 2,
    "description": "+2 цифрового сліду іншій людині"
  },
  "emp": {
    "name": "📴 EMP-граната",
    "price": 3,
    "description": "Блокує особисту здібність іншого гравця вночі"
  },
  "sandi": {
    "name": "⚡ Сандевістан",
    "price": 4,
    "description": "Уникає нічної атаки, крім пробою Арасаки"
  },
  "kiroshi": {
    "name": "👁️ Оптика Кіроші",
    "price": 2,
    "description": "Надає правдиву інформацію про цифровий слід вибраної людини"
  }
};
