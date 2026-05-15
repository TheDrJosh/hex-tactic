import { reducers, tables } from "@/module_bindings";
import { PieceType, StagingPiece } from "@/module_bindings/types";
import { Suspense, useState } from "react";
import { useReducer, useTable } from "spacetimedb/react";
import { Button } from "../ui/button";
import { AspectRatio } from "../ui/aspect-ratio";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Board } from "../models/Board";
import { cn, positionToHex } from "@/lib/utils";
import { Vector2 } from "three";
import { Piece } from "../models/Piece";

const pieces = [
    PieceType.Bomb,
    PieceType.Flag,
    PieceType.Spy,
    PieceType.Scout,
    PieceType.Miner,
    PieceType.Sergeant,
    PieceType.Lieutenant,
    PieceType.Captain,
    PieceType.Major,
    PieceType.Colonel,
    PieceType.General,
    PieceType.Marshal,
];

export function Setup() {
    const [selectedPiece, setSelectedPiece] = useState<PieceType | undefined>(
        undefined
    );

    const [stagingPieces] = useTable(tables.staging_pieces);

    const piecesCounts = countPieces(stagingPieces);

    const setPiece = useReducer(reducers.stagingSetPiece);
    const clearPieces = useReducer(reducers.stagingClearPiece);
    const joinGame = useReducer(reducers.joinGame);

    let ready = true;

    for (let i = 0; i < pieces.length; i++) {
        if (piecesCounts[pieces[i].tag] !== maxPieces[pieces[i].tag]) {
            ready = false;
            break;
        }
    }

    return (
        <>
            <div className="my-2 flex flex-row">
                <Button variant="destructive" onClick={() => clearPieces()}>
                    Clear All
                </Button>
                <div className="flex-1"></div>
                <Button
                    disabled={!ready}
                    onClick={() => {
                        joinGame();
                    }}
                >
                    Play
                </Button>
            </div>
            <div className="flex flex-col gap-4 landscape:flex-row">
                <AspectRatio
                    ratio={16 / 9}
                    className="aspect-video flex-1 rounded-lg bg-muted"
                >
                    <Canvas shadows="percentage">
                        <PerspectiveCamera
                            position={[0, 15, 15]}
                            rotation={[-Math.PI / 4, 0, 0]}
                            fov={45}
                            makeDefault={true}
                        />

                        <Board
                            columns={14}
                            rows={14}
                            hexSize={1}
                            texture={"staging_board.png"}
                            onClick={(e, info) => {
                                const offsetToZeroX = info.width / 2;
                                const offsetToZeroZ = info.height / 2;

                                const hexPos = positionToHex(
                                    new Vector2(
                                        e.point.x + offsetToZeroX,
                                        -e.point.z + offsetToZeroZ
                                    ),
                                    info.hexSize
                                );

                                if (
                                    hexPos.row >= 0 &&
                                    hexPos.row < 6 &&
                                    hexPos.col >= 0 &&
                                    hexPos.col < 15
                                ) {
                                    setPiece({
                                        pieceType: selectedPiece,
                                        pos: hexPos,
                                    });
                                    if (
                                        selectedPiece !== undefined &&
                                        piecesCounts[selectedPiece.tag] + 1 ===
                                            maxPieces[selectedPiece.tag]
                                    ) {
                                        setSelectedPiece(undefined);
                                    }
                                }
                            }}
                        >
                            {stagingPieces.map((piece) => {
                                return (
                                    <Suspense key={piece.id}>
                                        <Piece
                                            piece={piece.pieceType}
                                            hexPosition={piece.position}
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
                <div className="grid grid-cols-3 items-center gap-4 sm:grid-cols-6 landscape:grid-cols-2 landscape:self-start">
                    {pieces.map((piece) => {
                        return (
                            <PieceSelect
                                key={piece.tag}
                                piece={piece}
                                selectedPiece={selectedPiece}
                                setSelectedPiece={setSelectedPiece}
                                piecesCounts={piecesCounts}
                            />
                        );
                    })}
                </div>
            </div>
        </>
    );
}

type PieceCount = {
    [K in PieceType["tag"]]: number;
};

function countPieces(stagingPieces: readonly StagingPiece[]): PieceCount {
    const map: PieceCount = {
        Bomb: 0,
        Spy: 0,
        Scout: 0,
        Miner: 0,
        Sergeant: 0,
        Lieutenant: 0,
        Captain: 0,
        Major: 0,
        Colonel: 0,
        General: 0,
        Marshal: 0,
        Flag: 0,
    };

    for (let i = 0; i < stagingPieces.length; i++) {
        const pieceType = stagingPieces[i].pieceType;
        map[pieceType.tag] += 1;
    }

    return map;
}

const maxPieces: PieceCount = {
    Bomb: 9,
    Spy: 1,
    Scout: 10,
    Miner: 5,
    Sergeant: 4,
    Lieutenant: 4,
    Captain: 4,
    Major: 3,
    Colonel: 2,
    General: 1,
    Marshal: 1,
    Flag: 1,
};

function PieceSelect({
    piece,
    selectedPiece,
    setSelectedPiece,
    piecesCounts,
}: {
    piece: PieceType;
    selectedPiece: PieceType | undefined;
    setSelectedPiece: (p: PieceType | undefined) => void;
    piecesCounts: PieceCount;
}) {
    const selected = piece.tag === selectedPiece?.tag;

    const out = piecesCounts[piece.tag] === maxPieces[piece.tag];

    const count = maxPieces[piece.tag] - piecesCounts[piece.tag];

    const texture_name = piece.tag.toLocaleLowerCase() + ".png";

    return (
        <Button
            className="aspect-square h-auto min-w-16 flex-col"
            variant={selected ? "default" : "secondary"}
            disabled={out}
            onClick={() => {
                if (!out) {
                    setSelectedPiece(piece);
                }
                if (selectedPiece?.tag === piece.tag) {
                    setSelectedPiece(undefined);
                }
            }}
        >
            <span className="text-xl font-bold">{piece.tag}</span>
            <span>{count}</span>
            <AspectRatio ratio={1}>
                <img
                    src={texture_name}
                    className={cn(
                        "aspect-square h-full w-full",
                        selected ? "dark:invert" : "not-dark:invert"
                    )}
                />
            </AspectRatio>
        </Button>
    );
}
