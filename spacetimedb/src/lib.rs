use spacetimedb::{ReducerContext, Table, rand::seq::SliceRandom};

use crate::user::{User, user as _};

pub mod game;
pub mod staging;
pub mod types;
pub mod user;

#[spacetimedb::reducer(init)]
pub fn init(_ctx: &ReducerContext) {
    // Called when the module is initially published
}

#[spacetimedb::reducer(client_connected)]
pub fn identity_connected(ctx: &ReducerContext) {
    // Called everytime a new client connects

    let user = ctx.db.user().identity().find(ctx.sender());

    if let Some(user) = user {
        ctx.db.user().identity().update(User {
            online: true,
            ..user
        });
    } else {
        let mut rng = ctx.rng();

        let adj = names::ADJECTIVES.choose(&mut rng).unwrap();
        let noun = names::NOUNS.choose(&mut rng).unwrap();

        let name = format!("{}-{}", adj, noun);

        ctx.db.user().insert(User {
            identity: ctx.sender(),
            name,
            online: true,
            games_played: 0,
            games_won: 0,
            games_loss: 0,
        });
    }
}

#[spacetimedb::reducer(client_disconnected)]
pub fn identity_disconnected(ctx: &ReducerContext) {
    // Called everytime a client disconnects
    let user = ctx.db.user().identity().find(ctx.sender());

    if let Some(user) = user {
        ctx.db.user().identity().update(User {
            online: false,
            ..user
        });
    }
}
