const axios = require('axios');

const highCommandUrl = 'https://TankTacticsHighCommand.drewcolgin.repl.co'
const eventEndpoint = '/api/event'

async function sendToHighCommand(message) {
  await axios.post(`${highCommandUrl}${eventEndpoint}`,{message})
}

module.exports = { sendToHighCommand }