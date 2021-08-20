const { addUser, getAllUsers, getUser, getUserByName, setUsers, updateUser, getMapBounds, getGameState, isIdInDb, setNextResupply, addToHistory, addHistoryMessage } = require('./database')

const awardDailySupplyAndVotes = async () => {
  const newResupplyTime = new Date()
  newResupplyTime.setDate(newResupplyTime.getDate() + 1)
  newResupplyTime.setHours(21, 0, 0, 0)
  await setNextResupply(newResupplyTime);

  const users = await getAllUsers();
  if (users) {
    let newUsers = { ...users };
    Object.keys(newUsers).forEach((userID) => {
      user = newUsers[userID];
      newUsers[userID] = { ...user, supply: !user.alive ? user.supply : user.supply + 1, votes: user.alive ? 0 : Math.min(user.votes, 2) }
    })

    await setUsers(newUsers)
  }
}

// Remove remaining votes
// reset voting status
const cleanUpDay = async () => {
  const users = await getAllUsers();
  if (users) {
    let newUsers = { ...users };
    Object.keys(newUsers).forEach((userID) =>
      newUsers[userID] = { ...newUsers[userID], votes: 0, votesForToday: 0 })
    await setUsers(newUsers)
  }
}

/////////// Actions

const isValidAction = async (action, actor, targetSpace, upgrades = 0) => {
  const range = 2 + upgrades;
  const actorData = await getUser(actor);
  const actorPosition = actorData.position;
  const playerAtTarget = await getPlayerAtPosition(targetSpace);
  switch (action) {
    case ('move'):
      return !isOutOfRange(actorPosition, targetSpace, range)
        && !playerAtTarget
        && await playerCanTakeAction(actor, 1 + upgrades);

    case ('fireRound'):
      return !isOutOfRange(actorPosition, targetSpace, range)
        && playerAtTarget
        && await playerCanTakeAction(actor, 1 + upgrades);
    case ('fireSupply'):
      return !isOutOfRange(actorPosition, targetSpace, range)
        && playerAtTarget
        && await playerCanTakeAction(actor, 1 + upgrades);
    case ('vote'):
      return await playerCanVote(actor);
    default:
      throw Error('Invalid action validation')
  }
}

const executeAction = async (action, actor, targetSpace, upgrades = 0) => {
  const actorData = await getUser(actor)
  const actorID = actorData.id;
  const playerAtSpace = await getPlayerAtPosition(targetSpace);
  await addToHistory(action, actorData.name, upgrades, targetSpace, playerAtSpace ? playerAtSpace.name : '')
  switch (action) {
    case ('move'):
      await executeMove(actorID, targetSpace, upgrades);
      break;
    case ('fireRound'):
      await executeFireRound(actorID, targetSpace, upgrades);
      break;
    case ('fireSupply'):
      await executeFireSupply(actorID, targetSpace, upgrades);
      break;
    case ('vote'):
      await voteForPlayer(actor, playerAtSpace.name);
  }
}

const executeMove = async (actorID, targetSpace, upgrades) => {
  return await getUser(actorID).then(async (userData) => {
    userData.position = targetSpace;
    userData.supply -= 1 + upgrades;
    await updateUser(actorID, userData)
  });

}

const executeFireRound = async (actorID, targetSpace, upgrades) => {
  const playerAtSpace = await getPlayerAtPosition(targetSpace);

  await getUser(actorID).then(async (userData) => {

    userData.supply -= 1 + upgrades;
    await updateUser(actorID, userData)
  });

  const userData = await getUser(playerAtSpace.id)
  userData.health -= 1;
  if (userData.health <= 0) {
    console.log('deado')
    await handlePlayerElimination(playerAtSpace.id, actorID)
  } else {
    await updateUser(playerAtSpace.id, userData)
  }
}

const executeFireSupply = async (actorID, targetSpace, upgrades) => {
  const playerAtSpace = await getPlayerAtPosition(targetSpace);

  await getUser(actorID).then((userData) => {
    userData.supply -= 1 + upgrades;
    updateUser(actorID, userData)
  });

  await getUser(playerAtSpace.id).then((userData) => {

    userData.supply += 1;
    updateUser(playerAtSpace.id, userData)
  });
}

