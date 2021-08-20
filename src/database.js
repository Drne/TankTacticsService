const Database = require('@replit/database');
const { sendToHighCommand } = require("./highCommand.js");

const db = new Database();

const setupGame = async () => {
  const users = {};
  const history = [];

  // await db.set("users", users);
  // await db.set("history", history);
  // await db.set("bounds", [15,15])
  // await db.set("jury", [])
  // await db.set("backups", {})

  const newResupplyTime = new Date()
    newResupplyTime.setDate(newResupplyTime.getDate() + 1)
    newResupplyTime.setHours(21, 0, 0, 0)
  db.set("resupplyTime", newResupplyTime.toString())

  await makeBackup();
}

setupGame()

const clone = (json) => {
  return JSON.parse(JSON.stringify(json));
}

const addUser = async (id) => {

  const userDetails = {
    name: null,
    id,
    supply: 5,
    votes: 0,
    alive: true,
    position: null,
    health: 3,
    votesForToday: 0,
    kills: 0,
  }

  await db.get("users").then(async users => {
    const newUsers = clone(users);
    newUsers[id] = userDetails;
    await db.set("users", newUsers)
  })
}

const getUser = async (id) => {
  return db.get("users").then((users) => {
    if (users && users[id]) {
      return users[id]
    } else {
      return null
    }
  });
}

const setNextResupply = async (newResupplyTime) => {
  return await db.set("resupplyTime", newResupplyTime.toString())
}

const getPlayerLocation = async (id) => {
  return await getUser(id).then((user) => user.position)
}

const updateUser = async (userId, userData) => {
  const users = await db.get("users")
  if (users[userId]) {
    const newUserData = {...users};
    newUserData[userId] = userData;
    await setUsers(newUserData) 
  }
}

const getAllUsers = async () => {
  return await db.get("users").then((users) => {
    return users;
  });
}

const setUsers = async (users) => {
  await db.set("users", users);
}

const getUserByName = async (username) => {
  return await getAllUsers().then(users => {
    const matchingUsers = Object.values(users).filter(user => user.name === username)
    if (matchingUsers) {
      return matchingUsers[0]
    }
  })
}

const getMapBounds = async () => {
  return await db.get("bounds");
}

const addToHistory = async (action, actorName, upgrades, targetSpace, targetName='') => {
  let historyMessage = '';
  switch (action) {
    case ('fireRound'):
      historyMessage = `${actorName} fired a round at ${targetName} at position (${targetSpace})`
      break;
    case ('fireSupply'):
      historyMessage = `${actorName} gave supply to ${targetName} at position (${targetSpace})`
      break;
    case ('move'):
      historyMessage = `${actorName} moved to position (${targetSpace})`
      break;
    case ('vote'):
      historyMessage = `${actorName} has voted for ${targetName}`
  }
  if (upgrades) {
    historyMessage += ` using ${upgrades} upgrades.`
  }
  await addHistoryMessage(historyMessage);
}

const addHistoryMessage = async (historyMessage) => {
  const historyEntry = {
    time: Date.now(),
    message: historyMessage,
  }
  
  const oldHistory = await db.get('history')
  await db.set('history', [...oldHistory, historyEntry])
  await sendToHighCommand(historyMessage);
}

const getGameState = async (id) => {
  const history = await db.get('history')
  const users = await db.get("users");
  const bounds = await db.get("bounds");
  const nextResupplyTime = await db.get("resupplyTime")
  const playerData = await getUser(id);
  delete playerData.id

  let sanitizedUsers = Object.keys(users).map(userKey => {
    const userData = users[userKey]
    const newUserData = {...userData}
    delete newUserData.id
    return newUserData
  }).filter((userData) => userData.position || userData.name)
  return {
    userData: sanitizedUsers,
    history,
    bounds,
    player: playerData,
    nextResupplyTime
  }
}

async function makeBackup() {
  const history = await db.get('history')
  const users = await db.get("users");
  const bounds = await db.get("bounds");
  const jury = await db.get("jury");
  const nextResupplyTime = await db.get("resupplyTime")
  const gameState = {
    history,
    users,
    bounds,
    jury,
    nextResupplyTime,
  }
  const currentBackups = db.get('backups');
  if (currentBackups['1Hour']){
    currentBackups['2Hour'] = {...currentBackups['1Hour']};
  }
  currentBackups['1Hour'] = {...gameState}
  await db.set('backups', currentBackups);
}

async function restoreFromBackup(time) {
  const backups = await db.get('backups');
  const backupData = backups[time];
  await db.set('history', backupData.history);
  await db.set('users', backupData.users);
  await db.set('bounds', backupData.bounds);
  await db.set('jury', backupData.jury);
}

async function isIdInDb(id) {
  const user = await getUser(id);
  return !!user;
}

module.exports = {
  setupGame,
  getUser,
  getUserByName,
  getAllUsers,
  updateUser,
  addUser,
  getMapBounds,
  getGameState,
  isIdInDb,
  setUsers,
  setNextResupply,
  addToHistory,
  addHistoryMessage,
  restoreFromBackup,
  makeBackup
}