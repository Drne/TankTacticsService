import {addPlayer, registerPlayer} from "./stateMachine.js";

export const addRoutes = (app) => {
    app.get('/', (req, res) => {
        res.send('Hello Express app');
    });

// Handle player actions
    app.get('/api/:id/:action', (req, res) => {
        res.send(req.params.id);
    });

// Player info
    app.get('/api/gameState', (req, res) => {
        res.send([]);
    });

// Register player
    app.put('/api/register/id:', (req, res) => {
        registerPlayer()
        res.send(req.query.q);
    });

//Generate ID
    app.get('/api/generate', (req, res) => {
        res.send(addPlayer())
    })
}