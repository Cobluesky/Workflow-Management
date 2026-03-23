import { AuthProvider } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  createLocalUser(data: { email: string; passwordHash: string; name: string }) {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name
      }
    });
  },

  findOAuthAccount(provider: AuthProvider, providerAccountId: string) {
    return prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId
        }
      },
      include: {
        user: true
      }
    });
  },

  linkOAuthAccount(data: { userId: string; provider: AuthProvider; providerAccountId: string }) {
    return prisma.oAuthAccount.create({
      data
    });
  },

  createOAuthUser(data: {
    email: string;
    name: string;
    provider: AuthProvider;
    providerAccountId: string;
  }) {
    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        oauthAccounts: {
          create: {
            provider: data.provider,
            providerAccountId: data.providerAccountId
          }
        }
      }
    });
  }
};
