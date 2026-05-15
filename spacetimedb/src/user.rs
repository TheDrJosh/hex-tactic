use spacetimedb::{AnonymousViewContext, Identity, ReducerContext, SpacetimeType, view};

#[spacetimedb::table(accessor = user, public)]
pub struct User {
    #[primary_key]
    pub identity: Identity,

    pub name: String,

    #[index(btree)]
    pub online: bool,

    pub games_played: u32,
    pub games_won: u32,
    pub games_loss: u32,
}

#[derive(Debug, thiserror::Error)]
pub enum LoginError {
    #[error("invalid name")]
    InvalidName,
}

#[spacetimedb::reducer]
pub fn set_user_name(ctx: &ReducerContext, name: String) -> Result<(), LoginError> {
    if name.len() < 3 {
        return Err(LoginError::InvalidName);
    }

    let user = ctx.db.user().identity().find(ctx.sender());

    if let Some(user) = user {
        ctx.db.user().identity().update(User {
            identity: ctx.sender(),
            name,
            ..user
        });
    }

    Ok(())
}

#[derive(SpacetimeType)]
pub struct Leaderboard {
    leaderboard: Vec<User>,
}

#[view(accessor = leaderboard, public)]
fn leaderboard(ctx: &AnonymousViewContext) -> Option<Leaderboard> {
    let mut users: Vec<_> = ctx.db.user().online().filter(true).collect();

    users.sort_by(|a, b| {
        if a.games_played != 0 {
            ((a.games_won as f64 - a.games_loss as f64) / a.games_played as f64)
                .partial_cmp(&((b.games_won as f64 - b.games_loss as f64) / b.games_played as f64))
                .unwrap_or(std::cmp::Ordering::Less)
        } else {
            std::cmp::Ordering::Less
        }
    });

    let leaderboard: Vec<_> = users.into_iter().take(10).collect();

    Some(Leaderboard { leaderboard })
}
