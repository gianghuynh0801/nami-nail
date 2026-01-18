import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        emailOrPhone: { label: "Email or Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.emailOrPhone) {
            console.log("❌ Missing email/phone");
            return null;
          }

          console.log("🔍 Attempting login for:", credentials.emailOrPhone);

          // Try to find user by email or phone
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: credentials.emailOrPhone },
                { phone: credentials.emailOrPhone },
              ],
            },
          });

          if (!user) {
            console.log("❌ User not found:", credentials.emailOrPhone);
            return null;
          }

          console.log(
            "👤 User found:",
            user.email || user.phone,
            "Role:",
            user.role
          );

          // If user is CUSTOMER and no password provided, allow login with phone only
          if (
            user.role === "CUSTOMER" &&
            (!credentials.password || credentials.password === "")
          ) {
            console.log(
              "✅ Customer login with phone only (no password required)"
            );
            return {
              id: user.id,
              email: user.email || user.phone || "",
              name: user.name,
              role: user.role,
              permissions: [],
            };
          }

          // For other roles or if password is provided, check password
          if (!user.password) {
            console.log("❌ User has no password set");
            return null;
          }

          if (!credentials.password) {
            console.log("❌ Password required for this user");
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          console.log("🔐 Password check result:", isPasswordValid);

          if (!isPasswordValid) {
            console.log(
              "❌ Invalid password for user:",
              credentials.emailOrPhone
            );
            return null;
          }

          console.log(
            "✅ Login successful for user:",
            user.email || user.phone
          );
          return {
            id: user.id,
            email: user.email || user.phone || "",
            name: user.name,
            role: user.role,
            permissions: user.permissions || [],
          };
        } catch (error: any) {
          console.error("❌ Error in authorize:", error?.message || error);
          console.error("Full error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.permissions = token.permissions as string[];
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
};
