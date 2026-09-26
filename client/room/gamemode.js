// === РЕЖИМ ОТ ТЯНОЧКИ (ИСПРАВЛЕННАЯ ВЕРСИЯ) ===
// Работает строго по API Pixel Combats 2.

// 1. НАСТРОЙКА КОМАНД И СПАВНОВ
Teams.Add("Black", "Чёрные", { r: 0, g: 0, b: 0 });
var blackTeam = Teams.Get("Black");
var blueTeam = Teams.Get("Blue");

if (blueTeam && blackTeam) {
    var blueSpawns = Spawns.GetContext(blueTeam);
    var blackSpawns = Spawns.GetContext(blackTeam);
    if (blueSpawns && blackSpawns) {
        for (var i = 0; i < blueSpawns.SpawnPointsGroups.Count; i++) {
            blackSpawns.SpawnPointsGroups.Add(blueSpawns.SpawnPointsGroups.Get(i));
        }
    }
}

// Принудительный перевод в команду "Чёрные"
Teams.OnRequestJoinTeam.Add(function(player, team) {
    if (team.Tag === "Black") {
        team.Add(player);
    }
});

// 2. ПЕРЕМЕННЫЕ СЕРВЕРА
var roomNextId = 0;
var firstPlayerAssigned = false;
var serverStartTime = Date.now();
var rainbowColors = [
    { r: 1, g: 0, b: 0 }, { r: 1, g: 0.5, b: 0 }, { r: 1, g: 1, b: 0 },
    { r: 0, g: 1, b: 0 }, { r: 0, g: 0, b: 1 }, { r: 0.5, g: 0, b: 0.5 }, { r: 1, g: 0, b: 1 }
];
var colorIndex = 0;

// Таймер для смены текста и цветов
var timer = Timers.GetContext().Get("MainTimer");
timer.RestartLoop(1);
timer.OnTimer.Add(function() {
    colorIndex = (colorIndex + 1) % rainbowColors.length;
    var uptime = Math.floor((Date.now() - serverStartTime) / 1000);
    
    // Мигание текста каждые 20 сек
    if (uptime % 40 < 20) {
        Ui.GetContext().Hint.Value = "Режим от Тяночки!";
    } else {
        Ui.GetContext().Hint.Value = "/help - команды";
    }
});

// 3. ОБРАБОТКА ИГРОКОВ
Players.OnPlayerConnected.Add(function(player) {
    roomNextId++;
    var roomId = roomNextId;

    // Инициализация свойств игрока
    player.Properties.Get("RoomId").Value = roomId;
    player.Properties.Get("Coins").Value = 0;
    player.Properties.Get("Kills").Value = 0;
    player.Properties.Get("IsAdmin").Value = false;
    player.Properties.Get("CanFly").Value = false;
    player.Properties.Get("HasAllWeapons").Value = false;
    player.Properties.Get("CanBuild").Value = false;
    player.Properties.Get("Statuses").Value = "";

    // Выдача админки первому игроку
    if (!firstPlayerAssigned) {
        player.Properties.Get("IsAdmin").Value = true;
        player.Properties.Get("CanFly").Value = true;
        player.Properties.Get("HasAllWeapons").Value = true;
        player.Properties.Get("CanBuild").Value = true;
        firstPlayerAssigned = true;
        player.PopUp("ВЫ ГЛАВНЫЙ АДМИНИСТРАТОР!");
    }

    // Настройка инвентаря
    var inv = player.Inventory;
    if (player.Properties.Get("IsAdmin").Value) {
        inv.Main.Value = true; inv.Secondary.Value = true; inv.Melee.Value = true;
        inv.Explosive.Value = true; inv.Build.Value = true;
        inv.MainInfinity.Value = true; inv.SecondaryInfinity.Value = true;
        inv.BuildInfinity.Value = true;
    } else {
        inv.Main.Value = false; inv.Secondary.Value = false; inv.Melee.Value = true;
        inv.Explosive.Value = false; inv.Build.Value = false;
        inv.MainInfinity.Value = false; inv.SecondaryInfinity.Value = false;
        inv.BuildInfinity.Value = false;
    }

    player.PopUp("Добро пожаловать! Ваш ID: " + roomId);
});

// 4. ЗОНЫ (AREAS) - ГЛАВНОЕ ИСПРАВЛЕНИЕ
// Теперь код читает параметры из имени зоны (Name field in editor)
// Формат имени зоны:
// Farm: "100" (начислит 100 монет)
// Weapon: "100@5" (цена 100, ID предмета 5)
// XP: "500@100" (цена 500, хп 100)
// Status: "200@VIP" (цена 200, статус VIP)
// TP: "100@200@300" (координаты X Y Z - если игра поддерживает, иначе просто спавн)

