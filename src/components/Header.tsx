import { Button } from "./ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { useCurrentUser } from "@/lib/utils";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "./ui/dialog";
import { useState } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { useReducer, useTable } from "spacetimedb/react";
import { reducers, tables } from "@/module_bindings";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table";
import { Skeleton } from "./ui/skeleton";
import type { User } from "@/module_bindings/types";

function Header() {
    return (
        <div className="p-3">
            <header className="flex w-full items-center rounded-lg border border-border p-2">
                <h1 className="flex-1 text-3xl font-black tracking-tight">
                    <span className="text-red-800">Hex</span>{" "}
                    <span className="text-blue-800">Tactic</span>
                </h1>
                <div className="m-2 flex items-center">
                    {/* Theme Switcher */}

                    <Leaderboard />

                    <AuthSection />
                </div>
            </header>
        </div>
    );
}

function Leaderboard() {
    const [leaderboardArray, isReady] = useTable(tables.leaderboard);

    const leaderboard = leaderboardArray[0]?.leaderboard;

    return (
        <Dialog>
            <DialogTrigger render={<Button />}>Leaderboard</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Leaderboard</DialogTitle>
                    <DialogDescription>Top 10 Leaderboard</DialogDescription>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Won</TableHead>
                                <TableHead>Loss</TableHead>
                                <TableHead>Played</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isReady && leaderboard !== undefined
                                ? leaderboard.map((user) => (
                                      <TableRow
                                          key={user.identity.__identity__}
                                      >
                                          <TableCell>{user.name}</TableCell>
                                          <TableCell>{user.gamesWon}</TableCell>
                                          <TableCell>
                                              {user.gamesLoss}
                                          </TableCell>
                                          <TableCell>
                                              {user.gamesPlayed}
                                          </TableCell>
                                      </TableRow>
                                  ))
                                : Array.from({ length: 10 }, (_, i) => (
                                      <TableRow key={i}>
                                          <TableCell>
                                              <Skeleton />
                                          </TableCell>
                                          <TableCell>
                                              <Skeleton />
                                          </TableCell>
                                          <TableCell>
                                              <Skeleton />
                                          </TableCell>
                                          <TableCell>
                                              <Skeleton />
                                          </TableCell>
                                      </TableRow>
                                  ))}
                        </TableBody>
                    </Table>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    );
}

function AuthSection() {
    const [user] = useCurrentUser();

    if (user === null) {
        return <span>Loading...</span>;
    }

    return <AuthSectionInner user={user} />;
}
function AuthSectionInner({ user }: { user: User }) {
    const [name, setName] = useState(user.name);

    const setUserName = useReducer(reducers.setUserName);

    return (
        <HoverCard>
            <HoverCardTrigger render={<Button variant="link" />}>
                {user.name}
            </HoverCardTrigger>
            <HoverCardContent className="flex w-64 flex-col gap-2">
                <div>
                    <span className="font-bold">Games Played: </span>
                    {user.gamesPlayed}
                </div>
                <div>
                    <span className="font-bold">Games Won: </span>
                    {user.gamesWon}
                </div>
                <div>
                    <span className="font-bold">Games Loss: </span>
                    {user.gamesLoss}
                </div>

                <Dialog
                    onOpenChange={(open) => {
                        if (open) {
                            setName(user.name);
                        }
                    }}
                >
                    <DialogTrigger render={<Button />}>
                        Change Name
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Change Name</DialogTitle>
                            <DialogDescription>
                                change your name
                            </DialogDescription>

                            <form
                                id="login"
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    await setUserName({ name: name ?? "" });
                                }}
                            >
                                <div className="flex flex-col gap-6">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) =>
                                                setName(e.target.value)
                                            }
                                        />
                                    </div>
                                </div>
                            </form>

                            <DialogFooter>
                                <DialogClose
                                    render={<Button variant="outline" />}
                                >
                                    Cancel
                                </DialogClose>
                                <DialogClose
                                    render={
                                        <Button type="submit" form="login" />
                                    }
                                >
                                    Save
                                </DialogClose>
                            </DialogFooter>
                        </DialogHeader>
                    </DialogContent>
                </Dialog>
            </HoverCardContent>
        </HoverCard>
    );
}

export default Header;
