const WebSocket = require('ws');
const colors = require('colors');
const rp = require('discord-rich-presence')('594728534602285070');

const scoreEnum = Object.freeze({'progress':0, 'boost':1, 'distance':2, 'mult':3});

let curTime;

let maxLengths = [0, 0, 0, 0];

function sortTeams(teams){
    for(let i = 0; i < teams.length-1; i++){
        for(let j = 1+i; j < teams.length; j++){
            if(teams[j].score_pct > teams[i].score_pct){
                let temp = teams[i]
                teams[i] = teams[j];
                teams[j] = temp;
            }
        }
    }
    return teams;
}

function colorStr(str, id){
    switch(id){
        case 1:
            return str.grey;
        case 2:
            return str.green;
        case 3:
            return str.yellow;
        case 4:
            return str.blue.bold;
        case 5:
            return str.red;
        default:
            return str;
    };
}

function addSpace(str, targetLength){
    if(str.length >= targetLength){ return str; }
    return str + " ".repeat(targetLength - str.length);
}

function colorByRank(str, rank){
    switch(rank){
        case 0:
            return str.green.bold;
        case 1:
            return str.yellow;
        case 2:
            return str.yellow;
        case 3:
            return str.red.bold;
        case 4:
            return str.red.bold;
        default:
            return str;
    };
}

function formatScores(teams){
    maxLengths = [0, 0, 0, 0];
    var cminDayStart = ((curTime - 1561482000) / 60) % 1440;
    for(let i = 0; i < teams.length; i++){
        var flScorePercent = parseFloat( teams[i].score_pct );
        var flAdjustedScorePercent = (cminDayStart/1440) * (flScorePercent);

        teams[i].prog = ((flAdjustedScorePercent * 92) + 8).toFixed(3);
        if(teams[i].prog.length > maxLengths[scoreEnum.progress]){ maxLengths[scoreEnum.progress] = teams[i].prog.length; }

        teams[i].dist = teams[i].score_dist.toFixed(2);
        if(teams[i].dist.length > maxLengths[scoreEnum.distance]){ maxLengths[scoreEnum.distance] = teams[i].dist.length; }

        teams[i].score = (teams[i].score_pct*100).toFixed(2);

        teams[i].boost = teams[i].current_multiplier_boosts.toFixed(1);
        if(teams[i].boost.length > maxLengths[scoreEnum.boost]){ maxLengths[scoreEnum.boost] = teams[i].boost.length; }
        
        teams[i].mult = teams[i].current_multiplier.toFixed(6);
        if(teams[i].mult.length > maxLengths[scoreEnum.mult]){ maxLengths[scoreEnum.mult] = teams[i].mult.length; }
        switch(teams[i].teamid){
            case 1:
                teams[i].name = 'Hare';
                teams[i].large_icon = 'helmet_hare';
                teams[i].small_icon = 'head_hare';
                break;
            case 2:
                teams[i].name = 'Tortoise';
                teams[i].large_icon = 'helmet_tortoise';
                teams[i].small_icon = 'head_tortoise';
                break;
            case 3:
                teams[i].name = 'Corgi';
                teams[i].large_icon = 'helmet_corgi';
                teams[i].small_icon = 'head_corgi';
                break;
            case 4:
                teams[i].name = 'Cockatiel';
                teams[i].large_icon = 'helmet_cockatiel';
                teams[i].small_icon = 'head_cockatiel';
                break;
            case 5:
                teams[i].name = 'Pig';
                teams[i].large_icon = 'helmet_pig';
                teams[i].small_icon = 'head_pig';
                break;
            default:
                teams[i].name = 'BAD ID';
                teams[i].large_icon = 'missing_icon';
                teams[i].small_icon = 'missing_icon';
                break;
        };
    }
    return teams;
}

function updateScores(data){
    curTime = data.current_time;
    console.clear();
    console.log('Day ' + (data.sale_day+1) + ' of the race');

    let teams = data.scores;
    
    teams = sortTeams(teams);
    teams = formatScores(teams);

    rp.updatePresence({
        details: '3rd - ' + teams[2].name + ', 4th - ' + teams[3].name + ', 5th - ' + teams[4].name,
        state: teams[0].dist + 'km Traveled',
        largeImageKey: teams[0].large_icon,
        largeImageText: teams[0].name + ' - 1st - ' + teams[0].prog + '%',
        smallImageKey: teams[1].small_icon,
        smallImageText: teams[1].name + ' - 2nd - ' + teams[1].prog + '%',
        instance: true,
    });
    
    for(let i = 0; i < teams.length; i++){
        console.log(colorStr(addSpace(teams[i].name, 12), teams[i].teamid) +
        colorByRank(addSpace(teams[i].prog, maxLengths[scoreEnum.progress]), i) + " % Progress   " +
        addSpace(teams[i].dist, maxLengths[scoreEnum.distance]).yellow.bold + " km   " +
        addSpace(teams[i].boost, maxLengths[scoreEnum.boost]).yellow.bold + "x Boost   " +
        addSpace(teams[i].score, 6).yellow.bold + " % Score   " +
        teams[i].mult.yellow.bold + " Multiplier");
    }
}

function openSocket(){
    let ws = new WebSocket('wss://community.steam-api.com/websocket/');

    ws.on('open', ()=>{
        ws.send(JSON.stringify({ message: "subscribe", seqnum: 1, feed: "TeamEventScores" }));
        console.log('Opened socket and requested score subscription');
    });
    ws.on('message', (m)=>{
        m = JSON.parse(m);
        if(!m && m.message != "feedupdate"){ return; }
        if(m.feed != "TeamEventScores"){ return; }

        let data = JSON.parse(m.data);
        if(!data || !data.scores){ return; }
        updateScores(data);
    });
    ws.on('error', ()=>{
        console.log('Websocket error');
        try{ ws.close(); }
        catch(e){}
        openSocket();
    });
    ws.on('close', ()=>{
        console.log('Websocket closed');
    });
}
openSocket();