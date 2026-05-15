import { tables } from "@/module_bindings";
import type { HexPosition, User } from "@/module_bindings/types";
import { clsx, type ClassValue } from "clsx";
import { useSpacetimeDB, useTable } from "spacetimedb/react";
import { twMerge } from "tailwind-merge";
import { Vector2 } from "three";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function useCurrentUser(): [User | null, boolean] {
    const conn = useSpacetimeDB();

    const identity = conn.identity;

    const [userArray, isReady] = useTable(
        identity === undefined
            ? tables.user.where(() => false)
            : tables.user.where((r) => r.identity.eq(identity))
    );

    // if (identity === undefined) {
    //     return [null, false];
    // }

    if (userArray.length > 0) {
        return [userArray[0], isReady];
    } else {
        return [null, isReady];
    }
}

export function HexToPosition(hexPos: HexPosition, hexSize: number): Vector2 {
    console.assert((hexPos.col + hexPos.row) % 2 === 1, hexPos);
    if ((hexPos.col + hexPos.row) % 2 !== 1) {
        throw "Invalid Hex Position";
    }

    const x = (1 + (3 / 2) * hexPos.col) * hexSize;

    const y = ((1 + hexPos.row) * Math.sqrt(3) * hexSize) / 2;

    return new Vector2(x, y);
}

export function positionToHex(position: Vector2, hexSize: number): HexPosition {
    const col = Math.round((position.x / hexSize - 1) * (2 / 3));
    const row = (position.y * 2) / Math.sqrt(3) / hexSize - 1;

    const off = 1 - (col % 2);

    return {
        col: col,
        row: Math.round((row - off) / 2) * 2 + off,
    };
}
