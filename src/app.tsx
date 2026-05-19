import { useTable } from "spacetimedb/react";
import { tables } from "./module_bindings";
import { lazy } from "react";
// import Game from "./components/stages/Game";
const Game = lazy(() => import("./components/stages/Game"));
// import { Setup } from "./components/stages/Setup";
const Setup = lazy(() => import("./components/stages/Setup"));

// import Header from "./components/Header";
const Header = lazy(() => import("./components/Header"));

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
