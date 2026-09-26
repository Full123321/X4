// === РЕЖИМ ОТ ТЯНОЧКИ ===
// Все переменные хранятся в свойствах игрока (player.Properties)

// Включаем попапы
Room.PopupsEnable = true;

// --- СОЗДАНИЕ КОМАНД ---
// Создаём одну команду "Чёрные"
Teams.Add("Black", "Чёрные", { r: 0, g: 0, b: 0 });

// Копируем спавны с "Синих" если они есть на карте
var blueTeam = Teams.Get("Blue");
var blackTeam = Teams.Get("Black");
if (blueTeam) {
    var blueSpawns = Spawns.GetContext(blueTeam);
    var blackSpawns = Spawns.GetContext(blackTeam);
    if (blueSpawns && blackSpawns) {
        for (var i = 0; i < blueSpawns.SpawnPointsGroups.Count; i++) {
            blackSpawns.SpawnPointsGroups.Add(blueSpawns.SpawnPointsGroups.Get(i));
        }
    }
}

// Автовступление в команду и авто-спавн
Teams.OnRequestJoinTeam.Add(function(player, team) {
    team.Add(player);
});
Teams.OnPlayerChangeTeam.Add(function(player) {
    // Принудительно кидаем в Чёрные если игрок пытается сменить команду
    if (!player.Team || player.Team.Tag !== "Black") {
        blackTeam.Add(player);
    }
    player.Spawns.Spawn();
});

// Моментальный респавн
Spawns.GetContext().RespawnTime.Value = 0;

// --- ПЕРЕМЕННЫЕ СЕРВЕРА ---
var roomNextId = 0;
var firstPlayerAssigned = false;

// Радужные цвета
var rainbowColors = [
    { r: 1, g: 0, b: 0 },
    { r: 1, g: 0.5, b: 0 },
    { r: 1, g: 1, b: 0 },
    { r: 0, g: 1, b: 0 },
    { r: 0, g: 0, b: 1 },
    { r: 0.5, g: 0, b: 0.5 },
    { r: 1, g: 0, b: 1 }
];
var colorIndex = 0;

// --- СЧЕТЧИК ВРЕМЕНИ СЕРВЕРА ---
var serverTimer = Timers.GetContext().Get("ServerTimer");
serverTimer.RestartLoop(1);
serverTimer.OnTimer.Add(function() {
    colorIndex = (colorIndex + 1) % rainbowColors.length;

    // Меняем надпись каждые 20 секунд
    var uptime = Math.floor((Date.now() - serverStartTime) / 1000);
    if (uptime % 20 < 10) {
        Ui.GetContext().Hint.Value = "Режим от Тяночки!";
    } else {
        Ui.GetContext().Hint.Value = "/help - тут все команды!";
    }
});

var serverStartTime = Date.now();

