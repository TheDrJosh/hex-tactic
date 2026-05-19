import { BoardContext, type BoardInfo } from "@/lib/boardInfo";
import { useLoader, type ThreeEvent } from "@react-three/fiber";
import React from "react";
import { TextureLoader, Vector3 } from "three";

export default function Board({
    position,
    columns,
    rows,
    hexSize,
    texture,
    children,
    onClick,
}: {
    columns: number;
    rows: number;

    /// Inner Radius
    hexSize: number;

    position?: Vector3;
    texture: string;

    children?: React.ReactNode;

    onClick?: (event: ThreeEvent<MouseEvent>, boardInfo: BoardInfo) => void;
}) {
    const tex = useLoader(TextureLoader, texture);

    const width = (2 + (3 / 2) * columns) * hexSize;
    const height = Math.sqrt(3) * (1 + rows / 2) * hexSize;

    const boardInfo: BoardInfo = {
        rows: rows,
        columns: columns,
        position: position ?? new Vector3(0, 0, 0),
        hexSize: hexSize,
        width: width,
        height: height,
    };

    return (
        <>
            <mesh
                position={position}
                rotation={[-Math.PI / 2, 0, 0]}
                // castShadow
                receiveShadow
                onClick={
                    onClick
                        ? (e) => {
                              onClick(e, boardInfo);
                          }
                        : undefined
                }
            >
                <planeGeometry args={[width, height]} />
                <meshStandardMaterial map={tex} transparent />
            </mesh>
            <BoardContext.Provider value={boardInfo}>
                {children}
            </BoardContext.Provider>
        </>
    );
}

