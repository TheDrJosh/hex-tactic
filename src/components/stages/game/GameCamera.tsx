import type { TeamColor } from "@/module_bindings/types";
import { animated, useSpring } from "@react-spring/three";
import { PerspectiveCamera } from "@react-three/drei";
import type { PropsWithChildren } from "react";

const AnimatedPerspectiveCamera = animated(PerspectiveCamera);

export default function GameCamera({
    team,
    pieceSelected,
}: PropsWithChildren<{
    team: TeamColor;
    pieceSelected: boolean;
}>) {
    const teamMult = team.tag === "Red" ? 1 : -1;
    const positionOffset = pieceSelected ? 10 : 15;
    const cameraRotation = pieceSelected ? -Math.PI / 3 : -Math.PI / 4;

    const springs = useSpring({
        positionZ: positionOffset * teamMult,
        rotationX: cameraRotation * teamMult,
    });

    return (
        <AnimatedPerspectiveCamera
            position-x={0}
            position-y={15}
            position-z={springs.positionZ}
            rotation-x={springs.rotationX}
            rotation-y={team.tag === "Red" ? 0 : Math.PI}
            rotation-z={0}
            fov={45}
            makeDefault
        />
    );
}