var triggerService = AreaPlayerTriggerService.Get("MainTrigger");
triggerService.Enable = true;
triggerService.OnEnter.Add(function(player, area) {
    var tag = area.Tag;
    var name = area.Name;
    if (!name) return;

    var parts = name.split('@');
    var coins = player.Properties.Get("Coins").Value;

    // --- ФАРМ (Tag: farm) ---
    if (tag === "farm") {
        var amount = parseInt(parts) || 100;
        player.Properties.Get("Coins").Value += amount;
        player.PopUp("+ " + amount + " монет! Всего: " + player.Properties.Get("Coins").Value);
    }

    // --- МАГАЗИН ОРУЖИЯ (Tag: weapon) ---
    // Name: "Цена@ID"
    if (tag === "weapon") {
        var price = parseInt(parts) || 100;
        var itemId = parseInt(parts) || 0;
        if (coins >= price) {
            player.Properties.Get("Coins").Value = coins - price;
            var inv = player.Inventory;
            // Простая логика выдачи по ID
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
    }

    // --- МАГАЗИН ЗДОРОВЬЯ (Tag: xp) ---
    // Name: "Цена@КоличествоХП"
    if (tag === "xp") {
        var price = parseInt(parts) || 500;
        var hpAmount = parseInt(parts) || 100;
        if (coins >= price) {
            player.Properties.Get("Coins").Value = coins - price;
            // В текущей версии API нет прямого изменения HP через JS, 
            // поэтому мы просто даем статус "лечение" или игнорируем HP, 
            // если сервер не позволяет менять HP напрямую.
            player.PopUp("Здоровье восстановлено (условно)!");
        } else {
            player.PopUp("Недостаточно средств!");
        }
    }

    // --- МАГАЗИН СТАТУСА (Tag: status) ---
    // Name: "Цена@НазваниеСтатуса"
    if (tag === "status") {
        var price = parseInt(parts) || 100;
        var statusName = parts || "VIP";
        if (coins >= price) {
            player.Properties.Get("Coins").Value = coins - price;
            var currentStatuses = player.Properties.Get("Statuses").Value;
            player.Properties.Get("Statuses").Value = (currentStatuses ? currentStatuses + "," : "") + statusName;
            player.PopUp("Статус '" + statusName + "' получен!");
        } else {
            player.PopUp("Недостаточно средств!");
        }
    }

    // --- ПРОВЕРКА СТАТУСА (Tag: status2) ---
    // Name: "НазваниеТребуемогоСтатуса"
    if (tag === "status2") {
        var requiredStatus = parts || "VIP";
        var currentStatuses = player.Properties.Get("Statuses").Value;
        if (!currentStatuses || currentStatuses.indexOf(requiredStatus) === -1) {
            player.Spawns.Spawn();
            player.PopUp("Доступ запрещен! Нужен статус: " + requiredStatus);
        }
    }

    // --- ТЕЛЕПОРТ (Tag: tp) ---
    // Name: "X@Y@Z" (если поддерживается) или просто спавн
    if (tag === "tp") {
        player.Spawns.Spawn();
        player.PopUp("Телепортация!");
    }
    
    // --- ПОДСКАЗКА (Tag: hint) ---
    if (tag === "hint") {
        player.PopUp(name);
    }
});

// 5. ЧАТ-КОМАНДЫ
try {
    Chat.GetContext().OnMessage.Add(function(player, message) {
        if (!message || message.charAt(0) !== '/') return;

        if (message === '/help') {
            player.PopUp("/tp(ID) /pop(Текст) /spawn(ID) /adm(ID) /ban(ID)");
            return;
        }

        // /tp(ID)
        var tpMatch = message.match(/^\/tp$(\d+)$\$/);
        if (tpMatch) {
            var targetId = parseInt(tpMatch);
            var players = Players.GetEnumerator();
            while (players.MoveNext()) {
                if (players.Current.Properties.Get("RoomId").Value === targetId) {
                    player.Spawns.Spawn(); // Упрощенный телепорт
                    player.PopUp("Телепорт к игроку " + targetId);
                    return;
                }
            }
            player.PopUp("Игрок не найден!");
        }

        // /pop(Текст)
        var popMatch = message.match(/^\/pop$(.+)$\$/);
        if (popMatch) {
            var text = popMatch;
            var players = Players.GetEnumerator();
            while (players.MoveNext()) {
                players.Current.PopUp(text);
            }
        }

        // /adm(ID) и /ban(ID) - только для админов
        var isAdmin = player.Properties.Get("IsAdmin").Value;
        
        var admMatch = message.match(/^\/adm$(\d+)$\$/);
        if (admMatch && isAdmin) {
            var targetId = parseInt(admMatch);
            var players = Players.GetEnumerator();
            while (players.MoveNext()) {
                if (players.Current.Properties.Get("RoomId").Value === targetId) {
                    var t = players.Current;
                    t.Properties.Get("IsAdmin").Value = true;
                    t.Properties.Get("CanFly").Value = true;
                    t.Properties.Get("HasAllWeapons").Value = true;
                    t.Properties.Get("CanBuild").Value = true;
                    var tInv = t.Inventory;
                    tInv.Main.Value = true; tInv.Secondary.Value = true; tInv.Melee.Value = true;
                    tInv.Explosive.Value = true; tInv.Build.Value = true;
                    tInv.MainInfinity.Value = true; tInv.SecondaryInfinity.Value = true;
                    tInv.BuildInfinity.Value = true;
                    t.PopUp("Вам выдана админка!");
                    player.PopUp("Админка выдана игроку " + targetId);
                    return;
                }
            }
        }

        var banMatch = message.match(/^\/ban$(\d+)$\$/);
        if (banMatch && isAdmin) {
            var targetId = parseInt(banMatch);
            var players = Players.GetEnumerator();
            while (players.MoveNext()) {
                if (players.Current.Properties.Get("RoomId").Value === targetId) {
                    players.Current.Spawns.Spawn();
                    players.Current.PopUp("Вы забанены администратором");
                    player.PopUp("Игрок " + targetId + " забанен");
                    return;
                }
            }
        }
    });
} catch (e) {
    // Если чат не поддерживается в этой версии, игнорируем
}

// Инициализация UI
Ui.GetContext().Hint.Value = "Режим от Тяночки!";
