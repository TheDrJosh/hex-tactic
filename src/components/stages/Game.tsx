import {
    reducers,
    REMOTE_MODULE,
    tables,
    type EventContext,
} from "@/module_bindings";
import {
    PieceCaptureEvent,
    PieceType,
    type GameInfo,
} from "@/module_bindings/types";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useReducer, useSpacetimeDB, useTable } from "spacetimedb/react";
import { Button } from "../ui/button";
import { AspectRatio } from "../ui/aspect-ratio";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Board, type BoardInfo } from "../models/Board";
import { positionToHex } from "@/lib/utils";
import { Euler, Vector2, Vector3 } from "three";
import { Piece } from "../models/Piece";
import { toast } from "sonner";
import type { DbConnectionImpl } from "spacetimedb";

//TODO - Move Camera overhead when piece is selected
//TODO - animate stuff
//TODO - fix graphics

type PieceNumber = {
    [K in PieceType["tag"]]: number | null;
};

const pieceNumber: PieceNumber = {
    Bomb: null,
    Spy: 1,
    Scout: 2,
    Miner: 3,
    Sergeant: 4,
    Lieutenant: 5,
    Captain: 6,
    Major: 7,
    Colonel: 8,
    General: 9,
    Marshal: 10,
    Flag: null,
};

function pieceDisplayName(pieceType: PieceType): string {
    if (pieceNumber[pieceType.tag]) {
        return `${pieceType.tag} (${pieceNumber[pieceType.tag]})`;
    } else {
        return pieceType.tag;
    }
}

function opponentUserGameInfo(game: GameInfo) {
    if (game.team.tag === "Red") {
        return {
            identity: game.game.bluePlayerIdentity,
            present: game.game.bluePlayerPresent,
        };
    } else {
        return {
            identity: game.game.redPlayerIdentity,
            present: game.game.redPlayerPresent,
        };
    }
}

