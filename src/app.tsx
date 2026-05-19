import { useTable } from "spacetimedb/react";
import { tables } from "./module_bindings";
import { lazy } from "react";
const Game = lazy(() => import("./components/stages/Game"));
const Setup = lazy(() => import("./components/stages/Setup"));

import Header from "./components/Header";

import { Toaster } from "./components/ui/sonner";

export function App() {
    const [gameArray, isReady] = useTable(tables.current_game);

    return (
        <div className="">
            <Header />
            <div className="px-6 py-2">
                {!isReady ? (
                    <p>Loading...</p>
                ) : gameArray.length > 0 ? (
                    <Game game={gameArray[0]} />
                ) : (
                    <Setup />
                )}
            </div>

            <Toaster />
        </div>
    );
}