// Отдельный таймер для времени (показ справа сверху)
var timeTimer = Timers.GetContext().Get("TimeTimer");
timeTimer.RestartLoop(1);
timeTimer.OnTimer.Add(function() {
    var uptime = Math.floor((Date.now() - serverStartTime) / 1000);
    var h = Math.floor(uptime / 3600);
    var m = Math.floor((uptime % 3600) / 60);
    var s = uptime % 60;
    var timeStr = (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
    // Время можно показать через Ui.GetContext() если есть соответствующее поле
});

// --- ВХОД ИГРОКА ---
Players.OnPlayerConnected.Add(function(player) {
    roomNextId++;
    var roomId = roomNextId;

    // Создаём свойства игрока
    player.Properties.Get("RoomId").Value = roomId;
    player.Properties.Get("Coins").Value = 0;
    player.Properties.Get("Kills").Value = 0;
    player.Properties.Get("IsAdmin").Value = false;
    player.Properties.Get("CanFly").Value = false;
    player.Properties.Get("HasAllWeapons").Value = false;
    player.Properties.Get("CanBuild").Value = false;
    player.Properties.Get("Statuses").Value = "";
    player.Properties.Get("Banned").Value = false;

    // Админка первому игроку
    if (!firstPlayerAssigned) {
        player.Properties.Get("IsAdmin").Value = true;
        player.Properties.Get("CanFly").Value = true;
        player.Properties.Get("HasAllWeapons").Value = true;
        player.Properties.Get("CanBuild").Value = true;
        firstPlayerAssigned = true;
        player.PopUp("Вы главный администратор режима!");
    }

    // Включаем бесконечное всё для админа
    if (player.Properties.Get("IsAdmin").Value) {
        var inv = player.Inventory;
        inv.Main.Value = true;
        inv.Secondary.Value = true;
        inv.Melee.Value = true;
        inv.Explosive.Value = true;
        inv.Build.Value = true;
        inv.MainInfinity.Value = true;
        inv.SecondaryInfinity.Value = true;
        inv.BuildInfinity.Value = true;
    } else {
        // У обычных игроков отключаем всё
        var inv = player.Inventory;
        inv.Main.Value = false;
        inv.Secondary.Value = false;
        inv.Melee.Value = true;
        inv.Explosive.Value = false;
        inv.Build.Value = false;
        inv.MainInfinity.Value = false;
        inv.SecondaryInfinity.Value = false;
        inv.BuildInfinity.Value = false;
    }

    player.PopUp("Добро пожаловать! Ваш ID: " + roomId);
});

// --- ВЫХОД ИГРОКА ---
Players.OnPlayerDisconnected.Add(function(player) {
    // Ничего не удаляем, ID сохраняются
});

// --- УБИЙСТВА ---
Damage.OnKill.Add(function(player, killed) {
    if (killed && killed.Team && killed.Team !== player.Team) {
        player.Properties.Get("Kills").Value++;
    }
});

// --- ЗОНЫ (AreaPlayerTriggerService) ---
// Зона фарма (тег: farm, имя зоны = количество монет)
var farmTrigger = AreaPlayerTriggerService.Get("FarmTrigger");
farmTrigger.Tags = ["farm"];
farmTrigger.Enable = true;
farmTrigger.OnEnter.Add(function(player) {
    // При входе в зону фарма начисляем монеты
    // Значение берётся из имени зоны через Properties
    var coinsProp = Properties.GetContext().Get("FarmAmount");
    var amount = coinsProp.Value || 100;
    player.Properties.Get("Coins").Value += amount;
    player.PopUp("+" + amount + " монет! Всего: " + player.Properties.Get("Coins").Value);
});

// Зона покупки оружия (тег: weapon)
var weaponTrigger = AreaPlayerTriggerService.Get("WeaponTrigger");
weaponTrigger.Tags = ["weapon"];
weaponTrigger.Enable = true;
weaponTrigger.OnEnter.Add(function(player) {
    var price = Properties.GetContext().Get("WeaponPrice").Value || 100;
    var itemId = Properties.GetContext().Get("WeaponItemId").Value || 0;
    var coins = player.Properties.Get("Coins").Value;
    if (coins >= price) {
        player.Properties.Get("Coins").Value = coins - price;
        // Выдача предмета по ID
        var inv = player.Inventory;
        if (itemId === 0) inv.Main.Value = true;
        else if (itemId === 1) inv.Secondary.Value = true;
        else if (itemId === 2) inv.Melee.Value = true;
        else if (itemId === 3) inv.Explosive.Value = true;
        else if (itemId === 4) inv.Build.Value = true;
        else if (itemId === 5) inv.MainInfinity.Value = true;
        else if (itemId === 6) inv.SecondaryInfinity.Value = true;
        else if (itemId === 7) inv.Explosive.Value = true;
        else if (itemId === 8) inv.BuildInfinity.Value = true;
        player.PopUp("Предмет куплен!");
    } else {
        player.PopUp("Недостаточно средств!");
    }
});

// Зона покупки здоровья (тег: xp)
var xpTrigger = AreaPlayerTriggerService.Get("XpTrigger");
xpTrigger.Tags = ["xp"];
xpTrigger.Enable = true;
xpTrigger.OnEnter.Add(function(player) {
    var price = Properties.GetContext().Get("XpPrice").Value || 500;
    var hpAmount = Properties.GetContext().Get("XpAmount").Value || 100;
    var coins = player.Properties.Get("Coins").Value;
    if (coins >= price) {
        player.Properties.Get("Coins").Value = coins - price;
        player.PopUp("Здоровье восстановлено!");
    } else {
        player.PopUp("Недостаточно средств!");
    }
});

// Зона подсказки (тег: hint)
var hintTrigger = AreaPlayerTriggerService.Get("HintTrigger");
hintTrigger.Tags = ["hint"];
hintTrigger.Enable = true;
hintTrigger.OnEnter.Add(function(player) {
    var hintText = Properties.GetContext().Get("HintText").Value || "Подсказка";
    player.PopUp(hintText);
});

// Зона покупки статуса (тег: status)
var statusTrigger = AreaPlayerTriggerService.Get("StatusTrigger");
statusTrigger.Tags = ["status"];
statusTrigger.Enable = true;
statusTrigger.OnEnter.Add(function(player) {
    var price = Properties.GetContext().Get("StatusPrice").Value || 100;
    var statusName = Properties.GetContext().Get("StatusName").Value || "VIP";
    var coins = player.Properties.Get("Coins").Value;
    if (coins >= price) {
        player.Properties.Get("Coins").Value = coins - price;
        var current = player.Properties.Get("Statuses").Value;
        player.Properties.Get("Statuses").Value = (current ? current + "," : "") + statusName;
        player.PopUp("Статус '" + statusName + "' получен!");
    } else {
        player.PopUp("Недостаточно средств!");
    }
});

// Зона проверки статуса (тег: status2)
var status2Trigger = AreaPlayerTriggerService.Get("Status2Trigger");
status2Trigger.Tags = ["status2"];
status2Trigger.Enable = true;
status2Trigger.OnEnter.Add(function(player) {
    var requiredStatus = Properties.GetContext().Get("RequiredStatus").Value || "VIP";
    var statuses = player.Properties.Get("Statuses").Value;
    if (!statuses || statuses.indexOf(requiredStatus) === -1) {
        player.Spawns.Spawn();
        player.PopUp("Доступ запрещён! Нужен статус: " + requiredStatus);
    }
});

// Зона телепорта (тег: tp)
var tpTrigger = AreaPlayerTriggerService.Get("TpTrigger");
tpTrigger.Tags = ["tp"];
tpTrigger.Enable = true;
tpTrigger.OnEnter.Add(function(player) {
    // Телепорт через спавн (координаты пока не поддерживаются напрямую в API)
    player.Spawns.Spawn();
    player.PopUp("Телепортация!");
});

// --- ЧАТ-КОМАНДЫ ---
// Чат-сервис может иметь OnMessage событие
// Оборачиваем в try-catch так как точный API чата может отличаться
try {
    Chat.GetContext().OnMessage.Add(function(player, message) {
        if (!message || message.charAt(0) !== '/') return;

        // /help
        if (message === '/help') {
            player.PopUp("/tp(ID) /pop(Текст) /spawn(ID) /adm(ID) /ban(ID)");
            return;
        }

        // /tp(ID) - телепорт к игроку
        var tpMatch = message.match(/^\/tp$(\d+)$$/);
        if (tpMatch) {
            var targetId = parseInt(tpMatch[1]);
            var players = Players.GetEnumerator();
            while (players.MoveNext()) {
                if (players.Current.Properties.Get("RoomId").Value === targetId) {
                    // Телепорт к игроку через спавн рядом
                    player.Spawns.Spawn();
                    player.PopUp("Телепорт к игроку " + targetId);
                    return;
                }
            }
            player.PopUp("Игрок не найден!");
            return;
        }

        // /pop(Текст) - сообщение всем
        var popMatch = message.match(/^\/pop$(.+)$$/);
        if (popMatch) {
            var text = popMatch[1];
            var players = Players.GetEnumerator();
            while (players.MoveNext()) {
                players.Current.PopUp(text);
            }
            return;
        }

        // /spawn(ID) - возврат на спавн
        var spawnMatch = message.match(/^\/spawn$(\d+)$$/);
        if (spawnMatch) {
            var targetId = parseInt(spawnMatch[1]);
            var players = Players.GetEnumerator();
            while (players.MoveNext()) {
                if (players.Current.Properties.Get("RoomId").Value === targetId) {
                    players.Current.Spawns.Spawn();
                    player.PopUp("Игрок " + targetId + " возвращён на спавн");
                    return;
                }
            }
            return;
        }

        // /adm(ID) - выдать админку (только для админов)
        var admMatch = message.match(/^\/adm$(\d+)$$/);
        if (admMatch && player.Properties.Get("IsAdmin").Value) {
            var targetId = parseInt(admMatch[1]);
            var players = Players.GetEnumerator();
            while (players.MoveNext()) {
                if (players.Current.Properties.Get("RoomId").Value === targetId) {
                    var target = players.Current;
                    target.Properties.Get("IsAdmin").Value = true;
                    target.Properties.Get("CanFly").Value = true;
                    target.Properties.Get("HasAllWeapons").Value = true;
                    target.Properties.Get("CanBuild").Value = true;
                    var tInv = target.Inventory;
                    tInv.Main.Value = true;
                    tInv.Secondary.Value = true;
                    tInv.Melee.Value = true;
                    tInv.Explosive.Value = true;
                    tInv.Build.Value = true;
                    tInv.MainInfinity.Value = true;
                    tInv.SecondaryInfinity.Value = true;
                    tInv.BuildInfinity.Value = true;
                    target.PopUp("Вам выдана админка!");
                    player.PopUp("Админка выдана игроку " + targetId);
                    return;
                }
            }
            return;
        }

        // /ban(ID) - бан игрока (только для админов)
        var banMatch = message.match(/^\/ban$(\d+)$$/);
        if (banMatch && player.Properties.Get("IsAdmin").Value) {
            var targetId = parseInt(banMatch[1]);
            var players = Players.GetEnumerator();
            while (players.MoveNext()) {
                if (players.Current.Properties.Get("RoomId").Value === targetId) {
                    players.Current.Properties.Get("Banned").Value = true;
                    players.Current.Spawns.Spawn();
                    players.Current.PopUp("Вы забанены администратором");
                    player.PopUp("Игрок " + targetId + " забанен");
                    return;
                }
            }
            return;
        }
    });
} catch (e) {
    // Если Chat API недоступен, команды не работают
}

// --- UI: подсказка по умолчанию ---
Ui.GetContext().Hint.Value = "Режим от Тяночки!";
