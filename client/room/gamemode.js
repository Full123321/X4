// === РЕЖИМ ОТ ТЯНОЧКИ (ТОЛЬКО СИНЯЯ КОМАНДА) ===

// 1. НАСТРОЙКА КОМАНД
// Оставляем только команду "Blue". Не создаём "Black".
var blueTeam = Teams.Get("Blue");

// Если по какой-то причине на карте нет команды Blue, создадим её вручную
if (!blueTeam) {
    Teams.Add("Blue", "Синие", { r: 0, g: 0, b: 1 });
    blueTeam = Teams.Get("Blue");
}

// Принудительный перевод в команду "Синие"
Teams.OnRequestJoinTeam.Add(function(player, team) {
    if (team.Tag === "Blue") {
        team.Add(player);
    }
});

// Гарантированный перевод при смене команды
Teams.OnPlayerChangeTeam.Add(function(player) {
    if (!player.Team || player.Team.Tag !== "Blue") {
        blueTeam.Add(player);
    }
    player.Spawns.Spawn();
});

// Моментальный респавн
Spawns.GetContext().RespawnTime.Value = 0;

// 2. ПЕРЕМЕННЫЕ СЕРВЕРА
var roomNextId = 0;
var firstPlayerAssigned = false;
var serverStartTime = Date.now();

// Таймер для смены текста
var timer = Timers.GetContext().Get("MainTimer");
timer.RestartLoop(1);
timer.OnTimer.Add(function() {
    var uptime = Math.floor((Date.now() - serverStartTime) / 1000);
    if (uptime % 40 < 20) {
        Ui.GetContext().Hint.Value = "Режим от Тяночки! Только команда Синие.";
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

    // Принудительно кидаем в Синих
    if (blueTeam) {
        blueTeam.Add(player);
    }

    player.PopUp("Добро пожаловать! Ваш ID: " + roomId);
});

// 4. ЗОНЫ (AREAS)
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

        var tpMatch = message.match(/^\/tp$(\d+)$\$/);
        if (tpMatch) {
            var targetId = parseInt(tpMatch);
            var players = Players.GetEnumerator();
            while (players.MoveNext()) {
                if (players.Current.Properties.Get("RoomId").Value === targetId) {
                    player.Spawns.Spawn();
                    player.PopUp("Телепорт к игроку " + targetId);
                    return;
                }
            }
            player.PopUp("Игрок не найден!");
        }

        var popMatch = message.match(/^\/pop$(.+)$\$/);
        if (popMatch) {
            var text = popMatch;
            var players = Players.GetEnumerator();
            while (players.MoveNext()) {
                players.Current.PopUp(text);
            }
        }

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
Ui.GetContext().Hint.Value = "Режим от Тяночки! Только команда Синие.";
