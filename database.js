const Database = require('@replit/database')

const db = new Database()

export const clone = (json) => {
  return JSON.parse(JSON.stringify(json));
}

export const addUser = (id, name) => {

  const userDetails = {
    name,
    supply: 0,
    votes: 0,
    alive: true,
    position: null,
    health: 3,
    votedToday: false,
  }

  db.get("users").then(users => {
    const newUsers = clone(users);
    newUsers[id] = userDetails;
    db.set("users", newUsers)
  })
}

export const getUser = (id) => {
  db.get("users").then(users => {
    return users[id];
  })
}

export const getAllUsers = () => {
  db.get("users").then(users => {
    return users;
  })
}

export const setUsers = (users) => {
  db.set("users", users);
}

export const setupGame = () => {
  const users = {};
  const history = [];

  db.set("users", users);
  db.set("history", history);
}