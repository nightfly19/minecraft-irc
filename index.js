var irc = require("irc");
var _ = require("underscore");
var settings = require("./settings.json");
var Game = require('minecraft-control').Game;

var irc_conn;
var firstJoined = true;
var game = new Game(settings.game.options);

process.on( 'SIGINT', function() {
  console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
  if(game.running){
    game.stop();
  }
  irc_conn.disconnect("Quiting");
})

game.on('start', function(){
  irc_conn.say(settings.irc.channel, irc.colors.wrap("light_green", "Server has running"))
});

game.on('stop', function(){
  irc_conn.say(settings.irc.channel, irc.colors.wrap("yellow", "Server has stopped"))
});

game.on('error', function(error){
  console.log(error);
});

game.on('joined', function(player){
  irc_conn.notice(settings.irc.channel, player + " has joined the game");
});

game.on('left', function(player){
  irc_conn.notice(settings.irc.channel, player + " has left the game");
});

game.on('died', function(player, cause){
  irc_conn.notice(settings.irc.channel, player + " " + cause);
});

game.on('said', function(player, said){
  irc_conn.say(settings.irc.channel, player + ": " + said);
});

game.on('action', function(player, action){
  irc_conn.notice(settings.irc.channel, "* " + player + " " + action);
});

game.on('earnedAchievement', function(player, achievement){
  irc_conn.notice(settings.irc.channel, player + " has earned achievement: " + achievement);
});

irc_conn = new irc.Client(settings.irc.server, settings.irc.nick, settings.irc.options);

irc_conn.on('netError', function(error){
  console.log(error);
  if(error.code == 'ENOTFOUND'){
    process.exit(1);
  }
});

irc_conn.on('registered', function(){
  console.log("Registered!!!!");
  irc_conn.join(settings.irc.channel + " " + settings.irc.channelKey);
});

irc_conn.on('error', function(error){
  console.log("IRC error");
});

var commandMatcher = new RegExp("^"+settings.irc.prefix+"([a-z]+)(\\s+)?(.*)$");

var commands = {
  help: function(from, message, raw){
    if (message == ""){
      irc_conn.say(raw.args[0], "Commands: ");
      irc_conn.say(raw.args[0], "  help    - get help");
      irc_conn.say(raw.args[0], "  status  - is the server currently up");
      irc_conn.say(raw.args[0], "  start   - start the server");
      irc_conn.say(raw.args[0], "  stop    - stop the server");
      irc_conn.say(raw.args[0], "  quit    - stop the server and quit irc");
      irc_conn.say(raw.args[0], "  command - send the server a command");
      //irc_conn.say(raw.args[0], "  players - How many players current on the server");
    }
  },
  start: function(from, message, raw){
    if(_.indexOf(settings.irc.ops, from) != -1){
      if(game.running){
        irc_conn.say(raw.args[0], "The server is already running");
      }
      else{
        game.start();
      }
    }
    else{
      irc_conn.say(raw.args[0], from + " you are not permitted to start the server");
    }
  },
  stop: function(from, message, raw){
    if(_.indexOf(settings.irc.ops, from) != -1){
      if(!game.running){
        irc_conn.say(raw.args[0], "The server is not running");
      }
      else{
        game.stop();
      }
    }
    else{
      irc_conn.say(raw.args[0], from + " you are not permitted to stop the server");
    }
  },
  quit: function(from, message, raw){
    if(_.indexOf(settings.irc.ops, from) != -1){
      if(game.running){
        game.stop();
      }
      irc_conn.disconnect();
    }
    else{
      irc_conn.say(raw.args[0], from + " you are not permitted to quit the bot");
    }
  },
  command: function(from, message, raw){
    if(_.indexOf(settings.irc.ops, from) != -1){
      if(!game.running){
        irc_conn.say(raw.args[0], "The server is not running");
      }
      else{
        game.sendCommand(message);
      }
    }
    else{
      irc_conn.say(raw.args[0], from + " you are not permitted to stop the server");
    }
  },
  status: function(from, message, raw){
    irc_conn.say(raw.args[0], "server is " + (game.running ? "running" : "not running"));
  }
};

irc_conn.addListener('message'+settings.irc.channel, function(from, message, raw){
  var isCommand = commandMatcher.exec(message);
  if(isCommand){
    var command = commands[isCommand[1]];
    if(command){
      command(from, isCommand[3], raw);
    }
  }
  else{
    if(game.running){
      game.sendCommand("say " + from + ": " + message);
    }
  }
});

irc_conn.on('raw', function(){
  console.log(arguments[0].args.join(" "));
});


game.start();
