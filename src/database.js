const Database = require('@replit/database');
const { sendToHighCommand, clearChats } = require("./highCommand.js");

const db = new Database();

const setupGame = async () => {
  const users = {};
  const history = [];

  // await db.set("users", users);
  // await db.set("history", history);
  // await db.set("bounds", [15, 15])
  // await db.set("backups", {})
  // await clearChats();
  // await addHistoryMessage('Game Start!')
  // await makeBackup();

  await setNextResupplyTime();
  await updateCeasefire();

}

async function updateCeasefire() {
  const ceaseFireHourStart = process.env.CEASEFIRE_START
  const ceaseFireHourEnd = process.env.CEASEFIRE_END
  const currentTime = new Date();

  let ceaseFireEnd = null;
  let ceaseFireStart = null;
  let ceasefire = false;

  // The ceasefire is NOT currently in effect
  if (currentTime.getHours() >= ceaseFireHourEnd || currentTime.getHours() < ceaseFireHourStart) {
    ceasefire = false;
    ceaseFireStart = new Date();
    ceaseFireStart.setHours(ceaseFireHourStart, 0, 0, 0);
    if (currentTime.getHours() >= process.env.CEASEFIRE_END) {
      ceaseFireStart.setDate(currentTime.getDate() + 1);
    }
  } else { //The ceasefire is in effect
    ceasefire = true;
    ceaseFireEnd = new Date();
    ceaseFireEnd.setHours(ceaseFireHourEnd, 0, 0, 0);
  }
  await db.set('ceasefire', { active: ceasefire, start: ceaseFireStart, end: ceaseFireEnd })
}

async function setNextResupplyTime() {
  const now = new Date();
  const newResupplyTime = new Date()
  newResupplyTime.setHours(process.env.RESUPPLY_TIME, 0, 0, 0);
  if (now.getHours() >= process.env.RESUPPLY_TIME) { // 21 = 5PM
    newResupplyTime.setDate(newResupplyTime.getDate() + 1)
  }
  await db.set("resupplyTime", newResupplyTime.toString());
}

///////////////////////////////////////////
setupGame()
///////////////////////////////////////////

const clone = (json) => {
  return JSON.parse(JSON.stringify(json));
}

async function isCeasefireActive() {
  const ceasefireStats = await db.get("ceasefire");
  return ceasefireStats.active;
}

const addUser = async (id) => {

  const userDetails = {
    name: null,
    id,
    supply: 1,
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

const removeUser = async (id) => {
  const users = await db.get("users");
  const copy = {...users}
  delete copy[id];
  await setUsers(copy)
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
    const newUserData = { ...users };
    newUserData[userId] = userData;
    await setUsers(newUserData)
  }
}

const updateUserData = async (userId, updatedData) => {
  const userData = await getUser(userId);
  await updateUser(userId, { ...userData, ...updatedData });
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

const addToHistory = async (action, actorName, upgrades, targetSpace, targetName = '') => {
  let historyMessage = '';
  switch (action) {
    case ('fireRound'):
      historyMessage = `${actorName} fired a round at ${targetName} at position (${targetSpace.reverse()})`
      break;
    case ('fireSupply'):
      historyMessage = `${actorName} gave supply to ${targetName} at position (${targetSpace.reverse()})`
      break;
    case ('move'):
      const actor = await getUserByName(actorName);
      historyMessage = `${actorName} moved from (${actor.position.reverse()}) to (${targetSpace.reverse()})`
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
  const ceasefire = await db.get("ceasefire");
  let playerData = null
  if (id) {
    playerData = await getUser(id);
    delete playerData.id
  }
  let sanitizedUsers = Object.keys(users).map(userKey => {
    const userData = users[userKey]
    const newUserData = { ...userData }
    delete newUserData.id
    return newUserData
  }).filter((userData) => userData.position || userData.name)
  const gameStateToReturn = {
    userData: sanitizedUsers,
    history,
    bounds,
    player: playerData,
    nextResupplyTime,
    ceasefire
  }
  if (!id) {
    delete gameStateToReturn.player;
    gameStateToReturn.spectator = true;
  }
  return gameStateToReturn;
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
  if (currentBackups['1Hour']) {
    currentBackups['2Hour'] = { ...currentBackups['1Hour'] };
  }
  currentBackups['1Hour'] = { ...gameState }
  await db.set('backups', currentBackups);
}

async function restoreFromBackup(time) {
  const backups = await db.get('backups');
  const backupData = backups[time];
  await db.set('history', backupData.history);
  await db.set('users', backupData.users);
  await db.set('bounds', backupData.bounds);
  await db.set('jury', backupData.jury);
  await updateCeasefire();
  await addHistoryMessage('Gamestate restored from backup')
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
  makeBackup,
  updateCeasefire,
  isCeasefireActive,
  updateUserData,
  removeUser,
}