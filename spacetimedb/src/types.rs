use spacetimedb::{SpacetimeType, ViewContext};

use crate::staging::staging_piece__view;

#[derive(SpacetimeType, PartialEq, Clone, Copy, Debug)]
pub enum TeamColor {
    Red,
    Blue,
}

impl TeamColor {
    pub fn other(&self) -> Self {
        match self {
            Self::Red => Self::Blue,
            Self::Blue => Self::Red,
        }
    }
}

/// Doubled coordinates
/// https://www.redblobgames.com/grids/hexagons/
#[derive(SpacetimeType, PartialEq, Debug)]
pub struct HexPosition {
    pub col: i32,
    pub row: i32,
}

#[derive(Debug, thiserror::Error)]
pub enum InvalidPositionError {
    #[error("Invalid Position")]
    InvalidPosition,
}

impl HexPosition {
    pub fn validate(&self) -> Result<(), InvalidPositionError> {
        ((self.col + self.row) % 2 == 1)
            .then_some(())
            .ok_or(InvalidPositionError::InvalidPosition)
    }

    // pub fn offset(&mut self, dir: Direction, dist: u32) {
    //     match dir {
    //         Direction::North => self.row += 2 * dist as i32,
    //         Direction::NorthNorthEast => {
    //             self.col += dist as i32;
    //             self.row += 3 * dist as i32;
    //         }
    //         Direction::NorthEast => {
    //             self.col += dist as i32;
    //             self.row += dist as i32;
    //         }
    //         Direction::East => self.col += 2 * dist as i32,
    //         Direction::SouthEast => {
    //             self.col += dist as i32;
    //             self.row -= dist as i32;
    //         }
    //         Direction::SouthSouthEast => {
    //             self.col += dist as i32;
    //             self.row -= 3 * dist as i32;
    //         }
    //         Direction::South => self.row -= 2 * dist as i32,
    //         Direction::SouthSouthWest => {
    //             self.col -= dist as i32;
    //             self.row -= 3 * dist as i32;
    //         }
    //         Direction::SouthWest => {
    //             self.col -= dist as i32;
    //             self.row -= dist as i32;
    //         }
    //         Direction::West => self.col -= 2 * dist as i32,
    //         Direction::NorthWest => {
    //             self.col -= dist as i32;
    //             self.row += dist as i32;
    //         }
    //         Direction::NorthNorthWest => {
    //             self.col += dist as i32;
    //             self.row += 3 * dist as i32;
    //         }
    //     }
    // }
}

// pub enum Direction {
//     North,
//     NorthNorthEast,
//     NorthEast,
//     East,
//     SouthEast,
//     SouthSouthEast,
//     South,
//     SouthSouthWest,
//     SouthWest,
//     West,
//     NorthWest,
//     NorthNorthWest,
// }

#[derive(SpacetimeType, PartialEq, Clone, Copy)]
pub enum PieceType {
    Bomb,
    Spy,
    Scout,
    Miner,
    Sergeant,
    Lieutenant,
    Captain,
    Major,
    Colonel,
    General,
    Marshal,
    Flag,
}

impl PieceType {
    pub fn rank(&self) -> u8 {
        match self {
            PieceType::Bomb => u8::MAX,
            PieceType::Spy => 1,
            PieceType::Scout => 2,
            PieceType::Miner => 3,
            PieceType::Sergeant => 4,
            PieceType::Lieutenant => 5,
            PieceType::Captain => 6,
            PieceType::Major => 7,
            PieceType::Colonel => 8,
            PieceType::General => 9,
            PieceType::Marshal => 10,
            PieceType::Flag => 0,
        }
    }
}

#[derive(SpacetimeType, Default)]
pub struct PieceCount {
    pub bomb_count: u8,
    pub spy_count: u8,
    pub scout_count: u8,
    pub miner_count: u8,
    pub sergeant_count: u8,
    pub lieutenant_count: u8,
    pub captain_count: u8,
    pub major_count: u8,
    pub colonel_count: u8,
    pub general_count: u8,
    pub marshal_count: u8,
    pub flag_count: u8,
}

