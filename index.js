const express = require('express');
const bodyParser = require("body-parser");
const { addRoutes } = require("./src/routeManager.js")
const cors = require("cors");
const { isValidAction, executeAction, getGamestate, isValidID, awardDailySupplyAndVotes, cleanUpDay } = require("./src/stateMachine.js")
const schedule = require('node-schedule');
const { makeBackup } = require('./src/database.js'); 

const http = require('http');
const socketio = require("socket.io");

const app = express();


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors())

// websocket 
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const socketClients = {}

io.on('connection', (socket) => {
  socket.on('action', async (msg) => {
    const { action, actor, targetSpace, upgrades } = msg;
    //handle action
    ///check is valid action
    if (await isValidAction(action, actor, targetSpace, upgrades)) {
      console.log('action is valid');
      await executeAction(action, actor, targetSpace, upgrades)
      console.log('action executed');

      const sockets = await io.fetchSockets()
      sockets.forEach(async (sock) => {
        if (sock.playerId) {
          playerGamestate = await getGamestate(sock.playerId)
          sock.emit('gameStateUpdate', playerGamestate)
        }
      })
    } else {
      socket.emit('invalid', msg)
    }

  })

  socket.on('register', async (msg) => {
    const idIsValid = await isValidID(msg);
    if (idIsValid) {
      console.log('registering player', msg)
      socket.playerId = msg
    } else {
      console.log('unlog plaease')
      socket.emit('unlog')
    }
  })

  socket.on('message', (msg) => {
    console.log(msg)
  })
});

async function updateAllClientsGamestate() {
  const sockets = await io.fetchSockets()
  sockets.forEach(async (sock) => {
    if (sock.playerId) {
      playerGamestate = await getGamestate(sock.playerId)
      sock.emit('gameStateUpdate', playerGamestate)
    }
  })
}

/// Chron jobs for giving out supply/votes
const awardJob = schedule.scheduleJob({ hour: 19 }, async () => {
  await awardDailySupplyAndVotes();
  await updateAllClientsGamestate();
})

//backup on the half hour
const scheduleBackup = schedule.scheduleJob({minute: 30}, async () => {
  await makeBackup();
})

// const endDayJob = schedule.scheduleJob({second: 30}, async () => {
//   await cleanUpDay();
//   await updateAllClientsGamestate();
// })



app.use(express.static('public'));

addRoutes(app, updateAllClientsGamestate)

app.listen(3001, () => console.log('server started'));
server.listen(3000, () => console.log('tada'))

