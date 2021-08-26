const { addPlayer, registerPlayer, getGamestate, isValidID, isNameTaken, getSpectatorGamestate } = require("./stateMachine.js")
const { restoreFromBackup, updateUserData, removeUser, getUserByName } = require("./database.js")

const addRoutes = (app, updateUsers, unlogId) => {
  app.get('/', (req, res) => {
    res.send('Hello Express app');
  });

  // Player info
  app.get('/api/gameState/:id', async (req, res) => {
    const idIsValid = await isValidID(req.params.id);
    if (req.params.id === 'spectator') {
      const gameState = await getSpectatorGamestate();
      res.send(gameState);
    } else if (!idIsValid) {
      res.sendStatus(404);
    } else {
      const users = await getGamestate(req.params.id)
      res.send(users);
    }
  });

  // Register player
  app.put('/api/register/:id', async (req, res) => {
    try {
      if (req.body.key === process.env.ADMIN_KEY) {
        await registerPlayer(req.params.id, req.body.name)
        res.sendStatus(200);
        await updateUsers();
      } else {
        res.sendStatus(401);
      }
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  });

  //Generate ID
  app.get('/api/generate', async (req, res) => {
    try {
      if (req.body.key === process.env.ADMIN_KEY) {
        res.send(await addPlayer())
      } else {
        res.sendStatus(401)
      }
    } catch {
      res.sendStatus(500)
    }
  })

  // check valid ID
  app.get('/api/check/:id', async (req, res) => {
    if (req.params.id === 'spectator') {
      res.sendStatus(200);
    } else {
      res.sendStatus(200);
      // const idIsValid = await isValidID(req.params.id);
      // if (idIsValid) {
      //   res.sendStatus(200);
      // } else {
      //   res.sendStatus(404);
      // }
    }
  })

  // check if name is taken
  app.get('/api/nameCheck/:name', async (req, res) => {
    try {
      if (req.body.key === process.env.ADMIN_KEY) {
        const isTaken = await isNameTaken(req.params.name);
        if (!isTaken) {
          res.sendStatus(200);
        } else {
          res.sendStatus(409);
        }
      } else {
        res.sendStatus(401);
      }
    } catch {
      res.sendStatus(500);
    }
  })

  // restore backup
  app.post('/api/restoreBackup', async (req, res) => {
    try {
      if (req.body.key === process.env.ADMIN_KEY) {
        await restoreFromBackup(req.body.time);
        await updateUsers();
        res.sendStatus(200);
      } else {
        res.sendStatus(401);
      }
    } catch {
      res.sendStatus(500);
    }
  })

  // manually set player data
  app.post('/api/setUserValues', async (req, res) => {
    try {
      if (req.body.key === process.env.ADMIN_KEY) {
        updateUserData(req.body.userId, req.body.userData)
        res.sendStatus(200);
        await updateUsers();
      } else {
        res.sendStatus(401);
      }
    } catch {
      res.sendStatus(500);
    }
  })


  // manually set player data
  app.post('/api/concede', async (req, res) => {
    try {
      if (req.body.key === process.env.ADMIN_KEY) {
        await removeUser(req.body.userId);
        await unlogId(req.body.userId);
        res.sendStatus(200);
        await updateUsers();
      } else {
        res.sendStatus(401);
      }
    } catch {
      res.sendStatus(500);
    }
  })

  // manually set player data
  app.get('/api/id', async (req, res) => {
    try {
      if (req.body.key === process.env.ADMIN_KEY) {
        const user = await getUserByName(req.body.userName);
        res.send(user.id);
      } else {
        res.sendStatus(401);
      }
    } catch {
      res.sendStatus(500);
    }
  })
}

module.exports = { addRoutes }