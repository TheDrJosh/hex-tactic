import {
    HexPosition,
    TeamColor,
    type PieceType,
} from "@/module_bindings/types";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useBoardInfo } from "./Board";
import { HexToPosition } from "@/lib/utils";
import { Euler, TextureLoader, Vector3 } from "three";
import { Suspense } from "react";

export function Piece({
    team,
    rotation,
    hexPosition,
    piece,
    offset: pieceOffset,
}: {
    team?: TeamColor;
    piece?: PieceType;
    offset?: Vector3;
    hexPosition: HexPosition;
    rotation?: Euler;
}) {
    const boardInfo = useBoardInfo();

    const gltf = useLoader(GLTFLoader, "/piece.gltf");

    const color =
        team === undefined ? "gray" : team.tag === "Red" ? "red" : "blue";

    // @ts-expect-error dont know why this is not defined in the type def
    const geometry = gltf.nodes.Piece.geometry;

    const offset = HexToPosition(hexPosition, boardInfo.hexSize);

    const offsetToZeroX = boardInfo.width / 2;
    const offsetToZeroZ = boardInfo.height / 2;

    const position = new Vector3(
        boardInfo.position.x +
            (offset.x - offsetToZeroX) +
            (pieceOffset?.x ?? 0),
        boardInfo.position.y + (pieceOffset?.y ?? 0),
        boardInfo.position.z -
            (offset.y - offsetToZeroZ) +
            (pieceOffset?.z ?? 0)
    );

    return (
        <>
            <mesh
                castShadow
                receiveShadow
                geometry={geometry}
                rotation={rotation}
                position={position}
            >
                <meshStandardMaterial color={color} />
            </mesh>
            {piece !== undefined ? (
                <Suspense>
                    <PieceLabel
                        piece={piece}
                        position={position}
                        rotation={rotation}
                    />
                </Suspense>
            ) : undefined}
        </>
    );
}

function PieceLabel({
    piece,
    position,
    rotation,
}: {
    piece: PieceType;
    position: Vector3;
    rotation?: Euler;
}) {
    const texture_name = piece.tag.toLocaleLowerCase() + ".png";

    const texture = useLoader(TextureLoader, texture_name);

    const offset = new Vector3(0, 0.5, 0.3);

    if (rotation) {
        offset.applyEuler(rotation);
    }

    return (
        <mesh
            position={new Vector3().addVectors(position, offset)}
            rotation={rotation}
        >
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial map={texture} alphaTest={0.5} />
        </mesh>
    );
}