const voteForPlayer = async (actorID, targetPlayerName) => {
  const actor = await getUser(actorID)
  await updateUser(actorID, { ...actor, votes: actor.votes - 1 })

  const targetUser = await getUserByName(targetPlayerName);
  await updateUser(targetUser.id,
    {
      ...targetUser,
      votesForToday:  targetUser.votesForToday === 2 ?0 : targetUser.votesForToday + 1,
      supply: targetUser.votesForToday === 2 ? targetUser.supply + 1 : targetUser.supply
    })

  if (targetUser.votesForToday === 2) {
    await addHistoryMessage(`The Jury has awarded ${targetUser.name} an extra supply`)
  }
}

const getGamestate = async (id) => {
  const gamestate = await getGameState(id);
  return gamestate;
}

////////////// Game Setup

const addPlayer = async () => {
  const playerID = generateRandomID();
  await addUser(playerID);
  return playerID;
}

const registerPlayer = async (id, name) => {
  const userData = await getUser(id)
  const userWithName = await getUserByName(name);
  if (userWithName) {
    throw Error();
  }
  const randomPosition = await getRandomPosition()
  await updateUser(id, { ...userData, name, position: randomPosition })
  await addHistoryMessage(`${name} has joined the game`)
}

const generateRandomNumber = (upperBound) => {
  return Math.floor(Math.random() *
    upperBound)
}

const getRandomPosition = async () => {
  const mapBounds = await getMapBounds()

  let randomPosition = [generateRandomNumber(mapBounds[0]), generateRandomNumber(mapBounds[1])]
  let playerAtPos = await getPlayerAtPosition(randomPosition);
  while (playerAtPos) {
    randomPosition = [generateRandomNumber(mapBounds[0]), generateRandomNumber(mapBounds[1])]
    playerAtPos = await getPlayerAtPosition(randomPosition)
  }
  return randomPosition;

}

////////////// Utility

const getPlayerAtPosition = async (position) => {
  const users = await getAllUsers();
  const usersAtPosition = Object.values(users).filter((user) => user && user.position && user.position[0] === position[0] && user.position[1] === position[1])

  if (usersAtPosition) {
    return usersAtPosition[0];
  }
}

const handlePlayerElimination = async (eliminatedPlayerId, killerId) => {
  const user = await getUser(eliminatedPlayerId)
    //TODO: Set votes to 1
  await updateUser(eliminatedPlayerId, { ...user, supply: 0, votes: 3, alive: false, position: null, health: 0 })
  const actor = await getUser(killerId);
  await updateUser(killerId, {...actor, kills: actor.kills + 1})
  await addHistoryMessage(`${user.name} has been eliminated by ${actor.name}`)

}

const isOutOfRange = (playerPosition, targetPosition, range) => {
  const shotDistanceX = Math.abs(playerPosition[1] - targetPosition[1])
  const shotDistanceY = Math.abs(playerPosition[0] - targetPosition[0])
  return (targetPosition[0] < 0 || targetPosition[1] < 0) || (shotDistanceX > range || shotDistanceY > range)
}

const playerCanTakeAction = async (id, actionCost) => {
  const playerInfo = await getUser(id);
  return playerInfo.alive && playerInfo.supply >= actionCost && playerInfo.health > 0;
}

const playerCanVote = async (id) => {
  const playerInfo = await getUser(id);
  return !playerInfo.alive && playerInfo.votes > 0;
}

function generateRandomID() {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < 5; i++) {
    result += characters.charAt(Math.floor(Math.random() *
      charactersLength));
  }
  return result;
}

function isValidID(id) {
  return isIdInDb(id);
}

async function isNameTaken(name) {
  const matchingUser = await getUserByName(name);
  return !!matchingUser
}

module.exports = {
  playerCanVote,
  playerCanTakeAction,
  isOutOfRange,
  handlePlayerElimination,
  getPlayerAtPosition,
  registerPlayer,
  addPlayer,
  voteForPlayer,
  executeAction,
  isValidAction,
  awardDailySupplyAndVotes,
  cleanUpDay,
  getGamestate,
  isValidID,
  isNameTaken
}