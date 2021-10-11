const axios = require('axios');

const highCommandUrl = 'https://TankTacticsHighCommand.drewcolgin.repl.co'
const eventEndpoint = '/api/event'
const roleEndpoint = '/api/updateRole'
const clearChatsEndpoint = '/api/clearChats'

async function sendToHighCommand(message) {
  try {
    await axios.post(`${highCommandUrl}${eventEndpoint}`,{message, key: process.env.ADMIN_KEY})
  } catch {
    console.log('unable to send to high command')
  }
}

async function updateRole(playerId, role) {
  await axios.put(`${highCommandUrl}${roleEndpoint}`, {id: playerId, role, key: process.env.ADMIN_KEY})
}

async function clearChats() {
  await axios.post(`${highCommandUrl}${clearChatsEndpoint}`, {key: process.env.ADMIN_KEY})
}

module.exports = { sendToHighCommand, updateRole, clearChats }