impl PieceCount {
    pub const MAX_BOMBS: u8 = 9;
    pub const MAX_SPYS: u8 = 1;
    pub const MAX_SCOUTS: u8 = 10;
    pub const MAX_MINERS: u8 = 5;
    pub const MAX_SERGEANTS: u8 = 4;
    pub const MAX_LIEUTENANTS: u8 = 4;
    pub const MAX_CAPTAINS: u8 = 4;
    pub const MAX_MAJORS: u8 = 3;
    pub const MAX_COLONEL: u8 = 2;
    pub const MAX_GENERAL: u8 = 1;
    pub const MAX_MARSHAL: u8 = 1;
    pub const MAX_FLAG: u8 = 1;

    pub fn from_staging(ctx: &ViewContext) -> Self {
        ctx.db
            .staging_piece()
            .user()
            .filter(ctx.sender())
            .fold(Self::default(), |a, b| match b.piece_type {
                PieceType::Bomb => Self {
                    bomb_count: a.bomb_count + 1,
                    ..a
                },
                PieceType::Spy => Self {
                    spy_count: a.spy_count + 1,
                    ..a
                },
                PieceType::Scout => Self {
                    scout_count: a.scout_count + 1,
                    ..a
                },
                PieceType::Miner => Self {
                    miner_count: a.miner_count + 1,
                    ..a
                },
                PieceType::Sergeant => Self {
                    sergeant_count: a.sergeant_count + 1,
                    ..a
                },
                PieceType::Lieutenant => Self {
                    lieutenant_count: a.lieutenant_count + 1,
                    ..a
                },
                PieceType::Captain => Self {
                    captain_count: a.captain_count + 1,
                    ..a
                },
                PieceType::Major => Self {
                    major_count: a.major_count + 1,
                    ..a
                },
                PieceType::Colonel => Self {
                    colonel_count: a.colonel_count + 1,
                    ..a
                },
                PieceType::General => Self {
                    general_count: a.general_count + 1,
                    ..a
                },
                PieceType::Marshal => Self {
                    marshal_count: a.marshal_count + 1,
                    ..a
                },
                PieceType::Flag => Self {
                    flag_count: a.flag_count + 1,
                    ..a
                },
            })
    }

    // pub fn validate(&self) -> bool {
    //     self.bomb_count <= PieceCount::MAX_BOMBS
    //         && self.spy_count <= PieceCount::MAX_SPYS
    //         && self.scout_count <= PieceCount::MAX_SCOUTS
    //         && self.sergeant_count <= PieceCount::MAX_SERGEANTS
    //         && self.lieutenant_count <= PieceCount::MAX_LIEUTENANTS
    //         && self.captain_count <= PieceCount::MAX_CAPTAINS
    //         && self.major_count <= PieceCount::MAX_MAJORS
    //         && self.colonel_count <= PieceCount::MAX_COLONEL
    //         && self.general_count <= PieceCount::MAX_GENERAL
    //         && self.marshal_count <= PieceCount::MAX_MARSHAL
    //         && self.flag_count <= PieceCount::MAX_FLAG
    // }

    pub fn all_used(&self) -> bool {
        self.bomb_count == PieceCount::MAX_BOMBS
            && self.spy_count == PieceCount::MAX_SPYS
            && self.scout_count == PieceCount::MAX_SCOUTS
            && self.sergeant_count == PieceCount::MAX_SERGEANTS
            && self.lieutenant_count == PieceCount::MAX_LIEUTENANTS
            && self.captain_count == PieceCount::MAX_CAPTAINS
            && self.major_count == PieceCount::MAX_MAJORS
            && self.colonel_count == PieceCount::MAX_COLONEL
            && self.general_count == PieceCount::MAX_GENERAL
            && self.marshal_count == PieceCount::MAX_MARSHAL
            && self.flag_count == PieceCount::MAX_FLAG
    }
}
