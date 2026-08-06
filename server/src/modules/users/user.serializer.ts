import type { User } from "@prisma/client";

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    points: user.points,
    // The client shows the admin entry point only when this is "ADMIN";
    // the server still re-checks on every admin route.
    role: user.role,
    createdAt: user.createdAt,
  };
}

export type PublicUser = ReturnType<typeof toPublicUser>;
