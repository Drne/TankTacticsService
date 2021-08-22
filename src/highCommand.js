const axios = require('axios');

const highCommandUrl = 'https://TankTacticsHighCommand.drewcolgin.repl.co'
const eventEndpoint = '/api/event'
const roleEndpoint = '/api/updateRole'
const clearChatsEndpoint = '/api/clearChats'

async function sendToHighCommand(message) {
  await axios.post(`${highCommandUrl}${eventEndpoint}`,{message})
}

async function updateRole(playerId, role) {
  await axios.put(`${highCommandUrl}${roleEndpoint}`, {id: playerId, role})
}

async function clearChats() {
  await axios.post(`${highCommandUrl}${clearChatsEndpoint}`)
}

module.exports = { sendToHighCommand, updateRole, clearChats }