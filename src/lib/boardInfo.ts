import React from "react";
import type { Vector3 } from "three";

export type BoardInfo = {
    columns: number;
    rows: number;
    /// Inner Radius
    hexSize: number;
    position: Vector3;

    width: number;
    height: number;
};

export const BoardContext = React.createContext<BoardInfo | undefined>(undefined);

export const useBoardInfo = () => {
    const context = React.useContext(BoardContext);

    if (context === undefined) {
        throw new Error("useBoardInfo must be used within a Board");
    }

    return context;
};
