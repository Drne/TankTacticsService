import {addUser, getAllUsers, getUser, getUserByName, setUsers, updateUser} from "./database.js";

export const awardDailySupplyAndVotes = () => {
    const users = getAllUsers();
    let newUsers = {...users};
    newUsers = newUsers.map((user) => ({...user, supply: user.alive ? user.supply : user.supply + 1, votes: user.alive ? 0 : 1}))
    setUsers(newUsers)
}

// Remove remaining votes
// reset voting status
export const cleanUpDay = () => {
    const users = getAllUsers();
    let newUsers = {...users};
    newUsers = newUsers.map((user) => ({...user, votes: 0, votesForToday: 0}))
    setUsers(newUsers)
}

/////////// Actions

export const isValidAction = (action, actor, targetSpace, upgrades = 0) => {
    const playerPosition = getPlayerAtPosition(actor);
    switch (action) {
        case ('move'):
            return !isOutOfRange(playerPosition, targetSpace)
                && !getPlayerAtPosition(targetSpace)
                && playerCanTakeAction(actor, 1 + upgrades);

        case ('fireRound'):
            return !isOutOfRange(playerPosition, targetSpace)
                && getPlayerAtPosition(targetSpace)
                && playerCanTakeAction(actor, 1 + upgrades);
        case ('fireSupply'):
            return !isOutOfRange(playerPosition, targetSpace)
                && getPlayerAtPosition(targetSpace)
                && playerCanTakeAction(actor, 1 + upgrades);
        case ('vote'):
            return playerCanVote(actor);
        default:
            throw Error('Invalid action validation')
    }
}

export const executeMove = (actorID, targetSpace, upgrades) => {
    const playerAtSpace = getPlayerAtPosition(targetSpace);
    if (playerAtSpace) {
        throw new Error('Invalid Move. Player at position.')
    }

    getUser(actorID).then((userData) => {
        userData.position = targetSpace;
        userData.supply -= 1 + upgrades;
        updateUser(actorID, userData)
    });

}

export const executeFireRound = (actorID, targetSpace, upgrades) => {
    const playerAtSpace = getPlayerAtPosition(targetSpace);

    getUser(actorID).then((userData) => {

        userData.supply -= 1 + upgrades;
        updateUser(actorID, userData)
    });

    getUser(playerAtSpace.id).then((userData) => {

        userData.health -= 1;
        if (userData.health <= 0) {
            handlePlayerElimination(playerAtSpace.id)
        }
        updateUser(actorID, userData)
    });
}

export const executeFireSupply = (actorID, targetSpace, upgrades) => {
    const playerAtSpace = getPlayerAtPosition(targetSpace);

    getUser(actorID).then((userData) => {
        userData.supply -= 1 + upgrades;
        updateUser(actorID, userData)
    });

    getUser(playerAtSpace.id).then((userData) => {

        userData.supply += 1;
        if (userData.health <= 0) {
            handlePlayerElimination(playerAtSpace.id)
        }
        updateUser(actorID, userData)
    });
}

export const voteForPlayer = (actorID, targetPlayerName) => {
    getUser(actorID).then((user) => {
        updateUser(actorID, {...user, votes: 0})
    })
    getUserByName(targetPlayerName).then((user) => {
        updateUser(user,
            {
                ...user,
                votesForToday: user.votesForToday + 1,
                supply: user.supply + 1 ? user.votesForToday === 2 : user.supply
            })
    })
}

////////////// Game Setup

export const addPlayer = () => {
    const playerID = generateRandomID();
    addUser(playerID);
    return playerID;
}

export const registerPlayer = (id, name) => {
    getUser(id).then(userData => updateUser(id, {...userData, name, position: getRandomPosition()}))
}

const getRandomPosition = () => {
    return [0,0];
    // TODO: MAKE real
}

////////////// Utility

export const getPlayerAtPosition = (position) => {
    const users = getAllUsers();
    const usersAtPosition = users.filter((user) => user.position === position)

    if (usersAtPosition) {
        return usersAtPosition[0];
    }
}

export const handlePlayerElimination = (eliminatedPlayerId) => {
    getUser(eliminatedPlayerId).then(user => {
        updateUser(eliminatedPlayerId, {...user, supply: 0, votes: 1, alive: false, position: null, health: 0})
    });
}

export const isOutOfRange = (playerPosition, targetPosition, range) => {
    const shotDistanceX = Math.abs(playerPosition[1] - targetPosition[1])
    const shotDistanceY = Math.abs(playerPosition[0] - targetPosition[0])
    return (targetPosition[0] < 0 || targetPosition[1] < 0) || (shotDistanceX > range || shotDistanceY > range)
}

export const playerCanTakeAction = (id, actionCost) => {
    const playerInfo = getUser(id);
    return playerInfo.alive && playerInfo.supply >= actionCost && playerInfo.health > 0;
}

export const playerCanVote = (id) => {
    const playerInfo = getUser(id);
    return !playerInfo.alive && playerInfo.votes > 0;
}

function generateRandomID() {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < 5; i++ ) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
    }
    return result;
}