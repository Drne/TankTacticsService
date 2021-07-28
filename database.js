import Database from '@replit/database'

const db = new Database()

export const clone = (json) => {
  return JSON.parse(JSON.stringify(json));
}

export const addUser = (id) => {

  const userDetails = {
    name: null,
    id,
    supply: 0,
    votes: 0,
    alive: true,
    position: null,
    health: 3,
    votedToday: false,
    votesForToday: 0,
  }

  db.get("users").then(users => {
    const newUsers = clone(users);
    newUsers[id] = userDetails;
    db.set("users", newUsers)
  })
}

export const getUser = async (id) => {
  return db.get("users").then((users) => {
    return users[id]
  });
}

export const getPlayerLocation = (id) => {
  return getUser(id).then((user) => user.position)
}

export const updateUser = (userId, userData) => {
  db.get("users").then((users) => {
    setUsers({...users, userId: userData})
  })
}

export const getAllUsers = async () => {
  return await db.get("users").then((users) => {
    return users.values;
  });
}

export const setUsers = (users) => {
  db.set("users", users);
}

export const getUserByName = (username) => {
  return getAllUsers().then(users => {
    return users.filter(user => user.name === username)[0]
  })
}

export const setupGame = () => {
  const users = {};
  const history = [];

  db.set("users", users);
  db.set("history", history);
}