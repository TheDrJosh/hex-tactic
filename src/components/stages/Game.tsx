import { reducers, tables } from "@/module_bindings";
import { type GameInfo } from "@/module_bindings/types";
import { useEffect, useState } from "react";
import { useReducer, useTable } from "spacetimedb/react";
import { Button } from "../ui/button";
import { Canvas } from "@react-three/fiber";
import { GameBoard } from "./game/GameBoard";
import { PieceCaptured } from "./game/PieceCaptured";
import { GameCamera } from "./game/GameCamera";
import { Stats } from "@react-three/drei";

//TODO - animate piece capture
//TODO - fix graphics

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
    const keepAlive = useReducer(reducers.keepAlive);
    const quitGame = useReducer(reducers.quitGame);

    const opponentGameInfo = opponentUserGameInfo(game);

    const [[opponent], opponentIsReady] = useTable(
        tables.user.where((r) => r.identity.eq(opponentGameInfo.identity))
    );

    useEffect(() => {
        const interval = setInterval(() => {
            keepAlive();
        }, 15000);
        return () => {
            clearInterval(interval);
        };
    }, [keepAlive]);

    const [selectedPiece, setSelectedPiece] = useState<bigint | null>(null);

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
                <Canvas shadows="percentage" className="aspect-video bg-muted">
                    <GameCamera
                        team={game.team}
                        pieceSelected={selectedPiece !== null}
                    />

                    <GameBoard
                        pieces={game.pieces}
                        selectedPiece={selectedPiece}
                        setSelectedPiece={setSelectedPiece}
                        team={game.team}
                        currentTurn={game.game.currentTurn}
                    />
                    <PieceCaptured team={game.team} gameId={game.game.id} />

                    <ambientLight intensity={0.5} />
                    <directionalLight
                        position={[0, 10, 10]}
                        intensity={1}
                        castShadow
                    />
                    <Stats />
                </Canvas>
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
