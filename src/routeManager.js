const {addPlayer, registerPlayer, getGamestate, isValidID, isNameTaken} = require("./stateMachine.js")
const { restoreFromBackup} = require("./database.js")

const addRoutes = (app, updateUsers) => {
    app.get('/', (req, res) => {
        res.send('Hello Express app');
    });

// Player info
    app.get('/api/gameState/:id', async (req, res) => {
        const idIsValid = await isValidID(req.params.id);
        if (!idIsValid) {
          res.sendStatus(404);
        } else {
          const users = await getGamestate(req.params.id)
          res.send(users);
        }
    });

// Register player
    app.put('/api/register/:id', async (req, res) => {
          try {
            await registerPlayer(req.params.id, req.body.name)
            res.sendStatus(200);
            await updateUsers();
          } catch (error) {
            console.log(error);
            res.sendStatus(400);
          }
    });

//Generate ID
    app.get('/api/generate', async (req, res) => {
        res.send(await addPlayer())
    })

// check valid ID
    app.get('/api/check/:id', async (req, res) => {
      const idIsValid = await isValidID(req.params.id);
      if (idIsValid) {
        res.sendStatus(200);
      } else {
        res.sendStatus(404);
      }
    })

    // check if name is taken
    app.get('/api/nameCheck/:name', async (req, res) => {
      const isTaken = await isNameTaken(req.params.name);
      if (!isTaken) {
        res.sendStatus(200);
      } else {
        res.sendStatus(409);
      }
    })

    // restore backup
    app.post('/api/restoreBackup', async (req, res) => {
      try {
        await restoreFromBackup(req.body.time);
        res.sendStatus(200);
        await updateUsers();
      } catch {
        res.sendStatus(400);
      }
    })
}

module.exports = { addRoutes }