export function Game({ game }: { game: GameInfo }) {
    const state = useSpacetimeDB();

    const keepAlive = useReducer(reducers.keepAlive);
    const quitGame = useReducer(reducers.quitGame);

    const opponentGameInfo = opponentUserGameInfo(game);

    const [[opponent], opponentIsReady] = useTable(
        tables.user.where((r) => r.identity.eq(opponentGameInfo.identity))
    );

    const [selectedPiece, setSelectedPiece] = useState<bigint | null>(null);

    const movePiece = useReducer(reducers.movePiece);

    const onPieceCaptureEvent = useCallback(
        (_: EventContext, event: PieceCaptureEvent) => {
            const pieceName = pieceDisplayName(event.pieceType);
            const attackedPieceName = pieceDisplayName(event.attackedPieceType);

            if (event.attackerTeam.tag === game.team.tag) {
                const winStr =
                    event.winner.tag === "Draw"
                        ? "was a draw"
                        : event.winner.tag === "Attacker"
                          ? "won"
                          : "lost";

                toast(
                    `Your ${pieceName} attacked a ${attackedPieceName} and it ${winStr}`
                );
            } else {
                const winStr =
                    event.winner.tag === "Draw"
                        ? "was a draw"
                        : event.winner.tag === "Attacker"
                          ? "lost"
                          : "won";

                toast(
                    `Your ${attackedPieceName} was attacked by a ${pieceName} and it ${winStr}`
                );
            }
        },
        [game.team.tag]
    );

    useEffect(() => {
        const conn: DbConnectionImpl<typeof REMOTE_MODULE> | null =
            state.getConnection();

        let s = undefined;
        if (conn) {
            s = conn
                .subscriptionBuilder()
                .subscribe(
                    tables.piece_capture_event.where((r) =>
                        r.game.eq(game.game.id)
                    )
                );

            conn.db.piece_capture_event.onInsert(onPieceCaptureEvent);
        }

        return () => {
            if (conn) {
                conn.db.piece_capture_event.removeOnInsert(onPieceCaptureEvent);
            }
            if (s !== undefined) {
                s.unsubscribe();
            }
        };
    }, [game.game.id, state, onPieceCaptureEvent]);

    useEffect(() => {
        const interval = setInterval(() => {
            keepAlive();
        }, 15000);
        return () => {
            clearInterval(interval);
        };
    }, [keepAlive]);

    const boardOnClick = async (
        event: ThreeEvent<MouseEvent>,
        boardInfo: BoardInfo
    ) => {
        if (game.game.currentTurn.tag !== game.team.tag) {
            setSelectedPiece(null);
            return;
        }

        const offsetToZeroX = boardInfo.width / 2;
        const offsetToZeroZ = boardInfo.height / 2;

        const hexPos = positionToHex(
            new Vector2(
                event.point.x + offsetToZeroX,
                -event.point.z + offsetToZeroZ
            ),
            boardInfo.hexSize
        );

        for (let i = 0; i < game.pieces.length; i++) {
            if (
                game.pieces[i].position.col === hexPos.col &&
                game.pieces[i].position.row === hexPos.row &&
                game.pieces[i].team.tag === game.team.tag &&
                game.pieces[i].pieceType?.tag !== "Bomb" &&
                game.pieces[i].pieceType?.tag !== "Flag"
            ) {
                setSelectedPiece(game.pieces[i].id);
                return;
            }
        }

        if (selectedPiece !== null) {
            try {
                await movePiece({ id: selectedPiece, position: hexPos });
            } catch {
                toast("Invalid Move!");
            }
            setSelectedPiece(null);
        }
    };

    if (!game.game.started) {
        return <div>Waiting for opponent</div>;
    }

    if (game.game.winner) {
        return (
            <div>
                <span>Winner: {game.game.winner.tag}</span>
                <Button variant="destructive" onClick={() => quitGame()}>
                    Exit
                </Button>
            </div>
        );
    }

    if (
        (game.team.tag === "Red" && !game.game.bluePlayerPresent) ||
        (game.team.tag === "Blue" && !game.game.redPlayerPresent)
    ) {
        return (
            <div>
                <span>Opponent Left</span>
                <Button variant="destructive" onClick={() => quitGame()}>
                    Exit
                </Button>
            </div>
        );
    }

    return (
        <>
            <div className="my-2 flex flex-row">
                <Button variant="destructive" onClick={() => quitGame()}>
                    Quit
                </Button>
                <div className="flex-1"></div>
                {opponentGameInfo.present ? (
                    <div>
                        <span>Opponent: </span>
                        <span>
                            {opponentIsReady && opponent !== undefined
                                ? opponent.name
                                : "Loading..."}
                        </span>
                    </div>
                ) : undefined}
            </div>
            <div className="flex flex-col gap-4 landscape:flex-row">
                <AspectRatio
                    ratio={16 / 9}
                    className="flex-1 rounded-lg bg-muted"
                >
                    <Canvas shadows="percentage">
                        <PerspectiveCamera
                            position={[
                                0,
                                15,
                                game.team.tag === "Red" ? 15 : -15,
                            ]}
                            rotation={[
                                game.team.tag === "Red"
                                    ? -Math.PI / 4
                                    : Math.PI / 4,
                                game.team.tag === "Red" ? 0 : Math.PI,
                                0,
                            ]}
                            fov={45}
                            makeDefault={true}
                        />

                        <Board
                            columns={14}
                            rows={14}
                            hexSize={1}
                            texture={"board.png"}
                            onClick={boardOnClick}
                        >
                            {game.pieces.map((piece) => {
                                return (
                                    <Suspense key={piece.id}>
                                        <Piece
                                            piece={piece.pieceType}
                                            hexPosition={piece.position}
                                            team={piece.team}
                                            offset={
                                                new Vector3(
                                                    0,
                                                    selectedPiece === piece.id
                                                        ? 1
                                                        : 0,
                                                    0
                                                )
                                            }
                                            rotation={
                                                new Euler(
                                                    0,
                                                    piece.team.tag === "Blue"
                                                        ? Math.PI
                                                        : 0,
                                                    0
                                                )
                                            }
                                        />
                                    </Suspense>
                                );
                            })}
                        </Board>
                        <ambientLight intensity={0.5} />
                        <directionalLight
                            position={[0, 10, 10]}
                            intensity={1}
                            castShadow
                        />
                    </Canvas>
                </AspectRatio>
            </div>
            <div>
                Current Turn:{" "}
                {game.game.currentTurn.tag === "Red" ? (
                    <span className="text-red-500">Red</span>
                ) : (
                    <span className="text-blue-500">Blue</span>
                )}
            </div>
        </>
    );
}
